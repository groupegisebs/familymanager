import { useState, type FormEvent } from 'react';
import { useApp } from '../store';

export function SetupPage() {
  const { setup, error } = useApp();
  const [form, setForm] = useState({ firstName: '', username: '', password: '' });
  const [local, setLocal] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLocal('');
    try {
      await setup({ ...form, lastName: '', age: 0 });
    } catch (err) {
      setLocal(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <p className="auth-brand"><img src="/famirepere-logo-complet.jpg" alt="FamiRepère" /></p>
        <h1>Créer le père du foyer</h1>
        <p className="hint">Le premier compte est le super administrateur. C’est lui qui crée ensuite chaque membre de la famille.</p>
        <label className="field">Prénom<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label>
        <label className="field">Identifiant<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" required /></label>
        <label className="field">Mot de passe<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" minLength={8} required /></label>
        {(local || error) && <p className="form-error">{local || error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>Ouvrir le foyer</button>
      </form>
    </main>
  );
}

export function LoginPage() {
  const { error } = useApp();
  const code = new URLSearchParams(window.location.search).get('connexion');
  const local = code === 'attente'
    ? 'Trop de tentatives. Réessayez dans quelques minutes.'
    : code === 'refus'
      ? 'Identifiant ou mot de passe incorrect.'
      : code === 'bloque'
        ? 'La connexion a été refusée. Rechargez la page, puis réessayez.'
        : '';

  return (
    <main className="auth">
      <form className="card auth-card" method="post" action="/api/login">
        <p className="auth-brand"><img src="/famirepere-logo-complet.jpg" alt="FamiRepère" /></p>
        <h1>Connexion</h1>
        <label className="field">Identifiant<input name="username" autoComplete="username" required /></label>
        <label className="field">Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label>
        {(local || error) && <p className="form-error">{local || error}</p>}
        <button className="btn btn-primary" type="submit">Entrer</button>
      </form>
    </main>
  );
}
