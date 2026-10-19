using System.Text.Json;
using FamiRepere.Server;

try
{
    SQLitePCL.Batteries_V2.Init();
    var builder = WebApplication.CreateBuilder(args);
    var db = new FamilyDb(builder.Configuration.GetConnectionString("Sqlite") ?? "Data Source=data/famirepere.db");
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
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
var app = builder.Build();

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

app.MapPost("/api/login", (HttpContext ctx, LoginBody body) =>
{
    var token = db.OpenSession(body.Username, body.Password);
    WriteCookie(ctx, token);
    var person = db.FindBySession(token)!;
    return Results.Ok(db.View(person));
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
    db.CreateMember(actor, body.FirstName, body.LastName, body.Age, body.Gender, body.Role, body.Relation, body.Username, body.Password);
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
    return Results.Ok(db.View(person));
});

app.MapPost("/api/activities", (HttpContext ctx, ActivityBundle bundle) =>
{
    var person = Parent(ctx);
    RequireId(bundle.Activity.Id);
    db.AddActivity(bundle);
    return Results.Ok(db.View(person));
});

app.MapPost("/api/events", (HttpContext ctx, CalEvent item) => Save(ctx, "event", item.Id, item));
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
    return Results.Ok(db.View(person));
}

string ReadCookie(HttpContext ctx) => ctx.Request.Cookies["famirepere"] ?? "";

void WriteCookie(HttpContext ctx, string token)
{
    ctx.Response.Cookies.Append("famirepere", token, new CookieOptions
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        Secure = ctx.Request.IsHttps,
        MaxAge = TimeSpan.FromDays(14),
        Path = "/",
    });
}

Person? Current(HttpContext ctx) => db.FindBySession(ReadCookie(ctx));

Person Required(HttpContext ctx) => Current(ctx) ?? throw new InvalidOperation("Connectez-vous.");

Person Parent(HttpContext ctx)
{
    var person = Required(ctx);
    if (!Access.CanWrite(person)) throw new InvalidOperation("Cette action est réservée aux parents.");
    return person;
}

void RequireId(string id)
{
    if (string.IsNullOrWhiteSpace(id) || id.Length > 40) throw new InvalidOperation("Identifiant invalide.");
}

void ValidateAccount(string first, string last, int age, string username, string password)
{
    if (string.IsNullOrWhiteSpace(first) || string.IsNullOrWhiteSpace(last)) throw new InvalidOperation("Indiquez le prénom et le nom.");
    if (age < 0 || age > 120) throw new InvalidOperation("Indiquez l’âge.");
    if (string.IsNullOrWhiteSpace(username) || username.Trim().Length < 3) throw new InvalidOperation("L’identifiant doit contenir au moins 3 caractères.");
    if (password.Length < 8) throw new InvalidOperation("Le mot de passe doit contenir au moins 8 caractères.");
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
    public string Gender { get; set; } = "f";
    public string Role { get; set; } = "enfant";
    public string Relation { get; set; } = "";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}
