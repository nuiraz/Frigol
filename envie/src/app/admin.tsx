import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field, Message } from '@/components/form';
import { ReviewCard } from '@/components/media';
import { Button, Card, Chip, Empty, Input, Row, text } from '@/components/ui';
import { useAuth, type Profile } from '@/lib/auth';
import { useCatalog } from '@/lib/catalog';
import { confirm } from '@/lib/confirm';
import {
  addItem,
  adminSetPremium,
  communityStats,
  deleteItem,
  deleteReview,
  dismissReport,
  fetchAddedItems,
  listReports,
  premiumMembers,
  type Report,
} from '@/lib/db';
import { GENRES, MOODS, PLATFORMS, TYPES } from '@/lib/taxonomy';
import { colors, fonts, radius } from '@/lib/theme';
import type { Item, MediaType } from '@/lib/types';

type Tab = 'reports' | 'premium' | 'add' | 'items';

export default function Admin() {
  const { ready, profile } = useAuth();
  const [tab, setTab] = useState<Tab>('reports');
  const [stats, setStats] = useState<{ members: number; reviews: number; comments: number } | null>(null);

  useEffect(() => {
    if (profile?.is_admin) communityStats().then(setStats).catch(() => {});
  }, [profile?.is_admin]);

  if (!ready) return null;
  if (!profile?.is_admin) return <Redirect href="/" />;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={text.title}>Administration 🛡️</Text>
      {stats && (
        <View style={styles.stats}>
          {(
            [
              ['Membres', stats.members],
              ['Avis', stats.reviews],
              ['Commentaires', stats.comments],
            ] as const
          ).map(([l, v]) => (
            <View key={l} style={styles.stat}>
              <Text style={styles.statValue}>{v}</Text>
              <Text style={text.small}>{l}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.tabs}>
        {(
          [
            ['reports', 'Signalés'],
            ['premium', 'Premium'],
            ['add', 'Ajouter'],
            ['items', 'Ajoutés'],
          ] as const
        ).map(([k, l]) => (
          <Text key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
            {l}
          </Text>
        ))}
      </View>
      {tab === 'reports' && <Reports />}
      {tab === 'premium' && <PremiumAdmin />}
      {tab === 'add' && <AddItem onDone={() => setTab('items')} />}
      {tab === 'items' && <AddedItems />}
    </ScrollView>
  );
}

function Reports() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const load = useCallback(() => {
    listReports()
      .then(setReports)
      .catch(() => setReports([]));
  }, []);
  useEffect(load, [load]);

  if (!reports) return <ActivityIndicator color={colors.accent} />;
  if (!reports.length) return <Empty icon="check-circle" title="Aucun signalement" hint="Tout est calme sur le hub 😌" />;
  return (
    <View style={{ gap: 14 }}>
      {reports.map((r) => (
        <View key={r.id} style={{ gap: 8 }}>
          <Text style={text.small}>Signalé : {r.reason || '—'}</Text>
          {r.reviews && <ReviewCard review={r.reviews} />}
          <Row>
            <Button
              label="Supprimer l’avis"
              icon="trash-2"
              small
              onPress={() => confirm('Supprimer cet avis ?', 'Action définitive.', async () => (await deleteReview(r.review_id).catch(() => {}), load()))}
            />
            <Button label="Ignorer" small variant="secondary" onPress={async () => (await dismissReport(r.id).catch(() => {}), load())} />
          </Row>
        </View>
      ))}
    </View>
  );
}

function PremiumAdmin() {
  const [username, setUsername] = useState('');
  const [members, setMembers] = useState<Profile[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(() => {
    premiumMembers()
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);
  useEffect(load, [load]);

  async function grant(name: string, months: number) {
    setMsg(null);
    try {
      const until = await adminSetPremium(name, months);
      setMsg({
        ok: true,
        text: months >= 1200 ? `✨ ${name} est Premium à vie` : months > 0 ? `✨ ${name} est Premium jusqu’au ${new Date(until ?? '').toLocaleDateString('fr-FR')}` : `Premium retiré à ${name}.`,
      });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Action impossible.' });
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <Text style={text.strong}>Activer le Premium d’un membre</Text>
        <Text style={text.muted}>
          Après un paiement PayPal (le pseudo est dans le message) : « + 1 mois » pour 3,99 €, « À vie » pour 10,99 €. Toi, tu l’as gratuitement et à vie.
        </Text>
        <Input value={username} onChangeText={setUsername} placeholder="Pseudo du membre" autoCapitalize="none" />
        <Row>
          <Button label="+ 1 mois" small disabled={!username.trim()} onPress={() => grant(username, 1)} />
          <Button label="+ 12 mois" small variant="secondary" disabled={!username.trim()} onPress={() => grant(username, 12)} />
          <Button label="À vie" small variant="secondary" disabled={!username.trim()} onPress={() => grant(username, 1200)} />
          <Button label="Retirer" small variant="ghost" disabled={!username.trim()} onPress={() => grant(username, 0)} />
        </Row>
        <Message text={msg?.text ?? null} ok={msg?.ok} />
      </Card>
      <Text style={text.h2}>Membres Premium ({members?.length ?? '…'})</Text>
      {members?.map((m) => (
        <View key={m.id} style={styles.itemRow}>
          <Text style={{ fontSize: 22 }}>{m.avatar}</Text>
          <View style={{ flex: 1 }}>
            <Text style={text.strong}>{m.username}</Text>
            <Text style={text.small}>
              {!m.premium_until
                ? 'Premium'
                : new Date(m.premium_until).getFullYear() > 2090
                  ? '✨ à vie'
                  : `jusqu’au ${new Date(m.premium_until).toLocaleDateString('fr-FR')}`}
            </Text>
          </View>
          <Button label="+1 mois" small variant="secondary" onPress={() => grant(m.username, 1)} />
        </View>
      ))}
    </View>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function AddItem({ onDone }: { onDone: () => void }) {
  const { refresh } = useCatalog();
  const [type, setType] = useState<MediaType>('film');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [year, setYear] = useState('');
  const [summary, setSummary] = useState('');
  const [image, setImage] = useState('');
  const [length, setLength] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    if (!title.trim()) return setMsg({ ok: false, text: 'Le titre est obligatoire.' });
    if (!genres.length) return setMsg({ ok: false, text: 'Choisis au moins un genre.' });
    if (image && !image.startsWith('https://')) return setMsg({ ok: false, text: 'L’image doit être une adresse https://' });
    setBusy(true);
    try {
      await addItem({
        type,
        title,
        creator,
        year: Number(year) || 0,
        summary,
        image: image || undefined,
        length: length || undefined,
        genres,
        moods,
        platforms: type === 'jeu' ? platforms : undefined,
      });
      await refresh();
      setMsg({ ok: true, text: `« ${title} » ajouté au catalogue ✓` });
      setTitle('');
      setCreator('');
      setYear('');
      setSummary('');
      setImage('');
      setLength('');
      setGenres([]);
      setMoods([]);
      setPlatforms([]);
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Ajout impossible.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Field label="Type">
        <Row>
          {TYPES.map((t) => (
            <Chip key={t.id} label={t.label} leading={t.emoji} color={t.color} selected={type === t.id} onPress={() => (setType(t.id), setGenres([]))} />
          ))}
        </Row>
      </Field>
      <Field label="Titre">
        <Input value={title} onChangeText={setTitle} placeholder="Titre du film, de la série, du jeu ou du morceau" />
      </Field>
      <Field label={type === 'musique' ? 'Artiste' : type === 'jeu' ? 'Studio' : 'Réalisateur / créateur'}>
        <Input value={creator} onChangeText={setCreator} />
      </Field>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Année">
            <Input value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} placeholder="2024" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Durée">
            <Input value={length} onChangeText={setLength} placeholder="2 h 10, 3 saisons…" />
          </Field>
        </View>
      </View>
      <Field label="Résumé">
        <Input value={summary} onChangeText={setSummary} multiline maxLength={500} style={{ minHeight: 70, textAlignVertical: 'top' }} />
      </Field>
      <Field label="Image (facultatif)" hint="Adresse https:// d’une affiche ou jaquette. Sinon, l’app la cherche toute seule (films, séries, musique).">
        <Input value={image} onChangeText={setImage} autoCapitalize="none" placeholder="https://…" />
      </Field>
      {type === 'jeu' && (
        <Field label="Plateformes">
          <Row>
            {PLATFORMS.map((p) => (
              <Chip key={p.id} label={p.label} selected={platforms.includes(p.id)} onPress={() => setPlatforms(toggle(platforms, p.id))} />
            ))}
          </Row>
        </Field>
      )}
      <Field label="Genres">
        <Row>
          {GENRES.filter((g) => g.types.includes(type)).map((g) => (
            <Chip key={g.id} label={g.label} leading={g.emoji} selected={genres.includes(g.id)} onPress={() => setGenres(toggle(genres, g.id))} />
          ))}
        </Row>
      </Field>
      <Field label="Envies">
        <Row>
          {MOODS.filter((m) => m.types.includes(type)).map((m) => (
            <Chip key={m.id} label={m.label} leading={m.emoji} color="#60A5FA" selected={moods.includes(m.id)} onPress={() => setMoods(toggle(moods, m.id))} />
          ))}
        </Row>
      </Field>
      <Message text={msg?.text ?? null} ok={msg?.ok} />
      <Button label="Ajouter au catalogue" icon="plus" onPress={save} loading={busy} />
    </Card>
  );
}

function AddedItems() {
  const { refresh } = useCatalog();
  const [items, setItems] = useState<Item[] | null>(null);
  const load = useCallback(() => {
    fetchAddedItems()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  if (!items) return <ActivityIndicator color={colors.accent} />;
  if (!items.length) return <Empty icon="plus-circle" title="Aucun titre ajouté" hint="Le catalogue intégré contient déjà plus de 230 titres." />;
  return (
    <View style={{ gap: 10 }}>
      {items.map((i) => (
        <View key={i.id} style={styles.itemRow}>
          <View style={{ flex: 1 }}>
            <Text style={text.strong}>
              {TYPES.find((t) => t.id === i.type)?.emoji} {i.title}
            </Text>
            <Text style={text.small}>
              {[i.creator, i.year || null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Button
            label=""
            icon="trash-2"
            small
            variant="secondary"
            onPress={() => confirm(`Retirer « ${i.title} » ?`, 'Les avis déjà publiés restent visibles.', async () => (await deleteItem(i.id).catch(() => {}), load(), refresh()))}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontFamily: fonts.bold, color: colors.text, fontSize: 22 },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, color: colors.muted, fontSize: 12, paddingVertical: 10, paddingHorizontal: 2, borderRadius: 10, overflow: 'hidden' },
  tabOn: { backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: fonts.bold },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
});
