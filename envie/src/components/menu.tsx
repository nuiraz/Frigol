import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/lib/theme';

import { Icon, type IconName } from './ui';

export function Menu({ children }: { children: ReactNode }) {
  return <View style={styles.menu}>{children}</View>;
}

export function MenuLink({ href, icon, label }: { href: Href; icon: IconName; label: string }) {
  return (
    <Link href={href} style={styles.menuItem}>
      <View style={styles.menuRow}>
        <Icon name={icon} size={18} color={colors.muted} />
        <Text style={styles.menuText}>{label}</Text>
        <Icon name="chevron-right" size={18} color={colors.faint} />
      </View>
    </Link>
  );
}

export function LegalLinks() {
  return (
    <Menu>
      <MenuLink href="/legal/mentions" icon="info" label="Mentions légales" />
      <MenuLink href="/legal/cgu" icon="file-text" label="Conditions d’utilisation" />
      <MenuLink href="/legal/cgv" icon="credit-card" label="Conditions de vente (Premium)" />
      <MenuLink href="/legal/confidentialite" icon="shield" label="Confidentialité" />
    </Menu>
  );
}

const styles = StyleSheet.create({
  menu: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  menuItem: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15, width: '100%' },
  menuText: { flex: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
});
