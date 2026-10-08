import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { WEB_URL } from '@/lib/config';
import { colors, fonts, radius } from '@/lib/theme';
import type { Item } from '@/lib/types';

import { Icon, text, type IconName } from './ui';

type Place = { label: string; url: string; icon: IconName };

const q = (s: string) => encodeURIComponent(s);

/** Où regarder, jouer ou écouter ce titre (recherches sur les plateformes). */
function places(item: Item): Place[] {
  const name = item.search ?? item.title;
  if (item.type === 'film' || item.type === 'serie') {
    return [
      { label: 'Où le regarder (JustWatch)', url: `https://www.justwatch.com/fr/recherche?q=${q(item.title)}`, icon: 'tv' },
      { label: 'Bande-annonce', url: `https://www.youtube.com/results?search_query=${q(`${item.title} ${item.year || ''} bande annonce VF`)}`, icon: 'youtube' },
    ];
  }
  if (item.type === 'jeu') {
    const list: Place[] = [];
    const p = item.platforms ?? [];
    if (item.steam) list.push({ label: 'Steam', url: `https://store.steampowered.com/app/${item.steam}`, icon: 'monitor' });
    if (p.includes('playstation')) list.push({ label: 'PlayStation Store', url: `https://store.playstation.com/fr-fr/search/${q(item.title)}`, icon: 'shopping-bag' });
    if (p.includes('xbox')) list.push({ label: 'Xbox Store', url: `https://www.xbox.com/fr-FR/search/results/games?q=${q(item.title)}`, icon: 'shopping-bag' });
    if (p.includes('switch')) list.push({ label: 'Nintendo eShop', url: `https://www.nintendo.com/fr-fr/Rechercher/Rechercher-299117.html?q=${q(item.title)}`, icon: 'shopping-bag' });
    list.push({ label: 'Bande-annonce', url: `https://www.youtube.com/results?search_query=${q(`${item.title} trailer`)}`, icon: 'youtube' });
    return list;
  }
  return [
    { label: 'Spotify', url: `https://open.spotify.com/search/${q(name)}`, icon: 'music' },
    { label: 'Deezer', url: `https://www.deezer.com/search/${q(name)}`, icon: 'music' },
    { label: 'YouTube Music', url: `https://music.youtube.com/search?q=${q(name)}`, icon: 'youtube' },
  ];
}

const HEADINGS: Record<Item['type'], string> = {
  film: 'Où le regarder',
  serie: 'Où la regarder',
  jeu: 'Où y jouer',
  musique: 'Où l’écouter',
};

export function WhereToFind({ item }: { item: Item }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${WEB_URL}titre/${item.id}`;
    if (Platform.OS === 'web') {
      await navigator.clipboard?.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      await Share.share({ message: `${item.title} — une idée trouvée sur Envie : ${url}` });
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={text.label}>{HEADINGS[item.type]}</Text>
      <View style={styles.row}>
        {places(item).map((p) => (
          <Pressable
            key={p.label}
            onPress={() => WebBrowser.openBrowserAsync(p.url).catch(() => {})}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.75 }]}>
            <Icon name={p.icon} size={15} color={colors.text} />
            <Text style={styles.btnText}>{p.label}</Text>
            <Icon name="external-link" size={12} color={colors.faint} />
          </Pressable>
        ))}
        <Pressable onPress={share} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.75 }]}>
          <Icon name={copied ? 'check' : 'share-2'} size={15} color={copied ? colors.good : colors.text} />
          <Text style={[styles.btnText, copied && { color: colors.good }]}>{copied ? 'Lien copié' : 'Partager'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: { fontFamily: fonts.medium, color: colors.text, fontSize: 13.5 },
});
