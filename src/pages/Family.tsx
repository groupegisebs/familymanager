import { Link } from 'react-router-dom';
import { household } from '../access';
import { fullName } from '../format';
import { Avatar } from '../components/Avatar';
import { Badge, useFamily } from '../components/ui';

export function FamilyPage() {
  const { state, viewer } = useFamily();
  const members = household(state);
  const proches = state.people.filter((p) => !p.household);
  return (
    <div className="stack">
      <section className="family-grid">
        {members.map((person) => (
          <Link key={person.id} to={`/famille/${person.id}`} className="family-tile">
            <Avatar id={person.id} size={84} />
            <h2>{fullName(person)}</h2>
            <p>{person.age} ans</p>
            <Badge person={person} />
          </Link>
        ))}
      </section>
      {viewer.role === 'parent' && (
        <section className="card">
          <header className="card-head"><h2>Proche autorisé</h2></header>
          <div className="family-grid compact">
            {proches.map((person) => (
              <Link key={person.id} to={`/famille/${person.id}`} className="family-tile">
                <Avatar id={person.id} size={64} />
                <h2>{fullName(person)}</h2>
                <p>Accès limité aux éléments partagés</p>
                <Badge person={person} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
