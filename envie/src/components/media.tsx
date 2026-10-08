import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { steamCover, steamHeader, useArtwork } from '@/lib/artwork';
import { isPremium } from '@/lib/auth';
import type { Review } from '@/lib/db';
import { timeAgo, isUrl } from '@/lib/format';
import { GENRE, PLATFORM, TYPE } from '@/lib/taxonomy';
import { colors, fonts, radius, scoreColor } from '@/lib/theme';
import type { Item, MediaType } from '@/lib/types';

import { PremiumBadge } from './premium';
import { Icon } from './ui';

export function TypeBadge({ type, small }: { type: MediaType; small?: boolean }) {
  const t = TYPE[type];
  return (
    <View style={[styles.badge, { backgroundColor: `${t.color}22`, borderColor: `${t.color}66` }, small && styles.badgeSmall]}>
      <Text style={[styles.badgeText, { color: t.color }, small && { fontSize: 11 }]}>
        {t.emoji} {t.label}
      </Text>
    </View>
  );
}

/** Image d'un titre, avec un joli dégradé si aucune jaquette n'est trouvée. */
export function Poster({
  item,
  image,
  type,
  title,
  aspect = 2 / 3,
  style,
  radiusSize = radius.md,
  priority,
}: {
  item?: Item | null;
  /** Image connue à l'avance (ex. avis du hub). */
  image?: string | null;
  type?: MediaType;
  title?: string;
  aspect?: number;
  style?: StyleProp<ViewStyle>;
  radiusSize?: number;
  /** Affiche en grand : cherchée avant les autres. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const steamFailed = !!item?.steam && failed.includes(steamCover(item.steam));
  const art = useArtwork(image ? null : item, false, priority);
  // Jaquette Steam introuvable : on cherche l'affiche sur Wikipédia, puis on prend la bannière Steam.
  const deep = useArtwork(steamFailed && !image ? item : null, true, priority);
  const src = [image ?? art.image, deep.image, item?.steam ? steamHeader(item.steam) : undefined].find(
    (u) => u && !failed.includes(u),
  );
  const t = TYPE[type ?? item?.type ?? 'film'];
  return (
    <View style={[{ aspectRatio: aspect, borderRadius: radiusSize, overflow: 'hidden', backgroundColor: colors.surfaceAlt }, style]}>
      <LinearGradient colors={[`${t.color}55`, `${t.color}10`]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.fallback}>
          <Text style={styles.fallbackEmoji}>{t.emoji}</Text>
          <Text style={styles.fallbackTitle} numberOfLines={3}>
            {title ?? item?.title}
          </Text>
        </View>
      </LinearGradient>
      {!!src && (
        <Image
          source={{ uri: src }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          onError={() => setFailed((f) => [...f, src])}
          accessibilityLabel={title ?? item?.title}
        />
      )}
    </View>
  );
}

export function ScorePill({ score, count, size = 'md' }: { score?: number | null; count?: number; size?: 'sm' | 'md' | 'lg' }) {
  if (score == null) return null;
  const c = scoreColor(score);
  const fs = size === 'lg' ? 22 : size === 'sm' ? 12 : 14;
  return (
    <View style={[styles.score, { backgroundColor: `${c}22`, borderColor: `${c}88` }, size === 'lg' && styles.scoreLg]}>
      <Text style={[styles.scoreText, { color: c, fontSize: fs }]}>{Number.isInteger(score) ? score : score.toFixed(1)}</Text>
      {count !== undefined && <Text style={[styles.scoreCount, size === 'sm' && { fontSize: 10 }]}>/10 · {count} avis</Text>}
    </View>
  );
}

/** Genres et plateformes, en une ligne. */
export function metaLine(item: Item, max = 3) {
  const genres = item.genres
    .slice(0, max)
    .map((g) => GENRE[g]?.label ?? g)
    .join(' · ');
  return [item.year || null, genres].filter(Boolean).join(' · ');
}

export function platformsLine(item: Item) {
  return (item.platforms ?? []).map((p) => PLATFORM[p]?.label ?? p).join(' · ');
}

export function MediaTile({ item, score, myScore, width }: { item: Item; score?: number; myScore?: number; width?: number }) {
  // La largeur est portée par un conteneur : à travers <Link asChild>, un style calculé serait perdu sur le web.
  return (
    <View style={width ? { width } : styles.tileFill}>
      <Link href={`/titre/${item.id}`} asChild>
        <Pressable style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
          <View>
            <Poster item={item} aspect={item.type === 'musique' ? 1 : 2 / 3} />
            {score !== undefined && (
              <View style={styles.tileScore}>
                <ScorePill score={score} size="sm" />
              </View>
            )}
            {myScore !== undefined && (
              <View style={styles.tileMine}>
                <Text style={styles.tileMineText}>★ {myScore}</Text>
              </View>
            )}
          </View>
          <Text style={styles.tileTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.tileMeta} numberOfLines={1}>
            {item.type === 'musique' ? item.creator : metaLine(item, 2)}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

export function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.rating}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const on = n <= value;
        const c = scoreColor(value || n);
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            accessibilityLabel={`${n} sur 10`}
            style={({ pressed }) => [
              styles.ratingCell,
              on && { backgroundColor: c, borderColor: c },
              pressed && { opacity: 0.7 },
            ]}>
            <Text style={[styles.ratingText, on && { color: colors.bg }]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const RATING_WORDS = ['', 'Nul', 'Très mauvais', 'Mauvais', 'Bof', 'Moyen', 'Pas mal', 'Bien', 'Très bien', 'Excellent', 'Chef-d’œuvre'];
export const ratingWord = (n: number) => RATING_WORDS[n] ?? '';

/** Bouton lecture / pause de l'extrait de 30 secondes. */
export function MusicPreview({ url, compact }: { url?: string; compact?: boolean }) {
  const player = useAudioPlayer(url ? { uri: url } : null);
  const status = useAudioPlayerStatus(player);
  useEffect(() => {
    if (status.didJustFinish) player.seekTo(0).catch(() => {});
  }, [status.didJustFinish, player]);
  if (!url) return null;
  const playing = status.playing;
  return (
    <Pressable
      onPress={() => (playing ? player.pause() : player.play())}
      accessibilityLabel={playing ? 'Mettre en pause' : 'Écouter un extrait'}
      style={({ pressed }) => [styles.play, compact && styles.playCompact, pressed && { opacity: 0.8 }]}>
      <Icon name={playing ? 'pause' : 'play'} size={compact ? 16 : 20} color={colors.bg} />
      {!compact && <Text style={styles.playText}>{playing ? 'Pause' : 'Écouter un extrait'}</Text>}
    </Pressable>
  );
}

export function Avatar({ value, size = 36 }: { value?: string | null; size?: number }) {
  const v = value || '🍿';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {isUrl(v) ? (
        <Image source={{ uri: v }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ fontSize: size * 0.55 }}>{v}</Text>
      )}
    </View>
  );
}

export function ReviewCard({
  review,
  liked,
  onLike,
  hideItem,
  full,
}: {
  review: Review;
  liked?: boolean;
  onLike?: () => void;
  hideItem?: boolean;
  /** Affiche le texte en entier (page de l'avis). */
  full?: boolean;
}) {
  const author = review.profiles;
  return (
    <View style={styles.review}>
      <View style={styles.reviewHead}>
        <Link href={author ? `/u/${author.username}` : '/hub'} asChild>
          <Pressable style={styles.author}>
            <Avatar value={author?.avatar} size={34} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {author?.username ?? 'Membre supprimé'}
                  {author?.is_admin ? '  🛡️' : ''}
                </Text>
                {isPremium(author) && !author?.is_admin && <PremiumBadge small />}
              </View>
              <Text style={styles.reviewDate}>{timeAgo(review.created_at)}</Text>
            </View>
          </Pressable>
        </Link>
        <ScorePill score={review.rating} />
      </View>

      {!hideItem && (
        <Link href={`/titre/${review.item_id}`} asChild>
          <Pressable style={styles.reviewItem}>
            <Poster
              image={review.item_image}
              type={review.item_type}
              title={review.item_title}
              aspect={review.item_type === 'musique' ? 1 : 2 / 3}
              style={{ width: 48 }}
              radiusSize={8}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.reviewItemTitle} numberOfLines={2}>
                {review.item_title}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TypeBadge type={review.item_type} small />
                {!!review.item_year && <Text style={styles.reviewDate}>{review.item_year}</Text>}
              </View>
            </View>
          </Pressable>
        </Link>
      )}

      {!!review.body && (
        <Link href={`/avis/${review.id}`} asChild disabled={full}>
          <Pressable>
            <Text style={styles.reviewBody} numberOfLines={full ? undefined : 6}>
              {review.body}
            </Text>
          </Pressable>
        </Link>
      )}

      <View style={styles.reviewActions}>
        <Pressable onPress={onLike} hitSlop={8} style={styles.action} accessibilityLabel="J'aime">
          <Icon name="heart" size={17} color={liked ? colors.accent : colors.muted} />
          <Text style={[styles.actionText, liked && { color: colors.accent }]}>{review.likes}</Text>
        </Pressable>
        <Link href={`/avis/${review.id}`} asChild disabled={full}>
          <Pressable hitSlop={8} style={styles.action} accessibilityLabel="Commentaires">
            <Icon name="message-circle" size={17} color={colors.muted} />
            <Text style={styles.actionText}>{review.comments}</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeSmall: { paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12.5 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10, gap: 6 },
  fallbackEmoji: { fontSize: 30 },
  fallbackTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 13, textAlign: 'center' },
  score: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  scoreLg: { paddingHorizontal: 14, paddingVertical: 6 },
  scoreText: { fontFamily: fonts.bold },
  scoreCount: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12 },
  tile: { gap: 6, width: '100%' },
  tileFill: { width: '100%' },
  tileScore: { position: 'absolute', top: 6, left: 6 },
  tileMine: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(11,11,18,0.85)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tileMineText: { fontFamily: fonts.bold, color: '#FBBF24', fontSize: 12 },
  tileTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 14, lineHeight: 18 },
  tileMeta: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12 },
  rating: { flexDirection: 'row', gap: 5 },
  ratingCell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: { fontFamily: fonts.bold, color: colors.muted, fontSize: 14 },
  play: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TYPE.musique.color,
    borderRadius: 999,
    paddingHorizontal: 18,
    minHeight: 46,
    alignSelf: 'flex-start',
  },
  playCompact: { width: 40, minHeight: 40, paddingHorizontal: 0 },
  playText: { fontFamily: fonts.bold, color: colors.bg, fontSize: 15 },
  avatar: { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  review: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  authorName: { fontFamily: fonts.bold, color: colors.text, fontSize: 14.5 },
  reviewDate: { fontFamily: fonts.regular, color: colors.faint, fontSize: 12 },
  reviewItem: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 8 },
  reviewItemTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  reviewBody: { fontFamily: fonts.regular, color: colors.text, fontSize: 15, lineHeight: 22 },
  reviewActions: { flexDirection: 'row', gap: 22 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14 },
});
