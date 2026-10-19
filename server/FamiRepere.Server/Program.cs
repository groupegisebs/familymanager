using System.Text.Json;
using Microsoft.AspNetCore.HttpOverrides;
using FamiRepere.Server;

try
{
    SQLitePCL.Batteries_V2.Init();
    var builder = WebApplication.CreateBuilder(args);
    var db = new FamilyDb(builder.Configuration.GetConnectionString("Sqlite") ?? "Data Source=data/famirepere.db");
    var seedEmail = builder.Configuration["SeedAdmin:Email"];
    var seedPassword = builder.Configuration["SeedAdmin:Password"];
    if (!string.IsNullOrWhiteSpace(seedEmail) && !string.IsNullOrWhiteSpace(seedPassword))
        db.EnsureSeedAdmin(seedEmail, seedPassword);
    Start(builder, db);
}
catch (Exception ex)
{
    Console.Error.WriteLine(ex);
    TryWriteStartupLog(ex);
    Environment.ExitCode = 1;
}

static void TryWriteStartupLog(Exception ex)
{
    try
    {
        var dir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "data"));
        Directory.CreateDirectory(dir);
        File.WriteAllText(Path.Combine(dir, "startup.log"), ex.ToString());
    }
    catch (Exception logEx)
    {
        Console.Error.WriteLine(logEx);
    }
}

static void Start(WebApplicationBuilder builder, FamilyDb db)
{
builder.WebHost.ConfigureKestrel(options =>
{
    options.AddServerHeader = false;
    options.Limits.MaxRequestBodySize = 1_048_576;
});
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedHost | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.AddSingleton(db);
builder.Services.AddHttpClient<ParentMail>();
builder.Services.AddHostedService<ParentDigest>();
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.MaxDepth = 16;
});
var app = builder.Build();
app.UseForwardedHeaders();
var mail = app.Services.GetRequiredService<ParentMail>();

app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
    ctx.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    ctx.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
    if (ctx.Request.Path.StartsWithSegments("/api"))
        ctx.Response.Headers["Cache-Control"] = "no-store";
    if (app.Environment.IsProduction() && ctx.Request.IsHttps)
        ctx.Response.Headers["Strict-Transport-Security"] = "max-age=31536000";
    if (!HttpMethods.IsGet(ctx.Request.Method) && !HttpMethods.IsHead(ctx.Request.Method) && !SameOrigin(ctx))
    {
        Console.Error.WriteLine($"Origine refusée host={ctx.Request.Host} origin={ctx.Request.Headers.Origin} forwarded={ctx.Request.Headers["X-Forwarded-Host"]} site={ctx.Request.Headers["Sec-Fetch-Site"]}");
        if (ctx.Request.HasFormContentType)
        {
            ctx.Response.Redirect("/?connexion=bloque");
            return;
        }
        ctx.Response.StatusCode = 403;
        await ctx.Response.WriteAsJsonAsync(new { error = "Requête refusée." });
        return;
    }
    await next();
});

app.Use(async (ctx, next) =>
{
    try { await next(); }
    catch (InvalidOperation ex)
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsJsonAsync(new { error = ex.Message });
    }
    catch (Microsoft.Data.Sqlite.SqliteException ex) when (ex.SqliteErrorCode == 19)
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsJsonAsync(new { error = "Cet identifiant est déjà utilisé." });
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine(ex);
        ctx.Response.StatusCode = 500;
        await ctx.Response.WriteAsJsonAsync(new { error = "La requête n’a pas abouti." });
    }
});

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/api/setup/status", () => Results.Ok(new { needsSetup = db.NeedsSetup() }));

app.MapPost("/api/setup", (HttpContext ctx, SetupBody body) =>
{
    ValidateAccount(body.FirstName, body.LastName, body.Age, body.Username, body.Password);
    var person = db.CreateFather(body.FirstName, body.LastName, body.Age, body.Username, body.Password);
    WriteCookie(ctx, db.OpenSession(body.Username, body.Password));
    return Results.Ok(db.View(person));
});

app.MapPost("/api/login", async (HttpContext ctx) =>
{
    var (username, password, form) = await ReadLogin(ctx);
    try
    {
        var token = db.OpenSession(username, password);
        WriteCookie(ctx, token);
        if (form) return Results.Redirect("/");
        return Results.Ok(db.View(db.FindBySession(token)!));
    }
    catch (InvalidOperation ex) when (form)
    {
        var code = ex.Message.StartsWith("Trop", StringComparison.Ordinal) ? "attente" : "refus";
        return Results.Redirect("/?connexion=" + code);
    }
});

app.MapPost("/api/logout", (HttpContext ctx) =>
{
    db.CloseSession(ReadCookie(ctx));
    ctx.Response.Cookies.Delete("famirepere");
    return Results.Ok();
});

app.MapGet("/api/session", (HttpContext ctx) =>
{
    var person = Current(ctx);
    return person is null ? Results.Unauthorized() : Results.Ok(db.View(person));
});

app.MapPost("/api/members", (HttpContext ctx, MemberBody body) =>
{
    var actor = Parent(ctx);
    ValidateAccount(body.FirstName, body.LastName, body.Age, body.Username, body.Password);
    if (string.IsNullOrWhiteSpace(body.Relation)) throw new InvalidOperation("Indiquez le lien familial.");
    db.CreateMember(actor, body.FirstName, body.LastName, body.Age, body.Gender, body.Role, body.Relation, body.Username, body.Password, body.Avatar);
    if (body.Role == "parent") Tell(actor, "Nouveau parent", $"{body.FirstName.Trim()} {body.LastName.Trim()} peut maintenant se connecter.");
    return Results.Ok(db.View(actor));
});

app.MapPost("/api/members/{id}/avatar", (HttpContext ctx, string id, AvatarBody body) =>
{
    var actor = Parent(ctx);
    RequireId(id);
    db.SetAvatar(actor, id, body.Avatar);
    return Results.Ok(db.View(actor));
});

app.MapPost("/api/members/{id}/profile", (HttpContext ctx, string id, MemberUpdate body) =>
{
    var actor = Parent(ctx);
    RequireId(id);
    db.UpdateMember(actor, id, body.FirstName, body.LastName, body.Role, body.Relation, body.Avatar, body.Username, body.Password);
    return Results.Ok(db.View(actor));
});

app.MapPost("/api/settings/mask", (HttpContext ctx) =>
{
    var person = Required(ctx);
    db.SetMask(person.Id, !person.MaskNotifications);
    return Results.Ok(db.View(Current(ctx)!));
});

app.MapPost("/api/tasks/{id}/toggle", (HttpContext ctx, string id) =>
{
    var person = Required(ctx);
    db.ToggleTask(person, id);
    return Results.Ok(db.View(person));
});

app.MapPost("/api/payments/advance", (HttpContext ctx, DueRef due) =>
{
    var person = Parent(ctx);
    db.Advance(person, due);
    Tell(person, "Paiement", "Un paiement familial a changé d'étape.");
    return Results.Ok(db.View(person));
});

app.MapPost("/api/activities", (HttpContext ctx, ActivityBundle bundle) =>
{
    var person = Parent(ctx);
    RequireId(bundle.Activity.Id);
    db.AddActivity(bundle);
    var activity = ParentNotices.Describe(bundle);
    Tell(person, activity.Subject, activity.Body);
    return Results.Ok(db.View(person));
});

app.MapPost("/api/events", (HttpContext ctx, CalEvent item) => Save(ctx, "event", item.Id, item));
app.MapPost("/api/child/event", (HttpContext ctx, CalEvent item) =>
{
    var child = Child(ctx);
    item.Id = NewId("ev");
    if (string.IsNullOrWhiteSpace(item.Title)) throw new InvalidOperation("Indiquez un intitulé.");
    if (item.Title.Length > 120) throw new InvalidOperation("L’intitulé est trop long.");
    if (string.IsNullOrWhiteSpace(item.Date)) throw new InvalidOperation("Indiquez une date.");
    item.MemberId = child.Id;
    item.Kind = "famille";
    item.Audience = "famille";
    item.Sensitive = "aucune";
    item.CompanionId = null;
    item.TransportId = null;
    item.Professional = null;
    item.ActivityId = null;
    item.SharedWithIds = [];
    item.Notes = Trim(item.Notes, 2000);
    item.Place = Trim(item.Place, 120);
    item.Time = Trim(item.Time, 8) ?? "";
    db.Add("event", item.Id, item);
    Tell(child, "Événement", $"{item.Title}\n{item.Date} {item.Time}".Trim());
    return Results.Ok(db.View(child));
});
app.MapPost("/api/requests", (HttpContext ctx, ChildRequest item) =>
{
    var child = Child(ctx);
    item.Id = NewId("req");
    if (string.IsNullOrWhiteSpace(item.Title)) throw new InvalidOperation("Indiquez un intitulé.");
    item.AuthorId = child.Id;
    item.Title = item.Title.Trim();
    item.Detail = Trim(item.Detail, 2000) ?? "";
    item.Date = string.IsNullOrWhiteSpace(item.Date) ? DateTime.UtcNow.ToString("yyyy-MM-dd") : item.Date;
    db.Add("request", item.Id, item);
    Tell(child, "Demande", $"{item.Title}\n{item.Detail}".Trim());
    return Results.Ok(db.View(child));
});
app.MapPost("/api/notes", (HttpContext ctx, ChildNote item) =>
{
    var child = Child(ctx);
    item.Id = NewId("note");
    if (string.IsNullOrWhiteSpace(item.Title) && string.IsNullOrWhiteSpace(item.Body)) throw new InvalidOperation("Écrivez la note.");
    item.AuthorId = child.Id;
    item.Title = string.IsNullOrWhiteSpace(item.Title) ? "Note" : item.Title.Trim();
    item.Body = Trim(item.Body, 2000) ?? "";
    item.Date = string.IsNullOrWhiteSpace(item.Date) ? DateTime.UtcNow.ToString("yyyy-MM-dd") : item.Date;
    db.Add("note", item.Id, item);
    Tell(child, "Note", $"{item.Title}\n{item.Body}".Trim());
    return Results.Ok(db.View(child));
});
app.MapPost("/api/expenses", (HttpContext ctx, Expense item) => Save(ctx, "expense", item.Id, item));
app.MapPost("/api/goals", (HttpContext ctx, Goal item) => Save(ctx, "goal", item.Id, item));
app.MapPost("/api/tasks", (HttpContext ctx, FamTask item) => Save(ctx, "task", item.Id, item));
app.MapPost("/api/documents", (HttpContext ctx, DocItem item) => Save(ctx, "document", item.Id, item));
app.MapPost("/api/incomes", (HttpContext ctx, Income item) => Save(ctx, "income", item.Id, item));
app.MapPost("/api/tontines", (HttpContext ctx, Tontine item) => Save(ctx, "tontine", item.Id, item));
app.MapPost("/api/policies", (HttpContext ctx, Policy item) => Save(ctx, "policy", item.Id, item));

app.MapPost("/api/budgets", (HttpContext ctx, CategoryLimits limits) =>
{
    var person = Parent(ctx);
    if (limits.Logement < 0 || limits.Alimentation < 0 || limits.Enfants < 0 || limits.Transport < 0 || limits.Sante < 0 || limits.Loisirs < 0)
        throw new InvalidOperation("Un plafond ne peut pas être négatif.");
    db.SaveBudgets(limits);
    return Results.Ok(db.View(person));
});

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");
app.Run();

IResult Save<T>(HttpContext ctx, string kind, string id, T item)
{
    var person = Parent(ctx);
    RequireId(id);
    db.Add(kind, id, item);
    if (item is not null)
    {
        var notice = ParentNotices.Describe(item);
        Tell(person, notice.Subject, notice.Body);
    }
    return Results.Ok(db.View(person));
}

void Tell(Person actor, string subject, string text)
{
    var recipients = db.OtherParentEmails(actor.Id);
    if (recipients.Count == 0) return;
    var who = ParentNotices.Who(actor);
    _ = mail.SendAsync(recipients, $"FamiRepère · {subject}", $"{who} a enregistré ceci.\n\n{text}");
}

string ReadCookie(HttpContext ctx) => ctx.Request.Cookies["famirepere"] ?? "";

void WriteCookie(HttpContext ctx, string token)
{
    var host = ctx.Request.Host.Host;
    var local = host is "localhost" or "127.0.0.1" or "::1";
    ctx.Response.Cookies.Append("famirepere", token, new CookieOptions
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        Secure = ctx.Request.IsHttps || (app.Environment.IsProduction() && !local),
        MaxAge = TimeSpan.FromDays(14),
        Path = "/",
    });
}

Person? Current(HttpContext ctx) => db.FindBySession(ReadCookie(ctx));

Person Required(HttpContext ctx) => Current(ctx) ?? throw new InvalidOperation("Connectez-vous.");

Person Child(HttpContext ctx)
{
    var person = Required(ctx);
    if (person.Role != "enfant") throw new InvalidOperation("Cette action est réservée à un enfant.");
    return person;
}

static string? Trim(string? value, int max)
{
    if (string.IsNullOrWhiteSpace(value)) return null;
    var text = value.Trim();
    return text.Length <= max ? text : text[..max];
}

Person Parent(HttpContext ctx)
{
    var person = Required(ctx);
    if (!Access.CanWrite(person)) throw new InvalidOperation("Cette action est réservée aux parents.");
    return person;
}

void RequireId(string id)
{
    if (string.IsNullOrWhiteSpace(id) || id.Length > 40 || id.Any(c => !char.IsAsciiLetterOrDigit(c) && c is not '-' and not '_'))
        throw new InvalidOperation("Identifiant invalide.");
}

static string NewId(string prefix) => prefix + "-" + Guid.NewGuid().ToString("N")[..12];

static async Task<(string Username, string Password, bool Form)> ReadLogin(HttpContext ctx)
{
    if (ctx.Request.HasFormContentType)
    {
        var form = await ctx.Request.ReadFormAsync();
        return (form["username"].ToString(), form["password"].ToString(), true);
    }
    var body = await ctx.Request.ReadFromJsonAsync<LoginBody>() ?? new LoginBody();
    return (body.Username, body.Password, false);
}

static bool SameOrigin(HttpContext ctx)
{
    var site = ctx.Request.Headers["Sec-Fetch-Site"].ToString();
    if (site is "same-origin" or "none") return true;
    var origin = ctx.Request.Headers.Origin.ToString();
    if (string.IsNullOrEmpty(origin)) return site is "";
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
    if (string.Equals(uri.Host, ctx.Request.Host.Host, StringComparison.OrdinalIgnoreCase)) return true;
    var forwarded = HeaderHost(ctx.Request.Headers["X-Forwarded-Host"].ToString());
    return forwarded is not null && string.Equals(uri.Host, forwarded, StringComparison.OrdinalIgnoreCase);
}

static string? HeaderHost(string value)
{
    if (string.IsNullOrWhiteSpace(value)) return null;
    var name = value.Split(',')[0].Trim().Split(':')[0];
    return string.IsNullOrEmpty(name) ? null : name;
}

void ValidateAccount(string first, string last, int age, string username, string password)
{
    if (string.IsNullOrWhiteSpace(first) || first.Trim().Length > 60) throw new InvalidOperation("Indiquez le prénom.");
    if (last.Trim().Length > 60) throw new InvalidOperation("Le nom est trop long.");
    if (age < 0 || age > 120) throw new InvalidOperation("Âge invalide.");
    var login = username.Trim();
    if (login.Length < 3 || login.Length > 80 || login.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '@' or '.' or '_' or '-')))
        throw new InvalidOperation("L’identifiant doit contenir au moins 3 caractères.");
    if (password.Length < 8 || password.Length > 200) throw new InvalidOperation("Le mot de passe doit contenir au moins 8 caractères.");
}
}

sealed class SetupBody
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public int Age { get; set; }
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

sealed class MemberUpdate
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Role { get; set; } = "enfant";
    public string Relation { get; set; } = "";
    public string Avatar { get; set; } = "";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

sealed class AvatarBody
{
    public string Avatar { get; set; } = "";
}

sealed class LoginBody
{
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

sealed class MemberBody
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public int Age { get; set; }
    public string Gender { get; set; } = "";
    public string Role { get; set; } = "enfant";
    public string Relation { get; set; } = "";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string Avatar { get; set; } = "";
}
