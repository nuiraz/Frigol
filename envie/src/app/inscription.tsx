import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Checkbox, Field, FormScreen, InlineLink, Message } from '@/components/form';
import { Button, Card, Input, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function Signup() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    if (password.length < 6) return setError('Le mot de passe doit faire au moins 6 caractères.');
    if (password !== password2) return setError('Les deux mots de passe ne sont pas identiques.');
    if (!age || !terms) return setError('Coche les deux cases pour continuer.');
    setBusy(true);
    try {
      const { needsConfirmation } = await signUp(email, password, username);
      if (needsConfirmation) setSent(true);
      else router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <FormScreen title="Vérifie tes e-mails 📬">
        <Card>
          <Text style={text.body}>
            On t’a envoyé un lien de confirmation à <Text style={text.strong}>{email}</Text>. Clique dessus, puis reviens te connecter.
          </Text>
          <Text style={text.small}>Pense à regarder dans les spams.</Text>
        </Card>
        <Button label="Aller à la connexion" onPress={() => router.replace('/connexion')} />
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Crée ton compte" subtitle="Gratuit. Ton pseudo sera visible sur le hub.">
      <Field label="Pseudo" hint="3 à 20 caractères : lettres, chiffres, point, tiret, tiret bas.">
        <Input value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={20} placeholder="ton_pseudo" />
      </Field>
      <Field label="E-mail">
        <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="toi@exemple.fr" />
      </Field>
      <Field label="Mot de passe" hint="6 caractères minimum.">
        <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="••••••••" />
      </Field>
      <Field label="Confirme le mot de passe">
        <Input value={password2} onChangeText={setPassword2} secureTextEntry autoComplete="new-password" placeholder="••••••••" />
      </Field>
      <Checkbox checked={age} onChange={setAge}>
        J’ai au moins 15 ans (ou l’accord de mes parents).
      </Checkbox>
      <Checkbox checked={terms} onChange={setTerms}>
        J’accepte les <InlineLink href="/legal/cgu">conditions d’utilisation</InlineLink> et la{' '}
        <InlineLink href="/legal/confidentialite">politique de confidentialité</InlineLink>.
      </Checkbox>
      <Message text={error} />
      <Button label="Créer mon compte" onPress={submit} loading={busy} disabled={!username || !email || !password} />
      <Text style={text.muted}>
        Déjà inscrit ? <InlineLink href="/connexion">Connecte-toi</InlineLink>
      </Text>
    </FormScreen>
  );
}
