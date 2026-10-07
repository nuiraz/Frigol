import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from './auth';
import { likedSet, setLike, type Post } from './db';

/** « J'aime » d'une liste de publications, avec mise à jour immédiate de l'affichage. */
export function useLikes(posts: Post[] | null, update: (fn: (list: Post[]) => Post[]) => void) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user.id;
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const ids = posts?.map((p) => p.id).join(',') ?? '';

  useEffect(() => {
    if (!userId || !ids) return;
    let cancelled = false;
    likedSet(userId, ids.split(','))
      .then((s) => !cancelled && setLiked(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, ids]);

  const toggle = useCallback(
    async (post: Post) => {
      if (!userId) return navigate('/connexion');
      const on = !liked.has(post.id);
      const apply = (value: boolean) => {
        setLiked((s) => {
          const n = new Set(s);
          if (value) n.add(post.id);
          else n.delete(post.id);
          return n;
        });
        update((list) => list.map((p) => (p.id === post.id ? { ...p, likes_count: Math.max(0, p.likes_count + (value ? 1 : -1)) } : p)));
      };
      apply(on);
      try {
        await setLike(post.id, userId, on);
      } catch {
        apply(!on);
      }
    },
    [liked, userId, update, navigate],
  );

  return { liked, toggle };
}
