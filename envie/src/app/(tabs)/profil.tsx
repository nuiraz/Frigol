import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LegalLinks, Menu, MenuLink } from '@/components/menu';
import { ProfileView } from '@/components/profile-view';
import { Button, Card, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function ProfileTab() {
  const { ready, session, profile, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {!ready ? null : !session ? (
          <>
            <View style={{ gap: 6 }}>
              <Text style={text.title}>Ton compte</Text>
              <Text style={text.muted}>Gratuit, en 30 secondes.</Text>
            </View>
            <Card>
              {[
                ['⭐', 'Note les films, séries, jeux et sons'],
                ['💬', 'Publie et commente des avis sur le hub'],
                ['🔖', 'Retrouve ta liste sur téléphone et ordinateur'],
              ].map(([e, t]) => (
                <View key={t} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                  <Text style={text.body}>{t}</Text>
                </View>
              ))}
              <Button label="Créer un compte" onPress={() => router.push('/inscription')} />
              <Button label="J’ai déjà un compte" variant="secondary" onPress={() => router.push('/connexion')} />
            </Card>
          </>
        ) : profile ? (
          <>
            <ProfileView profile={profile} />
            <Menu>
              <MenuLink href="/parametres" icon="settings" label="Paramètres du compte" />
              {profile.is_admin && <MenuLink href="/admin" icon="shield" label="Administration" />}
            </Menu>
          </>
        ) : (
          <Card>
            <Text style={text.strong}>Profil introuvable</Text>
            <Text style={text.muted}>Ton compte existe mais son profil n’a pas été créé. Vérifie que le script SQL a bien été lancé dans Supabase.</Text>
          </Card>
        )}

        <LegalLinks />
        {session && <Button label="Se déconnecter" icon="log-out" variant="ghost" onPress={signOut} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
});
