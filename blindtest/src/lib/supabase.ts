import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { ONLINE_ENABLED, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | null = null;

/** Client Supabase, créé à la demande (jamais pendant le rendu statique du site web). */
export function getSupabase(): SupabaseClient | null {
  if (!ONLINE_ENABLED) return null;
  if (Platform.OS === 'web' && typeof window === 'undefined') return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Sur le web, récupère la session des liens reçus par e-mail (confirmation, mot de passe oublié).
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
  return client;
}
