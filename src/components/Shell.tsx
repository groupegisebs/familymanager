import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { formatMonthYear, fullName, todayISO } from '../format';
import { useFamily } from './ui';
import { Avatar } from './Avatar';
import { Icon } from './Icons';
import { AddDialog } from './AddDialog';
import { upcomingDues } from '../access';

const FINANCE_LINKS = [
  { to: '/finances/budget', label: 'Budget' },
  { to: '/finances/epargne', label: 'Épargne' },
  { to: '/finances/tontines', label: 'Tontines' },
  { to: '/finances/assurances', label: 'Assurances' },
];

export function Shell() {
  const { pathname } = useLocation();
  const { state, viewer, setAddOpen, toast, logout } = useFamily();
  const heading = titleFor(pathname, state.people);
  const financeOpen = pathname.startsWith('/finances');
  const [financesOpen, setFinancesOpen] = useState(financeOpen);
  const today = todayISO();
  const alerts = upcomingDues(state, today).filter((due) => due.date <= addDaysSafe(today, 7)).length
    + state.tasks.filter((task) => !task.done && task.due <= addDaysSafe(today, 7)).length;
  const now = new Date();
  const monthLabel = formatMonthYear(now.getFullYear(), now.getMonth());

  useEffect(() => {
    if (financeOpen) setFinancesOpen(true);
  }, [financeOpen]);

  useEffect(() => {
    document.title = `${heading.title} — FamiRepère`;
    document.querySelector('.content')?.scrollTo(0, 0);
  }, [pathname, heading.title]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/famirepere-logo-complet.jpg" alt="FamiRepère" />
          <small>Une famille mieux organisée au quotidien</small>
        </div>
        <nav className="nav" aria-label="Navigation">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <Icon name="home" /> Accueil
          </NavLink>
          <NavLink to="/famille" className={({ isActive }) => (isActive || pathname.startsWith('/famille/') ? 'nav-item active' : 'nav-item')}>
            <Icon name="users" /> Ma famille
          </NavLink>
          <NavLink to="/calendrier" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <Icon name="calendar" /> Calendrier
          </NavLink>
          <div className={financeOpen ? 'nav-group open' : 'nav-group'}>
            <button type="button" className={financeOpen ? 'nav-item active' : 'nav-item'} onClick={() => setFinancesOpen((v) => !v)} aria-expanded={financesOpen}>
              <Icon name="wallet" /> Finances
              <span className="nav-caret">{financesOpen ? '▾' : '▸'}</span>
            </button>
            {financesOpen && (
              <div className="nav-sub">
                {FINANCE_LINKS.map((link) => (
                  <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'nav-subitem on' : 'nav-subitem')}>
                    {link.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
          <NavLink to="/documents" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <Icon name="file" /> Documents
          </NavLink>
          <NavLink to="/parametres" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <Icon name="settings" /> Paramètres
          </NavLink>
        </nav>
        <div className="side-spacer" />
        <div className="who-wrap">
          <div className="who">
            <Avatar id={viewer.id} look={viewer.avatar} size={36} />
            <span>
              <strong>{fullName(viewer)}</strong>
              <small>{viewer.isSuperAdmin ? 'Père · super administrateur' : viewer.role === 'parent' ? 'Parent' : viewer.role === 'enfant' ? 'Enfant' : 'Proche autorisé'}</small>
            </span>
          </div>
        </div>
        <button className="logout" type="button" onClick={() => void logout()}>Se déconnecter</button>
        <div className="side-art" aria-hidden="true">
          <svg viewBox="0 0 220 110" width="180" height="90">
            <path d="M20 92c20-18 30-18 48-4 10 8 22 8 34-2 14-12 28-10 46 2 12 8 22 8 40-4" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
            <path d="M78 78V58l22-16 22 16v20z" fill="rgba(255,255,255,.92)" />
            <path d="M74 58 100 38l26 20" fill="none" stroke="rgba(255,255,255,.95)" strokeWidth="3" />
            <rect x="96" y="64" width="8" height="14" rx="1" fill="#3d2e72" />
            <rect x="84" y="62" width="7" height="6" rx="1" fill="#d7c9ff" />
            <rect x="109" y="62" width="7" height="6" rx="1" fill="#d7c9ff" />
            <circle cx="58" cy="70" r="10" fill="rgba(255,255,255,.28)" />
            <circle cx="154" cy="66" r="12" fill="rgba(255,255,255,.22)" />
            <path d="M148 78c8 6 16 4 20-2" fill="none" stroke="rgba(255,255,255,.45)" />
          </svg>
          <p className="side-script">
            Des projets aujourd’hui
            <br />
            pour leur demain <span>♥</span>
          </p>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <h1>{heading.title}</h1>
            <p>{heading.sub}</p>
          </div>
          <div className="actions">
            {pathname === '/' && <span className="month-chip"><Icon name="calendar" size={16} /> {monthLabel}</span>}
            {pathname === '/' && (
              <span className="bell" aria-label={alerts ? `${alerts} rappels` : 'Aucun rappel'}>
                <Icon name="bell" size={18} />
                {alerts > 0 && <i />}
              </span>
            )}
            {(viewer.role === 'parent' || viewer.role === 'enfant') && !pathname.startsWith('/famille') && (
              <button className="btn btn-primary" type="button" onClick={() => setAddOpen(true)}>
                <Icon name="plus" size={18} />
                Ajouter
              </button>
            )}
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
      <AddDialog />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function addDaysSafe(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function titleFor(pathname: string, people: { id: string; firstName: string; lastName: string; age: number; relation: string }[]) {
  if (pathname.startsWith('/famille/')) {
    const person = people.find((p) => p.id === pathname.split('/')[2]);
    if (person) return { title: fullName(person), sub: person.relation };
  }
  if (pathname.startsWith('/famille')) return { title: 'Ma famille', sub: 'Les membres de votre foyer et leurs accès' };
  if (pathname.startsWith('/calendrier')) return { title: 'Calendrier partagé', sub: 'Une couleur par membre' };
  if (pathname.startsWith('/finances')) return { title: 'Finances', sub: 'Budget, épargne, tontines et assurances' };
  if (pathname.startsWith('/documents')) return { title: 'Documents familiaux', sub: 'Factures, scolarité, assurances et autorisations' };
  if (pathname.startsWith('/parametres')) return { title: 'Paramètres', sub: 'Comptes, accès et rappels' };
  return { title: 'Tableau de bord', sub: 'Votre famille, vos priorités, en un coup d’œil' };
}
