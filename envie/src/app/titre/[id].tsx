import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  MediaTile,
  metaLine,
  MusicPreview,
  platformsLine,
  Poster,
  RatingInput,
  ratingWord,
  ReviewCard,
  ScorePill,
  TypeBadge,
} from '@/components/media';
import { PremiumLock } from '@/components/premium';
import { Backdrop } from '@/components/shelf';
import { WhereToFind } from '@/components/where';
import { Button, Card, Chip, Empty, Input, Row, SectionTitle, text } from '@/components/ui';
import { useArtwork } from '@/lib/artwork';
import { useAuth } from '@/lib/auth';
import { useCatalog } from '@/lib/catalog';
import { confirm } from '@/lib/confirm';
import {
  createCollection,
  deleteReview,
  getJournal,
  getScores,
  listReviews,
  myCollections,
  saveJournal,
  saveReview,
  setInCollection,
  type Collection,
  type Review,
  type Score,
} from '@/lib/db';
import { similar } from '@/lib/discover';
import { useLists } from '@/lib/lists';
import { MOOD, TYPE } from '@/lib/taxonomy';
import { colors, fonts, radius } from '@/lib/theme';
import type { Item } from '@/lib/types';
import { useLikes } from '@/lib/use-likes';

export default function TitlePage() {
  const { id, noter } = useLocalSearchParams<{ id: string; noter?: string }>();
  const { byId, items } = useCatalog();
  const known = byId.get(id);
  const [snapshot, setSnapshot] = useState<Item | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [score, setScore] = useState<Score | undefined>();
  const [loading, setLoading] = useState(true);
  const { liked, toggle } = useLikes(reviews, setReviews);
  const scroll = useRef<ScrollView>(null);
  const formY = useRef(0);

  const item = known ?? snapshot;

  const load = useCallback(async () => {
    try {
      const [list, scores] = await Promise.all([listReviews({ itemId: id, limit: 60 }), getScores([id])]);
      setReviews(list);
      setScore(scores.get(id));
      // Titre retiré du catalogue : on l'affiche d'après les avis.
      if (!byId.get(id) && list[0]) {
        const r = list[0];
        setSnapshot({
          id,
          type: r.item_type,
          title: r.item_title,
          year: r.item_year ?? 0,
          creator: '',
          genres: [],
          moods: [],
          summary: '',
          image: r.item_image ?? undefined,
        });
      }
    } catch {
      // Base indisponible : la fiche reste consultable.
    } finally {
      setLoading(false);
    }
  }, [id, byId]);

  useEffect(() => {
    // Chargement asynchrone : l'état n'est modifié qu'à l'arrivée des données.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (!item) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Titre' }} />
        {loading ? <ActivityIndicator color={colors.accent} /> : <Empty icon="help-circle" title="Titre introuvable" />}
      </View>
    );
  }

  return (
    <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: item.title }} />
      <Backdrop item={item} height={560} />
      <Header item={item} score={score} />
      <ListButtons item={item} />
      <WhereToFind item={item} />
      <CollectionPicker item={item} />
      <JournalCard item={item} />
      <View onLayout={(e) => (formY.current = e.nativeEvent.layout.y)}>
        <ReviewForm
          item={item}
          autoFocus={noter === '1'}
          onReady={() => noter === '1' && setTimeout(() => scroll.current?.scrollTo({ y: formY.current - 10, animated: true }), 250)}
          onSaved={load}
        />
      </View>

      <SectionTitle title={`Avis de la communauté${reviews.length ? ` (${reviews.length})` : ''}`} />
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : reviews.length ? (
        reviews.map((r) => <ReviewCard key={r.id} review={r} hideItem liked={liked.has(r.id)} onLike={() => toggle(r.id)} />)
      ) : (
        <Empty icon="message-square" title="Aucun avis pour l’instant" hint="Sois le premier à donner ta note !" />
      )}

      <Similar item={item} items={items} />
    </ScrollView>
  );
}

function Header({ item, score }: { item: Item; score?: Score }) {
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const art = useArtwork(item);
  return (
    <View style={[styles.header, wide && { flexDirection: 'row' }]}>
      <Poster
        item={item}
        priority
        aspect={item.type === 'musique' ? 1 : 2 / 3}
        radiusSize={radius.lg}
        style={wide ? { width: 220 } : { width: item.type === 'musique' ? '72%' : '60%', alignSelf: 'center' }}
      />
      <View style={{ flex: wide ? 1 : undefined, gap: 10 }}>
        <TypeBadge type={item.type} />
        <Text style={styles.title}>{item.title}</Text>
        {!!item.creator && (
          <Text style={text.muted}>
            {item.creator}
            {item.length ? `  ·  ${item.length}` : ''}
          </Text>
        )}
        {!!item.genres.length && <Text style={styles.meta}>{metaLine(item, 5)}</Text>}
        {item.type === 'jeu' && !!item.platforms?.length && <Text style={styles.meta}>🎮 {platformsLine(item)}</Text>}
        {score ? (
          <ScorePill score={score.average} count={score.reviews} size="lg" />
        ) : (
          <Text style={text.small}>Pas encore noté par la communauté</Text>
        )}
        {!!item.summary && <Text style={text.body}>{item.summary}</Text>}
        {!!item.moods.length && (
          <Row>
            {item.moods.map((m) => (
              <View key={m} style={styles.mood}>
                <Text style={styles.moodText}>
                  {MOOD[m]?.emoji} {MOOD[m]?.label ?? m}
                </Text>
              </View>
            ))}
          </Row>
        )}
        {item.type === 'musique' && <MusicPreview url={art.preview} />}
      </View>
    </View>
  );
}

function ListButtons({ item }: { item: Item }) {
  const { saved, setStatus } = useLists();
  const status = saved.get(item.id);
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Button
        label={status === 'todo' ? 'Dans ma liste' : 'À faire'}
        icon={status === 'todo' ? 'check' : 'bookmark'}
        variant={status === 'todo' ? 'primary' : 'secondary'}
        onPress={() => setStatus(item.id, status === 'todo' ? null : 'todo')}
        style={{ flex: 1 }}
      />
      <Button
        label={status === 'done' ? `${TYPE[item.type].done} ✓` : TYPE[item.type].done}
        icon="check-circle"
        variant={status === 'done' ? 'primary' : 'secondary'}
        onPress={() => setStatus(item.id, status === 'done' ? null : 'done')}
        style={{ flex: 1 }}
      />
    </View>
  );
}

function ReviewForm({
  item,
  autoFocus,
  onReady,
  onSaved,
}: {
  item: Item;
  autoFocus?: boolean;
  onReady: () => void;
  onSaved: () => void;
}) {
  const { session, profile } = useAuth();
  const { setStatus } = useLists();
  const art = useArtwork(item);
  const [mine, setMine] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    let alive = true;
    if (!userId) {
      onReady();
      return;
    }
    listReviews({ itemId: item.id, userId, limit: 1 })
      .then(([r]) => {
        if (!alive) return;
        setMine(r ?? null);
        setRating(r?.rating ?? 0);
        setBody(r?.body ?? '');
      })
      .catch(() => {})
      .finally(() => alive && onReady());
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, item.id]);

  if (!session) {
    return (
      <Card>
        <Text style={text.strong}>Tu connais ce titre ?</Text>
        <Text style={text.muted}>Crée un compte gratuit pour le noter et partager ton avis sur le hub.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Se connecter" small onPress={() => router.push('/connexion')} style={{ flex: 1 }} />
          <Button label="Créer un compte" small variant="secondary" onPress={() => router.push('/inscription')} style={{ flex: 1 }} />
        </View>
      </Card>
    );
  }

  async function publish() {
    if (!userId) return;
    if (!rating) return setMessage({ ok: false, text: 'Choisis une note de 1 à 10.' });
    setBusy(true);
    setMessage(null);
    try {
      await saveReview(userId, item, art.image, rating, body);
      setStatus(item.id, 'done');
      setMessage({ ok: true, text: mine ? 'Avis modifié ✓' : 'Avis publié sur le hub ✓' });
      const [r] = await listReviews({ itemId: item.id, userId, limit: 1 });
      setMine(r ?? null);
      onSaved();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Impossible de publier.' });
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (!mine) return;
    confirm('Supprimer ton avis ?', 'Ta note et ton commentaire seront effacés du hub.', async () => {
      try {
        await deleteReview(mine.id);
        setMine(null);
        setRating(0);
        setBody('');
        setMessage({ ok: true, text: 'Avis supprimé.' });
        onSaved();
      } catch (e) {
        setMessage({ ok: false, text: e instanceof Error ? e.message : 'Suppression impossible.' });
      }
    });
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={text.strong}>{mine ? 'Ton avis' : `Ta note, ${profile?.username ?? ''}`}</Text>
        {!!rating && <Text style={styles.word}>{ratingWord(rating)}</Text>}
      </View>
      <RatingInput value={rating} onChange={setRating} />
      <Input
        value={body}
        onChangeText={setBody}
        placeholder="Ton avis en quelques mots (facultatif)…"
        multiline
        maxLength={2000}
        autoFocus={autoFocus && Platform.OS === 'web'}
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />
      {message && <Text style={{ color: message.ok ? colors.good : colors.bad, fontFamily: fonts.medium }}>{message.text}</Text>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label={mine ? 'Modifier mon avis' : 'Publier sur le hub'} icon="send" onPress={publish} loading={busy} style={{ flex: 1 }} />
        {mine && <Button label="" icon="trash-2" variant="secondary" onPress={remove} />}
      </View>
    </Card>
  );
}

function CollectionPicker({ item }: { item: Item }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Collection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!userId) return;
    setList(await myCollections(userId).catch(() => []));
  }

  if (!userId) return null;

  async function toggle(c: Collection, on: boolean) {
    setError(null);
    try {
      await setInCollection(c.id, item.id, on);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <Button
        label={open ? 'Fermer les collections' : 'Ajouter à une collection'}
        icon="folder-plus"
        variant="secondary"
        small
        onPress={() => {
          setOpen(!open);
          if (!open) load();
        }}
      />
      {open && (
        <Card>
          {list === null ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Row>
              {list.map((c) => {
                const on = !!c.collection_items?.some((x) => x.item_id === item.id);
                return <Chip key={c.id} label={c.name} leading={c.emoji} selected={on} onPress={() => toggle(c, !on)} />;
              })}
              <Chip
                label="Nouvelle collection"
                leading="➕"
                onPress={async () => {
                  try {
                    const id = await createCollection(`Mes ${TYPE[item.type].plural.toLowerCase()}`, TYPE[item.type].emoji);
                    await setInCollection(id, item.id, true);
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Création impossible.');
                  }
                }}
              />
            </Row>
          )}
          {error && <Text style={{ color: colors.bad, fontFamily: fonts.medium }}>{error}</Text>}
        </Card>
      )}
    </View>
  );
}

/** Journal privé (Premium) : quand tu l'as vu / joué / écouté, et tes notes perso. */
function JournalCard({ item }: { item: Item }) {
  const { session, premium } = useAuth();
  const { setStatus } = useLists();
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId || !premium) return;
    let alive = true;
    getJournal(item.id)
      .then((j) => {
        if (!alive || !j) return;
        setNote(j.private_note ?? '');
        setDate(j.done_at ?? '');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId, premium, item.id]);

  if (!userId) return null;
  if (!premium) return <PremiumLock compact title="Journal privé" text="Note la date et tes impressions perso, visibles par toi seul." />;

  async function save() {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return setMsg({ ok: false, text: 'Date au format AAAA-MM-JJ.' });
    setBusy(true);
    try {
      await saveJournal(item.id, note, date || null);
      setStatus(item.id, 'done');
      setMsg({ ok: true, text: 'Journal enregistré ✓' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Enregistrement impossible.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ borderColor: '#F59E0B55' }}>
      <Text style={text.strong}>📔 Mon journal privé</Text>
      <Input value={date} onChangeText={setDate} placeholder={`${TYPE[item.type].done} le… (AAAA-MM-JJ)`} maxLength={10} />
      <Input value={note} onChangeText={setNote} placeholder="Mes notes perso (visibles par moi seul)…" multiline maxLength={1000} style={{ minHeight: 70, textAlignVertical: 'top' }} />
      <Button
        label="Aujourd’hui"
        small
        variant="ghost"
        onPress={() => setDate(new Date().toISOString().slice(0, 10))}
        style={{ alignSelf: 'flex-start' }}
      />
      {msg && <Text style={{ color: msg.ok ? colors.good : colors.bad, fontFamily: fonts.medium }}>{msg.text}</Text>}
      <Button label="Enregistrer" icon="save" small onPress={save} loading={busy} />
    </Card>
  );
}

function Similar({ item, items }: { item: Item; items: Item[] }) {
  const list = similar(items, item);
  if (!list.length) return null;
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title="Dans le même esprit" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {list.map((x) => (
          <MediaTile key={x.id} item={x} width={item.type === 'musique' ? 130 : 120} />
        ))}
      </ScrollView>
      <Link href="/" style={styles.link}>
        Trouver une autre idée →
      </Link>
    </View>
  );
}


const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: { gap: 18 },
  title: { fontFamily: fonts.bold, color: colors.text, fontSize: 28, lineHeight: 33, letterSpacing: -0.6 },
  meta: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13.5 },
  mood: { backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  moodText: { fontFamily: fonts.medium, color: colors.text, fontSize: 12.5 },
  word: { fontFamily: fonts.bold, color: colors.muted, fontSize: 13 },
  link: { fontFamily: fonts.bold, color: colors.accent, fontSize: 14 },
});
