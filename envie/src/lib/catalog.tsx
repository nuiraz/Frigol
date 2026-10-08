import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { BUILTIN } from '@/data/catalog';

import { fetchAddedItems } from './db';
import type { Item } from './types';

type Catalog = { items: Item[]; byId: Map<string, Item>; refresh: () => Promise<void> };

const CatalogContext = createContext<Catalog | null>(null);

/** Catalogue intégré + titres ajoutés par l'admin (chargés depuis Supabase). */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [added, setAdded] = useState<Item[]>([]);

  const refresh = useCallback(async () => {
    try {
      setAdded(await fetchAddedItems());
    } catch {
      // Hors ligne ou base pas encore configurée : le catalogue intégré suffit.
    }
  }, []);

  useEffect(() => {
    // Chargement asynchrone : l'état n'est modifié qu'à l'arrivée des données.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const value = useMemo(() => {
    const items = [...added, ...BUILTIN];
    return { items, byId: new Map(items.map((i) => [i.id, i])), refresh };
  }, [added, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog doit être utilisé dans <CatalogProvider>');
  return ctx;
}
