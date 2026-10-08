import { Tabs } from 'expo-router/js-tabs';
import { Platform, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { useLists } from '@/lib/lists';
import { colors, fonts } from '@/lib/theme';

function icon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon name={name} size={size - 2} color={String(color)} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { saved } = useLists();
  const todo = [...saved.values()].filter((s) => s === 'todo').length;
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
      <Tabs.Screen name="index" options={{ title: 'Découvrir', tabBarIcon: icon('zap') }} />
      <Tabs.Screen name="hub" options={{ title: 'Hub', tabBarIcon: icon('message-square') }} />
      <Tabs.Screen name="liste" options={{ title: 'Ma liste', tabBarIcon: icon('bookmark'), tabBarBadge: todo || undefined }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
