import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { fullName } from '../format';
import { useFamily } from './ui';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icons';
import { AddDialog } from './AddDialog';

const NAV: { to: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
  { to: '/', label: 'Accueil', icon: 'home', match: (p) => p === '/' },
  { to: '/famille', label: 'Famille', icon: 'users', match: (p) => p.startsWith('/famille') },
  { to: '/calendrier', label: 'Calendrier', icon: 'calendar', match: (p) => p.startsWith('/calendrier') },
  { to: '/finances/budget', label: 'Finances', icon: 'wallet', match: (p) => p.startsWith('/finances') },
  { to: '/documents', label: 'Documents', icon: 'file', match: (p) => p.startsWith('/documents') },
  { to: '/parametres', label: 'Paramètres', icon: 'settings', match: (p) => p.startsWith('/parametres') },
];

export function Shell() {
  const { pathname } = useLocation();
  const { state, viewer, setAddOpen, toast, logout } = useFamily();
  const heading = titleFor(pathname, state.people);

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
          {NAV.map((item) => (
            <NavLink key={item.label} to={item.to} end={item.to === '/'} className={item.match(pathname) ? 'nav-item active' : 'nav-item'}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
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
            {(viewer.role === 'parent' || viewer.role === 'enfant') && (
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

function titleFor(pathname: string, people: { id: string; firstName: string; lastName: string; age: number; relation: string }[]) {
  if (pathname.startsWith('/famille/')) {
    const person = people.find((p) => p.id === pathname.split('/')[2]);
    if (person) return { title: fullName(person), sub: person.relation };
  }
  if (pathname.startsWith('/famille')) return { title: 'Famille', sub: 'Les personnes du foyer' };
  if (pathname.startsWith('/calendrier')) return { title: 'Calendrier partagé', sub: 'Une couleur par membre' };
  if (pathname.startsWith('/finances')) return { title: 'Finances', sub: 'Budget, épargne, tontines et assurances' };
  if (pathname.startsWith('/documents')) return { title: 'Documents familiaux', sub: 'Factures, scolarité, assurances et autorisations' };
  if (pathname.startsWith('/parametres')) return { title: 'Paramètres', sub: 'Comptes, accès et rappels' };
  return { title: 'Tableau de bord familial', sub: 'Tout pour organiser votre quotidien' };
}
