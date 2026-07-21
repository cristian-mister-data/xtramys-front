import React from 'react';
import { View, Pressable, Image, Platform } from 'react-native';
import i18n from '@/i18n';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import * as FileSystem from 'expo-file-system/legacy';
import { ratioToDisplay } from '../fields';
import ballImage from '@/images/ball.png';
export function TouchableOpacity({
  activeOpacity = 0.2,
  style,
  onPress,
  disabled,
  children,
  ...props
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        style,
        pressed &&
          !disabled && {
            opacity: activeOpacity,
          },
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      {...props}
    >
      {children}
    </Pressable>
  );
}
export const FIELD_CAPTURE_BACKGROUND = '#4a8c3f';
export const FIELD_CAPTURE_OPTIONS = {
  format: 'png',
  quality: 1,
  backgroundColor: FIELD_CAPTURE_BACKGROUND,
  pixelRatio: 3,
};
export const REFERENCE_WIDTH = 1280;
export const noTextSelectionStyle =
  Platform.OS === 'web'
    ? {
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        touchAction: 'none',
      }
    : {};
export function getFieldCaptureOptions(extraOptions = {}) {
  return Platform.OS === 'web'
    ? {
        ...FIELD_CAPTURE_OPTIONS,
        result: 'base64',
        ...extraOptions,
      }
    : {
        ...FIELD_CAPTURE_OPTIONS,
        ...extraOptions,
      };
}
export async function captureViewShotBase64(viewShotRef, extraOptions = {}) {
  const ref = viewShotRef?.current || viewShotRef;
  if (!ref?.capture) return '';
  const captured = await ref.capture(getFieldCaptureOptions(extraOptions));
  if (typeof captured === 'string') {
    if (captured.startsWith('data:')) {
      const commaIndex = captured.indexOf(',');
      return commaIndex >= 0 ? captured.slice(commaIndex + 1) : captured;
    }
    // Web shims can return raw base64 even inside a native WebView.
    if (!/^(file|content|blob|https?):/i.test(captured) && !captured.startsWith('/')) {
      return captured;
    }
    if (Platform.OS === 'web' && !/^(file|content|blob|https?):/i.test(captured)) {
      return captured;
    }
  }
  return FileSystem.readAsStringAsync(captured, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
export function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const NativeImage = globalThis?.Image;
    if (!src || typeof NativeImage !== 'function') {
      resolve(null);
      return;
    }
    const img = new NativeImage();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src.startsWith('data:') ? src : `data:image/png;base64,${src}`;
  });
}
export function normalizeElementsForCanvas(elements = []) {
  return elements
    .map((elem) => {
      const snapshot = {
        ...elem,
        baseSize: elem.baseSize || elem.size,
        baseFontSize: elem.baseFontSize || elem.fontSize || elem.size,
        number: elem.playerNumber || elem.number,
        text: elem.value || elem.text,
      };
      if (Array.isArray(elem.points) && !elem.pointsRatio) {
        snapshot.pointsRatio = elem.points.map((pt) => ({
          x: pt.x,
          y: pt.y,
        }));
      }
      if (elem.type === 'custom-shape') {
        snapshot.closed = elem.closed !== false;
      }
      if (elem.type === 'player') {
        const inferredGoalkeeper =
          elem.playerData?.posicion === 'portero' ||
          elem.playerData?.position === 'goalkeeper' ||
          elem.playerData?.demarcacion === 'POR';
        snapshot.playersWithNumber = elem.playersWithNumber;
        snapshot.isGoalkeeper = elem.preserveVisualStyle
          ? elem.isGoalkeeper === true
          : elem.isGoalkeeper || inferredGoalkeeper;
        snapshot.hasBib = elem.hasBib;
        snapshot.bibColor = elem.bibColor;
      }
      return snapshot;
    })
    .filter((elem) => {
      if (Array.isArray(elem.pointsRatio) && elem.pointsRatio.length >= 2) return true;
      return elem.xRatio !== undefined && elem.yRatio !== undefined;
    });
}

// Variable de m�dulo para proteger la selecci�n de deselecci�n inmediata
// Cuando un icono es seleccionado, se guarda el timestamp para evitar
// que el onPress del campo lo deseleccione inmediatamente
export // Variable de m�dulo para proteger la selecci�n de deselecci�n inmediata
// Cuando un icono es seleccionado, se guarda el timestamp para evitar
// que el onPress del campo lo deseleccione inmediatamente
const boardInteractionState = {
  iconSelectionTime: 0,
  tapTime: 0,
  tapId: null,
};
export function snapToHorizontalOrVertical(start, end) {
  if (!start || !end) return end;
  const dx_m = (end.x - start.x) * 105;
  const dy_m = (end.y - start.y) * 68;
  const angle_deg = (Math.atan2(dy_m, dx_m) * 180) / Math.PI;
  const absAngle = Math.abs(angle_deg);

  // Snap tolerance: 5 degrees
  const snapTol = 5;
  const snapToHoriz = absAngle <= snapTol || Math.abs(absAngle - 180) <= snapTol;
  const snapToVert = Math.abs(absAngle - 90) <= snapTol;
  const snappedEnd = {
    ...end,
  };
  if (snapToHoriz) {
    snappedEnd.y = start.y;
  } else if (snapToVert) {
    snappedEnd.x = start.x;
  }
  return snappedEnd;
}
export function fromRatioCoords(xRatio, yRatio, imageWidth, imageHeight, viewMode) {
  if (viewMode && viewMode !== 'entire') {
    return ratioToDisplay(xRatio, yRatio, viewMode, imageWidth, imageHeight);
  }
  return {
    x: xRatio * imageWidth,
    y: yRatio * imageHeight,
  };
}
export const BALL_POSITION_PRECISION = 1000;
export function clampLayoutValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
export function getSnapshotRatioPoint(ball) {
  if (!ball) return null;
  if (typeof ball.xRatio === 'number' && typeof ball.yRatio === 'number') {
    return {
      x: ball.xRatio,
      y: ball.yRatio,
    };
  }
  if (typeof ball.x === 'number' && typeof ball.y === 'number') {
    return {
      x: ball.x / REFERENCE_WIDTH,
      y: ball.y / (REFERENCE_WIDTH * 0.65),
    };
  }
  return null;
}
export function didBallMove(fromBall, toBall) {
  const from = getSnapshotRatioPoint(fromBall);
  const to = getSnapshotRatioPoint(toBall);
  if (!from || !to) return false;
  const fromX = Math.round(from.x * BALL_POSITION_PRECISION);
  const fromY = Math.round(from.y * BALL_POSITION_PRECISION);
  const toX = Math.round(to.x * BALL_POSITION_PRECISION);
  const toY = Math.round(to.y * BALL_POSITION_PRECISION);
  return fromX !== toX || fromY !== toY;
}
export function describeBallZone(point) {
  if (!point) return i18n.t('videoRecorder.ballZoneUnlocated', 'zona sin ubicar');
  const sideMap = {
    left: 'izquierda',
    center: 'central',
    right: 'derecha',
  };
  const laneMap = {
    high: 'alta',
    mid: 'media',
    low: 'baja',
  };
  const side = point.x < 0.33 ? 'left' : point.x > 0.67 ? 'right' : 'center';
  const lane = point.y < 0.33 ? 'high' : point.y > 0.67 ? 'low' : 'mid';
  const fallback = `zona ${sideMap[side]} ${laneMap[lane]}`;
  return i18n.t(`videoRecorder.ballZone.${side}_${lane}`, fallback);
}
export function getBallMotionTitle(fromBall, toBall) {
  const explicitLabel = toBall?.name || toBall?.label || fromBall?.name || fromBall?.label;
  if (explicitLabel) return explicitLabel;
  return `${i18n.t('videoRecorder.passPrefix', 'Pase')} ${describeBallZone(getSnapshotRatioPoint(fromBall))} -> ${describeBallZone(getSnapshotRatioPoint(toBall))}`;
}
export function getBallMotionSubLabel(fromBall, toBall) {
  return `${describeBallZone(getSnapshotRatioPoint(fromBall))} -> ${describeBallZone(getSnapshotRatioPoint(toBall))}`;
}
export function getKeyframeMovedBalls(keyframes) {
  if (!Array.isArray(keyframes) || keyframes.length < 2) return [];
  const fromKf = keyframes[keyframes.length - 2];
  const toKf = keyframes[keyframes.length - 1];
  const fromBalls = new Map(
    (fromKf?.elements || []).filter((el) => el.type === 'ball').map((ball) => [ball.id, ball]),
  );
  return (toKf?.elements || [])
    .filter(
      (ball) =>
        ball.type === 'ball' && fromBalls.has(ball.id) && didBallMove(fromBalls.get(ball.id), ball),
    )
    .map((ball) => ({
      ball,
      fromBall: fromBalls.get(ball.id),
      key: `${fromKf.timestamp || keyframes.length - 2}-${toKf.timestamp || keyframes.length - 1}-${ball.id}`,
      segmentIndex: keyframes.length - 2,
      trajectory: fromKf.ballTrajectoryById?.[ball.id] || fromKf.ballTrajectoryType || 'ground',
    }));
}

// Componentes memoizados para iconos SVG personalizados
export // Componentes memoizados para iconos SVG personalizados
const BallImage = React.memo(
  ({ size, rotation }) => {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            justifyContent: 'center',
            alignItems: 'center',
          },
          rotation
            ? {
                transform: [
                  {
                    rotate: `${rotation}deg`,
                  },
                ],
              }
            : undefined,
        ]}
      >
        <Image
          source={ballImage}
          style={{
            width: size,
            height: size,
            resizeMode: 'contain',
          }}
        />
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size && prevProps.rotation === nextProps.rotation,
);

// Portería grande profesional (11 jugadores) - 3D con perspectiva profesional y red
export // Portería grande profesional (11 jugadores) - 3D con perspectiva profesional y red
const GoalLargeImage = React.memo(
  ({ size, rotation }) => {
    const width = size;
    const height = size * 0.25;
    const netD = React.useMemo(() => {
      const getQuadNetPath = (p0, p1, p2, p3, uDivs = 8, vDivs = 6) => {
        const getPt = (u, v) => {
          const x = (1 - u) * ((1 - v) * p0.x + v * p3.x) + u * ((1 - v) * p1.x + v * p2.x);
          const y = (1 - u) * ((1 - v) * p0.y + v * p3.y) + u * ((1 - v) * p1.y + v * p2.y);
          return {
            x,
            y,
          };
        };
        let d = '';
        for (let i = 0; i < uDivs; i++) {
          for (let j = 0; j <= vDivs; j++) {
            const u1 = i / uDivs;
            const v1 = j / vDivs;
            if (j < vDivs) {
              const u2 = (i + 1) / uDivs;
              const v2 = (j + 1) / vDivs;
              const pt1 = getPt(u1, v1);
              const pt2 = getPt(u2, v2);
              d += `M ${pt1.x.toFixed(1)} ${pt1.y.toFixed(1)} L ${pt2.x.toFixed(1)} ${pt2.y.toFixed(1)} `;
            }
            if (j > 0) {
              const u2 = (i + 1) / uDivs;
              const v2 = (j - 1) / vDivs;
              const pt1 = getPt(u1, v1);
              const pt2 = getPt(u2, v2);
              d += `M ${pt1.x.toFixed(1)} ${pt1.y.toFixed(1)} L ${pt2.x.toFixed(1)} ${pt2.y.toFixed(1)} `;
            }
          }
        }
        return d;
      };

      // Panels for Large Goal
      const topPanel = getQuadNetPath(
        {
          x: 15,
          y: 32,
        },
        {
          x: 105,
          y: 32,
        },
        {
          x: 98,
          y: 12,
        },
        {
          x: 22,
          y: 12,
        },
        10,
        4,
      );
      const backPanel = getQuadNetPath(
        {
          x: 22,
          y: 12,
        },
        {
          x: 98,
          y: 12,
        },
        {
          x: 98,
          y: 22,
        },
        {
          x: 22,
          y: 22,
        },
        10,
        4,
      );
      const leftPanel = getQuadNetPath(
        {
          x: 15,
          y: 32,
        },
        {
          x: 22,
          y: 12,
        },
        {
          x: 22,
          y: 22,
        },
        {
          x: 15,
          y: 38,
        },
        4,
        4,
      );
      const rightPanel = getQuadNetPath(
        {
          x: 105,
          y: 32,
        },
        {
          x: 105,
          y: 38,
        },
        {
          x: 98,
          y: 22,
        },
        {
          x: 98,
          y: 12,
        },
        4,
        4,
      );
      return `${topPanel}${backPanel}${leftPanel}${rightPanel}`;
    }, []);
    return (
      <View
        style={[
          {
            width,
            height,
          },
          rotation
            ? {
                transform: [
                  {
                    rotate: `${rotation}deg`,
                  },
                ],
              }
            : undefined,
        ]}
      >
        <Svg width={width} height={height} viewBox="0 10 120 30">
          {/* Fondo translúcido de la red */}
          <Path
            d="M 15 32 L 22 12 L 98 12 L 105 32 L 105 38 L 98 22 L 22 22 L 15 38 Z"
            fill="rgba(0,0,0,0.06)"
          />

          {/* Patrón de red de diamantes */}
          <Path d={netD} stroke="#cccccc" strokeWidth="0.8" fill="none" opacity="0.65" />

          {/* Estructura de soporte posterior (metal blanco fino) */}
          <Path d="M 22 12 L 98 12" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
          <Path d="M 22 22 L 98 22" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
          <Path d="M 22 12 L 22 22" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          <Path d="M 98 12 L 98 22" stroke="#FFFFFF" strokeWidth="2" fill="none" />

          {/* Profundidad lateral */}
          <Path d="M 15 32 L 22 12" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
          <Path d="M 105 32 L 98 12" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
          <Path d="M 15 38 L 22 22" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
          <Path d="M 105 38 L 98 22" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />

          {/* Marco principal frontal (Postes y travesaño blanco grueso) */}
          <Path
            d="M 15 38 L 15 32 L 105 32 L 105 38"
            stroke="#FFFFFF"
            strokeWidth="4"
            fill="none"
            strokeLinecap="square"
          />
        </Svg>
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size && prevProps.rotation === nextProps.rotation,
);

// Portería pequeña (fútbol 7 / mini) - 3D con perspectiva profesional y red
export // Portería pequeña (fútbol 7 / mini) - 3D con perspectiva profesional y red
const GoalSmallImage = React.memo(
  ({ size, rotation }) => {
    const width = size * 0.75;
    const height = size * 0.21;
    const netD = React.useMemo(() => {
      const getQuadNetPath = (p0, p1, p2, p3, uDivs = 8, vDivs = 6) => {
        const getPt = (u, v) => {
          const x = (1 - u) * ((1 - v) * p0.x + v * p3.x) + u * ((1 - v) * p1.x + v * p2.x);
          const y = (1 - u) * ((1 - v) * p0.y + v * p3.y) + u * ((1 - v) * p1.y + v * p2.y);
          return {
            x,
            y,
          };
        };
        let d = '';
        for (let i = 0; i < uDivs; i++) {
          for (let j = 0; j <= vDivs; j++) {
            const u1 = i / uDivs;
            const v1 = j / vDivs;
            if (j < vDivs) {
              const u2 = (i + 1) / uDivs;
              const v2 = (j + 1) / vDivs;
              const pt1 = getPt(u1, v1);
              const pt2 = getPt(u2, v2);
              d += `M ${pt1.x.toFixed(1)} ${pt1.y.toFixed(1)} L ${pt2.x.toFixed(1)} ${pt2.y.toFixed(1)} `;
            }
            if (j > 0) {
              const u2 = (i + 1) / uDivs;
              const v2 = (j - 1) / vDivs;
              const pt1 = getPt(u1, v1);
              const pt2 = getPt(u2, v2);
              d += `M ${pt1.x.toFixed(1)} ${pt1.y.toFixed(1)} L ${pt2.x.toFixed(1)} ${pt2.y.toFixed(1)} `;
            }
          }
        }
        return d;
      };

      // Panels for Small Goal
      const topPanel = getQuadNetPath(
        {
          x: 10,
          y: 23,
        },
        {
          x: 70,
          y: 23,
        },
        {
          x: 65,
          y: 10,
        },
        {
          x: 15,
          y: 10,
        },
        8,
        4,
      );
      const backPanel = getQuadNetPath(
        {
          x: 15,
          y: 10,
        },
        {
          x: 65,
          y: 10,
        },
        {
          x: 65,
          y: 17,
        },
        {
          x: 15,
          y: 17,
        },
        8,
        4,
      );
      const leftPanel = getQuadNetPath(
        {
          x: 10,
          y: 23,
        },
        {
          x: 15,
          y: 10,
        },
        {
          x: 15,
          y: 17,
        },
        {
          x: 10,
          y: 28,
        },
        4,
        4,
      );
      const rightPanel = getQuadNetPath(
        {
          x: 70,
          y: 23,
        },
        {
          x: 70,
          y: 28,
        },
        {
          x: 65,
          y: 17,
        },
        {
          x: 65,
          y: 10,
        },
        4,
        4,
      );
      return `${topPanel}${backPanel}${leftPanel}${rightPanel}`;
    }, []);
    return (
      <View
        style={[
          {
            width,
            height,
          },
          rotation
            ? {
                transform: [
                  {
                    rotate: `${rotation}deg`,
                  },
                ],
              }
            : undefined,
        ]}
      >
        <Svg width={width} height={height} viewBox="0 8 80 22">
          {/* Fondo translúcido de la red */}
          <Path
            d="M 10 23 L 15 10 L 65 10 L 70 23 L 70 28 L 65 17 L 15 17 L 10 28 Z"
            fill="rgba(0,0,0,0.06)"
          />

          {/* Patrón de red de diamantes */}
          <Path d={netD} stroke="#cccccc" strokeWidth="0.75" fill="none" opacity="0.65" />

          {/* Estructura de soporte posterior (metal naranja fino) */}
          <Path d="M 15 10 L 65 10" stroke="#FF6B00" strokeWidth="2" fill="none" />
          <Path d="M 15 17 L 65 17" stroke="#FF6B00" strokeWidth="2" fill="none" />
          <Path d="M 15 10 L 15 17" stroke="#FF6B00" strokeWidth="1.5" fill="none" />
          <Path d="M 65 10 L 65 17" stroke="#FF6B00" strokeWidth="1.5" fill="none" />

          {/* Profundidad lateral */}
          <Path d="M 10 23 L 15 10" stroke="#FF6B00" strokeWidth="2" fill="none" />
          <Path d="M 70 23 L 65 10" stroke="#FF6B00" strokeWidth="2" fill="none" />
          <Path d="M 10 28 L 15 17" stroke="#FF6B00" strokeWidth="2" fill="none" />
          <Path d="M 70 28 L 65 17" stroke="#FF6B00" strokeWidth="2" fill="none" />

          {/* Marco principal frontal (Postes y travesaño naranja grueso) */}
          <Path
            d="M 10 28 L 10 23 L 70 23 L 70 28"
            stroke="#FF6B00"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="square"
          />
        </Svg>
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size && prevProps.rotation === nextProps.rotation,
);

// Valla/Barrera de entrenamiento (antes era "goal")
export // Valla/Barrera de entrenamiento (antes era "goal")
const BarrierImage = React.memo(
  ({ size, rotation, color = '#FFFFFF' }) => {
    const width = size;
    const height = size * 0.4;
    return (
      <View
        style={[
          {
            width,
            height,
          },
          rotation
            ? {
                transform: [
                  {
                    rotate: `${rotation}deg`,
                  },
                ],
              }
            : undefined,
        ]}
      >
        <Svg width={width} height={height} viewBox="0 0 100 40">
          {/* Valla - 3 lados */}
          <Path d="M 5 35 L 5 8 L 95 8 L 95 35" stroke={color} strokeWidth="3" fill="none" />
        </Svg>
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size &&
    prevProps.rotation === nextProps.rotation &&
    prevProps.color === nextProps.color,
);

// Maniqu� de entrenamiento
export // Maniqu� de entrenamiento
const DummyImage = React.memo(
  ({ size, rotation, color = '#2196F3' }) => {
    const width = size * 0.5;
    const height = size;
    // Calcular color m�s oscuro para el borde
    const darkerColor = color === '#2196F3' ? '#1565C0' : color;
    return (
      <View
        style={[
          {
            width,
            height,
          },
          rotation
            ? {
                transform: [
                  {
                    rotate: `${rotation}deg`,
                  },
                ],
              }
            : undefined,
        ]}
      >
        <Svg width={width} height={height} viewBox="0 0 40 80">
          {/* Base/soporte */}
          <Circle cx="20" cy="75" r="8" fill="#333333" />
          {/* Poste central */}
          <Rect x="18" y="25" width="4" height="50" fill="#444444" />
          {/* Torso del maniqu� */}
          <Path
            d="M 8 25 Q 20 20 32 25 L 30 50 Q 20 52 10 50 Z"
            fill={color}
            stroke={darkerColor}
            strokeWidth="1"
          />
          {/* Hombros */}
          <Path
            d="M 5 28 Q 20 22 35 28"
            stroke={darkerColor}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          {/* Cabeza */}
          <Circle cx="20" cy="12" r="10" fill="#FFE0B2" stroke="#FFCC80" strokeWidth="1" />
        </Svg>
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size &&
    prevProps.rotation === nextProps.rotation &&
    prevProps.color === nextProps.color,
);

// Pica (palo con cono)
export // Pica (palo con cono)
const PoleImage = React.memo(
  ({ size, rotation, color = '#FFD700' }) => {
    const width = size * 0.3;
    const height = size;
    return (
      <View
        style={[
          {
            width,
            height,
          },
          rotation
            ? {
                transform: [
                  {
                    rotate: `${rotation}deg`,
                  },
                ],
              }
            : undefined,
        ]}
      >
        <Svg width={width} height={height} viewBox="0 0 24 80">
          {/* Palo vertical */}
          <Rect x="10" y="5" width="4" height="60" fill={color} />
          {/* Cono peque�o en la base */}
          <Path d="M 4 75 L 12 55 L 20 75 Z" fill="#FF6B00" stroke="#E65100" strokeWidth="1" />
          {/* Base del cono */}
          <Rect x="2" y="73" width="20" height="4" fill="#E65100" rx="1" />
        </Svg>
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size &&
    prevProps.rotation === nextProps.rotation &&
    prevProps.color === nextProps.color,
);

// Cono de f�tbol profesional
export // Cono de f�tbol profesional
const ConeProImage = React.memo(
  ({ size, color = '#FF6B00' }) => {
    const width = size;
    const height = size;
    return (
      <View
        style={{
          width,
          height,
        }}
      >
        <Svg width={width} height={height} viewBox="0 0 50 50">
          {/* Cono con degradado visual */}
          <Path d="M 10 45 L 25 8 L 40 45 Z" fill={color} stroke="#000" strokeWidth="1" />
          {/* L�neas blancas reflectantes */}
          <Path
            d="M 15 38 L 25 15 L 35 38"
            stroke="#FFFFFF"
            strokeWidth="2"
            fill="none"
            opacity="0.7"
          />
          {/* Base del cono */}
          <Rect
            x="8"
            y="43"
            width="34"
            height="5"
            fill={color}
            stroke="#000"
            strokeWidth="1"
            rx="1"
          />
          {/* Highlight */}
          <Path d="M 18 35 L 25 18" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
        </Svg>
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size && prevProps.color === nextProps.color,
);

// Cono plano/disco (peque�o y circular)
export // Cono plano/disco (peque�o y circular)
const ConeFlatImage = React.memo(
  ({ size, color = '#FF6B00' }) => {
    const actualSize = size || 18;
    return (
      <View
        style={{
          width: actualSize,
          height: actualSize * 0.5,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Svg width={actualSize} height={actualSize * 0.5} viewBox="0 0 40 20">
          {/* Elipse principal del disco */}
          <Path d="M 2 14 Q 20 22 38 14 Q 20 6 2 14 Z" fill={color} stroke="#000" strokeWidth="1" />
          {/* Brillo superior */}
          <Path
            d="M 8 12 Q 20 8 32 12"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="2"
            fill="none"
          />
        </Svg>
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size && prevProps.color === nextProps.color,
);

// Aro de entrenamiento (c�rculo hueco)
export // Aro de entrenamiento (c�rculo hueco)
const RingImage = React.memo(
  ({ size, color = '#FFD700' }) => {
    const actualSize = size || 24;
    const strokeWidth = Math.max(2, actualSize * 0.12);
    return (
      <View
        style={{
          width: actualSize,
          height: actualSize,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Svg width={actualSize} height={actualSize} viewBox="0 0 40 40">
          {/* C�rculo hueco (aro) */}
          <Circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth={strokeWidth} />
          {/* Sombra interior para dar profundidad */}
          <Circle cx="20" cy="20" r="13" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
        </Svg>
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size && prevProps.color === nextProps.color,
);

// Pesas / Mancuernas de entrenamiento
export // Pesas / Mancuernas de entrenamiento
const WeightsImage = React.memo(
  ({ size, color = '#333333' }) => {
    const actualSize = size || 40;
    return (
      <View
        style={{
          width: actualSize,
          height: actualSize,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Svg width={actualSize} height={actualSize} viewBox="0 0 50 50">
          {/* Barra central */}
          <Rect x="10" y="22" width="30" height="6" fill="#666666" rx="1" />
          {/* Disco izquierdo exterior */}
          <Rect x="2" y="12" width="6" height="26" fill={color} rx="2" />
          {/* Disco izquierdo interior */}
          <Rect x="8" y="16" width="4" height="18" fill={color} rx="1" />
          {/* Disco derecho interior */}
          <Rect x="38" y="16" width="4" height="18" fill={color} rx="1" />
          {/* Disco derecho exterior */}
          <Rect x="42" y="12" width="6" height="26" fill={color} rx="2" />
          {/* Brillo en los discos */}
          <Rect x="3" y="14" width="2" height="8" fill="rgba(255,255,255,0.3)" rx="1" />
          <Rect x="43" y="14" width="2" height="8" fill="rgba(255,255,255,0.3)" rx="1" />
        </Svg>
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size && prevProps.color === nextProps.color,
);

// Mantener GoalImage como alias de BarrierImage para compatibilidad
export // Mantener GoalImage como alias de BarrierImage para compatibilidad
const GoalImage = React.memo(
  ({ size, rotation }) => {
    const width = size;
    const height = size;
    return (
      <View
        style={[
          {
            width,
            height,
          },
          rotation
            ? {
                transform: [
                  {
                    rotate: `${rotation}deg`,
                  },
                ],
              }
            : undefined,
        ]}
      >
        <Svg width={width} height={height} viewBox="0 0 100 100">
          {/* Porter�a - 3 lados blancos m�s estirada (sin lado frontal para mostrar orientaci�n) */}
          {/* Lado izquierdo */}
          <Path d="M 10 30 L 10 70" stroke="#FFFFFF" strokeWidth="3" />
          {/* Lado superior */}
          <Path d="M 10 30 L 90 30" stroke="#FFFFFF" strokeWidth="3" />
          {/* Lado derecho */}
          <Path d="M 90 30 L 90 70" stroke="#FFFFFF" strokeWidth="3" />
        </Svg>
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.size === nextProps.size && prevProps.rotation === nextProps.rotation,
);

// Definiciones de formaciones de f�tbol con posiciones en ratios (0-1)
// yRatio: 0 = arriba (ataque), 1 = abajo (defensa)
// xRatio: 0 = izquierda, 1 = derecha
// Posiciones est�ndar disponibles
