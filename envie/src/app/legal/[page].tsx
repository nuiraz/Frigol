import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LegalLinks } from '@/components/menu';
import { Empty, text } from '@/components/ui';
import { LEGAL_PAGES } from '@/lib/legal';

export default function Legal() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const content = LEGAL_PAGES[page];
  if (!content) return <Empty icon="file" title="Page introuvable" />;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: content.title }} />
      <Text style={text.title}>{content.title}</Text>
      {content.sections.map((s) => (
        <View key={s.heading} style={{ gap: 6 }}>
          <Text style={text.strong}>{s.heading}</Text>
          <Text style={text.muted}>{s.body}</Text>
        </View>
      ))}
      <LegalLinks />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
});
