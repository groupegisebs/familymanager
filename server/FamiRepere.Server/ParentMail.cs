using System.Net;
using System.Net.Mail;

namespace FamiRepere.Server;

public sealed class ParentMail
{
    readonly IConfiguration _config;
    readonly ILogger<ParentMail> _log;

    public ParentMail(IConfiguration config, ILogger<ParentMail> log)
    {
        _config = config;
        _log = log;
    }

    public bool Enabled => !string.IsNullOrWhiteSpace(_config["Mail:Host"]);

    public async Task SendAsync(IEnumerable<string> recipients, string subject, string body)
    {
        if (!Enabled) return;
        foreach (var address in recipients.Where(a => a.Contains('@')).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            try
            {
                using var message = new MailMessage
                {
                    From = new MailAddress(_config["Mail:From"] ?? _config["Mail:User"] ?? address),
                    Subject = subject,
                    Body = body,
                };
                message.To.Add(address);
                var port = int.TryParse(_config["Mail:Port"], out var parsed) ? parsed : 587;
#pragma warning disable SYSLIB0014
                using var smtp = new SmtpClient(_config["Mail:Host"], port)
                {
                    EnableSsl = _config["Mail:Ssl"] != "false",
                };
#pragma warning restore SYSLIB0014
                var user = _config["Mail:User"];
                if (!string.IsNullOrWhiteSpace(user))
                    smtp.Credentials = new NetworkCredential(user, _config["Mail:Password"]);
                await smtp.SendMailAsync(message);
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
        Income i => ("Revenu", $"{i.Label}\n{i.Amount:0.##} $ · {Label(i.Status)}"),
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
}
