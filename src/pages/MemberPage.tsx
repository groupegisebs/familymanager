import { Link, useParams } from 'react-router-dom';
import {
  canSeeContributors,
  canSeeDoc,
  canSeeEvent,
  canSeeExpense,
  canSeeGoal,
  canSeeNotes,
  canSeePolicy,
  canSeePolicyDetails,
  canSeeTask,
  goalByStatus,
  goalConfirmed,
} from '../access';
import { companionWord, formatDayMonth, formatLong, formatTime, fullName, money, pct } from '../format';
import { Avatar } from '../components/Avatar';
import { Badge, PersonChip, StatusPill, useFamily } from '../components/ui';

export function MemberPage() {
  const { id } = useParams();
  if (!id) return null;
  return <MemberOverview personId={id} />;
}

export function MemberOverview({ personId }: { personId: string }) {
  const { state, viewer, byId, name } = useFamily();
  const person = byId(personId);
  if (!person) return <p className="empty">Ce membre est introuvable.</p>;

  const events = state.events
    .filter((event) => canSeeEvent(viewer, event) && involves(person.id, event))
    .sort((a, b) => a.date.localeCompare(b.date));
  const expenses = state.expenses.filter((expense) => canSeeExpense(viewer, expense) && (expense.payerId === person.id || expense.beneficiaryIds.includes(person.id)));
  const goals = state.goals.filter((goal) => canSeeGoal(viewer, goal) && (goal.holderId === person.id || goal.beneficiaryIds.includes(person.id) || goal.moves.some((m) => m.memberId === person.id)));
  const policies = state.policies.filter((policy) => canSeePolicy(viewer, policy) && (policy.subscriberId === person.id || policy.insuredIds.includes(person.id) || policy.beneficiaryIds.includes(person.id)));
  const docs = state.documents.filter((doc) => canSeeDoc(viewer, doc) && (doc.memberIds.includes(person.id) || doc.sharedWithIds.includes(person.id)));
  const tasks = state.tasks.filter((task) => canSeeTask(viewer, task) && task.assigneeId === person.id);
  const activities = state.activities.filter((activity) => activity.memberId === person.id || activity.transportId === person.id);
  const restricted = viewer.role !== 'parent' && viewer.id !== person.id;

  return (
    <div className="stack">
      <section className="hero" style={{ borderColor: person.color }}>
        <Avatar id={person.id} size={88} />
        <div>
          <p className="kicker" style={{ color: person.color }}>{person.relation}</p>
          <h2>{fullName(person)}</h2>
          {person.age > 0 && <p>{person.age} ans</p>}
        </div>
        <Badge person={person} />
      </section>

      {restricted && events.length === 0 && docs.length === 0 && (
        <p className="locked">Ce profil n’est pas partagé avec {fullName(viewer)}.</p>
      )}

      <section className="card">
        <header className="card-head"><h2>Rendez-vous et activités</h2></header>
        {activities.filter((a) => a.memberId === person.id).map((activity) => (
          <article key={activity.id} className="item">
            <strong>{activity.name}</strong>
            <p>{formatTime(activity.time)}{activity.place ? ` · ${activity.place}` : ''}</p>
            <p><em>Personne concernée</em> <PersonChip id={activity.memberId} /></p>
            <p><em>Transport</em> <PersonChip id={activity.transportId} /></p>
            {viewer.role === 'parent' && <p><em>Payé par</em> <PersonChip id={activity.payerId} /> · {money(activity.sessionCost)} la séance</p>}
            {activity.gearNote && <p><em>Matériel</em> {activity.gearNote}</p>}
          </article>
        ))}
        {events.length === 0 && <p className="empty">Aucun rendez-vous visible.</p>}
        {events.map((event) => {
          const companion = event.companionId ? byId(event.companionId) : undefined;
          return (
            <article key={event.id} className="item">
              <div className="between">
                <strong>{event.title}</strong>
                <span className="muted">{formatTime(event.time)}</span>
              </div>
              <p>{formatLong(event.date)}{event.place ? ` · ${event.place}` : ''}</p>
              <p><em>Personne concernée</em> <PersonChip id={event.memberId} /></p>
              {companion && <p><em>{companionWord(companion)}</em> <PersonChip id={companion.id} /></p>}
              {event.transportId && <p><em>Transport</em> <PersonChip id={event.transportId} /></p>}
              {event.professional && <p><em>Professionnel</em> {event.professional}</p>}
              {canSeeNotes(viewer, event) && event.notes && <p className="note">{event.notes}</p>}
            </article>
          );
        })}
      </section>

      {tasks.length > 0 && (
        <section className="card">
          <header className="card-head"><h2>Tâches</h2></header>
          {tasks.map((task) => (
            <p key={task.id} className="item"><strong>{task.title}</strong> · {formatDayMonth(task.due)} · {task.done ? 'Faite' : 'À faire'} · <PersonChip id={task.assigneeId} /></p>
          ))}
        </section>
      )}

      {expenses.length > 0 && (
        <section className="card">
          <header className="card-head"><h2>Dépenses associées</h2></header>
          {expenses.map((expense) => (
            <article key={expense.id} className="item">
              <div className="between">
                <strong>{expense.label}</strong>
                <span>{money(expense.amount)} <StatusPill status={expense.status} /></span>
              </div>
              <p>{formatDayMonth(expense.date)}</p>
              <p><em>Payé par</em> <PersonChip id={expense.payerId} /></p>
              <p><em>Bénéficiaires</em> {expense.beneficiaryIds.map((id) => <PersonChip key={id} id={id} />)}</p>
            </article>
          ))}
        </section>
      )}

      {goals.length > 0 && (
        <section className="card">
          <header className="card-head"><h2>Épargne</h2></header>
          {goals.map((goal) => {
            const confirmed = goalConfirmed(goal);
            return (
              <article key={goal.id} className="item">
                <div className="between">
                  <strong>{goal.title}</strong>
                  <span>{money(confirmed)} / {money(goal.target)} · {pct(confirmed, goal.target)}%</span>
                </div>
                <div className="bar"><span style={{ width: `${pct(confirmed, goal.target)}%` }} /></div>
                {goal.holderId && <p><em>Titulaire</em> <PersonChip id={goal.holderId} /></p>}
                <p><em>Bénéficiaires</em> {goal.beneficiaryIds.map((id) => <PersonChip key={id} id={id} />)}</p>
                {canSeeContributors(viewer) && goal.moves.map((move) => (
                  <p key={move.id}><em>Contributeur</em> <PersonChip id={move.memberId} /> · {money(move.amount)} <StatusPill status={move.status} /></p>
                ))}
                {!canSeeContributors(viewer) && (
                  <p className="muted">Prévu {money(goalByStatus(goal, 'prevu'))} · Déclaré {money(goalByStatus(goal, 'declare'))} · Confirmé {money(confirmed)}</p>
                )}
              </article>
            );
          })}
        </section>
      )}

      {policies.length > 0 && (
        <section className="card">
          <header className="card-head"><h2>Assurances</h2></header>
          {policies.map((policy) => (
            <article key={policy.id} className="item">
              <strong>{policy.type} · {policy.insurer}</strong>
              {canSeePolicyDetails(viewer) && <p>Police {policy.policyNumber} · Prime {money(policy.premium)} / {policy.period} <StatusPill status={policy.premiumStatus} /></p>}
              <p><em>Souscripteur</em> <PersonChip id={policy.subscriberId} /></p>
              <p><em>Personnes assurées</em> {policy.insuredIds.map((id) => <PersonChip key={id} id={id} />)}</p>
              {policy.beneficiaryIds.length > 0 && <p><em>Bénéficiaires</em> {policy.beneficiaryIds.map((id) => <PersonChip key={id} id={id} />)}</p>}
            </article>
          ))}
        </section>
      )}

      {docs.length > 0 && (
        <section className="card">
          <header className="card-head"><h2>Documents</h2><Link to="/documents">Voir le classement</Link></header>
          {docs.map((doc) => (
            <p key={doc.id} className="item"><strong>{doc.title}</strong> · {formatDayMonth(doc.date)} · {doc.memberIds.map((id) => name(id)).filter(Boolean).join(', ') || fullName(person)}</p>
          ))}
        </section>
      )}

      {viewer.role === 'enfant' && viewer.id === person.id && (
        <p className="locked">Les revenus du foyer et les dossiers médicaux des autres membres restent auprès des parents.</p>
      )}
    </div>
  );
}

function involves(id: string, event: { memberId: string; companionId?: string; transportId?: string; audience: string }) {
  return event.memberId === id || event.companionId === id || event.transportId === id || event.audience === 'famille';
}
