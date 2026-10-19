import { monthKey, monthlyIncome, sum, todayISO } from './format';
import type { AppState, CalEvent, DocItem, DueRef, Expense, Goal, PayStatus, Person, Policy, Task } from './types';

export function personById(state: AppState, id?: string) {
  return state.people.find((p) => p.id === id);
}

export function household(state: AppState) {
  return state.people.filter((p) => p.household);
}

export function canSeeEvent(viewer: Person, event: CalEvent) {
  if (viewer.role === 'parent') return true;
  if (viewer.role === 'proche') {
    if (event.sensitive === 'medical' || event.sensitive === 'financier') return false;
    return event.sharedWithIds.includes(viewer.id) || event.companionId === viewer.id;
  }
  if (event.sensitive === 'medical') return viewer.id === event.memberId && viewer.age >= 10;
  if (event.audience === 'famille') return viewer.household;
  return event.memberId === viewer.id || event.companionId === viewer.id;
}

export function canSeeNotes(viewer: Person, event: CalEvent) {
  if (!event.notes) return false;
  if (event.sensitive === 'medical') {
    if (viewer.role === 'parent') return true;
    return viewer.id === event.memberId && viewer.age >= 10;
  }
  return canSeeEvent(viewer, event);
}

export function canSeeDoc(viewer: Person, doc: DocItem) {
  if (viewer.role === 'parent') return true;
  if (viewer.role === 'proche') return doc.sharedWithIds.includes(viewer.id) && doc.sensitivity === 'general';
  if (doc.sensitivity === 'financier' || doc.sensitivity === 'medical') return false;
  return doc.memberIds.includes(viewer.id);
}

export function canSeeExpense(viewer: Person, expense: Expense) {
  if (viewer.role === 'parent') return true;
  if (viewer.role !== 'enfant' || viewer.age < 13) return false;
  if (!expense.beneficiaryIds.includes(viewer.id)) return false;
  return expense.category === 'enfants' || expense.category === 'scolarite' || expense.category === 'loisirs';
}

export function canSeeGoal(viewer: Person, goal: Goal) {
  if (viewer.role === 'parent') return goal.visibility === 'parents' || goal.holderId === viewer.id;
  if (viewer.role === 'enfant' && viewer.age >= 13) return goal.holderId === viewer.id;
  return false;
}

export function canSeeContributors(viewer: Person) {
  return viewer.role === 'parent';
}

export function canSeePolicy(viewer: Person, policy: Policy) {
  if (viewer.role === 'parent') return true;
  if (viewer.role === 'enfant' && viewer.age >= 13) {
    return policy.insuredIds.includes(viewer.id) || policy.beneficiaryIds.includes(viewer.id);
  }
  return false;
}

export function canSeePolicyDetails(viewer: Person) {
  return viewer.role === 'parent';
}

export function canSeeTask(viewer: Person, task: Task) {
  if (viewer.role === 'parent') return true;
  if (viewer.role === 'enfant') return task.assigneeId === viewer.id;
  return false;
}

export function canSeeIncome(viewer: Person) {
  return viewer.role === 'parent';
}

export function goalConfirmed(goal: Goal) {
  return sum(goal.moves.filter((m) => m.status === 'confirme').map((m) => m.amount));
}

export function goalByStatus(goal: Goal, status: PayStatus) {
  return sum(goal.moves.filter((m) => m.status === status).map((m) => m.amount));
}

export type Due = {
  ref: DueRef;
  title: string;
  who: string;
  amount: number;
  date: string;
  status: PayStatus;
  household: boolean;
};

export function collectDues(state: AppState): Due[] {
  const dues: Due[] = [];
  for (const expense of state.expenses) {
    if (expense.status === 'confirme') continue;
    dues.push({
      ref: { kind: 'expense', id: expense.id },
      title: expense.label,
      who: '',
      amount: expense.amount,
      date: expense.date,
      status: expense.status,
      household: true,
    });
  }
  for (const goal of state.goals) {
    for (const move of goal.moves) {
      if (move.status === 'confirme') continue;
      dues.push({
        ref: { kind: 'move', goalId: goal.id, moveId: move.id },
        title: `${goal.title} — ${move.label}`,
        who: move.memberId,
        amount: move.amount,
        date: move.date,
        status: move.status,
        household: true,
      });
    }
  }
  for (const tontine of state.tontines) {
    for (const payment of tontine.payments) {
      if (payment.status === 'confirme') continue;
      dues.push({
        ref: { kind: 'tontine', tontineId: tontine.id, paymentId: payment.id },
        title: `Cotisation · ${tontine.name}`,
        who: payment.memberId ?? payment.name,
        amount: payment.amount,
        date: payment.dueDate,
        status: payment.status,
        household: Boolean(payment.memberId),
      });
    }
  }
  for (const policy of state.policies) {
    if (policy.premiumStatus === 'confirme') continue;
    dues.push({
      ref: { kind: 'policy', id: policy.id },
      title: `Prime · ${policy.type}`,
      who: policy.subscriberId,
      amount: policy.premium,
      date: policy.premiumDueDate,
      status: policy.premiumStatus,
      household: true,
    });
  }
  return dues.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export function upcomingDues(state: AppState, from = todayISO()) {
  return collectDues(state).filter((d) => d.household && d.date >= from);
}

export function confirmedSpend(state: AppState, month = monthKey(todayISO())) {
  return sum(state.expenses.filter((e) => e.status === 'confirme' && monthKey(e.date) === month).map((e) => e.amount));
}

export type MonthFlow = {
  income: number;
  expenseConfirmed: number;
  expenseOpen: number;
  savings: number;
  tontine: number;
  premiums: number;
  available: number;
};

export function monthFlow(state: AppState, month: string): MonthFlow {
  const income = sum(
    state.incomes
      .filter((i) => i.status === 'confirme' && monthKey(i.date) === month)
      .map((i) => monthlyIncome(i.amount, i.frequency ?? 'mensuel')),
  );
  const expenseConfirmed = sum(state.expenses.filter((e) => e.status === 'confirme' && monthKey(e.date) === month).map((e) => e.amount));
  const expenseOpen = sum(state.expenses.filter((e) => e.status !== 'confirme' && monthKey(e.date) === month).map((e) => e.amount));
  const savings = sum(state.goals.flatMap((g) => g.moves).filter((m) => monthKey(m.date) === month).map((m) => m.amount));
  const tontine = sum(
    state.tontines.flatMap((t) => t.payments).filter((p) => p.memberId && monthKey(p.dueDate) === month).map((p) => p.amount),
  );
  const premiums = sum(state.policies.filter((p) => monthKey(p.premiumDueDate) === month).map((p) => p.premium));
  return {
    income,
    expenseConfirmed,
    expenseOpen,
    savings,
    tontine,
    premiums,
    available: income - expenseConfirmed - expenseOpen - savings - tontine - premiums,
  };
}
