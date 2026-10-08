import { StyleSheet, View, useWindowDimensions } from 'react-native';

import type { Item } from '@/lib/types';

import { MediaTile } from './media';

/** Nombre de colonnes selon la largeur d'écran (contenu limité à 760 px). */
export function useColumns() {
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 760) - 40;
  const cols = inner >= 620 ? 5 : inner >= 460 ? 4 : 3;
  return { cols, tile: (inner - (cols - 1) * 12) / cols };
}

export function Grid({ items, scores }: { items: Item[]; scores?: Map<string, number> }) {
  const { tile } = useColumns();
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.id} style={{ width: tile }}>
          <MediaTile item={item} score={scores?.get(item.id)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
