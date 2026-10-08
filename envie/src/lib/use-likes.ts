import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './auth';
import { likedSet, setLike, type Review } from './db';

/** Likes des avis affichés, mis à jour immédiatement à l'écran. */
export function useLikes(reviews: Review[], setReviews: (fn: (r: Review[]) => Review[]) => void) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const ids = reviews.map((r) => r.id).join(',');

  useEffect(() => {
    let alive = true;
    likedSet(userId, ids ? ids.split(',') : [])
      .then((s) => alive && setLiked(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId, ids]);

  const toggle = useCallback(
    (id: string) => {
      if (!userId) {
        router.push('/connexion');
        return;
      }
      const on = !liked.has(id);
      setLiked((prev) => {
        const next = new Set(prev);
        if (on) next.add(id);
        else next.delete(id);
        return next;
      });
      setReviews((list) => list.map((r) => (r.id === id ? { ...r, likes: Math.max(0, r.likes + (on ? 1 : -1)) } : r)));
      setLike(id, on).catch(() => {
        // Échec : on annule.
        setLiked((prev) => {
          const next = new Set(prev);
          if (on) next.delete(id);
          else next.add(id);
          return next;
        });
        setReviews((list) => list.map((r) => (r.id === id ? { ...r, likes: Math.max(0, r.likes + (on ? -1 : 1)) } : r)));
      });
    },
    [userId, liked, setReviews],
  );

  return { liked, toggle };
}
