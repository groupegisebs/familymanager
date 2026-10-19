import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ActivityBundle, AppState, CalEvent, CategoryLimits, DocItem, DueRef, Expense, Goal, Income, Policy, Task, Tontine } from './types';

type Phase = 'loading' | 'setup' | 'login' | 'ready';

type MemberInput = {
  firstName: string;
  lastName: string;
  age: number;
  gender: 'f' | 'm';
  role: 'parent' | 'enfant' | 'proche';
  relation: string;
  username: string;
  password: string;
};

type Store = {
  phase: Phase;
  state: AppState | null;
  error: string;
  addOpen: boolean;
  setAddOpen: (open: boolean) => void;
  toast: string;
  notify: (message: string) => void;
  setup: (body: { firstName: string; lastName: string; age: number; username: string; password: string }) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createMember: (body: MemberInput) => Promise<void>;
  toggleMask: () => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  advance: (ref: DueRef) => Promise<void>;
  addActivity: (bundle: ActivityBundle) => Promise<void>;
  addEvent: (event: CalEvent) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  addGoal: (goal: Goal) => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  addDocument: (document: DocItem) => Promise<void>;
  addIncome: (income: Income) => Promise<void>;
  addTontine: (tontine: Tontine) => Promise<void>;
  addPolicy: (policy: Policy) => Promise<void>;
  saveBudgets: (limits: CategoryLimits) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

async function request(path: string, body?: unknown): Promise<AppState | null> {
  const res = await fetch(path, {
    method: body === undefined && path.endsWith('/session') ? 'GET' : 'POST',
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) as { error?: string } & AppState : null;
  if (!res.ok) throw new Error(data?.error || 'La requête a échoué.');
  return data && data.people ? data : null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState('');

  function accept(next: AppState | null) {
    setState(next);
    setPhase(next ? 'ready' : 'login');
    setError('');
  }

  async function run(path: string, body?: unknown) {
    const next = await request(path, body);
    if (!next) {
      setState(null);
      setPhase('login');
      throw new Error('La session a expiré.');
    }
    accept(next);
  }

  useEffect(() => {
    let live = true;
    (async () => {
      const session = await request('/api/session');
      if (!live) return;
      if (session) {
        accept(session);
        return;
      }
      const status = await fetch('/api/setup/status').then((r) => r.json()) as { needsSetup: boolean };
      if (!live) return;
      setPhase(status.needsSetup ? 'setup' : 'login');
    })().catch(() => {
      if (live) {
        setError('Le serveur est injoignable.');
        setPhase('login');
      }
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const store: Store = {
    phase,
    state,
    error,
    addOpen,
    setAddOpen,
    toast,
    notify: setToast,
    setup: async (body) => accept(await request('/api/setup', body)),
    login: async (username, password) => accept(await request('/api/login', { username, password })),
    logout: async () => {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      setState(null);
      setPhase('login');
    },
    createMember: (body) => run('/api/members', body),
    toggleMask: () => run('/api/settings/mask', {}),
    toggleTask: (id) => run(`/api/tasks/${id}/toggle`, {}),
    advance: (ref) => run('/api/payments/advance', ref),
    addActivity: (bundle) => run('/api/activities', bundle),
    addEvent: (event) => run('/api/events', event),
    addExpense: (expense) => run('/api/expenses', expense),
    addGoal: (goal) => run('/api/goals', goal),
    addTask: (task) => run('/api/tasks', task),
    addDocument: (document) => run('/api/documents', document),
    addIncome: (income) => run('/api/incomes', income),
    addTontine: (tontine) => run('/api/tontines', tontine),
    addPolicy: (policy) => run('/api/policies', policy),
    saveBudgets: (limits) => run('/api/budgets', limits),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp hors provider');
  return ctx;
}
