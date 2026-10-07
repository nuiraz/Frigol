import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Footer } from '@/components/layout';
import { PostCard } from '@/components/post-card';
import { Cover, Empty, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { listPosts, topRated, type Game, type Post, type Rating } from '@/lib/db';
import { useLikes } from '@/lib/use-likes';

type Filter = 'recent' | 'popular' | 'review' | 'discussion';

export default function Hub() {
  const { session } = useAuth();
  const [filter, setFilter] = useState<Filter>('recent');
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState('');
  const [top, setTop] = useState<{ game: Game; rating: Rating }[]>([]);
  const { liked, toggle } = useLikes(posts, (fn) => setPosts((p) => (p ? fn(p) : p)));

  useEffect(() => {
    let cancelled = false;
    const opts =
      filter === 'popular' ? { order: 'popular' as const } : filter === 'recent' ? {} : { kind: filter as Post['kind'] };
    listPosts(opts)
      .then((p) => !cancelled && (setPosts(p), setError('')))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  useEffect(() => {
    topRated(1, 8).then(setTop).catch(() => {});
  }, []);

  return (
    <main className="page">
      <section className="stack" style={{ gap: 8 }}>
        <h1>Le hub des joueurs</h1>
        <p className="muted">Notes, avis et discussions sur tous les jeux Steam, PlayStation et Xbox.</p>
      </section>

      <div className="grid-main">
        <div className="stack">
          <div className="row spread">
            <div className="tabs" role="tablist">
              {(
                [
                  ['recent', 'Récents'],
                  ['popular', 'Populaires'],
                  ['review', 'Avis'],
                  ['discussion', 'Discussions'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)} role="tab" aria-selected={filter === id}>
                  {label}
                </button>
              ))}
            </div>
            <Link to="/jeux" className="btn small">
              Noter un jeu
            </Link>
          </div>

          {error ? (
            <Empty title="Impossible de charger le hub" hint={error} />
          ) : !posts ? (
            <Spinner />
          ) : posts.length === 0 ? (
            <Empty title="Rien pour l’instant" hint="Sois le premier : cherche un jeu et donne ta note !">
              <Link to="/jeux" className="btn">
                Trouver un jeu
              </Link>
            </Empty>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} liked={liked.has(p.id)} onLike={() => toggle(p)} />)
          )}
        </div>

        <aside className="stack">
          {!session && (
            <div className="card stack">
              <h3>Rejoins la communauté</h3>
              <p className="muted small">
                Connecte tes comptes Steam, PlayStation et Xbox pour retrouver tous tes jeux et succès, puis note et discute.
              </p>
              <Link to="/inscription" className="btn block">
                Créer un compte gratuit
              </Link>
            </div>
          )}
          <div className="card stack">
            <h3>Les mieux notés</h3>
            {top.length === 0 ? (
              <p className="muted small">Aucune note pour l’instant.</p>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {top.map(({ game, rating }, i) => (
                  <Link key={game.id} to={`/jeu/${encodeURIComponent(game.id)}`} className="row" style={{ flexWrap: 'nowrap' }}>
                    <span className="faint" style={{ width: 16, fontFamily: 'var(--display)' }}>
                      {i + 1}
                    </span>
                    <div style={{ width: 40, flexShrink: 0 }}>
                      <Cover game={game} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.name}</div>
                      <div className="faint small">
                        {rating.reviews} avis
                      </div>
                    </div>
                    <strong style={{ fontFamily: 'var(--display)' }}>{String(rating.average).replace('.', ',')}</strong>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Footer />
        </aside>
      </div>
    </main>
  );
}
