import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, Chip, Input, Label, Muted, Row, Screen } from '@/components/ui';
import { YouTubePlayer } from '@/components/youtube-player';
import type { PlayerEvent, PlayerHandle } from '@/components/youtube-player.types';
import { useAdminGuard } from '@/lib/admin-session';
import { confirmAction, notify } from '@/lib/dialogs';
import { useStore } from '@/lib/store';
import { CATEGORY_COLORS, colors } from '@/lib/theme';
import type { Category, PlaylistSource, Track } from '@/lib/types';
import { readYouTubeLink } from '@/lib/importer';
import { BLOCKED_ERRORS, thumbnailUrl } from '@/lib/youtube';

const PAGE = 40;

function makeSource(listId: string, url: string, title: string, count: number): PlaylistSource {
  return { listId, url, title, count, importedAt: Date.now() };
}

export default function CategoryEditor() {
  const ok = useAdminGuard();
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const category = store.data.categories.find((c) => c.id === id);

  const player = useRef<PlayerHandle>(null);
  const playlistResolver = useRef<((ids: string[]) => void) | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  if (!ok || !category) {
    return (
      <Screen>
        <Muted>Catégorie introuvable.</Muted>
      </Screen>
    );
  }

  function onPlayerEvent(e: PlayerEvent) {
    if (e.type === 'playlist') {
      playlistResolver.current?.(e.ids);
      playlistResolver.current = null;
    } else if (e.type === 'prepared' && previewing) {
      player.current?.segment(8);
    } else if (e.type === 'segmentEnd') {
      setPreviewing(null);
    } else if (e.type === 'error') {
      if (playlistResolver.current) {
        playlistResolver.current([]);
        playlistResolver.current = null;
      }
      if (previewing) {
        if (typeof e.code === 'number' && BLOCKED_ERRORS.includes(e.code)) store.markBlocked(previewing);
        notify('Lecture impossible', `Cette vidéo ne peut pas être lue dans l’application (erreur ${e.code}).`);
        setPreviewing(null);
      }
    }
  }

  /** Liste des vidéos d'une playlist sans clé d'API, via le lecteur YouTube caché. */
  function idsFromPlayer(listId: string) {
    return new Promise<string[]>((resolve) => {
      playlistResolver.current = resolve;
      player.current?.playlist(listId);
    });
  }

  async function importUrl() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const r = await readYouTubeLink(url, {
        apiKey: store.data.settings.youtubeApiKey,
        onProgress: setProgress,
        idsFromPlayer,
      });
      const added = store.addTracks(category!.id, r.tracks);
      if (r.kind === 'playlist') {
        store.addSource(category!.id, makeSource(r.listId, r.url, r.title, r.tracks.length));
        notify('Import terminé', `${added} morceau(x) ajouté(s) sur ${r.tracks.length} trouvé(s).`);
      } else if (!added) {
        notify('Déjà présent', 'Ce morceau est déjà dans la catégorie.');
      } else if (!r.tracks[0].title) {
        setEditing(r.tracks[0].id);
      }
      setUrl('');
    } catch (err) {
      notify('Erreur', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  function preview(track: Track) {
    if (previewing === track.id) {
      player.current?.stop();
      setPreviewing(null);
      return;
    }
    setPreviewing(track.id);
    player.current?.prepare(track.id, track.start != null ? 'fixed' : 'random', track.start);
  }

  async function removeCategory() {
    if (
      await confirmAction(
        'Supprimer la catégorie',
        `« ${category!.name} » et ses ${category!.tracks.length} morceaux seront supprimés.`,
        'Supprimer',
      )
    ) {
      store.deleteCategory(category!.id);
      router.back();
    }
  }

  async function removeSource(listId: string) {
    const ok = await confirmAction('Retirer la playlist', 'Les morceaux déjà importés restent dans la catégorie.');
    if (ok)
      store.updateCategory(category!.id, {
        sources: category!.sources.filter((s) => s.listId !== listId),
      });
  }

  async function removeTrack(track: Track) {
    if (
      await confirmAction(
        'Supprimer le morceau',
        `« ${track.title || track.id} » sera retiré de la catégorie.`,
        'Supprimer',
      )
    )
      store.deleteTrack(category!.id, track.id);
  }

  async function removeSelected() {
    if (!selected.length) return;
    const ok = await confirmAction(
      'Supprimer la sélection',
      `${selected.length} morceau(x) seront retirés de la catégorie.`,
      'Supprimer',
    );
    if (!ok) return;
    store.updateCategory(category!.id, { tracks: category!.tracks.filter((t) => !selected.includes(t.id)) });
    setSelected([]);
    setSelecting(false);
  }

  async function purgeBlocked() {
    const blocked = category!.tracks.filter((t) => t.blocked);
    if (!blocked.length) return;
    if (
      await confirmAction(
        'Supprimer les morceaux bloqués',
        `${blocked.length} morceau(x) seront supprimés.`,
        'Supprimer',
      )
    ) {
      store.updateCategory(category!.id, {
        tracks: category!.tracks.filter((t) => !t.blocked),
      });
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? category.tracks.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(q))
    : category.tracks;
  const blockedCount = category.tracks.filter((t) => t.blocked).length;

  return (
    <Screen>
      <Stack.Screen options={{ title: `${category.emoji} ${category.name}` }} />
      <YouTubePlayer ref={player} onEvent={onPlayerEvent} />

      <Card>
        <Label>Informations</Label>
        <Row style={styles.noWrap}>
          <Input
            value={category.emoji}
            onChangeText={(emoji) => store.updateCategory(category.id, { emoji })}
            style={styles.emojiInput}
            maxLength={4}
          />
          <Input
            value={category.name}
            onChangeText={(name) => store.updateCategory(category.id, { name })}
            style={styles.flex}
            placeholder="Nom"
          />
        </Row>
        <Row>
          {CATEGORY_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => store.updateCategory(category.id, { color: c })}
              style={[styles.swatch, { backgroundColor: c }, category.color === c && styles.swatchOn]}
            />
          ))}
        </Row>
      </Card>

      <Card>
        <Label>📥 Ajouter des musiques</Label>
        <Muted>
          Colle le lien d’une playlist YouTube Music / YouTube (music.youtube.com/playlist?list=…) ou d’un seul morceau.
        </Muted>
        <Input
          value={url}
          onChangeText={setUrl}
          placeholder="https://music.youtube.com/playlist?list=…"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={importUrl}
        />
        <Button label="Importer" loading={busy} disabled={!url.trim()} color={category.color} onPress={importUrl} />
        {!!progress && <Muted>{progress}</Muted>}
        {!store.data.settings.youtubeApiKey && (
          <Muted style={styles.tip}>
            Astuce : avec une clé API YouTube (Réglages), l’import est plus rapide et récupère jusqu’à 1000 titres.
          </Muted>
        )}
      </Card>

      {category.sources.length > 0 && (
        <Card>
          <Label>🔗 Playlists importées</Label>
          {category.sources.map((s) => (
            <Row key={s.listId} style={styles.noWrap}>
              <View style={styles.flex}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {s.title}
                </Text>
                <Muted>
                  {s.count} titres · {new Date(s.importedAt).toLocaleDateString('fr-FR')}
                </Muted>
              </View>
              <Button
                label="↻"
                small
                variant="secondary"
                onPress={() => {
                  setUrl(s.url);
                }}
              />
              <Button label="✕" small variant="ghost" onPress={() => removeSource(s.listId)} />
            </Row>
          ))}
          <Muted>↻ remet le lien dans le champ pour réimporter les nouveaux titres.</Muted>
        </Card>
      )}

      <Card>
        <Row style={styles.spread}>
          <Label>🎵 Morceaux ({category.tracks.length})</Label>
          {blockedCount > 0 && (
            <Button label={`Purger ${blockedCount} bloqué(s)`} small variant="danger" onPress={purgeBlocked} />
          )}
        </Row>
        {category.tracks.length > 0 && (
          <Row>
            {selecting ? (
              <>
                <Button
                  label={`🗑️ Supprimer (${selected.length})`}
                  small
                  variant="danger"
                  disabled={!selected.length}
                  onPress={removeSelected}
                />
                <Button
                  label={selected.length === filtered.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  small
                  variant="secondary"
                  onPress={() => setSelected(selected.length === filtered.length ? [] : filtered.map((t) => t.id))}
                />
                <Button
                  label="Annuler"
                  small
                  variant="ghost"
                  onPress={() => {
                    setSelecting(false);
                    setSelected([]);
                  }}
                />
              </>
            ) : (
              <Button label="☑️ Sélectionner plusieurs" small variant="secondary" onPress={() => setSelecting(true)} />
            )}
          </Row>
        )}
        {category.tracks.length > 8 && (
          <Input value={search} onChangeText={setSearch} placeholder="🔍 Rechercher un titre ou un artiste" />
        )}
        {filtered.slice(0, limit).map((t) => (
          <TrackRow
            key={t.id}
            selecting={selecting}
            checked={selected.includes(t.id)}
            onCheck={() => setSelected((s) => (s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id]))}
            onRemove={() => removeTrack(t)}
            track={t}
            expanded={editing === t.id}
            previewing={previewing === t.id}
            onToggleEdit={() => setEditing(editing === t.id ? null : t.id)}
            onPreview={() => preview(t)}
            onChange={(patch) => store.updateTrack(category.id, t.id, patch)}
            moveTargets={store.data.categories.filter((c) => c.id !== category.id)}
            onMove={(toId) => store.moveTrack(category.id, toId, t.id)}
          />
        ))}
        {filtered.length > limit && (
          <Button
            label={`Afficher plus (${filtered.length - limit})`}
            small
            variant="secondary"
            onPress={() => setLimit(limit + PAGE)}
          />
        )}
        {category.tracks.length === 0 && <Muted>Aucun morceau. Importe une playlist ci-dessus.</Muted>}
      </Card>

      <Button label="🗑️  Supprimer la catégorie" variant="danger" onPress={removeCategory} />
    </Screen>
  );
}

function TrackRow({
  selecting,
  checked,
  onCheck,
  onRemove,
  track,
  expanded,
  previewing,
  onToggleEdit,
  onPreview,
  onChange,
  moveTargets,
  onMove,
}: {
  selecting: boolean;
  checked: boolean;
  onCheck: () => void;
  onRemove: () => void;
  track: Track;
  expanded: boolean;
  previewing: boolean;
  onToggleEdit: () => void;
  onPreview: () => void;
  onChange: (patch: Partial<Track>) => void;
  moveTargets: Category[];
  onMove: (categoryId: string) => void;
}) {
  const incomplete = !track.title || !track.artist;
  return (
    <View
      style={[
        styles.track,
        (track.disabled || track.blocked) && styles.trackOff,
        selecting && checked && styles.trackChecked,
      ]}>
      <Pressable onPress={selecting ? onCheck : onToggleEdit} style={styles.trackHead}>
        {selecting && <Text style={[styles.checkbox, checked && styles.checkboxOn]}>{checked ? '✓' : ''}</Text>}
        <Image source={thumbnailUrl(track.id)} style={styles.thumb} contentFit="cover" />
        <View style={styles.flex}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {track.title || '(titre manquant)'}
          </Text>
          <Muted>
            {track.artist || '(artiste manquant)'}
            {track.blocked ? ' · ⚠️ bloqué' : ''}
            {track.disabled ? ' · désactivé' : ''}
            {incomplete ? ' · ✏️ à compléter' : ''}
          </Muted>
        </View>
        {!selecting && (
          <>
            <Button label={previewing ? '■' : '▶'} small variant="secondary" onPress={onPreview} />
            <Button label="🗑️" small variant="ghost" onPress={onRemove} />
          </>
        )}
      </Pressable>
      {expanded && !selecting && (
        <View style={styles.editor}>
          <Input value={track.title} onChangeText={(title) => onChange({ title })} placeholder="Titre" />
          <Input value={track.artist} onChangeText={(artist) => onChange({ artist })} placeholder="Artiste" />
          <Row style={styles.noWrap}>
            <Muted style={styles.flex}>Début de l’extrait (secondes, vide = aléatoire)</Muted>
            <Input
              value={track.start != null ? String(track.start) : ''}
              onChangeText={(v) => {
                const n = parseInt(v.replace(/\D/g, ''), 10);
                onChange({ start: Number.isFinite(n) ? n : undefined });
              }}
              keyboardType="number-pad"
              placeholder="—"
              style={styles.startInput}
            />
          </Row>
          <Row style={styles.spread}>
            <Row>
              <Switch value={!track.disabled} onValueChange={(v) => onChange({ disabled: !v })} />
              <Muted>Dans le jeu</Muted>
            </Row>
            {track.blocked && <Chip label="Réessayer (débloquer)" onPress={() => onChange({ blocked: false })} />}
            <Button label="Supprimer" small variant="danger" onPress={onRemove} />
          </Row>
          {moveTargets.length > 0 && (
            <>
              <Muted>Déplacer vers :</Muted>
              <Row>
                {moveTargets.map((c) => (
                  <Chip key={c.id} label={`${c.emoji} ${c.name}`} color={c.color} onPress={() => onMove(c.id)} />
                ))}
              </Row>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  noWrap: { flexWrap: 'nowrap' },
  spread: { justifyContent: 'space-between' },
  emojiInput: { width: 64, textAlign: 'center', fontSize: 22 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  swatchOn: { borderWidth: 3, borderColor: colors.text },
  tip: { fontSize: 12 },
  track: {
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    padding: 8,
    gap: 8,
  },
  trackOff: { opacity: 0.55 },
  trackChecked: { borderWidth: 2, borderColor: colors.danger },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    color: '#fff',
    fontWeight: '900',
    overflow: 'hidden',
  },
  checkboxOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  trackHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: {
    width: 64,
    height: 36,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  trackTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  editor: { gap: 8, paddingTop: 4 },
  startInput: { width: 80, textAlign: 'center' },
});
