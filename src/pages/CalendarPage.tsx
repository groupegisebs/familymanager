import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { canSeeEvent, canSeeNotes } from '../access';
import { companionWord, formatLong, formatMonthYear, formatTime, fullName, isoFromDate, money, parseISO, todayISO } from '../format';
import { useFamily } from '../components/ui';

export function CalendarPage() {
  const { state, viewer, byId, name } = useFamily();
  const [params, setParams] = useSearchParams();
  const requested = params.get('date') ?? todayISO();
  const [selected, setSelected] = useState(requested);
  const [cursor, setCursor] = useState(() => parseISO(requested));
  const [memberId, setMemberId] = useState('tous');

  useEffect(() => {
    setSelected(requested);
    setCursor(parseISO(requested));
  }, [requested]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => buildMonth(year, month), [year, month]);
  const visible = state.events.filter((event) => canSeeEvent(viewer, event) && (memberId === 'tous' || event.memberId === memberId || event.companionId === memberId || event.transportId === memberId));
  const dayEvents = visible.filter((event) => event.date === selected).sort((a, b) => a.time.localeCompare(b.time));
  const people = state.people.filter((p) => p.household);

  function choose(date: string) {
    setSelected(date);
    setParams({ date });
  }

  return (
    <div className="cal-layout">
      <section className="card">
        <header className="card-head">
          <button type="button" className="btn btn-ghost" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Mois précédent">‹</button>
          <h2>{formatMonthYear(year, month)}</h2>
          <button type="button" className="btn btn-ghost" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Mois suivant">›</button>
        </header>
        <div className="legend">
          <button type="button" className={memberId === 'tous' ? 'legend-item on' : 'legend-item'} onClick={() => setMemberId('tous')}>Tous</button>
          {people.map((person) => (
            <button key={person.id} type="button" className={memberId === person.id ? 'legend-item on' : 'legend-item'} onClick={() => setMemberId(person.id)}>
              <i style={{ background: person.color }} />
              {fullName(person)}
            </button>
          ))}
        </div>
        <div className="cal-grid">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label) => (
            <span key={label} className="dow">{label}</span>
          ))}
          {cells.map((date, index) => {
            if (!date) return <span key={`e-${index}`} className="cell empty" />;
            const events = visible.filter((event) => event.date === date);
            const on = date === selected;
            const isToday = date === todayISO();
            return (
              <button key={date} type="button" className={on ? 'cell on' : 'cell'} onClick={() => choose(date)}>
                <strong className={isToday ? 'today-num' : ''}>{Number(date.slice(8))}</strong>
                <span className="dots">
                  {events.slice(0, 3).map((event) => (
                    <i key={event.id} style={{ background: byId(event.memberId)?.color }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="card">
        <header className="card-head">
          <h2>{formatLong(selected)}</h2>
        </header>
        {dayEvents.length === 0 && <p className="empty">Rien au calendrier pour cette journée.</p>}
        {dayEvents.map((event) => {
          const member = byId(event.memberId);
          const companion = event.companionId ? byId(event.companionId) : undefined;
          const expense = state.expenses.find((item) => item.activityId && item.activityId === event.activityId);
          return (
            <article key={event.id} className="item">
              <div className="between">
                <strong>{event.title}</strong>
                <span>{formatTime(event.time)}</span>
              </div>
              {event.place && <p>{event.place}</p>}
              {member && <p><em>Personne concernée</em> <span className="chip"><i style={{ background: member.color }} />{fullName(member)}</span></p>}
              {companion && <p><em>{companionWord(companion)}</em> <span className="chip"><i style={{ background: companion.color }} />{fullName(companion)}</span></p>}
              {event.transportId && <p><em>Transport</em> {name(event.transportId)}</p>}
              {event.professional && viewer.role === 'parent' && <p><em>Professionnel</em> {event.professional}</p>}
              {canSeeNotes(viewer, event) && event.notes && <p className="note">{event.notes}</p>}
              {expense && viewer.role === 'parent' && (
                <p><em>Dépense liée</em> {expense.label} · {money(expense.amount)} · {expense.status === 'confirme' ? 'Confirmée' : expense.status === 'declare' ? 'Déclarée' : 'Prévue'}</p>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= count; day += 1) cells.push(isoFromDate(new Date(year, month, day)));
  while (cells.length % 7) cells.push(null);
  return cells;
}
