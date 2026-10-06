import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Card, Muted, Screen } from '@/components/ui';
import { LEGAL } from '@/lib/config';
import { LEGAL_PAGES } from '@/lib/legal';
import { colors, fonts } from '@/lib/theme';

export default function LegalScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const content = LEGAL_PAGES[page] ?? LEGAL_PAGES.mentions;
  return (
    <Screen>
      <Stack.Screen options={{ title: content.title }} />
      <Text style={styles.title}>{content.title}</Text>
      <Muted>Dernière mise à jour : {LEGAL.lastUpdate}</Muted>
      {content.sections.map((s) => (
        <Card key={s.heading}>
          <Text style={styles.heading}>{s.heading}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </Card>
      ))}
    </Screen>
  );
}

export function generateStaticParams() {
  return Object.keys(LEGAL_PAGES).map((page) => ({ page }));
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 26, fontFamily: fonts.bold },
  heading: { color: colors.text, fontSize: 17, fontFamily: fonts.bold },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
