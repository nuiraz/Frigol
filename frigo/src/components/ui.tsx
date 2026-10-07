import Feather from '@expo/vector-icons/Feather';
import { useSyncExternalStore, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius } from '@/lib/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

const noop = () => () => {};
/** Faux pendant le pré-rendu web et l'hydratation, vrai ensuite. */
function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export function Icon({ name, size = 18, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  const hydrated = useHydrated();
  // La police d'icônes n'est pas connue au pré-rendu web : on réserve la place pour éviter un décalage.
  if (Platform.OS === 'web' && !hydrated) return <View style={{ width: size, height: size }} />;
  return <Feather name={name} size={size} color={color} />;
}

type Variant = 'title' | 'h2' | 'body' | 'strong' | 'label' | 'muted' | 'small';

export function Txt({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[text[variant], style]} />;
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
  edges = ['left', 'right'],
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  small,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = variant === 'primary' ? colors.onAccent : variant === 'ghost' ? colors.accent : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        { opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={small ? 15 : 18} color={fg} />}
          {!!label && <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }]}>{label}</Text>}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color = colors.text,
  size = 40,
  label,
  filled,
}: {
  icon: IconName;
  onPress?: () => void;
  color?: string;
  size?: number;
  label: string;
  filled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        filled && styles.iconButtonFilled,
        { width: size, height: size, borderRadius: size / 2, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Icon name={icon} size={size * 0.45} color={color} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.faint} {...props} style={[styles.input, props.style]} />;
}

/** Pastille sélectionnable (ingrédients, filtres). */
export function Chip({
  label,
  selected,
  onPress,
  leading,
  trailing,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leading?: string;
  trailing?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && { opacity: 0.7 }]}>
      {leading && <Text style={styles.chipEmoji}>{leading}</Text>}
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
      {trailing && <Icon name={trailing} size={14} color={selected ? colors.accent : colors.muted} />}
    </Pressable>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text style={text.h2}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Empty({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={24} color={colors.muted} />
      </View>
      <Text style={text.strong}>{title}</Text>
      {hint && <Text style={[text.muted, styles.center]}>{hint}</Text>}
    </View>
  );
}

export const text = StyleSheet.create({
  title: { fontFamily: fonts.title, color: colors.text, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.title, color: colors.text, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, color: colors.text, fontSize: 16, lineHeight: 23 },
  strong: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  label: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  muted: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12.5 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 18, width: '100%', maxWidth: 720, alignSelf: 'center' },
  fill: { flex: 1 },
  center: { textAlign: 'center' },
  button: {
    minHeight: 50,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: 14, borderRadius: radius.sm, gap: 6 },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontFamily: fonts.bold, fontSize: 16 },
  buttonTextSmall: { fontSize: 14 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  iconButtonFilled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.regular,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipEmoji: { fontSize: 15 },
  chipText: { fontFamily: fonts.medium, color: colors.text, fontSize: 14 },
  chipTextOn: { color: colors.accent, fontFamily: fonts.bold },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionAction: { fontFamily: fonts.bold, color: colors.accent, fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 20 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
