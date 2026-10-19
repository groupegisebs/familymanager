namespace FamiRepere.Server;

public sealed class Person
{
    public string Id { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public int Age { get; set; }
    public string Gender { get; set; } = "m";
    public string Role { get; set; } = "parent";
    public string Relation { get; set; } = "";
    public string Color { get; set; } = "#3b82f6";
    public string Soft { get; set; } = "#e7f0ff";
    public bool Household { get; set; } = true;
    public bool IsSuperAdmin { get; set; }
    public string Username { get; set; } = "";
    public string Avatar { get; set; } = "";
    public bool MaskNotifications { get; set; } = true;
}

public sealed class Income
{
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public decimal Amount { get; set; }
    public string MemberId { get; set; } = "";
    public string Date { get; set; } = "";
    public string Status { get; set; } = "prevu";
    public string Kind { get; set; } = "net";
    public string Frequency { get; set; } = "mensuel";
}

public sealed class Expense
{
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public decimal Amount { get; set; }
    public string Category { get; set; } = "autre";
    public string Date { get; set; } = "";
    public string PayerId { get; set; } = "";
    public List<string> BeneficiaryIds { get; set; } = [];
    public string Status { get; set; } = "prevu";
    public bool Recurring { get; set; }
    public string? ActivityId { get; set; }
}

public sealed class CalEvent
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Kind { get; set; } = "famille";
    public string Date { get; set; } = "";
    public string Time { get; set; } = "";
    public string MemberId { get; set; } = "";
    public string? CompanionId { get; set; }
    public string? TransportId { get; set; }
    public string? Place { get; set; }
    public string? Professional { get; set; }
    public string? Notes { get; set; }
    public string? ActivityId { get; set; }
    public string Audience { get; set; } = "prive";
    public string Sensitive { get; set; } = "aucune";
    public List<string> SharedWithIds { get; set; } = [];
}

public sealed class Activity
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string MemberId { get; set; } = "";
    public string Time { get; set; } = "";
    public string Place { get; set; } = "";
    public decimal SessionCost { get; set; }
    public string PayerId { get; set; } = "";
    public string TransportId { get; set; } = "";
    public string GearNote { get; set; } = "";
}

public sealed class MoneyMove
{
    public string Id { get; set; } = "";
    public string MemberId { get; set; } = "";
    public decimal Amount { get; set; }
    public string Status { get; set; } = "prevu";
    public string Date { get; set; } = "";
    public string Label { get; set; } = "";
}

public sealed class Goal
{
    public string Id { get; set; } = "";
    public string Kind { get; set; } = "familial";
    public string Title { get; set; } = "";
    public string? HolderId { get; set; }
    public List<string> BeneficiaryIds { get; set; } = [];
    public decimal Target { get; set; }
    public string Visibility { get; set; } = "parents";
    public List<MoneyMove> Moves { get; set; } = [];
}

public sealed class TontineParticipant
{
    public string Name { get; set; } = "";
    public string? MemberId { get; set; }
    public int Order { get; set; }
    public string ReceptionDate { get; set; } = "";
    public bool Received { get; set; }
}

public sealed class TontinePayment
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? MemberId { get; set; }
    public string DueDate { get; set; } = "";
    public decimal Amount { get; set; }
    public string Status { get; set; } = "prevu";
    public bool Late { get; set; }
}

public sealed class Tontine
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string OrganizerId { get; set; } = "";
    public decimal Amount { get; set; }
    public string Frequency { get; set; } = "chaque dernier dimanche du mois";
    public List<TontineParticipant> Participants { get; set; } = [];
    public List<TontinePayment> Payments { get; set; } = [];
}

public sealed class Policy
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "";
    public string Insurer { get; set; } = "";
    public string PolicyNumber { get; set; } = "";
    public string SubscriberId { get; set; } = "";
    public List<string> InsuredIds { get; set; } = [];
    public List<string> BeneficiaryIds { get; set; } = [];
    public decimal Premium { get; set; }
    public string Period { get; set; } = "mois";
    public string RenewalDate { get; set; } = "";
    public string PremiumDueDate { get; set; } = "";
    public string PremiumStatus { get; set; } = "prevu";
    public string? DocumentId { get; set; }
}

public sealed class Investment
{
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public string Type { get; set; } = "autre";
    public string Institution { get; set; } = "";
    public string AccountRef { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public decimal InvestedAmount { get; set; }
    public decimal CurrentValue { get; set; }
    public string AcquiredDate { get; set; } = "";
    public string ExpectedYield { get; set; } = "";
    public string Notes { get; set; } = "";
}

public sealed class Asset
{
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public string Type { get; set; } = "autre";
    public string Description { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string CoOwnerId { get; set; } = "";
    public decimal EstimatedValue { get; set; }
    public decimal PurchaseValue { get; set; }
    public string AcquiredDate { get; set; } = "";
    public string Location { get; set; } = "";
    public decimal SharePercent { get; set; } = 100;
    public string Notes { get; set; } = "";
}

public sealed class DocItem
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Category { get; set; } = "autre";
    public string Date { get; set; } = "";
    public List<string> MemberIds { get; set; } = [];
    public string Sensitivity { get; set; } = "general";
    public List<string> SharedWithIds { get; set; } = [];
}

public sealed class FamTask
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string AssigneeId { get; set; } = "";
    public string Due { get; set; } = "";
    public bool Done { get; set; }
    public string? ActivityId { get; set; }
}

public sealed class ChildRequest
{
    public string Id { get; set; } = "";
    public string AuthorId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Detail { get; set; } = "";
    public string Date { get; set; } = "";
}

public sealed class ChildNote
{
    public string Id { get; set; } = "";
    public string AuthorId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string Date { get; set; } = "";
}

public sealed class CategoryLimits
{
    public decimal Logement { get; set; }
    public decimal Alimentation { get; set; }
    public decimal Enfants { get; set; }
    public decimal Transport { get; set; }
    public decimal Sante { get; set; }
    public decimal Loisirs { get; set; }
}

public sealed class AppState
{
    public List<Person> People { get; set; } = [];
    public List<Income> Incomes { get; set; } = [];
    public List<Expense> Expenses { get; set; } = [];
    public List<CalEvent> Events { get; set; } = [];
    public List<Activity> Activities { get; set; } = [];
    public List<Goal> Goals { get; set; } = [];
    public List<Tontine> Tontines { get; set; } = [];
    public List<Policy> Policies { get; set; } = [];
    public List<Investment> Investments { get; set; } = [];
    public List<Asset> Assets { get; set; } = [];
    public List<DocItem> Documents { get; set; } = [];
    public List<FamTask> Tasks { get; set; } = [];
    public List<ChildRequest> Requests { get; set; } = [];
    public List<ChildNote> Notes { get; set; } = [];
    public string ViewerId { get; set; } = "";
    public bool MaskNotifications { get; set; } = true;
    public decimal MonthlyBudget { get; set; }
    public CategoryLimits CategoryLimits { get; set; } = new();
}

public sealed class ActivityBundle
{
    public Activity Activity { get; set; } = new();
    public List<CalEvent> Events { get; set; } = [];
    public Expense? Expense { get; set; }
    public FamTask? Task { get; set; }
}

public sealed class DueRef
{
    public string Kind { get; set; } = "";
    public string? Id { get; set; }
    public string? GoalId { get; set; }
    public string? MoveId { get; set; }
    public string? TontineId { get; set; }
    public string? PaymentId { get; set; }
}
