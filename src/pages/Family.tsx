import { useState, type FormEvent } from 'react';
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
            <Badge person={person} />
          </Link>
        ))}
      </section>
      {viewer.isSuperAdmin && <CreateMember />}
      {viewer.role === 'parent' && (
        <section className="card">
          <header className="card-head"><h2>Proches autorisés</h2></header>
          <div className="family-grid compact">
            {proches.length === 0 && <p className="empty">Aucun proche pour le moment.</p>}
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

function CreateMember() {
  const { createMember, notify } = useFamily();
  const [form, setForm] = useState({ firstName: '', role: 'enfant' as 'parent' | 'enfant' | 'proche', relation: 'Enfant', username: '', password: '' });
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await createMember({ ...form, lastName: '', age: 0, gender: '' });
      notify(`${form.firstName} peut maintenant se connecter.`);
      setForm({ ...form, firstName: '', username: '', password: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    }
  }

  return (
    <section className="card">
      <header className="card-head"><h2>Nouveau membre</h2></header>
      <p className="hint">Seul le père crée les comptes. Le membre choisit ensuite son identifiant pour se connecter.</p>
      <form className="form-grid" onSubmit={submit}>
        <label className="field">Prénom<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label>
        <label className="field">Rôle
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'parent' | 'enfant' | 'proche' })}>
            <option value="parent">Parent</option>
            <option value="enfant">Enfant</option>
            <option value="proche">Proche autorisé</option>
          </select>
        </label>
        <label className="field">Lien<input value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} required /></label>
        <label className="field">Identifiant<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder={form.role === 'parent' ? 'adresse@courriel' : ''} required /></label>
        {form.role === 'parent' && <p className="hint">Pour un parent, l’identifiant est son courriel : c’est là qu’arrivent les notifications de l’autre parent.</p>}
        <label className="field">Mot de passe<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" type="submit">Créer le compte</button>
      </form>
    </section>
  );
}
