import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PremiumBadge } from '@/components/premium';
import { Button, Card, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { paypalLink, PREMIUM } from '@/lib/config';
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

type Plan = 'monthly' | 'lifetime';

export default function Premium() {
  const { session, profile, premium } = useAuth();
  const [plan, setPlan] = useState<Plan>('lifetime');
  const [copied, setCopied] = useState(false);
  const until = profile?.premium_until ? new Date(profile.premium_until) : null;
  const lifetime = !!until && until.getFullYear() > 2090;
  const price = plan === 'monthly' ? PREMIUM.price : PREMIUM.lifetimePrice;

  async function pay() {
    if (!session) return router.push('/inscription');
    await WebBrowser.openBrowserAsync(paypalLink(plan === 'monthly' ? PREMIUM.monthlyAmount : PREMIUM.lifetimeAmount));
  }

  async function copyName() {
    if (Platform.OS === 'web') await navigator.clipboard?.writeText(profile?.username ?? '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <LinearGradient colors={['#3A2A0E', '#1A1424']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <PremiumBadge />
        <Text style={styles.title}>Envie Premium</Text>
        <Text style={styles.subtitle}>Encore plus d’idées, tes stats perso et des collections sans limite.</Text>
        {premium ? (
          <View style={styles.active}>
            <Text style={styles.activeText}>
              {profile?.is_admin
                ? '🛡️ Premium offert à vie (administrateur)'
                : lifetime
                  ? '✅ Premium à vie activé. Merci !'
                  : `✅ Premium actif${until ? ` jusqu’au ${until.toLocaleDateString('fr-FR')}` : ''}`}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.plans}>
              <PlanCard selected={plan === 'monthly'} onPress={() => setPlan('monthly')} name="📅 Mensuel" price={PREMIUM.price} detail="par mois" />
              <PlanCard
                selected={plan === 'lifetime'}
                onPress={() => setPlan('lifetime')}
                name="💎 À vie"
                price={PREMIUM.lifetimePrice}
                detail="une seule fois, pour toujours"
                tag="Meilleure offre"
              />
            </View>
            <Button
              label={session ? `Payer ${price} avec PayPal` : 'Créer un compte pour commencer'}
              icon={session ? 'external-link' : 'user-plus'}
              onPress={pay}
            />
          </>
        )}
      </LinearGradient>

      {!premium && (
        <Card>
          <Text style={text.strong}>💳 Comment ça marche ?</Text>
          <Text style={text.muted}>1️⃣ Paie {price} sur PayPal (paypal.me/{PREMIUM.paypal}).</Text>
          <Text style={text.muted}>
            2️⃣ Écris ton pseudo dans le message du paiement :{' '}
            <Text style={styles.pseudo} onPress={copyName}>
              {profile?.username ?? 'ton pseudo'}
            </Text>
            {copied ? <Text style={{ color: colors.good }}> (copié)</Text> : null}
          </Text>
          <Text style={text.muted}>3️⃣ Ton Premium est activé dès réception, en général sous 24 h.</Text>
          {plan === 'monthly' && (
            <Text style={text.small}>Le mensuel n’est pas prélevé automatiquement : il se règle à nouveau chaque mois.</Text>
          )}
          <Button label="Conditions de vente" variant="ghost" small onPress={() => router.push('/legal/cgv')} style={{ alignSelf: 'flex-start' }} />
        </Card>
      )}

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
    </ScrollView>
  );
}

function PlanCard({
  selected,
  onPress,
  name,
  price,
  detail,
  tag,
}: {
  selected: boolean;
  onPress: () => void;
  name: string;
  price: string;
  detail: string;
  tag?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.plan, selected && styles.planOn, pressed && { opacity: 0.85 }]}>
      {tag && <Text style={styles.planTag}>⭐ {tag}</Text>}
      <Text style={styles.planName}>{name}</Text>
      <Text style={styles.planPrice}>{price}</Text>
      <Text style={styles.per}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 56, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
  hero: { borderRadius: radius.lg, padding: 22, gap: 12, borderWidth: 1, borderColor: '#F59E0B55' },
  title: { fontFamily: fonts.bold, color: '#FDE68A', fontSize: 32, letterSpacing: -1 },
  subtitle: { fontFamily: fonts.regular, color: '#E7E0D2', fontSize: 15.5, lineHeight: 22 },
  plans: { flexDirection: 'row', gap: 10 },
  plan: { flex: 1, borderRadius: radius.md, borderWidth: 1.5, borderColor: '#F59E0B44', padding: 14, gap: 3, backgroundColor: 'rgba(0,0,0,0.25)' },
  planOn: { borderColor: '#FBBF24', backgroundColor: 'rgba(251,191,36,0.12)' },
  planTag: { fontFamily: fonts.bold, color: '#FBBF24', fontSize: 11.5 },
  planName: { fontFamily: fonts.bold, color: '#FDE68A', fontSize: 14 },
  planPrice: { fontFamily: fonts.bold, color: '#fff', fontSize: 30, letterSpacing: -1 },
  pseudo: { fontFamily: fonts.bold, color: colors.accent, textDecorationLine: 'underline' },
  per: { fontFamily: fonts.medium, color: '#D6CFC0', fontSize: 14 },
  active: { backgroundColor: '#14301F', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#4ADE8055' },
  activeText: { fontFamily: fonts.bold, color: colors.good, fontSize: 14.5 },
  feature: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
});
