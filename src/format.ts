import type { AssetType, ExpenseCategory, IncomeFrequency, IncomeKind, InvestmentType, PayStatus, Person, SavingsKind } from './types';

export const INCOME_KIND_LABEL: Record<IncomeKind, string> = {
  brut: 'Brut',
  net: 'Net',
};

export const INCOME_FREQUENCY_LABEL: Record<IncomeFrequency, string> = {
  annuel: 'Annuel',
  mensuel: 'Mensuel',
  bihebdomadaire: 'Bi-hebdomadaire',
  hebdomadaire: 'Hebdomadaire',
};

export function monthlyIncome(amount: number, frequency: IncomeFrequency = 'mensuel') {
  if (frequency === 'annuel') return amount / 12;
  if (frequency === 'bihebdomadaire') return (amount * 26) / 12;
  if (frequency === 'hebdomadaire') return (amount * 52) / 12;
  return amount;
}

export function fullName(p: Pick<Person, 'firstName' | 'lastName'>) {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function money(value: number) {
  const n = Math.round(value);
  const body = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  return `${body}\u00a0$`;
}

export function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function todayISO() {
  const dt = new Date();
  return isoFromDate(dt);
}

export function isoFromDate(dt: Date) {
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number) {
  const dt = parseISO(iso);
  dt.setDate(dt.getDate() + n);
  return isoFromDate(dt);
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

/** Dernier dimanche du mois civil (year, monthIndex 0-11). */
export function lastSundayOfMonth(year: number, monthIndex: number) {
  const end = new Date(year, monthIndex + 1, 0);
  end.setDate(end.getDate() - end.getDay());
  return isoFromDate(end);
}

/** Prochaine échéance de tontine : dernier dimanche du mois en cours, ou du mois suivant s’il est passé. */
export function nextTontineDue(from = todayISO()) {
  const dt = parseISO(from);
  let due = lastSundayOfMonth(dt.getFullYear(), dt.getMonth());
  if (due < from) {
    const next = new Date(dt.getFullYear(), dt.getMonth() + 1, 1);
    due = lastSundayOfMonth(next.getFullYear(), next.getMonth());
  }
  return due;
}

export const TONTINE_FREQUENCY = 'chaque dernier dimanche du mois';

export const INVESTMENT_TYPE_LABEL: Record<InvestmentType, string> = {
  reer: 'REER',
  celi: 'CELI',
  actions: 'Actions',
  obligations: 'Obligations',
  fonds: 'Fonds / FNB',
  crypto: 'Crypto',
  compte: 'Compte de placement',
  autre: 'Autre',
};

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  immobilier: 'Immobilier',
  terrain: 'Terrain',
  vehicule: 'Véhicule',
  entreprise: 'Entreprise',
  objet: 'Objet de valeur',
  autre: 'Autre',
};

export const WEEKDAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export function formatTime(t: string) {
  const [h, m] = t.split(':');
  if (m === '00') return `${Number(h)}\u00a0h`;
  return `${Number(h)}\u00a0h\u00a0${m}`;
}

export function formatDayMonth(iso: string) {
  return new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long' }).format(parseISO(iso));
}

export function formatLong(iso: string) {
  return new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseISO(iso));
}

export function formatMonthYear(year: number, monthIndex: number) {
  const label = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' }).format(new Date(year, monthIndex, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function companionWord(p: Person) {
  if (p.gender === 'f') return 'Accompagnatrice';
  if (p.gender === 'm') return 'Accompagnateur';
  return 'Accompagnant';
}

export function statusLabel(status: PayStatus) {
  if (status === 'prevu') return 'Prévu';
  if (status === 'declare') return 'Déclaré';
  return 'Confirmé';
}

export function nextStatus(status: PayStatus): PayStatus | null {
  if (status === 'prevu') return 'declare';
  if (status === 'declare') return 'confirme';
  return null;
}

export function advanceLabel(status: PayStatus) {
  if (status === 'prevu') return 'Déclarer le versement';
  if (status === 'declare') return 'Confirmer le paiement';
  return 'Paiement confirmé';
}

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  logement: 'Logement',
  alimentation: 'Alimentation',
  enfants: 'Enfants',
  transport: 'Transport',
  scolarite: 'Scolarité',
  sante: 'Santé',
  loisirs: 'Loisirs',
  autre: 'Autre',
};

export const CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  logement: '#7c6ae8',
  alimentation: '#3cba78',
  enfants: '#4aa3e8',
  transport: '#f0a04b',
  scolarite: '#8b6cf6',
  sante: '#ef6b8b',
  loisirs: '#f08ab8',
  autre: '#9aa0b4',
};

export const GOAL_KIND_LABEL: Record<SavingsKind, string> = {
  personnel: 'Épargne personnelle',
  scolaire: 'Épargne scolaire',
  familial: 'Projet familial',
};

export function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}
