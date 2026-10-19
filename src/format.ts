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
  maison: 'Maison',
  terrain: 'Terrain',
  champs: 'Champs',
  entreprise: 'Entreprise',
  vehicule: 'Véhicule',
  objet: 'Objet de valeur',
  autre: 'Autre',
};

export type DetailField = { key: string; label: string; required?: boolean; placeholder?: string; kind?: 'text' | 'number' | 'date' };

export const INVESTMENT_DETAIL_FIELDS: Record<InvestmentType, DetailField[]> = {
  reer: [
    { key: 'contributionRoom', label: 'Droits de cotisation restants', kind: 'number', required: true },
    { key: 'beneficiary', label: 'Bénéficiaire au décès', required: true },
    { key: 'contributionYear', label: 'Année de cotisation', kind: 'number', required: true },
    { key: 'lockedUntil', label: 'Date de retrait possible', kind: 'date' },
  ],
  celi: [
    { key: 'contributionRoom', label: 'Droits de cotisation restants', kind: 'number', required: true },
    { key: 'beneficiary', label: 'Bénéficiaire au décès', required: true },
    { key: 'contributionYear', label: 'Année de cotisation', kind: 'number', required: true },
  ],
  actions: [
    { key: 'ticker', label: 'Symbole / ticker', required: true, placeholder: 'ex. RY.TO' },
    { key: 'exchange', label: 'Bourse', required: true, placeholder: 'TSX, NYSE…' },
    { key: 'shares', label: 'Nombre d’actions', kind: 'number', required: true },
    { key: 'purchasePrice', label: 'Prix d’achat unitaire', kind: 'number', required: true },
  ],
  obligations: [
    { key: 'issuer', label: 'Émetteur', required: true },
    { key: 'faceValue', label: 'Valeur nominale', kind: 'number', required: true },
    { key: 'couponRate', label: 'Taux du coupon', required: true, placeholder: 'ex. 3,5 %' },
    { key: 'maturityDate', label: 'Date d’échéance', kind: 'date', required: true },
  ],
  fonds: [
    { key: 'fundCode', label: 'Code du fonds / FNB', required: true },
    { key: 'units', label: 'Nombre de parts', kind: 'number', required: true },
    { key: 'managementFee', label: 'Frais de gestion (RFG)', placeholder: 'ex. 0,25 %' },
    { key: 'category', label: 'Catégorie', placeholder: 'actions, obligations…' },
  ],
  crypto: [
    { key: 'symbol', label: 'Symbole', required: true, placeholder: 'BTC, ETH…' },
    { key: 'quantity', label: 'Quantité', kind: 'number', required: true },
    { key: 'network', label: 'Réseau', required: true, placeholder: 'Bitcoin, Ethereum…' },
    { key: 'wallet', label: 'Portefeuille / plateforme', required: true },
  ],
  compte: [
    { key: 'accountType', label: 'Type de compte', required: true, placeholder: 'épargne, courtage…' },
    { key: 'interestRate', label: 'Taux d’intérêt', required: true },
    { key: 'currency', label: 'Devise', required: true, placeholder: 'CAD, USD…' },
  ],
  autre: [
    { key: 'nature', label: 'Nature du placement', required: true },
    { key: 'terms', label: 'Conditions particulières' },
  ],
};

export const ASSET_DETAIL_FIELDS: Record<AssetType, DetailField[]> = {
  maison: [
    { key: 'address', label: 'Adresse complète', required: true },
    { key: 'cadastral', label: 'N° cadastral / lot', required: true },
    { key: 'areaSqm', label: 'Superficie (m²)', kind: 'number', required: true },
    { key: 'rooms', label: 'Pièces / chambres', required: true },
    { key: 'mortgageBalance', label: 'Solde hypothécaire', kind: 'number', required: true },
    { key: 'propertyTax', label: 'Taxes municipales annuelles', kind: 'number' },
  ],
  terrain: [
    { key: 'address', label: 'Emplacement', required: true },
    { key: 'cadastral', label: 'N° cadastral / lot', required: true },
    { key: 'areaSqm', label: 'Superficie (m²)', kind: 'number', required: true },
    { key: 'zoning', label: 'Zonage', required: true },
  ],
  champs: [
    { key: 'address', label: 'Emplacement', required: true },
    { key: 'cadastral', label: 'N° cadastral / lot', required: true },
    { key: 'areaHa', label: 'Superficie (ha)', kind: 'number', required: true },
    { key: 'culture', label: 'Culture / usage', required: true, placeholder: 'cacao, maïs, jachère…' },
    { key: 'titleDeed', label: 'Titre foncier / attestation' },
  ],
  entreprise: [
    { key: 'legalName', label: 'Raison sociale', required: true },
    { key: 'registrationNumber', label: 'N° d’entreprise', required: true },
    { key: 'activity', label: 'Activité', required: true },
    { key: 'ownershipPercent', label: 'Part détenue dans l’entreprise (%)', kind: 'number', required: true },
  ],
  vehicule: [
    { key: 'make', label: 'Marque', required: true },
    { key: 'model', label: 'Modèle', required: true },
    { key: 'year', label: 'Année', kind: 'number', required: true },
    { key: 'vin', label: 'NIV / VIN', required: true },
    { key: 'plate', label: 'Immatriculation', required: true },
    { key: 'mileage', label: 'Kilométrage', kind: 'number', required: true },
  ],
  objet: [
    { key: 'brand', label: 'Marque / artisan', required: true },
    { key: 'serial', label: 'N° de série / certificat', required: true },
    { key: 'appraisalDate', label: 'Date d’évaluation', kind: 'date', required: true },
    { key: 'insurer', label: 'Assureur du bien' },
  ],
  autre: [
    { key: 'nature', label: 'Nature du bien', required: true },
    { key: 'identifier', label: 'Identifiant / référence' },
  ],
};

export function detailLabel(key: string) {
  const all = [...Object.values(INVESTMENT_DETAIL_FIELDS), ...Object.values(ASSET_DETAIL_FIELDS)].flat();
  return all.find((field) => field.key === key)?.label ?? key;
}

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
