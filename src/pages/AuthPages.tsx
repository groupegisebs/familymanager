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
        <p className="brand-text"><strong>FamiRepère</strong></p>
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
  const { login, error } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [local, setLocal] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLocal('');
    try {
      await login(username, password);
    } catch (err) {
      setLocal(err instanceof Error ? err.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <p className="brand-text"><strong>FamiRepère</strong></p>
        <h1>Connexion</h1>
        <label className="field">Identifiant<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></label>
        <label className="field">Mot de passe<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {(local || error) && <p className="form-error">{local || error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>Entrer</button>
      </form>
    </main>
  );
}
