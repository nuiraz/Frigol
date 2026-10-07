import { useLocalSearchParams } from 'expo-router';

import { SetupScreen } from '@/components/setup-screen';

export default function Setup() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return <SetupScreen mode={mode} replace />;
}
