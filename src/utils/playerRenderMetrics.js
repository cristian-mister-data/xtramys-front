export function getPlayerRenderMetrics(element, scale) {
  const baseSize = (element?.baseSize || 24) + (element?.shape === 'jersey' ? 2 : 0);
  const size = baseSize * scale;
  return {
    size,
    radius: size / 2,
    nameFontSize: size * 0.36,
  };
}
