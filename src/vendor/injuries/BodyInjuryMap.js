import { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { useTheme } from 'styled-components';
import bodyFrontImage from '@/assets/injuries/body-front.png';
import bodyBackImage from '@/assets/injuries/body-back.png';

const zonePair = (leftCx, rightCx, cy, rx, ry) => [
  { cx: leftCx, cy, rx, ry },
  { cx: rightCx, cy, rx, ry },
];

const FRONT_ZONES = {
  cabeza: [{ cx: 90, cy: 38, rx: 20, ry: 23 }],
  cuello: [{ cx: 90, cy: 72, rx: 14, ry: 12 }],
  hombro: zonePair(49, 133, 93, 18, 13),
  brazo: zonePair(42, 139, 145, 12, 36),
  antebrazo: zonePair(33, 147, 184, 10, 27),
  muneca: zonePair(27, 153, 198, 10, 7),
  mano: zonePair(26, 154, 214, 12, 15),
  abdomen: [{ cx: 90, cy: 142, rx: 27, ry: 37 }],
  cadera: zonePair(54, 126, 205, 18, 22),
  psoas: zonePair(61, 120, 188, 13, 25),
  pubis: [{ cx: 90, cy: 212, rx: 15, ry: 12 }],
  aductor: zonePair(79, 101, 248, 11, 34),
  cuadriceps: zonePair(69, 116, 248, 14, 36),
  rodilla: zonePair(69, 117, 294, 11, 10),
  espinilla: zonePair(68, 118, 352, 10, 34),
  tobillo: zonePair(68, 117, 374, 10, 11),
};

const BACK_ZONES = {
  cabeza: [{ cx: 90, cy: 38, rx: 20, ry: 23 }],
  cuello: [{ cx: 90, cy: 72, rx: 15, ry: 13 }],
  hombro: zonePair(45, 133, 93, 18, 13),
  espalda: [{ cx: 90, cy: 137, rx: 33, ry: 48 }],
  columna: [{ cx: 88, cy: 121, rx: 7, ry: 50 }],
  gluteo: zonePair(66, 115, 212, 21, 23),
  isquio: zonePair(62, 109, 262, 14, 37),
  gemelo: zonePair(61, 110, 328, 13, 30),
  aquiles: zonePair(60, 110, 375, 7, 20),
  tobillo: zonePair(58, 112, 386, 10, 9),
};

const getZoneValue = (injury) => {
  if (!injury?.zona) return '';
  if (typeof injury.zona === 'string') return injury.zona;
  return injury.zona.value || injury.zona.label || '';
};

const getZoneLabel = (injury, t) => {
  const value = getZoneValue(injury);
  if (!value) return 'Sin zona';
  const fallback = injury?.zona?.label || value;
  let label = t ? t(`injury.zones.${value}`, fallback) : fallback;
  if (injury?.lado) {
    const sideLabel = injury.lado === 'derecha'
      ? (t ? t('injury.sideRight', 'Derecha') : 'Derecha')
      : (t ? t('injury.sideLeft', 'Izquierda') : 'Izquierda');
    label = `${label} (${sideLabel})`;
  }
  if (injury?.lesionEspecifica) label = `${label} - ${injury.lesionEspecifica}`;
  return label;
};

const getInjuryColor = (injury) => {
  if (injury?.fechaFin) {
    const endDate = new Date(injury.fechaFin);
    if (endDate <= new Date()) return '#10b981';
  }
  if (injury?.fechaFinPrevista) return '#f59e0b';
  return '#ef4444';
};

const getInjuryStatusLabel = (injury, t) => {
  if (injury?.fechaFin) {
    const endDate = new Date(injury.fechaFin);
    if (endDate <= new Date()) return t ? t('injury.statusRecovered', 'Recuperada') : 'Recuperada';
  }
  if (injury?.fechaFinPrevista) return t ? t('injury.statusRecovering', 'Recuperación') : 'Recuperación';
  return t ? t('injury.statusActive', 'Activa') : 'Activa';
};

const uniqueByZone = (injuries) => {
  const map = new Map();
  (injuries || []).forEach((injury) => {
    const zone = getZoneValue(injury);
    if (!zone) return;
    const key = `${zone}-${injury.lado || ''}-${injury.lesionEspecifica || ''}`;
    const current = map.get(key);
    if (!current || getInjuryColor(injury) === '#ef4444') map.set(key, injury);
  });
  return [...map.values()];
};

const shapesForSide = (shapes, side, laterality) => {
  if (shapes.length !== 2 || !laterality) return shapes;
  if (side === 'front') return laterality === 'derecha' ? [shapes[0]] : [shapes[1]];
  return laterality === 'derecha' ? [shapes[1]] : [shapes[0]];
};

function BodyFigure({ side, injuries, compact, theme, t }) {
  const zones = side === 'front' ? FRONT_ZONES : BACK_ZONES;
  const bodyImage = side === 'front' ? bodyFrontImage : bodyBackImage;

  return (
    <View style={styles.figurePane}>
      <Text style={styles.figureTitle}>{side === 'front' ? (t ? t('injury.bodyFront', 'FRONTAL') : 'FRONTAL') : (t ? t('injury.bodyBack', 'POSTERIOR') : 'POSTERIOR')}</Text>
      <View style={styles.bodyImageFrame}>
        <Image source={bodyImage} style={styles.bodyImage} resizeMode="contain" />
        <Svg viewBox="0 0 180 410" width="100%" height="100%" style={styles.bodyOverlay} pointerEvents="none">
          {injuries.flatMap((injury, injuryIndex) => {
            const zoneValue = getZoneValue(injury);
            const shapes = zones[zoneValue] || [];
            const color = getInjuryColor(injury);
            const displayColor = compact ? (theme.colors.primary || '#3b82f6') : color;
            return shapesForSide(shapes, side, injury.lado).map((shape, shapeIndex) => (
              <Ellipse
                key={`${zoneValue}-${injury.lado || ''}-${injuryIndex}-${shapeIndex}`}
                cx={shape.cx}
                cy={shape.cy}
                rx={shape.rx}
                ry={shape.ry}
                fill={displayColor}
                fillOpacity={compact ? "0.6" : "0.24"}
                stroke={compact ? theme.colors.primary || '#3b82f6' : color}
                strokeWidth={compact ? "4" : "3"}
              />
            ));
          })}
        </Svg>
      </View>
    </View>
  );
}

export default function BodyInjuryMap({ injuries = [], t, compact = false }) {
  const theme = useTheme();
  const markedInjuries = useMemo(() => uniqueByZone(injuries), [injuries]);

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      compact && styles.compactContainer,
    ]}>
      <View style={styles.mapGrid}>
        <BodyFigure side="front" injuries={markedInjuries} compact={compact} theme={theme} t={t} />
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        <BodyFigure side="back" injuries={markedInjuries} compact={compact} theme={theme} t={t} />
      </View>
      {!compact && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>{t ? t('injury.statusActive', 'Activa') : 'Activa'}</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} /><Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>{t ? t('injury.statusRecovering', 'Recuperación') : 'Recuperación'}</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10b981' }]} /><Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>{t ? t('injury.statusRecovered', 'Recuperada') : 'Recuperada'}</Text></View>
        </View>
      )}
      {markedInjuries.length > 0 && (
        <View style={styles.zoneTags}>
          {markedInjuries.map((injury) => {
            const displayColor = compact ? (theme.colors.primary || '#3b82f6') : getInjuryColor(injury);
            return (
              <View key={`${getZoneValue(injury)}-${injury._id || getZoneLabel(injury, t)}`} style={{ alignItems: 'center', gap: 6, flexDirection: 'row' }}>
                <View style={[styles.zoneTag, { borderColor: displayColor, backgroundColor: `${displayColor}18` }]}>
                  <Text style={[styles.zoneTagText, { color: displayColor }]}>{getZoneLabel(injury, t)}</Text>
                </View>
                {compact && (
                  <View style={[styles.zoneTag, { borderColor: getInjuryColor(injury), backgroundColor: `${getInjuryColor(injury)}18` }]}>
                    <Text style={[styles.zoneTagText, { color: getInjuryColor(injury) }]}>{getInjuryStatusLabel(injury, t)}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  compactContainer: {
    shadowOpacity: 0.04,
  },
  mapGrid: {
    flexDirection: 'row',
    minHeight: 360,
  },
  figurePane: {
    flex: 1,
    alignItems: 'center',
  },
  figureTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 8,
  },
  bodyImageFrame: {
    width: '82%',
    maxWidth: 150,
    aspectRatio: 180 / 410,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyImage: {
    width: '100%',
    height: '100%',
  },
  bodyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  divider: {
    width: 1,
    marginHorizontal: 10,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  zoneTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  zoneTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  zoneTagText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
