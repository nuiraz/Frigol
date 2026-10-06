import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/lib/theme';

/** Anneau de progression (chrono) avec un contenu centré. */
export function TimerRing({
  size = 240,
  stroke = 6,
  progress,
  color,
  children,
}: {
  size?: number;
  stroke?: number;
  /** De 0 (vide) à 1 (plein). */
  progress: number;
  color: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

const BAR_COUNT = 5;

/** Barres de niveau sonore animées pendant l'écoute. */
export function SoundBars({
  active,
  color = colors.text,
  height = 56,
}: {
  active: boolean;
  color?: string;
  height?: number;
}) {
  const [values] = useState(() => Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.25)));

  useEffect(() => {
    if (!active) {
      values.forEach((v) => Animated.timing(v, { toValue: 0.25, duration: 180, useNativeDriver: true }).start());
      return;
    }
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 0.55 + ((i * 41) % 45) / 100,
            duration: 170 + ((i * 59) % 130),
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.2,
            duration: 150 + ((i * 31) % 110),
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, values]);

  return (
    <View style={[styles.bars, { height }]}>
      {values.map((v, i) => (
        <Animated.View key={i} style={[styles.bar, { height, backgroundColor: color, transform: [{ scaleY: v }] }]} />
      ))}
    </View>
  );
}

/** Apparition avec rebond, rejouée à chaque changement de `key`. */
export function Pop({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [scale] = useState(() => new Animated.Value(0.6));
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 170, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);
  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>;
}

/** Une case par manche : verte si trouvée, rouge sinon, claire pour la manche en cours. */
export function RoundTrack({ total, results, current }: { total: number; results: boolean[]; current: number }) {
  return (
    <View style={styles.track}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.step,
            i < results.length && { backgroundColor: results[i] ? colors.success : colors.danger },
            i === current && i >= results.length && { backgroundColor: colors.text },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bar: { width: 9, borderRadius: 5 },
  track: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
});
