import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { WEB_URL } from './config';
import { supabase } from './supabase';

export type Profile = { id: string; username: string; avatar: string; bio: string; is_admin: boolean; created_at: string };

type Auth = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Vrai quand on arrive depuis le lien « mot de passe oublié ». */
  recovering: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (changes: Partial<Pick<Profile, 'username' | 'avatar' | 'bio'>>) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export const USERNAME_RE = /^[A-Za-z0-9_.-]{3,20}$/;

/** Traduit les erreurs Supabase en messages compréhensibles. */
export function authError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return 'Confirme d’abord ton adresse e-mail grâce au lien reçu.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Un compte existe déjà avec cet e-mail.';
  if (m.includes('password should be at least')) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Réessaie dans quelques minutes.';
  if (m.includes('unable to validate email') || m.includes('invalid format')) return 'Adresse e-mail invalide.';
  if (m.includes('profiles_username_lower') || m.includes('duplicate key')) return 'Ce pseudo est déjà pris.';
  if (m.includes('failed to fetch') || m.includes('network request failed')) return 'Pas de connexion au serveur. Vérifie ta connexion internet.';
  if (m.includes('same_password') || m.includes('different from the old')) return 'Choisis un mot de passe différent de l’ancien.';
  return msg || 'Une erreur est survenue.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recovering, setRecovering] = useState(false);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) return setProfile(null);
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        return loadProfile(data.session?.user.id);
      })
      .finally(() => setReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      // On ne fait pas d'appel Supabase directement dans ce rappel (recommandation supabase-js).
      setTimeout(() => loadProfile(s?.user.id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo<Auth>(
    () => ({
      ready,
      session,
      profile,
      recovering,
      async signUp(email, password, username) {
        const name = username.trim();
        if (!USERNAME_RE.test(name)) throw new Error('Pseudo : 3 à 20 caractères (lettres, chiffres, . _ -).');
        const { data: free, error: e1 } = await supabase.rpc('username_available', { p_username: name });
        if (e1) throw new Error(authError(e1));
        if (!free) throw new Error('Ce pseudo est déjà pris.');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: name }, emailRedirectTo: WEB_URL },
        });
        if (error) throw new Error(authError(error));
        return { needsConfirmation: !data.session };
      },
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(authError(error));
      },
      async signOut() {
        await supabase.auth.signOut();
        setProfile(null);
      },
      async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${WEB_URL}nouveau-mot-de-passe`,
        });
        if (error) throw new Error(authError(error));
      },
      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(authError(error));
        setRecovering(false);
      },
      async updateProfile(changes) {
        if (!session) throw new Error('Connecte-toi d’abord.');
        if (changes.username !== undefined) {
          changes.username = changes.username.trim();
          if (!USERNAME_RE.test(changes.username)) throw new Error('Pseudo : 3 à 20 caractères (lettres, chiffres, . _ -).');
        }
        const { error } = await supabase.from('profiles').update(changes).eq('id', session.user.id);
        if (error) throw new Error(authError(error));
        await loadProfile(session.user.id);
      },
      async deleteAccount() {
        const { error } = await supabase.rpc('delete_my_account');
        if (error) throw new Error(authError(error));
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [ready, session, profile, recovering, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
