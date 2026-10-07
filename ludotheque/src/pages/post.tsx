import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Icon } from '@/components/icons';
import { PostCard } from '@/components/post-card';
import { Avatar, Empty, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { addComment, deleteComment, deletePost, getPost, listComments, reportPost, type Comment, type Post } from '@/lib/db';
import { timeAgo } from '@/lib/format';
import { useLikes } from '@/lib/use-likes';

export default function PostPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const me = session?.user.id;
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const { liked, toggle } = useLikes(post ? [post] : null, (fn) => setPost((p) => (p ? fn([p])[0] : p)));

  useEffect(() => {
    getPost(id).then(setPost).catch(() => setPost(null));
    listComments(id).then(setComments).catch(() => {});
  }, [id]);

  if (post === undefined) return <Spinner />;
  if (!post) return <main className="page narrow"><Empty title="Publication introuvable ou supprimée" /></main>;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return navigate('/connexion');
    if (!text.trim()) return;
    setBusy(true);
    try {
      await addComment(post.id, text.trim());
      setText('');
      setComments(await listComments(post.id));
      setPost({ ...post, comments_count: post.comments_count + 1 });
    } finally {
      setBusy(false);
    }
  };

  const canModerate = me === post.user_id || profile?.is_admin;

  return (
    <main className="page narrow">
      <PostCard post={post} liked={liked.has(post.id)} onLike={() => toggle(post)} />

      <section className="stack">
        <h2>Commentaires</h2>
        {comments.length === 0 && <p className="muted">Aucun commentaire. Lance la discussion !</p>}
        {comments.map((c) => (
          <div key={c.id} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <Link to={`/u/${c.profiles?.username ?? ''}`}>
              <Avatar value={c.profiles?.avatar} />
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small">
                <Link to={`/u/${c.profiles?.username ?? ''}`} style={{ fontWeight: 600 }}>
                  {c.profiles?.username ?? 'Membre'}
                </Link>
                <span className="faint"> · {timeAgo(c.created_at)}</span>
              </div>
              <p className="post-body">{c.body}</p>
            </div>
            {(c.user_id === me || profile?.is_admin) && (
              <button
                className="icon-btn"
                title="Supprimer"
                onClick={async () => {
                  await deleteComment(c.id);
                  setComments((l) => l.filter((x) => x.id !== c.id));
                }}>
                <Icon name="trash" size={15} />
              </button>
            )}
          </div>
        ))}

        <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={send}>
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={me ? 'Écrire un commentaire…' : 'Connecte-toi pour commenter'} maxLength={1000} />
          <button className="btn" disabled={busy}>
            <Icon name="send" size={16} />
          </button>
        </form>
      </section>

      <div className="row">
        {canModerate ? (
          <button
            className="btn danger small"
            onClick={async () => {
              if (!confirm('Supprimer cette publication ?')) return;
              await deletePost(post.id);
              navigate('/');
            }}>
            Supprimer la publication
          </button>
        ) : me ? (
          <button
            className="btn ghost small"
            onClick={async () => {
              const reason = prompt('Pourquoi signaler cette publication ?');
              if (reason && reason.trim().length >= 2) {
                await reportPost(post.id, reason.trim());
                alert('Merci, la modération va examiner ce signalement.');
              }
            }}>
            <Icon name="flag" size={15} /> Signaler
          </button>
        ) : null}
      </div>
    </main>
  );
}
