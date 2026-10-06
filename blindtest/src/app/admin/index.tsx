import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Icon, Input, Label, Muted, Row, Screen } from '@/components/ui';
import { useSyncStatus } from '@/components/catalog-sync';
import { adminSession } from '@/lib/admin-session';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { CATEGORY_COLORS, colors, fonts } from '@/lib/theme';

function SyncCard() {
  const auth = useAuth();
  const status = useSyncStatus();
  if (!auth.enabled) return null;
  const admin = !!auth.profile?.is_admin;
  const line = !auth.session
    ? 'Connecte-toi avec ton compte administrateur : tes catégories seront envoyées sur tous les appareils.'
    : !admin
      ? `Le compte « ${auth.profile?.username ?? ''} » n’est pas administrateur. Dans Supabase → SQL Editor, exécute : update profiles set is_admin = true where username = '${auth.profile?.username ?? 'TonPseudo'}';`
      : status === 'saving'
        ? 'Envoi des modifications…'
        : status === 'error'
          ? 'Échec de la synchronisation. Vérifie ta connexion.'
          : status === 'loading'
            ? 'Récupération du catalogue…'
            : 'Synchronisé : tous les joueurs reçoivent ces catégories, sur mobile comme sur PC.';
  const color = admin && status !== 'error' ? colors.success : status === 'error' ? colors.danger : colors.muted;
  return (
    <Card style={styles.sync}>
      <Icon name={admin ? (status === 'error' ? 'cloud-off' : 'cloud') : 'upload-cloud'} color={color} />
      <Muted style={styles.syncText}>{line}</Muted>
      {!auth.session && <Button label="Connexion" small variant="secondary" onPress={() => router.push('/account')} />}
    </Card>
  );
}

const EMOJIS = ['🎵', '🎸', '🎤', '📼', '💿', '🎹', '🥁', '🎻', '🎷', '🪩', '🎬', '📺', '🧸', '🇫🇷', '🔥', '❤️'];

export default function AdminHome() {
  const { data, addCategory } = useStore();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [unlocked, setUnlocked] = useState(adminSession.isUnlocked());
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  if (!unlocked) {
    const tryUnlock = () => {
      if (pin === data.settings.adminPin) {
        adminSession.unlock();
        if (next) router.replace(next as Href);
        else setUnlocked(true);
      } else {
        setPinError(true);
        setPin('');
      }
    };
    return (
      <Screen>
        <Card style={styles.pinCard}>
          <Icon name="lock" size={32} color={colors.muted} />
          <Label>Code administrateur</Label>
          <Input
            value={pin}
            onChangeText={(v) => {
              setPin(v);
              setPinError(false);
            }}
            placeholder="••••"
            secureTextEntry
            keyboardType="number-pad"
            onSubmitEditing={tryUnlock}
            style={styles.pinInput}
            autoFocus
          />
          {pinError && <Text style={styles.error}>Code incorrect</Text>}
          <Button label="Déverrouiller" onPress={tryUnlock} style={styles.full} />
          <Muted>Code par défaut : 1234 (à changer dans les réglages)</Muted>
        </Card>
      </Screen>
    );
  }

  const create = () => {
    if (!name.trim()) return;
    const id = addCategory({ name: name.trim(), emoji, color });
    setName('');
    router.push({ pathname: '/admin/category/[id]', params: { id } });
  };

  return (
    <Screen>
      <SyncCard />
      <Button
        label="Importer une playlist YouTube Music"
        icon="download"
        onPress={() => router.push('/admin/import')}
      />
      <Card>
        <Label>Nouvelle catégorie (vide)</Label>
        <Input value={name} onChangeText={setName} placeholder="ex : Rap FR, Années 90, Dessins animés…" />
        <Row>
          {EMOJIS.map((e) => (
            <Chip key={e} label={e} selected={emoji === e} onPress={() => setEmoji(e)} />
          ))}
        </Row>
        <Row>
          {CATEGORY_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}
            />
          ))}
        </Row>
        <Button label="Créer la catégorie" color={color} disabled={!name.trim()} onPress={create} />
      </Card>

      <Label>Catégories ({data.categories.length})</Label>
      {data.categories.map((c) => {
        const blocked = c.tracks.filter((t) => t.blocked).length;
        const disabled = c.tracks.filter((t) => t.disabled).length;
        return (
          <Pressable
            key={c.id}
            onPress={() =>
              router.push({
                pathname: '/admin/category/[id]',
                params: { id: c.id },
              })
            }
            style={({ pressed }) => [styles.category, { borderLeftColor: c.color }, pressed && styles.pressed]}>
            <Text style={styles.catEmoji}>{c.emoji}</Text>
            <View style={styles.flex}>
              <Text style={styles.catName}>{c.name}</Text>
              <Muted>
                {c.tracks.length} morceaux · {c.sources.length} playlist
                {c.sources.length > 1 ? 's' : ''}
                {blocked ? ` · ${blocked} bloqué${blocked > 1 ? 's' : ''}` : ''}
                {disabled ? ` · ${disabled} désactivé${disabled > 1 ? 's' : ''}` : ''}
              </Muted>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        );
      })}

      <Button label="Réglages, sauvegarde & code" variant="secondary" onPress={() => router.push('/admin/settings')} />
      <Button
        label="Verrouiller"
        variant="ghost"
        small
        onPress={() => {
          adminSession.lock();
          setUnlocked(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sync: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  syncText: { flex: 1 },
  pinCard: { alignItems: 'center', marginTop: 40 },
  lock: { fontSize: 48 },
  pinInput: { width: 180, textAlign: 'center', fontSize: 24, letterSpacing: 8 },
  error: { color: colors.danger, fontFamily: fonts.bold },
  full: { alignSelf: 'stretch' },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  swatchOn: { borderWidth: 3, borderColor: colors.text },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 6,
  },
  pressed: { opacity: 0.7 },
  catEmoji: { fontSize: 30 },
  catName: { color: colors.text, fontSize: 17, fontFamily: fonts.bold },
  chevron: { color: colors.muted, fontSize: 28 },
  flex: { flex: 1 },
});
