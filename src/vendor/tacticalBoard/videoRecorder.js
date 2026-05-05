import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import RNFS from 'react-native-fs';
import { captureRef } from 'react-native-view-shot';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { initRecordingSession, generateVideo as encodeVideo, warmUpFFmpeg, createStreamingVideoEncoder } from '@/utils/videoUtils';
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

// Tipos de elementos que soportan lineType (línea punteada/continua)
const LINE_TYPE_ELEMENTS = new Set(['straight-line', 'straight-arrow', 'curve-line', 'curve-arrow', 'circle', 'rectangle', 'custom-shape']);
const VIDEO_CAPTURE_FORMAT = 'jpg';
const VIDEO_CAPTURE_EXTENSION = 'jpg';
const VIDEO_CAPTURE_QUALITY = 0.92;
const VIDEO_CAPTURE_MAX_PIXEL_RATIO = 1.4;
const STREAMING_ENCODE_BACKLOG = 6;

function getVideoCapturePixelRatio() {
  const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return Math.max(1, Math.min(ratio, VIDEO_CAPTURE_MAX_PIXEL_RATIO));
}

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
  const player = useVideoPlayer(videoUrl, p => {
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
    'xRatio', 'yRatio',
    'x', 'y',
    'x1', 'y1', 'x2', 'y2',
    'width', 'height', 'radius',
    'size', 'baseSize',
    'fontSize', 'baseFontSize',
    'thickness', 'baseThickness',
    'rotation',
  ].forEach((prop) => lerpNumericProp(out, from, to, prop, t));

  const pointsRatio = lerpPointArray(from.pointsRatio, to.pointsRatio, t);
  if (pointsRatio) out.pointsRatio = pointsRatio;

  const points = lerpPointArray(from.points, to.points, t);
  if (points) out.points = points;

  return out;
}

// Genera todos los frames interpolados entre todos los keyframes
function buildInterpolatedFrames(keyframes, fps, moveDuration, holdDuration, speedMultiplier, extraDurationEnd) {
  if (!keyframes || keyframes.length < 2) return [];

  const framesPerTransition = Math.max(2, Math.round(fps * moveDuration / speedMultiplier));
  const holdFrames = Math.max(1, Math.round(fps * holdDuration / speedMultiplier));
  const extraFrames = Math.round(fps * extraDurationEnd);
  const frames = [];

  // Hold inicial en la primera posición (misma duración que holdDuration)
  const firstKf = keyframes[0];
  for (let h = 0; h < holdFrames; h++) {
    frames.push({ elements: firstKf.elements, connectors: firstKf.connectors || [] });
  }

  for (let ki = 0; ki < keyframes.length; ki++) {
    const kf = keyframes[ki];

    // Interpolate to next keyframe (movimiento fluido)
    if (ki < keyframes.length - 1) {
      const fromEls = kf.elements || [];
      const toEls = keyframes[ki + 1].elements || [];
      const toConnectors = keyframes[ki + 1].connectors || kf.connectors || [];

      // Build id→element maps
      const fromMap = new Map(fromEls.map(e => [e.id, e]));
      const toMap = new Map(toEls.map(e => [e.id, e]));
      const allIds = new Set([...fromMap.keys(), ...toMap.keys()]);

      for (let f = 1; f <= framesPerTransition; f++) {
        const t = easeInOutCubic(f / framesPerTransition);
        const interpolated = [];
        for (const id of allIds) {
          const fe = fromMap.get(id);
          const te = toMap.get(id);
          if (fe && te) {
            interpolated.push(interpolateElement(fe, te, t));
          } else {
            // Solo en uno de los dos: mantener el que existe
            interpolated.push({ ...(te || fe) });
          }
        }
        // Interpolar conectores: usar los del destino para la segunda mitad
        const connectors = t < 0.5 ? (kf.connectors || []) : toConnectors;
        frames.push({ elements: interpolated, connectors });
      }

      // Hold: pausa breve en el punto de destino
      const destKf = keyframes[ki + 1];
      for (let h = 0; h < holdFrames; h++) {
        frames.push({ elements: destKf.elements, connectors: destKf.connectors || [] });
      }
    }
  }

  // Extra frames al final (mantener última posición)
  const lastKf = keyframes[keyframes.length - 1];
  for (let e = 0; e < extraFrames; e++) {
    frames.push({ elements: lastKf.elements, connectors: lastKf.connectors || [] });
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
  
  return keyframes.map(kf => ({
    ...kf,
    elements: (kf.elements || []).map(elem => {
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
          norm.points = norm.pointsRatio.map(pt => ({
            x: pt.x * refWidth,
            y: pt.y * refHeight
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
          norm.points = norm.pointsRatio.map(pt => ({
            x: pt.x * refWidth,
            y: pt.y * refHeight
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
  editingVideoDescription = '', // Descripción del video en edición
  editingVideoFolderId = null, // Carpeta del video en edición
  hideFolderPicker = false, // Ocultar selector de carpeta
  presetFolderId = null, // Carpeta preseleccionada (se usa automáticamente)
  isGlobalExercise = false, // Si el ejercicio es global (app) - solo mostrar carpetas globales
  onEditVideoSaved = null, // Callback tras guardar exitosamente en modo edición
}) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [showPreviewScreen, setShowPreviewScreen] = useState(false);

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
  const [videoDescripcion, setVideoDescripcion] = useState(editingVideoDescription || '');

  useEffect(() => {
    if (editingVideoName) {
      setVideoNombre((current) => current || editingVideoName);
    }
  }, [editingVideoName]);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' });
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
  const [isAdmin, setIsAdmin] = useState(false);
  const shouldBeGlobal = isAdmin || isGlobalExercise;

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
          if (parsed?.role === 'admin') { setIsAdmin(true); return; }
        }
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const parts = token.split('.');
          if (parts.length === 3) {
            const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
              + '='.repeat((4 - parts[1].length % 4) % 4);
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            let decoded = ''; let idx = 0;
            while (idx < b64.length) {
              const e1 = chars.indexOf(b64[idx++]), e2 = chars.indexOf(b64[idx++]);
              const e3 = chars.indexOf(b64[idx++]), e4 = chars.indexOf(b64[idx++]);
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
          return;
        }
        
        // Verificar que la imagen del campo esté completamente cargada
        if (!fieldImageReady) {
          showNotification(t('videoRecorder.waitingFieldImage'), 'success');
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
          return;
        }
      }
      
      // Capturar datos de elementos para interpolación - ULTRA OPTIMIZADO
      const elementsSnapshot = elements.map(elem => {
        // SOLO guardar propiedades esenciales mínimas
        const snapshot = { 
          type: elem.type,
          id: elem.id,
        };
        
        // Calcular el factor de escala EXACTAMENTE igual que en field.js
        const { width, height } = Dimensions.get('window');
        const isMobile = Math.min(width, height) < 768;
        const baseScale = Math.min(fieldWidth, fieldHeight) / 500;
        const scaleFactor = isMobile ? baseScale * 1.35 : baseScale;
        
        // Para elementos con xRatio/yRatio, convertir a coordenadas absolutas
        if (elem.xRatio !== undefined && elem.yRatio !== undefined) {
          // Guardar RATIOS originales para poder restaurar exactamente
          snapshot.xRatio = elem.xRatio;
          snapshot.yRatio = elem.yRatio;
          // Redondear para reducir tamaño de datos JSON
          snapshot.x = Math.round(elem.xRatio * fieldWidth * 100) / 100;
          snapshot.y = Math.round(elem.yRatio * fieldHeight * 100) / 100;
          
          // Calcular tamaño escalado
          const baseSize = elem.size || 24;
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
                snapshot.photoUrl = elem.playerData.foto;
              }
            }
            // Añadir configuración de mostrar fotos y números
            snapshot.showPhotos = showPhotos;
            snapshot.playersWithNumber = playersWithNumber;
            // Añadir datos del portero
            snapshot.isGoalkeeper = elem.isGoalkeeper || 
              elem.playerData?.posicion === 'portero' || 
              elem.playerData?.position === 'goalkeeper' ||
              elem.playerData?.demarcacion === 'POR';
            if (elem.differentiateGoalkeeper !== undefined) snapshot.differentiateGoalkeeper = elem.differentiateGoalkeeper;
            if (elem.goalkeeperStripeColor) snapshot.goalkeeperStripeColor = elem.goalkeeperStripeColor;
          } else if (elem.type === 'staff') {
            snapshot.staffRole = elem.staffRole;
            snapshot.displayLabel = elem.displayLabel; // Iniciales (E1, E2, PF, etc.)
            snapshot.color = elem.color;
            if (elem.numberColor) snapshot.numberColor = elem.numberColor;
          } else if (elem.type === 'ball' || elem.type === 'cone' || elem.type === 'cone-pro' || 
                     elem.type === 'cone-flat' || elem.type === 'ring' ||
                     elem.type === 'goal' || elem.type === 'goal-large' || elem.type === 'goal-small' || 
                     elem.type === 'barrier' || elem.type === 'dummy' || elem.type === 'pole' || 
                     elem.type === 'ladder' || elem.type === 'weights') {
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
              { x: elem.points[1].x, y: elem.points[1].y }
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
            snapshot.pointsRatio = elem.points.map(pt => ({ x: pt.x, y: pt.y }));
            snapshot.points = elem.points.map(pt => ({
              x: pt.x * fieldWidth,
              y: pt.y * fieldHeight
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
              { x: elem.points[1].x, y: elem.points[1].y }
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
              { x: elem.points[1].x, y: elem.points[1].y }
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
            snapshot.pointsRatio = elem.points.map(pt => ({ x: pt.x, y: pt.y }));
            snapshot.points = elem.points.map(pt => ({
              x: pt.x * fieldWidth,
              y: pt.y * fieldHeight
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
      }).filter(snapshot => {
        // Filtrar snapshots incompletos que no tienen coordenadas válidas
        // Esto evita que elementos en proceso de dibujo se incluyan
        const hasPosition = (snapshot.x !== undefined && snapshot.y !== undefined) ||
                           (snapshot.x1 !== undefined && snapshot.y1 !== undefined) ||
                           (snapshot.points && snapshot.points.length >= 2);
        
        const hasValidSize = snapshot.size !== undefined || 
                            snapshot.radius !== undefined || 
                            (snapshot.width !== undefined && snapshot.height !== undefined) ||
                            (snapshot.x1 !== undefined); // líneas no necesitan size
        
        // Para formas, verificar que tienen dimensiones válidas (no son de tamaño 0)
        if (snapshot.type === 'rectangle') {
          if (!snapshot.width || snapshot.width <= 0 || !snapshot.height || snapshot.height <= 0) {
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
      const connectorsSnapshot = connectors.map(connector => ({
        id: connector.id,
        fromId: connector.fromId,
        toId: connector.toId,
        color: connector.color || '#000000',
        thickness: connector.thickness || 2,
      }));
      
      const newKeyframe = {
        timestamp: Date.now(),
        fieldImageData: fieldImageData, // Imagen para preview (no se guarda en BD)
        elements: elementsSnapshot, // Datos de elementos para interpolar
        connectors: connectorsSnapshot, // Conectores entre elementos
      };
      
      onKeyframesChange([...keyframes, newKeyframe]);
      showNotification(t('videoRecorder.positionCaptured'), 'success');
    } catch (error) {
      console.error('Error capturando keyframe:', error);
      showNotification(t('videoRecorder.errorCapturingPosition'), 'error');
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

    let savedZoom = null;
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
      const moveDuration = 0.9;  // 90% movimiento a x1
      const holdDuration = 0.1;  // 10% pausa en destino a x1
      const extraDurationEnd = 0.5;

      // 1. Interpolar todos los frames
      const allFrames = buildInterpolatedFrames(
        keyframes, fps, moveDuration, holdDuration, videoSpeed, extraDurationEnd
      );

      if (allFrames.length === 0) {
        throw new Error('No se pudieron generar frames');
      }

      // 2. Deseleccionar elementos y resetear zoom para captura limpia
      videoFrameControl.current.deselectAll();
      // resetZoom ahora devuelve Promise que se resuelve DESPUÉS del commit de React,
      // garantizando que la transformación de zoom ya se eliminó de la vista nativa.
      savedZoom = await videoFrameControl.current.resetZoom?.() ?? null;
      // 2 rAFs extra para que el layout nativo se actualice tras el commit
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

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
        console.warn('[videoRecorder] Streaming WebCodecs falló, se usara fallback al final', streamingErrorToReport);
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
        console.warn('[videoRecorder] WebCodecs streaming no disponible, se usara fallback', streamingError);
        streamingEncoder = null;
      }

      // Primer render estable antes de empezar a guardar frames.
      await videoFrameControl.current.setFrame(allFrames[0].elements, allFrames[0].connectors);
      setGenerationPhase('generationCapturing');

      // 4. Capturar cada frame en JPEG: suficiente para H.264 y bastante mas rapido que PNG.
      for (let i = 0; i < totalFrames; i++) {
        if (generationCancelledRef.current) {
          streamingEncoder?.abort?.();
          RNFS.unlink(framesDir).catch(() => {});
          setGenerationProgress(0);
          // Restaurar zoom si fue guardado
          if (savedZoom && videoFrameControl.current.restoreZoom) {
            videoFrameControl.current.restoreZoom(savedZoom);
          }
          return;
        }

        const frame = allFrames[i];

        // setFrame devuelve Promise que resuelve DESPUÉS del commit de React
        await videoFrameControl.current.setFrame(frame.elements, frame.connectors);

        // Captura web optimizada para video; H.264 ya es lossy, asi evitamos PNG por frame.
        const frameCapture = await captureRef(fieldRef.current, {
          format: VIDEO_CAPTURE_FORMAT,
          quality: VIDEO_CAPTURE_QUALITY,
          result: 'blob',
          pixelRatio: getVideoCapturePixelRatio(),
          cacheBust: false,
          backgroundColor: '#ffffff',
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

      // 5. Restaurar zoom antes de codificar
      if (savedZoom && videoFrameControl.current.restoreZoom) {
        videoFrameControl.current.restoreZoom(savedZoom);
      }

      // 6. Finalizar/codificar el vídeo. El progreso es lineal por trabajo total:
      // frames capturados + frames codificados, sin reparto fijo tipo 80/20.
      await new Promise((resolve) => requestAnimationFrame(resolve));
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
          console.warn('[videoRecorder] Finalizacion streaming falló, usando fallback', streamingError);
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
          }
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
      // Restaurar zoom en caso de error
      if (savedZoom && videoFrameControl?.current?.restoreZoom) {
        videoFrameControl.current.restoreZoom(savedZoom);
      }
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
        keyframes: normalizedKeyframes.map(kf => ({
          timestamp: kf.timestamp,
          elements: kf.elements,
          connectors: kf.connectors || []
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
        },
        nombre: videoNombre,
        descripcion: videoDescripcion,
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
                    await new Promise(r => setTimeout(r, 2000));
                  }
                }
              }
              
              if (uploadOk && key) {
                await apiUpdateVideo(savedVideoId, { r2Key: key });
                console.log('R2 upload completado:', key);
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
        const safeName = (videoNombre || editingVideoName || 'video')
          .trim()
          .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
          .replace(/\s+/g, '_') || 'video';
        const ext = (localVideoMime || '').includes('mp4') ? 'mp4' : 'webm';
        const a = document.createElement('a');
        a.href = localVideoPath;
        a.download = `${safeName}.${ext}`;
        a.style.display = 'none';
        document.body.appendChild(a);
        await new Promise(r => setTimeout(r, 0));
        a.click();
        setTimeout(() => { if (a.parentNode) a.parentNode.removeChild(a); }, 100);
        setTimeout(() => showNotification(t('videoRecorder.downloadComplete') || 'Descarga iniciada', 'success'), 150);
        return;
      }

      if (Platform.OS === 'android') {
        try {
          const asset = await MediaLibrary.createAssetAsync(localVideoPath);
          await MediaLibrary.createAlbumAsync('xtramys', asset, false);
          setTimeout(() => showNotification(t('videoRecorder.downloadComplete') || 'Descarga iniciada', 'success'), 150);
        } catch (saveErr) {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(
              Platform.OS === 'android' ? `file://${localVideoPath}` : localVideoPath,
              { mimeType: 'video/mp4' }
            );
            setTimeout(() => showNotification(t('videoRecorder.downloadComplete') || 'Descarga iniciada', 'success'), 150);
          } else {
            throw saveErr;
          }
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          showNotification(t('videoRecorder.couldNotDownload') || 'No se pudo descargar el archivo', 'error');
          return;
        }
        const asset = await MediaLibrary.createAssetAsync(localVideoPath);
        await MediaLibrary.createAlbumAsync('xtramys', asset, false);
        setTimeout(() => showNotification(t('videoRecorder.downloadComplete') || 'Descarga iniciada', 'success'), 150);
      }
    } catch (error) {
      console.error('Error descargando video:', error);
      showNotification(t('videoRecorder.couldNotDownload') || 'No se pudo descargar el archivo', 'error');
    } finally {
      setIsGenerating(false);
    }
  }; 

  // Limpiar keyframes
  const clearKeyframes = () => {
    Alert.alert(
      t('field.clearPositionsTitle'),
      t('field.clearPositionsMessage'),
      [
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
            showNotification(t ? t('field.positionsDeleted') : i18n.t('field.positionsDeleted'), 'success');
          },
          style: 'destructive'
        }
      ]
    );
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
        let folders = result.folders || [];
        if (shouldBeGlobal) {
          folders = folders.filter(f => f.isGlobal);
        }
        setAllFolders(folders);
      }
    } catch (error) {
      console.error('Error cargando carpetas:', error);
    }
  };

  // Crear nueva carpeta
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showNotification(t('videoRecorder.folderNameRequired') || 'El nombre de la carpeta es requerido', 'error');
      return;
    }

    try {
      const folderData = {
        nombre: newFolderName.trim(),
        parentFolder: parentFolderForNew,
        color: newFolderColor,
        ...(shouldBeGlobal && { isGlobal: true }),
      };
      if (shouldBeGlobal && newFolderNameEn.trim()) {
        folderData.translations = { en: { nombre: newFolderNameEn.trim() } };
      }
      const result = await createVideoFolder(folderData);

      if (result.success) {
        showNotification(t('videoRecorder.folderCreated') || 'Carpeta creada', 'success');
        setShowCreateFolderModal(false);
        setNewFolderName('');
        setNewFolderNameEn('');
        setNewFolderColor('#6366F1');
        setParentFolderForNew(null);
        // Recargar carpetas y seleccionar la nueva
        await loadFolders();
        if (result.folder?._id) {
          setSelectedFolderId(result.folder._id);
        }
        // Volver a mostrar el modal de guardar
        setTimeout(() => {
          setShowSaveModal(true);
        }, 100);
      }
    } catch (error) {
      console.error('Error creando carpeta:', error);
      const errorMsg = error.response?.data?.message || t('videoRecorder.couldNotCreateFolder') || 'No se pudo crear la carpeta';
      showNotification(errorMsg, 'error');
    }
  };

  // Abrir modal de crear carpeta
  const openCreateFolderModal = (parentId = null) => {
    // Cerrar temporalmente el modal de guardar para que el de crear carpeta se vea
    setShowSaveModal(false);
    setParentFolderForNew(parentId);
    setNewFolderName('');
    setNewFolderColor('#6366F1');
    // Pequeño delay para asegurar que el modal de guardar se cierre antes
    setTimeout(() => {
      setShowCreateFolderModal(true);
    }, 100);
  };

  // Cerrar modal de crear carpeta y volver al de guardar
  const closeCreateFolderModal = () => {
    setShowCreateFolderModal(false);
    setNewFolderName('');
    setNewFolderColor('#6366F1');
    setParentFolderForNew(null);
    // Volver a mostrar el modal de guardar
    setTimeout(() => {
      setShowSaveModal(true);
    }, 100);
  };

  // Colores disponibles para carpetas
  const folderColors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', 
    '#F97316', '#F59E0B', '#10B981', '#14B8A6',
    '#06B6D4', '#3B82F6', '#64748B', '#1E293B'
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
        let folders = result.folders || [];
        if (shouldBeGlobal) {
          folders = folders.filter(f => f.isGlobal);
        }
        setAllFolders(folders);
      }
    } catch (error) {
      console.error('Error cargando carpetas:', error);
    }
  }, [isEditingVideo, editingVideoId, shouldBeGlobal, presetFolderId, editingVideoFolderId, editingVideoName, videoNombre, saveVideoToDB]);

  const handlePreviewDownload = useCallback(() => {
    downloadVideo();
  }, [localVideoPath]);

  const progressPhaseLabel = generationPhase ? t(`videoRecorder.${generationPhase}`) : '';

  return (
    <>
      {/* Panel lateral flotante de controles */}
      <View style={styles.floatingPanel}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('videoRecorder.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.contentContainer}
          nestedScrollEnabled={true}
        >
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.button, styles.captureButton]}
              onPress={captureKeyframe}
              disabled={isGenerating}
            >
              <Text style={styles.buttonText}>{t('videoRecorder.capture')}</Text>
            </TouchableOpacity>

            <Text style={styles.keyframeCount}>
              {t('videoRecorder.captures')} {keyframes.length}
            </Text>

            {keyframes.length > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.deleteLastButton]}
                onPress={removeLastKeyframe}
                disabled={isGenerating}
              >
                <Text style={styles.buttonText}>{t('videoRecorder.deleteLast')}</Text>
              </TouchableOpacity>
            )}

            {keyframes.length >= 2 && (
              <>
                {/* Selector de velocidad */}
                <View style={styles.speedSection}>
                  <Text style={styles.speedLabel}>{t('videoRecorder.speed')}</Text>
                  <View style={styles.speedButtons}>
                    <TouchableOpacity
                      style={[
                        styles.speedButton,
                        videoSpeed === 0.5 && styles.speedButtonActive
                      ]}
                      onPress={() => setVideoSpeed(0.5)}
                    >
                      <Text style={[
                        styles.speedButtonText,
                        videoSpeed === 0.5 && styles.speedButtonTextActive
                      ]}>x0.5</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.speedButton,
                        videoSpeed === 1.0 && styles.speedButtonActive
                      ]}
                      onPress={() => setVideoSpeed(1.0)}
                    >
                      <Text style={[
                        styles.speedButtonText,
                        videoSpeed === 1.0 && styles.speedButtonTextActive
                      ]}>x1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.speedButton,
                        videoSpeed === 2.0 && styles.speedButtonActive
                      ]}
                      onPress={() => setVideoSpeed(2.0)}
                    >
                      <Text style={[
                        styles.speedButtonText,
                        videoSpeed === 2.0 && styles.speedButtonTextActive
                      ]}>x2</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[styles.button, styles.generateButton]}
                  onPress={generateVideo}
                  disabled={isGenerating}
                >
                  <Text style={styles.buttonText}>
                    {isGenerating ? t('videoRecorder.generating') : t('videoRecorder.generate')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {keyframes.length > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.clearButton]}
                onPress={clearKeyframes}
                disabled={isGenerating}
              >
                <Text style={styles.buttonText}>{t('videoRecorder.clearAll')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Lista de posiciones capturadas */}
          {keyframes.length > 0 && (
            <View style={styles.keyframeSection}>
              <Text style={styles.sectionTitle}>{t('videoRecorder.capturedPositions')}</Text>
              <View style={styles.keyframeList}>
                {keyframes.map((keyframe, index) => (
                  <View key={index} style={styles.keyframeItem}>
                    <Text style={styles.keyframeText}>
                      {index + 1}
                    </Text>

                    {/* Ver (preview) */}
                    <TouchableOpacity
                      onPress={() => onSelectKeyframe && onSelectKeyframe(index)}
                      style={styles.viewButton}
                    >
                      <Text style={styles.viewButtonText}>{t('videoRecorder.view')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => removeKeyframe(index)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
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
            <View style={[styles.modalHeader, { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }]}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#f5f5f5' }]}>
                <Feather name="save" size={20} color="#4CAF50" />
              </View>
              <Text style={[styles.modalTitle, { color: '#1a1a1a' }]}>{t('videoRecorder.saveModalTitle')}</Text>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#f5f5f5' }]} onPress={closeSaveModal}>
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
                    <Text style={styles.createFolderHeaderBtnText}>{t('videoRecorder.newFolder') || 'Nueva'}</Text>
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
                          selectedFolderId === null && styles.folderSelectItemActive
                        ]}
                        onPress={() => setSelectedFolderId(null)}
                      >
                        <View style={[styles.folderSelectIcon, { backgroundColor: '#F1F5F9' }]}>
                          <Feather name="home" size={14} color="#64748B" />
                        </View>
                        <Text style={styles.folderSelectText}>{t('videoRecorder.rootFolder')}</Text>
                        {selectedFolderId === null && (
                          <Feather name="check-circle" size={16} color="#4CAF50" />
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    {allFolders.map(folder => (
                      <View key={folder.id} style={[styles.folderItemRow, folder.level === 1 && { marginLeft: 16 }]}>
                        <TouchableOpacity
                          style={[
                            styles.folderSelectItem,
                            styles.folderSelectItemFlex,
                            selectedFolderId === folder.id && styles.folderSelectItemActive
                          ]}
                          onPress={() => setSelectedFolderId(folder.id)}
                        >
                          <View style={[styles.folderSelectIcon, { backgroundColor: folder.color || '#2196F3' }]}>
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
                  (!videoNombre.trim() || isSaving) && styles.saveModalBtnDisabled
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
                  ? (t('videoRecorder.createSubfolder') || 'Nueva subcarpeta')
                  : (t('videoRecorder.createFolder') || 'Nueva carpeta')}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseBtn} 
                onPress={closeCreateFolderModal}
              >
                <Feather name="x" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.createFolderContent}>
              {/* Mostrar carpeta padre si es subcarpeta */}
              {parentFolderForNew && (
                <View style={styles.parentFolderInfo}>
                  <Feather name="corner-down-right" size={14} color="#666" />
                  <Text style={styles.parentFolderText}>
                    {t('videoRecorder.insideFolder') || 'Dentro de:'} {
                      allFolders.find(f => f.id === parentFolderForNew)?.nombre || 'Carpeta'
                    }
                  </Text>
                </View>
              )}

              {/* Nombre de la carpeta */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Feather name="edit-3" size={14} color="#666" />
                  <Text style={styles.inputLabel}>{t('videoRecorder.folderNameLabel') || 'Nombre de la carpeta'}</Text>
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
                  {folderColors.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newFolderColor === color && styles.colorOptionSelected
                      ]}
                      onPress={() => setNewFolderColor(color)}
                    >
                      {newFolderColor === color && (
                        <Feather name="check" size={14} color="#fff" />
                      )}
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
                <Text style={styles.saveModalBtnTextSecondary}>{t('videoRecorder.cancel') || 'Cancelar'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveModalBtn, 
                  styles.saveModalBtnPrimary,
                  !newFolderName.trim() && styles.saveModalBtnDisabled
                ]}
                onPress={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                <Feather name="folder-plus" size={16} color="#fff" />
                <Text style={styles.saveModalBtnTextPrimary}>{t('videoRecorder.create') || 'Crear'}</Text>
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
          style={[
            styles.notification,
            notification.type === 'success' ? styles.notificationSuccess : styles.notificationError,
            {
              opacity: notificationAnim,
              transform: [{
                translateY: notificationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              }],
            },
          ]}
        >
          <Text style={styles.notificationIcon}>
            {notification.type === 'success' ? '✓' : '⚠'}
          </Text>
          <Text style={styles.notificationText}>{notification.message}</Text>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  floatingPanel: {
    position: 'absolute',
    left: 20,
    top: 85,
    width: 120,
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000,
  },
  floatingPanelMobile: {
    position: 'absolute',
    left: 20,
    top: 85,
    width: 120,
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  controls: {
    gap: 10,
    marginBottom: 15,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flex: 1,
    minWidth: 80,
  },
  captureButton: {
    backgroundColor: '#4CAF50',
  },
  generateButton: {
    backgroundColor: '#2196F3',
  },
  deleteLastButton: {
    backgroundColor: '#FF9800',
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  previewButton: {
    backgroundColor: '#9C27B0',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  downloadButton: {
    backgroundColor: '#2196F3',
  },
  closeModalButton: {
    backgroundColor: '#757575',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    flex: 1,
    marginLeft: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  keyframeCount: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 6,
    fontWeight: '500',
  },
  keyframeSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  keyframeList: {
    // Sin maxHeight - el scroll externo maneja toda la lista
  },
  keyframeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  keyframeText: {
    fontSize: 11,
    color: '#333',
    flex: 1,
  },
  removeButton: {
    padding: 3,
    marginLeft: 6,
  },
  viewButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  applyButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
    backgroundColor: '#4caf50',
    borderRadius: 4,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButtonText: {
    fontSize: 16,
    color: '#f44336',
    fontWeight: 'bold',
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
    maxHeight: '100%',
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 32,
  },
  previewBottomBtn: {
    alignItems: 'center',
    gap: 6,
  },
  previewBottomBtnIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBottomBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  saveModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 380,
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
    textAlignVertical: 'top',
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
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10000,
  },
  notificationSuccess: {
    backgroundColor: '#4CAF50',
  },
  notificationError: {
    backgroundColor: '#f44336',
  },
  notificationIcon: {
    fontSize: 24,
    color: '#fff',
    marginRight: 12,
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
    width: '90%',
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
    borderRadius: 12,
    padding: 24,
    width: 320,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
  },
  progressIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 14,
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
