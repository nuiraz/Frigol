import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Field, FormScreen, Message } from '@/components/form';
import { Button, Card, Input, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { AVATARS } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function Settings() {
  const { ready, session, profile } = useAuth();
  if (ready && !session) return <Redirect href="/connexion" />;
  // Le profil peut arriver après l'ouverture de l'écran : le formulaire repart alors de ses valeurs.
  return <SettingsForm key={profile?.id ?? 'chargement'} />;
}

function SettingsForm() {
  const { profile, updateProfile, updatePassword, deleteAccount, signOut } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? '🍿');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(key: string, task: () => Promise<void>, ok: string) {
    setBusy(key);
    setMsg(null);
    try {
      await task();
      setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Une erreur est survenue.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <FormScreen title="Paramètres">
      <Card>
        <Text style={text.strong}>Ton profil</Text>
        <Field label="Avatar">
          <View style={styles.avatars}>
            {AVATARS.map((a) => (
              <Pressable key={a} onPress={() => setAvatar(a)} style={[styles.avatar, avatar === a && styles.avatarOn]} accessibilityLabel={`Avatar ${a}`}>
                <Text style={{ fontSize: 22 }}>{a}</Text>
              </Pressable>
            ))}
          </View>
        </Field>
        <Field label="Pseudo">
          <Input value={username} onChangeText={setUsername} autoCapitalize="none" maxLength={20} />
        </Field>
        <Field label="Bio" hint={`${bio.length}/200`}>
          <Input value={bio} onChangeText={setBio} maxLength={200} multiline placeholder="Fan de films d’horreur et de RPG…" style={{ minHeight: 70, textAlignVertical: 'top' }} />
        </Field>
        <Button label="Enregistrer" loading={busy === 'profile'} onPress={() => run('profile', () => updateProfile({ username, bio, avatar }), 'Profil enregistré ✓')} />
      </Card>

      <Card>
        <Text style={text.strong}>Mot de passe</Text>
        <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="Nouveau mot de passe" autoComplete="new-password" />
        <Button
          label="Changer le mot de passe"
          variant="secondary"
          disabled={password.length < 6}
          loading={busy === 'password'}
          onPress={() => run('password', async () => (await updatePassword(password), setPassword('')), 'Mot de passe modifié ✓')}
        />
      </Card>

      <Message text={msg?.text ?? null} ok={msg?.ok} />

      <Button label="Se déconnecter" icon="log-out" variant="secondary" onPress={async () => (await signOut(), router.replace('/'))} />
      <Button
        label="Supprimer mon compte"
        icon="trash-2"
        variant="ghost"
        onPress={() =>
          confirm('Supprimer ton compte ?', 'Ton profil, tes avis, tes commentaires et ta liste seront définitivement effacés.', () =>
            run('delete', async () => (await deleteAccount(), router.replace('/')), 'Compte supprimé.'),
          )
        }
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOn: { borderColor: colors.accent },
});
