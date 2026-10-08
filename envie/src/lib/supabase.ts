import './url-polyfill';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

const web = Platform.OS === 'web';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Sur le web, supabase-js utilise localStorage par défaut.
    storage: web ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: web,
    // « implicit » : les liens reçus par e-mail marchent même s'ils sont ouverts sur un autre appareil.
    flowType: 'implicit',
  },
});

// Sur mobile, on ne rafraîchit la session que lorsque l'app est au premier plan.
if (!web) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
