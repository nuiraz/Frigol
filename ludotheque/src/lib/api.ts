import { supabase } from './supabase';

/** Appelle la fonction serveur « api » (Steam, PlayStation, Xbox). */
export async function callApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('api', { body: { action, ...payload } });
  if (error) {
    // Message d'erreur renvoyé par la fonction, si disponible.
    const ctx = (error as { context?: Response }).context;
    const detail = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error ?? 'Le serveur ne répond pas. Réessaie dans un instant.');
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
