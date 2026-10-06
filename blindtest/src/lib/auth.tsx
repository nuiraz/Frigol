import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ONLINE_ENABLED } from './config';
import { getSupabase } from './supabase';
import { WEB_APP_URL } from './theme';

export type Profile = { id: string; username: string; avatar: string; created_at: string };

type Auth = {
  enabled: boolean;
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Vrai quand l'utilisateur arrive depuis le lien « mot de passe oublié ». */
  recovering: boolean;
  signUp: (
    email: string,
    password: string,
    username: string,
    avatar: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, 'username' | 'avatar'>>) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
  'Email not confirmed': 'Confirme d’abord ton adresse e-mail (lien reçu par e-mail).',
  'User already registered': 'Un compte existe déjà avec cet e-mail.',
};

/** Traduit les erreurs Supabase en messages compréhensibles. */
export function authError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  if (MESSAGES[message]) return new Error(MESSAGES[message]);
  if (/password.*(at least|characters)/i.test(message))
    return new Error('Le mot de passe doit faire au moins 6 caractères.');
  if (/rate limit/i.test(message)) return new Error('Trop de tentatives, réessaie dans quelques minutes.');
  if (/duplicate key.*username/i.test(message)) return new Error('Ce pseudo est déjà pris.');
  return new Error(message);
}

function required() {
  const sb = getSupabase();
  if (!sb) throw new Error('Le service en ligne n’est pas configuré.');
  return sb;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!ONLINE_ENABLED);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recovering, setRecovering] = useState(false);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    const sb = getSupabase();
    if (!sb || !userId) return setProfile(null);
    const { data } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session?.user.id).finally(() => setReady(true));
    });
    const { data } = sb.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      loadProfile(next?.user.id);
    });
    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo<Auth>(
    () => ({
      enabled: ONLINE_ENABLED,
      ready,
      session,
      profile,
      recovering,
      signUp: async (email, password, username, avatar) => {
        const sb = required();
        const { data: free, error: checkError } = await sb.rpc('username_available', { p_username: username });
        if (checkError) throw authError(checkError);
        if (!free) throw new Error('Ce pseudo est déjà pris.');
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { username, avatar }, emailRedirectTo: `${WEB_APP_URL}account` },
        });
        if (error) throw authError(error);
        return { needsConfirmation: !data.session };
      },
      signIn: async (email, password) => {
        const { error } = await required().auth.signInWithPassword({ email, password });
        if (error) throw authError(error);
      },
      signOut: async () => {
        await required().auth.signOut();
        setProfile(null);
      },
      resetPassword: async (email) => {
        const { error } = await required().auth.resetPasswordForEmail(email, { redirectTo: `${WEB_APP_URL}account` });
        if (error) throw authError(error);
      },
      updatePassword: async (password) => {
        const { error } = await required().auth.updateUser({ password });
        if (error) throw authError(error);
        setRecovering(false);
      },
      updateProfile: async (patch) => {
        if (!session) return;
        const { error } = await required().from('profiles').update(patch).eq('id', session.user.id);
        if (error) throw authError(error);
        await loadProfile(session.user.id);
      },
      deleteAccount: async () => {
        const sb = required();
        const { error } = await sb.rpc('delete_my_account');
        if (error) throw authError(error);
        await sb.auth.signOut();
        setProfile(null);
      },
    }),
    [ready, session, profile, recovering, loadProfile],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return auth;
}
