import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/lib/auth';

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="page narrow" style={{ maxWidth: 440 }}>
      <section className="stack" style={{ gap: 6, textAlign: 'center' }}>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </section>
      <div className="card stack">{children}</div>
    </main>
  );
}

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (auth.session) return <Navigate to={params.get('suite') ?? '/'} replace />;

  return (
    <AuthShell title="Connexion" subtitle="Content de te revoir !">
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await auth.signIn(email.trim(), password);
            navigate(params.get('suite') ?? '/', { replace: true });
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          } finally {
            setBusy(false);
          }
        }}>
        <label className="field">
          E-mail
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          Mot de passe
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn block" disabled={busy}>
          Se connecter
        </button>
      </form>
      <div className="row spread small">
        <Link to="/mot-de-passe-oublie" className="muted">
          Mot de passe oublié ?
        </Link>
        <Link to="/inscription" style={{ color: 'var(--accent)' }}>
          Créer un compte
        </Link>
      </div>
    </AuthShell>
  );
}

export function Signup() {
  const auth = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  if (auth.session) return <Navigate to="/comptes" replace />;

  return (
    <AuthShell title="Rejoins Ludothèque" subtitle="Tous tes jeux Steam, PlayStation et Xbox au même endroit, et une communauté pour en parler.">
      {info ? (
        <p className="success">{info}</p>
      ) : (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            if (!/^[A-Za-z0-9_.-]{3,20}$/.test(username.trim())) return setError('Pseudo : 3 à 20 caractères (lettres, chiffres, _ . -).');
            if (password.length < 8) return setError('Le mot de passe doit faire au moins 8 caractères.');
            if (!accepted) return setError('Tu dois accepter les conditions d’utilisation et la politique de confidentialité.');
            setBusy(true);
            try {
              const { needsConfirmation } = await auth.signUp(email.trim(), password, username.trim());
              if (needsConfirmation) setInfo('Compte créé ! Clique sur le lien reçu par e-mail pour l’activer.');
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(false);
            }
          }}>
          <label className="field">
            Pseudo
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex : PixelHunter" autoComplete="username" required />
          </label>
          <label className="field">
            E-mail
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="field">
            Mot de passe
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="8 caractères minimum" required />
          </label>
          <label className="row small" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 4 }} />
            <span className="muted">
              J’ai au moins 15 ans et j’accepte les{' '}
              <Link to="/legal/cgu" style={{ color: 'var(--accent)' }}>
                conditions d’utilisation
              </Link>{' '}
              et la{' '}
              <Link to="/legal/confidentialite" style={{ color: 'var(--accent)' }}>
                politique de confidentialité
              </Link>
              .
            </span>
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn block" disabled={busy}>
            Créer mon compte
          </button>
        </form>
      )}
      <p className="small muted" style={{ textAlign: 'center' }}>
        Déjà inscrit ?{' '}
        <Link to="/connexion" style={{ color: 'var(--accent)' }}>
          Connexion
        </Link>
      </p>
    </AuthShell>
  );
}

export function Forgot() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  return (
    <AuthShell title="Mot de passe oublié" subtitle="On t’envoie un lien pour en choisir un nouveau.">
      {sent ? (
        <p className="success">Si un compte existe pour cet e-mail, un lien vient d’être envoyé.</p>
      ) : (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await auth.resetPassword(email.trim());
              setSent(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          }}>
          <label className="field">
            E-mail
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn block">Envoyer le lien</button>
        </form>
      )}
    </AuthShell>
  );
}
