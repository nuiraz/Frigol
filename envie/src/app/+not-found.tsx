import { Stack, router } from 'expo-router';
import { View } from 'react-native';

import { Button, Empty } from '@/components/ui';
import { colors } from '@/lib/theme';

export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 20, gap: 12 }}>
      <Stack.Screen options={{ title: 'Introuvable' }} />
      <Empty icon="compass" title="Cette page n’existe pas" />
      <Button label="Retour à l’accueil" onPress={() => router.replace('/')} />
    </View>
  );
}
