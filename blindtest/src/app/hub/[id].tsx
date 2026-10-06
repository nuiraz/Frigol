import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { OnlineGate } from '@/components/online-gate';
import { Button, Card, Input, Label, Muted, Row, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { confirmAction, notify } from '@/lib/dialogs';
import {
  countPlay,
  deleteSharedPlaylist,
  getSharedPlaylist,
  hasLiked,
  reportPlaylist,
  setLike,
  type SharedPlaylist,
} from '@/lib/online';
import { quickPlay } from '@/lib/quick-play';
import { useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';
import { thumbnailUrl } from '@/lib/youtube';

export default function HubDetailScreen() {
  return (
    <OnlineGate>
      <HubDetail />
    </OnlineGate>
  );
}

function HubDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = useAuth();
  const store = useStore();
  const [playlist, setPlaylist] = useState<SharedPlaylist | null>(null);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');

  const me = auth.session?.user.id;

  useEffect(() => {
    getSharedPlaylist(id)
      .then(setPlaylist)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  useEffect(() => {
    if (me)
      hasLiked(id, me)
        .then(setLiked)
        .catch(() => {});
  }, [id, me]);

  if (error) {
    return (
      <Screen>
        <Text style={styles.error}>Playlist introuvable : {error}</Text>
      </Screen>
    );
  }
  if (!playlist) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  /** Copie la playlist dans les catégories locales (ou complète la copie existante). */
  const addToMine = () => {
    const name = `${playlist.title}`;
    const existing = store.data.categories.find((c) => c.name === name && c.emoji === playlist.emoji);
    const categoryId = existing?.id ?? store.addCategory({ name, emoji: playlist.emoji, color: playlist.color });
    const added = store.addTracks(categoryId, playlist.tracks);
    return { categoryId, added };
  };

  const toggleLike = async () => {
    if (!me) return router.push('/account');
    const next = !liked;
    setLiked(next);
    setPlaylist({ ...playlist, likes_count: playlist.likes_count + (next ? 1 : -1) });
    try {
      await setLike(playlist.id, me, next);
    } catch (e) {
      setLiked(!next);
      notify('Erreur', e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async () => {
    if (!(await confirmAction('Retirer du hub', 'Ta playlist ne sera plus visible par la communauté.', 'Retirer')))
      return;
    try {
      await deleteSharedPlaylist(playlist.id);
      router.back();
    } catch (e) {
      notify('Erreur', e instanceof Error ? e.message : String(e));
    }
  };

  const sendReport = async () => {
    try {
      await reportPlaylist(playlist.id, reason.trim() || 'Contenu inapproprié');
      setReporting(false);
      setReason('');
      notify('Merci', 'Le signalement a été transmis à la modération.');
    } catch (e) {
      notify('Erreur', e instanceof Error ? e.message : String(e));
    }
  };

  const tracks = showAll ? playlist.tracks : playlist.tracks.slice(0, 12);

  return (
    <Screen>
      <Stack.Screen options={{ title: playlist.title }} />
      <View style={styles.hero}>
        <Text style={styles.emoji}>{playlist.emoji}</Text>
        <Text style={styles.title}>{playlist.title}</Text>
        <Muted>
          par {playlist.profiles?.avatar} {playlist.profiles?.username ?? 'Anonyme'} · {playlist.track_count} titres ·{' '}
          {playlist.plays_count} écoutes
        </Muted>
        {!!playlist.description && <Muted style={styles.center}>{playlist.description}</Muted>}
      </View>

      <Button
        label="Jouer maintenant"
        color={playlist.color}
        onPress={() => {
          const { categoryId } = addToMine();
          countPlay(playlist.id).catch(() => {});
          quickPlay(categoryId);
        }}
      />
      <Row style={styles.noWrap}>
        <Button
          label="Ajouter à mes catégories"
          variant="secondary"
          style={styles.flex}
          onPress={() => {
            const { added } = addToMine();
            notify('Ajouté', `${added} morceau(x) ajouté(s) à tes catégories.`);
          }}
        />
        <Button label={`${liked ? '' : ''} ${playlist.likes_count}`} variant="secondary" onPress={toggleLike} />
      </Row>

      <Card>
        <Label>Morceaux</Label>
        {tracks.map((t) => (
          <Row key={t.id} style={styles.noWrap}>
            <Image source={thumbnailUrl(t.id)} style={styles.thumb} contentFit="cover" />
            <View style={styles.flex}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {t.title}
              </Text>
              <Muted numberOfLines={1}>{t.artist}</Muted>
            </View>
          </Row>
        ))}
        {!showAll && playlist.tracks.length > tracks.length && (
          <Button
            label={`Voir les ${playlist.tracks.length - tracks.length} autres`}
            small
            variant="secondary"
            onPress={() => setShowAll(true)}
          />
        )}
      </Card>

      {me === playlist.user_id ? (
        <Button label="Retirer du hub" variant="danger" small onPress={remove} />
      ) : me ? (
        reporting ? (
          <Card>
            <Label>Signaler cette playlist</Label>
            <Input value={reason} onChangeText={setReason} placeholder="Raison (contenu choquant, spam…)" />
            <Row>
              <Button label="Envoyer" small variant="danger" onPress={sendReport} />
              <Button label="Annuler" small variant="ghost" onPress={() => setReporting(false)} />
            </Row>
          </Card>
        ) : (
          <Button label="Signaler" variant="ghost" small onPress={() => setReporting(true)} />
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, paddingVertical: 10 },
  emoji: { fontSize: 56 },
  title: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 38,
    lineHeight: 44,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  center: { textAlign: 'center' },
  error: { color: colors.danger },
  noWrap: { flexWrap: 'nowrap' },
  flex: { flex: 1 },
  thumb: { width: 64, height: 36, borderRadius: 6, backgroundColor: colors.border },
  trackTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
});
