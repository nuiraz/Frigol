import { router } from 'expo-router';
import { useEffect } from 'react';

// Déverrouillage valable jusqu'à la fermeture de l'application.
let unlocked = false;

export const adminSession = {
  isUnlocked: () => unlocked,
  unlock: () => {
    unlocked = true;
  },
  lock: () => {
    unlocked = false;
  },
};

/** Renvoie vers l'écran de code si l'admin n'est pas déverrouillé. */
export function useAdminGuard() {
  const ok = unlocked;
  useEffect(() => {
    if (!ok) router.replace('/admin');
  }, [ok]);
  return ok;
}
