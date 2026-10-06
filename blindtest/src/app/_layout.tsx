import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { StoreProvider } from '@/lib/store';
import { colors } from '@/lib/theme';

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    primary: colors.primary,
  },
};

export default function RootLayout() {
  return (
    <StoreProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '800' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="setup" options={{ title: 'Nouvelle partie' }} />
          <Stack.Screen name="game" options={{ title: 'Blind Test', gestureEnabled: false }} />
          <Stack.Screen name="share" options={{ title: 'Partager' }} />
          <Stack.Screen name="admin/index" options={{ title: 'Administration' }} />
          <Stack.Screen name="admin/import" options={{ title: 'Importer une playlist' }} />
          <Stack.Screen name="admin/category/[id]" options={{ title: 'Catégorie' }} />
          <Stack.Screen name="admin/settings" options={{ title: 'Réglages' }} />
        </Stack>
      </ThemeProvider>
    </StoreProvider>
  );
}
