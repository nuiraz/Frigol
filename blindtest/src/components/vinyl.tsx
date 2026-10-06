import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { shade } from '@/lib/theme';

/** Disque vinyle qui tourne pendant l'écoute. */
export function Vinyl({
  active,
  color,
  size = 180,
  label,
}: {
  active: boolean;
  color: string;
  size?: number;
  label?: string;
}) {
  const [spin] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!active) return;
    const rotation = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
    );
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 260, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]),
    );
    spin.setValue(0);
    rotation.start();
    beat.start();
    return () => {
      rotation.stop();
      beat.stop();
      pulse.setValue(1);
    };
  }, [active, spin, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const grooves = [0.92, 0.8, 0.68, 0.56];

  return (
    <Animated.View
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          boxShadow: active ? `0 0 40px ${color}88` : `0 0 18px ${color}33`,
          transform: [{ rotate }, { scale: pulse }],
        },
      ]}>
      {grooves.map((g) => (
        <View key={g} style={[styles.groove, { width: size * g, height: size * g, borderRadius: (size * g) / 2 }]} />
      ))}
      <View
        style={[
          styles.label,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: color,
            borderColor: shade(color, 0.3),
          },
        ]}>
        {label ? <Text style={[styles.labelText, { fontSize: size * 0.11 }]}>{label}</Text> : null}
        <View style={styles.hole} />
      </View>
      <View style={[styles.shine, { width: size, height: size, borderRadius: size / 2 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  disc: { backgroundColor: '#0E0E12', alignItems: 'center', justifyContent: 'center' },
  groove: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  label: { alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  labelText: { position: 'absolute', top: '14%' },
  hole: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0E0E12' },
  shine: {
    position: 'absolute',
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
});
