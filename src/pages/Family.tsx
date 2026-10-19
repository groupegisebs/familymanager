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
            <p>{person.age} ans</p>
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
  const [form, setForm] = useState({ firstName: '', lastName: '', age: '10', gender: 'f' as 'f' | 'm', role: 'enfant' as 'parent' | 'enfant' | 'proche', relation: 'Enfant', username: '', password: '' });
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await createMember({ ...form, age: Number(form.age) });
      notify(`${form.firstName} ${form.lastName} peut maintenant se connecter.`);
      setForm({ ...form, firstName: '', lastName: '', username: '', password: '' });
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
        <label className="field">Nom<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></label>
        <label className="field">Âge<input type="number" min={0} max={120} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required /></label>
        <label className="field">Sexe
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as 'f' | 'm' })}>
            <option value="f">Féminin</option>
            <option value="m">Masculin</option>
          </select>
        </label>
        <label className="field">Rôle
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'parent' | 'enfant' | 'proche' })}>
            <option value="parent">Parent</option>
            <option value="enfant">Enfant</option>
            <option value="proche">Proche autorisé</option>
          </select>
        </label>
        <label className="field">Lien<input value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} required /></label>
        <label className="field">Identifiant<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
        <label className="field">Mot de passe<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" type="submit">Créer le compte</button>
      </form>
    </section>
  );
}
