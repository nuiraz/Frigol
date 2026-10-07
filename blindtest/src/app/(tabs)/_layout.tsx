import { Tabs } from 'expo-router/js-tabs';
import { Platform, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

function icon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon name={name} size={size - 2} color={String(color)} />;
  }
  return TabIcon;
}

/** Barre de navigation du bas, toujours visible sur téléphone (sauf pendant une partie). */
export default function TabsLayout() {
  const auth = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          ...(Platform.OS === 'web' ? { height: 64, paddingBottom: 8, paddingTop: 6 } : null),
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', headerShown: false, tabBarIcon: icon('home') }} />
      <Tabs.Screen
        name="play"
        options={{ title: 'Jouer', headerTitle: 'Nouvelle partie', tabBarIcon: icon('play-circle') }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: 'Classement', headerShown: false, tabBarIcon: icon('bar-chart-2') }}
      />
      <Tabs.Screen name="hub" options={{ title: 'Hub', headerShown: false, tabBarIcon: icon('globe') }} />
      <Tabs.Screen
        name="account"
        options={{
          title: auth.profile ? auth.profile.username : 'Compte',
          headerTitle: 'Compte',
          tabBarIcon: icon('user'),
        }}
      />
    </Tabs>
  );
}
