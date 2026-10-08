import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { isPremium, type Profile } from '@/lib/auth';
import { listReviews, type Review } from '@/lib/db';
import { TYPES } from '@/lib/taxonomy';
import { colors, fonts, radius } from '@/lib/theme';
import { useLikes } from '@/lib/use-likes';

import { Avatar, ReviewCard } from './media';
import { PremiumBadge } from './premium';
import { Empty, SectionTitle, text } from './ui';

export function ProfileHeader({ profile, reviews }: { profile: Profile; reviews: Review[] }) {
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const since = new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return (
    <View style={{ gap: 16 }}>
      <View style={styles.head}>
        <Avatar value={profile.avatar} size={72} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.name}>
              {profile.username}
              {profile.is_admin ? '  🛡️' : ''}
            </Text>
            {isPremium(profile) && <PremiumBadge small />}
          </View>
          {!!profile.bio && <Text style={text.muted}>{profile.bio}</Text>}
          <Text style={text.small}>Membre depuis {since}</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat value={String(reviews.length)} label="avis" />
        <Stat value={reviews.length ? avg.toFixed(1) : '–'} label="note moyenne" />
        {TYPES.map((t) => (
          <Stat key={t.id} value={String(reviews.filter((r) => r.item_type === t.id).length)} label={t.emoji} />
        ))}
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** En-tête + avis d'un membre. */
export function ProfileView({ profile }: { profile: Profile }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { liked, toggle } = useLikes(reviews, setReviews);

  useEffect(() => {
    let alive = true;
    listReviews({ userId: profile.id, limit: 100 })
      .then((r) => alive && setReviews(r))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [profile.id]);

  return (
    <View style={{ gap: 18 }}>
      <ProfileHeader profile={profile} reviews={reviews} />
      <SectionTitle title="Ses avis" />
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : reviews.length ? (
        reviews.map((r) => <ReviewCard key={r.id} review={r} liked={liked.has(r.id)} onLike={() => toggle(r.id)} />)
      ) : (
        <Empty icon="message-square" title="Pas encore d’avis" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  name: { fontFamily: fonts.bold, color: colors.text, fontSize: 24, letterSpacing: -0.5 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 64,
    flexGrow: 1,
  },
  statValue: { fontFamily: fonts.bold, color: colors.text, fontSize: 18 },
  statLabel: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12 },
});
