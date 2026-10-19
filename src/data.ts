import type { AppState, ExpenseCategory } from './types';

export const BUDGET_CATEGORIES: ExpenseCategory[] = [
  'logement',
  'alimentation',
  'enfants',
  'transport',
  'sante',
  'loisirs',
];

export function createEmpty(): AppState {
  return {
    viewerId: '',
    maskNotifications: true,
    people: [],
    incomes: [],
    expenses: [],
    events: [],
    activities: [],
    goals: [],
    tontines: [],
    policies: [],
    documents: [],
    tasks: [],
    monthlyBudget: 0,
    categoryLimits: {
      logement: 0,
      alimentation: 0,
      enfants: 0,
      transport: 0,
      sante: 0,
      loisirs: 0,
    },
  };
}
