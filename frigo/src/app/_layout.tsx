import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { StorageProvider } from '@/lib/storage';
import { colors, fonts } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, primary: colors.accent },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    [fonts.title]: Fraunces_600SemiBold,
    [fonts.regular]: DMSans_400Regular,
    [fonts.medium]: DMSans_500Medium,
    [fonts.bold]: DMSans_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  // Sur le web la page est pré-rendue : on l'affiche tout de suite, les polices arrivent juste après.
  if (!loaded && !error && Platform.OS !== 'web') return null;

  return (
    <StorageProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17 },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.bg },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="recette/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="categorie/[name]" options={{ title: 'Catégorie' }} />
          <Stack.Screen name="cuisine/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        </Stack>
      </ThemeProvider>
    </StorageProvider>
  );
}
