import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const BARS = 7;

/** Petite animation d'égaliseur affichée pendant l'écoute. */
export function Equalizer({ active, color }: { active: boolean; color: string }) {
  const [values] = useState(() => Array.from({ length: BARS }, () => new Animated.Value(0.2)));

  useEffect(() => {
    if (!active) {
      values.forEach((v) =>
        Animated.timing(v, {
          toValue: 0.2,
          duration: 200,
          useNativeDriver: true,
        }).start(),
      );
      return;
    }
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 0.4 + ((i * 37) % 60) / 100,
            duration: 180 + ((i * 53) % 140),
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.15,
            duration: 160 + ((i * 29) % 120),
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
    <View style={styles.wrap}>
      {values.map((v, i) => (
        <Animated.View key={i} style={[styles.bar, { backgroundColor: color, transform: [{ scaleY: v }] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 110,
  },
  bar: { width: 14, height: 110, borderRadius: 7 },
});
