import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

export default function LoadingSpinner({ theme, text = 'Cargando...' }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const color = theme?.colors?.primary || '#2563EB';
  const muted = theme?.colors?.textMuted || '#64748B';
  const label = String(text || 'Cargando...').endsWith('...') ? text : `${text}...`;

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: theme?.colors?.border || '#CBD5E1',
            borderTopColor: color,
            transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
          },
        ]}
      />
      <Text style={[styles.text, { color: muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  ring: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
  },
});
