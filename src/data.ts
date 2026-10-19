import type { AppState, CategoryLimits } from './types';

export const BUDGET_CATEGORIES = [
  'logement',
  'alimentation',
  'enfants',
  'transport',
  'sante',
  'loisirs',
] as const satisfies readonly (keyof CategoryLimits)[];

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
