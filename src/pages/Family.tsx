import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { household } from '../access';
import { fullName } from '../format';
import { Avatar, avatarKey, IconPicker } from '../components/Avatar';
import { Icon } from '../components/Icons';
import { Badge, useFamily } from '../components/ui';
import type { Person } from '../types';

type Panel = { mode: 'create'; role?: 'parent' | 'enfant' | 'proche' } | { mode: 'edit'; person: Person };

export function FamilyPage() {
  const { state, viewer } = useFamily();
  const [tab, setTab] = useState<'foyer' | 'proches'>('foyer');
  const [panel, setPanel] = useState<Panel | null>(null);
  const members = household(state);
  const proches = state.people.filter((p) => !p.household);

  return (
    <div className="stack family-page">
      <div className="family-toolbar">
        <div className="family-tabs" role="tablist">
          <button type="button" role="tab" className={tab === 'foyer' ? 'on' : ''} aria-selected={tab === 'foyer'} onClick={() => setTab('foyer')}>
            Membres du foyer ({members.length})
          </button>
          {viewer.role === 'parent' && (
            <button type="button" role="tab" className={tab === 'proches' ? 'on' : ''} aria-selected={tab === 'proches'} onClick={() => setTab('proches')}>
              Proches autorisés ({proches.length})
            </button>
          )}
        </div>
        {viewer.isSuperAdmin && (
          <button className="btn btn-primary" type="button" onClick={() => setPanel({ mode: 'create' })}>
            <Icon name="plus" size={18} />
            Ajouter un membre
          </button>
        )}
      </div>

      {tab === 'foyer' && (
        <section className="member-list">
          {members.map((person) => (
            <MemberCard key={person.id} person={person} canEdit={viewer.isSuperAdmin} onEdit={() => setPanel({ mode: 'edit', person })} />
          ))}
        </section>
      )}

      {tab === 'proches' && viewer.role === 'parent' && (
        <section className="card proches-empty">
          {proches.length === 0 ? (
            <>
              <div className="proches-art" aria-hidden="true">
                <Icon name="users" size={42} />
              </div>
              <h2>Proches autorisés</h2>
              <p className="hint">Invitez un proche pour qu’il voie seulement ce que vous partagez avec lui.</p>
              {viewer.isSuperAdmin && (
                <button className="btn btn-primary" type="button" onClick={() => setPanel({ mode: 'create', role: 'proche' })}>
                  Inviter un proche
                </button>
              )}
            </>
          ) : (
            <div className="member-list">
              {proches.map((person) => (
                <MemberCard key={person.id} person={person} canEdit={viewer.isSuperAdmin} onEdit={() => setPanel({ mode: 'edit', person })} />
              ))}
            </div>
          )}
        </section>
      )}

      {panel?.mode === 'create' && <MemberDrawer mode="create" initialRole={panel.role} onClose={() => setPanel(null)} />}
      {panel?.mode === 'edit' && <MemberDrawer key={panel.person.id} mode="edit" person={panel.person} onClose={() => setPanel(null)} />}
    </div>
  );
}

function MemberCard({ person, canEdit, onEdit }: { person: Person; canEdit: boolean; onEdit: () => void }) {
  return (
    <article className="member-card">
      <Avatar id={person.id} look={person.avatar} size={64} />
      <div className="member-card-body">
        <div className="member-card-top">
          <div>
            <h2>{fullName(person)}</h2>
            <div className="member-tags">
              <Badge person={person} />
              {person.isSuperAdmin && (
                <span className="tag tag-admin"><Icon name="crown" size={14} /> Administrateur familial</span>
              )}
              {!person.lastName.trim() && !person.isSuperAdmin && (
                <span className="tag tag-warn">Nom de famille à compléter</span>
              )}
              {person.role === 'enfant' && <span className="tag tag-access"><Icon name="lock" size={14} /> Accès enfant</span>}
              {person.role === 'parent' && !person.isSuperAdmin && <span className="tag tag-ok"><Icon name="check" size={14} /> Compte actif</span>}
              {person.isSuperAdmin && <span className="tag tag-ok"><Icon name="check" size={14} /> Compte actif</span>}
              {person.role === 'proche' && <span className="tag tag-access"><Icon name="lock" size={14} /> Accès limité</span>}
            </div>
          </div>
          {canEdit && (
            <button className="icon-btn" type="button" aria-label={`Modifier ${fullName(person)}`} onClick={onEdit}>
              <Icon name="pencil" size={18} />
            </button>
          )}
        </div>
        <Link className="profile-link" to={`/famille/${person.id}`}>
          Voir le profil <Icon name="chevron" size={16} />
        </Link>
      </div>
    </article>
  );
}

function MemberDrawer({ mode, person, initialRole, onClose }: { mode: 'create' | 'edit'; person?: Person; initialRole?: 'parent' | 'enfant' | 'proche'; onClose: () => void }) {
  const { createMember, updateMember, notify } = useFamily();
  const editing = mode === 'edit' && person;
  const [pickAvatar, setPickAvatar] = useState(false);
  const [resetPw, setResetPw] = useState(false);
  const startRole = person?.role ?? initialRole ?? 'enfant';
  const [form, setForm] = useState({
    firstName: person?.firstName ?? '',
    lastName: person?.lastName ?? '',
    role: startRole as 'parent' | 'enfant' | 'proche',
    relation: person?.relation ?? (startRole === 'proche' ? 'Proche' : 'Enfant'),
    username: person?.username ?? '',
    password: '',
    avatar: person ? avatarKey(person.id, person.avatar) : 'lucas',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await updateMember(person.id, { ...form, password: resetPw ? form.password : '' });
        notify(`${form.firstName} est à jour.`);
      } else {
        await createMember({ ...form, age: 0, gender: '' });
        notify(`${form.firstName} peut maintenant se connecter.`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  const accessHint = form.role === 'enfant'
    ? 'Accès limité aux activités et tâches autorisées.'
    : form.role === 'proche'
      ? 'Accès limité aux éléments explicitement partagés.'
      : 'Accès parent aux activités, finances et documents du foyer.';

  return (
    <div className="drawer-back" onClick={onClose}>
      <aside className="member-drawer" role="dialog" aria-labelledby="member-drawer-title" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <h2 id="member-drawer-title">{editing ? 'Modifier un membre' : 'Ajouter un membre'}</h2>
            <p>{editing ? `Profil de ${person.firstName}` : 'Créer un compte familial'}</p>
          </div>
          <button className="icon-btn" type="button" aria-label="Fermer" onClick={onClose}><Icon name="close" size={18} /></button>
        </header>

        <form className="drawer-body" onSubmit={submit}>
          <div className="drawer-avatar">
            <Avatar id={editing ? person.id : form.avatar} look={form.avatar} size={72} />
            <button className="btn btn-ghost" type="button" onClick={() => setPickAvatar((v) => !v)}>
              <Icon name="camera" size={16} />
              Changer l’avatar
            </button>
          </div>
          {pickAvatar && (
            <IconPicker id={editing ? person.id : 'nouveau'} value={form.avatar} onPick={(avatar) => { setForm({ ...form, avatar }); setPickAvatar(false); }} />
          )}

          <section className="drawer-block">
            <h3><Icon name="users" size={16} /> Identité</h3>
            <label className="field">Prénom *<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label>
            <label className="field">Nom de famille<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Facultatif" /></label>
            <label className="field">Lien familial<input value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} list="liens-familiaux" required /></label>
            <datalist id="liens-familiaux">
              <option value="Papa" />
              <option value="Maman" />
              <option value="Enfant" />
              <option value="Grand-parent" />
              <option value="Oncle" />
              <option value="Tante" />
              <option value="Proche" />
            </datalist>
          </section>

          <section className="drawer-block">
            <h3><Icon name="lock" size={16} /> Accès et autorisations</h3>
            <label className="field">Rôle d’accès
              <select value={form.role} disabled={!!person?.isSuperAdmin} onChange={(e) => setForm({ ...form, role: e.target.value as 'parent' | 'enfant' | 'proche' })}>
                <option value="parent">Parent</option>
                <option value="enfant">Enfant</option>
                <option value="proche">Proche autorisé</option>
              </select>
            </label>
            <label className="field">Identifiant<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder={form.role === 'parent' ? 'adresse@courriel' : ''} required /></label>
            {form.role === 'parent' && <p className="hint">Pour un parent, l’identifiant est son courriel.</p>}
            {editing ? (
              <>
                <button className="reset-pw" type="button" onClick={() => setResetPw((v) => !v)}>
                  <Icon name="key" size={16} />
                  Réinitialiser le mot de passe
                </button>
                {resetPw && (
                  <label className="field">Nouveau mot de passe
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
                  </label>
                )}
              </>
            ) : (
              <label className="field">Mot de passe<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></label>
            )}
            <p className="hint">{accessHint}</p>
          </section>

          {error && <p className="form-error">{error}</p>}
          <div className="drawer-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" type="submit" disabled={busy}>{editing ? 'Enregistrer' : 'Créer le compte'}</button>
          </div>
        </form>
      </aside>
    </div>
  );
}
