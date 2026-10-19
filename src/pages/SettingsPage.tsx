import { fullName } from '../format';
import { Avatar } from '../components/Avatar';
import { useFamily } from '../components/ui';

export function SettingsPage() {
  const { state, viewer, dispatch } = useFamily();
  return (
    <div className="stack settings">
      <section className="card">
        <header className="card-head"><h2>Compte utilisé</h2></header>
        <p className="hint">Chaque personne a son accès. Un enfant ne voit pas les revenus des parents. Un proche autorisé ne voit que les sorties qui lui sont confiées.</p>
        <div className="account-list">
          {state.people.map((person) => (
            <button key={person.id} type="button" className={person.id === viewer.id ? 'account on' : 'account'} onClick={() => dispatch({ type: 'set-viewer', id: person.id })}>
              <Avatar id={person.id} size={44} />
              <span>
                <strong>{fullName(person)}</strong>
                <small>{person.relation} · {person.role === 'parent' ? 'Gestion du foyer' : person.role === 'enfant' ? 'Activités et tâches selon l’âge' : 'Éléments partagés'}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="card">
        <header className="card-head">
          <h2>Rappels sur écran verrouillé</h2>
          <button type="button" className={state.maskNotifications ? 'switch on' : 'switch'} onClick={() => dispatch({ type: 'toggle-mask' })} aria-pressed={state.maskNotifications}>
            <i />
          </button>
        </header>
        <p className="hint">{state.maskNotifications ? 'Le détail sensible est masqué.' : 'Le rappel affiche le détail.'}</p>
        <div className="lockscreen">
          <small>14:32</small>
          <strong>FamiRepère</strong>
          <p>{state.maskNotifications ? 'Vous avez un rappel' : 'Rendez-vous médical · Chloé Laurent · mardi 10 h'}</p>
        </div>
      </section>
      <section className="card">
        <header className="card-head"><h2>Données de démonstration</h2></header>
        <p className="hint">Les ajouts restent sur cet appareil. Vous pouvez revenir au foyer Laurent.</p>
        <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'reset' })}>Revenir aux données de démonstration</button>
      </section>
    </div>
  );
}
