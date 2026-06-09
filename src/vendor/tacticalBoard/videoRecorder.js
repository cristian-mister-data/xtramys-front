import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  Dimensions,
  Animated,
  TextInput,
  Platform,
  StatusBar,
  BackHandler,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const IS_MOBILE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;

function TouchableOpacity({ activeOpacity = 0.2, style, onPress, disabled, children, ...props }) {
  return (
    <Pressable
      style={({ pressed }) => [style, pressed && !disabled && { opacity: activeOpacity }]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      {...props}
    >
      {children}
    </Pressable>
  );
}

import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import RNFS from 'react-native-fs';
import { captureRef } from 'react-native-view-shot';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import {
  initRecordingSession,
  generateVideo as encodeVideo,
  warmUpFFmpeg,
  createStreamingVideoEncoder,
} from '@/utils/videoUtils';
import { renderFrameToCanvas, getVideoDimensions } from '@/utils/videoCanvasRenderer';
import { getAspectForView } from './fields';
import { SPEED_TO_FPS } from '@/constants/video';
import {
  saveVideo as apiSaveVideo,
  proxyUploadToR2,
  getAllVideoFoldersFlat,
  createVideoFolder,
  updateVideo as apiUpdateVideo,
  linkVideoToExercise,
  linkVideoToStrategy,
} from '@/utils/api';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cdnUrl } from '@/config';

// Tipos de elementos que soportan lineType (línea punteada/continua)
const LINE_TYPE_ELEMENTS = new Set([
  'straight-line',
  'straight-arrow',
  'curve-line',
  'curve-arrow',
  'circle',
  'rectangle',
  'custom-shape',
]);
const VIDEO_CAPTURE_FORMAT = 'jpg';
const VIDEO_CAPTURE_EXTENSION = 'jpg';
const VIDEO_CAPTURE_QUALITY = 0.97;
const VIDEO_CAPTURE_MAX_PIXEL_RATIO = 4;
const STREAMING_ENCODE_BACKLOG = 6;

// ============================================================
// COMPONENTE AISLADO DE PREVIEW — React.memo + su propio player
// Previene parpadeos: el VideoView NUNCA se desmonta/remonta
// por re-renders del padre (notificaciones, progreso, etc.)
// ============================================================
const VideoPreviewScreen = React.memo(function VideoPreviewScreen({
  videoUrl,
  onClose,
  onSave,
  onDownload,
  title,
  saveLabel,
  downloadLabel,
}) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View style={styles.previewScreen}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <SafeAreaView style={styles.previewScreenInner}>
        <View style={styles.previewScreenHeader}>
          <TouchableOpacity style={styles.previewBackBtn} onPress={onClose}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.previewScreenTitle} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={onClose}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.previewVideoArea}>
          <View style={styles.previewVideoWrapper}>
            <VideoView
              style={styles.previewVideoPlayer}
              player={player}
              contentFit="contain"
              nativeControls
            />
          </View>
        </View>

        <View style={styles.previewBottomBar}>
          <TouchableOpacity style={styles.previewBottomBtn} onPress={onSave}>
            <View style={styles.previewBottomBtnIcon}>
              <Feather name="save" size={22} color="#fff" />
            </View>
            <Text style={styles.previewBottomBtnText}>{saveLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.previewBottomBtn} onPress={onDownload}>
            <View style={styles.previewBottomBtnIcon}>
              <Feather name="download" size={22} color="#fff" />
            </View>
            <Text style={styles.previewBottomBtnText}>{downloadLabel}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
});

// ============================================================
// INTERPOLACIÓN DE KEYFRAMES PARA GENERACIÓN CLIENT-SIDE
// ============================================================
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a, b, t) {
  if (a === undefined || b === undefined) return b ?? a;
  return a + (b - a) * t;
}

function lerpPoint(pA, pB, t) {
  return { x: lerp(pA.x, pB.x, t), y: lerp(pA.y, pB.y, t) };
}

function lerpNumericProp(out, from, to, prop, t) {
  if (typeof from[prop] === 'number' && typeof to[prop] === 'number') {
    out[prop] = lerp(from[prop], to[prop], t);
  }
}

function lerpPointArray(fromPoints, toPoints, t) {
  if (!Array.isArray(fromPoints) || !Array.isArray(toPoints)) return undefined;
  const minLen = Math.min(fromPoints.length, toPoints.length);
  const out = [];
  for (let i = 0; i < minLen; i++) {
    out.push(lerpPoint(fromPoints[i], toPoints[i], t));
  }
  const longer = fromPoints.length >= toPoints.length ? fromPoints : toPoints;
  for (let i = minLen; i < longer.length; i++) {
    out.push({ ...longer[i] });
  }
  return out;
}

// Interpola dos snapshots de un mismo elemento
function interpolateElement(from, to, t) {
  const out = { ...to };

  [
    'xRatio',
    'yRatio',
    'x',
    'y',
    'x1',
    'y1',
    'x2',
    'y2',
    'width',
    'height',
    'radius',
    'size',
    'baseSize',
    'fontSize',
    'baseFontSize',
    'thickness',
    'baseThickness',
    'rotation',
  ].forEach((prop) => lerpNumericProp(out, from, to, prop, t));

  const pointsRatio = lerpPointArray(from.pointsRatio, to.pointsRatio, t);
  if (pointsRatio) out.pointsRatio = pointsRatio;

  const points = lerpPointArray(from.points, to.points, t);
  if (points) out.points = points;

  return out;
}

// Aplica un efecto parabólico al balón durante el segmento aire.
// `progress` es el progreso lineal (0..1) en el segmento. El desplazamiento
// del balón usa ese progreso lineal y la altura usa una parábola simple.
// Devuelve {ballArc, shadow} con la altura/escala del balón y el snapshot de
// la sombra para renderizarla detrás. Si no es trayectoria aérea, devuelve null.
function applyBallAirEffect(ballElement, fromBall, toBall, linearProgress) {
  if (!ballElement || !fromBall || !toBall) return null;
  const dx = (toBall.x || 0) - (fromBall.x || 0);
  const dy = (toBall.y || 0) - (fromBall.y || 0);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const ballSize = ballElement.size || (IS_MOBILE ? 24 : 18);
  const arcHeight = Math.max(ballSize * 0.9, Math.min(distance * 0.32, ballSize * 3.2));
  const heightProgress = 4 * linearProgress * (1 - linearProgress);
  const airborne = heightProgress > 0.025 && linearProgress > 0.015 && linearProgress < 0.985;
  const scaleBoost = 1 + heightProgress * 0.08;

  if (!airborne) {
    return {
      ballYOffset: 0,
      ballScale: scaleBoost,
      shadow: null,
    };
  }

  const shadowOpacity = Math.min(0.48, 0.08 + heightProgress * 0.38);
  const shadowScale = Math.max(0.48, 1.06 - heightProgress * 0.52);

  return {
    ballYOffset: -arcHeight * heightProgress,
    ballScale: scaleBoost,
    shadow: {
      id: `${ballElement.id}__shadow`,
      type: 'ball-shadow',
      x: ballElement.x,
      y: ballElement.y, // Suelo: posición real, sin levantar
      size: ballSize,
      opacity: shadowOpacity,
      shadowScale,
      zIndex: (ballElement.zIndex || 200) - 1,
    },
  };
}

function getBallTrajectoryForSegment(keyframe, ballId) {
  return keyframe?.ballTrajectoryById?.[ballId] || keyframe?.ballTrajectoryType || 'ground';
}

const BALL_TRAJECTORY_MIN_MOVE = 0.006;

function getBallSnapshotRatio(ball) {
  if (!ball) return null;
  if (typeof ball.xRatio === 'number' && typeof ball.yRatio === 'number') {
    return { x: ball.xRatio, y: ball.yRatio };
  }
  return null;
}

function getBallZone(point) {
  if (!point) return i18n.t('videoRecorder.ballZoneUnlocated', 'zona sin ubicar');
  const sideMap = { left: 'izquierda', center: 'central', right: 'derecha' };
  const laneMap = { high: 'alta', mid: 'media', low: 'baja' };
  const side = point.x < 0.33 ? 'left' : point.x > 0.67 ? 'right' : 'center';
  const lane = point.y < 0.33 ? 'high' : point.y > 0.67 ? 'low' : 'mid';
  const fallback = `zona ${sideMap[side]} ${laneMap[lane]}`;
  return i18n.t(`videoRecorder.ballZone.${side}_${lane}`, fallback);
}

function getBallMovementDistance(fromBall, toBall) {
  const from = getBallSnapshotRatio(fromBall);
  const to = getBallSnapshotRatio(toBall);
  if (!from || !to) return 0;
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function getBallMovementTitle(fromBall, toBall) {
  const explicitLabel = toBall?.name || toBall?.label || fromBall?.name || fromBall?.label;
  if (explicitLabel) return explicitLabel;
  return `${getBallZone(getBallSnapshotRatio(fromBall))} -> ${getBallZone(getBallSnapshotRatio(toBall))}`;
}

function getSegmentBallMovements(keyframes, index) {
  const fromKf = keyframes?.[index];
  const toKf = keyframes?.[index + 1];
  if (!fromKf || !toKf) return [];
  const toBalls = new Map(
    (toKf.elements || []).filter((el) => el.type === 'ball').map((ball) => [ball.id, ball]),
  );
  return (fromKf.elements || [])
    .filter((ball) => ball.type === 'ball' && toBalls.has(ball.id))
    .map((fromBall) => {
      const toBall = toBalls.get(fromBall.id);
      return {
        id: fromBall.id,
        fromBall,
        toBall,
        moved: getBallMovementDistance(fromBall, toBall) >= BALL_TRAJECTORY_MIN_MOVE,
        trajectory: getBallTrajectoryForSegment(fromKf, fromBall.id),
      };
    })
    .filter((movement) => movement.moved);
}

// Genera todos los frames interpolados entre todos los keyframes
function buildInterpolatedFrames(
  keyframes,
  fps,
  moveDuration,
  holdDuration,
  speedMultiplier,
  extraDurationEnd,
) {
  if (!keyframes || keyframes.length < 2) return [];

  const framesPerTransition = Math.max(2, Math.round((fps * moveDuration) / speedMultiplier));
  const holdFrames = Math.max(1, Math.round((fps * holdDuration) / speedMultiplier));
  const extraFrames = Math.round(fps * extraDurationEnd);
  const frames = [];

  // Control de rotación acumulada de los balones para movimiento continuo
  const ballRotations = new Map();
  const firstKf = keyframes[0];
  (firstKf.elements || []).forEach((e) => {
    if (e.type === 'ball') {
      ballRotations.set(e.id, e.rotation || 0);
    }
  });

  // Hold inicial en la primera posición (misma duración que holdDuration)
  for (let h = 0; h < holdFrames; h++) {
    const elementsWithUpdatedRotations = (firstKf.elements || []).map((el) => {
      if (el.type === 'ball') {
        return { ...el, rotation: ballRotations.get(el.id) || 0 };
      }
      return el;
    });
    frames.push({ elements: elementsWithUpdatedRotations, connectors: firstKf.connectors || [] });
  }

  for (let ki = 0; ki < keyframes.length; ki++) {
    const kf = keyframes[ki];

    // Interpolate to next keyframe (movimiento fluido)
    if (ki < keyframes.length - 1) {
      const fromEls = kf.elements || [];
      const toEls = keyframes[ki + 1].elements || [];
      const toConnectors = keyframes[ki + 1].connectors || kf.connectors || [];

      // Build id→element maps
      const fromMap = new Map(fromEls.map((e) => [e.id, e]));
      const toMap = new Map(toEls.map((e) => [e.id, e]));
      const allIds = new Set([...fromMap.keys(), ...toMap.keys()]);

      // Calcular la diferencia de rotación de cada balón en esta transición
      const segmentBallDeltas = new Map();
      for (const id of allIds) {
        const fe = fromMap.get(id);
        const te = toMap.get(id);
        if (fe && te && fe.type === 'ball' && te.type === 'ball') {
          const dx =
            te.x !== undefined && fe.x !== undefined
              ? te.x - fe.x
              : ((te.xRatio || 0) - (fe.xRatio || 0)) * 1000;
          const dy =
            te.y !== undefined && fe.y !== undefined
              ? te.y - fe.y
              : ((te.yRatio || 0) - (fe.yRatio || 0)) * 1000;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let sign = 1;
          if (Math.abs(dx) > 0.01) {
            sign = dx > 0 ? 1 : -1;
          } else if (Math.abs(dy) > 0.01) {
            sign = dy > 0 ? 1 : -1;
          }
          const factor = 1.0; // grados por píxel nominal (rotación lenta)
          const deltaRot = dist * sign * factor;
          segmentBallDeltas.set(id, deltaRot);
        }
      }

      for (let f = 1; f <= framesPerTransition; f++) {
        const linearProgress = f / framesPerTransition;
        const t = easeInOutCubic(linearProgress);
        const interpolated = [];
        const airShadows = [];

        for (const id of allIds) {
          const fe = fromMap.get(id);
          const te = toMap.get(id);
          const isAirBall =
            fe?.type === 'ball' &&
            te?.type === 'ball' &&
            getBallTrajectoryForSegment(kf, id) === 'air';
          let interpEl;
          if (fe && te) {
            interpEl = interpolateElement(fe, te, isAirBall ? linearProgress : t);
          } else {
            interpEl = { ...(te || fe) };
          }

          // Inyectar rotación acumulada en el balón
          if (fe && te && fe.type === 'ball' && te.type === 'ball') {
            const startRot = ballRotations.get(id) || 0;
            const deltaRot = segmentBallDeltas.get(id) || 0;
            const currentProgress = isAirBall ? linearProgress : t;
            interpEl.rotation = startRot + deltaRot * currentProgress;
          }

          if (isAirBall) {
            const airEffect = applyBallAirEffect(interpEl, fe, te, linearProgress);
            if (airEffect) {
              const groundX = interpEl.x;
              const groundY = interpEl.y;
              const groundXRatio = interpEl.xRatio;
              const groundYRatio = interpEl.yRatio;
              // Calcular nuevo yRatio (snapshotToClone prioriza ratio sobre y).
              const refH =
                typeof groundY === 'number' &&
                typeof groundYRatio === 'number' &&
                groundYRatio !== 0
                  ? groundY / groundYRatio
                  : null;
              const newY = (groundY || 0) + airEffect.ballYOffset;
              const newYRatio = refH ? newY / refH : groundYRatio;
              interpEl = {
                ...interpEl,
                y: newY,
                yRatio: newYRatio,
                size: (interpEl.size || (IS_MOBILE ? 24 : 18)) * airEffect.ballScale,
                baseSize:
                  (interpEl.baseSize || interpEl.size || (IS_MOBILE ? 24 : 18)) *
                  airEffect.ballScale,
                zIndex: (interpEl.zIndex || 200) + 50,
                isAirborne: true,
              };
              if (airEffect.shadow) {
                airEffect.shadow.x = groundX;
                airEffect.shadow.y = groundY;
                airEffect.shadow.xRatio = groundXRatio;
                airEffect.shadow.yRatio = groundYRatio;
                airEffect.shadow.baseSize = airEffect.shadow.size;
                airShadows.push(airEffect.shadow);
              }
            }
          }
          interpolated.push(interpEl);
        }

        // Interpolar conectores: usar los del destino para la segunda mitad
        const connectors = t < 0.5 ? kf.connectors || [] : toConnectors;
        frames.push({ elements: [...airShadows, ...interpolated], connectors });
      }

      // Actualizar rotaciones acumuladas al final del segmento
      for (const [id, deltaRot] of segmentBallDeltas.entries()) {
        const prevRot = ballRotations.get(id) || 0;
        ballRotations.set(id, prevRot + deltaRot);
      }

      // Hold: pausa breve en el punto de destino
      const destKf = keyframes[ki + 1];
      for (let h = 0; h < holdFrames; h++) {
        const elementsWithUpdatedRotations = (destKf.elements || []).map((el) => {
          if (el.type === 'ball') {
            return { ...el, rotation: ballRotations.get(el.id) || 0 };
          }
          return el;
        });
        frames.push({
          elements: elementsWithUpdatedRotations,
          connectors: destKf.connectors || [],
        });
      }
    }
  }

  // Extra frames al final (mantener última posición)
  const lastKf = keyframes[keyframes.length - 1];
  for (let e = 0; e < extraFrames; e++) {
    const elementsWithUpdatedRotations = (lastKf.elements || []).map((el) => {
      if (el.type === 'ball') {
        return { ...el, rotation: ballRotations.get(el.id) || 0 };
      }
      return el;
    });
    frames.push({ elements: elementsWithUpdatedRotations, connectors: lastKf.connectors || [] });
  }

  return frames;
}

// ============================================================
// NORMALIZACIÓN DE KEYFRAMES PARA SERVIDOR
// ============================================================
// Recomputa TODAS las coordenadas absolutas desde los ratios almacenados,
// usando dimensiones de referencia consistentes. Esto garantiza que todos
// los keyframes (viejos de BD + nuevos capturados) usen el mismo sistema
// de coordenadas, independientemente del dispositivo donde se capturaron.
// ============================================================
function normalizeKeyframesForServer(keyframes, refWidth, refHeight) {
  if (!keyframes || !Array.isArray(keyframes)) return [];

  const scaleFactor = Math.min(refWidth, refHeight) / 500;

  return keyframes.map((kf) => ({
    ...kf,
    elements: (kf.elements || []).map((elem) => {
      const norm = { ...elem };

      // === Posición desde ratios ===
      if (norm.xRatio !== undefined && norm.yRatio !== undefined) {
        norm.x = Math.round(norm.xRatio * refWidth * 100) / 100;
        norm.y = Math.round(norm.yRatio * refHeight * 100) / 100;
      }

      // === Tamaño desde baseSize (sin multiplicador de dispositivo) ===
      if (norm.baseSize !== undefined) {
        norm.size = Math.round(norm.baseSize * scaleFactor * 100) / 100;
      }

      // === Grosor desde baseThickness (factor 0.7 consistente con SVG rendering) ===
      if (norm.baseThickness !== undefined) {
        norm.thickness = Math.round(norm.baseThickness * 0.7 * 100) / 100;
      }

      // === Asegurar que lineType, dotSize y dotSpacing siempre est\u00e9n presentes ===
      // Esto garantiza que el backend siempre reciba la info completa del tipo de l\u00ednea
      if (LINE_TYPE_ELEMENTS.has(norm.type)) {
        if (!norm.lineType) norm.lineType = 'solid';
        if (norm.dotSize === undefined) norm.dotSize = 2;
        if (norm.dotSpacing === undefined) norm.dotSpacing = 4;
      }

      // === Coordenadas de líneas/formas desde pointsRatio ===
      if (norm.pointsRatio && Array.isArray(norm.pointsRatio) && norm.pointsRatio.length >= 2) {
        if (norm.type === 'straight-arrow' || norm.type === 'straight-line') {
          norm.x1 = norm.pointsRatio[0].x * refWidth;
          norm.y1 = norm.pointsRatio[0].y * refHeight;
          norm.x2 = norm.pointsRatio[1].x * refWidth;
          norm.y2 = norm.pointsRatio[1].y * refHeight;
        } else if (norm.type === 'curve-arrow' || norm.type === 'curve-line') {
          norm.points = norm.pointsRatio.map((pt) => ({
            x: pt.x * refWidth,
            y: pt.y * refHeight,
          }));
        } else if (norm.type === 'circle') {
          const p1 = { x: norm.pointsRatio[0].x * refWidth, y: norm.pointsRatio[0].y * refHeight };
          const p2 = { x: norm.pointsRatio[1].x * refWidth, y: norm.pointsRatio[1].y * refHeight };
          norm.x = (p1.x + p2.x) / 2;
          norm.y = (p1.y + p2.y) / 2;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          norm.radius = Math.sqrt(dx * dx + dy * dy) / 2;
        } else if (norm.type === 'rectangle') {
          const p1 = { x: norm.pointsRatio[0].x * refWidth, y: norm.pointsRatio[0].y * refHeight };
          const p2 = { x: norm.pointsRatio[1].x * refWidth, y: norm.pointsRatio[1].y * refHeight };
          norm.x = Math.min(p1.x, p2.x);
          norm.y = Math.min(p1.y, p2.y);
          norm.width = Math.abs(p2.x - p1.x);
          norm.height = Math.abs(p2.y - p1.y);
        } else if (norm.type === 'custom-shape') {
          norm.points = norm.pointsRatio.map((pt) => ({
            x: pt.x * refWidth,
            y: pt.y * refHeight,
          }));
          norm.imageWidth = refWidth;
          norm.imageHeight = refHeight;
        }
      }

      // === Texto libre: recalcular fontSize y posición ===
      if (norm.type === 'free-text' || norm.type === 'text') {
        if (norm.xRatio !== undefined && norm.yRatio !== undefined) {
          norm.x = norm.xRatio * refWidth;
          norm.y = norm.yRatio * refHeight;
        }
        if (norm.baseFontSize !== undefined) {
          norm.fontSize = norm.baseFontSize * scaleFactor;
        } else if (norm.baseSize !== undefined) {
          norm.fontSize = norm.baseSize * scaleFactor;
        }
      }

      return norm;
    }),
  }));
}

export default function VideoRecorder({
  elements,
  connectors = [], // Conectores entre elementos
  fieldImage,
  onClose,
  fieldWidth,
  fieldHeight,
  fieldRef, // Ref al ViewShot del campo (para captureRef)
  videoFrameControl, // Ref con { setFrame, deselectAll }
  fieldBaseRef, // Nueva prop: referencia solo al campo base sin elementos
  fieldImageReady = false, // Nueva prop: estado de carga de la imagen del campo
  fieldType = 'full', // Tipo de campo (ID): 'full', 'half', etc.
  viewMode = 'entire', // Tipo de vista activa (halfLeft, halfRight, etc.)
  keyframes = [], // Keyframes recibidos desde field.js
  onKeyframesChange, // Callback para actualizar keyframes en field.js
  onClearKeyframes, // Callback para limpiar keyframes desde field.js
  onSelectKeyframe, // Callback para previsualizar un keyframe (temporal)
  onApplyKeyframe, // Callback para aplicar un keyframe permanentemente
  onGoToLastKeyframe, // Callback para volver al último keyframe después de generar video
  onRestoreOriginal, // Callback para restaurar al estado original (antes de abrir video recorder)
  ejercicioId = null, // ID del ejercicio (opcional)
  estrategiaId = null, // ID de la estrategia (opcional)
  showPhotos = false, // Mostrar fotos de jugadores en lugar de números
  playersWithNumber = true, // Mostrar números en los jugadores
  // Props para modo edición de video existente
  isEditingVideo = false, // Si estamos editando un video existente
  editingVideoId = null, // ID del video que estamos editando
  editingVideoName = '', // Nombre del video en edición
  editingVideoEnName = '', // Nombre en inglés del video en edición
  editingVideoDescription = '', // Descripción del video en edición
  editingVideoFolderId = null, // Carpeta del video en edición
  hideFolderPicker = false, // Ocultar selector de carpeta
  presetFolderId = null, // Carpeta preseleccionada (se usa automáticamente)
  isGlobalExercise = false, // Si el ejercicio es global (app) - solo mostrar carpetas globales
  isGlobalStrategy = false, // Si la estrategia es global (app) - solo mostrar carpetas globales
  onEditVideoSaved = null, // Callback tras guardar exitosamente en modo edición
  onGeneratingChange = null, // Callback cuando el estado de generación cambia (isGenerating)
  onSavingChange = null,
}) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [showPreviewScreen, setShowPreviewScreen] = useState(false);

  useEffect(() => {
    onGeneratingChange?.(isGenerating);
  }, [isGenerating, onGeneratingChange]);

  // Android back button handler para la pantalla de preview
  useEffect(() => {
    if (!showPreviewScreen) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      closePreviewScreen();
      return true;
    });
    return () => backHandler.remove();
  }, [showPreviewScreen]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [videoNombre, setVideoNombre] = useState(editingVideoName || '');
  const [videoNombreEn, setVideoNombreEn] = useState(editingVideoEnName || '');
  const [videoDescripcion, setVideoDescripcion] = useState(editingVideoDescription || '');

  useEffect(() => {
    if (editingVideoName) {
      setVideoNombre((current) => current || editingVideoName);
    }
    if (editingVideoEnName) {
      setVideoNombreEn((current) => current || editingVideoEnName);
    }
  }, [editingVideoName, editingVideoEnName]);
  const [notification, setNotification] = useState({
    visible: false,
    message: '',
    type: 'success',
  });
  const notificationAnim = useRef(new Animated.Value(0)).current;
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [localVideoPath, setLocalVideoPath] = useState(null); // Ruta local del MP4 generado
  const [localVideoMime, setLocalVideoMime] = useState(null); // Tipo MIME del video generado
  const [videoThumbnail, setVideoThumbnail] = useState(null);
  const videoThumbnailRef = useRef(null);
  const generationCancelledRef = useRef(false); // Para cancelar generación en curso
  const uploadingPathRef = useRef(null); // Ruta del archivo que se está subiendo a R2 (no borrar)
  const [generationProgress, setGenerationProgress] = useState(0); // 0-100 porcentaje de generación
  const [generationPhase, setGenerationPhase] = useState('generationPreparing');
  const [isSaving, setIsSaving] = useState(false); // Estado de guardado (separado de generación)

  // Detección de admin
  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  const [isAdmin, setIsAdmin] = useState(false);
  const shouldBeGlobal = isAdmin || isGlobalExercise || isGlobalStrategy;

  // Cancelar generación de video y limpiar archivos al desmontar
  useEffect(() => {
    return () => {
      generationCancelledRef.current = true;
      // Limpiar video local si existe Y no está pendiente de upload a R2
      if (localVideoPath && localVideoPath !== uploadingPathRef.current) {
        RNFS.unlink(localVideoPath).catch(() => {});
      }
    };
  }, [localVideoPath]);

  React.useEffect(() => {
    const detectAdmin = async () => {
      try {
        const str = await AsyncStorage.getItem('usuario');
        if (str) {
          const parsed = JSON.parse(str);
          if (parsed?.role === 'admin') {
            setIsAdmin(true);
            return;
          }
        }
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const parts = token.split('.');
          if (parts.length === 3) {
            const b64 =
              parts[1].replace(/-/g, '+').replace(/_/g, '/') +
              '='.repeat((4 - (parts[1].length % 4)) % 4);
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            let decoded = '';
            let idx = 0;
            while (idx < b64.length) {
              const e1 = chars.indexOf(b64[idx++]),
                e2 = chars.indexOf(b64[idx++]);
              const e3 = chars.indexOf(b64[idx++]),
                e4 = chars.indexOf(b64[idx++]);
              decoded += String.fromCharCode((e1 << 2) | (e2 >> 4));
              if (e3 !== 64) decoded += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
              if (e4 !== 64) decoded += String.fromCharCode(((e3 & 3) << 6) | e4);
            }
            const payload = JSON.parse(decoded);
            if (payload?.role === 'admin') setIsAdmin(true);
          }
        }
      } catch {}
    };
    detectAdmin();
  }, []);

  // Estado para selección de carpeta
  const [allFolders, setAllFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(presetFolderId || editingVideoFolderId);

  useEffect(() => {
    const preferredFolderId = presetFolderId || editingVideoFolderId || null;
    if (preferredFolderId) {
      setSelectedFolderId(preferredFolderId);
    }
  }, [presetFolderId, editingVideoFolderId]);

  // Estados para crear carpeta
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderNameEn, setNewFolderNameEn] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#6366F1');
  const [parentFolderForNew, setParentFolderForNew] = useState(null); // Para subcarpetas

  // Estado para velocidad de video
  const [videoSpeed, setVideoSpeed] = useState(1.0); // 0.5, 1.0, 2.0

  const SCREEN_WIDTH = Dimensions.get('window').width;

  useEffect(() => {
    warmUpFFmpeg();
  }, []);

  // Calcular duración total estimada del video
  const getVideoDuration = () => {
    if (keyframes.length < 2) return 0;

    const firstTimestamp = keyframes[0].timestamp;
    const lastTimestamp = keyframes[keyframes.length - 1].timestamp;
    const baseDuration = (lastTimestamp - firstTimestamp) / 1000; // en segundos
    return baseDuration + 1; // +1 segundo extra al final
  };

  // Función para mostrar notificación
  const showNotification = (message, type = 'success') => {
    setNotification({ visible: true, message, type });

    Animated.sequence([
      Animated.timing(notificationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(notificationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification({ visible: false, message: '', type: 'success' });
    });
  };

  // Capturar un keyframe
  const captureKeyframe = async () => {
    const savedSelection = videoFrameControl?.current?.getSelected
      ? videoFrameControl.current.getSelected()
      : null;
    try {
      // Deseleccionar todo para captura limpia (sin handles de selección)
      if (videoFrameControl?.current?.deselectAll) {
        videoFrameControl.current.deselectAll();
      }

      let fieldImageData = fieldImage;

      // Si no hay imagen del campo, tomar captura automática del campo base
      if (!fieldImage) {
        if (!fieldBaseRef?.current) {
          showNotification(t('videoRecorder.cannotAccessField'), 'error');
          if (videoFrameControl?.current?.setSelected) {
            videoFrameControl.current.setSelected(savedSelection);
          }
          return;
        }

        // Verificar que la imagen del campo esté completamente cargada
        if (!fieldImageReady) {
          showNotification(t('videoRecorder.waitingFieldImage'), 'success');
          if (videoFrameControl?.current?.setSelected) {
            videoFrameControl.current.setSelected(savedSelection);
          }
          // Esperar un poco y reintentar
          setTimeout(() => captureKeyframe(), 500);
          return;
        }

        try {
          const capturedUri = await fieldBaseRef.current.capture();

          // Convertir la imagen capturada a base64
          const base64Image = await RNFS.readFile(capturedUri, 'base64');

          fieldImageData = `data:image/png;base64,${base64Image}`;
        } catch (captureError) {
          console.error('Error capturando imagen del campo:', captureError);
          showNotification(t('videoRecorder.errorCapturingField'), 'error');
          if (videoFrameControl?.current?.setSelected) {
            videoFrameControl.current.setSelected(savedSelection);
          }
          return;
        }
      }

      // Restaurar selección después de capturar la imagen
      if (videoFrameControl?.current?.setSelected) {
        videoFrameControl.current.setSelected(savedSelection);
      }

      // Capturar datos de elementos para interpolación - ULTRA OPTIMIZADO
      const elementsSnapshot = elements
        .map((elem) => {
          // SOLO guardar propiedades esenciales mínimas
          const snapshot = {
            type: elem.type,
            id: elem.id,
          };

          const baseScale = Math.min(fieldWidth, fieldHeight) / 500;
          const scaleFactor = baseScale;

          // Para elementos con xRatio/yRatio, convertir a coordenadas absolutas
          if (elem.xRatio !== undefined && elem.yRatio !== undefined) {
            // Guardar RATIOS originales para poder restaurar exactamente
            snapshot.xRatio = elem.xRatio;
            snapshot.yRatio = elem.yRatio;
            // Redondear para reducir tamaño de datos JSON
            snapshot.x = Math.round(elem.xRatio * fieldWidth * 100) / 100;
            snapshot.y = Math.round(elem.yRatio * fieldHeight * 100) / 100;

            // Calcular tamaño escalado
            const baseSize = elem.size || (IS_MOBILE ? 24 : 18);
            snapshot.size = Math.round(baseSize * scaleFactor * 100) / 100;
            snapshot.baseSize = baseSize;

            if (elem.rotation) snapshot.rotation = elem.rotation;
            if (elem.locked) snapshot.locked = elem.locked;
            if (elem.zIndex !== undefined) snapshot.zIndex = elem.zIndex;
            if (elem.paletteIndex !== undefined) snapshot.paletteIndex = elem.paletteIndex;

            // Solo agregar propiedades necesarias según tipo
            if (elem.type === 'player') {
              snapshot.color = elem.color;
              snapshot.number = elem.playerNumber || elem.number;
              if (elem.numberColor) snapshot.numberColor = elem.numberColor;
              if (elem.displayLabel) snapshot.displayLabel = elem.displayLabel;
              if (elem.ownerType) snapshot.ownerType = elem.ownerType;
              // Añadir datos de texto para jugadores con nombre
              if (elem.playerData) {
                snapshot.playerData = {
                  nombre: elem.playerData.nombre,
                  demarcacion: elem.playerData.demarcacion,
                  posicion: elem.playerData.posicion,
                  foto: elem.playerData.foto,
                };
                snapshot.textColor = elem.textColor || '#000000';
                snapshot.textBackgroundColor = elem.textBackgroundColor || '#ffffff';
                if (elem.playerData.foto) {
                  snapshot.photoUrl = cdnUrl(elem.playerData.foto);
                }
              }
              // Añadir configuración de mostrar fotos y números
              snapshot.showPhotos = showPhotos;
              snapshot.playersWithNumber = playersWithNumber;
              // Añadir datos del portero
              snapshot.isGoalkeeper =
                elem.isGoalkeeper ||
                elem.playerData?.posicion === 'portero' ||
                elem.playerData?.position === 'goalkeeper' ||
                elem.playerData?.demarcacion === 'POR';
              if (elem.differentiateGoalkeeper !== undefined)
                snapshot.differentiateGoalkeeper = elem.differentiateGoalkeeper;
              if (elem.goalkeeperStripeColor)
                snapshot.goalkeeperStripeColor = elem.goalkeeperStripeColor;
            } else if (elem.type === 'staff') {
              snapshot.staffRole = elem.staffRole;
              snapshot.displayLabel = elem.displayLabel; // Iniciales (E1, E2, PF, etc.)
              snapshot.color = elem.color;
              if (elem.numberColor) snapshot.numberColor = elem.numberColor;
            } else if (
              elem.type === 'ball' ||
              elem.type === 'cone' ||
              elem.type === 'cone-pro' ||
              elem.type === 'cone-flat' ||
              elem.type === 'ring' ||
              elem.type === 'goal' ||
              elem.type === 'goal-large' ||
              elem.type === 'goal-small' ||
              elem.type === 'barrier' ||
              elem.type === 'dummy' ||
              elem.type === 'pole' ||
              elem.type === 'ladder' ||
              elem.type === 'weights'
            ) {
              if (elem.color) snapshot.color = elem.color;
              if (elem.rotation) snapshot.rotation = elem.rotation;
            }
          }

          // Para líneas/flechas con points, convertir a coordenadas absolutas
          if (elem.points && elem.points.length >= 2) {
            if (elem.type === 'straight-arrow' || elem.type === 'straight-line') {
              // Líneas rectas: solo necesitan punto inicial y final
              // Guardar ratios originales para restauración exacta
              snapshot.pointsRatio = [
                { x: elem.points[0].x, y: elem.points[0].y },
                { x: elem.points[1].x, y: elem.points[1].y },
              ];
              snapshot.x1 = elem.points[0].x * fieldWidth;
              snapshot.y1 = elem.points[0].y * fieldHeight;
              snapshot.x2 = elem.points[1].x * fieldWidth;
              snapshot.y2 = elem.points[1].y * fieldHeight;

              const baseThickness = elem.thickness || 1;
              snapshot.thickness = baseThickness;
              snapshot.baseThickness = baseThickness;
              // Siempre capturar color (usar default si no hay)
              snapshot.color = elem.color || '#000000';
              // Siempre capturar información de tipo de línea para video
              snapshot.lineType = elem.lineType || 'solid';
              snapshot.dotSize = elem.dotSize ?? 2;
              snapshot.dotSpacing = elem.dotSpacing ?? 4;
            } else if (elem.type === 'curve-arrow' || elem.type === 'curve-line') {
              // Líneas curvas: enviar TODOS los puntos para renderizado exacto
              // Guardar ratios originales para restauración exacta
              snapshot.pointsRatio = elem.points.map((pt) => ({ x: pt.x, y: pt.y }));
              snapshot.points = elem.points.map((pt) => ({
                x: pt.x * fieldWidth,
                y: pt.y * fieldHeight,
              }));

              const baseThickness = elem.thickness || 1;
              snapshot.thickness = baseThickness;
              snapshot.baseThickness = baseThickness;
              // Siempre capturar color (usar default si no hay)
              snapshot.color = elem.color || '#000000';
              // Siempre capturar información de tipo de línea para video
              snapshot.lineType = elem.lineType || 'solid';
              snapshot.dotSize = elem.dotSize ?? 2;
              snapshot.dotSpacing = elem.dotSpacing ?? 4;
            }

            // Para círculos, calcular centro y radio desde points
            if (elem.type === 'circle') {
              // Guardar ratios originales
              snapshot.pointsRatio = [
                { x: elem.points[0].x, y: elem.points[0].y },
                { x: elem.points[1].x, y: elem.points[1].y },
              ];
              const p1 = { x: elem.points[0].x * fieldWidth, y: elem.points[0].y * fieldHeight };
              const p2 = { x: elem.points[1].x * fieldWidth, y: elem.points[1].y * fieldHeight };

              // Centro del círculo
              snapshot.x = (p1.x + p2.x) / 2;
              snapshot.y = (p1.y + p2.y) / 2;

              // Radio del círculo
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              snapshot.radius = Math.sqrt(dx * dx + dy * dy) / 2;

              // Capturar thickness
              const baseThickness = elem.thickness || 1;
              snapshot.thickness = baseThickness;
              snapshot.baseThickness = baseThickness;
              // Siempre capturar color (usar default si no hay)
              snapshot.color = elem.color || '#000000';
              // Siempre capturar fillColor para que se renderice correctamente
              snapshot.fillColor = elem.fillColor || 'transparent';
              // Siempre capturar información de tipo de línea para video
              snapshot.lineType = elem.lineType || 'solid';
              snapshot.dotSize = elem.dotSize ?? 2;
              snapshot.dotSpacing = elem.dotSpacing ?? 4;
            }

            // Para rectángulos, calcular posición y dimensiones desde points
            if (elem.type === 'rectangle') {
              // Guardar ratios originales
              snapshot.pointsRatio = [
                { x: elem.points[0].x, y: elem.points[0].y },
                { x: elem.points[1].x, y: elem.points[1].y },
              ];
              const p1 = { x: elem.points[0].x * fieldWidth, y: elem.points[0].y * fieldHeight };
              const p2 = { x: elem.points[1].x * fieldWidth, y: elem.points[1].y * fieldHeight };

              const minX = Math.min(p1.x, p2.x);
              const maxX = Math.max(p1.x, p2.x);
              const minY = Math.min(p1.y, p2.y);
              const maxY = Math.max(p1.y, p2.y);

              snapshot.x = minX;
              snapshot.y = minY;
              snapshot.width = maxX - minX;
              snapshot.height = maxY - minY;

              // Capturar thickness
              const baseThickness = elem.thickness || 1;
              snapshot.thickness = baseThickness;
              snapshot.baseThickness = baseThickness;
              // Siempre capturar color (usar default si no hay)
              snapshot.color = elem.color || '#000000';
              // Siempre capturar fillColor para que se renderice correctamente
              snapshot.fillColor = elem.fillColor || 'transparent';
              // Siempre capturar información de tipo de línea para video
              snapshot.lineType = elem.lineType || 'solid';
              snapshot.dotSize = elem.dotSize ?? 2;
              snapshot.dotSpacing = elem.dotSpacing ?? 4;
              if (elem.rotation) snapshot.rotation = elem.rotation;
            }

            // Para custom-shape, convertir points a coordenadas absolutas
            if (elem.type === 'custom-shape' && elem.isCustomShapeComplete) {
              // Guardar ratios originales para restauración exacta
              snapshot.pointsRatio = elem.points.map((pt) => ({ x: pt.x, y: pt.y }));
              snapshot.points = elem.points.map((pt) => ({
                x: pt.x * fieldWidth,
                y: pt.y * fieldHeight,
              }));

              // Capturar thickness
              const baseThickness = elem.thickness || 1;
              snapshot.thickness = baseThickness;
              snapshot.baseThickness = baseThickness;
              snapshot.closed = true; // Las custom shapes siempre están cerradas
              // Siempre capturar color (usar default si no hay)
              snapshot.color = elem.color || '#000000';
              // Siempre capturar fillColor para que se renderice correctamente
              snapshot.fillColor = elem.fillColor || 'transparent';
              // Siempre capturar información de tipo de línea para video
              snapshot.lineType = elem.lineType || 'solid';
              snapshot.dotSize = elem.dotSize ?? 2;
              snapshot.dotSpacing = elem.dotSpacing ?? 4;
              // Guardar dimensiones originales para renderizado correcto
              snapshot.imageWidth = fieldWidth;
              snapshot.imageHeight = fieldHeight;
            }
          }

          // Para texto libre (free-text)
          if (elem.type === 'free-text' || elem.type === 'text') {
            snapshot.x = elem.xRatio * fieldWidth;
            snapshot.y = elem.yRatio * fieldHeight;
            snapshot.text = elem.value || elem.text || ''; // El texto está en 'value'
            const baseFontSize = elem.size || elem.fontSize || 16;
            snapshot.baseFontSize = baseFontSize; // Guardar tamaño base para normalización
            snapshot.fontSize = baseFontSize * scaleFactor; // El tamaño está en 'size'
            // Siempre capturar color (usar default si no hay)
            snapshot.color = elem.color || '#000000';
            snapshot.backgroundColor = elem.backgroundColor || 'transparent';
            if (elem.rotation) snapshot.rotation = elem.rotation;
          }

          return snapshot;
        })
        .filter((snapshot) => {
          // Filtrar snapshots incompletos que no tienen coordenadas válidas
          // Esto evita que elementos en proceso de dibujo se incluyan
          const hasPosition =
            (snapshot.x !== undefined && snapshot.y !== undefined) ||
            (snapshot.x1 !== undefined && snapshot.y1 !== undefined) ||
            (snapshot.points && snapshot.points.length >= 2);

          const hasValidSize =
            snapshot.size !== undefined ||
            snapshot.radius !== undefined ||
            (snapshot.width !== undefined && snapshot.height !== undefined) ||
            snapshot.x1 !== undefined; // líneas no necesitan size

          // Para formas, verificar que tienen dimensiones válidas (no son de tamaño 0)
          if (snapshot.type === 'rectangle') {
            if (
              !snapshot.width ||
              snapshot.width <= 0 ||
              !snapshot.height ||
              snapshot.height <= 0
            ) {
              return false;
            }
          }
          if (snapshot.type === 'circle') {
            if (!snapshot.radius || snapshot.radius <= 0) {
              return false;
            }
          }

          return hasPosition;
        });

      // Capturar conectores - las líneas que conectan elementos
      const connectorsSnapshot = connectors.map((connector) => ({
        id: connector.id,
        fromId: connector.fromId,
        toId: connector.toId,
        color: connector.color || '#000000',
        thickness: connector.thickness || 2,
      }));

      const ballTrajectoryById = {};
      elementsSnapshot
        .filter((elem) => elem.type === 'ball')
        .forEach((ball) => {
          ballTrajectoryById[ball.id] =
            keyframes[keyframes.length - 1]?.ballTrajectoryById?.[ball.id] ||
            keyframes[keyframes.length - 1]?.ballTrajectoryType ||
            'ground';
        });

      const newKeyframe = {
        timestamp: Date.now(),
        fieldImageData: fieldImageData, // Imagen para preview (no se guarda en BD)
        elements: elementsSnapshot, // Datos de elementos para interpolar
        connectors: connectorsSnapshot, // Conectores entre elementos
        ballTrajectoryType: 'ground',
        ballTrajectoryById,
      };

      onKeyframesChange([...keyframes, newKeyframe]);
      showNotification(t('videoRecorder.positionCaptured'), 'success');
    } catch (error) {
      console.error('Error capturando keyframe:', error);
      showNotification(t('videoRecorder.errorCapturingPosition'), 'error');
      if (videoFrameControl?.current?.setSelected) {
        videoFrameControl.current.setSelected(savedSelection);
      }
    }
  };

  // Generar video - ahora muestra opciones
  const generateVideo = async () => {
    if (keyframes.length < 2) {
      showNotification(t('videoRecorder.needAtLeast2Positions'), 'error');
      return;
    }

    if (!videoFrameControl?.current?.setFrame) {
      showNotification(t('videoRecorder.errorGeneratingVideo'), 'error');
      return;
    }

    let streamingEncoder = null;
    let streamingChain = Promise.resolve();
    let streamingBacklog = 0;
    let streamingError = null;

    try {
      setIsGenerating(true);
      setGenerationProgress(0);
      setGenerationPhase('generationPreparing');
      generationCancelledRef.current = false;
      videoThumbnailRef.current = null;
      setVideoThumbnail(null);

      const fps = SPEED_TO_FPS[videoSpeed] || 30;
      const moveDuration = 0.9;
      const holdDuration = 0.1;
      const extraDurationEnd = 0.5;

      // 1. Interpolar todos los frames
      const allFrames = buildInterpolatedFrames(
        keyframes,
        fps,
        moveDuration,
        holdDuration,
        videoSpeed,
        extraDurationEnd,
      );

      if (allFrames.length === 0) {
        throw new Error('No se pudieron generar frames');
      }

      // 2. Preparar canvas fijo para renderizado independiente de pantalla
      const aspectVal = getAspectForView(viewMode);
      const aspect = aspectVal
        ? 1 / aspectVal
        : fieldWidth > 0 && fieldHeight > 0
          ? fieldWidth / fieldHeight
          : 16 / 9;
      const { width: canvasW, height: canvasH } = getVideoDimensions(aspect);
      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d', { alpha: false });

      // Cargar imagen del campo como fondo
      let fieldBgImage = null;
      const fieldImgSrc = keyframes[0]?.fieldImageData || fieldImage;
      if (fieldImgSrc) {
        try {
          fieldBgImage = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            if (typeof fieldImgSrc === 'string' && fieldImgSrc.startsWith('data:')) {
              img.src = fieldImgSrc;
            } else if (typeof fieldImgSrc === 'string' && fieldImgSrc.startsWith('blob:')) {
              img.src = fieldImgSrc;
            } else if (fieldImgSrc instanceof Blob) {
              img.src = URL.createObjectURL(fieldImgSrc);
            } else {
              reject(new Error('Formato de imagen no soportado'));
            }
          });
        } catch (e) {
          console.warn('[videoRecorder] No se pudo cargar imagen del campo:', e.message);
        }
      }

      // Cargar todas las fotos de los jugadores antes de empezar
      const playerPhotos = {};
      const uniquePhotoUrls = new Set();
      allFrames.forEach((frame) => {
        (frame.elements || []).forEach((elem) => {
          if (elem.type === 'player' && elem.playerData?.foto) {
            uniquePhotoUrls.add(elem.playerData.foto);
          }
        });
      });

      try {
        await Promise.all(
          Array.from(uniquePhotoUrls).map(async (fotoPath) => {
            try {
              const fullUrl = cdnUrl(fotoPath);
              const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.crossOrigin = 'anonymous';
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = fullUrl;
              });
              playerPhotos[fotoPath] = img;
            } catch (err) {
              console.warn(
                `[videoRecorder] No se pudo cargar la foto del jugador ${fotoPath}:`,
                err,
              );
            }
          }),
        );
      } catch (e) {
        console.warn('[videoRecorder] Error pre-cargando fotos de jugadores:', e);
      }

      // 3. Inicializar directorio de frames
      const framesDir = await initRecordingSession();

      const totalFrames = allFrames.length;
      let capturedFrames = 0;
      let encodedFrames = 0;
      let lastLinearProgress = 0;
      const updateLinearProgress = () => {
        const totalWork = Math.max(1, totalFrames * 2);
        const completedWork = Math.min(totalWork, capturedFrames + encodedFrames);
        const nextProgress = Math.min(99, Math.round((completedWork / totalWork) * 99));
        if (nextProgress <= lastLinearProgress) return;
        lastLinearProgress = nextProgress;
        setGenerationProgress((currentProgress) => Math.max(currentProgress, nextProgress));
      };

      const disableStreamingEncoder = (streamingErrorToReport) => {
        console.warn(
          '[videoRecorder] Streaming WebCodecs falló, se usara fallback al final',
          streamingErrorToReport,
        );
        streamingEncoder?.abort?.();
        streamingEncoder = null;
        encodedFrames = 0;
        streamingError = null;
      };

      const enqueueStreamingFrame = async (frameCapture, frameIndex) => {
        if (!streamingEncoder || streamingError) return;
        streamingBacklog += 1;
        streamingChain = streamingChain
          .then(() => streamingEncoder.addFrame(frameCapture, frameIndex))
          .catch((error) => {
            streamingError = error;
          });

        if (streamingBacklog >= STREAMING_ENCODE_BACKLOG) {
          await streamingChain;
          streamingBacklog = 0;
          if (streamingError) disableStreamingEncoder(streamingError);
        }
      };

      try {
        streamingEncoder = await createStreamingVideoEncoder({
          speed: videoSpeed,
          frameCount: totalFrames,
          onProgress: (encodeProgress) => {
            encodedFrames = Math.max(encodedFrames, Math.round(encodeProgress * totalFrames));
            updateLinearProgress();
          },
        });
      } catch (streamingError) {
        console.warn(
          '[videoRecorder] WebCodecs streaming no disponible, se usara fallback',
          streamingError,
        );
        streamingEncoder = null;
      }

      setGenerationPhase('generationCapturing');

      // 4. Renderizar cada frame en canvas y capturar como blob
      for (let i = 0; i < totalFrames; i++) {
        if (generationCancelledRef.current) {
          streamingEncoder?.abort?.();
          RNFS.unlink(framesDir).catch(() => {});
          setGenerationProgress(0);
          return;
        }

        // Yield to the browser every 4 frames to prevent throttling
        if (i % 4 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        const frame = allFrames[i];

        renderFrameToCanvas(ctx, canvasW, canvasH, frame.elements, frame.connectors, fieldBgImage, {
          playerPhotos,
          playersWithNumber,
          showPhotos,
          viewMode,
        });

        const frameCapture = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas toBlob failed'));
            },
            `image/${VIDEO_CAPTURE_FORMAT === 'jpg' ? 'jpeg' : 'png'}`,
            VIDEO_CAPTURE_QUALITY,
          );
        });

        if (i === 0) {
          try {
            const firstFrameBase64 = await RNFS.readFile(frameCapture, 'base64');
            const firstFrame = `data:image/jpeg;base64,${firstFrameBase64}`;
            videoThumbnailRef.current = firstFrame;
            setVideoThumbnail(firstFrame);
          } catch (thumbnailError) {
            console.warn('[videoRecorder] No se pudo crear miniatura:', thumbnailError);
          }
        }

        const destPath = `${framesDir}/frame${String(i).padStart(4, '0')}.${VIDEO_CAPTURE_EXTENSION}`;
        await RNFS.moveFile(frameCapture, destPath);

        capturedFrames = i + 1;

        if (streamingEncoder) {
          await enqueueStreamingFrame(frameCapture, i);
        }

        updateLinearProgress();
      }

      // 5. Finalizar/codificar el vídeo
      await new Promise((resolve) => setTimeout(resolve, 0));
      setGenerationPhase('generationEncoding');
      let outputPath;
      let encodedMime;

      if (streamingEncoder) {
        await streamingChain;
        streamingBacklog = 0;
        if (streamingError) disableStreamingEncoder(streamingError);
      }

      if (streamingEncoder) {
        try {
          const result = await streamingEncoder.finish();
          outputPath = result.outputPath;
          encodedMime = result.mimeType;
          encodedFrames = totalFrames;
          updateLinearProgress();
        } catch (streamingError) {
          console.warn(
            '[videoRecorder] Finalizacion streaming falló, usando fallback',
            streamingError,
          );
          streamingEncoder.abort?.();
          streamingEncoder = null;
          encodedFrames = 0;
        }
      }

      if (!outputPath) {
        const result = await encodeVideo(
          framesDir,
          allFrames.length,
          videoSpeed,
          (encodeProgress) => {
            encodedFrames = Math.max(encodedFrames, Math.round(encodeProgress * totalFrames));
            updateLinearProgress();
          },
        );
        outputPath = result.outputPath;
        encodedMime = result.mimeType;
      }
      setLocalVideoMime(encodedMime || null);
      RNFS.unlink(framesDir).catch(() => {});

      if (generationCancelledRef.current) {
        RNFS.unlink(outputPath).catch(() => {});
        setGenerationProgress(0);
        return;
      }

      setGenerationPhase('generationFinalizing');
      setGenerationProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 120));

      // 7. Reproducir video local
      const fileUri = Platform.OS === 'android' ? `file://${outputPath}` : outputPath;
      setLocalVideoPath(outputPath);
      setVideoUrl(fileUri);
      setCurrentVideoId(null);
      setShowPreviewScreen(true);
      // NO llamar showNotification aquí — el modal abierto ya indica que el video se generó.
      // La notificación causa re-renders (setNotification + Animated.sequence)
      // que provocan parpadeo del SurfaceView dentro del Modal transparente en Android.

      // Volver al último keyframe
      if (onGoToLastKeyframe && keyframes.length > 0) {
        onGoToLastKeyframe();
      }
    } catch (error) {
      streamingEncoder?.abort?.();
      if (generationCancelledRef.current) return;
      console.error('Error generando video:', error);
      showNotification(t('videoRecorder.errorGeneratingVideo'), 'error');
    } finally {
      setIsGenerating(false);
      setGenerationPhase('generationPreparing');
    }
  };

  // Guardar video en la base de datos (o actualizar si estamos editando)
  const saveVideoToDB = async () => {
    if (!videoNombre.trim()) {
      showNotification(t('videoRecorder.nameRequired'), 'error');
      return;
    }

    if (!keyframes || keyframes.length < 2) {
      showNotification(t('videoRecorder.noKeyframesToSave'), 'error');
      return;
    }

    try {
      setIsSaving(true);

      // Normalizar coordenadas al guardar para consistencia con config
      const refW = fieldWidth || 1280;
      const refH = fieldHeight || 720;
      const normalizedKeyframes = normalizeKeyframesForServer(keyframes, refW, refH);

      // Preparar datos del video
      const videoData = {
        keyframes: normalizedKeyframes.map((kf) => ({
          timestamp: kf.timestamp,
          elements: kf.elements,
          connectors: kf.connectors || [],
          ballTrajectoryType: kf.ballTrajectoryType || 'ground',
          ballTrajectoryById: kf.ballTrajectoryById || {},
        })),
        fieldType: fieldType,
        config: {
          fieldWidth: refW,
          fieldHeight: refH,
          fps: 30,
          moveDuration: 0.9,
          holdDuration: 0.1,
          speedMultiplier: videoSpeed,
          extraDurationEnd: 0.5,
          playersWithNumber: playersWithNumber,
        },
        nombre: videoNombre,
        descripcion: videoDescripcion,
        ...(shouldBeGlobal &&
          videoNombreEn.trim() && { translations: { en: { nombre: videoNombreEn.trim() } } }),
      };
      const thumbnailToSave = videoThumbnailRef.current || videoThumbnail;
      if (thumbnailToSave) videoData.thumbnail = thumbnailToSave;

      // Guardar en BD primero (rápido, solo JSON)
      let result;
      if (isEditingVideo && editingVideoId) {
        result = await apiUpdateVideo(editingVideoId, {
          ...videoData,
          ...(shouldBeGlobal && { isGlobal: true }),
        });
      } else {
        result = await apiSaveVideo({
          ...videoData,
          ejercicioId: ejercicioId,
          estrategiaId: estrategiaId,
          folderId: selectedFolderId,
          ...(shouldBeGlobal && { isGlobal: true }),
        });
      }

      if (result.success) {
        const savedVideoId = result.video?._id || result.video?.id || result.videoId;

        // Si estamos dentro de un ejercicio o estrategia, asegurarnos de que
        // el video quede asociado a ese recurso para aparecer en listados y
        // poder seleccionarlo desde entrenamientos.
        if (savedVideoId) {
          if (ejercicioId) {
            try {
              await linkVideoToExercise({ videoId: savedVideoId, exerciseId: ejercicioId });
            } catch (err) {
              console.warn('Error forzando enlace video->ejercicio:', err);
            }
          }
          if (estrategiaId) {
            try {
              await linkVideoToStrategy({ videoId: savedVideoId, strategyId: estrategiaId });
            } catch (err) {
              console.warn('Error forzando enlace video->estrategia:', err);
            }
          }
        }

        // Subir el vídeo generado a R2. En web esperamos a que termine para
        // que Mis Vídeos y Análisis Rival ya tengan una URL reproducible.
        // En móvil se mantiene fire-and-forget como antes.
        const videoPathToUpload = localVideoPath;
        if (videoPathToUpload && savedVideoId) {
          // Marcar como "subiendo" ANTES de limpiar el state para que el useEffect
          // cleanup no borre el archivo durante la subida
          uploadingPathRef.current = videoPathToUpload;
          setLocalVideoPath(null);

          const uploadSavedVideo = async () => {
            try {
              // Verificar que el archivo existe antes de intentar subir
              const exists = await RNFS.exists(videoPathToUpload);
              if (!exists) {
                throw new Error(`R2 upload: archivo local no existe: ${videoPathToUpload}`);
              }

              // Proxy upload: envía el vídeo al backend, que lo sube a R2
              // Evita problemas de conectividad directa con R2 (IPv6, etc.)
              let uploadOk = false;
              let key = null;
              for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                  const result = await proxyUploadToR2(videoPathToUpload);
                  key = result.r2Key;
                  uploadOk = true;
                  break;
                } catch (uploadErr) {
                  console.warn(`R2 proxy upload intento ${attempt} falló:`, uploadErr.message);
                  if (attempt < 2) {
                    await new Promise((r) => setTimeout(r, 2000));
                  }
                }
              }

              if (uploadOk && key) {
                await apiUpdateVideo(savedVideoId, { r2Key: key });
              } else {
                throw new Error('R2 upload falló tras 2 intentos');
              }
            } catch (err) {
              console.warn('R2 background upload failed:', err.message);
              if (Platform.OS === 'web') throw err;
            } finally {
              uploadingPathRef.current = null;
              RNFS.unlink(videoPathToUpload).catch(() => {});
            }
          };

          if (Platform.OS === 'web') {
            await uploadSavedVideo();
          } else {
            uploadSavedVideo();
          }
        } else if (localVideoPath) {
          // No hay savedVideoId, limpiar archivo local
          RNFS.unlink(localVideoPath).catch(() => {});
          setLocalVideoPath(null);
        }

        // Notificar al componente padre sobre el video guardado (para asociar a ejercicio/estrategia nuevo)
        if (global.fieldCallbacks?.onVideoSaved && savedVideoId) {
          global.fieldCallbacks.onVideoSaved(savedVideoId);
        }

        // Restaurar al estado original (antes de abrir video recorder)
        if (onRestoreOriginal) {
          onRestoreOriginal();
        }

        // Cerrar modales primero para que la notificación sea visible (no quede debajo del modal)
        setShowSaveModal(false);
        setShowPreviewScreen(false);
        setVideoNombre('');
        setVideoDescripcion('');
        setVideoThumbnail(null);
        videoThumbnailRef.current = null;
        setSelectedFolderId(null);
        onClearKeyframes();
        setCurrentVideoId(null);
        setVideoUrl(null);

        // Mostrar notificación según si es actualización o nuevo
        const successMessage = isEditingVideo
          ? t('videoRecorder.videoUpdatedSuccess')
          : t('videoRecorder.videoSavedSuccess');
        setTimeout(() => showNotification(successMessage, 'success'), 150);

        // Si estamos editando, cerrar y volver atrás
        if (isEditingVideo) {
          if (onEditVideoSaved) {
            setTimeout(() => onEditVideoSaved(), 300);
          } else if (onClose) {
            setTimeout(() => onClose(), 300);
          }
        }
      }
    } catch (error) {
      console.error('Error guardando video:', error);
      console.error('Response:', error.response?.data);
      const errorMessage = isEditingVideo
        ? t('videoRecorder.errorUpdatingVideo')
        : t('videoRecorder.errorSavingVideo');
      showNotification(errorMessage, 'error');
      // Notificar al padre (sandbox/Análisis Rival) para que pueda mostrar
      // su propio toast cuando el overlay se cierre.
      if (global.fieldCallbacks?.onVideoSaveError) {
        try {
          global.fieldCallbacks.onVideoSaveError(error);
        } catch (cbErr) {
          console.warn('onVideoSaveError callback threw:', cbErr);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Descargar video
  const downloadVideo = async () => {
    if (!localVideoPath) {
      showNotification(t('videoRecorder.noVideoToDownload'), 'error');
      return;
    }

    try {
      setIsGenerating(true);
      showNotification(t('videoRecorder.downloading') || 'Descargando video...', 'success');

      if (Platform.OS === 'web') {
        const safeName =
          (videoNombre || editingVideoName || 'video')
            .trim()
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
            .replace(/\s+/g, '_') || 'video';
        const ext = (localVideoMime || '').includes('mp4') ? 'mp4' : 'webm';
        const a = document.createElement('a');
        a.href = localVideoPath;
        a.download = `${safeName}.${ext}`;
        a.style.display = 'none';
        document.body.appendChild(a);
        await new Promise((r) => setTimeout(r, 0));
        a.click();
        setTimeout(() => {
          if (a.parentNode) a.parentNode.removeChild(a);
        }, 100);
        setTimeout(
          () =>
            showNotification(t('videoRecorder.downloadComplete') || 'Descarga iniciada', 'success'),
          150,
        );
        return;
      }

      if (Platform.OS === 'android') {
        try {
          const asset = await MediaLibrary.createAssetAsync(localVideoPath);
          await MediaLibrary.createAlbumAsync('xtramys', asset, false);
          setTimeout(
            () =>
              showNotification(
                t('videoRecorder.downloadComplete') || 'Descarga iniciada',
                'success',
              ),
            150,
          );
        } catch (saveErr) {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(
              Platform.OS === 'android' ? `file://${localVideoPath}` : localVideoPath,
              { mimeType: 'video/mp4' },
            );
            setTimeout(
              () =>
                showNotification(
                  t('videoRecorder.downloadComplete') || 'Descarga iniciada',
                  'success',
                ),
              150,
            );
          } else {
            throw saveErr;
          }
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          showNotification(
            t('videoRecorder.couldNotDownload') || 'No se pudo descargar el archivo',
            'error',
          );
          return;
        }
        const asset = await MediaLibrary.createAssetAsync(localVideoPath);
        await MediaLibrary.createAlbumAsync('xtramys', asset, false);
        setTimeout(
          () =>
            showNotification(t('videoRecorder.downloadComplete') || 'Descarga iniciada', 'success'),
          150,
        );
      }
    } catch (error) {
      console.error('Error descargando video:', error);
      showNotification(
        t('videoRecorder.couldNotDownload') || 'No se pudo descargar el archivo',
        'error',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Limpiar keyframes
  const clearKeyframes = () => {
    Alert.alert(t('field.clearPositionsTitle'), t('field.clearPositionsMessage'), [
      { text: t('edition.cancel'), style: 'cancel' },
      {
        text: t('field.delete'),
        onPress: () => {
          // Restaurar al estado original (posición inicial)
          // Esto SÍ se guarda en el historial para poder hacer undo
          if (onRestoreOriginal) {
            onRestoreOriginal();
          }
          onClearKeyframes();
          showNotification(
            t ? t('field.positionsDeleted') : i18n.t('field.positionsDeleted'),
            'success',
          );
        },
        style: 'destructive',
      },
    ]);
  };

  // Eliminar keyframe individual
  const removeKeyframe = (index) => {
    onKeyframesChange(keyframes.filter((_, i) => i !== index));
    showNotification(t ? t('field.positionDeleted') : i18n.t('field.positionDeleted'), 'success');
  };

  // Eliminar última captura
  const removeLastKeyframe = () => {
    if (keyframes.length > 0) {
      onKeyframesChange(keyframes.slice(0, -1));
      showNotification(t('videoRecorder.lastPositionDeleted'), 'success');
    }
  };

  // Cerrar pantalla de preview
  const closePreviewScreen = useCallback(() => {
    setShowPreviewScreen(false);
  }, []);

  // Cerrar modal de guardar y volver al preview
  const closeSaveModal = () => {
    setShowSaveModal(false);
    setVideoNombre('');
    setVideoDescripcion('');
    setSelectedFolderId(presetFolderId || editingVideoFolderId || null);
    setShowPreviewScreen(true); // Volver a la pantalla de preview
  };

  // Cargar carpetas
  const loadFolders = async () => {
    try {
      const lang = i18n.language;
      const result = await getAllVideoFoldersFlat(lang);
      if (result.success) {
        const folders = (result.folders || []).filter((f) => !f.isGlobal);
        setAllFolders(folders);
        if (
          selectedFolderId &&
          !folders.some((f) => f.id === selectedFolderId || f._id === selectedFolderId)
        ) {
          setSelectedFolderId(null);
        }
      }
    } catch (error) {
      console.error('Error cargando carpetas:', error);
    }
  };

  // Crear nueva carpeta
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showNotification(
        t('videoRecorder.folderNameRequired') || 'El nombre de la carpeta es requerido',
        'error',
      );
      return;
    }

    try {
      const folderData = {
        nombre: newFolderName.trim(),
        parentFolder: parentFolderForNew,
        color: newFolderColor,
      };
      const result = await createVideoFolder(folderData);

      if (result.success) {
        showNotification(t('videoRecorder.folderCreated') || 'Carpeta creada', 'success');
        setNewFolderName('');
        setNewFolderNameEn('');
        setNewFolderColor('#6366F1');
        setParentFolderForNew(null);
        // Recargar carpetas y seleccionar la nueva
        await loadFolders();
        if (result.folder?._id) {
          setSelectedFolderId(result.folder._id);
        }
        // Cerrar modal de crear carpeta y volver al modal de guardar sin flicker
        setShowCreateFolderModal(false);
        setShowSaveModal(true);
      }
    } catch (error) {
      console.error('Error creando carpeta:', error);
      const errorMsg =
        error.response?.data?.message ||
        t('videoRecorder.couldNotCreateFolder') ||
        'No se pudo crear la carpeta';
      showNotification(errorMsg, 'error');
    }
  };

  // Abrir modal de crear carpeta
  const openCreateFolderModal = (parentId = null) => {
    setShowSaveModal(false); // Hide save modal
    setParentFolderForNew(parentId);
    setNewFolderName('');
    setNewFolderColor('#6366F1');
    setShowCreateFolderModal(true);
  };

  // Cerrar modal de crear carpeta y volver al de guardar
  const closeCreateFolderModal = () => {
    setShowCreateFolderModal(false);
    setNewFolderName('');
    setNewFolderColor('#6366F1');
    setParentFolderForNew(null);
    setShowSaveModal(true); // Show save modal again
  };

  // Colores disponibles para carpetas
  const folderColors = [
    '#6366F1',
    '#8B5CF6',
    '#EC4899',
    '#EF4444',
    '#F97316',
    '#F59E0B',
    '#10B981',
    '#14B8A6',
    '#06B6D4',
    '#3B82F6',
    '#64748B',
    '#1E293B',
  ];

  // Callbacks estables para el preview (useCallback evita que React.memo se invalide)
  const handlePreviewSave = useCallback(async () => {
    // En modo edición, guardar directamente sin mostrar el modal de nombre/carpeta
    if (isEditingVideo && editingVideoId) {
      setShowPreviewScreen(false);
      await saveVideoToDB();
      return;
    }
    setShowPreviewScreen(false);
    setShowSaveModal(true);
    if (!videoNombre.trim() && editingVideoName) {
      setVideoNombre(editingVideoName);
    }
    setSelectedFolderId(presetFolderId || editingVideoFolderId || null);
    try {
      const lang = i18n.language;
      const result = await getAllVideoFoldersFlat(lang);
      if (result.success) {
        const folders = (result.folders || []).filter((f) => !f.isGlobal);
        setAllFolders(folders);
        if (
          selectedFolderId &&
          !folders.some((f) => f.id === selectedFolderId || f._id === selectedFolderId)
        ) {
          setSelectedFolderId(null);
        }
      }
    } catch (error) {
      console.error('Error cargando carpetas:', error);
    }
  }, [
    isEditingVideo,
    editingVideoId,
    presetFolderId,
    editingVideoFolderId,
    editingVideoName,
    videoNombre,
    selectedFolderId,
    saveVideoToDB,
  ]);

  const handlePreviewDownload = useCallback(() => {
    downloadVideo();
  }, [localVideoPath]);

  const progressPhaseLabel = generationPhase ? t(`videoRecorder.${generationPhase}`) : '';

  return (
    <>
      {/* Video Recorder Panel */}
      <View style={IS_MOBILE ? styles.panelMobile : styles.panelDesktop}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('videoRecorder.title')}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={14} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled={true}
        >
          {/* Capture button */}
          <TouchableOpacity
            style={styles.btnCapture}
            onPress={captureKeyframe}
            disabled={isGenerating}
          >
            <Text style={styles.btnCaptureText}>{t('videoRecorder.capture')}</Text>
          </TouchableOpacity>

          {/* Counter */}
          <View style={styles.counterRow}>
            <View style={[styles.counterBadge, keyframes.length > 0 && styles.counterBadgeActive]}>
              <Text
                style={[
                  styles.counterBadgeText,
                  keyframes.length > 0 && styles.counterBadgeTextActive,
                ]}
              >
                {keyframes.length}
              </Text>
            </View>
            <Text style={styles.counterLabel}>{t('videoRecorder.captures')}</Text>
          </View>

          {/* Secondary actions */}
          {keyframes.length > 0 && (
            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={removeLastKeyframe}
                disabled={isGenerating}
                accessibilityRole="button"
                accessibilityLabel={t('videoRecorder.deleteLast')}
              >
                <Text style={styles.btnSecondaryText}>{t('videoRecorder.deleteLast')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnDanger}
                onPress={clearKeyframes}
                disabled={isGenerating}
                accessibilityRole="button"
                accessibilityLabel={t('videoRecorder.clearAll')}
              >
                <Text style={styles.btnDangerText}>{t('videoRecorder.clearAll')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Speed selector */}
          {keyframes.length >= 2 && (
            <View style={styles.speedSection}>
              <Text style={styles.speedLabel}>{t('videoRecorder.speed')}</Text>
              <View style={styles.speedGroup}>
                {[0.5, 1.0, 2.0].map((spd) => (
                  <TouchableOpacity
                    key={spd}
                    style={[styles.speedBtn, videoSpeed === spd && styles.speedBtnActive]}
                    onPress={() => setVideoSpeed(spd)}
                  >
                    <Text
                      style={[styles.speedBtnText, videoSpeed === spd && styles.speedBtnTextActive]}
                    >
                      x{spd}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Generate button */}
          {keyframes.length >= 2 && (
            <TouchableOpacity
              style={[styles.btnGenerate, isGenerating && styles.btnGenerateDisabled]}
              onPress={generateVideo}
              disabled={isGenerating}
            >
              <Text style={styles.btnGenerateText}>
                {isGenerating ? t('videoRecorder.generating') : t('videoRecorder.generate')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Keyframe list */}
          {keyframes.length > 0 && (
            <View style={styles.kfSection}>
              <Text style={styles.kfSectionTitle}>{t('videoRecorder.capturedPositions')}</Text>
              <View style={styles.kfList}>
                {keyframes.map((_, index) => {
                  const isLast = index === keyframes.length - 1;
                  const ballMovements = getSegmentBallMovements(keyframes, index);
                  const setTrajectory = (ballId, newType) => {
                    onKeyframesChange(
                      keyframes.map((kf, i) => {
                        if (i !== index) return kf;
                        const segmentBalls = (kf.elements || []).filter((el) => el.type === 'ball');
                        return {
                          ...kf,
                          ballTrajectoryById: {
                            ...(kf.ballTrajectoryById || {}),
                            [ballId]: newType,
                          },
                          ballTrajectoryType:
                            segmentBalls.length <= 1 ? newType : kf.ballTrajectoryType || 'ground',
                        };
                      }),
                    );
                  };
                  return (
                    <View key={index} style={styles.kfItem}>
                      <View style={styles.kfItemTop}>
                        <View style={styles.kfNum}>
                          <Text style={styles.kfNumText}>{index + 1}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => onSelectKeyframe && onSelectKeyframe(index)}
                          style={styles.kfViewBtn}
                        >
                          <Text style={styles.kfViewBtnText}>{t('videoRecorder.view')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeKeyframe(index)}
                          style={styles.kfRemoveBtn}
                        >
                          <Text style={styles.kfRemoveBtnText}>×</Text>
                        </TouchableOpacity>
                      </View>

                      {!isLast && ballMovements.length > 0 && (
                        <View style={styles.trajSection}>
                          <View style={styles.trajHeaderRow}>
                            <Text style={styles.trajHeaderText}>
                              {t('videoRecorder.ballMovementType', 'Movimiento del balón')}
                            </Text>
                            <Text style={styles.trajHeaderHint}>
                              {t('videoRecorder.ballMovementHint', 'Tramo')} {index + 1}
                              {' -> '}
                              {index + 2}
                            </Text>
                          </View>
                          {ballMovements.map((movement) => {
                            const trajectory = movement.trajectory;
                            const label = getBallMovementTitle(movement.fromBall, movement.toBall);
                            return (
                              <View key={movement.id} style={styles.trajCard}>
                                <View style={styles.trajCardTextCol}>
                                  <Text style={styles.trajLabel} numberOfLines={2}>
                                    {label}
                                  </Text>
                                  <Text style={styles.trajMeta} numberOfLines={1}>
                                    {trajectory === 'air'
                                      ? t('videoRecorder.ballAirSelected', 'Sale por aire')
                                      : t('videoRecorder.ballGroundSelected', 'Rueda por suelo')}
                                  </Text>
                                </View>
                                <View style={styles.trajToggle}>
                                  <TouchableOpacity
                                    onPress={() => setTrajectory(movement.id, 'ground')}
                                    style={[
                                      styles.trajOpt,
                                      trajectory === 'ground' && styles.trajOptActive,
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('videoRecorder.ballGround', 'Suelo')}
                                  >
                                    <Feather
                                      name="arrow-right"
                                      size={10}
                                      color={trajectory === 'ground' ? '#fff' : '#166534'}
                                    />
                                    <Text
                                      style={[
                                        styles.trajOptText,
                                        trajectory === 'ground' && styles.trajOptTextActive,
                                      ]}
                                    >
                                      {t('videoRecorder.ballGround', 'Suelo')}
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => setTrajectory(movement.id, 'air')}
                                    style={[
                                      styles.trajOpt,
                                      trajectory === 'air' && styles.trajOptActiveAir,
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('videoRecorder.ballAir', 'Aire')}
                                  >
                                    <Feather
                                      name="trending-up"
                                      size={10}
                                      color={trajectory === 'air' ? '#fff' : '#92400e'}
                                    />
                                    <Text
                                      style={[
                                        styles.trajOptText,
                                        trajectory === 'air' && styles.trajOptTextActive,
                                      ]}
                                    >
                                      {t('videoRecorder.ballAir', 'Aire')}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Pantalla fullscreen de preview — componente aislado, sin parpadeos */}
      {showPreviewScreen && videoUrl && (
        <VideoPreviewScreen
          videoUrl={videoUrl}
          onClose={closePreviewScreen}
          onSave={handlePreviewSave}
          onDownload={handlePreviewDownload}
          title={t('videoRecorder.videoPreviewTitle')}
          saveLabel={t('videoRecorder.saveVideo')}
          downloadLabel={t('videoRecorder.downloadVideo')}
        />
      )}

      {/* Modal para guardar video */}
      <Modal
        visible={showSaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeSaveModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.saveModal}>
            {/* Header del modal */}
            <View
              style={[styles.modalHeader, { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }]}
            >
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#f5f5f5' }]}>
                <Feather name="save" size={20} color="#4CAF50" />
              </View>
              <Text style={[styles.modalTitle, { color: '#1a1a1a' }]}>
                {t('videoRecorder.saveModalTitle')}
              </Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: '#f5f5f5' }]}
                onPress={closeSaveModal}
              >
                <Feather name="x" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
              showsVerticalScrollIndicator={false}
              style={styles.saveModalScroll}
              contentContainerStyle={styles.saveModalContent}
            >
              {/* Campo de nombre */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Feather name="edit-3" size={14} color="#666" />
                  <Text style={styles.inputLabel}>{t('videoRecorder.videoNameLabel')}</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('videoRecorder.videoNamePlaceholder')}
                  placeholderTextColor="#999"
                  value={videoNombre}
                  onChangeText={setVideoNombre}
                  maxLength={100}
                />
              </View>

              {/* Nombre en Inglés (admin/global) */}
              {shouldBeGlobal && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Feather name="globe" size={14} color="#1e40af" />
                    <Text style={[styles.inputLabel, { color: '#1e40af' }]}>English Name</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Video name (English)"
                    placeholderTextColor="#999"
                    value={videoNombreEn}
                    onChangeText={setVideoNombreEn}
                    maxLength={100}
                  />
                </View>
              )}

              {/* Campo de descripción */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Feather name="align-left" size={14} color="#666" />
                  <Text style={styles.inputLabel}>{t('videoRecorder.descriptionLabel')}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('videoRecorder.descriptionPlaceholder')}
                  placeholderTextColor="#999"
                  value={videoDescripcion}
                  onChangeText={setVideoDescripcion}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>

              {/* Selector de carpeta */}
              {!hideFolderPicker && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Feather name="folder" size={14} color="#666" />
                    <Text style={styles.inputLabel}>{t('videoRecorder.folderLabel')}</Text>
                    <TouchableOpacity
                      style={styles.createFolderHeaderBtn}
                      onPress={() => openCreateFolderModal(null)}
                    >
                      <Feather name="folder-plus" size={14} color="#4CAF50" />
                      <Text style={styles.createFolderHeaderBtnText}>
                        {t('videoRecorder.newFolder') || 'Nueva'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.folderSelectContainer}>
                    <ScrollView
                      style={styles.folderSelectList}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {/* Carpeta raíz */}
                      <View style={styles.folderItemRow}>
                        <TouchableOpacity
                          style={[
                            styles.folderSelectItem,
                            styles.folderSelectItemFlex,
                            selectedFolderId === null && styles.folderSelectItemActive,
                          ]}
                          onPress={() => setSelectedFolderId(null)}
                        >
                          <View style={[styles.folderSelectIcon, { backgroundColor: '#F1F5F9' }]}>
                            <Feather name="home" size={14} color="#64748B" />
                          </View>
                          <Text style={styles.folderSelectText}>
                            {t('videoRecorder.rootFolder')}
                          </Text>
                          {selectedFolderId === null && (
                            <Feather name="check-circle" size={16} color="#4CAF50" />
                          )}
                        </TouchableOpacity>
                      </View>

                      {allFolders.map((folder) => (
                        <View
                          key={folder.id}
                          style={[styles.folderItemRow, folder.level === 1 && { marginLeft: 16 }]}
                        >
                          <TouchableOpacity
                            style={[
                              styles.folderSelectItem,
                              styles.folderSelectItemFlex,
                              selectedFolderId === folder.id && styles.folderSelectItemActive,
                            ]}
                            onPress={() => setSelectedFolderId(folder.id)}
                          >
                            <View
                              style={[
                                styles.folderSelectIcon,
                                { backgroundColor: folder.color || '#2196F3' },
                              ]}
                            >
                              <Feather name="folder" size={12} color="#fff" />
                            </View>
                            <Text style={styles.folderSelectText} numberOfLines={1}>
                              {folder.displayName || folder.nombre}
                            </Text>
                            {selectedFolderId === folder.id && (
                              <Feather name="check-circle" size={16} color="#4CAF50" />
                            )}
                          </TouchableOpacity>
                          {/* Botón para crear subcarpeta */}
                          <TouchableOpacity
                            style={styles.createSubfolderBtn}
                            onPress={() => openCreateFolderModal(folder.id)}
                          >
                            <Feather name="plus" size={14} color="#666" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </KeyboardAwareScrollView>

            {/* Footer con botones */}
            <View style={styles.saveModalActions}>
              <TouchableOpacity
                style={[styles.saveModalBtn, styles.saveModalBtnSecondary]}
                onPress={closeSaveModal}
                disabled={isSaving}
              >
                <Feather name="x" size={16} color="#666" />
                <Text style={styles.saveModalBtnTextSecondary}>{t('videoRecorder.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveModalBtn,
                  styles.saveModalBtnPrimary,
                  (!videoNombre.trim() || isSaving) && styles.saveModalBtnDisabled,
                ]}
                onPress={saveVideoToDB}
                disabled={isSaving || !videoNombre.trim()}
              >
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.saveModalBtnTextPrimary}>
                  {isSaving ? t('videoRecorder.saving') : t('videoRecorder.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para crear carpeta */}
      <Modal
        visible={showCreateFolderModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeCreateFolderModal}
      >
        <View style={[styles.modalOverlay, styles.createFolderModalOverlay]}>
          <View style={styles.createFolderModal}>
            {/* Header */}
            <View style={[styles.modalHeader, styles.createFolderModalHeader]}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#E8F5E9' }]}>
                <Feather name="folder-plus" size={20} color="#4CAF50" />
              </View>
              <Text style={[styles.modalTitle, { color: '#1a1a1a' }]}>
                {parentFolderForNew
                  ? t('videoRecorder.createSubfolder') || 'Nueva subcarpeta'
                  : t('videoRecorder.createFolder') || 'Nueva carpeta'}
              </Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeCreateFolderModal}>
                <Feather name="x" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.createFolderContent}>
              {/* Mostrar carpeta padre si es subcarpeta */}
              {parentFolderForNew && (
                <View style={styles.parentFolderInfo}>
                  <Feather name="corner-down-right" size={14} color="#666" />
                  <Text style={styles.parentFolderText}>
                    {t('videoRecorder.insideFolder') || 'Dentro de:'}{' '}
                    {allFolders.find((f) => f.id === parentFolderForNew)?.nombre || 'Carpeta'}
                  </Text>
                </View>
              )}

              {/* Nombre de la carpeta */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Feather name="edit-3" size={14} color="#666" />
                  <Text style={styles.inputLabel}>
                    {t('videoRecorder.folderNameLabel') || 'Nombre de la carpeta'}
                  </Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('videoRecorder.folderNamePlaceholder') || 'Ej: Jugadas de ataque'}
                  placeholderTextColor="#999"
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  maxLength={50}
                  autoFocus={true}
                />
              </View>

              {/* Traducción inglés (admin / global) */}
              {shouldBeGlobal && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Feather name="globe" size={14} color="#1e40af" />
                    <Text style={[styles.inputLabel, { color: '#1e40af' }]}>English</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Folder name (English)"
                    placeholderTextColor="#999"
                    value={newFolderNameEn}
                    onChangeText={setNewFolderNameEn}
                    maxLength={50}
                  />
                </View>
              )}

              {/* Selector de color */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Feather name="droplet" size={14} color="#666" />
                  <Text style={styles.inputLabel}>{t('videoRecorder.folderColor') || 'Color'}</Text>
                </View>
                <View style={styles.colorGrid}>
                  {folderColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newFolderColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => setNewFolderColor(color)}
                    >
                      {newFolderColor === color && <Feather name="check" size={14} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={[styles.saveModalActions, styles.createFolderModalFooter]}>
              <TouchableOpacity
                style={[styles.saveModalBtn, styles.saveModalBtnSecondary]}
                onPress={closeCreateFolderModal}
              >
                <Feather name="x" size={16} color="#666" />
                <Text style={styles.saveModalBtnTextSecondary}>
                  {t('videoRecorder.cancel') || 'Cancelar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveModalBtn,
                  styles.saveModalBtnPrimary,
                  !newFolderName.trim() && styles.saveModalBtnDisabled,
                ]}
                onPress={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                <Feather name="folder-plus" size={16} color="#fff" />
                <Text style={styles.saveModalBtnTextPrimary}>
                  {t('videoRecorder.create') || 'Crear'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de progreso de generación */}
      <Modal
        visible={isGenerating}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          generationCancelledRef.current = true;
        }}
      >
        <View style={styles.progressOverlay}>
          <View style={styles.progressModal}>
            <View style={styles.progressIconWrap}>
              <Feather name="film" size={24} color="#2563EB" />
            </View>
            <Text style={styles.progressTitle}>{t('videoRecorder.generating')}</Text>
            <View style={styles.progressStatusRow}>
              <Text style={styles.progressPhase}>{progressPhaseLabel}</Text>
              <Text style={styles.progressPercent}>{generationProgress}%</Text>
            </View>
            <View style={styles.progressBarOuter}>
              <View style={[styles.progressBarInner, { width: `${generationProgress}%` }]} />
            </View>
            <TouchableOpacity
              style={styles.progressCancelBtn}
              onPress={() => {
                generationCancelledRef.current = true;
              }}
            >
              <Feather name="x" size={16} color="#EF4444" />
              <Text style={styles.progressCancelText}>{t('videoRecorder.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notificación flotante */}
      {notification.visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.notification,
            notification.type === 'success' ? styles.notificationSuccess : styles.notificationError,
            {
              opacity: notificationAnim,
              transform: [
                {
                  translateY: notificationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.notificationIcon}>{notification.type === 'success' ? '✓' : '⚠'}</Text>
          <Text style={styles.notificationText}>{notification.message}</Text>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // ── Panel ──
  panelDesktop: {
    position: 'absolute',
    left: 16,
    top: 80,
    width: 230,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 1000,
  },
  panelMobile: {
    position: 'absolute',
    right: 6,
    top: 52,
    width: SCREEN_WIDTH < 380 ? 108 : 120,
    maxHeight: SCREEN_HEIGHT < 720 ? '70%' : '76%',
    backgroundColor: '#ffffff',
    borderRadius: 9,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: IS_MOBILE ? 3 : 8,
    marginBottom: IS_MOBILE ? 3 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: IS_MOBILE ? (SCREEN_WIDTH < 400 ? 8 : 9) : 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  closeBtn: {
    width: IS_MOBILE ? 18 : 22,
    height: IS_MOBILE ? 18 : 22,
    borderRadius: IS_MOBILE ? 9 : 11,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: IS_MOBILE ? 3 : 6,
  },
  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 4 },
  // ── Capture button ──
  btnCapture: {
    backgroundColor: '#16a34a',
    borderRadius: IS_MOBILE ? 5 : 8,
    paddingVertical: IS_MOBILE ? 3 : 9,
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: IS_MOBILE ? 3 : 6,
  },
  btnCaptureText: {
    color: '#fff',
    fontSize: IS_MOBILE ? 7 : 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // ── Counter ──
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_MOBILE ? 3 : 6,
    marginBottom: IS_MOBILE ? 3 : 6,
  },
  counterBadge: {
    width: IS_MOBILE ? 15 : 20,
    height: IS_MOBILE ? 15 : 20,
    borderRadius: IS_MOBILE ? 7.5 : 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBadgeActive: {
    backgroundColor: '#2563EB',
  },
  counterBadgeText: {
    fontSize: IS_MOBILE ? 7 : 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  counterBadgeTextActive: {
    color: '#fff',
  },
  counterLabel: {
    fontSize: IS_MOBILE ? 7 : 11,
    color: '#64748b',
    fontWeight: '500',
  },
  // ── Secondary actions ──
  secondaryRow: {
    flexDirection: IS_MOBILE ? 'column' : 'row',
    gap: IS_MOBILE ? 2 : 4,
    marginBottom: IS_MOBILE ? 3 : 6,
  },
  btnSecondary: {
    backgroundColor: '#d97706',
    borderRadius: IS_MOBILE ? 4 : 6,
    paddingVertical: IS_MOBILE ? 3 : 7,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: IS_MOBILE ? 20 : 30,
  },
  btnSecondaryText: {
    color: '#fff',
    fontSize: IS_MOBILE ? 6 : 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  btnDanger: {
    backgroundColor: '#dc2626',
    borderRadius: IS_MOBILE ? 4 : 6,
    paddingVertical: IS_MOBILE ? 3 : 7,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: IS_MOBILE ? 20 : 30,
  },
  btnDangerText: {
    color: '#fff',
    fontSize: IS_MOBILE ? 6 : 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // ── Speed ──
  speedSection: {
    marginBottom: IS_MOBILE ? 3 : 6,
  },
  speedLabel: {
    fontSize: IS_MOBILE ? 6 : 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: IS_MOBILE ? 2 : 4,
  },
  speedGroup: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: IS_MOBILE ? 4 : 6,
    padding: IS_MOBILE ? 1 : 2,
    gap: IS_MOBILE ? 1 : 2,
  },
  speedBtn: {
    flex: 1,
    paddingVertical: IS_MOBILE ? 2 : 4,
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  speedBtnActive: {
    backgroundColor: '#2563EB',
  },
  speedBtnText: {
    fontSize: IS_MOBILE ? 6 : 10,
    fontWeight: '600',
    color: '#64748b',
  },
  speedBtnTextActive: {
    color: '#fff',
  },
  // ── Generate ──
  btnGenerate: {
    backgroundColor: '#2563EB',
    borderRadius: IS_MOBILE ? 5 : 8,
    paddingVertical: IS_MOBILE ? 3 : 9,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: IS_MOBILE ? 3 : 6,
  },
  btnGenerateDisabled: {
    opacity: 0.5,
  },
  btnGenerateText: {
    color: '#fff',
    fontSize: IS_MOBILE ? 7 : 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // ── Keyframe section ──
  kfSection: {
    marginTop: 1,
  },
  kfSectionTitle: {
    fontSize: SCREEN_WIDTH < 400 ? 7 : 8,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  kfList: {
    maxHeight: IS_MOBILE ? (SCREEN_HEIGHT < 720 ? 96 : 118) : 320,
  },
  kfItem: {
    backgroundColor: '#f8fafc',
    borderRadius: IS_MOBILE ? 6 : 10,
    padding: IS_MOBILE ? 3 : 7,
    marginBottom: IS_MOBILE ? 3 : 6,
    borderLeftWidth: IS_MOBILE ? 2 : 3,
    borderLeftColor: '#2563EB',
  },
  kfItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_MOBILE ? 2 : 4,
  },
  kfNum: {
    width: IS_MOBILE ? 14 : 18,
    height: IS_MOBILE ? 14 : 18,
    borderRadius: IS_MOBILE ? 7 : 9,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kfNumText: {
    fontSize: IS_MOBILE ? 7 : 9,
    fontWeight: '700',
    color: '#2563EB',
  },
  kfViewBtn: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    paddingVertical: IS_MOBILE ? 1 : 2,
    paddingHorizontal: IS_MOBILE ? 2 : 4,
    alignItems: 'center',
  },
  kfViewBtnText: {
    fontSize: IS_MOBILE ? 6 : 9,
    fontWeight: '600',
    color: '#2563EB',
  },
  kfRemoveBtn: {
    width: IS_MOBILE ? 14 : 18,
    height: IS_MOBILE ? 14 : 18,
    borderRadius: IS_MOBILE ? 7 : 9,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kfRemoveBtnText: {
    fontSize: IS_MOBILE ? 10 : 14,
    fontWeight: '700',
    color: '#ef4444',
    lineHeight: IS_MOBILE ? 10 : 14,
  },
  // ── Trajectory ──
  trajSection: {
    marginTop: IS_MOBILE ? 2 : 7,
    gap: IS_MOBILE ? 2 : 6,
  },
  trajHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: IS_MOBILE ? 3 : 6,
    marginBottom: IS_MOBILE ? 0 : 1,
  },
  trajHeaderText: {
    flex: 1,
    fontSize: IS_MOBILE ? 6 : 10,
    color: '#0f172a',
    fontWeight: '800',
  },
  trajHeaderHint: {
    fontSize: IS_MOBILE ? 5 : 9,
    color: '#64748b',
    fontWeight: '700',
  },
  trajCard: {
    backgroundColor: '#ffffff',
    borderRadius: IS_MOBILE ? 5 : 9,
    padding: IS_MOBILE ? 2 : 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: IS_MOBILE ? 2 : 6,
  },
  trajCardTextCol: {
    gap: 1,
  },
  trajLabel: {
    fontSize: IS_MOBILE ? 6 : 10,
    color: '#0f172a',
    fontWeight: '800',
    lineHeight: IS_MOBILE ? 8 : 13,
  },
  trajMeta: {
    fontSize: IS_MOBILE ? 5 : 9,
    color: '#64748b',
    fontWeight: '600',
  },
  trajToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: IS_MOBILE ? 5 : 12,
    padding: IS_MOBILE ? 1 : 2,
    gap: IS_MOBILE ? 1 : 3,
  },
  trajOpt: {
    flex: 1,
    minHeight: IS_MOBILE ? 16 : 30,
    paddingVertical: 1,
    paddingHorizontal: IS_MOBILE ? 2 : 5,
    borderRadius: IS_MOBILE ? 4 : 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: IS_MOBILE ? 1 : 3,
  },
  trajOptActive: {
    backgroundColor: '#16a34a',
  },
  trajOptActiveAir: {
    backgroundColor: '#f59e0b',
  },
  trajOptText: {
    fontSize: IS_MOBILE ? 5 : 10,
    fontWeight: '800',
    color: '#475569',
  },
  trajOptTextActive: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header del modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
  },
  modalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Fullscreen preview screen ──
  previewScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 99999,
    elevation: 99999,
  },
  previewScreenInner: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewScreenTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  previewCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewVideoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  previewVideoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: IS_MOBILE ? '50%' : '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  previewVideoPlayer: {
    width: '100%',
    height: '100%',
  },
  previewBottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: IS_MOBILE ? 10 : 16,
    paddingHorizontal: IS_MOBILE ? 16 : 24,
    gap: IS_MOBILE ? 24 : 32,
  },
  previewBottomBtn: {
    alignItems: 'center',
    gap: 4,
  },
  previewBottomBtnIcon: {
    width: IS_MOBILE ? 42 : 52,
    height: IS_MOBILE ? 42 : 52,
    borderRadius: IS_MOBILE ? 21 : 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBottomBtnText: {
    fontSize: IS_MOBILE ? 10 : 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  saveModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: IS_MOBILE ? '92%' : 380,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  saveModalScroll: {
    maxHeight: '100%',
  },
  saveModalContent: {
    paddingBottom: 8,
  },
  saveModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  textArea: {
    height: 80,
    verticalAlign: 'top',
  },
  saveModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveModalBtnPrimary: {
    backgroundColor: '#4CAF50',
  },
  saveModalBtnSecondary: {
    backgroundColor: '#f5f5f5',
  },
  saveModalBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  saveModalBtnTextPrimary: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  saveModalBtnTextSecondary: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  notification: {
    position: 'absolute',
    top: IS_MOBILE ? 16 : 24,
    alignSelf: 'center',
    width: 'auto',
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10000,
  },
  notificationSuccess: {
    borderLeftColor: '#10b981',
  },
  notificationError: {
    borderLeftColor: '#ef4444',
  },
  notificationIcon: {
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
    fontWeight: 'bold',
  },
  notificationText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  folderSelectContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    maxHeight: 140,
    overflow: 'hidden',
  },
  folderSelectList: {
    padding: 6,
  },
  folderSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginBottom: 3,
    backgroundColor: 'transparent',
  },
  folderSelectItemFlex: {
    flex: 1,
  },
  folderSelectItemActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  folderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  createSubfolderBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  createFolderHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    gap: 4,
  },
  createFolderHeaderBtnText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  createFolderModalOverlay: {
    zIndex: 9999,
    elevation: 9999,
  },
  createFolderModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: IS_MOBILE ? '92%' : '90%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  createFolderModalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 0,
  },
  createFolderModalFooter: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  createFolderContent: {
    padding: 16,
  },
  parentFolderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  parentFolderText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  folderSelectIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  folderSelectText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  folderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 10,
    backgroundColor: '#f0f7ff',
    gap: 10,
    marginBottom: 16,
    minHeight: 50,
  },
  folderSelectorText: {
    flex: 1,
    fontSize: 15,
    color: '#1565C0',
    fontWeight: '600',
  },
  folderPickerModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  folderPickerList: {
    maxHeight: 350,
    marginBottom: 16,
  },
  folderPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  folderPickerItemSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  folderPickerItemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  folderPickerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Estilos para selector de velocidad
  speedSection: {
    marginTop: 8,
    marginBottom: 6,
  },
  speedSectionMobile: {
    marginTop: 4,
    marginBottom: 2,
  },
  speedLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  speedButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  speedButton: {
    flex: 1,
    padding: 2,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  speedButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  speedButtonText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#666',
  },
  speedButtonTextActive: {
    color: '#fff',
  },
  // ── Progress modal ──
  progressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModal: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: IS_MOBILE ? 18 : 24,
    width: IS_MOBILE ? '85%' : 320,
    maxWidth: 360,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
  },
  progressIconWrap: {
    width: IS_MOBILE ? 36 : 44,
    height: IS_MOBILE ? 36 : 44,
    borderRadius: IS_MOBILE ? 18 : 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: IS_MOBILE ? 8 : 12,
  },
  progressTitle: {
    fontSize: IS_MOBILE ? 15 : 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: IS_MOBILE ? 10 : 14,
  },
  progressStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressPhase: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    paddingRight: 12,
  },
  progressBarOuter: {
    width: '100%',
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 999,
  },
  progressPercent: {
    minWidth: 48,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  progressCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 6,
  },
  progressCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});
