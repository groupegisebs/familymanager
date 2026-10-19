import { NavLink, useParams } from 'react-router-dom';
import { canSeeExpense, canSeeGoal, canSeePolicy, canSeePolicyDetails, goalByStatus, goalConfirmed, monthFlow } from '../access';
import { BUDGETS, DEMO_MONTH } from '../data';
import { CATEGORY_COLOR, CATEGORY_LABEL, GOAL_KIND_LABEL, advanceLabel, formatDayMonth, fullName, money, monthKey, nextStatus, pct } from '../format';
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
  const { state, name, dispatch } = useFamily();
  const flow = monthFlow(state, DEMO_MONTH);
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
        {state.incomes.map((income) => (
          <article key={income.id} className="item">
            <div className="between">
              <strong>{income.label}</strong>
              <span>{money(income.amount)} <StatusPill status={income.status} /></span>
            </div>
            <p>Perçu par {name(income.memberId)} · {formatDayMonth(income.date)}</p>
          </article>
        ))}
      </section>
      <section className="card">
        <header className="card-head"><h2>Budgets du mois</h2></header>
        <div className="cats">
          {BUDGETS.map((row) => {
            const value = state.expenses.filter((e) => e.category === row.category && e.status === 'confirme' && monthKey(e.date) === DEMO_MONTH).reduce((t, e) => t + e.amount, 0);
            return (
              <div key={row.category} className="cat">
                <div className="between"><span>{CATEGORY_LABEL[row.category]}</span><strong>{money(value)} <em>/ {money(row.limit)}</em></strong></div>
                <div className="bar slim"><span style={{ width: `${Math.min(100, pct(value, row.limit))}%`, background: CATEGORY_COLOR[row.category] }} /></div>
              </div>
            );
          })}
        </div>
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
            <Advance status={expense.status} onClick={() => dispatch({ type: 'advance', ref: { kind: 'expense', id: expense.id } })} />
          </article>
        ))}
      </section>
    </div>
  );
}

function SavingsPane() {
  const { state, name, dispatch } = useFamily();
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
                    <Advance status={move.status} onClick={() => dispatch({ type: 'advance', ref: { kind: 'move', goalId: goal.id, moveId: move.id } })} />
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
  const { state, name, dispatch } = useFamily();
  return (
    <div className="stack">
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
              <Advance status={payment.status} onClick={() => dispatch({ type: 'advance', ref: { kind: 'tontine', tontineId: tontine.id, paymentId: payment.id } })} />
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

function InsurancePane() {
  const { state, name, dispatch } = useFamily();
  return (
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
          <Advance status={policy.premiumStatus} onClick={() => dispatch({ type: 'advance', ref: { kind: 'policy', id: policy.id } })} />
        </article>
      ))}
    </div>
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
          <p>{canSeePolicyDetails(viewer) ? policy.policyNumber : viewer.gender === 'f' ? 'Vous êtes couverte par ce contrat.' : 'Vous êtes couvert par ce contrat.'}</p>
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
