import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaTile, metaLine, MusicPreview, platformsLine, Poster, ScorePill, TypeBadge } from '@/components/media';
import { PremiumBadge, PremiumLock } from '@/components/premium';
import { Backdrop, Shelf } from '@/components/shelf';
import { Button, Chip, Icon, Row, text } from '@/components/ui';
import { useArtwork } from '@/lib/artwork';
import { useAuth } from '@/lib/auth';
import { useCatalog } from '@/lib/catalog';
import { getScores, topScores, type Score } from '@/lib/db';
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

/** Idées rapides : un clic et c'est parti. */
const PRESETS: { emoji: string; label: string; filters: Filters }[] = [
  { emoji: '🎃', label: 'Soirée frissons', filters: { types: ['film'], genres: ['horreur'], moods: ['flippant'], platforms: [] } },
  { emoji: '🍿', label: 'Film culte', filters: { types: ['film'], genres: [], moods: ['culte'], platforms: [] } },
  { emoji: '📺', label: 'Série à binger', filters: { types: ['serie'], genres: [], moods: ['intense'], platforms: [] } },
  { emoji: '😂', label: 'Série qui fait rire', filters: { types: ['serie'], genres: ['comedie'], moods: ['fun'], platforms: [] } },
  { emoji: '👯', label: 'Jeu entre potes', filters: { types: ['jeu'], genres: [], moods: ['potes'], platforms: [] } },
  { emoji: '⏱️', label: 'Jeu court', filters: { types: ['jeu'], genres: [], moods: ['court'], platforms: [] } },
  { emoji: '🎧', label: 'Son pour bosser', filters: { types: ['musique'], genres: ['lofi'], moods: ['chill'], platforms: [] } },
  { emoji: '⚡', label: 'Son pour se motiver', filters: { types: ['musique'], genres: [], moods: ['energie'], platforms: [] } },
  { emoji: '🥲', label: 'Film qui fait pleurer', filters: { types: ['film'], genres: [], moods: ['emouvant'], platforms: [] } },
];

const DECADES = [
  { id: 1900, label: 'Avant 1990' },
  { id: 1990, label: 'Années 90' },
  { id: 2000, label: 'Années 2000' },
  { id: 2010, label: 'Années 2010' },
  { id: 2020, label: 'Années 2020' },
];

const HOP: Record<MediaType, string> = {
  film: 'trouve-moi un film',
  serie: 'trouve-moi une série',
  jeu: 'trouve-moi un jeu',
  musique: 'trouve-moi un son',
};

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Mélange stable (le même pendant toute la visite). */
function shuffled<T>(list: T[], seed: number) {
  const a = [...list];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Discover() {
  const { items } = useCatalog();
  const { premium } = useAuth();
  const { saved, setStatus, seen, markSeen } = useLists();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [decades, setDecades] = useState<number[]>([]);
  const [minScore, setMinScore] = useState(false);
  const [pick, setPick] = useState<Pick | null>(null);
  const [pack, setPack] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [example, setExample] = useState(0);
  const [allGenres, setAllGenres] = useState(false);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [seed] = useState(() => Math.floor(Math.random() * 100000));
  const scroll = useRef<ScrollView>(null);
  const resultY = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setExample((e) => (e + 1) % EXAMPLES.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    topScores(300)
      .then((rows: Score[]) => setScores(new Map(rows.map((r) => [r.item_id, r.average]))))
      .catch(() => {});
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
    setPack([]);
    setNotice(null);
    setAllGenres(false);
  }

  /** Catalogue après les filtres Premium (décennie, note de la communauté). */
  const pool = useMemo(() => {
    if (!premium) return items;
    return items.filter((i) => {
      if (decades.length && !decades.some((d) => (d === 1900 ? i.year < 1990 : i.year >= d && i.year < d + 10))) return false;
      if (minScore && (scores.get(i.id) ?? 0) < 7) return false;
      return true;
    });
  }, [items, premium, decades, minScore, scores]);

  function exclusions() {
    const exclude = new Set(seen);
    for (const [id, status] of saved) if (status === 'done') exclude.add(id);
    if (pick) exclude.add(pick.item.id);
    return exclude;
  }

  function scrollToResult() {
    setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, resultY.current - 12), animated: true }), 60);
  }

  function roll(f: Filters = filters) {
    setPack([]);
    if (!f.types.length) {
      setPick(null);
      setNotice('Choisis d’abord un univers : film, série, jeu vidéo ou musique.');
      return;
    }
    const p = pickOne(pool, f, exclusions());
    setPick(p);
    setNotice(p ? null : 'Aucun titre ne correspond 🤔 Enlève un filtre ou essaie d’autres mots.');
    if (p) {
      markSeen(p.item.id);
      scrollToResult();
    }
  }

  /** Premium : 5 idées d'un coup. */
  function rollPack() {
    if (!premium) return router.push('/premium');
    if (!filters.types.length) return setNotice('Choisis d’abord un univers : film, série, jeu vidéo ou musique.');
    const exclude = exclusions();
    const list: Item[] = [];
    for (let i = 0; i < 5; i++) {
      const p = pickOne(pool, filters, exclude);
      if (!p || exclude.has(p.item.id)) break;
      list.push(p.item);
      exclude.add(p.item.id);
      markSeen(p.item.id);
    }
    setPick(null);
    setPack(list);
    setNotice(list.length ? null : 'Aucun titre ne correspond 🤔');
    scrollToResult();
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

  function preset(f: Filters) {
    setFilters(f);
    setQuery('');
    roll(f);
  }

  function reset() {
    setFilters(emptyFilters());
    setQuery('');
    setPick(null);
    setPack([]);
    setNotice(null);
    setDecades([]);
    setMinScore(false);
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

  // Rangées d'affiches : celles de l'univers choisi, ou un aperçu de chaque univers.
  const shelves = useMemo(() => {
    const byType = (t: MediaType) => items.filter((i) => i.type === t);
    if (!type) {
      return TYPES.map((t) => ({
        key: t.id,
        title: `${t.emoji} ${t.plural} ${t.verb}`,
        color: t.color,
        items: shuffled(byType(t.id), seed).slice(0, 14),
        href: { pathname: '/catalogue', params: { type: t.id } } as const,
      }));
    }
    const list = byType(type);
    const rated = list.filter((i) => scores.has(i.id)).sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
    const rows = [
      { key: 'top', title: '🏆 Les mieux notés', items: rated.slice(0, 14) },
      { key: 'culte', title: '🏆 Les incontournables', items: shuffled(list.filter((i) => i.moods.includes('culte')), seed).slice(0, 14) },
      ...shuffled(GENRES.filter((g) => g.types.includes(type)), seed)
        .slice(0, 3)
        .map((g) => ({ key: g.id, title: `${g.emoji} ${g.label}`, items: shuffled(list.filter((i) => i.genres.includes(g.id)), seed).slice(0, 14) })),
    ];
    return rows.filter((r) => r.items.length >= 3).map((r) => ({ ...r, color: undefined, href: { pathname: '/catalogue', params: { type } } as const }));
  }, [items, type, scores, seed]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={[`${universe?.color ?? colors.accent}33`, 'transparent']}
          style={styles.glow}
          pointerEvents="none"
        />
        <View style={styles.brandRow}>
          <Text style={styles.brand}>
            envie<Text style={{ color: colors.accent }}>.</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {premium && <PremiumBadge />}
            <Link href="/catalogue" asChild>
              <Pressable style={styles.searchBtn} accessibilityLabel="Chercher un titre">
                <Icon name="search" size={18} color={colors.text} />
              </Pressable>
            </Link>
          </View>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {PRESETS.map((p) => (
            <Pressable key={p.label} onPress={() => preset(p.filters)} style={({ pressed }) => [styles.preset, pressed && { opacity: 0.8 }]}>
              <Text style={{ fontSize: 16 }}>{p.emoji}</Text>
              <Text style={styles.presetText}>{p.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.types}>
          {TYPES.map((t) => {
            const on = type === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => chooseType(t.id)}
                style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }, { flex: 1 }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}>
                <LinearGradient
                  colors={on ? [`${t.color}55`, `${t.color}18`] : [colors.surface, colors.surface]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.typeTile, on && { borderColor: t.color }, type && !on && { opacity: 0.5 }]}>
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeLabel, on && { color: t.color }]}>{t.plural}</Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        {universe && (
          <View style={[styles.universe, { borderColor: `${universe.color}55` }]}>
            <Text style={[styles.universeTitle, { color: universe.color }]}>
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
                      color={universe.color}
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
                    color={universe.color}
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
                    color={universe.color}
                    selected={filters.moods.includes(m.id)}
                    onPress={() => setFilters((f) => ({ ...f, moods: toggle(f.moods, m.id) }))}
                  />
                ))}
              </Row>
            </View>

            <View style={styles.group}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={text.label}>Filtres avancés</Text>
                <PremiumBadge small />
              </View>
              {premium ? (
                <Row>
                  {DECADES.map((d) => (
                    <Chip key={d.id} label={d.label} color={universe.color} selected={decades.includes(d.id)} onPress={() => setDecades((x) => toggle(x, d.id))} />
                  ))}
                  <Chip label="Noté 7+ par la communauté" leading="⭐" color={universe.color} selected={minScore} onPress={() => setMinScore((v) => !v)} />
                </Row>
              ) : (
                <PremiumLock compact title="Décennie, note de la communauté…" text="Affine tes idées encore plus précisément." />
              )}
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
          {universe && (
            <Pressable onPress={rollPack} style={({ pressed }) => [styles.pack, pressed && { opacity: 0.8 }]}>
              <Text style={styles.packText}>{premium ? '✨ 5 idées d’un coup' : '🔒 5 idées d’un coup (Premium)'}</Text>
            </Pressable>
          )}
          {(hasFilters(filters) || !!pick || pack.length > 0) && (
            <Pressable onPress={reset} style={styles.reset} hitSlop={6}>
              <Icon name="rotate-ccw" size={14} color={colors.muted} />
              <Text style={styles.resetText}>Tout effacer</Text>
            </Pressable>
          )}
        </View>

        <View onLayout={(e) => (resultY.current = e.nativeEvent.layout.y)} style={{ gap: 14 }}>
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
          {pack.length > 0 && (
            <View style={[styles.packBox, { borderColor: `${universe?.color ?? colors.accent}66` }]}>
              <Text style={styles.resultKicker}>✨ {pack.length} idées pour toi{understood ? `  ·  ${understood}` : ''}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {pack.map((i) => (
                  <MediaTile key={i.id} item={i} width={i.type === 'musique' ? 140 : 128} score={scores.get(i.id)} />
                ))}
              </ScrollView>
              <Button label="5 autres idées" icon="shuffle" variant="secondary" onPress={rollPack} />
            </View>
          )}
        </View>

        <View style={{ gap: 26, marginTop: 8 }}>
          {shelves.map((s) => (
            <Shelf key={s.key} title={s.title} color={s.color} items={s.items} scores={scores} href={s.href} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
      <Backdrop item={item} height={wide ? 420 : 520} />
      <Text style={styles.resultKicker}>
        {exact ? `${t.emoji} Ton idée ${t.verb}` : '🎲 Rien d’exact… mais essaie ça'}
        {understood ? `  ·  ${understood}` : ''}
      </Text>
      <View style={[styles.resultBody, wide && { flexDirection: 'row' }]}>
        <Poster
          item={item}
          aspect={item.type === 'musique' ? 1 : 2 / 3}
          style={[styles.resultPoster, wide ? { width: 220 } : { width: item.type === 'musique' ? '72%' : '64%', alignSelf: 'center' }]}
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
  content: { padding: 20, paddingBottom: 56, gap: 20, width: '100%', maxWidth: 900, alignSelf: 'center' },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
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
  hero: { fontFamily: fonts.bold, color: colors.text, fontSize: 36, lineHeight: 42, letterSpacing: -1.2 },
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
  preset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetText: { fontFamily: fonts.medium, color: colors.text, fontSize: 13.5 },
  types: { flexDirection: 'row', gap: 10 },
  typeTile: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  typeEmoji: { fontSize: 28 },
  typeLabel: { fontFamily: fonts.bold, color: colors.text, fontSize: 13 },
  group: { gap: 10 },
  universe: { gap: 18, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, padding: 16 },
  universeTitle: { fontFamily: fonts.bold, fontSize: 18 },
  hop: { borderRadius: radius.lg, overflow: 'hidden' },
  hopInner: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  hopText: { fontFamily: fonts.bold, color: '#fff', fontSize: 18 },
  hopEmoji: { fontSize: 22 },
  pack: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: '#F59E0B66', backgroundColor: '#2A2112' },
  packText: { fontFamily: fonts.bold, color: '#FBBF24', fontSize: 13.5 },
  packBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, padding: 16, gap: 14 },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  resetText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13 },
  notice: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 4, alignItems: 'center' },
  result: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, padding: 16, gap: 16, overflow: 'hidden' },
  resultPoster: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  resultKicker: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12.5, letterSpacing: 0.3 },
  resultBody: { gap: 16 },
  resultTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 28, lineHeight: 33, letterSpacing: -0.6 },
  resultMeta: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13.5 },
  resultActions: { flexDirection: 'row', gap: 10 },
});
