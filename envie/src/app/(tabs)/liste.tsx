import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Grid } from '@/components/grid';
import { TypeTabs } from '@/components/type-tabs';
import { Button, Empty, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCatalog } from '@/lib/catalog';
import { useLists, type Status } from '@/lib/lists';
import { TYPE, TYPES } from '@/lib/taxonomy';
import { colors, fonts } from '@/lib/theme';
import type { Item, MediaType } from '@/lib/types';

export default function MyList() {
  const { session } = useAuth();
  const { byId } = useCatalog();
  const { saved } = useLists();
  const [tab, setTab] = useState<Status>('todo');
  const [type, setType] = useState<MediaType | null>(null);

  const all = [...saved].map(([id, status]) => ({ item: byId.get(id), status })).filter((x): x is { item: Item; status: Status } => !!x.item);
  const count = (s: Status) => all.filter((x) => x.status === s && (!type || x.item.type === type)).length;
  const counts = Object.fromEntries([
    ['all', all.filter((x) => x.status === tab).length],
    ...TYPES.map((t) => [t.id, all.filter((x) => x.status === tab && x.item.type === t.id).length]),
  ]);
  const shown = all.filter((x) => x.status === tab && (!type || x.item.type === type)).map((x) => x.item);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: 4 }}>
          <Text style={text.title}>Ma liste</Text>
          <Text style={text.muted}>
            {session ? 'Synchronisée avec ton compte, sur tous tes appareils.' : 'Enregistrée sur cet appareil. Connecte-toi pour la retrouver partout.'}
          </Text>
        </View>

        <TypeTabs value={type} onChange={setType} counts={counts} />

        <View style={styles.tabs}>
          {(
            [
              ['todo', 'À faire'],
              ['done', type ? TYPE[type].done : 'Déjà fait'],
            ] as const
          ).map(([k, label]) => (
            <Text key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
              {label} ({count(k)})
            </Text>
          ))}
        </View>

        {shown.length ? (
          type ? (
            <Grid items={shown} />
          ) : (
            // « Tout » : une rubrique par univers.
            TYPES.filter((t) => shown.some((i) => i.type === t.id)).map((t) => (
              <View key={t.id} style={{ gap: 12 }}>
                <Text style={[text.h2, { color: t.color }]}>
                  {t.emoji} {t.plural}
                </Text>
                <Grid items={shown.filter((i) => i.type === t.id)} />
              </View>
            ))
          )
        ) : (
          <View style={{ gap: 12 }}>
            <Empty
              icon={tab === 'todo' ? 'bookmark' : 'check-circle'}
              title={
                tab === 'todo'
                  ? `Rien ${type ? TYPE[type].verb : 'à faire'} pour l’instant`
                  : `Rien de ${type ? TYPE[type].done.toLowerCase() : 'terminé'} pour l’instant`
              }
              hint={
                tab === 'todo'
                  ? 'Ajoute les idées qui te plaisent avec le bouton « À faire ».'
                  : 'Marque un titre comme déjà vu, joué ou écouté (ou note-le) pour le retrouver ici.'
              }
            />
            <Button label="Trouver une idée" icon="zap" onPress={() => router.push('/')} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, color: colors.muted, fontSize: 14, paddingVertical: 10, borderRadius: 10, overflow: 'hidden' },
  tabOn: { backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: fonts.bold },
});
