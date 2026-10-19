export type Role = 'parent' | 'enfant' | 'proche';
export type PayStatus = 'prevu' | 'declare' | 'confirme';
export type Visibility = 'prive' | 'parents';
export type Sensitivity = 'general' | 'financier' | 'medical';

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'f' | 'm' | '';
  role: Role;
  relation: string;
  color: string;
  soft: string;
  household: boolean;
  isSuperAdmin: boolean;
  username: string;
};

export type Income = {
  id: string;
  label: string;
  amount: number;
  memberId: string;
  date: string;
  status: PayStatus;
};

export type ExpenseCategory =
  | 'logement'
  | 'alimentation'
  | 'enfants'
  | 'transport'
  | 'scolarite'
  | 'sante'
  | 'loisirs'
  | 'autre';

export type Expense = {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  payerId: string;
  beneficiaryIds: string[];
  status: PayStatus;
  recurring: boolean;
  activityId?: string;
};

export type EventKind = 'activite' | 'medical' | 'scolaire' | 'famille';

export type CalEvent = {
  id: string;
  title: string;
  kind: EventKind;
  date: string;
  time: string;
  memberId: string;
  companionId?: string;
  transportId?: string;
  place?: string;
  professional?: string;
  notes?: string;
  activityId?: string;
  audience: 'famille' | 'prive';
  sensitive: 'aucune' | 'medical' | 'financier';
  sharedWithIds: string[];
};

export type Activity = {
  id: string;
  name: string;
  memberId: string;
  time: string;
  place: string;
  sessionCost: number;
  payerId: string;
  transportId: string;
  gearNote: string;
};

export type SavingsKind = 'personnel' | 'scolaire' | 'familial';

export type MoneyMove = {
  id: string;
  memberId: string;
  amount: number;
  status: PayStatus;
  date: string;
  label: string;
};

export type Goal = {
  id: string;
  kind: SavingsKind;
  title: string;
  holderId?: string;
  beneficiaryIds: string[];
  target: number;
  visibility: Visibility;
  moves: MoneyMove[];
};

export type TontineParticipant = {
  name: string;
  memberId?: string;
  order: number;
  receptionDate: string;
  received: boolean;
};

export type TontinePayment = {
  id: string;
  name: string;
  memberId?: string;
  dueDate: string;
  amount: number;
  status: PayStatus;
  late: boolean;
};

export type Tontine = {
  id: string;
  name: string;
  organizerId: string;
  amount: number;
  frequency: string;
  participants: TontineParticipant[];
  payments: TontinePayment[];
};

export type Policy = {
  id: string;
  type: string;
  insurer: string;
  policyNumber: string;
  subscriberId: string;
  insuredIds: string[];
  beneficiaryIds: string[];
  premium: number;
  period: string;
  renewalDate: string;
  premiumDueDate: string;
  premiumStatus: PayStatus;
  documentId?: string;
};

export type DocCategory = 'facture' | 'scolaire' | 'assurance' | 'medical' | 'autorisation' | 'autre';

export type DocItem = {
  id: string;
  title: string;
  category: DocCategory;
  date: string;
  memberIds: string[];
  sensitivity: Sensitivity;
  sharedWithIds: string[];
};

export type Task = {
  id: string;
  title: string;
  assigneeId: string;
  due: string;
  done: boolean;
  activityId?: string;
};

export type ChildRequest = {
  id: string;
  authorId: string;
  title: string;
  detail: string;
  date: string;
};

export type ChildNote = {
  id: string;
  authorId: string;
  title: string;
  body: string;
  date: string;
};

export type AppState = {
  people: Person[];
  incomes: Income[];
  expenses: Expense[];
  events: CalEvent[];
  activities: Activity[];
  goals: Goal[];
  tontines: Tontine[];
  policies: Policy[];
  documents: DocItem[];
  tasks: Task[];
  requests: ChildRequest[];
  notes: ChildNote[];
  viewerId: string;
  maskNotifications: boolean;
  monthlyBudget: number;
  categoryLimits: CategoryLimits;
};

export type CategoryLimits = Record<'logement' | 'alimentation' | 'enfants' | 'transport' | 'sante' | 'loisirs', number>;

export type DueRef =
  | { kind: 'expense'; id: string }
  | { kind: 'move'; goalId: string; moveId: string }
  | { kind: 'tontine'; tontineId: string; paymentId: string }
  | { kind: 'policy'; id: string };

export type ActivityBundle = {
  activity: Activity;
  events: CalEvent[];
  expense?: Expense;
  task?: Task;
};
