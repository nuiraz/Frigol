import { router } from 'expo-router';
import { useState } from 'react';

import { Field, FormScreen, Message } from '@/components/form';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function NewPassword() {
  const { session, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    if (password.length < 6) return setMsg({ ok: false, text: 'Le mot de passe doit faire au moins 6 caractères.' });
    setBusy(true);
    try {
      await updatePassword(password);
      setMsg({ ok: true, text: 'Mot de passe modifié ✓' });
      setTimeout(() => router.replace('/'), 1200);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Modification impossible.' });
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <FormScreen title="Lien expiré" subtitle="Ce lien n’est plus valable. Demande-en un nouveau.">
        <Button label="Recevoir un nouveau lien" onPress={() => router.replace('/mot-de-passe-oublie')} />
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Nouveau mot de passe">
      <Field label="Nouveau mot de passe" hint="6 caractères minimum.">
        <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="••••••••" />
      </Field>
      <Message text={msg?.text ?? null} ok={msg?.ok} />
      <Button label="Enregistrer" onPress={submit} loading={busy} />
    </FormScreen>
  );
}
