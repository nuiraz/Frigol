import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, ReviewCard } from '@/components/media';
import { Button, Empty, Icon, Input, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { addComment, deleteComment, deleteReview, getReview, listComments, reportReview, type Comment, type Review } from '@/lib/db';
import { timeAgo } from '@/lib/format';
import { colors, fonts, radius } from '@/lib/theme';
import { useLikes } from '@/lib/use-likes';

export default function ReviewPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const [review, setReview] = useState<Review | null | undefined>(undefined);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const list = review ? [review] : [];
  const { liked, toggle } = useLikes(list, (fn) => setReview((r) => (r ? fn([r])[0] : r)));

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([getReview(id), listComments(id)]);
      setReview(r);
      setComments(c);
    } catch {
      setReview(null);
    }
  }, [id]);

  useEffect(() => {
    // Chargement asynchrone : l'état n'est modifié qu'à l'arrivée des données.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (review === undefined) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;
  if (!review) return <Empty icon="message-square" title="Avis introuvable" hint="Il a peut-être été supprimé." />;

  const mine = session?.user.id === review.user_id;
  const admin = !!profile?.is_admin;

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await addComment(id, body);
      setBody('');
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Impossible d’envoyer le commentaire.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ReviewCard review={review} full liked={liked.has(review.id)} onLike={() => toggle(review.id)} />

      <View style={styles.tools}>
        {(mine || admin) && (
          <Pressable
            style={styles.tool}
            onPress={() =>
              confirm('Supprimer cet avis ?', 'Il disparaîtra du hub, avec ses commentaires.', async () => {
                await deleteReview(review.id).catch(() => {});
                router.back();
              })
            }>
            <Icon name="trash-2" size={15} color={colors.bad} />
            <Text style={[styles.toolText, { color: colors.bad }]}>Supprimer</Text>
          </Pressable>
        )}
        {session && !mine && (
          <Pressable
            style={styles.tool}
            onPress={() =>
              confirm('Signaler cet avis ?', 'Un administrateur va le vérifier.', async () => {
                try {
                  await reportReview(review.id, 'Signalé depuis l’app');
                  setNotice('Merci, l’avis a été signalé.');
                } catch {
                  setNotice('Signalement impossible pour le moment.');
                }
              })
            }>
            <Icon name="flag" size={15} color={colors.muted} />
            <Text style={styles.toolText}>Signaler</Text>
          </Pressable>
        )}
      </View>
      {notice && <Text style={styles.notice}>{notice}</Text>}

      <Text style={text.h2}>Commentaires ({comments.length})</Text>
      {comments.map((c) => (
        <View key={c.id} style={styles.comment}>
          <Link href={c.profiles ? `/u/${c.profiles.username}` : '/hub'} asChild>
            <Pressable>
              <Avatar value={c.profiles?.avatar} size={30} />
            </Pressable>
          </Link>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.commentAuthor}>
              {c.profiles?.username ?? 'Membre supprimé'} <Text style={styles.commentDate}>· {timeAgo(c.created_at)}</Text>
            </Text>
            <Text style={text.body}>{c.body}</Text>
          </View>
          {(c.user_id === session?.user.id || admin) && (
            <Pressable
              hitSlop={8}
              accessibilityLabel="Supprimer le commentaire"
              onPress={() => confirm('Supprimer ce commentaire ?', '', async () => (await deleteComment(c.id).catch(() => {}), load()))}>
              <Icon name="x" size={16} color={colors.faint} />
            </Pressable>
          )}
        </View>
      ))}
      {!comments.length && <Text style={text.muted}>Aucun commentaire. Lance la discussion !</Text>}

      {session ? (
        <View style={{ gap: 10 }}>
          <Input value={body} onChangeText={setBody} placeholder="Écris un commentaire…" multiline maxLength={1000} style={{ minHeight: 70, textAlignVertical: 'top' }} />
          <Button label="Envoyer" icon="send" onPress={send} loading={busy} disabled={!body.trim()} />
        </View>
      ) : (
        <Button label="Connecte-toi pour commenter" variant="secondary" onPress={() => router.push('/connexion')} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  tools: { flexDirection: 'row', gap: 18, justifyContent: 'flex-end' },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13 },
  notice: { fontFamily: fonts.medium, color: colors.good, fontSize: 14 },
  comment: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentAuthor: { fontFamily: fonts.bold, color: colors.text, fontSize: 14 },
  commentDate: { fontFamily: fonts.regular, color: colors.faint, fontSize: 12 },
});
