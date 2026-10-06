import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

import { Button, Card, Icon, Label, Muted, Screen } from './ui';

/** Affiche le contenu seulement si le service en ligne est configuré (et, si demandé, l'utilisateur connecté). */
export function OnlineGate({
  children,
  needAccount,
  reason,
}: {
  children: ReactNode;
  needAccount?: boolean;
  reason?: string;
}) {
  const auth = useAuth();
  if (!auth.enabled) {
    return (
      <Screen>
        <Card style={styles.center}>
          <Icon name="cloud-off" size={36} color={colors.muted} />
          <Label>Fonctions en ligne bientôt disponibles</Label>
          <Muted style={styles.text}>
            Les comptes, le classement mondial et le hub communautaire seront actifs dès que le serveur sera branché. Le
            jeu reste jouable hors ligne.
          </Muted>
        </Card>
      </Screen>
    );
  }
  if (!auth.ready) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      </Screen>
    );
  }
  if (needAccount && !auth.session) {
    return (
      <Screen>
        <Card style={styles.center}>
          <Icon name="user" size={36} color={colors.muted} />
          <Label>Connexion requise</Label>
          <Muted style={styles.text}>{reason ?? 'Connecte-toi ou crée un compte gratuit pour continuer.'}</Muted>
          <Button label="Se connecter / S’inscrire" onPress={() => router.push('/account')} style={styles.full} />
        </Card>
      </Screen>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', marginTop: 24 },
  icon: { fontSize: 48 },
  text: { textAlign: 'center' },
  full: { alignSelf: 'stretch' },
  loader: { marginTop: 60 },
});
