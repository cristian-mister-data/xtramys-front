import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

export default function LoadingSpinner({
  theme,
  text = 'Cargando...',
  size = 38,
  strokeWidth = 4,
  hideText = false,
  gap = 12,
}) {
  const color = theme?.colors?.primary || '#2563EB';
  const borderColor = theme?.colors?.border || '#CBD5E1';
  const muted = theme?.colors?.textMuted || '#64748B';
  const label = String(text || 'Cargando...').endsWith('...') ? text : `${text}...`;
  const spinnerSize = Math.max(16, Number(size) || 38);
  const trackRadius = Math.max(6, (spinnerSize - strokeWidth * 2) / 2);
  const center = spinnerSize / 2;
  const dash = Math.max(12, Math.round(trackRadius * 1.6));
  const gapDash = Math.max(dash * 2, Math.round(trackRadius * 4.8));

  return (
    <View style={[styles.wrap, { gap }]}>
      {Platform.OS === 'web' ? (
        React.createElement(
          'svg',
          {
            width: spinnerSize,
            height: spinnerSize,
            viewBox: `0 0 ${spinnerSize} ${spinnerSize}`,
            role: 'progressbar',
            'aria-label': label,
            style: { display: 'block' },
          },
          React.createElement('circle', {
            cx: center,
            cy: center,
            r: trackRadius,
            fill: 'none',
            stroke: borderColor,
            strokeWidth,
          }),
          React.createElement(
            'circle',
            {
              cx: center,
              cy: center,
              r: trackRadius,
              fill: 'none',
              stroke: color,
              strokeWidth,
              strokeLinecap: 'round',
              strokeDasharray: `${dash} ${gapDash}`,
            },
            React.createElement('animateTransform', {
              attributeName: 'transform',
              type: 'rotate',
              from: `0 ${center} ${center}`,
              to: `360 ${center} ${center}`,
              dur: '0.8s',
              repeatCount: 'indefinite',
            }),
          ),
        )
      ) : (
        <ActivityIndicator size={spinnerSize <= 24 ? 'small' : 'large'} color={color} />
      )}
      {!hideText ? <Text style={[styles.text, { color: muted }]}>{label}</Text> : null}
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
