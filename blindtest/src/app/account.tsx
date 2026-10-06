import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnlineGate } from '@/components/online-gate';
import { Button, Card, Chip, Input, Label, Muted, Row, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { confirmAction, notify } from '@/lib/dialogs';
import { getSupabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';

const AVATARS = [
  '🎧',
  '🎤',
  '🎸',
  '🥁',
  '🎹',
  '🎷',
  '🎺',
  '🎻',
  '🦊',
  '🐱',
  '🐼',
  '🦄',
  '🐸',
  '👽',
  '🤖',
  '🔥',
  '⭐',
  '👑',
];

type Mode = 'login' | 'signup' | 'forgot';

export default function AccountScreen() {
  return (
    <OnlineGate>
      <Account />
    </OnlineGate>
  );
}

function Account() {
  const auth = useAuth();
  if (auth.recovering) return <NewPassword />;
  if (auth.session) return <ProfileView />;
  return <AuthForms />;
}

function AuthForms() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async () => {
    setError('');
    setInfo('');
    const mail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError('Adresse e-mail invalide.');
    if (mode !== 'forgot' && password.length < 6) return setError('Le mot de passe doit faire au moins 6 caractères.');
    if (mode === 'signup') {
      if (!/^[A-Za-z0-9_.-]{3,20}$/.test(username.trim()))
        return setError('Pseudo : 3 à 20 caractères (lettres, chiffres, _ . -).');
      if (!accepted) return setError('Tu dois accepter les CGU et la politique de confidentialité.');
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await auth.signIn(mail, password);
        router.back();
      } else if (mode === 'signup') {
        const { needsConfirmation } = await auth.signUp(mail, password, username.trim(), avatar);
        if (needsConfirmation) {
          setInfo('Compte créé ! Clique sur le lien reçu par e-mail pour l’activer, puis connecte-toi.');
          setMode('login');
        } else {
          router.back();
        }
      } else {
        await auth.resetPassword(mail);
        setInfo('Si un compte existe pour cet e-mail, un lien pour changer le mot de passe vient d’être envoyé.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          {mode === 'login' ? 'Connexion' : mode === 'signup' ? 'Créer un compte' : 'Mot de passe oublié'}
        </Text>
        <Muted style={styles.center}>Pour apparaître dans le classement mondial et partager tes playlists.</Muted>
      </View>

      <Row style={styles.tabs}>
        <Chip label="Connexion" selected={mode === 'login'} onPress={() => setMode('login')} />
        <Chip label="Inscription" selected={mode === 'signup'} onPress={() => setMode('signup')} />
      </Row>

      <Card>
        {mode === 'signup' && (
          <>
            <Label>Pseudo</Label>
            <Input value={username} onChangeText={setUsername} placeholder="ex : DJ_Nuiraz" autoCapitalize="none" />
            <Label>Avatar</Label>
            <Row>
              {AVATARS.map((a) => (
                <Chip key={a} label={a} selected={avatar === a} onPress={() => setAvatar(a)} />
              ))}
            </Row>
          </>
        )}
        <Label>E-mail</Label>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="toi@exemple.fr"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        {mode !== 'forgot' && (
          <>
            <Label>Mot de passe</Label>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="6 caractères minimum"
              secureTextEntry
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onSubmitEditing={submit}
            />
          </>
        )}
        {mode === 'signup' && (
          <Pressable onPress={() => setAccepted(!accepted)} style={styles.consent}>
            <Text style={[styles.box, accepted && styles.boxOn]}>{accepted ? '✓' : ''}</Text>
            <Text style={styles.consentText}>
              J’accepte les{' '}
              <Link href="/legal/cgu" style={styles.link}>
                conditions d’utilisation
              </Link>{' '}
              et la{' '}
              <Link href="/legal/confidentialite" style={styles.link}>
                politique de confidentialité
              </Link>
              .
            </Text>
          </Pressable>
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}
        <Button
          label={mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien'}
          loading={busy}
          onPress={submit}
        />
        {mode === 'login' ? (
          <Button label="Mot de passe oublié ?" variant="ghost" small onPress={() => setMode('forgot')} />
        ) : mode === 'forgot' ? (
          <Button label="Retour à la connexion" variant="ghost" small onPress={() => setMode('login')} />
        ) : null}
      </Card>
    </Screen>
  );
}

function NewPassword() {
  const auth = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (password.length < 6) return notify('Mot de passe trop court', '6 caractères minimum.');
    setBusy(true);
    try {
      await auth.updatePassword(password);
      notify('C’est fait', 'Ton mot de passe a été changé.');
    } catch (e) {
      notify('Erreur', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Card>
        <Label>Nouveau mot de passe</Label>
        <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="6 caractères minimum" />
        <Button label="Enregistrer" loading={busy} onPress={save} />
      </Card>
    </Screen>
  );
}

function ProfileView() {
  const auth = useAuth();
  const profile = auth.profile;
  const [username, setUsername] = useState(profile?.username ?? '');
  const [stats, setStats] = useState<{ games: number; best: number } | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !auth.session) return;
    sb.from('scores')
      .select('score')
      .eq('user_id', auth.session.user.id)
      .then(({ data }) => {
        const scores = (data ?? []).map((r: { score: number }) => r.score);
        setStats({ games: scores.length, best: scores.length ? Math.max(...scores) : 0 });
      });
  }, [auth.session]);

  const save = async (patch: { username?: string; avatar?: string }) => {
    try {
      await auth.updateProfile(patch);
    } catch (e) {
      notify('Erreur', e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async () => {
    const ok = await confirmAction(
      'Supprimer mon compte',
      'Ton compte, tes scores et tes playlists partagées seront définitivement supprimés.',
      'Supprimer',
    );
    if (!ok) return;
    try {
      await auth.deleteAccount();
      notify('Compte supprimé', 'Toutes tes données en ligne ont été effacées.');
      router.replace('/');
    } catch (e) {
      notify('Erreur', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>{profile?.avatar ?? '?'}</Text>
        <Text style={styles.heroTitle}>{profile?.username ?? '…'}</Text>
        <Muted>{auth.session?.user.email}</Muted>
      </View>

      <Row style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{stats?.games ?? '–'}</Text>
          <Muted>parties classées</Muted>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{stats?.best ?? '–'}</Text>
          <Muted>meilleur score</Muted>
        </Card>
      </Row>

      <Button label="Voir le classement mondial" color={colors.accent} onPress={() => router.push('/leaderboard')} />

      <Card>
        <Label>Avatar</Label>
        <Row>
          {AVATARS.map((a) => (
            <Chip key={a} label={a} selected={profile?.avatar === a} onPress={() => save({ avatar: a })} />
          ))}
        </Row>
        <Label>Pseudo</Label>
        <Row style={styles.noWrap}>
          <Input value={username} onChangeText={setUsername} autoCapitalize="none" style={styles.flex} />
          <Button
            label="OK"
            small
            disabled={username.trim() === profile?.username}
            onPress={() => save({ username: username.trim() })}
          />
        </Row>
      </Card>

      <Button label="Se déconnecter" variant="secondary" onPress={() => auth.signOut()} />
      <Button label="Supprimer mon compte" variant="ghost" small onPress={remove} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, paddingVertical: 16 },
  heroIcon: { fontSize: 64 },
  heroTitle: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 40,
    lineHeight: 46,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  center: { textAlign: 'center' },
  tabs: { justifyContent: 'center' },
  consent: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    color: '#090914',
    fontFamily: fonts.bold,
    overflow: 'hidden',
  },
  boxOn: { backgroundColor: colors.success, borderColor: colors.success },
  consentText: { color: colors.muted, flex: 1, lineHeight: 20 },
  link: { color: colors.accent, textDecorationLine: 'underline' },
  error: { color: colors.danger, fontFamily: fonts.bold },
  info: { color: colors.success, fontFamily: fonts.bold },
  stats: { flexWrap: 'nowrap' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.accent, fontSize: 28, fontFamily: fonts.bold },
  noWrap: { flexWrap: 'nowrap' },
  flex: { flex: 1 },
});
