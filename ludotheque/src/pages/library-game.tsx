import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Cover, Empty, PlatformBadge, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { createPost, libraryEntry, type Achievement, type LibraryEntry } from '@/lib/db';
import { playtime } from '@/lib/format';

export default function LibraryGame() {
  const id = decodeURIComponent(useParams().id ?? '');
  const { session } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<LibraryEntry | null | undefined>(undefined);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    libraryEntry(session!.user.id, id).then(setEntry).catch(() => setEntry(null));
  }, [session, id]);

  if (entry === undefined) return <Spinner />;
  if (!entry?.games) return <main className="page"><Empty title="Ce jeu n’est pas dans ta ludothèque" /></main>;

  const game = entry.games;
  const word = game.platform === 'psn' ? 'trophées' : 'succès';
  const achs = [...entry.achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || (b.unlocked_at ?? '').localeCompare(a.unlocked_at ?? ''));
  const shown = achs.filter((a) => filter === 'all' || (filter === 'unlocked' ? a.unlocked : !a.unlocked));
  const pct = entry.achievements_total ? Math.round((entry.achievements_unlocked / entry.achievements_total) * 100) : 0;

  const share = async (a: Achievement) => {
    const body = prompt('Un mot pour accompagner ce succès ? (optionnel)') ?? null;
    if (body === null) return;
    const postId = await createPost({ game_id: game.id, kind: 'achievement', body: body.trim(), achievement: a });
    navigate(`/post/${postId}`);
  };

  return (
    <main className="page">
      <section className="row" style={{ gap: 18, alignItems: 'flex-end' }}>
        <div style={{ width: 110 }}>
          <Cover game={game} />
        </div>
        <div className="stack" style={{ gap: 8, flex: 1, minWidth: 220 }}>
          <PlatformBadge platform={game.platform} />
          <h1>{game.name}</h1>
          <div className="row muted small">
            {entry.playtime_minutes > 0 && <span>{playtime(entry.playtime_minutes)} de jeu</span>}
            {entry.achievements_total > 0 && (
              <span>
                · {entry.achievements_unlocked}/{entry.achievements_total} {word} ({pct} %)
              </span>
            )}
            {entry.platinum && <span>· Platine obtenu</span>}
          </div>
          {entry.achievements_total > 0 && (
            <div className="progress" style={{ maxWidth: 420 }}>
              <span style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <Link to={`/jeu/${encodeURIComponent(game.id)}`} className="btn">
          Noter ce jeu
        </Link>
      </section>

      {achs.length === 0 ? (
        <Empty
          title={entry.achievements_total ? `Détail des ${word} pas encore importé` : `Pas de ${word} pour ce jeu`}
          hint={entry.achievements_total ? 'Le détail est importé pour tes jeux les plus joués. Relance une synchronisation pour compléter.' : undefined}
        />
      ) : (
        <section className="stack">
          <div className="row">
            {(
              [
                ['all', `Tous · ${achs.length}`],
                ['unlocked', `Obtenus · ${achs.filter((a) => a.unlocked).length}`],
                ['locked', `À obtenir · ${achs.filter((a) => !a.unlocked).length}`],
              ] as const
            ).map(([k, label]) => (
              <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>
          <div className="card flush">
            {shown.map((a) => (
              <div key={a.id} className={`achievement ${a.unlocked ? '' : 'locked'}`}>
                {a.icon ? <img src={a.icon} alt="" loading="lazy" /> : <span className="ach-icon" />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{a.name}</strong>
                  <p className="muted small">{a.description}</p>
                  {a.unlocked_at && <p className="faint small">Obtenu le {new Date(a.unlocked_at).toLocaleDateString('fr-FR')}</p>}
                </div>
                {a.unlocked && (
                  <button className="btn ghost small" onClick={() => share(a)}>
                    Partager
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
