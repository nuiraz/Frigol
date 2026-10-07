import { supabase } from './supabase';

/** Appelle la fonction serveur « api » (Steam, PlayStation, Xbox). */
export async function callApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('api', { body: { action, ...payload } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (!ctx || typeof ctx.json !== 'function') {
      throw new Error("Impossible de joindre la fonction serveur « api ». Vérifie qu'elle est déployée dans Supabase (Edge Functions).");
    }
    const detail = await ctx.json().catch(() => null);
    if (detail?.error) throw new Error(detail.error);
    if (ctx.status === 404) throw new Error("La fonction serveur « api » n'est pas encore déployée dans Supabase (Edge Functions).");
    if (ctx.status === 401) {
      throw new Error("La fonction « api » refuse la connexion : désactive « Verify JWT » dans ses réglages Supabase.");
    }
    throw new Error(detail?.message ?? `Erreur du serveur (${ctx.status}). Réessaie dans un instant.`);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
