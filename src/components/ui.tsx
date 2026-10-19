import { fullName, statusLabel } from '../format';
import { useApp } from '../store';
import type { PayStatus, Person } from '../types';

export function useFamily() {
  const app = useApp();
  const viewer = app.state.people.find((p) => p.id === app.state.viewerId) ?? app.state.people[0];
  const byId = (id?: string) => app.state.people.find((p) => p.id === id);
  const name = (id?: string) => {
    const person = byId(id);
    return person ? fullName(person) : '';
  };
  return { ...app, viewer, byId, name };
}

export function StatusPill({ status }: { status: PayStatus }) {
  return <span className={`pill pill-${status}`}>{statusLabel(status)}</span>;
}

export function PersonChip({ id, label }: { id?: string; label?: string }) {
  const { byId } = useFamily();
  const person = id ? byId(id) : undefined;
  const text = person ? fullName(person) : label;
  if (!text) return null;
  return (
    <span className="chip">
      <i style={{ background: person?.color ?? '#c9c3d8' }} />
      {text}
    </span>
  );
}

export function Badge({ person }: { person: Person }) {
  return (
    <span className="badge" style={{ color: person.color, background: person.soft }}>
      {person.relation}
    </span>
  );
}
