import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Icon, Input, Label, Muted, Row, Screen } from '@/components/ui';
import { YouTubePlayer } from '@/components/youtube-player';
import type { PlayerEvent, PlayerHandle } from '@/components/youtube-player.types';
import { useAdminGuard } from '@/lib/admin-session';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/dialogs';
import { readYouTubeLink, type ImportResult } from '@/lib/importer';
import { useStore } from '@/lib/store';
import { CATEGORY_COLORS, colors, fonts } from '@/lib/theme';
import { thumbnailUrl } from '@/lib/youtube';

const EMOJIS = ['🎵', '🎸', '🎤', '📼', '💿', '🎹', '🥁', '🎻', '🎷', '🪩', '🎬', '📺', '🧸', '🇫🇷', '🔥', '❤️'];

const NEW = '__new__';

function now() {
  return Date.now();
}

export default function ImportPlaylist() {
  const ok = useAdminGuard('/admin/import');
  const store = useStore();
  const auth = useAuth();
  const player = useRef<PlayerHandle>(null);
  const resolver = useRef<((ids: string[]) => void) | null>(null);

  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [target, setTarget] = useState<string>(NEW);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [done, setDone] = useState<{ categoryId: string; added: number; total: number } | null>(null);

  if (!ok) return null;

  function onPlayerEvent(e: PlayerEvent) {
    if (e.type === 'playlist' || e.type === 'error') {
      resolver.current?.(e.type === 'playlist' ? e.ids : []);
      resolver.current = null;
    }
  }

  async function analyse() {
    if (!url.trim()) return;
    setBusy(true);
    setResult(null);
    setDone(null);
    try {
      const r = await readYouTubeLink(url, {
        apiKey: store.data.settings.youtubeApiKey,
        onProgress: setProgress,
        idsFromPlayer: (listId) =>
          new Promise((resolve) => {
            resolver.current = resolve;
            player.current?.playlist(listId);
          }),
      });
      setResult(r);
      if (r.kind === 'playlist') setName(r.title);
      // Propose par défaut une nouvelle catégorie pour une playlist, la première existante pour un morceau.
      setTarget(r.kind === 'playlist' || store.data.categories.length === 0 ? NEW : store.data.categories[0].id);
    } catch (err) {
      notify('Import impossible', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  function confirmImport() {
    if (!result) return;
    let categoryId = target;
    if (target === NEW) {
      if (!name.trim()) return notify('Nom manquant', 'Donne un nom à la nouvelle catégorie.');
      categoryId = store.addCategory({ name: name.trim(), emoji, color });
    }
    const added = store.addTracks(categoryId, result.tracks);
    if (result.kind === 'playlist') {
      store.addSource(categoryId, {
        listId: result.listId,
        url: result.url,
        title: result.title,
        count: result.tracks.length,
        importedAt: now(),
      });
    }
    setDone({ categoryId, added, total: result.tracks.length });
    setResult(null);
    setUrl('');
  }

  const doneCategory = done && store.data.categories.find((c) => c.id === done.categoryId);

  return (
    <Screen>
      <YouTubePlayer ref={player} onEvent={onPlayerEvent} />

      {auth.enabled && !auth.session && (
        <Card style={styles.hint}>
          <Icon name="upload-cloud" color={colors.accent} />
          <Muted style={styles.flex}>
            Connecte-toi pour que tes playlists soient envoyées à tous les joueurs. Sans compte, elles restent sur cet
            appareil.
          </Muted>
          <Button label="Connexion" small variant="secondary" onPress={() => router.push('/account')} />
        </Card>
      )}

      <Card>
        <Label>Colle le lien YouTube Music</Label>
        <Muted>
          Dans YouTube Music : ouvre la playlist → ⋮ ou « Partager » → « Copier le lien ». Ça marche aussi avec YouTube,
          les albums et un morceau seul.
        </Muted>
        <Input
          value={url}
          onChangeText={setUrl}
          placeholder="https://music.youtube.com/playlist?list=…"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={analyse}
        />
        <Button label="Lire la playlist" loading={busy} disabled={!url.trim()} onPress={analyse} />
        {!!progress && <Muted>{progress}</Muted>}
      </Card>

      {done && doneCategory && (
        <Card style={styles.success}>
          <Text style={styles.successTitle}>Import terminé</Text>
          <Muted>
            {done.added} morceau(x) ajouté(s) à {doneCategory.emoji} {doneCategory.name}
            {done.added < done.total ? ` (${done.total - done.added} déjà présent(s))` : ''}.
          </Muted>
          <Row>
            <Button
              label="Voir / corriger les titres"
              small
              color={doneCategory.color}
              onPress={() => router.push({ pathname: '/admin/category/[id]', params: { id: doneCategory.id } })}
            />
            <Button label="Importer une autre" small variant="secondary" onPress={() => setDone(null)} />
          </Row>
        </Card>
      )}

      {result && (
        <>
          <Card>
            <Label>
              {result.kind === 'playlist' ? '' : ''}
              {result.title}
            </Label>
            <Muted>{result.tracks.length} morceau(x) trouvé(s)</Muted>
            {result.tracks.slice(0, 6).map((t) => (
              <Row key={t.id} style={styles.noWrap}>
                <Image source={thumbnailUrl(t.id)} style={styles.thumb} contentFit="cover" />
                <View style={styles.flex}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {t.title || '(titre à compléter)'}
                  </Text>
                  <Muted>{t.artist || '(artiste à compléter)'}</Muted>
                </View>
              </Row>
            ))}
            {result.tracks.length > 6 && <Muted>… et {result.tracks.length - 6} autres</Muted>}
          </Card>

          <Card>
            <Label>Dans quelle catégorie ?</Label>
            <View style={styles.grid}>
              <CategoryOption
                emoji="+"
                name="Nouvelle"
                sub="catégorie"
                color={colors.accent}
                selected={target === NEW}
                onPress={() => setTarget(NEW)}
              />
              {store.data.categories.map((c) => (
                <CategoryOption
                  key={c.id}
                  emoji={c.emoji}
                  name={c.name}
                  sub={`${c.tracks.length} titres`}
                  color={c.color}
                  selected={target === c.id}
                  onPress={() => setTarget(c.id)}
                />
              ))}
            </View>

            {target === NEW && (
              <View style={styles.newCat}>
                <Input value={name} onChangeText={setName} placeholder="Nom : Rap FR, Années 90, Disney…" />
                <Row>
                  {EMOJIS.map((e) => (
                    <Chip key={e} label={e} selected={emoji === e} onPress={() => setEmoji(e)} />
                  ))}
                </Row>
                <Row>
                  {CATEGORY_COLORS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}
                    />
                  ))}
                </Row>
              </View>
            )}
          </Card>

          <Button
            label={`Importer ${result.tracks.length} morceau(x)`}
            color={
              target === NEW ? color : (store.data.categories.find((c) => c.id === target)?.color ?? colors.accent)
            }
            onPress={confirmImport}
          />
          <Button label="Annuler" variant="ghost" small onPress={() => setResult(null)} />
        </>
      )}

      {!store.data.settings.youtubeApiKey && (
        <Muted style={styles.tip}>
          Sans clé API YouTube, l’import lit jusqu’à ~200 titres par playlist. Ajoute une clé dans Réglages pour aller
          jusqu’à 1000.
        </Muted>
      )}
    </Screen>
  );
}

function CategoryOption({
  emoji,
  name,
  sub,
  color,
  selected,
  onPress,
}: {
  emoji: string;
  name: string;
  sub?: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, selected && { borderColor: color, backgroundColor: `${color}26` }]}>
      <Text style={styles.optionEmoji}>{emoji}</Text>
      <Text style={styles.optionName} numberOfLines={1}>
        {name}
      </Text>
      {sub && <Text style={[styles.optionSub, selected && { color }]}>{sub}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  noWrap: { flexWrap: 'nowrap' },
  thumb: { width: 64, height: 36, borderRadius: 6, backgroundColor: colors.border },
  trackTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    gap: 2,
  },
  optionEmoji: { fontSize: 26 },
  optionName: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  optionSub: { color: colors.muted, fontSize: 12, fontFamily: fonts.bold },
  newCat: { gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchOn: { borderWidth: 3, borderColor: colors.text },
  success: { borderColor: colors.success },
  successTitle: { color: colors.success, fontSize: 18, fontFamily: fonts.bold },
  tip: { fontSize: 12, textAlign: 'center' },
});
