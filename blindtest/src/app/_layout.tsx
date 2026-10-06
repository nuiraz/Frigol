import { Anton_400Regular } from '@expo-google-fonts/anton/400Regular';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { CatalogSync } from '@/components/catalog-sync';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, primary: colors.accent },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    [fonts.display]: Anton_400Regular,
    [fonts.regular]: DMSans_400Regular,
    [fonts.medium]: DMSans_500Medium,
    [fonts.bold]: DMSans_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <StoreProvider>
      <AuthProvider>
        <CatalogSync />
        <ThemeProvider value={theme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17 },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: colors.bg },
            }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="setup" options={{ title: 'Partie personnalisée' }} />
            <Stack.Screen name="game" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="share" options={{ title: 'Inviter' }} />
            <Stack.Screen name="account" options={{ title: 'Compte' }} />
            <Stack.Screen name="leaderboard" options={{ title: 'Classement mondial' }} />
            <Stack.Screen name="hub/index" options={{ title: 'Communauté' }} />
            <Stack.Screen name="hub/[id]" options={{ title: 'Playlist' }} />
            <Stack.Screen name="legal/[page]" options={{ title: 'Informations légales' }} />
            <Stack.Screen name="admin/index" options={{ title: 'Administration' }} />
            <Stack.Screen name="admin/import" options={{ title: 'Importer une playlist' }} />
            <Stack.Screen name="admin/category/[id]" options={{ title: 'Catégorie' }} />
            <Stack.Screen name="admin/settings" options={{ title: 'Réglages' }} />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </StoreProvider>
  );
}
