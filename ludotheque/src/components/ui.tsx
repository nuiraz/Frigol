import { useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/lib/auth';
import type { Game, Platform } from '@/lib/db';
import { isImage, PLATFORMS, ratingColor } from '@/lib/format';

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Chargement" />;
}

export function Empty({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong style={{ color: 'var(--text)' }}>{title}</strong>
      {hint && <p>{hint}</p>}
      {children}
    </div>
  );
}

export function Avatar({ value, size }: { value?: string | null; size?: 'lg' }) {
  const v = value || '🎮';
  return <span className={`avatar ${size ?? ''}`}>{isImage(v) ? <img src={v} alt="" /> : v}</span>;
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  const p = PLATFORMS[platform];
  return (
    <span className="platform" style={{ color: p.color }}>
      {p.label}
    </span>
  );
}

export function Score({ value, size }: { value: number | null | undefined; size?: 'lg' }) {
  if (value == null) return null;
  return (
    <span className={`score ${size ?? ''}`} style={{ background: ratingColor(value) }} title="Note sur 10">
      {Number.isInteger(value) ? value : value.toFixed(1).replace('.', ',')}
    </span>
  );
}

export function Cover({ game, score, showPlatform }: { game: Pick<Game, 'name' | 'cover_url' | 'platform'>; score?: number | null; showPlatform?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="cover">
      {game.cover_url && !failed ? (
        <img src={game.cover_url} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="fallback">{game.name}</div>
      )}
      {score != null && <Score value={score} />}
      {showPlatform && <PlatformBadge platform={game.platform} />}
    </div>
  );
}

export function GameTile({ game, score, children }: { game: Game; score?: number | null; children?: ReactNode }) {
  return (
    <Link to={`/jeu/${encodeURIComponent(game.id)}`} className="game-tile">
      <Cover game={game} score={score} showPlatform />
      <span className="game-tile-title">{game.name}</span>
      {children}
    </Link>
  );
}

/** Choix d'une note de 1 à 10. */
export function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="rating-input" role="radiogroup" aria-label="Note sur 10">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className={value >= n ? 'on' : ''}
          style={value >= n ? { background: ratingColor(value) } : undefined}
          onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}

/** Redirige vers la connexion si l'utilisateur n'est pas connecté. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth();
  const location = useLocation();
  if (!ready) return <Spinner />;
  if (!session) return <Navigate to={`/connexion?suite=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}
