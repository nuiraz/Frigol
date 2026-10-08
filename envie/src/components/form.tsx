import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

import { Icon, text } from './ui';

export function FormScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Text style={text.title}>{title}</Text>
          {subtitle && <Text style={text.muted}>{subtitle}</Text>}
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={text.label}>{label}</Text>
      {children}
      {hint && <Text style={text.small}>{hint}</Text>}
    </View>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable onPress={() => onChange(!checked)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked && <Icon name="check" size={14} color="#fff" />}</View>
      <Text style={[text.muted, { flex: 1 }]}>{children}</Text>
    </Pressable>
  );
}

export function Message({ text: msg, ok }: { text: string | null; ok?: boolean }) {
  if (!msg) return null;
  return <Text style={[styles.msg, { color: ok ? colors.good : colors.bad }]}>{msg}</Text>;
}

export function InlineLink({ href, children }: { href: Href; children: ReactNode }) {
  return (
    <Link href={href} style={styles.link}>
      {children}
    </Link>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 18, width: '100%', maxWidth: 480, alignSelf: 'center' },
  check: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  msg: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  link: { fontFamily: fonts.bold, color: colors.accent },
});
