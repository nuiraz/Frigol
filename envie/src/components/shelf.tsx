import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useArtwork } from '@/lib/artwork';
import { colors, fonts } from '@/lib/theme';
import type { Item } from '@/lib/types';

import { MediaTile } from './media';

/** Rangée horizontale d'affiches. */
export function Shelf({
  title,
  items,
  scores,
  href,
  color,
}: {
  title: string;
  items: Item[];
  scores?: Map<string, number>;
  href?: Href;
  color?: string;
}) {
  if (!items.length) return null;
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.head}>
        <Text style={[styles.title, color ? { color } : null]}>{title}</Text>
        {href && (
          <Link href={href} style={styles.more}>
            Tout voir →
          </Link>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
        {items.map((item) => (
          <MediaTile key={item.id} item={item} score={scores?.get(item.id)} width={item.type === 'musique' ? 136 : 122} />
        ))}
      </ScrollView>
    </View>
  );
}

/** Affiche floutée en fond d'un en-tête (fiche titre, résultat). */
export function Backdrop({ item, image, height = 360 }: { item?: Item | null; image?: string | null; height?: number }) {
  const art = useArtwork(image ? null : item);
  const src = image ?? art.image;
  return (
    <View style={[StyleSheet.absoluteFill, { height, overflow: 'hidden' }]} pointerEvents="none">
      {!!src && <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={40} transition={300} />}
      <LinearGradient colors={['rgba(11,11,18,0.35)', 'rgba(11,11,18,0.8)', colors.bg]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontFamily: fonts.bold, color: colors.text, fontSize: 19, letterSpacing: -0.3 },
  more: { fontFamily: fonts.bold, color: colors.accent, fontSize: 13.5 },
});
