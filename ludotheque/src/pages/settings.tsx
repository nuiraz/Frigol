import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Avatar, PlatformBadge } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { linkedAccounts, type LinkedAccount } from '@/lib/db';

const EMOJIS = ['🎮', '🕹️', '👾', '🎯', '🏆', '⚔️', '🛡️', '🐉', '🚀', '🦊', '🐺', '👻', '🤖', '🔥', '⭐', '💎'];

export default function Settings() {
  const auth = useAuth();
  const navigate = useNavigate();
  const p = auth.profile;
  const [username, setUsername] = useState(p?.username ?? '');
  const [bio, setBio] = useState(p?.bio ?? '');
  const [password, setPassword] = useState('');
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (auth.session) linkedAccounts(auth.session.user.id).then(setAccounts).catch(() => {});
  }, [auth.session]);

  const save = async (patch: { username?: string; avatar?: string; bio?: string }) => {
    try {
      await auth.updateProfile(patch);
      setMessage({ ok: true, text: 'Profil mis à jour.' });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <main className="page narrow">
      <h1>{auth.recovering ? 'Nouveau mot de passe' : 'Mon compte'}</h1>

      {auth.recovering && (
        <form
          className="card stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await auth.updatePassword(password);
              setMessage({ ok: true, text: 'Mot de passe changé.' });
            } catch (err) {
              setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
            }
          }}>
          <label className="field">
            Nouveau mot de passe
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </label>
          <button className="btn">Enregistrer</button>
        </form>
      )}

      {message && <p className={message.ok ? 'success' : 'error'}>{message.text}</p>}

      <section className="card stack">
        <h3>Avatar</h3>
        <div className="row">
          {EMOJIS.map((e) => (
            <button key={e} className={`chip ${p?.avatar === e ? 'on' : ''}`} onClick={() => save({ avatar: e })} style={{ fontSize: 18 }}>
              {e}
            </button>
          ))}
        </div>
        {accounts.some((a) => a.avatar_url) && (
          <div className="row">
            <span className="muted small">Ou reprendre l’avatar de :</span>
            {accounts
              .filter((a) => a.avatar_url)
              .map((a) => (
                <button key={a.platform} className="chip" onClick={() => save({ avatar: a.avatar_url! })}>
                  <Avatar value={a.avatar_url} /> <PlatformBadge platform={a.platform} />
                </button>
              ))}
          </div>
        )}
      </section>

      <section className="card stack">
        <label className="field">
          Pseudo
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
            <button className="btn secondary" disabled={username.trim() === p?.username} onClick={() => save({ username: username.trim() })}>
              OK
            </button>
          </div>
        </label>
        <label className="field">
          Bio
          <textarea className="textarea" style={{ minHeight: 70 }} value={bio} maxLength={200} onChange={(e) => setBio(e.target.value)} placeholder="Fan de RPG, chasseur de platines…" />
        </label>
        <div>
          <button className="btn secondary small" disabled={bio === (p?.bio ?? '')} onClick={() => save({ bio })}>
            Enregistrer la bio
          </button>
        </div>
      </section>

      <section className="row">
        <button
          className="btn secondary"
          onClick={async () => {
            await auth.signOut();
            navigate('/');
          }}>
          Se déconnecter
        </button>
        <button
          className="btn danger"
          onClick={async () => {
            if (!confirm('Supprimer définitivement ton compte, tes avis, commentaires et ta ludothèque ?')) return;
            await auth.deleteAccount();
            navigate('/');
          }}>
          Supprimer mon compte
        </button>
      </section>
    </main>
  );
}
