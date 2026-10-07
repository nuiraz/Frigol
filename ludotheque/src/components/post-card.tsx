import { Link } from 'react-router-dom';

import type { Post } from '@/lib/db';
import { timeAgo } from '@/lib/format';

import { Icon } from './icons';
import { Avatar, PlatformBadge, Score } from './ui';

const KIND: Record<Post['kind'], string> = { review: 'a noté', discussion: 'a lancé une discussion sur', achievement: 'a débloqué un succès dans' };

export function PostCard({ post, liked, onLike, hideGame }: { post: Post; liked: boolean; onLike: () => void; hideGame?: boolean }) {
  const author = post.profiles;
  const game = post.games;
  return (
    <article className="card post">
      <div className="post-head">
        <Link to={`/u/${author?.username ?? ''}`}>
          <Avatar value={author?.avatar} />
        </Link>
        <div className="who">
          <div>
            <Link to={`/u/${author?.username ?? ''}`} className="name">
              {author?.username ?? 'Membre'}
            </Link>
            {author?.is_admin && <span className="badge-admin">ADMIN</span>}
            <span className="muted"> {KIND[post.kind]}</span>
          </div>
          <div className="faint small">
            {timeAgo(post.created_at)}
            {post.updated_at !== post.created_at && post.kind === 'review' ? ' · modifié' : ''}
          </div>
        </div>
        {post.kind === 'review' && <Score value={post.rating} />}
      </div>

      {!hideGame && game && (
        <Link to={`/jeu/${encodeURIComponent(game.id)}`} className="post-game">
          {game.cover_url && <img src={game.cover_url} alt="" loading="lazy" />}
          <div className="stack" style={{ gap: 4 }}>
            <strong>{game.name}</strong>
            <PlatformBadge platform={game.platform} />
          </div>
        </Link>
      )}

      {post.kind === 'achievement' && post.achievement && (
        <div className="achievement" style={{ background: 'var(--surface-2)' }}>
          {post.achievement.icon ? <img src={post.achievement.icon} alt="" /> : <span className="ach-icon" />}
          <div>
            <strong>{post.achievement.name}</strong>
            <p className="muted small">{post.achievement.description}</p>
          </div>
        </div>
      )}

      {!!post.body && <p className="post-body">{post.body}</p>}

      <div className="post-actions">
        <button onClick={onLike} className={liked ? 'liked' : ''} aria-pressed={liked}>
          <Icon name="heart" /> {post.likes_count}
        </button>
        <Link to={`/post/${post.id}`}>
          <Icon name="message" /> {post.comments_count} commentaire{post.comments_count > 1 ? 's' : ''}
        </Link>
      </div>
    </article>
  );
}
