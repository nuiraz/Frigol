import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { APP_URL } from './config';
import { supabase } from './supabase';

export type Profile = { id: string; username: string; avatar: string; bio: string; is_admin: boolean; created_at: string };

type Auth = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  recovering: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, 'username' | 'avatar' | 'bio'>>) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
  'Email not confirmed': 'Confirme d’abord ton adresse e-mail (lien reçu par e-mail).',
  'User already registered': 'Un compte existe déjà avec cet e-mail.',
};

export function authError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  if (MESSAGES[message]) return new Error(MESSAGES[message]);
  if (/password.*(at least|characters)/i.test(message)) return new Error('Le mot de passe doit faire au moins 8 caractères.');
  if (/rate limit/i.test(message)) return new Error('Trop de tentatives, réessaie dans quelques minutes.');
  if (/duplicate key.*username/i.test(message)) return new Error('Ce pseudo est déjà pris.');
  return new Error(message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recovering, setRecovering] = useState(false);

  const loadProfile = useCallback(async (userId?: string) => {
    if (!userId) return setProfile(null);
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session?.user.id).finally(() => setReady(true));
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      loadProfile(next?.user.id);
    });
    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo<Auth>(
    () => ({
      ready,
      session,
      profile,
      recovering,
      signUp: async (email, password, username) => {
        const { data: free, error: checkError } = await supabase.rpc('username_available', { p_username: username });
        if (checkError) throw authError(checkError);
        if (!free) throw new Error('Ce pseudo est déjà pris.');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username }, emailRedirectTo: APP_URL },
        });
        if (error) throw authError(error);
        return { needsConfirmation: !data.session };
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw authError(error);
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: APP_URL });
        if (error) throw authError(error);
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw authError(error);
        setRecovering(false);
      },
      updateProfile: async (patch) => {
        if (!session) return;
        const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
        if (error) throw authError(error);
        await loadProfile(session.user.id);
      },
      deleteAccount: async () => {
        const { error } = await supabase.rpc('delete_my_account');
        if (error) throw authError(error);
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [ready, session, profile, recovering, loadProfile],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const a = use(AuthContext);
  if (!a) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return a;
}
