import { useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/icons';
import { Spinner } from '@/components/ui';
import { callApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { linkedAccounts, type LinkedAccount, type Platform } from '@/lib/db';
import { PLATFORMS, timeAgo } from '@/lib/format';
import { startSteamLogin, takeSteamReturn } from '@/lib/steam-login';

type Status = { platform: Platform; state: 'busy' | 'ok' | 'error'; message: string } | null;

export default function Accounts() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const handled = useRef(false);

  const reload = useCallback(() => linkedAccounts(userId).then(setAccounts), [userId]);

  const run = useCallback(
    async (platform: Platform, action: string, payload: Record<string, unknown> = {}) => {
      setStatus({ platform, state: 'busy', message: 'Import de tes jeux et succès… (jusqu’à une minute)' });
      try {
        const r = await callApi<{ games?: number }>(action, payload);
        setStatus({ platform, state: 'ok', message: r.games != null ? `${r.games} jeux importés.` : 'C’est fait.' });
      } catch (e) {
        setStatus({ platform, state: 'error', message: e instanceof Error ? e.message : String(e) });
      }
      await reload();
    },
    [reload],
  );

  useEffect(() => {
    reload().catch(() => setAccounts([]));
    // Retour de « Se connecter avec Steam ».
    const steam = takeSteamReturn();
    if (steam && !handled.current) {
      handled.current = true;
      run('steam', 'steam-link', { params: steam });
    }
  }, [reload, run]);

  if (!accounts) return <Spinner />;
  const get = (p: Platform) => accounts.find((a) => a.platform === p);

  return (
    <main className="page narrow">
      <section className="stack" style={{ gap: 6 }}>
        <h1>Mes comptes de jeu</h1>
        <p className="muted">Connecte tes plateformes pour importer automatiquement tous tes jeux, ton temps de jeu, tes succès et trophées.</p>
      </section>

      <PlatformCard platform="steam" account={get('steam')} status={status} onSync={() => run('steam', 'steam-sync')} onUnlink={() => run('steam', 'unlink', { platform: 'steam' })}>
        <p className="muted small">Connexion officielle Steam : on ne voit jamais ton mot de passe. Ton profil et les « Détails des jeux » doivent être publics dans la confidentialité Steam.</p>
        <button className="btn" onClick={startSteamLogin}>
          Se connecter avec Steam
        </button>
      </PlatformCard>

      <PlatformCard platform="psn" account={get('psn')} status={status} onSync={() => run('psn', 'psn-sync')} onUnlink={() => run('psn', 'unlink', { platform: 'psn' })}>
        <PsnForm onSubmit={(onlineId, npsso) => run('psn', 'psn-link', { onlineId, npsso })} />
      </PlatformCard>

      <PlatformCard platform="xbox" account={get('xbox')} status={status} onSync={() => run('xbox', 'xbox-sync')} onUnlink={() => run('xbox', 'unlink', { platform: 'xbox' })}>
        <XboxForm onSubmit={(apiKey) => run('xbox', 'xbox-link', { apiKey })} />
      </PlatformCard>
    </main>
  );
}

function PlatformCard({
  platform,
  account,
  status,
  onSync,
  onUnlink,
  children,
}: {
  platform: Platform;
  account?: LinkedAccount;
  status: Status;
  onSync: () => void;
  onUnlink: () => void;
  children: React.ReactNode;
}) {
  const p = PLATFORMS[platform];
  const mine = status?.platform === platform ? status : null;
  return (
    <section className="card stack">
      <div className="platform-card">
        <div className="platform-logo" style={{ background: `${p.color}22`, color: p.color }}>
          {p.short}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>{p.label}</h3>
          {account ? (
            <p className="muted small">
              Connecté : <strong style={{ color: 'var(--text)' }}>{account.display_name}</strong>
              {account.last_sync ? ` · synchronisé ${timeAgo(account.last_sync)}` : ''}
            </p>
          ) : (
            <p className="faint small">Non connecté</p>
          )}
        </div>
        {account && (
          <div className="row">
            <button className="btn secondary small" onClick={onSync} disabled={mine?.state === 'busy'}>
              <Icon name="refresh" size={15} /> Synchroniser
            </button>
            <button
              className="btn ghost small"
              onClick={() => confirm(`Délier ${p.label} ? Les jeux importés seront retirés de ta ludothèque.`) && onUnlink()}>
              Délier
            </button>
          </div>
        )}
      </div>
      {mine && (
        <p className={mine.state === 'error' ? 'error' : mine.state === 'ok' ? 'success' : 'muted small'}>
          {mine.state === 'busy' && '⏳ '}
          {mine.message}
        </p>
      )}
      {!account && children}
    </section>
  );
}

function PsnForm({ onSubmit }: { onSubmit: (onlineId: string, npsso: string) => void }) {
  const [onlineId, setOnlineId] = useState('');
  const [npsso, setNpsso] = useState('');
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (onlineId.trim() && npsso.trim()) onSubmit(onlineId.trim(), npsso.trim().replace(/^.*"npsso"\s*:\s*"([^"]+)".*$/s, '$1'));
      }}>
      <p className="muted small">Sony ne propose pas de bouton de connexion pour les sites tiers. Il faut copier une fois un code de connexion :</p>
      <ol className="steps small">
        <li>
          Connecte-toi sur{' '}
          <a href="https://www.playstation.com/fr-fr/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
            playstation.com
          </a>
          .
        </li>
        <li>
          Ouvre ensuite{' '}
          <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
            cette page
          </a>{' '}
          : elle affiche <code>{'{"npsso":"…"}'}</code>.
        </li>
        <li>Copie le code (64 caractères) et colle-le ci-dessous. Il reste privé : seul notre serveur l’utilise.</li>
      </ol>
      <label className="field">
        Identifiant en ligne PSN
        <input className="input" value={onlineId} onChange={(e) => setOnlineId(e.target.value)} placeholder="ex : Kratos_75" />
      </label>
      <label className="field">
        Code NPSSO
        <input className="input" value={npsso} onChange={(e) => setNpsso(e.target.value)} placeholder="Colle ici le code npsso" autoComplete="off" />
      </label>
      <div>
        <button className="btn" disabled={!onlineId.trim() || npsso.trim().length < 30}>
          Connecter PlayStation
        </button>
      </div>
    </form>
  );
}

function XboxForm({ onSubmit }: { onSubmit: (apiKey: string) => void }) {
  const [key, setKey] = useState('');
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (key.trim()) onSubmit(key.trim());
      }}>
      <p className="muted small">L’accès Xbox passe par OpenXBL, un service gratuit relié à ton compte Microsoft :</p>
      <ol className="steps small">
        <li>
          Va sur{' '}
          <a href="https://xbl.io/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
            xbl.io
          </a>{' '}
          et connecte-toi avec ton compte Xbox / Microsoft.
        </li>
        <li>Dans ton profil OpenXBL, crée une « API Key » personnelle.</li>
        <li>Colle-la ci-dessous. Elle reste privée : seul notre serveur l’utilise.</li>
      </ol>
      <label className="field">
        Clé API OpenXBL
        <input className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Colle ici ta clé OpenXBL" autoComplete="off" />
      </label>
      <div>
        <button className="btn" disabled={key.trim().length < 20}>
          Connecter Xbox
        </button>
      </div>
    </form>
  );
}
