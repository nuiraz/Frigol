import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Field, FormScreen, InlineLink, Message } from '@/components/form';
import { Button, Input, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen title="Bon retour 👋" subtitle="Connecte-toi pour noter, commenter et retrouver ta liste.">
      <Field label="E-mail">
        <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="toi@exemple.fr" />
      </Field>
      <Field label="Mot de passe">
        <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" placeholder="••••••••" onSubmitEditing={submit} />
      </Field>
      <Message text={error} />
      <Button label="Se connecter" onPress={submit} loading={busy} disabled={!email || !password} />
      <InlineLink href="/mot-de-passe-oublie">Mot de passe oublié ?</InlineLink>
      <Text style={text.muted}>
        Pas encore de compte ? <InlineLink href="/inscription">Inscris-toi</InlineLink>
      </Text>
    </FormScreen>
  );
}
