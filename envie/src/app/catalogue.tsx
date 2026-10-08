import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useColumns } from '@/components/grid';
import { MediaTile } from '@/components/media';
import { TypeTabs } from '@/components/type-tabs';
import { Empty, Input, text } from '@/components/ui';
import { useCatalog } from '@/lib/catalog';
import { searchItems } from '@/lib/discover';
import { TYPES } from '@/lib/taxonomy';
import { colors } from '@/lib/theme';
import type { MediaType } from '@/lib/types';

export default function Catalogue() {
  const params = useLocalSearchParams<{ q?: string; type?: MediaType }>();
  const { items } = useCatalog();
  const [query, setQuery] = useState(params.q ?? '');
  // Sans recherche, on ouvre directement sur les films : chaque univers a son rayon.
  const [type, setType] = useState<MediaType | null>(params.type ?? (params.q ? null : 'film'));
  const { cols, tile } = useColumns();

  const list = useMemo(() => {
    const order = (t: MediaType) => TYPES.findIndex((x) => x.id === t);
    // Toujours rangé par univers : films, puis séries, jeux et musique.
    const base = query.trim()
      ? searchItems(items, query, 500).sort((a, b) => order(a.type) - order(b.type))
      : [...items].sort((a, b) => order(a.type) - order(b.type) || a.title.localeCompare(b.title, 'fr'));
    return type ? base.filter((i) => i.type === type) : base;
  }, [items, query, type]);

  return (
    <FlatList
      key={cols}
      data={list}
      numColumns={cols}
      keyExtractor={(i) => i.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      columnWrapperStyle={{ gap: 12 }}
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 6 }}>
          <Input value={query} onChangeText={setQuery} placeholder="Chercher un titre, un réalisateur, un artiste…" autoFocus={!params.q} returnKeyType="search" />
          <TypeTabs value={type} onChange={setType} />
          <Text style={text.small}>{list.length} titre{list.length > 1 ? 's' : ''}</Text>
        </View>
      }
      ListEmptyComponent={<Empty icon="search" title="Aucun titre trouvé" hint="Essaie un autre mot, ou demande à l’admin de l’ajouter !" />}
      renderItem={({ item }) => (
        <View style={{ width: tile, marginBottom: 14 }}>
          <MediaTile item={item} />
        </View>
      )}
      style={{ backgroundColor: colors.bg }}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, width: '100%', maxWidth: 760, alignSelf: 'center' },
});
