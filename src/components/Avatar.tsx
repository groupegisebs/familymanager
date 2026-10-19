type Look = {
  skin: string;
  hair: string;
  shirt: string;
  kind: 'thomas' | 'sophie' | 'emma' | 'lucas' | 'chloe' | 'camille';
};

const LOOKS: Record<string, Look> = {
  thomas: { skin: '#f3c2a4', hair: '#3a2a22', shirt: '#3d7ef0', kind: 'thomas' },
  sophie: { skin: '#f6c8aa', hair: '#6a3b2c', shirt: '#b794f6', kind: 'sophie' },
  emma: { skin: '#f7d0b4', hair: '#7b4634', shirt: '#f7a8c8', kind: 'emma' },
  lucas: { skin: '#f0c09a', hair: '#4e3428', shirt: '#7ec8f0', kind: 'lucas' },
  chloe: { skin: '#f8d2b6', hair: '#8a5340', shirt: '#f9b4d0', kind: 'chloe' },
  camille: { skin: '#efc3a6', hair: '#d9d3cc', shirt: '#8ed1b0', kind: 'camille' },
};

export function Avatar({ id, size = 52 }: { id: string; size?: number }) {
  const look = LOOKS[id] ?? LOOKS.thomas;
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="40" fill="#fff" />
      <circle cx="40" cy="40" r="38" fill={idColor(id)} />
      <path d="M12 86c6-20 16-30 28-30s22 10 28 30" fill={look.shirt} />
      <circle cx="40" cy="36" r="16" fill={look.skin} />
      {hair(look)}
      <ellipse cx="33.5" cy="36" rx="1.5" ry="1.8" fill="#3a2a28" />
      <ellipse cx="46.5" cy="36" rx="1.5" ry="1.8" fill="#3a2a28" />
      <path d="M35.5 42.5c1.4 1.6 3.2 2.4 4.5 2.4s3.1-.8 4.5-2.4" fill="none" stroke="#c47b6a" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="30" cy="40" rx="2.2" ry="1.2" fill="#f3b0a0" opacity="0.7" />
      <ellipse cx="50" cy="40" rx="2.2" ry="1.2" fill="#f3b0a0" opacity="0.7" />
    </svg>
  );
}

function idColor(id: string) {
  if (id === 'thomas') return '#e7f0ff';
  if (id === 'sophie') return '#f4e9ff';
  if (id === 'emma') return '#fde7f1';
  if (id === 'lucas') return '#e5f6ff';
  if (id === 'chloe') return '#ffe8f3';
  return '#e7f7ef';
}

function hair(look: Look) {
  if (look.kind === 'thomas') {
    return (
      <>
        <path d="M24 34c1-12 8-18 16-18s15 6 16 18c-2-6-7-9-16-9s-14 3-16 9z" fill={look.hair} />
        <path d="M26 42c1 8 4 14 6 16 1-6 1-12-1-18M54 42c-1 8-4 14-6 16-1-6-1-12 1-18" fill={look.hair} />
        <path d="M30 48c2 6 6 9 10 9s8-3 10-9c-3 3-6 4-10 4s-7-1-10-4z" fill={look.hair} />
      </>
    );
  }
  if (look.kind === 'lucas') {
    return <path d="M24 36c1-14 8-20 16-20s15 6 16 20c-3-8-8-11-16-11s-13 3-16 11z" fill={look.hair} />;
  }
  if (look.kind === 'chloe') {
    return (
      <>
        <path d="M25 40c0-14 7-22 15-22s15 8 15 22c-2-8-7-12-15-12s-13 4-15 12z" fill={look.hair} />
        <circle cx="22" cy="32" r="6" fill={look.hair} />
        <circle cx="58" cy="32" r="6" fill={look.hair} />
        <circle cx="22" cy="32" r="2" fill="#f8d2b6" />
        <circle cx="58" cy="32" r="2" fill="#f8d2b6" />
      </>
    );
  }
  if (look.kind === 'camille') {
    return <path d="M24 38c1-12 8-16 16-16s15 4 16 16c-2-6-7-9-16-9s-14 3-16 9z" fill={look.hair} />;
  }
  if (look.kind === 'emma') {
    return (
      <>
        <path d="M22 48c2-22 8-30 18-30s16 8 18 30c-4-14-10-18-18-18s-14 4-18 18z" fill={look.hair} />
        <path d="M20 46c2 10 4 18 6 24M60 46c-2 10-4 18-6 24" fill={look.hair} />
      </>
    );
  }
  return (
    <>
      <path d="M22 46c2-20 8-28 18-28s16 8 18 28c-4-12-10-16-18-16s-14 4-18 16z" fill={look.hair} />
      <path d="M18 50c3 12 5 20 8 26M62 50c-3 12-5 20-8 26" fill={look.hair} />
    </>
  );
}
