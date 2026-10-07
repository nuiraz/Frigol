import { Tabs } from 'expo-router/js-tabs';
import { Platform, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { useStorage } from '@/lib/storage';
import { colors, fonts } from '@/lib/theme';

function icon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon name={name} size={size - 2} color={String(color)} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { fridge } = useStorage();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === 'web' ? { height: 64, paddingBottom: 8, paddingTop: 6 } : null),
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarBadgeStyle: { backgroundColor: colors.accent, fontFamily: fonts.bold, fontSize: 10 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icon('home') }} />
      <Tabs.Screen
        name="frigo"
        options={{ title: 'Mon frigo', tabBarIcon: icon('box'), tabBarBadge: fridge.length || undefined }}
      />
      <Tabs.Screen name="explorer" options={{ title: 'Explorer', tabBarIcon: icon('compass') }} />
      <Tabs.Screen name="favoris" options={{ title: 'Mes recettes', tabBarIcon: icon('heart') }} />
    </Tabs>
  );
}
