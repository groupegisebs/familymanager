using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace FamiRepere.Server;

public sealed class FamilyDb
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    readonly string _connectionString;

    static readonly (string Color, string Soft)[] Palette =
    [
        ("#8b5cf6", "#f3e8ff"),
        ("#ec4899", "#fde7f3"),
        ("#0ea5e9", "#e7f6ff"),
        ("#f472b6", "#ffe8f4"),
        ("#0f9f6e", "#e5f7ef"),
        ("#f59e0b", "#fff4e0"),
        ("#14b8a6", "#e6faf7"),
        ("#6366f1", "#eef2ff"),
    ];

    public FamilyDb(string connectionString)
    {
        _connectionString = connectionString;
        var builder = new SqliteConnectionStringBuilder(connectionString);
        var path = builder.DataSource;
        if (!string.IsNullOrWhiteSpace(path) && path != ":memory:")
        {
            var dir = Path.GetDirectoryName(Path.GetFullPath(path));
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
        }
        using var db = Open();
        foreach (var sql in new[]
        {
            "PRAGMA journal_mode=WAL;",
            """
            CREATE TABLE IF NOT EXISTS people (
              id TEXT PRIMARY KEY,
              first_name TEXT NOT NULL,
              last_name TEXT NOT NULL,
              age INTEGER NOT NULL,
              gender TEXT NOT NULL,
              role TEXT NOT NULL,
              relation TEXT NOT NULL,
              color TEXT NOT NULL,
              soft TEXT NOT NULL,
              household INTEGER NOT NULL,
              is_super_admin INTEGER NOT NULL,
              username TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              mask_notifications INTEGER NOT NULL
            )
            """,
            "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL)",
            "CREATE TABLE IF NOT EXISTS login_guards (key TEXT PRIMARY KEY, failures INTEGER NOT NULL, locked_until TEXT)",
            "CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (kind, id))",
            "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        }) db.Execute(sql);
        var hasAvatar = db.Query("PRAGMA table_info(people)").Any(column => string.Equals(column["name"]?.ToString(), "avatar", StringComparison.OrdinalIgnoreCase));
        if (!hasAvatar) db.Execute("ALTER TABLE people ADD COLUMN avatar TEXT NOT NULL DEFAULT ''");
    }

    SqliteConnection Open()
    {
        var db = new SqliteConnection(_connectionString);
        db.Open();
        return db;
    }

    public bool NeedsSetup()
    {
        using var db = Open();
        return db.QueryInt("SELECT COUNT(*) FROM people") == 0;
    }

    public Person CreateFather(string firstName, string lastName, int age, string username, string password)
    {
        using var db = Open();
        using var tx = db.BeginTransaction();
        if (db.QueryInt("SELECT COUNT(*) FROM people") != 0) throw new InvalidOperation("Le père du foyer est déjà créé.");
        var person = NewPerson(firstName, lastName, age, "m", "parent", "Papa", true, true, username, "#3b82f6", "#e7f0ff");
        InsertPerson(db, person, Hash(password));
        tx.Commit();
        return person;
    }

    public void EnsureSeedAdmin(string email, string password)
    {
        var username = email.Trim().ToLowerInvariant();
        if (username.Length < 3 || password.Length < 8) return;
        using var db = Open();
        if (db.QueryOne("SELECT id FROM people WHERE username = $u", ("$u", username)) is not null) return;
        var person = NewPerson("Administrateur", "", 0, "m", "parent", "Administrateur", true, true, username, "#3b82f6", "#e7f0ff");
        InsertPerson(db, person, Hash(password));
    }

    public Person CreateMember(Person actor, string firstName, string lastName, int age, string gender, string role, string relation, string username, string password, string avatar)
    {
        if (!actor.IsSuperAdmin) throw new InvalidOperation("Seul le père peut créer un membre.");
        if (role is not ("parent" or "enfant" or "proche")) throw new InvalidOperation("Rôle inconnu.");
        if (gender is not ("" or "f" or "m")) throw new InvalidOperation("Sexe inconnu.");
        if (!IsAvatar(avatar)) throw new InvalidOperation("Choisissez une icône.");
        using var db = Open();
        var count = db.QueryInt("SELECT COUNT(*) FROM people");
        var (color, soft) = Palette[(count - 1) % Palette.Length];
        var person = NewPerson(firstName, lastName, age, gender, role, relation, role != "proche", false, username, color, soft);
        person.Avatar = avatar;
        InsertPerson(db, person, Hash(password));
        return person;
    }

    public void SetAvatar(Person actor, string personId, string avatar)
    {
        if (!actor.IsSuperAdmin) throw new InvalidOperation("Seul le père peut choisir l’icône.");
        if (!IsAvatar(avatar)) throw new InvalidOperation("Icône inconnue.");
        using var db = Open();
        if (db.QueryOne("SELECT id FROM people WHERE id = $id", ("$id", personId)) is null)
            throw new InvalidOperation("Ce membre est introuvable.");
        db.Execute("UPDATE people SET avatar = $a WHERE id = $id", ("$a", avatar), ("$id", personId));
    }

    public void UpdateMember(Person actor, string personId, string firstName, string lastName, string role, string relation, string avatar, string username, string password)
    {
        if (!actor.IsSuperAdmin) throw new InvalidOperation("Seul le père peut modifier un membre.");
        if (role is not ("parent" or "enfant" or "proche")) throw new InvalidOperation("Rôle inconnu.");
        if (!IsAvatar(avatar)) throw new InvalidOperation("Choisissez une icône.");
        if (string.IsNullOrWhiteSpace(firstName) || firstName.Trim().Length > 60) throw new InvalidOperation("Indiquez le prénom.");
        if (lastName.Trim().Length > 60) throw new InvalidOperation("Le nom est trop long.");
        if (string.IsNullOrWhiteSpace(relation) || relation.Trim().Length > 60) throw new InvalidOperation("Indiquez le lien familial.");
        var login = username.Trim().ToLowerInvariant();
        if (login.Length < 3 || login.Length > 80 || login.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '@' or '.' or '_' or '-')))
            throw new InvalidOperation("L’identifiant doit contenir au moins 3 caractères.");
        if (password.Length > 200 || (password.Length > 0 && password.Length < 8))
            throw new InvalidOperation("Le mot de passe doit contenir au moins 8 caractères.");
        using var db = Open();
        var row = db.QueryOne("SELECT is_super_admin FROM people WHERE id = $id", ("$id", personId));
        if (row is null) throw new InvalidOperation("Ce membre est introuvable.");
        var admin = Convert.ToInt32(row["is_super_admin"]) == 1;
        if (admin && role != "parent") throw new InvalidOperation("Le père reste parent.");
        var household = admin || role != "proche" ? 1 : 0;
        if (password.Length > 0)
        {
            db.Execute("""
                UPDATE people
                SET first_name = $fn, last_name = $ln, role = $role, relation = $rel, avatar = $avatar, username = $u, household = $h, password_hash = $pw
                WHERE id = $id
                """,
                ("$fn", firstName.Trim()), ("$ln", lastName.Trim()), ("$role", role), ("$rel", relation.Trim()), ("$avatar", avatar),
                ("$u", login), ("$h", household), ("$pw", Hash(password)), ("$id", personId));
        }
        else
        {
            db.Execute("""
                UPDATE people
                SET first_name = $fn, last_name = $ln, role = $role, relation = $rel, avatar = $avatar, username = $u, household = $h
                WHERE id = $id
                """,
                ("$fn", firstName.Trim()), ("$ln", lastName.Trim()), ("$role", role), ("$rel", relation.Trim()), ("$avatar", avatar),
                ("$u", login), ("$h", household), ("$id", personId));
        }
    }

    public static bool IsAvatar(string avatar) => avatar is "thomas" or "sophie" or "emma" or "lucas" or "chloe" or "camille";

    public string OpenSession(string username, string password)
    {
        var name = username.Trim().ToLowerInvariant();
        if (name.Length is < 3 or > 80 || password.Length is < 1 or > 200)
            throw new InvalidOperation("Identifiant ou mot de passe incorrect.");
        if (IsLocked("user:" + name))
            throw new InvalidOperation("Trop de tentatives. Réessayez dans quelques minutes.");
        using var db = Open();
        var row = db.QueryOne("SELECT id, password_hash FROM people WHERE username = $u", ("$u", name));
        var stored = row?["password_hash"]?.ToString() ?? DummyHash;
        var ok = Verify(password, stored);
        if (row is null || !ok)
        {
            if (row is not null) RegisterFailure("user:" + name);
            throw new InvalidOperation("Identifiant ou mot de passe incorrect.");
        }
        ClearGuard("user:" + name);
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var expires = DateTime.UtcNow.AddDays(14).ToString("o");
        db.Execute("DELETE FROM sessions WHERE expires_at <= $now", ("$now", DateTime.UtcNow.ToString("o")));
        db.Execute("INSERT INTO sessions (token, user_id, expires_at) VALUES ($t, $u, $e)", ("$t", SessionKey(token)), ("$u", row["id"]!.ToString()!), ("$e", expires));
        return token;
    }

    public void CloseSession(string? token)
    {
        if (string.IsNullOrEmpty(token)) return;
        using var db = Open();
        db.Execute("DELETE FROM sessions WHERE token = $t", ("$t", SessionKey(token)));
    }

    public Person? FindBySession(string? token)
    {
        if (string.IsNullOrEmpty(token) || token.Length > 128) return null;
        using var db = Open();
        var row = db.QueryOne("""
            SELECT p.* FROM sessions s
            JOIN people p ON p.id = s.user_id
            WHERE s.token = $t AND s.expires_at > $now
            """, ("$t", SessionKey(token)), ("$now", DateTime.UtcNow.ToString("o")));
        return row is null ? null : MapPerson(row);
    }

    bool IsLocked(string key)
    {
        using var db = Open();
        var row = db.QueryOne("SELECT locked_until FROM login_guards WHERE key = $k", ("$k", key));
        if (row is null || row["locked_until"] is null) return false;
        return string.CompareOrdinal(S(row, "locked_until"), DateTime.UtcNow.ToString("o")) > 0;
    }

    void RegisterFailure(string key)
    {
        using var db = Open();
        var row = db.QueryOne("SELECT failures FROM login_guards WHERE key = $k", ("$k", key));
        var failures = (row is null ? 0 : Convert.ToInt32(row["failures"])) + 1;
        string? until = failures >= 8 ? DateTime.UtcNow.AddMinutes(15).ToString("o") : null;
        if (until is not null) failures = 0;
        db.Execute("""
            INSERT INTO login_guards (key, failures, locked_until) VALUES ($k, $f, $u)
            ON CONFLICT(key) DO UPDATE SET failures = $f, locked_until = $u
            """, ("$k", key), ("$f", failures), ("$u", until));
    }

    void ClearGuard(string key)
    {
        using var db = Open();
        db.Execute("DELETE FROM login_guards WHERE key = $k", ("$k", key));
    }

    static string SessionKey(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public AppState ReadAll()
    {
        using var db = Open();
        var limits = LoadLimits(db);
        return new AppState
        {
            People = db.Query("SELECT * FROM people ORDER BY is_super_admin DESC, first_name").Select(MapPerson).ToList(),
            Incomes = Load<Income>(db, "income"),
            Expenses = Load<Expense>(db, "expense"),
            Events = Load<CalEvent>(db, "event"),
            Activities = Load<Activity>(db, "activity"),
            Goals = Load<Goal>(db, "goal"),
            Tontines = Load<Tontine>(db, "tontine"),
            Policies = Load<Policy>(db, "policy"),
            Investments = Load<Investment>(db, "investment"),
            Assets = Load<Asset>(db, "asset"),
            Documents = Load<DocItem>(db, "document"),
            Tasks = Load<FamTask>(db, "task"),
            Requests = Load<ChildRequest>(db, "request"),
            Notes = Load<ChildNote>(db, "note"),
            CategoryLimits = limits,
            MonthlyBudget = limits.Logement + limits.Alimentation + limits.Enfants + limits.Transport + limits.Sante + limits.Loisirs,
        };
    }

    public AppState View(Person viewer) => Access.ForViewer(ReadAll(), viewer);

    public void SaveBudgets(CategoryLimits limits)
    {
        using var db = Open();
        db.Execute("INSERT INTO settings (key, value) VALUES ('budgets', $v) ON CONFLICT(key) DO UPDATE SET value = $v",
            ("$v", JsonSerializer.Serialize(limits, Json)));
    }

    public List<string> OtherParentEmails(string exceptId)
    {
        using var db = Open();
        return db.Query("SELECT username FROM people WHERE role = 'parent' AND id != $id", ("$id", exceptId))
            .Select(r => S(r, "username"))
            .Where(u => u.Contains('@'))
            .ToList();
    }

    public List<string> ParentEmails()
    {
        using var db = Open();
        return db.Query("SELECT username FROM people WHERE role = 'parent'")
            .Select(r => S(r, "username"))
            .Where(u => u.Contains('@'))
            .ToList();
    }

    public string? Setting(string key)
    {
        using var db = Open();
        var row = db.QueryOne("SELECT value FROM settings WHERE key = $k", ("$k", key));
        return row is null ? null : S(row, "value");
    }

    public void Setting(string key, string value)
    {
        using var db = Open();
        db.Execute("INSERT INTO settings (key, value) VALUES ($k, $v) ON CONFLICT(key) DO UPDATE SET value = $v", ("$k", key), ("$v", value));
    }

    public void SetMask(string userId, bool mask)
    {
        using var db = Open();
        db.Execute("UPDATE people SET mask_notifications = $m WHERE id = $id", ("$m", mask ? 1 : 0), ("$id", userId));
    }

    public void ToggleTask(Person viewer, string id)
    {
        var task = Require<FamTask>("task", id);
        if (viewer.Role != "parent" && task.AssigneeId != viewer.Id) throw new InvalidOperation("Cette tâche ne vous est pas attribuée.");
        task.Done = !task.Done;
        Upsert("task", task.Id, task);
    }

    public void Advance(Person viewer, DueRef due)
    {
        if (!Access.CanWrite(viewer)) throw new InvalidOperation("Seuls les parents confirment un paiement.");
        switch (due.Kind)
        {
            case "expense":
                var expense = Require<Expense>("expense", due.Id!);
                expense.Status = Next(expense.Status);
                Upsert("expense", expense.Id, expense);
                break;
            case "policy":
                var policy = Require<Policy>("policy", due.Id!);
                policy.PremiumStatus = Next(policy.PremiumStatus);
                Upsert("policy", policy.Id, policy);
                break;
            case "tontine":
                var tontine = Require<Tontine>("tontine", due.TontineId!);
                var payment = tontine.Payments.First(p => p.Id == due.PaymentId);
                payment.Status = Next(payment.Status);
                Upsert("tontine", tontine.Id, tontine);
                break;
            case "move":
                var goal = Require<Goal>("goal", due.GoalId!);
                var move = goal.Moves.First(m => m.Id == due.MoveId);
                move.Status = Next(move.Status);
                Upsert("goal", goal.Id, goal);
                break;
            default:
                throw new InvalidOperation("Paiement introuvable.");
        }
    }

    public void AddActivity(ActivityBundle bundle)
    {
        using var db = Open();
        using var tx = db.BeginTransaction();
        Upsert(db, "activity", bundle.Activity.Id, bundle.Activity);
        foreach (var ev in bundle.Events) Upsert(db, "event", ev.Id, ev);
        if (bundle.Expense is not null) Upsert(db, "expense", bundle.Expense.Id, bundle.Expense);
        if (bundle.Task is not null) Upsert(db, "task", bundle.Task.Id, bundle.Task);
        tx.Commit();
    }

    public void Add<T>(string kind, string id, T value) => Upsert(kind, id, value);

    static string Next(string status) => status switch
    {
        "prevu" => "declare",
        "declare" => "confirme",
        _ => status,
    };

    T Require<T>(string kind, string id)
    {
        using var db = Open();
        var row = db.QueryOne("SELECT payload FROM records WHERE kind = $k AND id = $id", ("$k", kind), ("$id", id));
        if (row is null) throw new InvalidOperation("Élément introuvable.");
        return JsonSerializer.Deserialize<T>(row["payload"]!.ToString()!, Json)!;
    }

    void Upsert<T>(string kind, string id, T value)
    {
        using var db = Open();
        Upsert(db, kind, id, value);
    }

    static void Upsert<T>(SqliteConnection db, string kind, string id, T value)
    {
        db.Execute("""
            INSERT INTO records (kind, id, payload) VALUES ($k, $id, $p)
            ON CONFLICT(kind, id) DO UPDATE SET payload = $p
            """, ("$k", kind), ("$id", id), ("$p", JsonSerializer.Serialize(value, Json)));
    }

    static List<T> Load<T>(SqliteConnection db, string kind) =>
        db.Query("SELECT payload FROM records WHERE kind = $k", ("$k", kind))
            .Select(r => JsonSerializer.Deserialize<T>(r["payload"]!.ToString()!, Json)!)
            .ToList();

    static CategoryLimits LoadLimits(SqliteConnection db)
    {
        var row = db.QueryOne("SELECT value FROM settings WHERE key = 'budgets'");
        if (row is null) return new CategoryLimits();
        return JsonSerializer.Deserialize<CategoryLimits>(row["value"]!.ToString()!, Json) ?? new CategoryLimits();
    }

    static Person NewPerson(string first, string last, int age, string gender, string role, string relation, bool household, bool admin, string username, string color, string soft) =>
        new()
        {
            Id = "p-" + Guid.NewGuid().ToString("N")[..10],
            FirstName = first.Trim(),
            LastName = last.Trim(),
            Age = age,
            Gender = gender,
            Role = role,
            Relation = relation.Trim(),
            Household = household,
            IsSuperAdmin = admin,
            Username = username.Trim().ToLowerInvariant(),
            Color = color,
            Soft = soft,
            MaskNotifications = true,
        };

    static void InsertPerson(SqliteConnection db, Person person, string hash)
    {
        db.Execute("""
            INSERT INTO people (id, first_name, last_name, age, gender, role, relation, color, soft, household, is_super_admin, username, password_hash, mask_notifications, avatar)
            VALUES ($id, $fn, $ln, $age, $g, $role, $rel, $c, $s, $h, $admin, $u, $pw, 1, $avatar)
            """,
            ("$id", person.Id), ("$fn", person.FirstName), ("$ln", person.LastName), ("$age", person.Age),
            ("$g", person.Gender), ("$role", person.Role), ("$rel", person.Relation), ("$c", person.Color),
            ("$s", person.Soft), ("$h", person.Household ? 1 : 0), ("$admin", person.IsSuperAdmin ? 1 : 0),
            ("$u", person.Username), ("$pw", hash), ("$avatar", person.Avatar));
    }

    static Person MapPerson(Dictionary<string, object?> row) => new()
    {
        Id = S(row, "id"),
        FirstName = S(row, "first_name"),
        LastName = S(row, "last_name"),
        Age = Convert.ToInt32(row["age"]),
        Gender = S(row, "gender"),
        Role = S(row, "role"),
        Relation = S(row, "relation"),
        Color = S(row, "color"),
        Soft = S(row, "soft"),
        Household = Convert.ToInt32(row["household"]) == 1,
        IsSuperAdmin = Convert.ToInt32(row["is_super_admin"]) == 1,
        Username = S(row, "username"),
        Avatar = row.TryGetValue("avatar", out var avatar) ? avatar?.ToString() ?? "" : "",
        MaskNotifications = Convert.ToInt32(row["mask_notifications"]) == 1,
    };

    static string S(Dictionary<string, object?> row, string key) => row[key]?.ToString() ?? "";

    static readonly string DummyHash = Hash("famirepere-timing");

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return Convert.ToBase64String(salt) + "." + Convert.ToBase64String(hash);
    }

    public static bool Verify(string password, string stored)
    {
        var parts = stored.Split('.');
        if (parts.Length != 2) return false;
        var salt = Convert.FromBase64String(parts[0]);
        var expected = Convert.FromBase64String(parts[1]);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return CryptographicOperations.FixedTimeEquals(hash, expected);
    }
}

public sealed class InvalidOperation : Exception
{
    public InvalidOperation(string message) : base(message) { }
}

static class SqliteExt
{
    public static void Execute(this SqliteConnection db, string sql, params (string Name, object? Value)[] args)
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (name, value) in args) cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    public static int QueryInt(this SqliteConnection db, string sql)
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = sql;
        return Convert.ToInt32(cmd.ExecuteScalar());
    }

    public static List<Dictionary<string, object?>> Query(this SqliteConnection db, string sql, params (string Name, object? Value)[] args)
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (name, value) in args) cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
        using var reader = cmd.ExecuteReader();
        var rows = new List<Dictionary<string, object?>>();
        while (reader.Read())
        {
            var row = new Dictionary<string, object?>();
            for (var i = 0; i < reader.FieldCount; i++) row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            rows.Add(row);
        }
        return rows;
    }

    public static Dictionary<string, object?>? QueryOne(this SqliteConnection db, string sql, params (string Name, object? Value)[] args) =>
        db.Query(sql, args).FirstOrDefault();
}
