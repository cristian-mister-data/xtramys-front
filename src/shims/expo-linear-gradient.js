/** Shim de expo-linear-gradient para web. Renderiza CSS linear-gradient en un div RNW View. */
import React from 'react';
import { View } from 'react-native';

export function LinearGradient({ colors = ['#000', '#000'], start, end, locations, style, children, ...rest }) {
  // Determine angle from start/end (0..1 coords). Default top→bottom (180deg).
  let angle = 180;
  if (start && end) {
    const dx = (end.x ?? 0.5) - (start.x ?? 0.5);
    const dy = (end.y ?? 1) - (start.y ?? 0);
    angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  }
  const stops = colors.map((c, i) => {
    const loc = locations?.[i];
    return loc != null ? `${c} ${loc * 100}%` : c;
  }).join(', ');
  const bg = `linear-gradient(${angle}deg, ${stops})`;
  return <View {...rest} style={[{ backgroundImage: bg }, style]}>{children}</View>;
}
export default LinearGradient;
