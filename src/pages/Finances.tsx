import { useState, type FormEvent } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { canSeeExpense, canSeeGoal, canSeePolicy, canSeePolicyDetails, goalByStatus, goalConfirmed, monthFlow } from '../access';
import { BUDGET_CATEGORIES } from '../data';
import { ASSET_DETAIL_FIELDS, ASSET_TYPE_LABEL, CATEGORY_COLOR, CATEGORY_LABEL, GOAL_KIND_LABEL, INCOME_FREQUENCY_LABEL, INCOME_KIND_LABEL, INVESTMENT_DETAIL_FIELDS, INVESTMENT_TYPE_LABEL, TONTINE_FREQUENCY, advanceLabel, detailLabel, formatDayMonth, fullName, money, monthKey, nextStatus, nextTontineDue, pct, todayISO } from '../format';
import type { AssetType, IncomeFrequency, IncomeKind, InvestmentType, PayStatus } from '../types';
import { StatusPill, useFamily } from '../components/ui';

export function Finances() {
  const { section = 'budget' } = useParams();
  const { viewer } = useFamily();
  if (viewer.role !== 'parent') return <LimitedMoney />;
  return (
    <div className="stack">
      <nav className="tabs" aria-label="Finances">
        <NavLink to="/finances/budget">Budget</NavLink>
        <NavLink to="/finances/epargne">Épargne</NavLink>
        <NavLink to="/finances/patrimoine">Patrimoine</NavLink>
        <NavLink to="/finances/tontines">Tontines</NavLink>
        <NavLink to="/finances/assurances">Assurances</NavLink>
      </nav>
      {section === 'epargne' && <SavingsPane />}
      {section === 'patrimoine' && <WealthPane />}
      {section === 'tontines' && <TontinePane />}
      {section === 'assurances' && <InsurancePane />}
      {section !== 'epargne' && section !== 'patrimoine' && section !== 'tontines' && section !== 'assurances' && <BudgetPane />}
    </div>
  );
}

function BudgetPane() {
  const { state, name, advance } = useFamily();
  const month = monthKey(todayISO());
  const flow = monthFlow(state, month);
  return (
    <div className="stack">
      <section className="summary">
        <article><span>Revenus confirmés</span><strong>{money(flow.income)}</strong></article>
        <article><span>Dépenses confirmées</span><strong>{money(flow.expenseConfirmed)}</strong></article>
        <article><span>Encore engagé</span><strong>{money(flow.expenseOpen + flow.savings + flow.tontine + flow.premiums)}</strong></article>
        <article className="accent"><span>Disponible</span><strong>{money(flow.available)}</strong></article>
      </section>
      <p className="hint">Le disponible retire les dépenses confirmées et tout ce qui est déjà prévu ou seulement déclaré : épargne du mois, cotisations et primes. Confirmer un paiement ne libère pas d’argent, il le fait entrer dans le réalisé.</p>
      <section className="card">
        <header className="card-head"><h2>Revenus</h2></header>
        {state.incomes.length === 0 && <p className="empty">Aucun revenu enregistré.</p>}
        {state.incomes.map((income) => {
          const kind = income.kind ?? 'net';
          const frequency = income.frequency ?? 'mensuel';
          return (
            <article key={income.id} className="item">
              <div className="between">
                <strong>{income.label}</strong>
                <span>{money(income.amount)} <StatusPill status={income.status} /></span>
              </div>
              <p>{INCOME_KIND_LABEL[kind]} · {INCOME_FREQUENCY_LABEL[frequency]}</p>
              <p>Perçu par {name(income.memberId)} · {formatDayMonth(income.date)}</p>
            </article>
          );
        })}
        <IncomeForm />
      </section>
      <section className="card">
        <header className="card-head"><h2>Budgets du mois</h2></header>
        <div className="cats">
          {BUDGET_CATEGORIES.map((category) => {
            const limit = state.categoryLimits[category];
            const value = state.expenses.filter((e) => e.category === category && e.status === 'confirme' && monthKey(e.date) === month).reduce((t, e) => t + e.amount, 0);
            const row = { category, limit };
            return (
              <div key={row.category} className="cat">
                <div className="between"><span>{CATEGORY_LABEL[row.category]}</span><strong>{money(value)} <em>/ {money(row.limit)}</em></strong></div>
                <div className="bar slim"><span style={{ width: `${Math.min(100, pct(value, row.limit))}%`, background: CATEGORY_COLOR[row.category] }} /></div>
              </div>
            );
          })}
        </div>
        <BudgetForm />
      </section>
      <section className="card">
        <header className="card-head"><h2>Dépenses</h2></header>
        {state.expenses.map((expense) => (
          <article key={expense.id} className="item">
            <div className="between">
              <strong>{expense.label}</strong>
              <span>{money(expense.amount)}</span>
            </div>
            <p>{CATEGORY_LABEL[expense.category]} · {formatDayMonth(expense.date)}{expense.recurring ? ' · Récurrente' : ''}</p>
            <p>Payé par {name(expense.payerId)}</p>
            <p>Bénéficiaires : {expense.beneficiaryIds.map((id) => name(id)).join(', ')}</p>
            <Advance status={expense.status} onClick={() => void advance({ kind: 'expense', id: expense.id })} />
          </article>
        ))}
      </section>
    </div>
  );
}

function SavingsPane() {
  const { state, name, advance } = useFamily();
  const groups = ['personnel', 'scolaire', 'familial'] as const;
  return (
    <div className="stack">
      {groups.map((kind) => (
        <section key={kind} className="card">
          <header className="card-head"><h2>{GOAL_KIND_LABEL[kind]}</h2></header>
          {state.goals.filter((goal) => goal.kind === kind).map((goal) => {
            const confirmed = goalConfirmed(goal);
            return (
              <article key={goal.id} className="item">
                <div className="between">
                  <strong>{goal.title}{goal.holderId ? ` · ${name(goal.holderId)}` : ''}</strong>
                  <span>{money(confirmed)} / {money(goal.target)}</span>
                </div>
                <div className="bar-row">
                  <div className="bar"><span style={{ width: `${pct(confirmed, goal.target)}%` }} /></div>
                  <em>{pct(confirmed, goal.target)}%</em>
                </div>
                <p>Prévu {money(goalByStatus(goal, 'prevu'))} · Déclaré {money(goalByStatus(goal, 'declare'))} · Confirmé {money(confirmed)}</p>
                {goal.holderId && <p>Titulaire : {name(goal.holderId)}</p>}
                <p>Bénéficiaires : {goal.beneficiaryIds.map((id) => name(id)).join(', ')}</p>
                {goal.moves.map((move) => (
                  <div key={move.id} className="move">
                    <span>{name(move.memberId)} · contributeur · {money(move.amount)} · {formatDayMonth(move.date)}</span>
                    <Advance status={move.status} onClick={() => void advance({ kind: 'move', goalId: goal.id, moveId: move.id })} />
                  </div>
                ))}
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function tontineCadence(frequency: string) {
  return frequency === 'mois' || frequency === TONTINE_FREQUENCY || frequency.toLowerCase().includes('dimanche')
    ? TONTINE_FREQUENCY
    : frequency;
}

function TontinePane() {
  const { state, name, advance } = useFamily();
  const nextDue = nextTontineDue();
  return (
    <div className="stack">
      <p className="hint">Rappel : la cotisation de tontine tombe chaque dernier dimanche du mois. Prochaine échéance : {formatDayMonth(nextDue)}.</p>
      {state.tontines.length === 0 && <p className="empty">Aucune tontine pour le moment.</p>}
      {state.tontines.map((tontine) => (
        <section key={tontine.id} className="card">
          <header className="card-head"><h2>{tontine.name}</h2></header>
          <p>Organisatrice : {name(tontine.organizerId)} · {money(tontine.amount)} · {tontineCadence(tontine.frequency)}</p>
          <h3>Ordre des bénéficiaires</h3>
          <ol className="turns">
            {tontine.participants.map((person) => (
              <li key={person.order} className={person.received ? 'done' : ''}>
                <strong>{person.name}</strong>
                <span>{formatDayMonth(person.receptionDate)} · {person.received ? 'Tour reçu' : 'Tour à venir'}</span>
              </li>
            ))}
          </ol>
          <h3>Cotisations</h3>
          {tontine.payments.map((payment) => (
            <article key={payment.id} className="item">
              <div className="between">
                <strong>{payment.name}</strong>
                <span>{money(payment.amount)} {payment.late && <em className="late">Retard</em>}</span>
              </div>
              <p>{payment.memberId ? 'Membre du foyer' : 'Participant extérieur'} · échéance {formatDayMonth(payment.dueDate)}</p>
              <Advance status={payment.status} onClick={() => void advance({ kind: 'tontine', tontineId: tontine.id, paymentId: payment.id })} />
            </article>
          ))}
        </section>
      ))}
      <TontineForm />
    </div>
  );
}

function InsurancePane() {
  const { state, name, advance } = useFamily();
  return (
    <div className="stack">
    <div className="policy-grid">
      {state.policies.map((policy) => (
        <article key={policy.id} className="card item">
          <h2>{policy.type}</h2>
          <p>{policy.insurer}</p>
          <p>Police {policy.policyNumber}</p>
          <p>Souscripteur : {name(policy.subscriberId)}</p>
          <p>Personnes assurées : {policy.insuredIds.map((id) => name(id)).join(', ')}</p>
          {policy.beneficiaryIds.length > 0 && <p>Bénéficiaires : {policy.beneficiaryIds.map((id) => name(id)).join(', ')}</p>}
          <p>Prime {money(policy.premium)} / {policy.period} · échéance {formatDayMonth(policy.premiumDueDate)}</p>
          <p>Renouvellement le {formatDayMonth(policy.renewalDate)}</p>
          <Advance status={policy.premiumStatus} onClick={() => void advance({ kind: 'policy', id: policy.id })} />
        </article>
      ))}
    </div>
    <PolicyForm />
    </div>
  );
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function IncomeForm() {
  const { addIncome, state, notify } = useFamily();
  const [label, setLabel] = useState('Salaire');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<IncomeKind>('net');
  const [frequency, setFrequency] = useState<IncomeFrequency>('mensuel');
  const [memberId, setMemberId] = useState(state.viewerId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    await addIncome({
      id: uid('inc'),
      label,
      amount: Number(amount),
      memberId,
      date: todayISO(),
      status: 'confirme',
      kind,
      frequency,
    });
    setAmount('');
    notify('Le revenu est enregistré.');
  }
  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="field">Libellé<input value={label} onChange={(e) => setLabel(e.target.value)} required /></label>
      <label className="field">Montant<input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
      <label className="field">Type
        <select value={kind} onChange={(e) => setKind(e.target.value as IncomeKind)}>
          <option value="brut">Brut</option>
          <option value="net">Net</option>
        </select>
      </label>
      <label className="field">Fréquence
        <select value={frequency} onChange={(e) => setFrequency(e.target.value as IncomeFrequency)}>
          <option value="annuel">Annuel</option>
          <option value="mensuel">Mensuel</option>
          <option value="bihebdomadaire">Bi-hebdomadaire</option>
          <option value="hebdomadaire">Hebdomadaire</option>
        </select>
      </label>
      <label className="field">Personne
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {state.people.filter((p) => p.role === 'parent').map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
        </select>
      </label>
      <button className="btn btn-primary" type="submit">Ajouter le revenu</button>
    </form>
  );
}

function BudgetForm() {
  const { state, saveBudgets, notify } = useFamily();
  const [limits, setLimits] = useState(state.categoryLimits);
  async function submit(event: FormEvent) {
    event.preventDefault();
    await saveBudgets(limits);
    notify('Les plafonds du mois sont enregistrés.');
  }
  return (
    <form className="form-grid" onSubmit={submit}>
      {BUDGET_CATEGORIES.map((category) => (
        <label key={category} className="field">{CATEGORY_LABEL[category]}
          <input type="number" min={0} value={limits[category]} onChange={(e) => setLimits({ ...limits, [category]: Number(e.target.value) })} />
        </label>
      ))}
      <button className="btn btn-ghost" type="submit">Enregistrer les plafonds</button>
    </form>
  );
}

function TontineForm() {
  const { addTontine, viewer, notify } = useFamily();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const due = nextTontineDue();
  async function submit(event: FormEvent) {
    event.preventDefault();
    await addTontine({
      id: uid('ton'),
      name,
      organizerId: viewer.id,
      amount: Number(amount),
      frequency: TONTINE_FREQUENCY,
      participants: [{ name: fullName(viewer), memberId: viewer.id, order: 1, receptionDate: due, received: false }],
      payments: [{ id: uid('pay'), name: fullName(viewer), memberId: viewer.id, dueDate: due, amount: Number(amount), status: 'prevu', late: false }],
    });
    setName('');
    setAmount('');
    notify('La tontine est créée.');
  }
  return (
    <form className="card form-grid" onSubmit={submit}>
      <header className="card-head"><h2>Nouvelle tontine</h2></header>
      <p className="hint field-wide">Cotisation {TONTINE_FREQUENCY}. Première échéance : {formatDayMonth(due)}.</p>
      <label className="field">Nom<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
      <label className="field">Cotisation<input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
      <button className="btn btn-primary" type="submit">Créer</button>
    </form>
  );
}

function PolicyForm() {
  const { addPolicy, viewer, state, notify } = useFamily();
  const [type, setType] = useState('Habitation');
  const [insurer, setInsurer] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [premium, setPremium] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    await addPolicy({
      id: uid('pol'),
      type,
      insurer,
      policyNumber,
      subscriberId: viewer.id,
      insuredIds: state.people.filter((p) => p.household).map((p) => p.id),
      beneficiaryIds: [],
      premium: Number(premium),
      period: 'mois',
      renewalDate: todayISO(),
      premiumDueDate: todayISO(),
      premiumStatus: 'prevu',
    });
    notify('Le contrat est enregistré.');
  }
  return (
    <form className="card form-grid" onSubmit={submit}>
      <header className="card-head"><h2>Nouveau contrat</h2></header>
      <label className="field">Type<input value={type} onChange={(e) => setType(e.target.value)} required /></label>
      <label className="field">Assureur<input value={insurer} onChange={(e) => setInsurer(e.target.value)} required /></label>
      <label className="field">Numéro<input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} required /></label>
      <label className="field">Prime<input type="number" min={0} value={premium} onChange={(e) => setPremium(e.target.value)} required /></label>
      <button className="btn btn-primary" type="submit">Enregistrer</button>
    </form>
  );
}

function WealthPane() {
  const { state, name } = useFamily();
  const invested = state.investments.reduce((total, item) => total + item.currentValue, 0);
  const capital = state.investments.reduce((total, item) => total + item.investedAmount, 0);
  const assets = state.assets.reduce((total, item) => total + item.estimatedValue * ((item.sharePercent || 100) / 100), 0);
  const parents = state.people.filter((person) => person.role === 'parent');
  return (
    <div className="stack">
      <p className="hint">Investissements et patrimoine des parents uniquement. Ces informations restent visibles aux parents du foyer.</p>
      <section className="summary">
        <article><span>Valeur des placements</span><strong>{money(invested)}</strong></article>
        <article><span>Capital investi</span><strong>{money(capital)}</strong></article>
        <article><span>Biens patrimoniaux</span><strong>{money(assets)}</strong></article>
        <article className="accent"><span>Patrimoine total</span><strong>{money(invested + assets)}</strong></article>
      </section>

      <section className="card">
        <header className="card-head"><h2>Patrimoine des parents</h2></header>
        <p className="hint">Maison, terrain, champs, entreprise et autres biens physiques.</p>
        {state.assets.length === 0 && <p className="empty">Aucun bien patrimonial enregistré.</p>}
        {state.assets.map((item) => (
          <article key={item.id} className="item">
            <div className="between">
              <strong>{item.label}</strong>
              <span>{money(item.estimatedValue)}</span>
            </div>
            <p>{ASSET_TYPE_LABEL[item.type] ?? item.type}{item.description ? ` · ${item.description}` : ''}</p>
            <p>Propriétaire : {name(item.ownerId)}{item.coOwnerId ? ` · Copropriétaire : ${name(item.coOwnerId)}` : ''}</p>
            <p>Part détenue : {item.sharePercent || 100} % · acquis le {formatDayMonth(item.acquiredDate)}</p>
            <p>Valeur d’achat {money(item.purchaseValue)} · valeur estimée {money(item.estimatedValue)}</p>
            {item.location && <p>Lieu : {item.location}</p>}
            <DetailList details={item.details} />
            {item.notes && <p>{item.notes}</p>}
          </article>
        ))}
        <AssetForm parents={parents} />
      </section>

      <section className="card">
        <header className="card-head"><h2>Investissements des parents</h2></header>
        <p className="hint">Placements financiers uniquement (REER, CELI, actions…). Pour une maison, un terrain, des champs ou une entreprise, utilisez le patrimoine ci-dessus.</p>
        {state.investments.length === 0 && <p className="empty">Aucun investissement enregistré.</p>}
        {state.investments.map((item) => (
          <article key={item.id} className="item">
            <div className="between">
              <strong>{item.label}</strong>
              <span>{money(item.currentValue)}</span>
            </div>
            <p>{INVESTMENT_TYPE_LABEL[item.type]} · {item.institution || 'Institution non indiquée'}</p>
            <p>Propriétaire : {name(item.ownerId)}</p>
            {item.accountRef && <p>Référence : {item.accountRef}</p>}
            <p>Investi {money(item.investedAmount)} · acquis le {formatDayMonth(item.acquiredDate)}</p>
            {item.expectedYield && <p>Rendement prévu : {item.expectedYield}</p>}
            <DetailList details={item.details} />
            {item.notes && <p>{item.notes}</p>}
          </article>
        ))}
        <InvestmentForm parents={parents} />
      </section>
    </div>
  );
}

function DetailList({ details }: { details?: Record<string, string> }) {
  const entries = Object.entries(details ?? {}).filter(([, value]) => value.trim());
  if (entries.length === 0) return null;
  return (
    <ul className="detail-list">
      {entries.map(([key, value]) => (
        <li key={key}><em>{detailLabel(key)}</em> {value}</li>
      ))}
    </ul>
  );
}

function DetailFields({
  fields,
  values,
  onChange,
}: {
  fields: { key: string; label: string; required?: boolean; placeholder?: string; kind?: 'text' | 'number' | 'date' }[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <>
      <p className="hint field-wide">Détails exigés pour ce type</p>
      {fields.map((field) => (
        <label key={field.key} className="field">
          {field.label}{field.required ? ' *' : ''}
          <input
            type={field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text'}
            value={values[field.key] ?? ''}
            placeholder={field.placeholder}
            required={field.required}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        </label>
      ))}
    </>
  );
}

function InvestmentForm({ parents }: { parents: { id: string; firstName: string; lastName: string }[] }) {
  const { addInvestment, viewer, notify } = useFamily();
  const [form, setForm] = useState({
    label: '',
    type: 'reer' as InvestmentType,
    institution: '',
    accountRef: '',
    ownerId: viewer.id,
    investedAmount: '',
    currentValue: '',
    acquiredDate: todayISO(),
    expectedYield: '',
    notes: '',
    details: {} as Record<string, string>,
  });
  const typeFields = INVESTMENT_DETAIL_FIELDS[form.type];
  async function submit(event: FormEvent) {
    event.preventDefault();
    const details = Object.fromEntries(typeFields.map((field) => [field.key, (form.details[field.key] ?? '').trim()]));
    await addInvestment({
      id: uid('inv'),
      label: form.label,
      type: form.type,
      institution: form.institution,
      accountRef: form.accountRef,
      ownerId: form.ownerId,
      investedAmount: Number(form.investedAmount),
      currentValue: Number(form.currentValue),
      acquiredDate: form.acquiredDate,
      expectedYield: form.expectedYield,
      notes: form.notes,
      details,
    });
    setForm({ ...form, label: '', institution: '', accountRef: '', investedAmount: '', currentValue: '', expectedYield: '', notes: '', details: {} });
    notify('L’investissement est enregistré.');
  }
  return (
    <form className="form-grid" onSubmit={submit}>
      <header className="card-head field-wide"><h2>Nouvel investissement</h2></header>
      <label className="field">Libellé<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required /></label>
      <label className="field">Type
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as InvestmentType, details: {} })}>
          {Object.entries(INVESTMENT_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="field">Institution<input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="Banque, courtier…" required /></label>
      <label className="field">N° / référence<input value={form.accountRef} onChange={(e) => setForm({ ...form, accountRef: e.target.value })} required /></label>
      <label className="field">Parent propriétaire
        <select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
          {parents.map((person) => <option key={person.id} value={person.id}>{fullName(person)}</option>)}
        </select>
      </label>
      <label className="field">Date d’acquisition<input type="date" value={form.acquiredDate} onChange={(e) => setForm({ ...form, acquiredDate: e.target.value })} required /></label>
      <label className="field">Montant investi<input type="number" min={0} value={form.investedAmount} onChange={(e) => setForm({ ...form, investedAmount: e.target.value })} required /></label>
      <label className="field">Valeur actuelle<input type="number" min={0} value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} required /></label>
      <label className="field">Rendement prévu<input value={form.expectedYield} onChange={(e) => setForm({ ...form, expectedYield: e.target.value })} placeholder="ex. 5 % / an" required /></label>
      <DetailFields fields={typeFields} values={form.details} onChange={(key, value) => setForm({ ...form, details: { ...form.details, [key]: value } })} />
      <label className="field field-wide">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></label>
      <button className="btn btn-primary" type="submit">Enregistrer l’investissement</button>
    </form>
  );
}

function AssetForm({ parents }: { parents: { id: string; firstName: string; lastName: string }[] }) {
  const { addAsset, viewer, notify } = useFamily();
  const [form, setForm] = useState({
    label: '',
    type: 'maison' as AssetType,
    description: '',
    ownerId: viewer.id,
    coOwnerId: '',
    estimatedValue: '',
    purchaseValue: '',
    acquiredDate: todayISO(),
    location: '',
    sharePercent: '100',
    notes: '',
    details: {} as Record<string, string>,
  });
  const typeFields = ASSET_DETAIL_FIELDS[form.type];
  async function submit(event: FormEvent) {
    event.preventDefault();
    const details = Object.fromEntries(typeFields.map((field) => [field.key, (form.details[field.key] ?? '').trim()]));
    await addAsset({
      id: uid('ast'),
      label: form.label,
      type: form.type,
      description: form.description,
      ownerId: form.ownerId,
      coOwnerId: form.coOwnerId,
      estimatedValue: Number(form.estimatedValue),
      purchaseValue: Number(form.purchaseValue),
      acquiredDate: form.acquiredDate,
      location: form.type === 'maison' || form.type === 'terrain' || form.type === 'champs' ? (details.address || form.location) : form.location,
      sharePercent: Number(form.sharePercent),
      notes: form.notes,
      details,
    });
    setForm({ ...form, label: '', description: '', coOwnerId: '', estimatedValue: '', purchaseValue: '', location: '', sharePercent: '100', notes: '', details: {} });
    notify('Le bien patrimonial est enregistré.');
  }
  return (
    <form className="form-grid" onSubmit={submit}>
      <header className="card-head field-wide"><h2>Nouveau bien patrimonial</h2></header>
      <label className="field">Libellé<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required /></label>
      <label className="field">Type
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AssetType, details: {} })}>
          {Object.entries(ASSET_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="field field-wide">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Maison familiale, champ de cacao…" required /></label>
      <label className="field">Parent propriétaire
        <select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
          {parents.map((person) => <option key={person.id} value={person.id}>{fullName(person)}</option>)}
        </select>
      </label>
      <label className="field">Copropriétaire
        <select value={form.coOwnerId} onChange={(e) => setForm({ ...form, coOwnerId: e.target.value })}>
          <option value="">Aucun</option>
          {parents.filter((person) => person.id !== form.ownerId).map((person) => <option key={person.id} value={person.id}>{fullName(person)}</option>)}
        </select>
      </label>
      <label className="field">Part détenue (%)<input type="number" min={0} max={100} value={form.sharePercent} onChange={(e) => setForm({ ...form, sharePercent: e.target.value })} required /></label>
      <label className="field">Date d’acquisition<input type="date" value={form.acquiredDate} onChange={(e) => setForm({ ...form, acquiredDate: e.target.value })} required /></label>
      <label className="field">Valeur d’achat<input type="number" min={0} value={form.purchaseValue} onChange={(e) => setForm({ ...form, purchaseValue: e.target.value })} required /></label>
      <label className="field">Valeur estimée<input type="number" min={0} value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} required /></label>
      <DetailFields fields={typeFields} values={form.details} onChange={(key, value) => setForm({ ...form, details: { ...form.details, [key]: value } })} />
      <label className="field field-wide">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></label>
      <button className="btn btn-primary" type="submit">Enregistrer le bien</button>
    </form>
  );
}

function LimitedMoney() {
  const { state, viewer, name } = useFamily();
  const goals = state.goals.filter((goal) => canSeeGoal(viewer, goal));
  const expenses = state.expenses.filter((expense) => canSeeExpense(viewer, expense));
  const policies = state.policies.filter((policy) => canSeePolicy(viewer, policy));
  return (
    <div className="stack">
      <p className="locked">Le budget, les investissements et le patrimoine des parents sont réservés aux parents. Ici, seulement ce qui concerne {fullName(viewer)}.</p>
      {goals.map((goal) => (
        <article key={goal.id} className="card item">
          <strong>{goal.title}</strong>
          <p>{money(goalConfirmed(goal))} confirmés / {money(goal.target)}</p>
          <p>Prévu {money(goalByStatus(goal, 'prevu'))} · Déclaré {money(goalByStatus(goal, 'declare'))}</p>
        </article>
      ))}
      {expenses.map((expense) => (
        <article key={expense.id} className="card item">
          <strong>{expense.label}</strong>
          <p>{money(expense.amount)} · {formatDayMonth(expense.date)}</p>
          <p>Payé par {name(expense.payerId)}</p>
        </article>
      ))}
      {policies.map((policy) => (
        <article key={policy.id} className="card item">
          <strong>{policy.type}</strong>
          <p>{canSeePolicyDetails(viewer) ? policy.policyNumber : 'Vous êtes couvert par ce contrat.'}</p>
          <p>Souscripteur : {name(policy.subscriberId)}</p>
        </article>
      ))}
      {goals.length + expenses.length + policies.length === 0 && <p className="empty">Aucun montant n’est affiché pour ce profil.</p>}
    </div>
  );
}

function Advance({ status, onClick }: { status: PayStatus; onClick: () => void }) {
  if (!nextStatus(status)) return <StatusPill status={status} />;
  return (
    <div className="advance">
      <StatusPill status={status} />
      <button type="button" className="btn btn-ghost" onClick={onClick}>{advanceLabel(status)}</button>
    </div>
  );
}
