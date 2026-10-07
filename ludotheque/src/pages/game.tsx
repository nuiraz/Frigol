import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PostCard } from '@/components/post-card';
import { Avatar, Cover, Empty, PlatformBadge, RatingInput, Score, Spinner } from '@/components/ui';
import { callApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  createPost,
  deletePost,
  getGame,
  getRatings,
  libraryEntry,
  listPosts,
  myReview,
  players,
  ratingDistribution,
  saveReview,
  type Game as GameT,
  type LibraryEntry,
  type Post,
  type Rating,
} from '@/lib/db';
import { playtime, ratingColor } from '@/lib/format';
import { useLikes } from '@/lib/use-likes';

export default function GamePage() {
  const id = decodeURIComponent(useParams().id ?? '');
  const { session } = useAuth();
  const userId = session?.user.id;
  const [game, setGame] = useState<GameT | null | undefined>(undefined);
  const [rating, setRating] = useState<Rating | null>(null);
  const [dist, setDist] = useState<number[]>([]);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [tab, setTab] = useState<'review' | 'discussion'>('review');
  const [mine, setMine] = useState<LibraryEntry | null>(null);
  const [crowd, setCrowd] = useState<Awaited<ReturnType<typeof players>>>([]);
  const { liked, toggle } = useLikes(posts, (fn) => setPosts((p) => (p ? fn(p) : p)));

  const refreshCommunity = useCallback(async () => {
    const [r, d] = await Promise.all([getRatings([id]), ratingDistribution(id)]);
    setRating(r.get(id) ?? null);
    setDist(d);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let g = await getGame(id).catch(() => null);
      // Fiche Steam complète (description, genres…) récupérée à la première visite.
      if (id.startsWith('steam:') && (!g || !g.description)) {
        g = (await callApi<{ game: GameT }>('steam-game', { appid: id.slice(6) }).then((r) => ({ ...g, ...r.game }) as GameT).catch(() => g)) ?? null;
      }
      if (!cancelled) setGame(g);
    })();
    refreshCommunity().catch(() => {});
    players(id).then((p) => !cancelled && setCrowd(p)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, refreshCommunity]);

  useEffect(() => {
    let cancelled = false;
    listPosts({ gameId: id, kind: tab, limit: 50 })
      .then((p) => !cancelled && setPosts(p))
      .catch(() => !cancelled && setPosts([]));
    return () => {
      cancelled = true;
    };
  }, [id, tab]);

  useEffect(() => {
    if (!userId) return;
    libraryEntry(userId, id).then(setMine).catch(() => {});
  }, [userId, id]);

  const reload = async () => {
    await refreshCommunity();
    setPosts(await listPosts({ gameId: id, kind: tab, limit: 50 }));
  };

  if (game === undefined) return <Spinner />;
  if (game === null) return <main className="page"><Empty title="Jeu introuvable" /></main>;

  const total = dist.reduce((a, b) => a + b, 0);

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url(${game.header_url ?? game.cover_url ?? ''})` }} />
        <div className="hero-content">
          <div className="hero-cover">
            <Cover game={game} />
          </div>
          <div className="stack" style={{ gap: 8, flex: 1, minWidth: 0 }}>
            <PlatformBadge platform={game.platform} />
            <h1>{game.name}</h1>
            <div className="row muted small">
              {game.developer && <span>{game.developer}</span>}
              {game.release_date && <span>· {game.release_date}</span>}
            </div>
          </div>
          <div className="stack" style={{ alignItems: 'center', gap: 4 }}>
            {rating ? <Score value={rating.average} size="lg" /> : <span className="score lg" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>–</span>}
            <span className="small muted">{rating ? `${rating.reviews} avis` : 'Pas de note'}</span>
          </div>
        </div>
      </section>

      <div className="grid-main">
        <div className="stack">
          <ReviewForm gameId={id} onSaved={reload} />

          <div className="row spread">
            <div className="tabs">
              <button className={tab === 'review' ? 'on' : ''} onClick={() => setTab('review')}>
                Avis
              </button>
              <button className={tab === 'discussion' ? 'on' : ''} onClick={() => setTab('discussion')}>
                Discussions
              </button>
            </div>
          </div>
          {tab === 'discussion' && <DiscussionForm gameId={id} onPosted={reload} />}
          {!posts ? (
            <Spinner />
          ) : posts.length === 0 ? (
            <Empty title={tab === 'review' ? 'Aucun avis pour l’instant' : 'Aucune discussion'} hint="Lance-toi, la communauté t’attend !" />
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} liked={liked.has(p.id)} onLike={() => toggle(p)} hideGame />)
          )}
        </div>

        <aside className="stack">
          {total > 0 && (
            <div className="card stack">
              <h3>Notes de la communauté</h3>
              <div className="bars">
                {dist
                  .map((count, i) => ({ note: i + 1, count }))
                  .reverse()
                  .map(({ note, count }) => (
                    <div key={note} className="bar-row">
                      <span>{note}</span>
                      <div className="bar">
                        <span style={{ width: `${(count / total) * 100}%`, background: ratingColor(note) }} />
                      </div>
                      <span>{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {mine && (
            <Link to={`/bibliotheque/${encodeURIComponent(id)}`} className="card stack">
              <h3>Dans ta ludothèque</h3>
              <div className="row spread small">
                <span className="muted">Temps de jeu</span>
                <strong>{playtime(mine.playtime_minutes)}</strong>
              </div>
              {mine.achievements_total > 0 && (
                <>
                  <div className="row spread small">
                    <span className="muted">{game.platform === 'psn' ? 'Trophées' : 'Succès'}</span>
                    <strong>
                      {mine.achievements_unlocked} / {mine.achievements_total}
                    </strong>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${(mine.achievements_unlocked / mine.achievements_total) * 100}%` }} />
                  </div>
                </>
              )}
            </Link>
          )}

          {game.description && (
            <div className="card stack">
              <h3>À propos</h3>
              <p className="muted small">{game.description}</p>
              {game.genres.length > 0 && (
                <div className="row">
                  {game.genres.map((g) => (
                    <span key={g} className="chip">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {crowd.length > 0 && (
            <div className="card stack">
              <h3>Ils y jouent</h3>
              <div className="stack" style={{ gap: 8 }}>
                {crowd.map((p) => (
                  <Link key={p.user_id} to={`/u/${p.profiles?.username ?? ''}`} className="row" style={{ flexWrap: 'nowrap' }}>
                    <Avatar value={p.profiles?.avatar} />
                    <span style={{ flex: 1, fontWeight: 600 }}>{p.profiles?.username}</span>
                    {p.achievements_total > 0 && (
                      <span className="faint small">{Math.round((p.achievements_unlocked / p.achievements_total) * 100)} %</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

/** Formulaire « Ma note » : un avis noté par joueur et par jeu, modifiable. */
function ReviewForm({ gameId, onSaved }: { gameId: string; onSaved: () => void }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [existing, setExisting] = useState<Post | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    myReview(userId, gameId)
      .then((r) => {
        setExisting(r);
        if (r) {
          setRating(r.rating ?? 0);
          setBody(r.body);
        }
      })
      .catch(() => setExisting(null));
  }, [userId, gameId]);

  if (!userId) {
    return (
      <div className="card row spread">
        <span className="muted">Connecte-toi pour noter ce jeu et donner ton avis.</span>
        <Link to="/connexion" className="btn small">
          Connexion
        </Link>
      </div>
    );
  }
  if (existing === undefined) return null;

  if (existing && !editing) {
    return (
      <div className="card row spread">
        <div className="row">
          <Score value={existing.rating} />
          <span>Ta note</span>
        </div>
        <div className="row">
          <button className="btn secondary small" onClick={() => setEditing(true)}>
            Modifier
          </button>
          <button
            className="btn ghost small"
            onClick={async () => {
              if (!confirm('Supprimer ton avis ?')) return;
              await deletePost(existing.id);
              setExisting(null);
              setRating(0);
              setBody('');
              onSaved();
            }}>
            Supprimer
          </button>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setMessage('Choisis une note de 1 à 10.');
    setBusy(true);
    setMessage('');
    try {
      await saveReview(userId, gameId, rating, body.trim());
      setExisting(await myReview(userId, gameId));
      setEditing(false);
      onSaved();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h3>{existing ? 'Modifier ton avis' : 'Ta note'}</h3>
      <RatingInput value={rating} onChange={setRating} />
      <textarea
        className="textarea"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Qu’en as-tu pensé ? (optionnel) Gameplay, histoire, durée de vie…"
        maxLength={4000}
      />
      {message && <p className="error">{message}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>
          {existing ? 'Enregistrer' : 'Publier mon avis'}
        </button>
        {existing && (
          <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

function DiscussionForm({ gameId, onPosted }: { gameId: string; onPosted: () => void }) {
  const { session } = useAuth();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  if (!session) return null;
  return (
    <form
      className="card stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        try {
          await createPost({ game_id: gameId, kind: 'discussion', body: body.trim() });
          setBody('');
          onPosted();
        } finally {
          setBusy(false);
        }
      }}>
      <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Une astuce, une question, un débat sur ce jeu ?" maxLength={4000} />
      <div>
        <button className="btn small" disabled={busy || !body.trim()}>
          Publier
        </button>
      </div>
    </form>
  );
}
