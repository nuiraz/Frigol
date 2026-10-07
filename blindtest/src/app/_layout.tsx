import { Anton_400Regular } from '@expo-google-fonts/anton/400Regular';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { CatalogSync } from '@/components/catalog-sync';
import { Icon } from '@/components/ui';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Retour à l'écran précédent, ou à l'accueil si on est arrivé directement par un lien. */
function HeaderBack() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={10}
      accessibilityLabel="Retour"
      style={styles.headerButton}>
      <Icon name="arrow-left" size={22} color={colors.text} />
    </Pressable>
  );
}

function HeaderHome() {
  return (
    <Pressable
      onPress={() => router.dismissTo('/')}
      hitSlop={10}
      accessibilityLabel="Accueil"
      style={styles.headerButton}>
      <Icon name="home" size={20} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ headerButton: { paddingHorizontal: 8, paddingVertical: 4 } });

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

  // Sur le web, la page est pré-rendue : on l'affiche tout de suite (les polices arrivent juste après).
  if (!loaded && !error && Platform.OS !== 'web') return null;

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
              headerLeft: () => <HeaderBack />,
              headerRight: () => <HeaderHome />,
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="setup" options={{ title: 'Nouvelle partie' }} />
            <Stack.Screen name="game" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="share" options={{ title: 'Inviter' }} />
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
