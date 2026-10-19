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
import { BUDGET_CATEGORIES } from '../data';
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
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
import { Badge, StatusPill, useFamily } from '../components/ui';
import { MemberOverview } from './MemberPage';

export function Dashboard() {
  const { viewer } = useFamily();
  if (viewer.role === 'proche') return <ProcheHome />;
  if (viewer.role === 'enfant') return <ChildHome />;
  return <ParentHome />;
}

function ParentHome() {
  const { state, byId, name } = useFamily();
  const [mode, setMode] = useState<'famille' | 'membre'>('famille');
  const [selected, setSelected] = useState(state.viewerId);
  const members = household(state);
  const today = todayISO();
  const month = monthKey(today);
  const spent = confirmedSpend(state, month);
  const saved = state.goals.reduce((total, goal) => total + goalConfirmed(goal), 0);
  const weekEvents = state.events
    .filter((event) => event.date > today && event.date <= addDays(today, 7))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const tasks = state.tasks.filter((task) => task.due === today).sort((a, b) => a.title.localeCompare(b.title));
  const dues = upcomingDues(state, today).slice(0, 4);
  const tontine = state.tontines[0];
  const nextTurn = tontine?.participants.find((p) => !p.received);
  const nextPay = tontine?.payments.find((p) => p.memberId && p.status !== 'confirme');
  const budgetRows = BUDGET_CATEGORIES.map((category) => ({ category, limit: state.categoryLimits[category] }));
  const goals = state.goals;
  const attention = attentionPolicies(state.policies, name);

  return (
    <div className="dash">
      <div className="view-switch" role="tablist" aria-label="Vue de l’accueil">
        <button type="button" className={mode === 'famille' ? 'on' : ''} onClick={() => setMode('famille')}>Vue famille</button>
        <button type="button" className={mode === 'membre' ? 'on' : ''} onClick={() => setMode('membre')}>Vue d’un membre</button>
      </div>

      {mode === 'membre' ? (
        <div className="stack">
          <section className="card">
            <header className="card-head">
              <h2>Choisir un membre</h2>
            </header>
            <div className="members">
              {members.map((person) => (
                <button key={person.id} type="button" className={selected === person.id ? 'person on' : 'person'} onClick={() => setSelected(person.id)}>
                  <Avatar id={person.id} />
                  <span className="person-body">
                    <strong>{fullName(person)}</strong>
                    <span className="person-sub">{person.age} ans <Badge person={person} /></span>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <MemberOverview personId={selected} />
        </div>
      ) : (
        <div className="stack">
          <section className="card">
            <header className="card-head">
              <h2><span className="title-ico"><Icon name="users" size={16} /></span> Notre famille · {members.length} membres</h2>
              <Link to="/famille" className="quiet" aria-label="Voir la famille"><Icon name="chevron" size={18} /></Link>
            </header>
            <div className="members">
              {members.map((person) => (
                <Link key={person.id} to={`/famille/${person.id}`} className="person">
                  <Avatar id={person.id} />
                  <span className="person-body">
                    <strong>{fullName(person)}</strong>
                    <span className="person-sub">{person.age} ans <Badge person={person} /></span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="stats">
            <Link to="/finances/budget" className="stat">
              <div className="stat-top">
                <span className="stat-ico violet"><Icon name="case" size={18} /></span>
                <span>Dépenses du mois</span>
                <Icon name="chevron" size={16} />
              </div>
              <p className="stat-main"><strong>{money(spent)}</strong> <span>/ {money(state.monthlyBudget)}</span></p>
              <div className="bar-row">
                <div className="bar"><span style={{ width: `${pct(spent, state.monthlyBudget)}%` }} /></div>
                <em>{pct(spent, state.monthlyBudget)}%</em>
              </div>
            </Link>
            <Link to="/finances/epargne" className="stat">
              <div className="stat-top">
                <span className="stat-ico green"><Icon name="piggy" size={18} /></span>
                <span>Épargne familiale</span>
              </div>
              <p className="big-green">{money(saved)}</p>
            </Link>
            <Link to="/calendrier" className="stat">
              <div className="stat-top">
                <span className="stat-ico blue"><Icon name="calendar" size={18} /></span>
                <span>Prochains rendez-vous</span>
                <Icon name="chevron" size={16} />
              </div>
              <p className="stat-main"><strong className="num-blue">{weekEvents.length}</strong> <span>cette semaine</span></p>
            </Link>
            <Link to="/finances/tontines" className="stat">
              <div className="stat-top">
                <span className="stat-ico rose"><Icon name="users" size={18} /></span>
                <span>Tontine · prochaine cotisation</span>
                <Icon name="chevron" size={16} />
              </div>
              <p className="stat-main"><strong className="num-rose">{tontine ? money(tontine.amount) : '—'}</strong> <span>· {nextPay ? formatDayMonth(nextPay.dueDate) : 'aucune'}</span></p>
            </Link>
          </section>

          <section className="card">
            <header className="card-head">
              <h2>À payer prochainement</h2>
              <Link to="/finances/budget">Voir le détail</Link>
            </header>
            <div className="dues">
              {dues.map((due) => (
                <article key={dueKey(due.ref)} className="due">
                  <div className="between">
                    <strong>{due.title}</strong>
                    <StatusPill status={due.status} />
                  </div>
                  <p>{describeDue(due, state, name, byId)}</p>
                  <p className="due-amt">{money(due.amount)} · {formatDayMonth(due.date)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="split">
            <article className="card">
              <header className="card-head">
                <h2><span className="title-ico"><Icon name="calendar" size={16} /></span> Agenda de la semaine</h2>
                <Link to="/calendrier">Voir tout</Link>
              </header>
              {tasks.length > 0 && (
                <div className="today-block">
                  <p className="today-label">Aujourd’hui · {formatDayMonth(today)}</p>
                  {tasks.map((task) => (
                    <TaskRow key={task.id} id={task.id} title={task.title} done={task.done} who={name(task.assigneeId)} />
                  ))}
                </div>
              )}
              <div className="agenda">
                {weekEvents.map((event) => (
                  <EventRow key={event.id} event={event} companion={event.companionId ? byId(event.companionId) : undefined} who={name(event.memberId)} />
                ))}
              </div>
            </article>
            <article className="card">
              <header className="card-head">
                <h2><span className="title-ico"><Icon name="target" size={16} /></span> Nos objectifs d’épargne</h2>
                <Link to="/finances/epargne">Voir tous</Link>
              </header>
              <div className="goals">
                {goals.map((goal) => (
                  <GoalRow key={goal.id} goal={goal} holder={goal.holderId ? name(goal.holderId) : ''} />
                ))}
              </div>
            </article>
          </section>

          <section className="bottom3">
            <article className="card">
              <header className="card-head">
                <h2><span className="title-ico"><Icon name="wallet" size={16} /></span> Budget par catégorie</h2>
                <span className="month-pill">Ce mois-ci</span>
              </header>
              <div className="cats">
                {budgetRows.slice(0, 4).map((row) => {
                  const value = state.expenses
                    .filter((e) => e.category === row.category && e.status === 'confirme' && monthKey(e.date) === month)
                    .reduce((t, e) => t + e.amount, 0);
                  return (
                    <div key={row.category} className="cat">
                      <div className="between">
                        <span>{CATEGORY_LABEL[row.category]}</span>
                        <strong>{money(value)} <em>/ {money(row.limit)}</em></strong>
                      </div>
                      <div className="bar slim"><span style={{ width: `${Math.min(100, pct(value, row.limit))}%`, background: CATEGORY_COLOR[row.category] }} /></div>
                    </div>
                  );
                })}
              </div>
            </article>
            <article className="card">
              <header className="card-head">
                <h2><span className="title-ico"><Icon name="users" size={16} /></span> Tontine familiale</h2>
                <Link to="/finances/tontines">Voir les détails</Link>
              </header>
              <div className="tontine-body">
                {tontine ? (
                  <>
                    <div className="tontine-art" aria-hidden="true"><Icon name="users" size={28} /></div>
                    <dl>
                      <div><dt>Participant</dt><dd>{nextTurn?.name ?? '—'}</dd></div>
                      <div><dt>Cotisation</dt><dd>{money(tontine.amount)} / {tontine.frequency}</dd></div>
                      <div><dt>Prochain tour</dt><dd>{nextTurn ? formatDayMonth(nextTurn.receptionDate) : '—'}</dd></div>
                    </dl>
                  </>
                ) : <p className="empty">Aucune tontine enregistrée.</p>}
              </div>
            </article>
            <article className="card">
              <header className="card-head">
                <h2><span className="title-ico"><Icon name="shield" size={16} /></span> Assurances à suivre</h2>
                <Link to="/finances/assurances">Voir toutes</Link>
              </header>
              <div className="ins-list">
                {attention.map((item) => (
                  <Link key={item.id} to="/finances/assurances" className="ins-row">
                    <span className={`ins-ico ${item.tone}`}><Icon name={item.icon} size={16} /></span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                    {item.warn ? <em className="warn">!</em> : <Icon name="chevron" size={16} />}
                  </Link>
                ))}
              </div>
            </article>
          </section>
        </div>
      )}
    </div>
  );
}

function dueKey(ref: { kind: string; id?: string; moveId?: string; paymentId?: string; goalId?: string; tontineId?: string }) {
  return [ref.kind, ref.id, ref.goalId, ref.moveId, ref.tontineId, ref.paymentId].join('-');
}

function describeDue(
  due: { ref: { kind: string; id?: string }; who: string },
  state: { expenses: { id: string; payerId: string; beneficiaryIds: string[] }[] },
  name: (id?: string) => string,
  byId: (id?: string) => Person | undefined,
) {
  if (due.ref.kind === 'expense' && due.ref.id) {
    const expense = state.expenses.find((item) => item.id === due.ref.id);
    if (expense) return `Payé par ${name(expense.payerId)} · ${expense.beneficiaryIds.map((id) => name(id)).join(', ')}`;
  }
  if (due.ref.kind === 'policy') {
    const person = byId(due.who);
    const role = person?.gender === 'f' ? 'Souscriptrice' : 'Souscripteur';
    return `${role} : ${name(due.who)}`;
  }
  if (due.ref.kind === 'tontine') {
    const person = byId(due.who);
    return `${person ? fullName(person) : due.who} · participant`;
  }
  const person = byId(due.who);
  return person ? `${fullName(person)} · contributeur` : due.who;
}

function attentionPolicies(policies: { id: string; type: string; subscriberId: string; renewalDate: string; premiumStatus: string }[], name: (id?: string) => string) {
  const habitation = policies.find((policy) => policy.type === 'Habitation');
  const life = policies.find((policy) => policy.type === 'Vie');
  const items: { id: string; title: string; detail: string; icon: IconName; tone: string; warn: boolean }[] = [];
  if (habitation) {
    items.push({
      id: habitation.id,
      title: 'Habitation',
      detail: `Renouvellement le ${formatDayMonth(habitation.renewalDate)}`,
      icon: 'house',
      tone: 'blue',
      warn: false,
    });
  }
  if (life && life.premiumStatus !== 'confirme') {
    items.push({
      id: life.id,
      title: `Vie · ${name(life.subscriberId)}`,
      detail: 'Prime à payer',
      icon: 'heart',
      tone: 'pink',
      warn: true,
    });
  }
  return items;
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
        <Avatar id={viewer.id} size={72} />
        <div>
          <p className="kicker">Bonjour</p>
          <h2>{fullName(viewer)}</h2>
          <p>Vos activités, vos tâches et ce qui vous concerne.</p>
        </div>
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
        <Avatar id={viewer.id} size={72} />
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
