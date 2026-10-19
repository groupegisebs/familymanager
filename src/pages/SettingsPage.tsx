import { fullName } from '../format';
import { Avatar } from '../components/Avatar';
import { useFamily } from '../components/ui';

export function SettingsPage() {
  const { state, viewer, toggleMask, logout } = useFamily();
  return (
    <div className="stack settings">
      <section className="card">
        <header className="card-head"><h2>Compte connecté</h2></header>
        <div className="account-list">
          <div className="account on">
            <Avatar id={viewer.id} size={44} />
            <span>
              <strong>{fullName(viewer)}</strong>
              <small>{viewer.username} · {viewer.isSuperAdmin ? 'Père, super administrateur' : viewer.relation}</small>
            </span>
          </div>
        </div>
        <p className="hint">
          {viewer.isSuperAdmin
            ? 'Vous créez les autres membres depuis la page Famille. Chacun se connecte avec son propre identifiant.'
            : 'Le père du foyer crée les comptes. Un enfant ne voit pas les revenus des parents.'}
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => void logout()}>Se déconnecter</button>
      </section>
      <section className="card">
        <header className="card-head">
          <h2>Rappels sur écran verrouillé</h2>
          <button type="button" className={state.maskNotifications ? 'switch on' : 'switch'} onClick={() => void toggleMask()} aria-pressed={state.maskNotifications}>
            <i />
          </button>
        </header>
        <p className="hint">{state.maskNotifications ? 'Le détail sensible est masqué.' : 'Le rappel affiche le détail.'}</p>
        <div className="lockscreen">
          <small>14:32</small>
          <strong>FamiRepère</strong>
          <p>{state.maskNotifications ? 'Vous avez un rappel' : 'Rendez-vous · détail visible sur cet appareil'}</p>
        </div>
      </section>
    </div>
  );
}
