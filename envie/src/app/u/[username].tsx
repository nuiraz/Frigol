import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { ProfileView } from '@/components/profile-view';
import { Empty } from '@/components/ui';
import type { Profile } from '@/lib/auth';
import { profileByUsername } from '@/lib/db';
import { colors } from '@/lib/theme';

export default function PublicProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    profileByUsername(username)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [username]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: username }} />
      {profile === undefined ? (
        <ActivityIndicator color={colors.accent} />
      ) : profile ? (
        <ProfileView profile={profile} />
      ) : (
        <Empty icon="user-x" title="Membre introuvable" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
});
