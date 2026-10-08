import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColumns } from '@/components/grid';
import { MediaTile, Poster as MediaPoster } from '@/components/media';
import { PremiumLock } from '@/components/premium';
import { TypeTabs } from '@/components/type-tabs';
import { Button, Card, Chip, Empty, Icon, Input, Row, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCatalog } from '@/lib/catalog';
import { createCollection, getScores, myCollections, myRatings, type Collection } from '@/lib/db';
import { normalize } from '@/lib/text';
import { useLists, type Status } from '@/lib/lists';
import { GENRES, TYPE, TYPES } from '@/lib/taxonomy';
import { colors, fonts, radius } from '@/lib/theme';
import type { Item, MediaType } from '@/lib/types';

type Tab = Status | 'collections';
type Sort = 'recent' | 'mine' | 'community' | 'title' | 'year';

const SORTS: { id: Sort; label: string; icon: string }[] = [
  { id: 'recent', label: 'Ajout récent', icon: '🕒' },
  { id: 'mine', label: 'Ma note', icon: '★' },
  { id: 'community', label: 'Note communauté', icon: '👥' },
  { id: 'title', label: 'Titre A→Z', icon: '🔤' },
  { id: 'year', label: 'Année', icon: '📅' },
];

const EMOJIS = ['📁', '🍿', '🎃', '💘', '👯', '🔥', '🏆', '🎮', '🎧', '📺', '🌙', '☕'];

export default function MyList() {
  const { session, premium } = useAuth();
  const { byId } = useCatalog();
  const { saved } = useLists();
  const userId = session?.user.id;
  const { tile } = useColumns();
  const [tab, setTab] = useState<Tab>('todo');
  const [type, setType] = useState<MediaType | null>(null);
  const [sort, setSort] = useState<Sort>('recent');
  const [genre, setGenre] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState<Map<string, number>>(new Map());
  const [community, setCommunity] = useState<Map<string, number>>(new Map());
  const [collections, setCollections] = useState<Collection[]>([]);

  const ids = [...saved.keys()].join(',');
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        myRatings(userId).then(setMine).catch(() => {});
        myCollections(userId).then(setCollections).catch(() => {});
      }
      getScores(ids ? ids.split(',') : [])
        .then((m) => setCommunity(new Map([...m].map(([k, v]) => [k, v.average]))))
        .catch(() => {});
    }, [userId, ids]),
  );

  const all = useMemo(
    () =>
      [...saved]
        .map(([id, status], index) => ({ item: byId.get(id), status, index }))
        .filter((x): x is { item: Item; status: Status; index: number } => !!x.item),
    [saved, byId],
  );

  const status = tab === 'collections' ? null : tab;
  const counts = Object.fromEntries([
    ['all', all.filter((x) => x.status === status).length],
    ...TYPES.map((t) => [t.id, all.filter((x) => x.status === status && x.item.type === t.id).length]),
  ]);
  const count = (s: Status) => all.filter((x) => x.status === s && (!type || x.item.type === type)).length;

  const shown = useMemo(() => {
    const q = normalize(query);
    const list = all.filter(
      (x) =>
        x.status === status &&
        (!type || x.item.type === type) &&
        (!genre || x.item.genres.includes(genre)) &&
        (!q || normalize(`${x.item.title} ${x.item.creator}`).includes(q)),
    );
    const byScore = (m: Map<string, number>) => (a: (typeof list)[number], b: (typeof list)[number]) =>
      (m.get(b.item.id) ?? -1) - (m.get(a.item.id) ?? -1) || a.index - b.index;
    const sorters: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      recent: (a, b) => a.index - b.index,
      mine: byScore(mine),
      community: byScore(community),
      title: (a, b) => a.item.title.localeCompare(b.item.title, 'fr'),
      year: (a, b) => (b.item.year || 0) - (a.item.year || 0),
    };
    return [...list].sort(sorters[sort]).map((x) => x.item);
  }, [all, status, type, genre, query, sort, mine, community]);

  const genres = type ? GENRES.filter((g) => g.types.includes(type) && all.some((x) => x.item.type === type && x.item.genres.includes(g.id))) : [];

  async function exportList() {
    if (!premium) return router.push('/premium');
    const lines = TYPES.flatMap((t) => {
      const list = shown.filter((i) => i.type === t.id);
      if (!list.length) return [];
      return [`${t.emoji} ${t.plural}`, ...list.map((i) => `• ${i.title} (${i.year || '?'})${mine.has(i.id) ? ` — ma note : ${mine.get(i.id)}/10` : ''}`), ''];
    });
    const message = `Ma liste Envie — ${status === 'todo' ? 'À faire' : 'Déjà fait'}\n\n${lines.join('\n')}`;
    if (Platform.OS === 'web') {
      await navigator.clipboard?.writeText(message).catch(() => {});
      window.alert('Ta liste a été copiée : colle-la où tu veux !');
    } else {
      await Share.share({ message });
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={text.title}>Ma liste</Text>
            <Text style={text.muted}>{session ? 'Synchronisée sur tous tes appareils.' : 'Sur cet appareil. Connecte-toi pour la retrouver partout.'}</Text>
          </View>
          <Pressable onPress={() => router.push(premium ? '/bilan' : '/premium')} style={styles.headerBtn} accessibilityLabel="Mon bilan">
            <Icon name="bar-chart-2" size={18} />
          </Pressable>
          <Pressable onPress={exportList} style={styles.headerBtn} accessibilityLabel="Exporter ma liste">
            <Icon name="share" size={18} />
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {(
            [
              ['todo', `À faire (${count('todo')})`],
              ['done', `${type ? TYPE[type].done : 'Déjà fait'} (${count('done')})`],
              ['collections', `Collections${collections.length ? ` (${collections.length})` : ''}`],
            ] as const
          ).map(([k, label]) => (
            <Text key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
              {label}
            </Text>
          ))}
        </View>

        {tab === 'collections' ? (
          <Collections collections={collections} onCreated={() => userId && myCollections(userId).then(setCollections)} />
        ) : (
          <>
            <TypeTabs value={type} onChange={(t) => (setType(t), setGenre(null))} counts={counts} />
            <Input value={query} onChangeText={setQuery} placeholder="Chercher dans ma liste…" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {SORTS.map((s) => (
                <Chip key={s.id} label={s.label} leading={s.icon} selected={sort === s.id} onPress={() => setSort(s.id)} color="#60A5FA" />
              ))}
            </ScrollView>
            {genres.length > 1 && (
              <Row>
                {genres.map((g) => (
                  <Chip key={g.id} label={g.label} leading={g.emoji} selected={genre === g.id} onPress={() => setGenre(genre === g.id ? null : g.id)} />
                ))}
              </Row>
            )}

            {shown.length ? (
              type || sort !== 'recent' ? (
                <View style={styles.grid}>
                  {shown.map((item) => (
                    <View key={item.id} style={{ width: tile }}>
                      <MediaTile item={item} score={community.get(item.id)} myScore={mine.get(item.id)} />
                    </View>
                  ))}
                </View>
              ) : (
                // « Tout » trié par ajout : une rubrique par univers.
                TYPES.filter((t) => shown.some((i) => i.type === t.id)).map((t) => (
                  <View key={t.id} style={{ gap: 12 }}>
                    <Text style={[text.h2, { color: t.color }]}>
                      {t.emoji} {t.plural}
                    </Text>
                    <View style={styles.grid}>
                      {shown
                        .filter((i) => i.type === t.id)
                        .map((item) => (
                          <View key={item.id} style={{ width: tile }}>
                            <MediaTile item={item} score={community.get(item.id)} myScore={mine.get(item.id)} />
                          </View>
                        ))}
                    </View>
                  </View>
                ))
              )
            ) : (
              <View style={{ gap: 12 }}>
                <Empty
                  icon={tab === 'todo' ? 'bookmark' : 'check-circle'}
                  title={query || genre ? 'Aucun titre ne correspond' : tab === 'todo' ? 'Rien à faire pour l’instant' : 'Rien de terminé pour l’instant'}
                  hint={tab === 'todo' ? 'Ajoute les idées qui te plaisent avec le bouton « À faire ».' : 'Note un titre ou marque-le comme vu, joué ou écouté.'}
                />
                <Button label="Trouver une idée" icon="zap" onPress={() => router.push('/')} />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Collections({ collections, onCreated }: { collections: Collection[]; onCreated: () => void }) {
  const { session, premium } = useAuth();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { byId } = useCatalog();

  if (!session) {
    return (
      <Card>
        <Text style={text.strong}>Crée tes propres listes</Text>
        <Text style={text.muted}>« Films à voir avec Julie », « Jeux de l’été »… Connecte-toi pour créer tes collections et les partager.</Text>
        <Button label="Se connecter" onPress={() => router.push('/connexion')} />
      </Card>
    );
  }

  const limitReached = !premium && collections.length >= 3;

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createCollection(name, emoji);
      setName('');
      onCreated();
      router.push(`/collection/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 14 }}>
      {limitReached ? (
        <PremiumLock title="Tu as atteint 3 collections" text="Avec Premium, crée autant de collections que tu veux." />
      ) : (
        <Card>
          <Text style={text.strong}>Nouvelle collection</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && styles.emojiOn]}>
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Input value={name} onChangeText={setName} placeholder="Ex. : Films à voir avec Julie" maxLength={60} onSubmitEditing={create} />
          {error && <Text style={{ color: colors.bad, fontFamily: fonts.medium }}>{error}</Text>}
          <Button label="Créer" icon="plus" onPress={create} loading={busy} disabled={!name.trim()} />
          {!premium && <Text style={text.small}>Gratuit : jusqu’à 3 collections ({collections.length}/3). Illimité avec Premium.</Text>}
        </Card>
      )}

      {collections.map((c) => {
        const first = c.collection_items?.slice(0, 4).map((x) => byId.get(x.item_id)).filter((i): i is Item => !!i) ?? [];
        return (
          <Link key={c.id} href={`/collection/${c.id}`} asChild>
            <Pressable style={({ pressed }) => [styles.collection, pressed && { opacity: 0.85 }]}>
              <Text style={{ fontSize: 30 }}>{c.emoji}</Text>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.collectionName}>{c.name}</Text>
                <Text style={text.small}>
                  {c.collection_items?.length ?? 0} titre{(c.collection_items?.length ?? 0) > 1 ? 's' : ''} · {c.is_public ? '🌍 Publique' : '🔒 Privée'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                {first.map((i, n) => (
                  <View key={i.id} style={{ marginLeft: n ? -18 : 0, width: 34 }}>
                    <MiniPoster item={i} />
                  </View>
                ))}
              </View>
              <Icon name="chevron-right" size={18} color={colors.faint} />
            </Pressable>
          </Link>
        );
      })}
      {!collections.length && <Empty icon="folder" title="Aucune collection" hint="Crée ta première liste personnalisée ci-dessus." />}
    </View>
  );
}

function MiniPoster({ item }: { item: Item }) {
  // Petite affiche empilée (aperçu de la collection).
  return (
    <View style={{ borderRadius: 6, overflow: 'hidden', borderWidth: 2, borderColor: colors.surface }}>
      <MediaPoster item={item} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 56, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, color: colors.muted, fontSize: 13, paddingVertical: 10, borderRadius: 10, overflow: 'hidden' },
  tabOn: { backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: fonts.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  emoji: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: 'transparent' },
  emojiOn: { borderColor: colors.accent },
  collection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  collectionName: { fontFamily: fonts.bold, color: colors.text, fontSize: 16 },
});
