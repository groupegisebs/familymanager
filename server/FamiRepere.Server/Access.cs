namespace FamiRepere.Server;

public static class Access
{
    public static AppState ForViewer(AppState full, Person viewer)
    {
        var state = new AppState
        {
            ViewerId = viewer.Id,
            MaskNotifications = viewer.MaskNotifications,
            People = full.People.Select(p => PublicPerson(p, viewer)).ToList(),
            MonthlyBudget = viewer.Role == "parent" ? full.MonthlyBudget : 0,
            CategoryLimits = viewer.Role == "parent" ? full.CategoryLimits : new CategoryLimits(),
        };

        state.Events = full.Events.Where(e => CanSeeEvent(viewer, e)).ToList();
        state.Tasks = full.Tasks.Where(t => CanSeeTask(viewer, t)).ToList();
        state.Documents = full.Documents.Where(d => CanSeeDoc(viewer, d)).ToList();
        state.Expenses = full.Expenses.Where(e => CanSeeExpense(viewer, e)).ToList();
        state.Goals = full.Goals.Where(g => CanSeeGoal(viewer, g)).Select(g => HideContributors(viewer, g)).ToList();
        state.Policies = full.Policies.Where(p => CanSeePolicy(viewer, p)).Select(p => HidePolicy(viewer, p)).ToList();
        state.Incomes = viewer.Role == "parent" ? full.Incomes : [];
        state.Activities = full.Activities.Where(a => CanSeeActivity(viewer, a)).ToList();
        state.Tontines = viewer.Role == "parent" ? full.Tontines : [];
        if (viewer.Role != "parent")
        {
            foreach (var activity in state.Activities)
                activity.SessionCost = 0;
        }
        return state;
    }

    static Person PublicPerson(Person person, Person viewer)
    {
        var copy = new Person
        {
            Id = person.Id,
            FirstName = person.FirstName,
            LastName = person.LastName,
            Age = person.Age,
            Gender = person.Gender,
            Role = person.Role,
            Relation = person.Relation,
            Color = person.Color,
            Soft = person.Soft,
            Household = person.Household,
            IsSuperAdmin = person.IsSuperAdmin,
            MaskNotifications = person.Id == viewer.Id && person.MaskNotifications,
            Username = viewer.IsSuperAdmin || viewer.Id == person.Id ? person.Username : "",
        };
        return copy;
    }

    static bool CanSeeEvent(Person viewer, CalEvent e)
    {
        if (viewer.Role == "parent") return true;
        if (viewer.Role == "proche")
        {
            if (e.Sensitive is "medical" or "financier") return false;
            return e.SharedWithIds.Contains(viewer.Id) || e.CompanionId == viewer.Id;
        }
        if (e.Sensitive == "medical") return viewer.Id == e.MemberId && viewer.Age >= 10;
        if (e.Audience == "famille") return viewer.Household;
        return e.MemberId == viewer.Id || e.CompanionId == viewer.Id;
    }

    static bool CanSeeTask(Person viewer, FamTask task) =>
        viewer.Role == "parent" || (viewer.Role == "enfant" && task.AssigneeId == viewer.Id);

    static bool CanSeeDoc(Person viewer, DocItem doc)
    {
        if (viewer.Role == "parent") return true;
        if (viewer.Role == "proche") return doc.SharedWithIds.Contains(viewer.Id) && doc.Sensitivity == "general";
        if (doc.Sensitivity is "financier" or "medical") return false;
        return doc.MemberIds.Contains(viewer.Id);
    }

    static bool CanSeeExpense(Person viewer, Expense expense)
    {
        if (viewer.Role == "parent") return true;
        if (viewer.Role != "enfant" || viewer.Age < 13) return false;
        if (!expense.BeneficiaryIds.Contains(viewer.Id)) return false;
        return expense.Category is "enfants" or "scolarite" or "loisirs";
    }

    static bool CanSeeGoal(Person viewer, Goal goal)
    {
        if (viewer.Role == "parent") return goal.Visibility == "parents" || goal.HolderId == viewer.Id;
        if (viewer.Role == "enfant" && viewer.Age >= 13) return goal.HolderId == viewer.Id;
        return false;
    }

    static Goal HideContributors(Person viewer, Goal goal)
    {
        if (viewer.Role == "parent") return goal;
        goal.Moves = [];
        return goal;
    }

    static bool CanSeePolicy(Person viewer, Policy policy)
    {
        if (viewer.Role == "parent") return true;
        if (viewer.Role == "enfant" && viewer.Age >= 13)
            return policy.InsuredIds.Contains(viewer.Id) || policy.BeneficiaryIds.Contains(viewer.Id);
        return false;
    }

    static Policy HidePolicy(Person viewer, Policy policy)
    {
        if (viewer.Role == "parent") return policy;
        policy.PolicyNumber = "";
        policy.Premium = 0;
        return policy;
    }

    static bool CanSeeActivity(Person viewer, Activity activity)
    {
        if (viewer.Role == "parent") return true;
        if (viewer.Role == "enfant") return activity.MemberId == viewer.Id;
        return false;
    }

    public static bool CanWrite(Person viewer) => viewer.Role == "parent";
}
