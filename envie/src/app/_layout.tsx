import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable } from 'react-native';

import { Icon } from '@/components/ui';

import { AuthProvider, useAuth } from '@/lib/auth';
import { CatalogProvider } from '@/lib/catalog';
import { ListsProvider } from '@/lib/lists';
import { colors, fonts } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, primary: colors.accent, border: colors.border },
};

/** Sur le web, une page ouverte directement (lien partagé) n'a pas d'historique : on propose l'accueil. */
function WebBack({ canGoBack }: { canGoBack?: boolean }) {
  return (
    <Pressable
      onPress={() => (canGoBack ? router.back() : router.replace('/'))}
      accessibilityLabel={canGoBack ? 'Retour' : 'Accueil'}
      hitSlop={10}
      style={{ paddingHorizontal: 12 }}>
      <Icon name={canGoBack ? 'arrow-left' : 'home'} size={22} />
    </Pressable>
  );
}

/** Arrivée par le lien « mot de passe oublié » : on ouvre l'écran du nouveau mot de passe. */
function RecoveryRedirect() {
  const { recovering } = useAuth();
  useEffect(() => {
    if (recovering) router.replace('/nouveau-mot-de-passe');
  }, [recovering]);
  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    [fonts.regular]: DMSans_400Regular,
    [fonts.medium]: DMSans_500Medium,
    [fonts.bold]: DMSans_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AuthProvider>
      <CatalogProvider>
        <ListsProvider>
          <ThemeProvider value={theme}>
            <StatusBar style="light" />
            <RecoveryRedirect />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.text,
                headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17 },
                headerShadowVisible: false,
                headerBackButtonDisplayMode: 'minimal',
                contentStyle: { backgroundColor: colors.bg },
                ...(Platform.OS === 'web' ? { headerLeft: (p: { canGoBack?: boolean }) => <WebBack canGoBack={p.canGoBack} /> } : null),
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Envie' }} />
              <Stack.Screen name="titre/[id]" options={{ title: '' }} />
              <Stack.Screen name="avis/[id]" options={{ title: 'Avis' }} />
              <Stack.Screen name="u/[username]" options={{ title: 'Profil' }} />
              <Stack.Screen name="catalogue" options={{ title: 'Catalogue' }} />
              <Stack.Screen name="connexion" options={{ title: 'Connexion' }} />
              <Stack.Screen name="inscription" options={{ title: 'Inscription' }} />
              <Stack.Screen name="mot-de-passe-oublie" options={{ title: 'Mot de passe oublié' }} />
              <Stack.Screen name="nouveau-mot-de-passe" options={{ title: 'Nouveau mot de passe' }} />
              <Stack.Screen name="parametres" options={{ title: 'Paramètres' }} />
              <Stack.Screen name="admin" options={{ title: 'Administration' }} />
              <Stack.Screen name="premium" options={{ title: 'Premium' }} />
              <Stack.Screen name="bilan" options={{ title: 'Mon bilan' }} />
              <Stack.Screen name="collection/[id]" options={{ title: 'Collection' }} />
              <Stack.Screen name="legal/[page]" options={{ title: 'Informations légales' }} />
            </Stack>
          </ThemeProvider>
        </ListsProvider>
      </CatalogProvider>
    </AuthProvider>
  );
}
