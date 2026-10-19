import { useState } from 'react';
import { canSeeDoc } from '../access';
import { formatDayMonth, fullName } from '../format';
import type { DocCategory } from '../types';
import { useFamily } from '../components/ui';

const FILTERS: { id: 'tous' | DocCategory; label: string }[] = [
  { id: 'tous', label: 'Tout' },
  { id: 'facture', label: 'Factures' },
  { id: 'scolaire', label: 'Scolarité' },
  { id: 'assurance', label: 'Assurances' },
  { id: 'medical', label: 'Médical' },
  { id: 'autorisation', label: 'Autorisations' },
];

const SENSITIVITY: Record<string, string> = {
  general: 'Général',
  financier: 'Financier',
  medical: 'Médical',
};

export function DocumentsPage() {
  const { state, viewer, name } = useFamily();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('tous');
  const docs = state.documents.filter((doc) => canSeeDoc(viewer, doc) && (filter === 'tous' || doc.category === filter));
  return (
    <div className="stack">
      <div className="legend">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" className={filter === item.id ? 'legend-item on' : 'legend-item'} onClick={() => setFilter(item.id)}>{item.label}</button>
        ))}
      </div>
      <div className="doc-grid">
        {docs.map((doc) => (
          <article key={doc.id} className="card doc">
            <span className={`sens sens-${doc.sensitivity}`}>{SENSITIVITY[doc.sensitivity]}</span>
            <h2>{doc.title}</h2>
            <p>{formatDayMonth(doc.date)}</p>
            <p>{doc.memberIds.map((id) => name(id)).filter(Boolean).join(', ')}</p>
            {doc.sharedWithIds.length > 0 && <p>Partagé avec {doc.sharedWithIds.map((id) => name(id)).join(', ')}</p>}
          </article>
        ))}
      </div>
      {docs.length === 0 && <p className="empty">Aucun document dans cette vue pour {fullName(viewer)}.</p>}
    </div>
  );
}
