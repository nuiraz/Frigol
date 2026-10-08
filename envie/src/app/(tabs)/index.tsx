import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { metaLine, MusicPreview, platformsLine, Poster, ScorePill, TypeBadge } from '@/components/media';
import { Button, Chip, Icon, Row, text } from '@/components/ui';
import { useArtwork } from '@/lib/artwork';
import { useCatalog } from '@/lib/catalog';
import { getScores, type Score } from '@/lib/db';
import { pickOne, searchItems, type Pick } from '@/lib/discover';
import { emptyFilters, hasFilters, parseIntent, type Filters } from '@/lib/intent';
import { useLists } from '@/lib/lists';
import { GENRES, MOODS, PLATFORMS, TYPE, TYPES } from '@/lib/taxonomy';
import { colors, fonts, radius } from '@/lib/theme';
import type { Item, MediaType } from '@/lib/types';

const EXAMPLES = [
  'un jeu PS5 d’action entre potes',
  'un film d’horreur',
  'une série policière qui fait réfléchir',
  'de la musique chill pour bosser',
  'un jeu Switch pas trop long',
  'une comédie culte',
  'du rap français',
  'un anime intense',
];

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function Discover() {
  const { items } = useCatalog();
  const { saved, setStatus, seen, markSeen } = useLists();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [pick, setPick] = useState<Pick | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [example, setExample] = useState(0);
  const [allGenres, setAllGenres] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const resultY = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setExample((e) => (e + 1) % EXAMPLES.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Un seul univers à la fois : films, séries, jeux ou musique, chacun avec ses propres filtres.
  const type = filters.types[0] ?? null;
  const universe = type ? TYPE[type] : null;
  const genres = type ? GENRES.filter((g) => g.types.includes(type)) : [];
  const moods = type ? MOODS.filter((m) => m.types.includes(type)) : [];
  // Liste courte par défaut (les genres sélectionnés restent toujours visibles).
  const GENRE_LIMIT = 10;
  const shownGenres = allGenres ? genres : genres.filter((g, i) => i < GENRE_LIMIT || filters.genres.includes(g.id));

  /** Garde seulement les filtres qui existent pour cet univers. */
  function forType(f: Filters, t: MediaType): Filters {
    return {
      types: [t],
      genres: f.genres.filter((g) => GENRES.find((x) => x.id === g)?.types.includes(t)),
      moods: f.moods.filter((m) => MOODS.find((x) => x.id === m)?.types.includes(t)),
      platforms: t === 'jeu' ? f.platforms : [],
    };
  }

  function chooseType(t: MediaType) {
    setFilters((f) => (f.types[0] === t ? f : forType(f, t)));
    setPick(null);
    setNotice(null);
    setAllGenres(false);
  }

  function roll(f: Filters = filters) {
    if (!f.types.length) {
      setPick(null);
      setNotice('Choisis d’abord un univers : film, série, jeu vidéo ou musique.');
      return;
    }
    const exclude = new Set(seen);
    for (const [id, status] of saved) if (status === 'done') exclude.add(id);
    if (pick) exclude.add(pick.item.id);
    const p = pickOne(items, f, exclude);
    setPick(p);
    setNotice(p ? null : 'Aucun titre ne correspond 🤔 Enlève un filtre ou essaie d’autres mots.');
    if (p) {
      markSeen(p.item.id);
      setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, resultY.current - 12), animated: true }), 60);
    }
  }

  function submit() {
    if (!query.trim()) return roll();
    const parsed = parseIntent(query);
    if (!hasFilters(parsed)) {
      // Pas une envie reconnue : c'est peut-être un titre (« Zelda », « Inception »…).
      if (searchItems(items, query, 1).length) router.push({ pathname: '/catalogue', params: { q: query.trim() } });
      else {
        setPick(null);
        setNotice('Je n’ai pas compris 🤔 Essaie « film d’horreur », « jeu PC entre potes », « musique chill »…');
      }
      return;
    }
    // Univers tapé (« film », « jeu »…), sinon celui déjà choisi.
    const t = parsed.types[0] ?? type;
    setQuery('');
    if (!t) {
      // « une comédie culte » : film ou série ? On garde les filtres et on demande.
      setFilters({ ...parsed, types: [] });
      setPick(null);
      setNotice('Tu veux plutôt un film, une série, un jeu ou de la musique ? Choisis un univers ci-dessus.');
      return;
    }
    const next = forType(parsed, t);
    setFilters(next);
    roll(next);
  }

  function reset() {
    setFilters(emptyFilters());
    setQuery('');
    setPick(null);
    setNotice(null);
  }

  const understood = useMemo(
    () =>
      [
        ...filters.platforms.map((p) => PLATFORMS.find((x) => x.id === p)?.label ?? p),
        ...filters.genres.map((g) => GENRES.find((x) => x.id === g)?.label ?? g),
        ...filters.moods.map((m) => MOODS.find((x) => x.id === m)?.label ?? m),
      ].join(' · '),
    [filters],
  );

  const accent = universe?.color ?? colors.accent;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Text style={styles.brand}>
            envie<Text style={{ color: colors.accent }}>.</Text>
          </Text>
          <Link href="/catalogue" asChild>
            <Pressable style={styles.searchBtn} accessibilityLabel="Chercher un titre">
              <Icon name="search" size={18} color={colors.text} />
            </Pressable>
          </Link>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={styles.hero}>Tu as envie de quoi ?</Text>
          <Text style={text.muted}>Choisis un univers, ou écris ton envie comme tu veux : on te trouve une idée.</Text>
        </View>

        <View style={styles.inputWrap}>
          <Icon name="message-circle" size={18} color={colors.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submit}
            placeholder={`Ex. : ${EXAMPLES[example]}`}
            placeholderTextColor={colors.faint}
            returnKeyType="go"
            style={styles.input}
            accessibilityLabel="Ton envie"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Effacer">
              <Icon name="x" size={18} color={colors.faint} />
            </Pressable>
          )}
        </View>

        <View style={styles.types}>
          {TYPES.map((t) => {
            const on = type === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => chooseType(t.id)}
                style={({ pressed }) => [
                  styles.typeTile,
                  on && { borderColor: t.color, backgroundColor: `${t.color}1F` },
                  type && !on && { opacity: 0.55 },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}>
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeLabel, on && { color: t.color }]}>{t.plural}</Text>
              </Pressable>
            );
          })}
        </View>

        {!universe ? (
          <View style={styles.pickType}>
            <Text style={styles.pickTypeText}>👆 Commence par choisir un univers</Text>
          </View>
        ) : (
          <View style={[styles.universe, { borderColor: `${accent}55` }]}>
            <Text style={[styles.universeTitle, { color: accent }]}>
              {universe.emoji} {universe.plural} {universe.verb}
            </Text>

            {type === 'jeu' && (
              <View style={styles.group}>
                <Text style={text.label}>Sur quelle plateforme ?</Text>
                <Row>
                  {PLATFORMS.map((p) => (
                    <Chip
                      key={p.id}
                      label={p.label}
                      leading={p.emoji}
                      color={accent}
                      selected={filters.platforms.includes(p.id)}
                      onPress={() => setFilters((f) => ({ ...f, platforms: toggle(f.platforms, p.id) }))}
                    />
                  ))}
                </Row>
              </View>
            )}

            <View style={styles.group}>
              <Text style={text.label}>{type === 'musique' ? 'Quel style ?' : 'Quel genre ?'}</Text>
              <Row>
                {shownGenres.map((g) => (
                  <Chip
                    key={g.id}
                    label={g.label}
                    leading={g.emoji}
                    color={accent}
                    selected={filters.genres.includes(g.id)}
                    onPress={() => setFilters((f) => ({ ...f, genres: toggle(f.genres, g.id) }))}
                  />
                ))}
                {genres.length > GENRE_LIMIT && (
                  <Chip
                    label={allGenres ? 'Moins' : `+ ${genres.length - shownGenres.length} genres`}
                    trailing={allGenres ? 'chevron-up' : 'chevron-down'}
                    onPress={() => setAllGenres((v) => !v)}
                  />
                )}
              </Row>
            </View>

            <View style={styles.group}>
              <Text style={text.label}>Envie du moment</Text>
              <Row>
                {moods.map((m) => (
                  <Chip
                    key={m.id}
                    label={m.label}
                    leading={m.emoji}
                    color={accent}
                    selected={filters.moods.includes(m.id)}
                    onPress={() => setFilters((f) => ({ ...f, moods: toggle(f.moods, m.id) }))}
                  />
                ))}
              </Row>
            </View>
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Pressable onPress={submit} style={({ pressed }) => [styles.hop, pressed && { transform: [{ scale: 0.98 }] }]}>
            <LinearGradient
              colors={universe ? [universe.color, `${universe.color}AA`] : ['#FF5C8A', '#A78BFA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hopInner}>
              <Text style={[styles.hopText, universe && { color: colors.bg }]}>
                {query.trim() ? 'Hop, trouve-moi un truc !' : universe ? `Hop, ${HOP[universe.id]} !` : 'Hop !'}
              </Text>
              <Text style={styles.hopEmoji}>🎲</Text>
            </LinearGradient>
          </Pressable>
          {(hasFilters(filters) || !!pick) && (
            <Pressable onPress={reset} style={styles.reset} hitSlop={6}>
              <Icon name="rotate-ccw" size={14} color={colors.muted} />
              <Text style={styles.resetText}>Tout effacer</Text>
            </Pressable>
          )}
        </View>

        <View onLayout={(e) => (resultY.current = e.nativeEvent.layout.y)}>
          {notice && (
            <View style={styles.notice}>
              <Text style={[text.strong, { textAlign: 'center' }]}>{notice}</Text>
            </View>
          )}
          {pick && (
            <Result
              item={pick.item}
              exact={pick.exact}
              understood={understood}
              status={saved.get(pick.item.id)}
              onAgain={() => roll()}
              onSave={() => setStatus(pick.item.id, saved.get(pick.item.id) === 'todo' ? null : 'todo')}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const HOP: Record<MediaType, string> = {
  film: 'trouve-moi un film',
  serie: 'trouve-moi une série',
  jeu: 'trouve-moi un jeu',
  musique: 'trouve-moi un son',
};

function Result({
  item,
  exact,
  understood,
  status,
  onAgain,
  onSave,
}: {
  item: Item;
  exact: boolean;
  understood: string;
  status?: 'todo' | 'done';
  onAgain: () => void;
  onSave: () => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const art = useArtwork(item);
  const [scored, setScored] = useState<{ id: string; score?: Score } | null>(null);
  const score = scored?.id === item.id ? scored.score : undefined;
  const t = TYPE[item.type];

  useEffect(() => {
    let alive = true;
    getScores([item.id])
      .then((m) => alive && setScored({ id: item.id, score: m.get(item.id) }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [item.id]);

  return (
    <View style={[styles.result, { borderColor: `${t.color}66` }]}>
      <Text style={styles.resultKicker}>
        {exact ? `${t.emoji} Ton idée ${t.verb}` : '🎲 Rien d’exact… mais essaie ça'}
        {understood ? `  ·  ${understood}` : ''}
      </Text>
      <View style={[styles.resultBody, wide && { flexDirection: 'row' }]}>
        <Poster
          item={item}
          aspect={item.type === 'musique' ? 1 : 2 / 3}
          style={wide ? { width: 210 } : { width: item.type === 'musique' ? '70%' : '62%', alignSelf: 'center' }}
          radiusSize={radius.lg}
        />
        <View style={{ flex: wide ? 1 : undefined, gap: 10 }}>
          <Row>
            <TypeBadge type={item.type} />
            {score && <ScorePill score={score.average} count={score.reviews} />}
          </Row>
          <Text style={styles.resultTitle}>{item.title}</Text>
          <Text style={text.muted}>
            {item.creator}
            {item.length ? `  ·  ${item.length}` : ''}
          </Text>
          <Text style={styles.resultMeta}>{item.type === 'musique' ? metaLine(item) : metaLine(item, 4)}</Text>
          {item.type === 'jeu' && !!item.platforms?.length && <Text style={styles.resultMeta}>🎮 {platformsLine(item)}</Text>}
          <Text style={text.body}>{item.summary}</Text>
          {item.type === 'musique' && <MusicPreview url={art.preview} />}
        </View>
      </View>
      <View style={styles.resultActions}>
        <Button label="Une autre" icon="shuffle" onPress={onAgain} style={{ flex: 1 }} />
        <Button
          label={status === 'todo' ? 'Dans ma liste' : 'À faire'}
          icon={status === 'todo' ? 'check' : 'bookmark'}
          variant="secondary"
          onPress={onSave}
          style={{ flex: 1 }}
        />
      </View>
      <View style={styles.resultActions}>
        <Button
          label={`${t.done} ? Note-le`}
          icon="star"
          variant="secondary"
          onPress={() => router.push({ pathname: '/titre/[id]', params: { id: item.id, noter: '1' } })}
          style={{ flex: 1 }}
        />
        <Button label="Voir la fiche" icon="arrow-right" variant="ghost" onPress={() => router.push(`/titre/${item.id}`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48, gap: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: fonts.bold, color: colors.text, fontSize: 26, letterSpacing: -1 },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { fontFamily: fonts.bold, color: colors.text, fontSize: 34, lineHeight: 40, letterSpacing: -1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 16, paddingVertical: 16, outlineStyle: 'none' } as never,
  types: { flexDirection: 'row', gap: 10 },
  typeTile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  typeEmoji: { fontSize: 26 },
  typeLabel: { fontFamily: fonts.bold, color: colors.text, fontSize: 13 },
  group: { gap: 10 },
  pickType: { alignItems: 'center', paddingVertical: 6 },
  pickTypeText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14 },
  universe: { gap: 18, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, padding: 16 },
  universeTitle: { fontFamily: fonts.bold, fontSize: 18 },
  hop: { borderRadius: radius.lg, overflow: 'hidden' },
  hopInner: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  hopText: { fontFamily: fonts.bold, color: '#fff', fontSize: 18 },
  hopEmoji: { fontSize: 22 },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  resetText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13 },
  notice: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 4, alignItems: 'center' },
  result: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, padding: 16, gap: 16 },
  resultKicker: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12.5, letterSpacing: 0.3 },
  resultBody: { gap: 16 },
  resultTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 26, lineHeight: 31, letterSpacing: -0.5 },
  resultMeta: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13.5 },
  resultActions: { flexDirection: 'row', gap: 10 },
});
