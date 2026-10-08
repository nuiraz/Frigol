import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PremiumBadge } from '@/components/premium';
import { Button, Card, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { LEGAL, PREMIUM } from '@/lib/config';
import { colors, fonts, radius } from '@/lib/theme';

const FEATURES: [string, string, string][] = [
  ['🎲', '5 idées d’un coup', 'Un pack de 5 suggestions à chaque tirage, pour choisir à plusieurs.'],
  ['🎛️', 'Filtres avancés', 'Par décennie et par note de la communauté (7+ seulement).'],
  ['📁', 'Collections illimitées', 'Autant de listes perso que tu veux (3 en gratuit), publiques ou privées.'],
  ['📊', 'Mon bilan', 'Tes stats : avis par univers, genres préférés, répartition de tes notes, ton top.'],
  ['📔', 'Journal privé', 'La date et tes impressions sur chaque titre, visibles par toi seul.'],
  ['📤', 'Export de ta liste', 'Partage ou copie ta liste en un clic, triée par univers.'],
  ['✨', 'Badge Premium', 'Ton pseudo brille sur le hub, tes avis et ton profil.'],
  ['❤️', 'Tu soutiens Envie', 'Pas de pub, pas de revente de données : c’est toi qui fais vivre l’app.'],
];

export default function Premium() {
  const { session, profile, premium } = useAuth();
  const until = profile?.premium_until ? new Date(profile.premium_until) : null;

  async function subscribe() {
    if (!session) return router.push('/inscription');
    if (!PREMIUM.paymentLink) {
      return Linking.openURL(
        `mailto:${LEGAL.contactEmail}?subject=${encodeURIComponent('Abonnement Premium Envie')}&body=${encodeURIComponent(`Bonjour, je souhaite passer Premium. Mon pseudo : ${profile?.username ?? ''}`)}`,
      ).catch(() => {});
    }
    const email = session.user.email ? `?prefilled_email=${encodeURIComponent(session.user.email)}` : '';
    await WebBrowser.openBrowserAsync(`${PREMIUM.paymentLink}${email}`);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <LinearGradient colors={['#3A2A0E', '#1A1424']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <PremiumBadge />
        <Text style={styles.title}>Envie Premium</Text>
        <Text style={styles.subtitle}>Encore plus d’idées, tes stats perso et des collections sans limite.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={styles.price}>{PREMIUM.price}</Text>
          <Text style={styles.per}>/ {PREMIUM.period} · sans engagement</Text>
        </View>
        {premium ? (
          <View style={styles.active}>
            <Text style={styles.activeText}>
              {profile?.is_admin
                ? '🛡️ Premium offert à vie (administrateur)'
                : `✅ Premium actif${until ? ` jusqu’au ${until.toLocaleDateString('fr-FR')}` : ''}`}
            </Text>
          </View>
        ) : (
          <Button label={session ? `Passer Premium · ${PREMIUM.price}/${PREMIUM.period}` : 'Créer un compte pour commencer'} icon="star" onPress={subscribe} />
        )}
      </LinearGradient>

      <View style={{ gap: 10 }}>
        {FEATURES.map(([emoji, name, desc]) => (
          <View key={name} style={styles.feature}>
            <Text style={{ fontSize: 26 }}>{emoji}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={text.strong}>{name}</Text>
              <Text style={text.muted}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <Card>
        <Text style={text.strong}>Comment ça marche ?</Text>
        <Text style={text.muted}>
          Le paiement est sécurisé par Stripe : Envie ne voit jamais ta carte. L’abonnement se renouvelle chaque mois et se résilie à tout moment, sans frais.
          {!PREMIUM.paymentLink ? ' Le paiement en ligne arrive bientôt : en attendant, écris-nous et l’admin active ton Premium.' : ''}
        </Text>
        <Button label="Conditions de vente" variant="ghost" small onPress={() => router.push('/legal/cgv')} style={{ alignSelf: 'flex-start' }} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 56, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
  hero: { borderRadius: radius.lg, padding: 22, gap: 12, borderWidth: 1, borderColor: '#F59E0B55' },
  title: { fontFamily: fonts.bold, color: '#FDE68A', fontSize: 32, letterSpacing: -1 },
  subtitle: { fontFamily: fonts.regular, color: '#E7E0D2', fontSize: 15.5, lineHeight: 22 },
  price: { fontFamily: fonts.bold, color: '#fff', fontSize: 40, letterSpacing: -1 },
  per: { fontFamily: fonts.medium, color: '#D6CFC0', fontSize: 14 },
  active: { backgroundColor: '#14301F', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#4ADE8055' },
  activeText: { fontFamily: fonts.bold, color: colors.good, fontSize: 14.5 },
  feature: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
});
