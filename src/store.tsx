import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { createEmpty } from './data';
import { nextStatus } from './format';
import type { ActivityBundle, AppState, CalEvent, DocItem, DueRef, Expense, ExpenseCategory, Goal, Person, Task } from './types';

const KEY = 'famirepere.v2';

type Action =
  | { type: 'set-viewer'; id: string }
  | { type: 'toggle-mask' }
  | { type: 'reset' }
  | { type: 'add-person'; person: Person }
  | { type: 'set-monthly-budget'; amount: number }
  | { type: 'set-category-limit'; category: ExpenseCategory; amount: number }
  | { type: 'toggle-task'; id: string }
  | { type: 'advance'; ref: DueRef }
  | { type: 'add-activity'; bundle: ActivityBundle }
  | { type: 'add-event'; event: CalEvent }
  | { type: 'add-expense'; expense: Expense }
  | { type: 'add-goal'; goal: Goal }
  | { type: 'add-task'; task: Task }
  | { type: 'add-document'; document: DocItem };

function bump<T extends { id: string; status: AppState['expenses'][number]['status'] }>(items: T[], id: string): T[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    const status = nextStatus(item.status);
    return status ? { ...item, status } : item;
  });
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'set-viewer':
      return { ...state, viewerId: action.id };
    case 'toggle-mask':
      return { ...state, maskNotifications: !state.maskNotifications };
    case 'reset':
      return createSeed();
    case 'toggle-task':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)) };
    case 'advance': {
      const ref = action.ref;
      if (ref.kind === 'expense') return { ...state, expenses: bump(state.expenses, ref.id) };
      if (ref.kind === 'policy') {
        return {
          ...state,
          policies: state.policies.map((p) => {
            if (p.id !== ref.id) return p;
            const premiumStatus = nextStatus(p.premiumStatus);
            return premiumStatus ? { ...p, premiumStatus } : p;
          }),
        };
      }
      if (ref.kind === 'tontine') {
        return {
          ...state,
          tontines: state.tontines.map((t) =>
            t.id !== ref.tontineId
              ? t
              : { ...t, payments: bump(t.payments, ref.paymentId) },
          ),
        };
      }
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id !== ref.goalId ? g : { ...g, moves: bump(g.moves, ref.moveId) },
        ),
      };
    }
    case 'add-activity':
      return {
        ...state,
        activities: [...state.activities, action.bundle.activity],
        events: [...state.events, ...action.bundle.events],
        expenses: action.bundle.expense ? [...state.expenses, action.bundle.expense] : state.expenses,
        tasks: action.bundle.task ? [...state.tasks, action.bundle.task] : state.tasks,
      };
    case 'add-event':
      return { ...state, events: [...state.events, action.event] };
    case 'add-expense':
      return { ...state, expenses: [...state.expenses, action.expense] };
    case 'add-goal':
      return { ...state, goals: [...state.goals, action.goal] };
    case 'add-task':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'add-document':
      return { ...state, documents: [...state.documents, action.document] };
    default:
      return state;
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createSeed();
    const parsed = JSON.parse(raw) as { version?: number; state?: AppState };
    if (parsed.version !== 1 || !parsed.state?.people) return createSeed();
    return parsed.state;
  } catch {
    return createSeed();
  }
}

type Store = {
  state: AppState;
  dispatch: Dispatch<Action>;
  addOpen: boolean;
  setAddOpen: (open: boolean) => void;
  toast: string;
  notify: (message: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [addOpen, setAddOpen] = useReducer((_: boolean, next: boolean) => next, false);
  const [toast, setToast] = useReducer((_: string, next: string) => next, '');

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, state }));
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const notify = (message: string) => setToast(message);

  return <Ctx.Provider value={{ state, dispatch, addOpen, setAddOpen, toast, notify }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp hors provider');
  return ctx;
}
