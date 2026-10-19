using System.Net;
using System.Net.Http.Json;

namespace FamiRepere.Server;

public sealed class ParentMail
{
    readonly HttpClient _http;
    readonly IConfiguration _config;
    readonly ILogger<ParentMail> _log;

    public ParentMail(HttpClient http, IConfiguration config, ILogger<ParentMail> log)
    {
        _http = http;
        _config = config;
        _log = log;
        var baseUrl = config["Mail:BaseUrl"] ?? "https://gisemailsender.gisebs.com";
        _http.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
        _http.Timeout = TimeSpan.FromSeconds(30);
    }

    public bool Enabled => !string.IsNullOrWhiteSpace(_config["Mail:ApiKey"]);

    public async Task SendAsync(IEnumerable<string> recipients, string subject, string body)
    {
        if (!Enabled) return;
        var html = WebUtility.HtmlEncode(body).Replace("\n", "<br>");
        foreach (var address in recipients.Where(a => a.Contains('@')).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, "api/mail/send");
                request.Headers.TryAddWithoutValidation("Authorization", "Bearer " + _config["Mail:ApiKey"]);
                request.Content = JsonContent.Create(new
                {
                    clientCode = _config["Mail:ClientCode"] ?? "FAMIREPERE",
                    templateCode = _config["Mail:TemplateCode"] ?? "FAMIREPERE_PARENT",
                    language = "fr",
                    to = new[] { address },
                    subjectData = new { Subject = subject },
                    bodyData = new { Subject = subject, HtmlBody = $"<p>{html}</p>" },
                });
                using var response = await _http.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    var detail = await response.Content.ReadAsStringAsync();
                    _log.LogWarning("GiseMailSender a refusé le courriel pour {Address} : {Status} {Detail}", address, (int)response.StatusCode, detail);
                }
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Courriel non envoyé à {Address}", address);
            }
        }
    }
}

public sealed class ParentDigest : BackgroundService
{
    readonly FamilyDb _db;
    readonly ParentMail _mail;
    readonly ILogger<ParentDigest> _log;

    public ParentDigest(FamilyDb db, ParentMail mail, ILogger<ParentDigest> log)
    {
        _db = db;
        _mail = mail;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await SendToday(); }
            catch (Exception ex) { _log.LogWarning(ex, "Rappel familial non envoyé"); }
            await Task.Delay(TimeSpan.FromHours(6), stoppingToken);
        }
    }

    async Task SendToday()
    {
        if (!_mail.Enabled) return;
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        if (_db.Setting("mail-digest") == today) return;
        var until = DateTime.UtcNow.Date.AddDays(7).ToString("yyyy-MM-dd");
        var state = _db.ReadAll();
        var lines = new List<string>();
        foreach (var ev in state.Events.Where(e => e.Date.CompareTo(today) >= 0 && e.Date.CompareTo(until) <= 0).OrderBy(e => e.Date))
            lines.Add($"Rendez-vous · {ev.Date} {ev.Time} · {ev.Title}".Trim());
        foreach (var expense in state.Expenses.Where(e => e.Status != "confirme" && e.Date.CompareTo(today) >= 0 && e.Date.CompareTo(until) <= 0))
            lines.Add($"Dépense · {expense.Date} · {expense.Label} · {expense.Amount:0.##} $");
        foreach (var policy in state.Policies.Where(p => p.PremiumStatus != "confirme" && p.PremiumDueDate.CompareTo(today) >= 0 && p.PremiumDueDate.CompareTo(until) <= 0))
            lines.Add($"Prime · {policy.PremiumDueDate} · {policy.Type} · {policy.Premium:0.##} $");
        _db.Setting("mail-digest", today);
        if (lines.Count == 0) return;
        var body = "Rappel FamiRepère pour les sept prochains jours.\n\n" + string.Join("\n", lines);
        await _mail.SendAsync(_db.ParentEmails(), "FamiRepère · échéances de la semaine", body);
    }
}

public static class ParentNotices
{
    public static string Who(Person person) => $"{person.FirstName} {person.LastName}".Trim();

    public static (string Subject, string Body) Describe(object item) => item switch
    {
        CalEvent e => ("Rendez-vous", $"{e.Title}\n{e.Date} {e.Time}".Trim()),
        Expense e => ("Dépense", $"{e.Label}\n{e.Amount:0.##} $ · {Label(e.Status)}"),
        Goal g => ("Objectif d'épargne", g.Title),
        FamTask t => ("Tâche", $"{t.Title}\n{t.Due}".Trim()),
        DocItem d => ("Document", d.Title),
        Income i => ("Revenu", $"{i.Label}\n{i.Amount:0.##} $ · {IncomeKind(i.Kind)} · {IncomeFreq(i.Frequency)} · {Label(i.Status)}"),
        Investment i => ("Investissement", $"{i.Label}\n{i.Type} · {i.Institution}\nValeur {i.CurrentValue:0.##} $ · investi {i.InvestedAmount:0.##} $"),
        Asset a => ("Patrimoine", $"{a.Label}\n{a.Type} · valeur {a.EstimatedValue:0.##} $\n{a.Location}".Trim()),
        Tontine t => ("Tontine", t.Name),
        Policy p => ("Assurance", $"{p.Type}\nPrime le {p.PremiumDueDate}".Trim()),
        ActivityBundle b => ("Activité", b.Activity.Name),
        _ => ("Mise à jour", "Un élément familial a été enregistré."),
    };

    static string Label(string status) => status switch
    {
        "prevu" => "prévu",
        "declare" => "déclaré",
        "confirme" => "confirmé",
        _ => status,
    };

    static string IncomeKind(string kind) => kind == "brut" ? "brut" : "net";

    static string IncomeFreq(string frequency) => frequency switch
    {
        "annuel" => "annuel",
        "bihebdomadaire" => "bi-hebdomadaire",
        "hebdomadaire" => "hebdomadaire",
        _ => "mensuel",
    };
}
