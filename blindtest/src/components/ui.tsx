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
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius } from '@/lib/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

const noopSubscribe = () => () => {};

/** Faux pendant le pré-rendu web et l'hydratation, vrai ensuite. */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function Icon({ name, size = 18, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  const hydrated = useHydrated();
  // La police d'icônes n'est pas connue au pré-rendu : on réserve la place pour éviter un décalage d'hydratation.
  if (Platform.OS === 'web' && !hydrated) return <View style={{ width: size, height: size }} />;
  return <Feather name={name} size={size} color={color} />;
}

type Variant = 'display' | 'title' | 'body' | 'strong' | 'label' | 'muted' | 'small';

/** Texte typographié : toutes les polices de l'app passent par ici. */
export function Txt({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[text[variant], style]} />;
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
  edges = ['bottom', 'left', 'right'],
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  /** Couleur de fond du bouton principal (par défaut : accent). */
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  color,
  disabled,
  loading,
  small,
  style,
}: ButtonProps) {
  const fg =
    variant === 'primary'
      ? colors.onAccent
      : variant === 'danger'
        ? colors.danger
        : variant === 'ghost'
          ? colors.muted
          : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        variant === 'primary' && { backgroundColor: color ?? colors.accent },
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        { opacity: disabled ? 0.35 : pressed ? 0.75 : 1 },
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

/** Bouton rond ne contenant qu'une icône. */
export function IconButton({
  icon,
  onPress,
  color = colors.text,
  size = 40,
  label,
}: {
  icon: IconName;
  onPress?: () => void;
  color?: string;
  size?: number;
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Icon name={icon} size={size * 0.45} color={color} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[text.title, style]}>{children}</Text>;
}

/** Intitulé de section (petites capitales). */
export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[text.label, style]}>{children}</Text>;
}

export function Muted({
  children,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text style={[text.muted, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.faint} {...props} style={[styles.input, props.style]} />;
}

export function Chip({
  label,
  selected,
  onPress,
  color,
  dot,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Couleur de remplissage une fois sélectionné (par défaut : texte clair). */
  color?: string;
  /** Pastille de couleur affichée avant le texte. */
  dot?: string;
}) {
  const fill = color ?? colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: fill, borderColor: fill },
        pressed && { opacity: 0.7 },
      ]}>
      {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Choix unique sous forme de barre segmentée. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && styles.segmentOn]}>
            <Text style={[styles.segmentText, on && styles.segmentTextOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Ligne de menu : icône, titre, sous-titre, chevron. */
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  iconColor = colors.text,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  iconColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: colors.surfaceAlt }]}>
      {icon && (
        <View style={styles.listIcon}>
          <Icon name={icon} size={18} color={iconColor} />
        </View>
      )}
      <View style={styles.flex}>
        <Text style={text.strong}>{title}</Text>
        {subtitle && <Text style={text.small}>{subtitle}</Text>}
      </View>
      {right ?? (onPress && <Icon name="chevron-right" size={18} color={colors.faint} />)}
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export const text = StyleSheet.create({
  display: { fontFamily: fonts.display, color: colors.text, fontSize: 44, lineHeight: 50, textTransform: 'uppercase' },
  title: { fontFamily: fonts.bold, color: colors.text, fontSize: 22, letterSpacing: -0.3 },
  body: { fontFamily: fonts.regular, color: colors.text, fontSize: 15, lineHeight: 21 },
  strong: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  label: {
    fontFamily: fonts.bold,
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  muted: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.regular, color: colors.muted, fontSize: 13 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  fill: { flex: 1 },
  flex: { flex: 1, gap: 2 },
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: 14, borderRadius: radius.sm, gap: 7 },
  buttonSecondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  buttonDanger: { borderWidth: 1, borderColor: `${colors.danger}66` },
  buttonText: { fontFamily: fonts.bold, fontSize: 16, textAlign: 'center' },
  buttonTextSmall: { fontSize: 14 },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: fonts.regular,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontFamily: fonts.medium, color: colors.text, fontSize: 14 },
  chipTextSelected: { color: colors.onAccent },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: { flex: 1, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center' },
  segmentOn: { backgroundColor: colors.text },
  segmentText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13 },
  segmentTextOn: { color: colors.onAccent, fontFamily: fonts.bold },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 66 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
