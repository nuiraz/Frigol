import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { useColumns } from '@/components/grid';
import { Avatar, MediaTile } from '@/components/media';
import { Button, Empty, Icon, Input, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCatalog } from '@/lib/catalog';
import { WEB_URL } from '@/lib/config';
import { confirm } from '@/lib/confirm';
import { deleteCollection, getCollection, setInCollection, updateCollection, type Collection } from '@/lib/db';
import { colors, fonts } from '@/lib/theme';
import type { Item } from '@/lib/types';

export default function CollectionPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { byId } = useCatalog();
  const { tile } = useColumns();
  const [collection, setCollection] = useState<Collection | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const c = await getCollection(id);
      setCollection(c);
      setName(c?.name ?? '');
    } catch {
      setCollection(null);
    }
  }, [id]);

  useEffect(() => {
    // Chargement asynchrone : l'état n'est modifié qu'à l'arrivée des données.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (collection === undefined) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;
  if (!collection) return <Empty icon="folder" title="Collection introuvable" hint="Elle est peut-être privée ou a été supprimée." />;

  const mine = session?.user.id === collection.user_id;
  const items = (collection.collection_items ?? [])
    .sort((a, b) => b.added_at.localeCompare(a.added_at))
    .map((x) => byId.get(x.item_id))
    .filter((i): i is Item => !!i);

  async function share() {
    const url = `${WEB_URL}collection/${collection!.id}`;
    if (!collection!.is_public) {
      await updateCollection(collection!.id, { is_public: true });
      await load();
    }
    if (Platform.OS === 'web') {
      await navigator.clipboard?.writeText(url).catch(() => {});
      setMsg('Lien copié ! La collection est maintenant publique.');
    } else {
      await Share.share({ message: `${collection!.emoji} ${collection!.name} — ma collection sur Envie : ${url}` });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: collection.name }} />
      <View style={styles.head}>
        <Text style={{ fontSize: 48 }}>{collection.emoji}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          {editing ? (
            <Input value={name} onChangeText={setName} maxLength={60} autoFocus />
          ) : (
            <Text style={text.title}>{collection.name}</Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Avatar value={collection.profiles?.avatar} size={22} />
            <Text style={text.small}>
              {collection.profiles?.username} · {items.length} titre{items.length > 1 ? 's' : ''} · {collection.is_public ? '🌍 Publique' : '🔒 Privée'}
            </Text>
          </View>
        </View>
      </View>

      {mine && (
        <View style={styles.actions}>
          {editing ? (
            <Button
              label="Enregistrer"
              small
              onPress={async () => {
                await updateCollection(collection.id, { name: name.trim() || collection.name }).catch(() => {});
                setEditing(false);
                load();
              }}
            />
          ) : (
            <Button label="Renommer" icon="edit-2" small variant="secondary" onPress={() => setEditing(true)} />
          )}
          <Button
            label={collection.is_public ? 'Rendre privée' : 'Rendre publique'}
            icon={collection.is_public ? 'lock' : 'globe'}
            small
            variant="secondary"
            onPress={async () => (await updateCollection(collection.id, { is_public: !collection.is_public }).catch(() => {}), load())}
          />
          <Button label="Partager" icon="share-2" small variant="secondary" onPress={share} />
          <Button
            label=""
            icon="trash-2"
            small
            variant="secondary"
            onPress={() =>
              confirm('Supprimer cette collection ?', 'Les titres restent dans le catalogue.', async () => {
                await deleteCollection(collection.id).catch(() => {});
                router.back();
              })
            }
          />
        </View>
      )}
      {msg && <Text style={styles.msg}>{msg}</Text>}

      {items.length ? (
        <View style={styles.grid}>
          {items.map((item) => (
            <View key={item.id} style={{ width: tile }}>
              <MediaTile item={item} />
              {mine && (
                <Pressable
                  style={styles.remove}
                  hitSlop={6}
                  accessibilityLabel={`Retirer ${item.title}`}
                  onPress={async () => (await setInCollection(collection.id, item.id, false).catch(() => {}), load())}>
                  <Icon name="x" size={14} color="#fff" />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Empty icon="plus-circle" title="Collection vide" hint={mine ? 'Ajoute des titres depuis leur fiche, bouton « Collection ».' : undefined} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 56, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  msg: { fontFamily: fonts.medium, color: colors.good, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
