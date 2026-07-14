import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

export default function LoadingSpinner({ theme, text = 'Cargando...' }) {
  const color = theme?.colors?.primary || '#2563EB';
  const borderColor = theme?.colors?.border || '#CBD5E1';
  const muted = theme?.colors?.textMuted || '#64748B';
  const label = String(text || 'Cargando...').endsWith('...') ? text : `${text}...`;

  return (
    <View style={styles.wrap}>
      {Platform.OS === 'web' ? (
        React.createElement(
          'svg',
          {
            width: 38,
            height: 38,
            viewBox: '0 0 38 38',
            role: 'progressbar',
            'aria-label': label,
            style: { display: 'block' },
          },
          React.createElement('circle', {
            cx: 19,
            cy: 19,
            r: 15,
            fill: 'none',
            stroke: borderColor,
            strokeWidth: 4,
          }),
          React.createElement(
            'circle',
            {
              cx: 19,
              cy: 19,
              r: 15,
              fill: 'none',
              stroke: color,
              strokeWidth: 4,
              strokeLinecap: 'round',
              strokeDasharray: '24 72',
            },
            React.createElement('animateTransform', {
              attributeName: 'transform',
              type: 'rotate',
              from: '0 19 19',
              to: '360 19 19',
              dur: '0.8s',
              repeatCount: 'indefinite',
            }),
          ),
        )
      ) : (
        <ActivityIndicator size="large" color={color} />
      )}
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
  text: {
    fontSize: 14,
    fontWeight: '800',
  },
});
