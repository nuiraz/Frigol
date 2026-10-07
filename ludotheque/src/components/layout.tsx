import { useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '@/lib/auth';

import { Icon } from './icons';
import { Avatar } from './ui';

const LINKS = [
  { to: '/', label: 'Hub', icon: 'home', end: true },
  { to: '/jeux', label: 'Jeux', icon: 'search' },
  { to: '/bibliotheque', label: 'Ma ludothèque', icon: 'library' },
  { to: '/comptes', label: 'Comptes', icon: 'link' },
];

export function Layout() {
  const { session, profile, recovering } = useAuth();
  const navigate = useNavigate();
  // Lien « mot de passe oublié » ouvert : on va directement choisir le nouveau mot de passe.
  useEffect(() => {
    if (recovering) navigate('/compte');
  }, [recovering, navigate]);
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="brand-mark" />
          Ludothèque
        </Link>
        <nav className="nav">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-right">
          {session ? (
            <Link to={profile ? `/u/${profile.username}` : '/compte'} title="Mon profil">
              <Avatar value={profile?.avatar} />
            </Link>
          ) : (
            <>
              <Link to="/connexion" className="btn ghost small">
                Connexion
              </Link>
              <Link to="/inscription" className="btn small">
                S’inscrire
              </Link>
            </>
          )}
        </div>
      </header>

      <Outlet />

      <nav className="bottom-nav" aria-label="Navigation principale">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            <Icon name={l.icon} />
            {l.label === 'Ma ludothèque' ? 'Ludothèque' : l.label}
          </NavLink>
        ))}
        <NavLink to={session && profile ? `/u/${profile.username}` : '/connexion'}>
          <Icon name="user" />
          Profil
        </NavLink>
      </nav>
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <Link to="/legal/mentions">Mentions légales</Link>
      <Link to="/legal/cgu">Conditions d’utilisation</Link>
      <Link to="/legal/confidentialite">Confidentialité</Link>
      <span>Ludothèque n’est affilié ni à Valve, ni à Sony, ni à Microsoft.</span>
    </footer>
  );
}
