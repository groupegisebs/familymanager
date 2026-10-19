import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  canSeeEvent,
  canSeeGoal,
  canSeeTask,
  confirmedSpend,
  goalConfirmed,
  household,
  upcomingDues,
} from '../access';
import {
  addDays,
  companionWord,
  formatDayMonth,
  formatTime,
  fullName,
  money,
  monthKey,
  pct,
  todayISO,
  WEEKDAYS_SHORT,
} from '../format';
import type { CalEvent, Goal, Person } from '../types';
import { Icon, type IconName } from '../components/Icons';
import { Avatar } from '../components/Avatar';
import { useFamily } from '../components/ui';

export function Dashboard() {
  const { viewer } = useFamily();
  if (viewer.role === 'proche') return <ProcheHome />;
  if (viewer.role === 'enfant') return <ChildHome />;
  return <ParentHome />;
}

function ParentHome() {
  const { state, byId, name } = useFamily();
  const [filter, setFilter] = useState<string | 'all'>('all');
  const members = household(state);
  const today = todayISO();
  const month = monthKey(today);
  const weekEnd = addDays(today, 7);
  const spent = confirmedSpend(state, month);
  const budget = state.monthlyBudget || 0;
  const remaining = Math.max(0, budget - spent);
  const goals = state.goals.filter((goal) => filter === 'all' || goal.holderId === filter || goal.beneficiaryIds.includes(filter));
  const saved = goals.reduce((total, goal) => total + goalConfirmed(goal), 0);
  const weekEvents = state.events
    .filter((event) => event.date >= today && event.date <= weekEnd)
    .filter((event) => filter === 'all' || event.memberId === filter || event.companionId === filter)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const dues = upcomingDues(state, today)
    .filter((due) => due.date <= weekEnd)
    .filter((due) => filter === 'all' || due.who === filter)
    .slice(0, 6);
  const dueTotal = dues.reduce((total, due) => total + due.amount, 0);
  const tasks = state.tasks
    .filter((task) => !task.done && task.due >= today && task.due <= weekEnd)
    .filter((task) => filter === 'all' || task.assigneeId === filter)
    .sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
  const reminders = [
    ...dues.map((due) => ({
      id: dueKey(due.ref),
      title: due.title,
      detail: `${money(due.amount)} · ${formatDayMonth(due.date)}`,
      when: relativeDays(today, due.date),
      tone: 'money' as const,
      to: due.ref.kind === 'policy' ? '/finances/assurances' : due.ref.kind === 'tontine' ? '/finances/tontines' : '/finances/budget',
    })),
    ...state.documents
      .filter((doc) => doc.category === 'autorisation')
      .slice(0, 2)
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        detail: doc.memberIds.map((id) => name(id)).join(', ') || 'Document',
        when: 'À signer',
        tone: 'doc' as const,
        to: '/documents',
      })),
  ].slice(0, 5);
  const familyEvents = state.events
    .filter((event) => event.kind === 'famille' && event.date >= today && event.date <= addDays(today, 30))
    .filter((event) => filter === 'all' || event.memberId === filter)
    .slice(0, 3);

  return (
    <div className="dash stack">
      <section className="filter-row" aria-label="Filtrer par membre">
        <button type="button" className={filter === 'all' ? 'filter-chip on' : 'filter-chip'} onClick={() => setFilter('all')}>
          <span className="filter-all"><Icon name="users" size={16} /></span>
          Toute la famille
        </button>
        {members.map((person) => (
          <button key={person.id} type="button" className={filter === person.id ? 'filter-chip on' : 'filter-chip'} onClick={() => setFilter(person.id)}>
            <Avatar id={person.id} look={person.avatar} size={28} />
            {person.firstName}
          </button>
        ))}
      </section>

      {(state.requests.length > 0 || state.notes.length > 0) && (
        <section className="split">
          <article className="card">
            <header className="card-head"><h2>Demandes des enfants</h2></header>
            {state.requests.length === 0 && <p className="empty">Aucune demande.</p>}
            {state.requests.map((request) => (
              <article key={request.id} className="item">
                <strong>{request.title}</strong>
                <p>{name(request.authorId)} · {formatDayMonth(request.date)}</p>
                {request.detail && <p>{request.detail}</p>}
              </article>
            ))}
          </article>
          <article className="card">
            <header className="card-head"><h2>Notes des enfants</h2></header>
            {state.notes.length === 0 && <p className="empty">Aucune note.</p>}
            {state.notes.map((note) => (
              <article key={note.id} className="item">
                <strong>{note.title}</strong>
                <p>{name(note.authorId)} · {formatDayMonth(note.date)}</p>
                {note.body && <p>{note.body}</p>}
              </article>
            ))}
          </article>
        </section>
      )}

      <section className="stats">
        <Link to="/finances/budget" className="stat">
          <div className="stat-top">
            <span className="stat-ico violet"><Icon name="case" size={18} /></span>
            <span>Budget restant</span>
          </div>
          <p className="stat-main"><strong>{money(remaining)}</strong></p>
          <div className="bar-row">
            <div className="bar"><span style={{ width: `${pct(spent, budget || 1)}%` }} /></div>
          </div>
          <p className="stat-foot">{money(spent)} dépensés sur {money(budget)}</p>
        </Link>
        <Link to="/finances/epargne" className="stat">
          <div className="stat-top">
            <span className="stat-ico green"><Icon name="piggy" size={18} /></span>
            <span>Épargne totale</span>
          </div>
          <p className="big-green">{money(saved)}</p>
          <p className="stat-foot">{goals.length} objectif{goals.length > 1 ? 's' : ''} en cours</p>
        </Link>
        <Link to="/calendrier" className="stat">
          <div className="stat-top">
            <span className="stat-ico blue"><Icon name="calendar" size={18} /></span>
            <span>Cette semaine</span>
          </div>
          <p className="stat-main"><strong className="num-blue">{weekEvents.length}</strong></p>
          <p className="stat-foot">rendez-vous</p>
        </Link>
        <Link to="/finances/budget" className="stat">
          <div className="stat-top">
            <span className="stat-ico rose"><Icon name="bell" size={18} /></span>
            <span>À régler sous 7 jours</span>
          </div>
          <p className="stat-main"><strong className="num-rose">{money(dueTotal)}</strong></p>
          <p className="stat-foot">{dues.length} échéance{dues.length > 1 ? 's' : ''}{dues.length > 0 ? ' · ' : ''}{dues.length > 0 && <em className="warn-inline">!</em>}</p>
        </Link>
      </section>

      <section className="dash-grid">
        <article className="card">
          <header className="card-head">
            <h2><span className="title-ico"><Icon name="calendar" size={16} /></span> Agenda familial</h2>
            <Link to="/calendrier">Voir tout</Link>
          </header>
          {weekEvents.length === 0 && <p className="empty">Aucun rendez-vous cette semaine.</p>}
          <div className="agenda">
            {weekEvents.map((event) => (
              <EventRow key={event.id} event={event} companion={event.companionId ? byId(event.companionId) : undefined} who={name(event.memberId)} />
            ))}
          </div>
        </article>

        <article className="card">
          <header className="card-head">
            <h2><span className="title-ico"><Icon name="bell" size={16} /></span> À ne pas oublier</h2>
            <Link to="/finances/budget">Voir le détail</Link>
          </header>
          {reminders.length === 0 && <p className="empty">Rien d’urgent pour le moment.</p>}
          <div className="reminders">
            {reminders.map((item) => (
              <Link key={item.id} to={item.to} className={`reminder ${item.tone}`}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <em>{item.when}</em>
              </Link>
            ))}
          </div>
        </article>

        <article className="card">
          <header className="card-head">
            <h2><span className="title-ico"><Icon name="target" size={16} /></span> Objectifs d’épargne</h2>
            <Link to="/finances/epargne">Voir tous</Link>
          </header>
          {goals.length === 0 && <p className="empty">Aucun objectif d’épargne.</p>}
          <div className="goals">
            {goals.slice(0, 4).map((goal) => (
              <GoalRow key={goal.id} goal={goal} holder={goal.holderId ? name(goal.holderId) : ''} />
            ))}
          </div>
        </article>

        <article className="card">
          <header className="card-head">
            <h2><span className="title-ico"><Icon name="check" size={16} /></span> Événements et tâches</h2>
          </header>
          {familyEvents.length === 0 && tasks.length === 0 && <p className="empty">Rien à suivre cette semaine.</p>}
          <div className="event-task-list">
            {familyEvents.map((event) => (
              <div key={event.id} className="event-task">
                <span className="ev-ico amber"><Icon name="cake" size={16} /></span>
                <span>
                  <strong>{event.title}</strong>
                  <small>{formatDayMonth(event.date)} · {name(event.memberId)}</small>
                </span>
                <span className="pill pill-prevu">À venir</span>
              </div>
            ))}
            {tasks.map((task) => (
              <div key={task.id} className="event-task task-line">
                <TaskRow id={task.id} title={task.title} done={task.done} who={`${name(task.assigneeId)} · ${formatDayMonth(task.due)}`} />
                {!task.done && <span className="pill pill-declare">En cours</span>}
              </div>
            ))}
          </div>
        </article>
      </section>

    </div>
  );
}

function relativeDays(from: string, to: string) {
  const start = parseISO(from).getTime();
  const end = parseISO(to).getTime();
  const days = Math.round((end - start) / 86_400_000);
  if (days <= 0) return 'Aujourd’hui';
  if (days === 1) return 'Demain';
  return `Dans ${days} jours`;
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dueKey(ref: { kind: string; id?: string; moveId?: string; paymentId?: string; goalId?: string; tontineId?: string }) {
  return [ref.kind, ref.id, ref.goalId, ref.moveId, ref.tontineId, ref.paymentId].join('-');
}

const EVENT_ICON: Record<CalEvent['kind'], { icon: IconName; tone: string; dot: string }> = {
  activite: { icon: 'swim', tone: 'violet', dot: '#7c6cf0' },
  medical: { icon: 'medical', tone: 'pink', dot: '#ec4899' },
  scolaire: { icon: 'school', tone: 'green', dot: '#22a06b' },
  famille: { icon: 'cake', tone: 'amber', dot: '#f59e0b' },
};

function EventRow({ event, who, companion }: { event: CalEvent; who: string; companion?: Person }) {
  const meta = EVENT_ICON[event.kind];
  const date = new Date(event.date + 'T12:00:00');
  return (
    <Link to={`/calendrier?date=${event.date}`} className="ev">
      <span className="ev-day">
        <small>{WEEKDAYS_SHORT[date.getDay()]} <i style={{ background: meta.dot }} /></small>
        <strong>{date.getDate()}</strong>
      </span>
      <span className="ev-time">{formatTime(event.time)}</span>
      <span className={`ev-ico ${meta.tone}`}><Icon name={meta.icon} size={16} /></span>
      <span className="ev-body">
        <strong>{event.title}</strong>
        <small>{who}</small>
        {companion && <small>{companionWord(companion)} : {fullName(companion)}</small>}
      </span>
      <Icon name="chevron" size={16} />
    </Link>
  );
}

function TaskRow({ id, title, done, who }: { id: string; title: string; done: boolean; who: string }) {
  const { toggleTask } = useFamily();
  return (
    <label className={done ? 'task done' : 'task'}>
      <input type="checkbox" checked={done} onChange={() => void toggleTask(id)} />
      <span>
        <strong>{title}</strong>
        <small>{who}</small>
      </span>
    </label>
  );
}

const GOAL_LOOK: Record<Goal['kind'], { icon: IconName; tone: string; bar: string }> = {
  scolaire: { icon: 'cap', tone: 'violet', bar: '#7c6ae8' },
  personnel: { icon: 'palm', tone: 'pink', bar: '#f08ab8' },
  familial: { icon: 'shield', tone: 'green', bar: '#2fbe86' },
};

function GoalRow({ goal, holder }: { goal: Goal; holder: string }) {
  const look = GOAL_LOOK[goal.kind];
  const confirmed = goalConfirmed(goal);
  const label = holder && goal.kind !== 'familial' ? `${goal.title} · ${holder}` : goal.title;
  return (
    <div className="goal">
      <div className="goal-top">
        <span className={`ev-ico ${look.tone}`}><Icon name={look.icon} size={16} /></span>
        <strong>{label}</strong>
        <span className="goal-amt">{money(confirmed)} <em>/ {money(goal.target)}</em></span>
      </div>
      <div className="bar-row">
        <div className="bar"><span style={{ width: `${pct(confirmed, goal.target)}%`, background: look.bar }} /></div>
        <em>{pct(confirmed, goal.target)}%</em>
      </div>
    </div>
  );
}

function ChildHome() {
  const { state, viewer, name } = useFamily();
  const today = todayISO();
  const tasks = state.tasks.filter((task) => canSeeTask(viewer, task) && task.due >= today && task.due <= addDays(today, 7));
  const events = state.events
    .filter((event) => canSeeEvent(viewer, event) && event.date >= today && event.date <= addDays(today, 21))
    .sort((a, b) => a.date.localeCompare(b.date));
  const goals = state.goals.filter((goal) => canSeeGoal(viewer, goal));
  return (
    <div className={viewer.age < 8 ? 'stack simple' : 'stack'}>
      <section className="card hero-inline">
        <Avatar id={viewer.id} look={viewer.avatar} size={72} />
        <div>
          <p className="kicker">Bonjour</p>
          <h2>{fullName(viewer)}</h2>
          <p>Vos activités, vos tâches et ce qui vous concerne.</p>
        </div>
      </section>
      <section className="split">
        <article className="card">
          <header className="card-head"><h2>Mes demandes</h2></header>
          {state.requests.filter((request) => request.authorId === viewer.id).length === 0 && <p className="empty">Aucune demande pour le moment.</p>}
          {state.requests.filter((request) => request.authorId === viewer.id).map((request) => (
            <article key={request.id} className="item">
              <strong>{request.title}</strong>
              {request.detail && <p>{request.detail}</p>}
              
            </article>
          ))}
        </article>
        <article className="card">
          <header className="card-head"><h2>Mes notes</h2></header>
          {state.notes.filter((note) => note.authorId === viewer.id).length === 0 && <p className="empty">Aucune note pour le moment.</p>}
          {state.notes.filter((note) => note.authorId === viewer.id).map((note) => (
            <article key={note.id} className="item">
              <strong>{note.title}</strong>
              {note.body && <p>{note.body}</p>}
            </article>
          ))}
        </article>
      </section>
      <section className="split">
        <article className="card">
          <header className="card-head"><h2>À faire</h2></header>
          {tasks.length === 0 && <p className="empty">Les tâches de la semaine apparaîtront ici.</p>}
          {tasks.map((task) => (
            <TaskRow key={task.id} id={task.id} title={task.title} done={task.done} who={formatDayMonth(task.due)} />
          ))}
        </article>
        <article className="card">
          <header className="card-head"><h2>Prochains rendez-vous</h2></header>
          <div className="agenda">
            {events.map((event) => (
              <EventRow key={event.id} event={event} who={name(event.memberId)} companion={event.companionId ? state.people.find((p) => p.id === event.companionId) : undefined} />
            ))}
          </div>
        </article>
      </section>
      {goals.map((goal) => (
        <GoalRow key={goal.id} goal={goal} holder={fullName(viewer)} />
      ))}
    </div>
  );
}

function ProcheHome() {
  const { state, viewer, name } = useFamily();
  const events = state.events
    .filter((event) => canSeeEvent(viewer, event))
    .sort((a, b) => a.date.localeCompare(b.date));
  const docs = state.documents.filter((doc) => doc.sharedWithIds.includes(viewer.id) && doc.sensitivity === 'general');
  return (
    <div className="stack">
      <section className="card hero-inline">
        <Avatar id={viewer.id} look={viewer.avatar} size={72} />
        <div>
          <p className="kicker">Bonjour</p>
          <h2>{fullName(viewer)}</h2>
          <p>Les sorties et autorisations qui vous sont confiées.</p>
        </div>
      </section>
      <section className="card">
        <header className="card-head"><h2>Sorties partagées</h2></header>
        <div className="agenda">
          {events.map((event) => (
            <EventRow key={event.id} event={event} who={name(event.memberId)} />
          ))}
        </div>
      </section>
      <section className="card">
        <header className="card-head"><h2>Documents partagés</h2></header>
        {docs.map((doc) => (
          <p key={doc.id} className="share-doc"><strong>{doc.title}</strong> · {doc.memberIds.map((id) => name(id)).join(', ')}</p>
        ))}
      </section>
    </div>
  );
}
