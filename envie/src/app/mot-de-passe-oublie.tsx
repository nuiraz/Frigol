import { useState } from 'react';

import { Field, FormScreen, Message } from '@/components/form';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function Forgot() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      await resetPassword(email);
      setMsg({ ok: true, text: 'C’est envoyé ! Ouvre le lien reçu par e-mail pour choisir un nouveau mot de passe.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Envoi impossible.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen title="Mot de passe oublié" subtitle="Indique ton e-mail : on t’envoie un lien pour en choisir un nouveau.">
      <Field label="E-mail">
        <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="toi@exemple.fr" />
      </Field>
      <Message text={msg?.text ?? null} ok={msg?.ok} />
      <Button label="Envoyer le lien" onPress={submit} loading={busy} disabled={!email} />
    </FormScreen>
  );
}
