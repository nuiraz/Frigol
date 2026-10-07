import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Icon } from '@/components/icons';
import { PostCard } from '@/components/post-card';
import { Avatar, Empty, GameTile, PlatformBadge, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { library, linkedAccounts, listPosts, profileByUsername, type LibraryEntry, type LinkedAccount, type Post } from '@/lib/db';
import { playtime } from '@/lib/format';
import { useLikes } from '@/lib/use-likes';

export default function ProfilePage() {
  const { username = '' } = useParams();
  const { session } = useAuth();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof profileByUsername>> | undefined>(undefined);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [games, setGames] = useState<LibraryEntry[]>([]);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [tab, setTab] = useState<'activity' | 'games'>('activity');
  const { liked, toggle } = useLikes(posts, (fn) => setPosts((p) => (p ? fn(p) : p)));

  useEffect(() => {
    let cancelled = false;
    profileByUsername(username)
      .then(async (p) => {
        if (cancelled) return;
        setProfile(p);
        if (!p) return;
        const [a, g, ps] = await Promise.all([linkedAccounts(p.id), library(p.id), listPosts({ userId: p.id, limit: 40 })]);
        if (!cancelled) {
          setAccounts(a);
          setGames(g);
          setPosts(ps);
        }
      })
      .catch(() => !cancelled && setProfile(null));
    return () => {
      cancelled = true;
    };
  }, [username]);

  const stats = useMemo(
    () => ({
      games: games.length,
      achievements: games.reduce((n, g) => n + g.achievements_unlocked, 0),
      platinum: games.filter((g) => g.platinum).length,
      hours: Math.round(games.reduce((n, g) => n + g.playtime_minutes, 0) / 60),
      reviews: posts?.filter((p) => p.kind === 'review').length ?? 0,
    }),
    [games, posts],
  );

  if (profile === undefined) return <Spinner />;
  if (!profile) return <main className="page"><Empty title="Joueur introuvable" /></main>;
  const isMe = session?.user.id === profile.id;

  return (
    <main className="page">
      <section className="card row" style={{ gap: 18, alignItems: 'center' }}>
        <Avatar value={profile.avatar} size="lg" />
        <div className="stack" style={{ gap: 6, flex: 1, minWidth: 200 }}>
          <h1>
            {profile.username}
            {profile.is_admin && <span className="badge-admin">ADMIN</span>}
          </h1>
          {profile.bio && <p className="muted">{profile.bio}</p>}
          <div className="row">
            {accounts.map((a) => (
              <a key={a.platform} href={a.profile_url ?? '#'} target="_blank" rel="noreferrer" className="chip">
                <PlatformBadge platform={a.platform} /> {a.display_name}
              </a>
            ))}
            {accounts.length === 0 && <span className="faint small">Aucun compte de jeu lié</span>}
          </div>
        </div>
        {isMe && (
          <div className="row">
            <Link to="/comptes" className="btn secondary small">
              <Icon name="link" size={15} /> Mes comptes
            </Link>
            <Link to="/compte" className="btn secondary small">
              <Icon name="edit" size={15} /> Modifier
            </Link>
          </div>
        )}
      </section>

      <section className="row" style={{ gap: 28 }}>
        <div className="stat"><strong>{stats.games}</strong><span>jeux</span></div>
        <div className="stat"><strong>{stats.achievements.toLocaleString('fr-FR')}</strong><span>succès & trophées</span></div>
        <div className="stat"><strong>{stats.platinum}</strong><span>platines</span></div>
        <div className="stat"><strong>{stats.hours.toLocaleString('fr-FR')} h</strong><span>de jeu (Steam)</span></div>
        <div className="stat"><strong>{stats.reviews}</strong><span>avis</span></div>
      </section>

      <div className="tabs" style={{ alignSelf: 'flex-start' }}>
        <button className={tab === 'activity' ? 'on' : ''} onClick={() => setTab('activity')}>
          Activité
        </button>
        <button className={tab === 'games' ? 'on' : ''} onClick={() => setTab('games')}>
          Jeux ({games.length})
        </button>
      </div>

      {tab === 'activity' ? (
        !posts ? (
          <Spinner />
        ) : posts.length === 0 ? (
          <Empty title="Aucune activité" hint={isMe ? 'Note ton premier jeu pour apparaître dans le hub.' : undefined} />
        ) : (
          <div className="stack" style={{ maxWidth: 680 }}>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} liked={liked.has(p.id)} onLike={() => toggle(p)} />
            ))}
          </div>
        )
      ) : games.length === 0 ? (
        <Empty title="Aucun jeu synchronisé" />
      ) : (
        <div className="games-grid">
          {games.filter((g) => g.games).map((g) => (
            <GameTile key={g.game_id} game={g.games!}>
              <span className="faint small">
                {g.achievements_total ? `${g.achievements_unlocked}/${g.achievements_total}` : playtime(g.playtime_minutes)}
              </span>
            </GameTile>
          ))}
        </div>
      )}
    </main>
  );
}
