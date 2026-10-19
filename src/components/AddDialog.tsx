import { useEffect, useState, type FormEvent } from 'react';
import { addDays, todayISO } from '../format';
import { useFamily } from './ui';
import type { ActivityBundle, CalEvent, DocCategory, DocItem, EventKind, Expense, ExpenseCategory, Goal, PayStatus, SavingsKind, Sensitivity } from '../types';

type Kind = 'activite' | 'rdv' | 'depense' | 'epargne' | 'tache' | 'document';

const KINDS: { id: Kind; title: string; text: string }[] = [
  { id: 'activite', title: 'Activité liée', text: 'Séances, coût, transport et rappel' },
  { id: 'rdv', title: 'Rendez-vous', text: 'Personne concernée et accompagnateur' },
  { id: 'depense', title: 'Dépense', text: 'Qui paie, qui en bénéficie' },
  { id: 'epargne', title: 'Épargne', text: 'Titulaire, contributeur, objectif' },
  { id: 'tache', title: 'Tâche', text: 'Une responsabilité, un membre' },
  { id: 'document', title: 'Document', text: 'Classement et accès' },
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AddDialog() {
  const { addOpen, setAddOpen, state, dispatch, notify } = useFamily();
  const parents = state.people.filter((p) => p.role === 'parent');
  const children = state.people.filter((p) => p.role === 'enfant');
  const household = state.people.filter((p) => p.household);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => initial(parents[0]?.id ?? 'thomas', children[0]?.id ?? 'lucas'));

  useEffect(() => {
    if (!addOpen) return;
    const parentId = state.people.find((p) => p.role === 'parent')?.id ?? 'thomas';
    const childId = state.people.find((p) => p.role === 'enfant')?.id ?? 'lucas';
    setForm(initial(parentId, childId));
    setError('');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addOpen, setAddOpen, state.people]);

  if (!addOpen) return null;

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Indiquez un intitulé.');
      return;
    }
    if (form.kind === 'activite') {
      const cost = Number(form.cost);
      if (!form.memberId || !form.date || !form.time || Number.isNaN(cost) || cost < 0) {
        setError('Complétez l’enfant, la date, l’heure et le coût.');
        return;
      }
      const activityId = uid('act');
      const bundle: ActivityBundle = {
        activity: {
          id: activityId,
          name,
          memberId: form.memberId,
          time: form.time,
          place: form.place.trim(),
          sessionCost: cost,
          payerId: form.payerId,
          transportId: form.transportId,
          gearNote: form.gear.trim(),
        },
        events: [0, 1, 2, 3].map((i) => ({
          id: uid('ev'),
          title: name,
          kind: 'activite' as const,
          date: addDays(form.date, i * 7),
          time: form.time,
          memberId: form.memberId,
          transportId: form.transportId,
          place: form.place.trim(),
          activityId,
          audience: 'prive' as const,
          sensitive: 'aucune' as const,
          sharedWithIds: [],
        })),
      };
      if (cost > 0) {
        bundle.expense = {
          id: uid('exp'),
          label: `${name} — 4 séances`,
          amount: cost * 4,
          category: 'enfants',
          date: form.date,
          payerId: form.payerId,
          beneficiaryIds: [form.memberId],
          status: 'prevu',
          recurring: true,
          activityId,
        };
      }
      if (form.gear.trim()) {
        bundle.task = {
          id: uid('task'),
          title: `Préparer : ${form.gear.trim()}`,
          assigneeId: form.memberId,
          due: addDays(form.date, -1),
          done: false,
          activityId,
        };
      }
      dispatch({ type: 'add-activity', bundle });
      notify(`${name} est au calendrier, avec le transport${cost > 0 ? ', la dépense prévue' : ''}${form.gear.trim() ? ' et le rappel de matériel' : ''}.`);
    } else if (form.kind === 'rdv') {
      const event: CalEvent = {
        id: uid('ev'),
        title: name,
        kind: form.eventKind,
        date: form.date,
        time: form.time,
        memberId: form.memberId,
        companionId: form.companionId || undefined,
        place: form.place.trim() || undefined,
        professional: form.professional.trim() || undefined,
        notes: form.notes.trim() || undefined,
        audience: form.eventKind === 'famille' ? 'famille' : 'prive',
        sensitive: form.eventKind === 'medical' ? 'medical' : 'aucune',
        sharedWithIds: form.shareProche ? ['camille'] : [],
      };
      dispatch({ type: 'add-event', event });
      notify('Le rendez-vous est ajouté au calendrier.');
    } else if (form.kind === 'depense') {
      const amount = Number(form.cost);
      if (!amount || amount <= 0 || form.beneficiaries.length === 0) {
        setError('Indiquez un montant et au moins une personne bénéficiaire.');
        return;
      }
      const expense: Expense = {
        id: uid('exp'),
        label: name,
        amount,
        category: form.category,
        date: form.date,
        payerId: form.payerId,
        beneficiaryIds: form.beneficiaries,
        status: form.payStatus,
        recurring: form.recurring,
      };
      dispatch({ type: 'add-expense', expense });
      notify('La dépense est enregistrée avec son statut : prévu, déclaré ou confirmé.');
    } else if (form.kind === 'epargne') {
      const target = Number(form.target);
      const amount = Number(form.cost);
      if (!target || target <= 0) {
        setError('Indiquez un montant cible.');
        return;
      }
      const goal: Goal = {
        id: uid('goal'),
        kind: form.goalKind,
        title: name,
        holderId: form.goalKind === 'familial' ? undefined : form.memberId,
        beneficiaryIds: form.goalKind === 'familial' ? household.map((p) => p.id) : [form.memberId],
        target,
        visibility: form.visibility,
        moves: amount > 0 ? [{ id: uid('mv'), memberId: form.payerId, amount, status: form.payStatus, date: form.date, label: 'Versement' }] : [],
      };
      dispatch({ type: 'add-goal', goal });
      notify('L’objectif d’épargne est créé. Seul un versement confirmé avance la progression.');
    } else if (form.kind === 'tache') {
      dispatch({
        type: 'add-task',
        task: { id: uid('task'), title: name, assigneeId: form.assigneeId, due: form.date, done: false },
      });
      notify('La tâche est attribuée.');
    } else {
      const doc: DocItem = {
        id: uid('doc'),
        title: name,
        category: form.docCategory,
        date: form.date,
        memberIds: form.beneficiaries.length ? form.beneficiaries : [form.memberId],
        sensitivity: form.sensitivity,
        sharedWithIds: form.shareProche && form.sensitivity === 'general' ? ['camille'] : [],
      };
      dispatch({ type: 'add-document', document: doc });
      notify('Le document est classé. L’accès suit sa sensibilité.');
    }
    setAddOpen(false);
  }

  function toggleBeneficiary(id: string) {
    set({
      beneficiaries: form.beneficiaries.includes(id) ? form.beneficiaries.filter((x) => x !== id) : [...form.beneficiaries, id],
    });
  }

  return (
    <div className="modal-back" onMouseDown={() => setAddOpen(false)}>
      <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="between">
          <h2>Ajouter</h2>
          <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)}>Fermer</button>
        </div>
        <div className="kinds">
          {KINDS.map((k) => (
            <button key={k.id} type="button" className={form.kind === k.id ? 'kind on' : 'kind'} onClick={() => set({ kind: k.id })}>
              <strong>{k.title}</strong>
              <small>{k.text}</small>
            </button>
          ))}
        </div>
        <div className="form-grid">
          <label className="field span-2">
            <span>Intitulé</span>
            <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={form.kind === 'activite' ? 'Judo' : 'Intitulé'} />
          </label>
          {form.kind === 'activite' && (
            <>
              <Select label="Enfant concerné" value={form.memberId} onChange={(v) => set({ memberId: v })} options={children.map((p) => [p.id, `${p.firstName} ${p.lastName}`])} />
              <Field label="Date de la première séance" type="date" value={form.date} onChange={(v) => set({ date: v })} />
              <Field label="Heure" type="time" value={form.time} onChange={(v) => set({ time: v })} />
              <Field label="Lieu" value={form.place} onChange={(v) => set({ place: v })} />
              <Field label="Coût d’une séance ($)" type="number" value={form.cost} onChange={(v) => set({ cost: v })} />
              <Select label="Payé par" value={form.payerId} onChange={(v) => set({ payerId: v })} options={parents.map((p) => [p.id, `${p.firstName} ${p.lastName}`])} />
              <Select label="Transport" value={form.transportId} onChange={(v) => set({ transportId: v })} options={parents.map((p) => [p.id, `${p.firstName} ${p.lastName}`])} />
              <label className="field span-2">
                <span>Rappel de matériel</span>
                <input value={form.gear} onChange={(e) => set({ gear: e.target.value })} placeholder="Kimono, gourde" />
              </label>
              <p className="hint span-2">Quatre séances sont posées au calendrier. Le coût total reste « prévu » tant que le paiement n’est pas confirmé.</p>
            </>
          )}
          {form.kind === 'rdv' && (
            <>
              <Select label="Type" value={form.eventKind} onChange={(v) => set({ eventKind: v as EventKind })} options={[['activite', 'Activité'], ['medical', 'Médical'], ['scolaire', 'Scolaire'], ['famille', 'Familial']]} />
              <Select label="Personne concernée" value={form.memberId} onChange={(v) => set({ memberId: v })} options={household.map((p) => [p.id, `${p.firstName} ${p.lastName}`])} />
              <Select label="Accompagnateur" value={form.companionId} onChange={(v) => set({ companionId: v })} options={[['', 'Aucun'], ...household.map((p) => [p.id, `${p.firstName} ${p.lastName}`] as [string, string])]} />
              <Field label="Date" type="date" value={form.date} onChange={(v) => set({ date: v })} />
              <Field label="Heure" type="time" value={form.time} onChange={(v) => set({ time: v })} />
              <Field label="Lieu" value={form.place} onChange={(v) => set({ place: v })} />
              <Field label="Professionnel" value={form.professional} onChange={(v) => set({ professional: v })} />
              <label className="field span-2">
                <span>Notes</span>
                <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} />
              </label>
              <label className="checkline span-2">
                <input type="checkbox" checked={form.shareProche} onChange={(e) => set({ shareProche: e.target.checked })} />
                Partager avec Camille Bernard (proche autorisé)
              </label>
            </>
          )}
          {form.kind === 'depense' && (
            <>
              <Field label="Montant ($)" type="number" value={form.cost} onChange={(v) => set({ cost: v })} />
              <Field label="Date" type="date" value={form.date} onChange={(v) => set({ date: v })} />
              <Select label="Catégorie" value={form.category} onChange={(v) => set({ category: v as ExpenseCategory })} options={[['logement', 'Logement'], ['alimentation', 'Alimentation'], ['enfants', 'Enfants'], ['transport', 'Transport'], ['scolarite', 'Scolarité'], ['sante', 'Santé'], ['loisirs', 'Loisirs'], ['autre', 'Autre']]} />
              <Select label="Payé par" value={form.payerId} onChange={(v) => set({ payerId: v })} options={parents.map((p) => [p.id, `${p.firstName} ${p.lastName}`])} />
              <Select label="Statut de l’argent" value={form.payStatus} onChange={(v) => set({ payStatus: v as PayStatus })} options={[['prevu', 'Prévu'], ['declare', 'Déclaré versé'], ['confirme', 'Paiement confirmé']]} />
              <fieldset className="field span-2">
                <legend>Personnes bénéficiaires</legend>
                <div className="checks">
                  {household.map((p) => (
                    <label key={p.id}>
                      <input type="checkbox" checked={form.beneficiaries.includes(p.id)} onChange={() => toggleBeneficiary(p.id)} />
                      {p.firstName} {p.lastName}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="checkline span-2">
                <input type="checkbox" checked={form.recurring} onChange={(e) => set({ recurring: e.target.checked })} />
                Facture récurrente
              </label>
            </>
          )}
          {form.kind === 'epargne' && (
            <>
              <Select label="Type" value={form.goalKind} onChange={(v) => set({ goalKind: v as SavingsKind })} options={[['personnel', 'Personnelle'], ['scolaire', 'Scolaire'], ['familial', 'Projet familial']]} />
              {form.goalKind !== 'familial' && (
                <Select label="Titulaire" value={form.memberId} onChange={(v) => set({ memberId: v })} options={household.map((p) => [p.id, `${p.firstName} ${p.lastName}`])} />
              )}
              <Field label="Montant cible ($)" type="number" value={form.target} onChange={(v) => set({ target: v })} />
              <Field label="Premier versement ($)" type="number" value={form.cost} onChange={(v) => set({ cost: v })} />
              <Select label="Contributeur" value={form.payerId} onChange={(v) => set({ payerId: v })} options={parents.map((p) => [p.id, `${p.firstName} ${p.lastName}`])} />
              <Select label="Statut du versement" value={form.payStatus} onChange={(v) => set({ payStatus: v as PayStatus })} options={[['prevu', 'Prévu'], ['declare', 'Déclaré'], ['confirme', 'Confirmé']]} />
              <Select label="Visibilité" value={form.visibility} onChange={(v) => set({ visibility: v as 'prive' | 'parents' })} options={[['parents', 'Visible par les parents'], ['prive', 'Privé, titulaire seulement']]} />
            </>
          )}
          {form.kind === 'tache' && (
            <>
              <Select label="Responsable" value={form.assigneeId} onChange={(v) => set({ assigneeId: v })} options={household.map((p) => [p.id, `${p.firstName} ${p.lastName}`])} />
              <Field label="Échéance" type="date" value={form.date} onChange={(v) => set({ date: v })} />
            </>
          )}
          {form.kind === 'document' && (
            <>
              <Select label="Catégorie" value={form.docCategory} onChange={(v) => set({ docCategory: v as DocCategory })} options={[['facture', 'Facture'], ['scolaire', 'Scolaire'], ['assurance', 'Assurance'], ['medical', 'Médical'], ['autorisation', 'Autorisation'], ['autre', 'Autre']]} />
              <Select label="Sensibilité" value={form.sensitivity} onChange={(v) => set({ sensitivity: v as Sensitivity })} options={[['general', 'Général'], ['financier', 'Financier'], ['medical', 'Médical']]} />
              <Field label="Date" type="date" value={form.date} onChange={(v) => set({ date: v })} />
              <fieldset className="field span-2">
                <legend>Membres concernés</legend>
                <div className="checks">
                  {household.map((p) => (
                    <label key={p.id}>
                      <input type="checkbox" checked={form.beneficiaries.includes(p.id)} onChange={() => toggleBeneficiary(p.id)} />
                      {p.firstName} {p.lastName}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="checkline span-2">
                <input type="checkbox" checked={form.shareProche} onChange={(e) => set({ shareProche: e.target.checked })} disabled={form.sensitivity !== 'general'} />
                Partager avec Camille Bernard si le document est général
              </label>
            </>
          )}
        </div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">Enregistrer</button>
        </div>
      </form>
    </div>
  );
}

function initial(parentId: string, childId: string) {
  return {
    kind: 'activite' as Kind,
    name: '',
    memberId: childId,
    date: addDays(todayISO(), 1),
    time: '16:30',
    place: '',
    cost: '20',
    payerId: parentId,
    transportId: parentId,
    gear: '',
    companionId: '',
    eventKind: 'scolaire' as EventKind,
    professional: '',
    notes: '',
    category: 'enfants' as ExpenseCategory,
    beneficiaries: [childId] as string[],
    payStatus: 'prevu' as PayStatus,
    recurring: false,
    goalKind: 'scolaire' as SavingsKind,
    target: '1000',
    visibility: 'parents' as 'prive' | 'parents',
    assigneeId: childId,
    docCategory: 'scolaire' as DocCategory,
    sensitivity: 'general' as Sensitivity,
    shareProche: false,
  };
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} min={type === 'number' ? 0 : undefined} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([id, text]) => (
          <option key={id || 'none'} value={id}>{text}</option>
        ))}
      </select>
    </label>
  );
}
