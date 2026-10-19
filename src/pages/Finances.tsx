import { useState, type FormEvent } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { canSeeExpense, canSeeGoal, canSeePolicy, canSeePolicyDetails, goalByStatus, goalConfirmed, monthFlow } from '../access';
import { BUDGET_CATEGORIES } from '../data';
import { CATEGORY_COLOR, CATEGORY_LABEL, GOAL_KIND_LABEL, advanceLabel, formatDayMonth, fullName, money, monthKey, nextStatus, pct, todayISO } from '../format';
import type { PayStatus } from '../types';
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
        <NavLink to="/finances/tontines">Tontines</NavLink>
        <NavLink to="/finances/assurances">Assurances</NavLink>
      </nav>
      {section === 'epargne' && <SavingsPane />}
      {section === 'tontines' && <TontinePane />}
      {section === 'assurances' && <InsurancePane />}
      {section !== 'epargne' && section !== 'tontines' && section !== 'assurances' && <BudgetPane />}
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
        {state.incomes.map((income) => (
          <article key={income.id} className="item">
            <div className="between">
              <strong>{income.label}</strong>
              <span>{money(income.amount)} <StatusPill status={income.status} /></span>
            </div>
            <p>Perçu par {name(income.memberId)} · {formatDayMonth(income.date)}</p>
          </article>
        ))}
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

function TontinePane() {
  const { state, name, advance } = useFamily();
  return (
    <div className="stack">
      {state.tontines.length === 0 && <p className="empty">Aucune tontine pour le moment.</p>}
      {state.tontines.map((tontine) => (
        <section key={tontine.id} className="card">
          <header className="card-head"><h2>{tontine.name}</h2></header>
          <p>Organisatrice : {name(tontine.organizerId)} · {money(tontine.amount)} / {tontine.frequency}</p>
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
  const [memberId, setMemberId] = useState(state.viewerId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    await addIncome({ id: uid('inc'), label, amount: Number(amount), memberId, date: todayISO(), status: 'confirme' });
    setAmount('');
    notify('Le revenu est enregistré.');
  }
  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="field">Libellé<input value={label} onChange={(e) => setLabel(e.target.value)} required /></label>
      <label className="field">Montant<input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
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
  async function submit(event: FormEvent) {
    event.preventDefault();
    await addTontine({
      id: uid('ton'),
      name,
      organizerId: viewer.id,
      amount: Number(amount),
      frequency: 'mois',
      participants: [{ name: fullName(viewer), memberId: viewer.id, order: 1, receptionDate: todayISO(), received: false }],
      payments: [{ id: uid('pay'), name: fullName(viewer), memberId: viewer.id, dueDate: todayISO(), amount: Number(amount), status: 'prevu', late: false }],
    });
    setName('');
    setAmount('');
    notify('La tontine est créée.');
  }
  return (
    <form className="card form-grid" onSubmit={submit}>
      <header className="card-head"><h2>Nouvelle tontine</h2></header>
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

function LimitedMoney() {
  const { state, viewer, name } = useFamily();
  const goals = state.goals.filter((goal) => canSeeGoal(viewer, goal));
  const expenses = state.expenses.filter((expense) => canSeeExpense(viewer, expense));
  const policies = state.policies.filter((policy) => canSeePolicy(viewer, policy));
  return (
    <div className="stack">
      <p className="locked">Le budget du foyer est réservé aux parents. Ici, seulement ce qui concerne {fullName(viewer)}.</p>
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
