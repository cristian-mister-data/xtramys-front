// v2
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Dimensions,
  BackHandler,
  Animated,
  Modal,
  Platform,
  StatusBar,
  Switch,
  ActivityIndicator,
  InteractionManager,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniColorPickerModal } from './colorPicker';

import { State, LongPressGestureHandler } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/api/client';
import { updateUsuario } from '@/store/slices/user/userThunks';
import { fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';
import { kitToBoardStyle } from '@/utils/kits';
import Svg, { Path, Polygon, Rect, Circle, Ellipse, G } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import * as ScreenOrientation from 'expo-screen-orientation';
// Usar la API legacy

import VideoRecorder from './videoRecorder';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getPlayerFullName, getPositionColor } from '@/components/player/playerHelpers';
import {
  FieldSVGRenderer,
  decomposeFieldId,
  composeFieldId,
  getAspectForView,
  ratioToDisplay,
  displayToRatio,
  deltaToRatio,
  isVisibleInView,
  isOutsideVisibleField,
  areAllPointsOutside,
} from './fields';
import FieldSelectorModal from './FieldSelectorModal';
import { cdnUrl } from '@/config';

import { renderFrameToCanvas, getVideoDimensions } from '@/utils/videoCanvasRenderer';
import { getVideoForEdit, getVideosByExercise, getVideosByStrategy } from '@/utils/api';
import { FreeTextTool, OptionsMenu, TextEditPanel, useScreenDimensions } from './field/controls';
import {
  DEFAULT_GOALKEEPER_ICON_1_SETTINGS,
  DEFAULT_GOALKEEPER_ICON_2_SETTINGS,
  DEFAULT_PLAYER_ICON_SIZE,
  DEFAULT_PLAYER_NUMBER_COLOR,
  FORMATIONS,
  FORMATIONS_7,
  FORMATIONS_8,
  LINE_TYPES_SET,
  MATERIAL_TYPES_SET,
  NEUTRAL_PLAYER_COLORS,
  ZINDEX_BASE_ICONS,
  ZINDEX_BASE_LINES,
  ZINDEX_BASE_MATERIALS,
  acquireBoardDrag,
  getDefaultBoardSettings,
  getDefaultNeutralPlayerSettings,
  getDefaultPositionLabels,
  getInitialIcons,
  getMaterialsIcons,
  getPositionAbbreviation,
  getZIndexBaseForType,
  isBoardDragOwner,
  isNeutralPlayerIcon,
  isValidHexColor,
  normalizeBoardSettings,
  releaseBoardDrag,
} from './field/config';
import {
  FIELD_CAPTURE_BACKGROUND,
  FIELD_CAPTURE_OPTIONS,
  REFERENCE_WIDTH,
  TouchableOpacity,
  boardInteractionState,
  captureViewShotBase64,
  clampLayoutValue,
  fromRatioCoords,
  getBallMotionSubLabel,
  getBallMotionTitle,
  getKeyframeMovedBalls,
  getSnapshotRatioPoint,
  loadCanvasImage,
  normalizeElementsForCanvas,
  snapToHorizontalOrVertical,
} from './field/primitives';
import {
  ALLOW_MULTI_ELEMENT_DRAG,
  applyBoardDragSnapshot,
  buildBoardDragSnapshots,
  clampBoardRatio,
  findTopBoardCloneAtPoint,
  getArrowHeadForStraightLine,
  getProportionalIconSize,
  isBoardCloneOutsideForDelete,
} from './field/geometry';
import { styles } from './field/styles';
import { DraggableIcon, MemoizedIcon } from './field/icon-renderers';
import {
  BatchShapesRenderer,
  MemoizedCircleDetector,
  MemoizedCustomShapeDetector,
  MemoizedRectangleDetector,
} from './field/shape-renderers';
import {
  BatchLinesRenderer,
  MemoizedCurveLineDetector,
  MemoizedStraightLineDetector,
} from './field/line-renderers';
import { ConnectorsModal, ConnectorsRenderer } from './field/connectors';
import { LeftEditPanel } from './field/edit-panel';
import { SettingsPanel } from './field/settings-panel';
import { LockedElementsPanel } from './field/locked-elements-panel';
import { FormationModal } from './field/formation-modal';
import { createFieldUiComponents } from './field/ui-components';

// Variable de m�dulo para proteger la selecci�n de deselecci�n inmediata
// Cuando un icono es seleccionado, se guarda el timestamp para evitar
// que el onPress del campo lo deseleccione inmediatamente

// Componentes memoizados para iconos SVG personalizados

// Portería grande profesional (11 jugadores) - 3D con perspectiva profesional y red

// Portería pequeña (fútbol 7 / mini) - 3D con perspectiva profesional y red

// Valla/Barrera de entrenamiento (antes era "goal")

// Maniqu� de entrenamiento

// Pica (palo con cono)

// Cono de f�tbol profesional

// Cono plano/disco (peque�o y circular)

// Aro de entrenamiento (c�rculo hueco)

// Pesas / Mancuernas de entrenamiento

// Mantener GoalImage como alias de BarrierImage para compatibilidad

// Definiciones de formaciones de f�tbol con posiciones en ratios (0-1)
// yRatio: 0 = arriba (ataque), 1 = abajo (defensa)
// xRatio: 0 = izquierda, 1 = derecha
// Posiciones est�ndar disponibles

// Etiquetas por defecto para posiciones (m�ximo 2 caracteres)
// Funci�n que retorna las etiquetas traducidas seg�n el idioma actual

// Formaciones para 8 jugadores (f�tbol 8)

// Formaciones para 7 jugadores (f�tbol 7)

// Mapa de formaciones por cantidad de jugadores

// Legacy helper removed "� field selection now uses lineType + viewMode directly

// Funci�n para obtener los iconos iniciales con etiquetas traducidas

// Set de tipos de materiales/herramientas para filtrado r�pido

// Set de tipos de l�neas/formas

// Bases de z-index por grupo (l�neas abajo, materiales medio, jugadores/staff arriba)

// Funci�n para obtener los iconos de materiales con etiquetas traducidas

// Funci�n para obtener abreviatura de posici�n de jugador

// Mantenemos el ControlButton para compatibilidad, pero no lo usaremos directamente

// =====================================================
// MODAL DE CONECTORES
// =====================================================

// =====================================================
// COMPONENTE PARA RENDERIZAR LAS LÍNEAS DE CONECTORES
// =====================================================

// Componente modal para seleccionar formaciones

// Componente memoizado para renderizar iconos sin parpadeo

// Componente memoizado completo para cada icono individual

// Funci�n para generar el path SVG para l�neas curvas

// Funci�n auxiliar para calcular la distancia de un punto a un segmento de l�nea

// =====================================================
// COMPONENTES MEMOIZADOS PARA LÍNEAS - OPTIMIZACIÓN CRÍTICA
// =====================================================

// Componente memoizado para l�neas rectas - evita re-renders innecesarios

// Componente memoizado para l�neas curvas - evita re-renders innecesarios

// Componente batch para renderizar muchas l�neas en un solo SVG Group

// Helper para comparar arrays de puntos

// =====================================================
// COMPONENTE MEMOIZADO PARA DETECTORES DE LÍNEAS RECTAS
// =====================================================

// =====================================================
// COMPONENTE MEMOIZADO PARA DETECTORES DE LÍNEAS CURVAS
// =====================================================

// =====================================================
// COMPONENTES SVG MEMOIZADOS PARA CÍRCULOS Y RECTÁNGULOS
// =====================================================

// Círculo SVG memoizado - solo renderiza el SVG

// Rectángulo SVG memoizado - solo renderiza el SVG

// Custom Shape SVG memoizado

// Batch renderer para todas las figuras geométricas

// =====================================================
// DETECTORES MEMOIZADOS PARA FIGURAS GEOMÉTRICAS
// =====================================================

// Detector memoizado para c�rculos

// Detector memoizado para rectngulos - Solo detecta toques en los BORDES

// Detector memoizado para custom shapes - Solo detecta toques en el PERÍMETRO

export default function Field(props = {}) {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const players = useSelector((state) => state.player.players || []);
  const season = useSelector((state) => state.season.season);
  const equipos = useSelector((state) => state.team.teams || []);

  // route.params (vienen de location.state cuando se naveg� v�a
  // navigation.navigate) siempre tiene prioridad. Los props directos
  // (p.ej. <Field sandbox /> en TacticalBoardPage standalone) se usan
  // s�lo como FALLBACK para los flags que no est�n en params, para no
  // pisar las navegaciones reales desde ejercicios/estrategias.
  const mergedParams = { ...(props || {}), ...(route.params || {}) };

  const {
    initialElements = [],
    initialFieldType = 'full',
    initialConfig = {},
    isStrategyMode = false, // Nueva prop para modo estrategia
    setPieceMode = false, // Nueva prop para modo ABP
    sandbox = false, // Modo sandbox: solo para crear videos, no guarda estrategias ni ejercicios
    ejercicioId = null, // ID del ejercicio para asociar videos
    estrategiaId = null, // ID de la estrategia para asociar videos
    editVideoData: editVideoDataParam = null, // Datos del video a editar (desde params)
    deferEditVideoOpen = false,
    autoOpenVideoRecorder = false, // Abrir grabador de video automticamente
    hideFolderPicker = false, // Ocultar selector de carpeta en el grabador de video
    presetFolderId = null, // Carpeta preseleccionada para guardar videos
    presetVideoName = '', // Nombre preseleccionado para el video (auto-naming)
    isGlobalExercise = false, // Si el ejercicio es global (admin)
    isGlobalStrategy = false, // Si la estrategia es global (admin)
    matchSheetPlayers = null,
    embeddedBoard = false,
    // Eliminar onSave y onCancel de los par�metros para evitar el warning
    // onSave,
    // onCancel
  } = mergedParams;

  // Obtener editVideoData de global si no viene en params
  const editVideoData = editVideoDataParam || global.editVideoData || null;

  // Estado para modo de edici�n de video - inicializar basado en editVideoData
  const [isEditingVideo, setIsEditingVideo] = useState(!!editVideoData);
  const [editingVideoId, setEditingVideoId] = useState(editVideoData?.videoId || null);
  const [editingVideoName, setEditingVideoName] = useState(
    editVideoData?.nombre || presetVideoName || '',
  );
  const [editingVideoDescription, setEditingVideoDescription] = useState(
    editVideoData?.descripcion || '',
  );
  const [editingVideoFolderId, setEditingVideoFolderId] = useState(editVideoData?.folderId || null);
  // Dimensiones originales del video para conversi�n correcta de coordenadas
  const editingVideoConfigRef = useRef(editVideoData?.config || null);

  // Estado para almacenar callbacks
  const [saveCallback, setSaveCallback] = useState(null);
  const [cancelCallback, setCancelCallback] = useState(null);

  // Efecto para registrar callbacks desde global
  useEffect(() => {
    // Capturar referencias locales: si pasamos `() => global.fieldCallbacks.onSave`
    // a setState, React lo trata como functional updater y lo invoca al flush.
    // Para entonces el cleanup (strict mode doble mount) ya puede haber nulado
    // global.fieldCallbacks → crash. Capturando aqu� evitamos ese race.
    const cb = global.fieldCallbacks;
    const savedOnSave = cb && cb.onSave ? cb.onSave : null;
    const savedOnCancel = cb && cb.onCancel ? cb.onCancel : null;

    // En modo sandbox o edici�n de video, saltar loading pero registrar callbacks si existen
    if (sandbox || editVideoData) {
      setIsLoadingField(false);
      setFieldImageReady(true);
      // Aun as� registrar callbacks si existen (necesario para an�lisis rival con video)
      if (savedOnSave) setSaveCallback(() => savedOnSave);
      if (savedOnCancel) setCancelCallback(() => savedOnCancel);
      return;
    }

    if (savedOnSave) setSaveCallback(() => savedOnSave);
    if (savedOnCancel) setCancelCallback(() => savedOnCancel);

    // NOTA: NO nulamos global.fieldCallbacks en cleanup. En React 18 strict
    // mode dev el efecto se ejecuta dos veces (mount→cleanup→mount), y si
    // nulamos en el primer cleanup el segundo mount no encuentra los
    // callbacks. El pr�ximo `handleOpenField` siempre reasigna fresco.
  }, [sandbox, editVideoData]);

  // Abrir autom�ticamente el grabador de video si se solicita
  useEffect(() => {
    if (autoOpenVideoRecorder && !editVideoData) {
      setTimeout(() => {
        try {
          savedClonesOriginalRef.current = JSON.parse(JSON.stringify(clones || []));
        } catch (e) {
          savedClonesOriginalRef.current = clones ? [...clones] : [];
        }
        keepVideoChangesRef.current = false;
        setVideoRecorderVisible(true);
      }, 400);
    }
  }, [autoOpenVideoRecorder]);

  // Forzar orientaci�n horizontal cuando la pantalla tiene el foco
  // y liberar cuando pierde el foco
  useEffect(() => {
    let isMounted = true;
    let subscription = null;
    let reinforceInterval = null;
    const isWebPlatform = Platform.OS === 'web';

    const lockToLandscape = async () => {
      if (!isMounted) return;
      try {
        if (isWebPlatform && typeof window !== 'undefined' && window.screen?.orientation?.lock) {
          await window.screen.orientation.lock('landscape');
        }

        if (ScreenOrientation?.lockAsync) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        }
      } catch (error) {
        if (error?.name !== 'NotSupportedError' && error?.name !== 'AbortError') {
          console.warn('Error al bloquear orientación:', error);
        }
      }
    };

    // Bloquear orientaci�n al inicio
    lockToLandscape();

    // Reforzar el bloqueo varias veces durante los primeros segundos (para Android problem�tico)
    let reinforceCount = 0;
    reinforceInterval = setInterval(() => {
      if (!isMounted || reinforceCount >= 5) {
        if (reinforceInterval) {
          clearInterval(reinforceInterval);
          reinforceInterval = null;
        }
        return;
      }
      lockToLandscape();
      reinforceCount++;
    }, 500);

    // A�adir listener para detectar si cambia la orientaci�n y re-bloquear
    const setupOrientationListener = async () => {
      try {
        if (
          isWebPlatform &&
          typeof window !== 'undefined' &&
          window.screen?.orientation?.addEventListener
        ) {
          window.screen.orientation.addEventListener('change', () => {
            if (!isMounted) return;
            const type = window.screen.orientation.type || '';
            if (type.startsWith('portrait')) {
              lockToLandscape();
            }
          });
        } else {
          subscription = ScreenOrientation.addOrientationChangeListener((event) => {
            if (!isMounted) return;
            const orientation = event.orientationInfo.orientation;
            // Si detectamos orientaci�n vertical, forzar landscape de nuevo
            if (
              orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
              orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
            ) {
              lockToLandscape();
            }
          });
        }
      } catch (error) {
        console.warn('Error configurando listener de orientaci�n:', error);
      }
    };

    setupOrientationListener();

    // Cleanup: desbloquear orientaci�n al desmontar
    return () => {
      // Marcar como desmontado PRIMERO para evitar que lockToLandscape se ejecute
      isMounted = false;

      // Limpiar intervalo
      if (reinforceInterval) {
        clearInterval(reinforceInterval);
        reinforceInterval = null;
      }

      // Eliminar listener de orientaci�n
      if (subscription) {
        try {
          if (isWebPlatform && window.screen?.orientation?.removeEventListener) {
            window.screen.orientation.removeEventListener('change', lockToLandscape);
          } else {
            ScreenOrientation.removeOrientationChangeListener(subscription);
          }
        } catch (error) {
          // Ignore cleanup failures
        }
        subscription = null;
      }

      // Forzar portrait primero (necesario en iOS), luego desbloquear a ALL
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        .then(() => {
          setTimeout(() => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(() => {});
          }, 300);
        })
        .catch(() => {});
    };
  }, []);

  // Efecto para controlar el estado de carga "� SVG fields render instantly
  // (defined here, but runs after render when fieldLineType/viewMode are available)

  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
  const insets = useSafeAreaInsets();
  const safeArea = {
    top: Math.max(insets.top || 0, 0),
    right: Math.max(insets.right || 0, 0),
    bottom: Math.max(insets.bottom || 0, 0),
    left: Math.max(insets.left || 0, 0),
  };

  // Compacta la pizarra tambien en tablet.
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 1024;
  // Decompose initialFieldType (may be legacy ID like 'full' or compound 'full:entire')
  const initialDecomposed = useMemo(() => decomposeFieldId(initialFieldType), [initialFieldType]);
  const [fieldLineType, setFieldLineType] = useState(initialDecomposed.lineType);
  const [viewMode, setViewMode] = useState(initialDecomposed.viewMode);
  const selectedField = useMemo(
    () => composeFieldId(fieldLineType, viewMode),
    [fieldLineType, viewMode],
  );

  useEffect(() => {
    setIsLoadingField(false);
    setFieldImageReady(true);
  }, [fieldLineType, viewMode]);

  // Obtener iconos traducidos
  const INITIAL_ICONS = useMemo(() => getInitialIcons(), []);

  // Filtrar iconos seg�n el modo estrategia
  const filteredIcons = useMemo(() => {
    if (isStrategyMode) {
      // En modo estrategia, solo mostrar: jugadores, team-players, materiales (para bal�n), flechas, l�neas, figuras
      return INITIAL_ICONS.filter(
        (icon) =>
          icon.type === 'player' ||
          icon.type === 'team-players' ||
          icon.type === 'materials-button' ||
          icon.type === 'straight-arrow' ||
          icon.type === 'curve-arrow' ||
          icon.type === 'straight-line' ||
          icon.type === 'curve-line' ||
          icon.type === 'circle' ||
          icon.type === 'rectangle' ||
          icon.type === 'custom-shape-button',
      ).map((i) => ({ ...i }));
    }
    return INITIAL_ICONS.map((i) => ({ ...i }));
  }, [isStrategyMode, INITIAL_ICONS]);

  const [paletteIcons, setPaletteIcons] = useState(filteredIcons);
  const [drawingStraightArrow, setDrawingStraightArrow] = useState(false);
  const [drawingStraightLine, setDrawingStraightLine] = useState(false);
  const [drawingCurveLine, setDrawingCurveLine] = useState(false);
  const [drawingCurveArrow, setDrawingCurveArrow] = useState(false);
  const [drawingCircle, setDrawingCircle] = useState(false);
  const [drawingRectangle, setDrawingRectangle] = useState(false);
  const [straightLineStart, setStraightLineStart] = useState(null);
  const [straightLineEnd, setStraightLineEnd] = useState(null);
  const [temporaryLinePoints, setTemporaryLinePoints] = useState([]);
  const [curvePoints, setCurvePoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingCustomShape, setDrawingCustomShape] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  const [customShapePoints, setCustomShapePoints] = useState([]);
  const [showCloseCircle, setShowCloseCircle] = useState(false);

  // Container refs for measuring absolute positions
  const containerRef = useRef();

  // Estados para selecci�n m�ltiple
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedCloneIds, setSelectedCloneIds] = useState([]);
  const [selectionRect, setSelectionRect] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionInteractionMode, setSelectionInteractionMode] = useState('select'); // 'select' o 'move'
  const selectionStartRef = useRef(null);
  // Ref al overlay del multi-select para calcular coords relativas en web
  // (en react-native-web, e.nativeEvent.locationX/Y a veces es undefined en eventos de mouse)
  const selectionOverlayRef = useRef(null);
  // Agregar estos dos nuevos estados despu�s de showCloseCircle
  const [previewPoint, setPreviewPoint] = useState(null);
  const [isPreviewingPoint, setIsPreviewingPoint] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [draggingOutside, setDraggingOutside] = useState(false);
  const [instructionMessage, setInstructionMessage] = useState(null);
  const [pendingPlacementAction, setPendingPlacementAction] = useState(null);
  const [playersModalVisible, setPlayersModalVisible] = useState(false);
  const [assigningCloneId, setAssigningCloneId] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]); // IDs de staff en el campo
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [fieldImageReady, setFieldImageReady] = useState(false);
  const [isLoadingField, setIsLoadingField] = useState(true);
  const [isSavingVideoEdit, setIsSavingVideoEdit] = useState(false);
  const [showingPlayersPalette, setShowingPlayersPalette] = useState(false);
  const [showingMaterialsPalette, setShowingMaterialsPalette] = useState(false);
  const [showingStaffPalette, setShowingStaffPalette] = useState(false);
  const [teamPlayerSettingsVisible, setTeamPlayerSettingsVisible] = useState(false);
  const [standardSize, setStandardSize] = useState(DEFAULT_PLAYER_ICON_SIZE);
  // Estado para el estilo por defecto de jugadores del equipo
  const [teamPlayerStyle, setTeamPlayerStyle] = useState({
    color: '#2176ff',
    goalkeeperColor: '#ff4a4a',
    size: DEFAULT_PLAYER_ICON_SIZE,
    numberColor: '#ffffff',
    textColor: '#000000',
    textBackgroundColor: '#ffffff',
    showPosition: false,
    differentiateGoalkeeper: true,
    goalkeeperStripeColor: '#ffffff',
    showPhotos: false,
    shape: 'circle',
    hasStripes: false,
    hasBib: false,
    bibColor: NEUTRAL_PLAYER_COLORS.bib,
    stripeColor: '#ffffff',
  });
  // Estado para Configuraci�n de materiales de entrenamiento (colores personalizados)
  const [materialsConfig, setMaterialsConfig] = useState({
    'cone-pro': { color: '#FF6B00', size: 18 },
    'cone-flat': { color: '#FF6B00', size: 24 },
    ring: { color: '#FFD700', size: 24 },
    dummy: { color: '#2196F3', size: 40 },
  });
  // Estados para el grabador de video
  const [videoRecorderVisible, setVideoRecorderVisible] = useState(false);
  const [fieldImageForVideo, setFieldImageForVideo] = useState(null);
  const [videoKeyframes, setVideoKeyframes] = useState([]);
  const [dismissedBallTrajectoryPrompts, setDismissedBallTrajectoryPrompts] = useState({});
  const [loadedEditVideoKeyframeCount, setLoadedEditVideoKeyframeCount] = useState(0);
  const boardPreviewPlaybackIdRef = useRef(0);
  const [formationModalVisible, setFormationModalVisible] = useState(false);

  // Estado para Configuraci�n de formaciones (n�mero vs posici�n, etiquetas personalizadas, color del n�mero)
  const [formationSettings, setFormationSettings] = useState({
    displayMode: 'number', // 'number' o 'position'
    customLabels: { ...getDefaultPositionLabels() },
    numberColor: '#ffffff',
    textColor: '#000000',
    textBackgroundColor: '#ffffff',
  });

  // Estado para Configuraci�n de la pizarra (colores y tama�os de iconos de jugadores)
  const [boardSettings, setBoardSettings] = useState(() => getDefaultBoardSettings());
  const [userSettingsLoaded, setUserSettingsLoaded] = useState(false);
  const appliedKitContextRef = useRef('');

  useEffect(() => {
    const context = initialConfig?.kitContext;
    if (!setPieceMode || !context?.own || !userSettingsLoaded) return;
    const signature = JSON.stringify(context);
    if (appliedKitContextRef.current === signature) return;
    appliedKitContextRef.current = signature;
    const ownStyle = kitToBoardStyle(context.own, context.ownGoalkeeper);
    const rivalStyle = kitToBoardStyle(context.rival, context.rivalGoalkeeper);
    setTeamPlayerStyle((prev) => ({ ...prev, ...ownStyle }));
    setPaletteIcons((prev) =>
      prev.map((icon) => {
        const style =
          icon.id === 'icon1'
            ? ownStyle
            : icon.id === 'icon2'
              ? rivalStyle
              : icon.id === 'goalkeeper-1'
                ? {
                    ...ownStyle,
                    color: ownStyle.goalkeeperColor,
                    stripeColor: ownStyle.goalkeeperStripeColor,
                  }
                : icon.id === 'goalkeeper-2'
                  ? {
                      ...rivalStyle,
                      color: rivalStyle.goalkeeperColor,
                      stripeColor: rivalStyle.goalkeeperStripeColor,
                    }
                  : null;
        return style
          ? { ...icon, ...style, shape: style.shape, hasStripes: style.hasStripes }
          : icon;
      }),
    );
    setBoardSettings((prev) => ({
      ...prev,
      teamPlayers: { ...prev.teamPlayers, ...ownStyle },
      playerIcon1: { ...prev.playerIcon1, ...ownStyle },
      playerIcon2: { ...prev.playerIcon2, ...rivalStyle },
      goalkeeperIcon1: {
        ...prev.goalkeeperIcon1,
        color: ownStyle.goalkeeperColor,
        shape: ownStyle.shape,
        hasStripes: context.ownGoalkeeper?.pattern !== 'solid',
        stripeColor: ownStyle.goalkeeperStripeColor,
      },
      goalkeeperIcon2: {
        ...prev.goalkeeperIcon2,
        color: rivalStyle.goalkeeperColor,
        shape: rivalStyle.shape,
        hasStripes: context.rivalGoalkeeper?.pattern !== 'solid',
        stripeColor: rivalStyle.goalkeeperStripeColor,
      },
    }));
  }, [initialConfig?.kitContext, setPieceMode, userSettingsLoaded]);

  // Estado para conectores (l�neas que conectan elementos)
  useEffect(() => {
    setPendingPlacementAction((prev) => {
      if (!prev || typeof prev.paletteIndex !== 'number') return prev;
      const paletteIcon = paletteIcons[prev.paletteIndex];
      if (!paletteIcon) return prev;
      return {
        ...prev,
        clone: {
          ...prev.clone,
          color: paletteIcon.color ?? prev.clone?.color,
          size: paletteIcon.size ?? prev.clone?.size,
          thickness: paletteIcon.thickness ?? prev.clone?.thickness,
          fillColor: paletteIcon.fillColor ?? prev.clone?.fillColor,
          numberColor: paletteIcon.numberColor ?? prev.clone?.numberColor,
          backgroundColor: paletteIcon.backgroundColor ?? prev.clone?.backgroundColor,
          isNeutral: paletteIcon.isNeutral ?? prev.clone?.isNeutral,
          shape: paletteIcon.shape ?? prev.clone?.shape,
          hasStripes:
            paletteIcon.hasStripes !== undefined ? paletteIcon.hasStripes : prev.clone?.hasStripes,
          hasBib: paletteIcon.hasBib !== undefined ? paletteIcon.hasBib : prev.clone?.hasBib,
          bibColor:
            paletteIcon.bibColor !== undefined ? paletteIcon.bibColor : prev.clone?.bibColor,
          stripeColor: paletteIcon.stripeColor ?? prev.clone?.stripeColor,
          goalkeeperStripeColor:
            paletteIcon.goalkeeperStripeColor ?? prev.clone?.goalkeeperStripeColor,
          _lastUpdate: Date.now(),
        },
      };
    });

    setPendingLineAction((prev) => {
      if (!prev || typeof prev.paletteIndex !== 'number') return prev;
      const paletteIcon = paletteIcons[prev.paletteIndex];
      if (!paletteIcon) return prev;
      return {
        ...prev,
        icon: {
          ...prev.icon,
          color: paletteIcon.color ?? prev.icon?.color,
          thickness: paletteIcon.thickness ?? prev.icon?.thickness,
          fillColor: paletteIcon.fillColor ?? prev.icon?.fillColor,
          lineType: paletteIcon.lineType ?? prev.icon?.lineType,
          dotSize: paletteIcon.dotSize ?? prev.icon?.dotSize,
          dotSpacing: paletteIcon.dotSpacing ?? prev.icon?.dotSpacing,
        },
      };
    });
  }, [paletteIcons]);

  const [connectors, setConnectors] = useState(
    Array.isArray(initialConfig?.connectors) ? initialConfig.connectors : [],
  );
  const [connectorsModalVisible, setConnectorsModalVisible] = useState(false);

  // Persistir formaci�n en Configuraci�n de usuario (debounced)
  useEffect(() => {
    let timer = setTimeout(async () => {
      try {
        const str = await AsyncStorage.getItem('usuario');
        if (!str) return;
        const usuario = JSON.parse(str);
        if (!usuario || !usuario._id) return;
        const response = await dispatch(
          updateUsuario({ id: usuario._id, updatedUser: { formationSettings } }),
        );
        const updated = response?.payload;
        if (updated && typeof updated === 'object') {
          await AsyncStorage.setItem('usuario', JSON.stringify(updated));
        }
      } catch (err) {
        console.warn('Error saving formationSettings:', err);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [formationSettings, dispatch]);

  // Referencia para controlar si ya se cargaron los datos del usuario
  const userSettingsLoadedRef = useRef(false);

  // Sincronizar teamPlayerStyle con boardSettings.teamPlayers cuando cambie
  // Solo sincronizar DESPUÉS de que se hayan cargado los datos del usuario
  useEffect(() => {
    if (!userSettingsLoadedRef.current) return;

    setBoardSettings((prev) => ({
      ...prev,
      teamPlayers: {
        color: teamPlayerStyle.color,
        goalkeeperColor: teamPlayerStyle.goalkeeperColor,
        size: teamPlayerStyle.size,
        numberColor: teamPlayerStyle.numberColor,
        textColor: teamPlayerStyle.textColor,
        textBackgroundColor: teamPlayerStyle.textBackgroundColor,
        differentiateGoalkeeper: teamPlayerStyle.differentiateGoalkeeper,
        goalkeeperStripeColor: teamPlayerStyle.goalkeeperStripeColor,
        showPhotos: teamPlayerStyle.showPhotos,
        shape: teamPlayerStyle.shape,
        hasStripes: teamPlayerStyle.hasStripes,
        hasBib: teamPlayerStyle.hasBib,
        bibColor: teamPlayerStyle.bibColor,
        stripeColor: teamPlayerStyle.stripeColor,
      },
    }));
  }, [teamPlayerStyle]);

  // ViewShot refs para video
  const fieldRef = useRef(null); // Ref para el campo completo (con elementos) "� se wirea al ViewShot
  const fieldBaseRef = useRef(null); // Ref para el campo base (sin overlays)

  // Control ref para generaci�n de video client-side
  // Expone m�todos que VideoRecorder invoca para capturar frames
  const videoFrameControlRef = useRef({});

  // Ref para bloquear deselecci�n temporal despu�s de seleccionar un icono
  // Esto evita que el onPress del campo deseleccione inmediatamente

  // Refs para guardar/restaurar el estado al abrir el grabador
  const savedClonesOriginalRef = useRef(null);
  const keepVideoChangesRef = useRef(false);

  // Funci�n para abrir el grabador de video (guardamos el estado actual de clones)
  // Sin [clones] "� usa actualClonesRef

  // Guardado inmediato de formationSettings (bot�n Guardar)
  const handleSaveFormationSettings = useCallback(async () => {
    try {
      const str = await AsyncStorage.getItem('usuario');
      if (!str) return;
      const usuario = JSON.parse(str);
      if (!usuario || !usuario._id) return;

      const result = await dispatch(
        updateUsuario({ id: usuario._id, updatedUser: { formationSettings } }),
      );
      const updated = result?.payload;
      if (updated && typeof updated === 'object') {
        await AsyncStorage.setItem('usuario', JSON.stringify(updated));

        // Mostrar mensaje temporal de confirmaci�n
        setInstructionMessage({ visible: true, text: t('tacticalBoard.formations.settingsSaved') });
        setTimeout(() => setInstructionMessage(null), 2000);
      }
    } catch (err) {
      Alert.alert(
        t('message.error'),
        t('formations.saveError') || 'Error al guardar la Configuraci�n',
      );
    }
  }, [dispatch, formationSettings, t]);

  // Guardado inmediato de boardSettings (bot�n Guardar en panel de ajustes)
  // Ahora acepta un par�metro opcional settingsParam para evitar efectos de estado stale
  const handleApplyBoardSettings = useCallback((settingsToApply) => {
    if (!settingsToApply) return;
    settingsToApply = normalizeBoardSettings(settingsToApply);
    if (settingsToApply?.playerIcon1?.size) {
      setStandardSize(settingsToApply.playerIcon1.size);
    }
    setPaletteIcons((prev) =>
      prev.map((icon) => {
        const setting =
          icon.id === 'icon1'
            ? settingsToApply.playerIcon1
            : icon.id === 'icon2'
              ? settingsToApply.playerIcon2
              : icon.id === 'icon3'
                ? settingsToApply.playerIcon3
                : icon.id === 'goalkeeper-1'
                  ? { ...DEFAULT_GOALKEEPER_ICON_1_SETTINGS, ...settingsToApply.goalkeeperIcon1 }
                  : icon.id === 'goalkeeper-2'
                    ? { ...DEFAULT_GOALKEEPER_ICON_2_SETTINGS, ...settingsToApply.goalkeeperIcon2 }
                    : icon.id === 'neutral-player'
                      ? { ...getDefaultNeutralPlayerSettings(), ...settingsToApply.playerIcon4 }
                      : null;
        if (!setting) return icon;
        return {
          ...icon,
          color: setting.color,
          backgroundColor: setting.backgroundColor || icon.backgroundColor,
          numberColor:
            setting.numberColor !== undefined
              ? setting.numberColor
              : icon.numberColor || DEFAULT_PLAYER_NUMBER_COLOR,
          number: setting.isNeutral ? 'N' : setting.isGoalkeeper ? 1 : icon.number,
          isNeutral: setting.isNeutral !== undefined ? setting.isNeutral : icon.isNeutral,
          isGoalkeeper:
            setting.isGoalkeeper !== undefined ? setting.isGoalkeeper : icon.isGoalkeeper,
          size: setting.size,
          shape: setting.shape || icon.shape || 'circle',
          hasStripes: setting.hasStripes !== undefined ? setting.hasStripes : icon.hasStripes,
          hasBib: setting.hasBib !== undefined ? setting.hasBib : icon.hasBib,
          bibColor: setting.bibColor !== undefined ? setting.bibColor : icon.bibColor,
          stripeColor: setting.stripeColor || icon.stripeColor || '#ffffff',
          goalkeeperStripeColor:
            setting.goalkeeperStripeColor || setting.stripeColor || icon.goalkeeperStripeColor,
        };
      }),
    );
    setTeamPlayerStyle((prev) => ({
      ...prev,
      color: settingsToApply.teamPlayers.color,
      goalkeeperColor:
        settingsToApply.teamPlayers.goalkeeperColor || prev.goalkeeperColor || '#ff4a4a',
      size: settingsToApply.teamPlayers.size,
      numberColor:
        settingsToApply.teamPlayers.numberColor !== undefined
          ? settingsToApply.teamPlayers.numberColor
          : prev.numberColor,
      textColor: settingsToApply.teamPlayers.textColor || prev.textColor,
      textBackgroundColor:
        settingsToApply.teamPlayers.textBackgroundColor || prev.textBackgroundColor,
      differentiateGoalkeeper:
        settingsToApply.teamPlayers.differentiateGoalkeeper !== undefined
          ? settingsToApply.teamPlayers.differentiateGoalkeeper
          : prev.differentiateGoalkeeper,
      goalkeeperStripeColor:
        settingsToApply.teamPlayers.goalkeeperStripeColor || prev.goalkeeperStripeColor,
      showPhotos:
        settingsToApply.teamPlayers.showPhotos !== undefined
          ? settingsToApply.teamPlayers.showPhotos
          : prev.showPhotos,
      shape: settingsToApply.teamPlayers.shape || prev.shape || 'circle',
      hasStripes:
        settingsToApply.teamPlayers.hasStripes !== undefined
          ? settingsToApply.teamPlayers.hasStripes
          : prev.hasStripes,
      hasBib:
        settingsToApply.teamPlayers.hasBib !== undefined
          ? settingsToApply.teamPlayers.hasBib
          : prev.hasBib,
      bibColor:
        settingsToApply.teamPlayers.bibColor !== undefined
          ? settingsToApply.teamPlayers.bibColor
          : prev.bibColor,
      stripeColor: settingsToApply.teamPlayers.stripeColor || prev.stripeColor || '#ffffff',
    }));
  }, []);
  const handleSaveBoardSettings = useCallback(
    async (settingsParam) => {
      const settingsToSave = normalizeBoardSettings(settingsParam || boardSettings);
      if (settingsToSave?.playerIcon1?.size) {
        setStandardSize(settingsToSave.playerIcon1.size);
      }
      try {
        const str = await AsyncStorage.getItem('usuario');
        if (!str) return;
        const usuario = JSON.parse(str);
        if (!usuario || !usuario._id) return;

        const result = await dispatch(
          updateUsuario({ id: usuario._id, updatedUser: { boardSettings: settingsToSave } }),
        );
        const updated = result?.payload;
        if (updated && typeof updated === 'object') {
          const updatedUser = {
            ...updated,
            boardSettings: normalizeBoardSettings(updated.boardSettings, settingsToSave),
          };
          await AsyncStorage.setItem('usuario', JSON.stringify(updatedUser));

          // Actualizar los iconos de la paleta con los nuevos valores (usar settingsToSave)
          setPaletteIcons((prev) =>
            prev.map((icon) => {
              if (icon.id === 'icon1') {
                const playerSettings = settingsToSave.playerIcon1;
                return {
                  ...icon,
                  ...playerSettings,
                  numberColor:
                    playerSettings.numberColor ?? icon.numberColor ?? DEFAULT_PLAYER_NUMBER_COLOR,
                  shape: playerSettings.shape || icon.shape || 'circle',
                  stripeColor: playerSettings.stripeColor || icon.stripeColor || '#ffffff',
                };
              }
              if (icon.id === 'icon2') {
                const playerSettings = settingsToSave.playerIcon2;
                return {
                  ...icon,
                  ...playerSettings,
                  numberColor:
                    playerSettings.numberColor ?? icon.numberColor ?? DEFAULT_PLAYER_NUMBER_COLOR,
                  shape: playerSettings.shape || icon.shape || 'circle',
                  stripeColor: playerSettings.stripeColor || icon.stripeColor || '#ffffff',
                };
              }
              if (icon.id === 'icon3') {
                return {
                  ...icon,
                  color: settingsToSave.playerIcon3.color,
                  size: settingsToSave.playerIcon3.size,
                  numberColor:
                    settingsToSave.playerIcon3.numberColor !== undefined
                      ? settingsToSave.playerIcon3.numberColor
                      : icon.numberColor || DEFAULT_PLAYER_NUMBER_COLOR,
                  shape: settingsToSave.playerIcon3.shape || icon.shape || 'circle',
                  hasStripes:
                    settingsToSave.playerIcon3.hasStripes !== undefined
                      ? settingsToSave.playerIcon3.hasStripes
                      : icon.hasStripes,
                  hasBib:
                    settingsToSave.playerIcon3.hasBib !== undefined
                      ? settingsToSave.playerIcon3.hasBib
                      : icon.hasBib,
                  bibColor:
                    settingsToSave.playerIcon3.bibColor !== undefined
                      ? settingsToSave.playerIcon3.bibColor
                      : icon.bibColor,
                  stripeColor:
                    settingsToSave.playerIcon3.stripeColor || icon.stripeColor || '#ffffff',
                };
              }
              if (icon.id === 'goalkeeper-1' && settingsToSave.goalkeeperIcon1) {
                const goalkeeperSettings = {
                  ...DEFAULT_GOALKEEPER_ICON_1_SETTINGS,
                  ...settingsToSave.goalkeeperIcon1,
                };
                return {
                  ...icon,
                  ...goalkeeperSettings,
                  number: 1,
                  isGoalkeeper: true,
                  stripeColor:
                    goalkeeperSettings.goalkeeperStripeColor ||
                    goalkeeperSettings.stripeColor ||
                    icon.stripeColor,
                  goalkeeperStripeColor:
                    goalkeeperSettings.goalkeeperStripeColor ||
                    goalkeeperSettings.stripeColor ||
                    icon.goalkeeperStripeColor,
                };
              }
              if (icon.id === 'goalkeeper-2' && settingsToSave.goalkeeperIcon2) {
                const goalkeeperSettings = {
                  ...DEFAULT_GOALKEEPER_ICON_2_SETTINGS,
                  ...settingsToSave.goalkeeperIcon2,
                };
                return {
                  ...icon,
                  ...goalkeeperSettings,
                  number: 1,
                  isGoalkeeper: true,
                  stripeColor:
                    goalkeeperSettings.goalkeeperStripeColor ||
                    goalkeeperSettings.stripeColor ||
                    icon.stripeColor,
                  goalkeeperStripeColor:
                    goalkeeperSettings.goalkeeperStripeColor ||
                    goalkeeperSettings.stripeColor ||
                    icon.goalkeeperStripeColor,
                };
              }
              if (icon.id === 'neutral-player') {
                const neutralSettings = {
                  ...getDefaultNeutralPlayerSettings(),
                  ...settingsToSave.playerIcon4,
                };
                return {
                  ...icon,
                  ...neutralSettings,
                  number: 'N',
                  isNeutral: true,
                };
              }
              return icon;
            }),
          );

          // Actualizar teamPlayerStyle
          setTeamPlayerStyle((prev) => ({
            ...prev,
            color: settingsToSave.teamPlayers.color,
            goalkeeperColor:
              settingsToSave.teamPlayers.goalkeeperColor || prev.goalkeeperColor || '#ff4a4a',
            size: settingsToSave.teamPlayers.size,
            numberColor:
              settingsToSave.teamPlayers.numberColor !== undefined
                ? settingsToSave.teamPlayers.numberColor
                : prev.numberColor,
            textColor: settingsToSave.teamPlayers.textColor || prev.textColor,
            textBackgroundColor:
              settingsToSave.teamPlayers.textBackgroundColor || prev.textBackgroundColor,
            differentiateGoalkeeper:
              settingsToSave.teamPlayers.differentiateGoalkeeper !== undefined
                ? settingsToSave.teamPlayers.differentiateGoalkeeper
                : prev.differentiateGoalkeeper,
            goalkeeperStripeColor:
              settingsToSave.teamPlayers.goalkeeperStripeColor || prev.goalkeeperStripeColor,
            showPhotos:
              settingsToSave.teamPlayers.showPhotos !== undefined
                ? settingsToSave.teamPlayers.showPhotos
                : prev.showPhotos,
            shape: settingsToSave.teamPlayers.shape || prev.shape || 'circle',
            hasStripes:
              settingsToSave.teamPlayers.hasStripes !== undefined
                ? settingsToSave.teamPlayers.hasStripes
                : prev.hasStripes,
            hasBib:
              settingsToSave.teamPlayers.hasBib !== undefined
                ? settingsToSave.teamPlayers.hasBib
                : prev.hasBib,
            bibColor:
              settingsToSave.teamPlayers.bibColor !== undefined
                ? settingsToSave.teamPlayers.bibColor
                : prev.bibColor,
            stripeColor: settingsToSave.teamPlayers.stripeColor || prev.stripeColor || '#ffffff',
          }));

          // Mostrar mensaje temporal de confirmacin
          setInstructionMessage({
            visible: true,
            text: t('tacticalBoard.settings.settingsSaved') || 'Configuración guardada',
          });
          setTimeout(() => setInstructionMessage(null), 2000);
        }
      } catch (err) {
        Alert.alert(
          t('message.error'),
          t('settings.saveError') || 'Error al guardar la Configuración',
        );
      }
    },
    [dispatch, boardSettings, t],
  );

  // Cargar Configuraci�n guardada del usuario al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      const loadUserSettings = async () => {
        // Si ya se cargaron los datos en esta sesi�n, no volver a cargar
        try {
          const str = await AsyncStorage.getItem('usuario');
          if (!str) {
            userSettingsLoadedRef.current = true;
            setUserSettingsLoaded(true);
            return;
          }

          const storedUsuario = JSON.parse(str);
          let usuario = storedUsuario;
          if (storedUsuario?._id) {
            try {
              const response = await api.get(`/user/${storedUsuario._id}`, { skipCache: true });
              if (response?.data) {
                usuario = response.data;
                await AsyncStorage.setItem('usuario', JSON.stringify(usuario));
              }
            } catch (err) {
              console.warn('Error refreshing user settings, using local copy', err);
            }
          }

          if (usuario && usuario.formationSettings) {
            // Normalizar customLabels que puedan venir como Map u objeto desde el servidor
            const serverLabelsRaw = usuario.formationSettings.customLabels;
            let serverLabels = {};
            try {
              if (serverLabelsRaw instanceof Map) {
                serverLabels = Object.fromEntries(serverLabelsRaw);
              } else if (serverLabelsRaw && typeof serverLabelsRaw === 'object') {
                serverLabels = serverLabelsRaw;
              }
            } catch (err) {
              serverLabels = {};
            }

            setFormationSettings((prev) => ({
              ...prev,
              ...usuario.formationSettings,
              customLabels: { ...(prev.customLabels || {}), ...serverLabels },
            }));
          }

          // Cargar boardSettings del usuario
          if (usuario && usuario.boardSettings) {
            usuario.boardSettings = normalizeBoardSettings(usuario.boardSettings);
            if (usuario.boardSettings.playerIcon1?.size) {
              setStandardSize(usuario.boardSettings.playerIcon1.size);
            }
            setBoardSettings((prev) => ({
              ...prev,
              playerIcon1: { ...prev.playerIcon1, ...usuario.boardSettings.playerIcon1 },
              playerIcon2: { ...prev.playerIcon2, ...usuario.boardSettings.playerIcon2 },
              playerIcon3: { ...prev.playerIcon3, ...usuario.boardSettings.playerIcon3 },
              goalkeeperIcon1: {
                ...DEFAULT_GOALKEEPER_ICON_1_SETTINGS,
                ...prev.goalkeeperIcon1,
                ...usuario.boardSettings.goalkeeperIcon1,
              },
              goalkeeperIcon2: {
                ...DEFAULT_GOALKEEPER_ICON_2_SETTINGS,
                ...prev.goalkeeperIcon2,
                ...usuario.boardSettings.goalkeeperIcon2,
              },
              playerIcon4: {
                ...getDefaultNeutralPlayerSettings(),
                ...prev.playerIcon4,
                ...usuario.boardSettings.playerIcon4,
                hasBib: true,
              },
              teamPlayers: { ...prev.teamPlayers, ...usuario.boardSettings.teamPlayers },
            }));

            // Actualizar tambi�n los iconos de la paleta y teamPlayerStyle con los valores del usuario
            setPaletteIcons((prev) =>
              prev.map((icon) => {
                if (icon.id === 'icon1' && usuario.boardSettings.playerIcon1) {
                  const playerSettings = usuario.boardSettings.playerIcon1;
                  return {
                    ...icon,
                    ...playerSettings,
                    numberColor:
                      playerSettings.numberColor ?? icon.numberColor ?? DEFAULT_PLAYER_NUMBER_COLOR,
                    shape: playerSettings.shape || icon.shape || 'circle',
                    stripeColor: playerSettings.stripeColor || icon.stripeColor || '#ffffff',
                  };
                }
                if (icon.id === 'icon2' && usuario.boardSettings.playerIcon2) {
                  const playerSettings = usuario.boardSettings.playerIcon2;
                  return {
                    ...icon,
                    ...playerSettings,
                    numberColor:
                      playerSettings.numberColor ?? icon.numberColor ?? DEFAULT_PLAYER_NUMBER_COLOR,
                    shape: playerSettings.shape || icon.shape || 'circle',
                    stripeColor: playerSettings.stripeColor || icon.stripeColor || '#ffffff',
                  };
                }
                if (icon.id === 'icon3' && usuario.boardSettings.playerIcon3) {
                  return {
                    ...icon,
                    color: usuario.boardSettings.playerIcon3.color || icon.color,
                    size: usuario.boardSettings.playerIcon3.size || icon.size,
                    numberColor:
                      usuario.boardSettings.playerIcon3.numberColor ||
                      icon.numberColor ||
                      DEFAULT_PLAYER_NUMBER_COLOR,
                    shape: usuario.boardSettings.playerIcon3.shape || icon.shape || 'circle',
                    hasStripes:
                      usuario.boardSettings.playerIcon3.hasStripes !== undefined
                        ? usuario.boardSettings.playerIcon3.hasStripes
                        : icon.hasStripes,
                    hasBib:
                      usuario.boardSettings.playerIcon3.hasBib !== undefined
                        ? usuario.boardSettings.playerIcon3.hasBib
                        : icon.hasBib,
                    bibColor:
                      usuario.boardSettings.playerIcon3.bibColor !== undefined
                        ? usuario.boardSettings.playerIcon3.bibColor
                        : icon.bibColor,
                    stripeColor:
                      usuario.boardSettings.playerIcon3.stripeColor ||
                      icon.stripeColor ||
                      '#ffffff',
                  };
                }
                if (icon.id === 'goalkeeper-1' && usuario.boardSettings.goalkeeperIcon1) {
                  const goalkeeperSettings = {
                    ...DEFAULT_GOALKEEPER_ICON_1_SETTINGS,
                    ...usuario.boardSettings.goalkeeperIcon1,
                  };
                  return {
                    ...icon,
                    ...goalkeeperSettings,
                    number: 1,
                    isGoalkeeper: true,
                    stripeColor:
                      goalkeeperSettings.goalkeeperStripeColor ||
                      goalkeeperSettings.stripeColor ||
                      icon.stripeColor,
                    goalkeeperStripeColor:
                      goalkeeperSettings.goalkeeperStripeColor ||
                      goalkeeperSettings.stripeColor ||
                      icon.goalkeeperStripeColor,
                  };
                }
                if (icon.id === 'goalkeeper-2' && usuario.boardSettings.goalkeeperIcon2) {
                  const goalkeeperSettings = {
                    ...DEFAULT_GOALKEEPER_ICON_2_SETTINGS,
                    ...usuario.boardSettings.goalkeeperIcon2,
                  };
                  return {
                    ...icon,
                    ...goalkeeperSettings,
                    number: 1,
                    isGoalkeeper: true,
                    stripeColor:
                      goalkeeperSettings.goalkeeperStripeColor ||
                      goalkeeperSettings.stripeColor ||
                      icon.stripeColor,
                    goalkeeperStripeColor:
                      goalkeeperSettings.goalkeeperStripeColor ||
                      goalkeeperSettings.stripeColor ||
                      icon.goalkeeperStripeColor,
                  };
                }
                if (icon.id === 'neutral-player') {
                  return {
                    ...icon,
                    ...getDefaultNeutralPlayerSettings(),
                    ...usuario.boardSettings.playerIcon4,
                    hasBib: true,
                    number: 'N',
                    isNeutral: true,
                  };
                }
                return icon;
              }),
            );

            // Actualizar teamPlayerStyle con los valores del usuario
            if (usuario.boardSettings.teamPlayers) {
              const tp = usuario.boardSettings.teamPlayers;
              // Usar valores de BD si existen, si no mantener los por defecto
              setTeamPlayerStyle({
                color: tp.color !== undefined && tp.color !== null ? tp.color : '#2176ff',
                goalkeeperColor:
                  tp.goalkeeperColor !== undefined && tp.goalkeeperColor !== null
                    ? tp.goalkeeperColor
                    : '#ff4a4a',
                size:
                  tp.size !== undefined && tp.size !== null ? tp.size : DEFAULT_PLAYER_ICON_SIZE,
                numberColor:
                  tp.numberColor !== undefined && tp.numberColor !== null
                    ? tp.numberColor
                    : '#ffffff',
                textColor:
                  tp.textColor !== undefined && tp.textColor !== null ? tp.textColor : '#000000',
                textBackgroundColor:
                  tp.textBackgroundColor !== undefined && tp.textBackgroundColor !== null
                    ? tp.textBackgroundColor
                    : '#ffffff',
                differentiateGoalkeeper:
                  tp.differentiateGoalkeeper !== undefined ? tp.differentiateGoalkeeper : true,
                goalkeeperStripeColor:
                  tp.goalkeeperStripeColor !== undefined && tp.goalkeeperStripeColor !== null
                    ? tp.goalkeeperStripeColor
                    : '#ffffff',
                showPhotos: tp.showPhotos !== undefined ? tp.showPhotos : false,
                shape: tp.shape !== undefined && tp.shape !== null ? tp.shape : 'circle',
                hasStripes: tp.hasStripes !== undefined ? tp.hasStripes : false,
                hasBib: tp.hasBib !== undefined ? tp.hasBib : false,
                bibColor:
                  tp.bibColor !== undefined && tp.bibColor !== null
                    ? tp.bibColor
                    : NEUTRAL_PLAYER_COLORS.bib,
                stripeColor:
                  tp.stripeColor !== undefined && tp.stripeColor !== null
                    ? tp.stripeColor
                    : '#ffffff',
              });
            }
          }

          // Marcar que se cargaron los datos del usuario
          userSettingsLoadedRef.current = true;
          setUserSettingsLoaded(true);
        } catch (err) {
          console.warn('Error loading user settings', err);
          // Marcar como cargado incluso si hay error para permitir que funcione
          userSettingsLoadedRef.current = true;
          setUserSettingsLoaded(true);
        }
      };

      loadUserSettings();
    }, []),
  );

  // Helper: clear multi-select
  const clearMultiSelect = useCallback(() => {
    setMultiSelectMode(false);
    setSelectedCloneIds([]);
  }, []);

  // Helper: exit any drawing mode
  const exitDrawingMode = useCallback(() => {
    setDrawingStraightArrow(false);
    setDrawingStraightLine(false);
    setDrawingCurveLine(false);
    setDrawingCurveArrow(false);
    setDrawingCircle(false);
    setDrawingRectangle(false);
    setDrawingCustomShape(false);
    setPendingPlacementAction(null);
  }, []);

  // Helper: clear entire board state when exiting without saving
  const clearBoardState = useCallback(() => {
    // Exit any drawing or selection modes
    exitDrawingMode();
    setCustomShapePoints([]);
    setTemporaryLinePoints([]);
    setCurvePoints([]);

    // Clear elements and selections
    setClones([]);
    setConnectors([]); // Limpiar conectores
    setSelectedCloneIds([]);
    setSelectedCloneId(null);
    setSelectionRect(null);
    setIsSelecting(false);
    setSelectionInteractionMode('select');
    setMultiSelectMode(false);

    // Reset preview / zoom / pan and related UI
    setPreviewPoint(null);
    setIsPreviewingPoint(false);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setInstructionMessage(null);

    // Reset players/palette state
    setPlayersModalVisible(false);
    setAvailablePlayers([]);
    setSelectedPlayerIds([]);
    setSelectedStaffIds([]); // Resetear staff seleccionados
    setPaletteVisible(false);
    setShowingPlayersPalette(false);
    setShowingMaterialsPalette(false);
    setShowingStaffPalette(false);

    // Reset video state
    setVideoKeyframes([]);
    setFieldImageForVideo(null);
    setVideoRecorderVisible(false);

    // Reset field to default (full field)
    setFieldLineType('full');
    setViewMode('entire');

    // Reset other modals
    setFormationModalVisible(false);
    setZoomVisible(false);
    setDrawingRectangle(false);
    setDrawingCustomShape(false);
    setPendingLineAction(null);
    setPendingPlacementAction(null);

    // Resetear la referencia de carga de usuario para que al volver a entrar cargue datos frescos
    userSettingsLoadedRef.current = false;

    // Resetear Configuraci�n de dibujo a valores por defecto
    setLineType('solid');
    setDotSize(2);
    setDotSpacing(4);
    setArrowThickness(2);
    setEraserMode(false);
    setStandardSize(24);
    setPlayersWithNumber(true);

    // Resetear estilos de jugadores y Configuraci�n de pizarra a valores por defecto
    setTeamPlayerStyle({
      color: '#2176ff',
      goalkeeperColor: '#ff4a4a',
      size: DEFAULT_PLAYER_ICON_SIZE,
      numberColor: '#ffffff',
      textColor: '#000000',
      textBackgroundColor: '#ffffff',
      showPosition: false,
      differentiateGoalkeeper: true,
      goalkeeperStripeColor: '#ffffff',
      showPhotos: false,
      shape: 'circle',
      hasStripes: false,
      hasBib: false,
      bibColor: NEUTRAL_PLAYER_COLORS.bib,
      stripeColor: '#ffffff',
    });
    setBoardSettings(getDefaultBoardSettings());
    setFormationSettings({
      displayMode: 'number',
      customLabels: { ...getDefaultPositionLabels() },
      numberColor: '#ffffff',
      textColor: '#000000',
      textBackgroundColor: '#ffffff',
    });
    setMaterialsConfig({
      'cone-pro': { color: '#FF6B00', size: 18 },
      'cone-flat': { color: '#FF6B00', size: 24 },
      ring: { color: '#FFD700', size: 24 },
      dummy: { color: '#2196F3', size: 40 },
    });

    // Resetear iconos de paleta a valores iniciales
    setPaletteIcons(filteredIcons.map((i) => ({ ...i })));

    // Resetear contadores de iconos
    iconCounters.current = {};

    // Limpiar historial de undo/redo directamente
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingStateRef.current = null;
    historyRef.current = ['[]'];
    historyIndexRef.current = 0;
    lastSavedStateRef.current = '[]';
    setCanUndo((prev) => (prev === false ? prev : false));
    setCanRedo((prev) => (prev === false ? prev : false));
  }, [exitDrawingMode, filteredIcons]);

  // Funci�n para cerrar el grabador de video

  // Funci�n para limpiar keyframes
  const clearVideoKeyframes = useCallback(() => {
    setVideoKeyframes([]);
  }, []);

  // Helper: convertir snapshot de keyframe (coordenadas absolutas) a un clone del sistema (ratios)
  const snapshotToClone = useCallback(
    (snap, originalDimensions = null) => {
      // Usar dimensiones originales si se proporcionan (para videos guardados),
      // sino usar las dimensiones actuales del campo
      const sourceWidth = originalDimensions?.fieldWidth || imageWidth || 1;
      const sourceHeight = originalDimensions?.fieldHeight || imageHeight || 1;

      const pxToRatioX = (x) => (sourceWidth > 0 ? x / sourceWidth : 0);
      const pxToRatioY = (y) => (sourceHeight > 0 ? y / sourceHeight : 0);

      const id =
        snap.id || `${snap.type || 'elem'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const clone = { id, type: snap.type || 'unknown' };
      if (snap._drawProgress !== undefined) clone._drawProgress = snap._drawProgress;

      // Posici�n puntual - PRIORIZAR ratios originales si est�n disponibles
      if (typeof snap.xRatio === 'number' && typeof snap.yRatio === 'number') {
        // Usar ratios originales directamente (m�s preciso)
        clone.xRatio = snap.xRatio;
        clone.yRatio = snap.yRatio;
      } else if (typeof snap.x === 'number' && typeof snap.y === 'number') {
        // Fallback: convertir coordenadas absolutas a ratios
        clone.xRatio = pxToRatioX(snap.x);
        clone.yRatio = pxToRatioY(snap.y);
      }

      // Size / color / rotation / lock / zIndex / paletteIndex
      if (snap.baseSize !== undefined) {
        // Restaurar el tama�o l�gico original si est� disponible
        clone.size = snap.baseSize;
      } else if (snap.size) {
        // Si solo tenemos tama�o en px, aproximar
        clone.size = Math.round(snap.size);
      }
      if (snap.color) clone.color = snap.color;
      if (snap.rotation) clone.rotation = snap.rotation;
      if (snap.locked !== undefined) clone.locked = snap.locked;
      if (snap.zIndex !== undefined) clone.zIndex = snap.zIndex;
      if (snap.paletteIndex !== undefined) clone.paletteIndex = snap.paletteIndex;
      if (snap.preserveVisualStyle !== undefined)
        clone.preserveVisualStyle = snap.preserveVisualStyle;
      if (snap.differentiateGoalkeeper !== undefined) {
        clone.differentiateGoalkeeper = snap.differentiateGoalkeeper;
      }
      if (snap.showPhotos !== undefined) clone.showPhotos = snap.showPhotos;
      if (snap.photoUrl !== undefined) clone.photoUrl = snap.photoUrl;

      // Jugador
      if (snap.type === 'player') {
        if (snap.number !== undefined) clone.number = snap.number;
        if (snap.playerData) clone.playerData = snap.playerData;
        // Mantener color y tama�o
        if (!clone.size) clone.size = standardSize;
        if (!clone.color) clone.color = teamPlayerStyle.color || '#2176ff';
        clone.numberColor = snap.numberColor || clone.numberColor || '#ffffff';
        if (snap.backgroundColor) clone.backgroundColor = snap.backgroundColor;
        if (snap.isNeutral !== undefined) clone.isNeutral = snap.isNeutral;
        if (snap.shape) clone.shape = snap.shape;
        if (snap.hasStripes !== undefined) clone.hasStripes = snap.hasStripes;
        if (snap.hasBib !== undefined) clone.hasBib = snap.hasBib;
        if (snap.bibColor) clone.bibColor = snap.bibColor;
        if (snap.stripeColor) clone.stripeColor = snap.stripeColor;
        if (snap.goalkeeperStripeColor) clone.goalkeeperStripeColor = snap.goalkeeperStripeColor;
        if (snap.displayLabel) clone.displayLabel = snap.displayLabel;
        if (snap.ownerType) clone.ownerType = snap.ownerType;
      }

      // Sombra sintética del balón (solo se inserta durante reproducción de
      // video con trayectoria 'air'). Conservamos las propiedades visuales
      // específicas y forzamos el tamaño real para que la elipse se calcule
      // a partir del tamaño base del balón.
      if (snap.type === 'ball-shadow') {
        if (snap.size !== undefined) clone.size = snap.size;
        if (snap.opacity !== undefined) clone.opacity = snap.opacity;
        if (snap.shadowScale !== undefined) clone.shadowScale = snap.shadowScale;
        clone.locked = true;
      }

      // Staff (cuerpo t�cnico)
      if (snap.type === 'staff') {
        if (snap.staffRole) clone.staffRole = snap.staffRole;
        if (snap.displayLabel) clone.displayLabel = snap.displayLabel;
        if (!clone.size) clone.size = standardSize;
        if (!clone.color) clone.color = '#333333';
        clone.numberColor = snap.numberColor || '#ffffff';
      }

      // Texto libre
      if (snap.text) {
        clone.type = 'free-text';
        clone.value = snap.text;
        clone.size = Math.round(snap.fontSize || snap.size || 16);
        clone.color = snap.color || '#000000';
        clone.backgroundColor = snap.backgroundColor || 'transparent';
        if (snap.rotation) clone.rotation = snap.rotation;
      }

      // L�neas / curvas / shapes con puntos - PRIORIZAR pointsRatio si est�n disponibles
      if (snap.pointsRatio && Array.isArray(snap.pointsRatio)) {
        // Usar ratios originales directamente (m�s preciso)
        clone.points = snap.pointsRatio.map((p) => ({ x: p.x, y: p.y }));
        clone.thickness =
          snap.baseThickness !== undefined
            ? snap.baseThickness
            : snap.thickness !== undefined
              ? snap.thickness
              : clone.thickness;
        if (snap.color) clone.color = snap.color;
        if (snap.lineType) clone.lineType = snap.lineType;
        if (snap.fillColor) clone.fillColor = snap.fillColor;
        if (snap.dotSize !== undefined) clone.dotSize = snap.dotSize;
        if (snap.dotSpacing !== undefined) clone.dotSpacing = snap.dotSpacing;
        if (snap.closed) {
          clone.isCustomShapeComplete = true;
          clone.imageWidth = sourceWidth;
          clone.imageHeight = sourceHeight;
        }
      } else if (snap.points && Array.isArray(snap.points)) {
        // Fallback: convertir coordenadas absolutas a ratios
        clone.points = snap.points.map((p) => ({ x: pxToRatioX(p.x), y: pxToRatioY(p.y) }));
        clone.thickness =
          snap.baseThickness !== undefined
            ? snap.baseThickness
            : snap.thickness !== undefined
              ? snap.thickness
              : clone.thickness;
        if (snap.color) clone.color = snap.color;
        if (snap.lineType) clone.lineType = snap.lineType;
        if (snap.fillColor) clone.fillColor = snap.fillColor;
        if (snap.dotSize !== undefined) clone.dotSize = snap.dotSize;
        if (snap.dotSpacing !== undefined) clone.dotSpacing = snap.dotSpacing;
        if (snap.closed) {
          clone.isCustomShapeComplete = true;
          clone.imageWidth = sourceWidth;
          clone.imageHeight = sourceHeight;
        }
      }

      // L�neas rectas (x1,y1,x2,y2) - solo si no se procesaron puntos arriba
      if (!clone.points && typeof snap.x1 === 'number' && typeof snap.x2 === 'number') {
        clone.points = [
          { x: pxToRatioX(snap.x1), y: pxToRatioY(snap.y1) },
          { x: pxToRatioX(snap.x2), y: pxToRatioY(snap.y2) },
        ];
        clone.thickness =
          snap.baseThickness !== undefined
            ? snap.baseThickness
            : snap.thickness !== undefined
              ? snap.thickness
              : clone.thickness;
        if (snap.color) clone.color = snap.color;
        if (snap.lineType) clone.lineType = snap.lineType;
        if (snap.dotSize !== undefined) clone.dotSize = snap.dotSize;
        if (snap.dotSpacing !== undefined) clone.dotSpacing = snap.dotSpacing;
      }

      // C�rculos (x=center, y=center, radius) - solo si no se procesaron puntos arriba
      if (!clone.points && typeof snap.radius === 'number' && typeof snap.x === 'number') {
        const cx = snap.x;
        const cy = snap.y;
        const r = snap.radius;
        // Representar c�rculo con dos puntos (izquierda/derecha)
        const p1 = { x: cx - r, y: cy };
        const p2 = { x: cx + r, y: cy };
        clone.points = [
          { x: pxToRatioX(p1.x), y: pxToRatioY(p1.y) },
          { x: pxToRatioX(p2.x), y: pxToRatioY(p2.y) },
        ];
        clone.thickness =
          snap.baseThickness !== undefined
            ? snap.baseThickness
            : snap.thickness !== undefined
              ? snap.thickness
              : clone.thickness;
        if (snap.fillColor) clone.fillColor = snap.fillColor;
        if (snap.color) clone.color = snap.color;
        if (snap.lineType) clone.lineType = snap.lineType;
        if (snap.dotSize !== undefined) clone.dotSize = snap.dotSize;
        if (snap.dotSpacing !== undefined) clone.dotSpacing = snap.dotSpacing;
        clone.type = 'circle';
      }

      // Rect�ngulos (x,y,width,height) -> dos puntos (tl, br) - solo si no se procesaron puntos arriba
      if (
        !clone.points &&
        typeof snap.width === 'number' &&
        typeof snap.height === 'number' &&
        typeof snap.x === 'number'
      ) {
        const x1 = snap.x;
        const y1 = snap.y;
        const x2 = snap.x + snap.width;
        const y2 = snap.y + snap.height;
        clone.points = [
          { x: pxToRatioX(x1), y: pxToRatioY(y1) },
          { x: pxToRatioX(x2), y: pxToRatioY(y2) },
        ];
        clone.thickness =
          snap.baseThickness !== undefined
            ? snap.baseThickness
            : snap.thickness !== undefined
              ? snap.thickness
              : clone.thickness;
        if (snap.fillColor) clone.fillColor = snap.fillColor;
        if (snap.color) clone.color = snap.color;
        if (snap.lineType) clone.lineType = snap.lineType;
        if (snap.dotSize !== undefined) clone.dotSize = snap.dotSize;
        if (snap.dotSpacing !== undefined) clone.dotSpacing = snap.dotSpacing;
        clone.type = 'rectangle';
        if (snap.rotation) clone.rotation = snap.rotation;
      }

      return clone;
    },
    [imageWidth, imageHeight, standardSize, teamPlayerStyle.color],
  );

  // Preview de un keyframe (temporal): reemplaza clones en pantalla y conectores
  const goToKeyframe = useCallback(
    (index) => {
      const kf = videoKeyframes && videoKeyframes[index];
      if (!kf || !kf.elements) return;
      // Usar dimensiones originales del video si estamos editando, para conversi�n correcta de coordenadas
      const originalDimensions = editingVideoConfigRef.current;
      const newClones = kf.elements.map((elem) => snapshotToClone(elem, originalDimensions));
      // Deseleccionar y limpiar multi-select para evitar conflictos
      setSelectedCloneId(null);
      clearMultiSelect();
      setClones(newClones);
      // Restaurar conectores del keyframe (si existen)
      if (kf.connectors && Array.isArray(kf.connectors)) {
        setConnectors(
          kf.connectors.map((c) => ({
            id: c.id,
            fromId: c.fromId,
            toId: c.toId,
            color: c.color || '#000000',
            thickness: c.thickness || 2,
          })),
        );
      } else {
        // Si el keyframe no tiene conectores, limpiar los existentes
        setConnectors([]);
      }
    },
    [videoKeyframes, snapshotToClone, clearMultiSelect],
  );

  // Ir al �ltimo keyframe (usado despu�s de generar video)
  // Mantiene el estado actual del campo (�ltima captura) en lugar de restaurar al primero
  // NO sobreescribe savedClonesOriginalRef para poder restaurar al estado original despu�s
  const goToLastKeyframe = useCallback(() => {
    if (videoKeyframes && videoKeyframes.length > 0) {
      const lastIndex = videoKeyframes.length - 1;
      const kf = videoKeyframes[lastIndex];
      if (!kf || !kf.elements) return;
      // Usar dimensiones originales del video si estamos editando, para conversi�n correcta de coordenadas
      const originalDimensions = editingVideoConfigRef.current;
      const newClones = kf.elements.map((elem) => snapshotToClone(elem, originalDimensions));
      setSelectedCloneId(null);
      clearMultiSelect();
      setClones(newClones);
      // Restaurar conectores del �ltimo keyframe (si existen)
      if (kf.connectors && Array.isArray(kf.connectors)) {
        setConnectors(
          kf.connectors.map((c) => ({
            id: c.id,
            fromId: c.fromId,
            toId: c.toId,
            color: c.color || '#000000',
            thickness: c.thickness || 2,
          })),
        );
      } else {
        setConnectors([]);
      }
      // NO actualizamos savedClonesOriginalRef aqu� para poder restaurar al estado original
      // cuando el usuario elimine keyframes o guarde el video
    }
  }, [videoKeyframes, snapshotToClone, clearMultiSelect]);

  // ─── Video frame control para captura client-side ───
  // Se actualiza en cada render para que siempre tenga las funciones m�s recientes
  videoFrameControlRef.current = {
    // Pone un snapshot de elementos en el campo SIN tocar el historial de undo
    setFrame: (elementSnapshots, frameConnectors) => {
      return new Promise((resolve) => {
        // Deseleccionar todo para que no aparezcan handles de selecci�n en la captura
        setSelectedCloneId(null);
        clearMultiSelect();
        const newClones = elementSnapshots.map((elem) => snapshotToClone(elem));
        setActualClones(newClones);
        if (frameConnectors && Array.isArray(frameConnectors)) {
          setConnectors(
            frameConnectors.map((c) => ({
              id: c.id,
              fromId: c.fromId,
              toId: c.toId,
              color: c.color || '#000000',
              thickness: c.thickness || 2,
            })),
          );
        } else {
          setConnectors([]);
        }
        requestAnimationFrame(resolve);
      });
    },
    // Guarda zoom/pan actuales y resetea a 1/0 para captura limpia
    resetZoom: () => {
      const saved = { zoom: zoomLevel, pan: { ...panOffset } };
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      return saved;
    },
    // Restaura zoom/pan tras la captura
    restoreZoom: (saved) => {
      if (saved) {
        setZoomLevel(saved.zoom);
        setPanOffset(saved.pan);
      }
    },
    // Deselecciona todos los elementos (para captura limpia de keyframes)
    deselectAll: () => {
      setSelectedCloneId(null);
      clearMultiSelect();
    },
    getSelected: () => {
      return {
        selectedCloneId,
        selectedCloneIds: [...selectedCloneIds],
        multiSelectMode,
      };
    },
    setSelected: (sel) => {
      if (sel) {
        setSelectedCloneId(sel.selectedCloneId);
        setSelectedCloneIds(sel.selectedCloneIds);
        setMultiSelectMode(sel.multiSelectMode);
      }
    },
  };

  const previewVideoOnBoard = useCallback(async (frames, fps = 30) => {
    if (!Array.isArray(frames) || frames.length === 0) return;
    const playbackId = ++boardPreviewPlaybackIdRef.current;
    const frameMs = 1000 / Math.max(1, fps);
    const now = () =>
      typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
    const startedAt = now();
    let index = 0;

    while (index < frames.length && boardPreviewPlaybackIdRef.current === playbackId) {
      const frame = frames[index];
      await videoFrameControlRef.current?.setFrame?.(frame.elements || [], frame.connectors || []);

      const elapsed = now() - startedAt;
      const nextIndex = Math.min(
        frames.length - 1,
        Math.max(index + 1, Math.floor(elapsed / frameMs) + 1),
      );
      if (nextIndex === index) break;
      await sleep(startedAt + nextIndex * frameMs - now());
      index = nextIndex;
    }

    if (boardPreviewPlaybackIdRef.current === playbackId) {
      const lastFrame = frames[frames.length - 1];
      await videoFrameControlRef.current?.setFrame?.(
        lastFrame.elements || [],
        lastFrame.connectors || [],
      );
    }
  }, []);

  // Restaurar al estado original (antes de abrir el video recorder)
  // Usado cuando se eliminan keyframes o se guarda el video
  const restoreToOriginalState = useCallback(() => {
    if (savedClonesOriginalRef.current) {
      try {
        const originalClones = JSON.parse(JSON.stringify(savedClonesOriginalRef.current));
        setSelectedCloneId(null);
        clearMultiSelect();
        setClones(originalClones);
        // Marcar que queremos mantener este estado al cerrar
        keepVideoChangesRef.current = true;
      } catch (e) {
        // Si hay error, usar directamente la referencia
        if (Array.isArray(savedClonesOriginalRef.current)) {
          setClones([...savedClonesOriginalRef.current]);
        }
      }
    }
  }, [clearMultiSelect]);

  // Aplicar un keyframe permanentemente al campo (ya no restaurable al cerrar)
  const applyKeyframe = useCallback(
    (index) => {
      const kf = videoKeyframes && videoKeyframes[index];
      if (!kf || !kf.elements) return;
      // Usar dimensiones originales del video si estamos editando, para conversi�n correcta de coordenadas
      const originalDimensions = editingVideoConfigRef.current;
      const newClones = kf.elements.map((elem) => snapshotToClone(elem, originalDimensions));
      setSelectedCloneId(null);
      clearMultiSelect();
      setClones(newClones);

      // Registrar en historial (acci�n expl�cita) - deferir para asegurarnos que commitToHistory est� definido
      setTimeout(() => {
        try {
          commitToHistory(JSON.stringify(newClones));
        } catch (e) {
          // no-op
        }
      }, 0);

      // Marcar que el usuario aplic� cambios: no restaurar al cerrar
      keepVideoChangesRef.current = true;
      // Adem�s actualizar savedClonesOriginalRef para reflejar nuevo estado como base
      try {
        savedClonesOriginalRef.current = JSON.parse(JSON.stringify(newClones));
      } catch (e) {
        savedClonesOriginalRef.current = newClones;
      }
    },
    [videoKeyframes, snapshotToClone, clearMultiSelect],
  );

  // =====================================================
  // CARGA DE VIDEO PARA EDICIÓN
  // =====================================================
  // Ref para almacenar el ID del �ltimo video cargado (para detectar cambios)
  const lastLoadedVideoIdRef = useRef(null);

  const applyAssignedPlayersToKeyframeElements = useCallback(
    (elements = []) => {
      const assignedById = new Map(
        (initialElements || [])
          .filter((element) => element?.type === 'player' && element.playerData)
          .map((element) => [String(element.id || element._id || ''), element]),
      );
      if (!assignedById.size) return elements;

      return elements.map((element) => {
        if (element?.type !== 'player') return element;
        const assigned = assignedById.get(String(element.id || element._id || ''));
        if (!assigned?.playerData) return element;
        return {
          ...element,
          number: assigned.number ?? element.number,
          playerData: assigned.playerData,
          photoUrl:
            assigned.photoUrl ||
            (assigned.playerData?.foto ? cdnUrl(assigned.playerData.foto) : element.photoUrl),
          preserveVisualStyle: true,
          displayLabel: assigned.displayLabel ?? element.displayLabel,
          textColor: assigned.textColor ?? element.textColor,
          textBackgroundColor: assigned.textBackgroundColor ?? element.textBackgroundColor,
        };
      });
    },
    [initialElements],
  );

  // Efecto para cargar datos del video cuando estamos en modo edici�n
  const loadEditVideoDataIntoBoard = useCallback(
    (currentEditVideoData, deferOpen = false) => {
      if (!currentEditVideoData?.videoId) return false;
      if (lastLoadedVideoIdRef.current === currentEditVideoData.videoId) return true;

      lastLoadedVideoIdRef.current = currentEditVideoData.videoId;
      setIsEditingVideo(true);
      setEditingVideoId(currentEditVideoData.videoId);
      setEditingVideoName(currentEditVideoData.nombre || '');
      setEditingVideoDescription(currentEditVideoData.descripcion || '');
      setEditingVideoFolderId(currentEditVideoData.folderId || null);

      const originalDimensions = currentEditVideoData.config || {
        fieldWidth: 1280,
        fieldHeight: 720,
      };
      editingVideoConfigRef.current = originalDimensions;

      if (originalDimensions.playersWithNumber !== undefined) {
        setPlayersWithNumber(originalDimensions.playersWithNumber);
      }

      if (currentEditVideoData.fieldType && !deferOpen) {
        const decomposed = decomposeFieldId(currentEditVideoData.fieldType);
        setFieldLineType(decomposed.lineType);
        setViewMode(decomposed.viewMode);
      }

      if (currentEditVideoData.keyframes && currentEditVideoData.keyframes.length > 0) {
        const loadedKeyframes = currentEditVideoData.keyframes.map((kf) => ({
          timestamp: kf.timestamp,
          elements: applyAssignedPlayersToKeyframeElements(kf.elements || []),
          connectors: kf.connectors || [],
          ballTrajectoryType: kf.ballTrajectoryType || 'ground',
          ballTrajectoryById: kf.ballTrajectoryById || {},
        }));

        setVideoKeyframes(loadedKeyframes);
        setLoadedEditVideoKeyframeCount(loadedKeyframes.length);

        const lastLoadedKeyframe = loadedKeyframes[loadedKeyframes.length - 1];
        if (!deferOpen && lastLoadedKeyframe && lastLoadedKeyframe.elements) {
          const lastKeyframeElements = lastLoadedKeyframe.elements.map((elem) =>
            snapshotToClone(elem, originalDimensions),
          );
          setClones(lastKeyframeElements);
          setConnectors(lastLoadedKeyframe.connectors || []);
          try {
            savedClonesOriginalRef.current = JSON.parse(JSON.stringify(lastKeyframeElements));
          } catch (e) {
            savedClonesOriginalRef.current = lastKeyframeElements;
          }
        }
      } else {
        setLoadedEditVideoKeyframeCount(0);
      }

      if (!deferOpen) {
        setTimeout(() => {
          setVideoRecorderVisible(true);
        }, 300);
      }
      return true;
    },
    [applyAssignedPlayersToKeyframeElements, snapshotToClone],
  );

  const loadEditVideoDataRef = useRef(loadEditVideoDataIntoBoard);
  const deferEditVideoOpenRef = useRef(deferEditVideoOpen);
  const editVideoDataRef = useRef(editVideoData);

  useEffect(() => {
    loadEditVideoDataRef.current = loadEditVideoDataIntoBoard;
    deferEditVideoOpenRef.current = deferEditVideoOpen;
    editVideoDataRef.current = editVideoData;
  });

  // Usamos useFocusEffect para que se ejecute cada vez que la pantalla gana el foco
  useFocusEffect(
    useCallback(() => {
      // Obtener editVideoData fresco desde global cada vez que ganamos el foco
      const currentEditVideoData = editVideoDataRef.current || global.editVideoData;

      // Si no hay datos de video para editar, no hacer nada
      if (!currentEditVideoData) {
        return;
      }

      loadEditVideoDataRef.current(currentEditVideoData, deferEditVideoOpenRef.current);
      if (!editVideoDataRef.current) global.editVideoData = null;
      return () => {
        lastLoadedVideoIdRef.current = null;
      };
    }, []),
  );
  // =====================================================
  // FIN CARGA DE VIDEO PARA EDICIÓN
  // =====================================================

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.2, 3));
  }, []); // Array de dependencias VACÍO

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.2, 1));
  }, []); // Array de dependencias VACÍO

  const handlePanLeft = useCallback(() => {
    setPanOffset((prev) => ({ ...prev, x: prev.x + 30 }));
  }, []); // Array de dependencias VACÍO

  const handlePanRight = useCallback(() => {
    setPanOffset((prev) => ({ ...prev, x: prev.x - 30 }));
  }, []); // Array de dependencias VACÍO

  const handlePanUp = useCallback(() => {
    setPanOffset((prev) => ({ ...prev, y: prev.y + 30 }));
  }, []); // Array de dependencias VACÍO

  const handlePanDown = useCallback(() => {
    setPanOffset((prev) => ({ ...prev, y: prev.y - 30 }));
  }, []); // Array de dependencias VACÍO

  const handleResetView = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Funci�n para aplicar una formaci�n al campo
  const rotateToHorizontal = useCallback((pos) => {
    // Rotate so goalkeeper (defensa) appears on the left and forwards on the right.
    // New mapping: x' = 1 - y, y' = x
    const x = 1 - (pos.yRatio || 0);
    const y = pos.xRatio || 0;

    return {
      xRatio: x,
      yRatio: Math.max(0, Math.min(1, y)),
    };
  }, []);

  const applyFormation = useCallback(
    (formationKey, options = {}) => {
      // Buscar la formaci�n en todos los mapas de formaciones
      const formation =
        FORMATIONS[formationKey] || FORMATIONS_8[formationKey] || FORMATIONS_7[formationKey];
      if (!formation) return;

      const color = options.color || teamPlayerStyle.color || '#2176ff';
      const size = options.size || standardSize;
      const ownerType = options.opponent ? 'opponent' : 'team';
      const displayMode = options.displayMode || 'number';
      const customLabels = options.customLabels || getDefaultPositionLabels();
      const numberColor = options.numberColor || teamPlayerStyle.numberColor || '#ffffff';
      const textColor = options.textColor || teamPlayerStyle.textColor || '#000000';
      const textBackgroundColor =
        options.textBackgroundColor || teamPlayerStyle.textBackgroundColor || '#ffffff';
      const playerShape = options.shape || teamPlayerStyle.shape || 'circle';
      const hasStripes =
        options.hasStripes !== undefined ? options.hasStripes : teamPlayerStyle.hasStripes;
      const hasBib = options.hasBib !== undefined ? options.hasBib : teamPlayerStyle.hasBib;
      const bibColor = options.bibColor || teamPlayerStyle.bibColor || NEUTRAL_PLAYER_COLORS.bib;
      const stripeColor = options.stripeColor || teamPlayerStyle.stripeColor || '#ffffff';
      const realPlayers = options.realPlayers || null; // Array de jugadores reales si se seleccionaron

      const newPlayers = formation.positions.map((pos, idx) => {
        const id = `formation-player-${Date.now()}-${Math.random()}`;
        const rotated = rotateToHorizontal(pos);
        // Mirror horizontally if this is opponent alignment (keep goalkeeper on right)
        const finalX = options.opponent
          ? Math.max(0, Math.min(1, 1 - rotated.xRatio))
          : rotated.xRatio;

        // Determinar qu� mostrar: n�mero, posici�n o nombre de jugador real
        let displayLabel = undefined;
        let playerNumber = playersWithNumber ? pos.number : undefined;
        let isRealPlayer = false;
        let playerInfo = null;

        if (realPlayers && realPlayers[idx]) {
          // Usar jugador real
          const rp = realPlayers[idx];
          isRealPlayer = !rp.isPlaceholder;
          // Para jugadores reales: mostrar dorsal en c�rculo, nombre debajo
          playerNumber = rp.dorsal || pos.number;
          displayLabel = undefined; // No mostrar texto en el c�rculo, solo el n�mero/dorsal
          playerInfo = {
            fullName: rp.fullName,
            playerId: rp.playerId,
            posicion: rp.posicion,
            foto: rp.foto, // Incluir foto
          };
        } else if (displayMode === 'position' && pos.position) {
          displayLabel =
            customLabels[pos.position] || getDefaultPositionLabels()[pos.position] || pos.position;
        }

        return {
          id,
          type: 'player',
          ownerType,
          color,
          size,
          number: playerNumber,
          displayLabel: displayLabel,
          numberColor,
          shape: playerShape,
          hasStripes,
          hasBib,
          bibColor,
          stripeColor,
          textColor, // Color del texto del nombre
          textBackgroundColor, // Color del fondo del nombre
          xRatio: finalX,
          yRatio: rotated.yRatio,
          rotation: 0,
          locked: false,
          zIndex: 200 + (pos.number || 0),
          position: pos.position, // Guardar la posici�n original
          isRealPlayer, // Indicar si es un jugador real
          playerInfo, // Info adicional del jugador
          // A�adir playerData para mostrar nombre debajo del icono
          playerData:
            isRealPlayer && playerInfo?.fullName
              ? {
                  nombre: playerInfo.fullName,
                  fullName: playerInfo.fullName,
                  foto: playerInfo.foto, // Incluir foto
                  posicion: playerInfo.posicion, // Incluir posici�n para detectar portero
                }
              : null,
        };
      });

      // Remove existing player icons of the same ownerType, keep other elements and other side's players
      setClones((prev) => {
        const filtered = prev.filter((c) => !(c.type === 'player' && c.ownerType === ownerType));
        return [...newPlayers, ...filtered];
      });

      setInstructionMessage({
        visible: true,
        text: `${t('formations.instructionTitle')} - ${ownerType === 'opponent' ? t('formations.opponent') : t('formations.team')}`,
        subtext: t('formations.instructionText'),
      });
      setTimeout(() => setInstructionMessage(null), 3000);
    },
    [
      rotateToHorizontal,
      teamPlayerStyle.color,
      teamPlayerStyle.numberColor,
      teamPlayerStyle.textColor,
      teamPlayerStyle.textBackgroundColor,
      teamPlayerStyle.shape,
      teamPlayerStyle.hasStripes,
      teamPlayerStyle.hasBib,
      teamPlayerStyle.bibColor,
      teamPlayerStyle.stripeColor,
      standardSize,
      playersWithNumber,
      t,
    ],
  );

  // Delete formation of the specified ownerType ('team'|'opponent')
  const deleteFormation = useCallback(
    (ownerType) => {
      setClones((prev) => prev.filter((c) => !(c.type === 'player' && c.ownerType === ownerType)));
      setInstructionMessage({
        visible: true,
        text: t('formations.deleted', {
          side: ownerType === 'opponent' ? t('formations.opponent') : t('formations.team'),
        }),
      });
      setTimeout(() => setInstructionMessage(null), 2500);
    },
    [t],
  );

  // Memoizar estados de dibujo para evitar recrear el objeto
  const drawingStates = useMemo(
    () => ({
      drawingStraightArrow,
      drawingStraightLine,
      drawingCurveArrow,
      drawingCurveLine,
      drawingCircle,
      drawingRectangle,
      drawingCustomShape,
      eraserMode,
      pendingPlacementAction,
    }),
    [
      drawingStraightArrow,
      drawingStraightLine,
      drawingCurveArrow,
      drawingCurveLine,
      drawingCircle,
      drawingRectangle,
      drawingCustomShape,
      eraserMode,
      pendingPlacementAction,
    ],
  );

  // OPTIMIZACIÓN: Set de IDs seleccionados para b�squeda O(1)
  const selectedCloneIdsSet = useMemo(() => new Set(selectedCloneIds), [selectedCloneIds]);

  // Funci�n para deseleccionar cualquier herramienta de dibujo activa
  const handleDeselectDrawingTool = useCallback(() => {
    setDrawingStraightArrow(false);
    setDrawingStraightLine(false);
    setDrawingCurveLine(false);
    setDrawingCurveArrow(false);
    setDrawingCircle(false);
    setDrawingRectangle(false);
    setDrawingCustomShape(false);
    setEraserMode(false);
    setStraightLineStart(null);
    setStraightLineEnd(null);
    setTemporaryLinePoints([]);
    setCurvePoints([]);
    setIsDrawing(false);
    setCustomShapePoints([]);
    setShowCloseCircle(false);
    setPreviewPoint(null);
    setIsPreviewingPoint(false);
    setPendingLineAction(null);
    setPendingPlacementAction(null);
  }, []);

  const canvasRef = useRef();

  // Estado real de clones
  const [actualClones, setActualClones] = useState(
    (initialElements ?? []).map((clone) => {
      const normalizedClone = { ...clone };
      if (normalizedClone.type === 'player') {
        if (normalizedClone.playersWithNumber === undefined) {
          normalizedClone.playersWithNumber = initialConfig?.playersWithNumber ?? true;
        }
        if (normalizedClone.preserveVisualStyle === undefined) {
          normalizedClone.preserveVisualStyle = true;
        }
      }
      if (
        typeof normalizedClone.xRatio === 'number' &&
        typeof normalizedClone.yRatio === 'number'
      ) {
        return normalizedClone;
      } else if (typeof normalizedClone.x === 'number' && typeof normalizedClone.y === 'number') {
        const initAspect = getAspectForView(viewMode);
        const initW = REFERENCE_WIDTH;
        const initH = REFERENCE_WIDTH * initAspect;
        return {
          ...normalizedClone,
          xRatio: normalizedClone.x / initW,
          yRatio: normalizedClone.y / initH,
        };
      } else {
        return normalizedClone;
      }
    }),
  );

  // Alias y wrapper para setClones
  const clones = actualClones;

  // =====================================================
  // SISTEMA DE UNDO/REDO OPTIMIZADO CON DEBOUNCE (INCLUYE CONECTORES)
  // =====================================================
  const MAX_HISTORY_SIZE = 50; // M�ximo de estados en el historial
  // El historial ahora guarda objetos con { clones, connectors }
  const historyRef = useRef([JSON.stringify({ clones: actualClones, connectors })]); // Historial de estados
  const historyIndexRef = useRef(0); // Índice actual en el historial
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const lastSavedStateRef = useRef(JSON.stringify({ clones: actualClones, connectors })); // Último estado guardado
  const debounceTimerRef = useRef(null); // Timer para debounce
  const pendingStateRef = useRef(null); // Estado pendiente de guardar
  // ms - tiempo para agrupar cambios de drag
  const connectorsRef = useRef(connectors); // Referencia actual de conectores para undo/redo

  // Función para guardar estado en el historial (guarda de forma síncrona/inmediata)
  const commitToHistory = useCallback((stateStr) => {
    // No guardar si es idéntico al último estado guardado
    if (stateStr === lastSavedStateRef.current) return;

    // Eliminar estados futuros si estamos en medio del historial
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    // Añadir nuevo estado
    historyRef.current.push(stateStr);

    // Limitar tamaño del historial
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }

    lastSavedStateRef.current = stateStr;
    // Usar updater funcional para que React haga bail-out si el valor no cambió
    // Esto evita re-renders innecesarios que podrían acumular "nested updates"
    setCanUndo((prev) => {
      const next = historyIndexRef.current > 0;
      return prev === next ? prev : next;
    });
    setCanRedo((prev) => (prev === false ? prev : false));
  }, []);

  const saveToHistoryDebounced = useCallback(
    (newClones, newConnectors) => {
      const stateObj = { clones: newClones, connectors: newConnectors || connectorsRef.current };
      const newStateStr = JSON.stringify(stateObj);
      commitToHistory(newStateStr);
    },
    [commitToHistory],
  );

  // Ref para skip de guardado en historial durante undo/redo (mantenido por compatibilidad de referencias)
  const skipHistoryRef = useRef(false);
  // Ref para acceso estable a actualClones (evita dependencias inestables en callbacks)
  const actualClonesRef = useRef(actualClones);
  actualClonesRef.current = actualClones;
  useEffect(() => {
    actualClonesRef.current = actualClones;
  }, [actualClones]);

  useEffect(() => {
    if (!isMobile || Platform.OS !== 'web') return;
    const prevent = (e) => {
      if (e.touches && e.touches.length > 1) e.preventDefault();
    };
    const preventWheel = (e) => {
      if (e.ctrlKey) e.preventDefault();
    };
    document.addEventListener('touchmove', prevent, { passive: false });
    document.addEventListener('wheel', preventWheel, { passive: false });
    return () => {
      document.removeEventListener('touchmove', prevent);
      document.removeEventListener('wheel', preventWheel);
    };
  }, [isMobile]);

  // =====================================================
  // SISTEMA IMPERATIVO DE GUARDADO DE HISTORIAL
  // No usa useEffect sobre actualClones — evita "Maximum update depth exceeded"
  // El historial se guarda explícitamente al finalizar cualquier drag
  // =====================================================

  // Guarda el estado actual en historial de forma imperativa
  const saveClonesHistory = useCallback(
    (customClones) => {
      if (customClones !== undefined) {
        saveToHistoryDebounced(customClones, connectorsRef.current);
      } else {
        setTimeout(() => {
          saveToHistoryDebounced(actualClonesRef.current, connectorsRef.current);
        }, 0);
      }
    },
    [saveToHistoryDebounced],
  );

  // Ref estable para saveClonesHistory — permite que setClones no dependa de saveClonesHistory
  // y así setClones tenga identidad estable (evita que todos los hijos re-rendericen por cambio de callback)
  const saveClonesHistoryRef = useRef(saveClonesHistory);
  saveClonesHistoryRef.current = saveClonesHistory;

  // Timer para guardado diferido (se programa desde setClones cuando no hay drag)
  const historyIdleTimerRef = useRef(null);

  // Wrapper de setClones PURO — sin side effects en el state updater.
  // Programa guardado de historial solo cuando NO hay drag activo.
  // Durante drag, el guardado se delega al handler de fin de drag (saveClonesHistory).
  const setClones = useCallback((updater) => {
    setActualClones(updater);
    // Programar guardado diferido solo si no hay drag activo
    if (Object.keys(dragStart.current).length === 0) {
      if (historyIdleTimerRef.current) clearTimeout(historyIdleTimerRef.current);
      historyIdleTimerRef.current = setTimeout(() => {
        historyIdleTimerRef.current = null;
        saveClonesHistoryRef.current();
      }, 0);
    }
  }, []); // SIN dependencias — identidad 100% estable

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const stateStr = historyRef.current[historyIndexRef.current];
      lastSavedStateRef.current = stateStr;

      try {
        const parsedState = JSON.parse(stateStr);
        // Compatibilidad: si es array (formato antiguo), solo tiene clones
        if (Array.isArray(parsedState)) {
          setActualClones(parsedState);
        } else {
          // Formato nuevo con clones y conectores
          setActualClones(parsedState.clones || []);
          if (parsedState.connectors && setConnectors) {
            setConnectors(parsedState.connectors);
            connectorsRef.current = parsedState.connectors;
          }
        }
      } catch (e) {
        console.warn('Error parsing undo state:', e);
      }

      setCanUndo((prev) => {
        const n = historyIndexRef.current > 0;
        return prev === n ? prev : n;
      });
      setCanRedo((prev) => (prev === true ? prev : true));
    }
  }, []);

  // Función REDO optimizada (restaura clones y conectores)
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const stateStr = historyRef.current[historyIndexRef.current];
      lastSavedStateRef.current = stateStr;

      try {
        const parsedState = JSON.parse(stateStr);
        // Marcar como skip para que el useEffect de historial no re-guarde el estado restaurado
        skipHistoryRef.current = true;
        // Compatibilidad: si es array (formato antiguo), solo tiene clones
        if (Array.isArray(parsedState)) {
          setActualClones(parsedState);
        } else {
          // Formato nuevo con clones y conectores
          setActualClones(parsedState.clones || []);
          if (parsedState.connectors && setConnectors) {
            setConnectors(parsedState.connectors);
            connectorsRef.current = parsedState.connectors;
          }
        }
      } catch (e) {
        console.warn('Error parsing redo state:', e);
      }

      setCanUndo((prev) => (prev === true ? prev : true));
      setCanRedo((prev) => {
        const n = historyIndexRef.current < historyRef.current.length - 1;
        return prev === n ? prev : n;
      });
    }
  }, []);

  // Limpiar historial cuando se resetea el campo
  // Usa actualClonesRef (ref estable) en lugar de actualClones (cambia cada render durante drag)

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (historyIdleTimerRef.current) {
        clearTimeout(historyIdleTimerRef.current);
      }
    };
  }, []);

  // Wrapper de setConnectors que guarda en el historial
  // Usa actualClonesRef (ref estable) para evitar que cambie de identidad en cada drag frame
  const setConnectorsWithHistory = useCallback(
    (updater) => {
      setConnectors((prev) => {
        const newConnectors = typeof updater === 'function' ? updater(prev) : updater;
        connectorsRef.current = newConnectors;
        return newConnectors;
      });
      // setTimeout fuera del state updater: correcto seg�n React
      setTimeout(() => {
        saveToHistoryDebounced(actualClonesRef.current, connectorsRef.current);
      }, 0);
    },
    [saveToHistoryDebounced],
  );

  // Sincronizar connectorsRef cuando cambien los conectores
  useEffect(() => {
    connectorsRef.current = connectors;
  }, [connectors]);
  // =====================================================
  // FIN SISTEMA UNDO/REDO
  // =====================================================

  // Map de IDs a �ndices para b�squeda O(1)
  const cloneIndexMap = useRef(new Map());
  useEffect(() => {
    cloneIndexMap.current.clear();
    clones.forEach((clone, index) => {
      if (clone.id) {
        cloneIndexMap.current.set(clone.id, index);
      }
    });
  }, [clones]);

  const [selectedCloneId, setSelectedCloneId] = useState(null);
  const [leftPanelVisible, setLeftPanelVisible] = useState(false);
  const [editingIcon, setEditingIcon] = useState(null);
  const [settingsPanelVisible, setSettingsPanelVisible] = useState(false);
  const [playersWithNumber, setPlayersWithNumber] = useState(
    initialConfig?.playersWithNumber ?? true,
  );
  const [arrowThickness, setArrowThickness] = useState(2);
  const [textEditPanel, setTextEditPanel] = useState({ visible: false, icon: null, isNew: false });

  // Sync playersWithNumber from initialConfig when route params change
  useEffect(() => {
    const configVal = initialConfig?.playersWithNumber;
    if (configVal === false || configVal === true) {
      setPlayersWithNumber(configVal);
    }
  }, [initialConfig?.playersWithNumber]);

  useEffect(() => {
    const showPhotos = initialConfig?.teamPlayers?.showPhotos ?? initialConfig?.showPhotos;
    if (showPhotos === true || showPhotos === false) {
      setTeamPlayerStyle((prev) => ({
        ...prev,
        showPhotos,
        showPosition: showPhotos ? false : prev.showPosition,
      }));
    }
  }, [initialConfig?.teamPlayers?.showPhotos, initialConfig?.showPhotos]);

  // Inicializar availablePlayers con todos los jugadores no seleccionados
  useEffect(() => {
    const listToMap =
      matchSheetPlayers && matchSheetPlayers.length > 0 ? matchSheetPlayers : players;
    if (listToMap && listToMap.length > 0) {
      const mapped = listToMap.map((p, idx) => ({
        ...p,
        uniqueId: `player-${p._id || p.id || idx}`,
      }));
      setAvailablePlayers(mapped.filter((p) => !selectedPlayerIds.includes(p.uniqueId)));
    }
  }, [players, matchSheetPlayers, selectedPlayerIds]);

  // Sincronizar selectedPlayerIds al montar o cambiar initialElements
  useEffect(() => {
    if (initialElements && initialElements.length > 0) {
      const playerIds = initialElements
        .filter((el) => el.type === 'player' && el.playerData)
        .map((el) => {
          const p = el.playerData;
          return `player-${p._id || p.id}`;
        })
        .filter(Boolean);
      setSelectedPlayerIds([...new Set(playerIds)]);
    }
  }, [initialElements]);

  // Cargar equipos de la temporada
  useEffect(() => {
    if (season?._id) {
      dispatch(fetchEquiposTemporada({ season: season._id }));
    }
  }, [season, dispatch]);

  // Cargar jugadores del equipo actual
  useEffect(() => {
    const selectedTeam = equipos.find((e) => e.seleccionado === true);
    const teamId = selectedTeam?._id;
    if (teamId && players.length === 0) {
      dispatch(fetchJugadoresEquipo({ team: teamId }));
    }
  }, [equipos, players.length, dispatch]);

  // Callback para cuando se pulsa un clon en modo set-piece
  const handleTapPlayerClone = useCallback((cloneId) => {
    setAssigningCloneId(cloneId);
    setPlayersModalVisible(true);
  }, []);

  const [useSmootherMovement] = useState(true); // Flag para movimientos m�s suaves
  const rafRef = useRef(null); // Referencia para requestAnimationFrame

  // Estado para el men� de opciones
  const [optionsMenu, setOptionsMenu] = useState({
    visible: false,
    position: { x: 0, y: 0 },
    iconId: null,
    canRotate: false,
    hideEdit: false,
  });

  // Estado para el panel de elementos bloqueados
  const [lockedElementsVisible, setLockedElementsVisible] = useState(false);

  // Funci�n para rotar un elemento
  const handleRotateIcon = useCallback((iconId) => {
    if (!iconId) return;

    setClones((prev) =>
      prev.map((clone) => {
        if (clone.id !== iconId) return clone;

        // Para custom-shapes y l�neas, rotar los puntos alrededor del centro
        if (
          clone.type === 'custom-shape' ||
          clone.type === 'straight-line' ||
          clone.type === 'straight-arrow' ||
          clone.type === 'curve-line' ||
          clone.type === 'curve-arrow' ||
          clone.type === 'circle'
        ) {
          if (!clone.points || clone.points.length < 2) return clone;

          // Calcular el centro de la figura
          const centerX = clone.points.reduce((sum, p) => sum + p.x, 0) / clone.points.length;
          const centerY = clone.points.reduce((sum, p) => sum + p.y, 0) / clone.points.length;

          // Rotar cada punto 45 grados alrededor del centro
          const rotatedPoints = clone.points.map((point) => {
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            const angle = Math.PI / 4; // 45 grados

            return {
              x: centerX + (dx * Math.cos(angle) - dy * Math.sin(angle)),
              y: centerY + (dx * Math.sin(angle) + dy * Math.cos(angle)),
            };
          });

          return {
            ...clone,
            points: rotatedPoints,
          };
        }

        // Para otros elementos, usar la rotaci�n normal
        return {
          ...clone,
          rotation: ((clone.rotation || 0) + 45) % 360,
        };
      }),
    );
  }, []);

  // Funcin para aplicar movimientos suaves con InteractionManager
  const applySmootherMovement = useCallback(
    (updateFn) => {
      if (useSmootherMovement) {
        // Usar InteractionManager para ejecutar despus de las animaciones
        InteractionManager.runAfterInteractions(() => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
          }
          rafRef.current = requestAnimationFrame(() => {
            updateFn();
            rafRef.current = null;
          });
        });
      } else {
        updateFn();
      }
    },
    [useSmootherMovement],
  );

  // 1. A�adir estos estados en el componente Field principal
  const [lineStyleModalVisible, setLineStyleModalVisible] = useState(false);

  const [lineType, setLineType] = useState('solid'); // 'solid', 'dotted', 'wavy'
  const [dotSize, setDotSize] = useState(2);
  const [dotSpacing, setDotSpacing] = useState(4);
  const [pendingLineAction, setPendingLineAction] = useState(null);
  const [panelVisible] = useState(true);
  const [carouselModalVisible, setCarouselModalVisible] = useState(false);

  const hasSidebar = !!matchSheetPlayers;
  const showPlayersSidebar = hasSidebar && !setPieceMode;
  const isSetPieceOrStrategy = !!(isStrategyMode || setPieceMode || hasSidebar);
  const sidebarWidth = showPlayersSidebar ? (isMobile ? 180 : 280) : 0;
  const panelAnim = useRef(new Animated.Value(0)).current;

  // Ajusta el panel segn el tamao de la pantalla

  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: panelVisible ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [panelVisible]);

  const iconCounters = useRef({});
  paletteIcons.forEach((icon) => {
    if (!iconCounters.current[icon.id]) iconCounters.current[icon.id] = icon.number || 1;
  });

  // Contador incremental de z-index para ordenar elementos por orden de creacin
  const zIndexCounter = useRef(0);
  const getNextZIndex = useCallback((type) => {
    zIndexCounter.current += 1;
    return getZIndexBaseForType(type) + zIndexCounter.current;
  }, []);

  const dragStart = useRef({});

  const aspect = getAspectForView(viewMode);

  const referenceWidth = REFERENCE_WIDTH;
  const referenceHeight = REFERENCE_WIDTH * aspect;

  // Calcular tamao ptimo para el campo (memoizado para estabilidad de referencias)
  const { imageWidth, imageHeight } = useMemo(() => {
    let w, h;
    if (isMobile) {
      const sideMargin = 4;
      const usableWidth =
        SCREEN_WIDTH - sideMargin * 2 - sidebarWidth - safeArea.left - safeArea.right;
      const usableHeight = SCREEN_HEIGHT - 12 - safeArea.top - safeArea.bottom;

      w = usableWidth;
      h = w * aspect;

      if (h > usableHeight) {
        h = usableHeight;
        w = h / aspect;
      }
    } else {
      const headerHeight = Platform.OS === 'ios' ? 54 : 44;
      const verticalMargin = Platform.OS === 'ios' ? 16 + headerHeight : headerHeight;
      const horizontalMargin = 16;
      const PANEL_HEIGHT = 150;

      const maxFieldHeight =
        SCREEN_HEIGHT - verticalMargin - PANEL_HEIGHT - 8 - safeArea.top - safeArea.bottom;
      const maxFieldWidth =
        SCREEN_WIDTH - horizontalMargin * 2 - sidebarWidth - safeArea.left - safeArea.right;

      w = maxFieldWidth;
      h = w * aspect;

      if (h > maxFieldHeight) {
        h = maxFieldHeight;
        w = h / aspect;
      }
    }
    return { imageWidth: w, imageHeight: h };
  }, [
    isMobile,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    aspect,
    videoRecorderVisible,
    sidebarWidth,
    safeArea.top,
    safeArea.right,
    safeArea.bottom,
    safeArea.left,
  ]);

  const activeBallTrajectoryPrompts = useMemo(() => {
    if (!videoRecorderVisible) return [];
    return getKeyframeMovedBalls(videoKeyframes).filter(
      (prompt) =>
        !dismissedBallTrajectoryPrompts[prompt.key] &&
        (!isEditingVideo || prompt.segmentIndex >= Math.max(0, loadedEditVideoKeyframeCount - 1)),
    );
  }, [
    videoRecorderVisible,
    isEditingVideo,
    loadedEditVideoKeyframeCount,
    videoKeyframes,
    dismissedBallTrajectoryPrompts,
  ]);

  const updateSegmentBallTrajectory = useCallback((segmentIndex, ballId, trajectory, promptKey) => {
    setVideoKeyframes((prev) =>
      prev.map((kf, index) => {
        if (index !== segmentIndex) return kf;
        const segmentBalls = (kf.elements || []).filter((el) => el.type === 'ball');
        return {
          ...kf,
          ballTrajectoryById: { ...(kf.ballTrajectoryById || {}), [ballId]: trajectory },
          ballTrajectoryType:
            segmentBalls.length <= 1 ? trajectory : kf.ballTrajectoryType || 'ground',
        };
      }),
    );
    if (promptKey) {
      setDismissedBallTrajectoryPrompts((prev) => ({ ...prev, [promptKey]: true }));
    }
  }, []);

  // Helper: calcular el centro visible del campo seg�n el viewMode activo
  const getVisibleCenterRatio = useCallback(() => {
    return displayToRatio(imageWidth / 2, imageHeight / 2, viewMode, imageWidth, imageHeight);
  }, [viewMode, imageWidth, imageHeight]);

  const getNextAutoPlacementRatio = useCallback(
    (type) => {
      const center = getVisibleCenterRatio();
      const existing = actualClonesRef.current || [];
      const spacing = type === 'staff' || type === 'player' ? 0.075 : 0.06;
      const candidates = [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: -1, y: 1 },
        { x: 1, y: 1 },
        { x: -2, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: -2 },
        { x: 0, y: 2 },
      ];

      for (const candidate of candidates) {
        const point = {
          x: clampBoardRatio(center.x + candidate.x * spacing),
          y: clampBoardRatio(center.y + candidate.y * spacing),
        };
        const isFree = !existing.some((clone) => {
          if (clone.xRatio === undefined || clone.yRatio === undefined) return false;
          const dx = clone.xRatio - point.x;
          const dy = clone.yRatio - point.y;
          return Math.sqrt(dx * dx + dy * dy) < spacing * 0.72;
        });
        if (isFree) return point;
      }

      return {
        x: clampBoardRatio(center.x + (Math.random() - 0.5) * spacing * 2.5),
        y: clampBoardRatio(center.y + (Math.random() - 0.5) * spacing * 2.5),
      };
    },
    [getVisibleCenterRatio],
  );

  const activatePlacementMode = useCallback(
    (placementAction) => {
      setSelectedCloneId(null);
      clearMultiSelect();
      exitDrawingMode();
      setEraserMode(false);
      setPendingLineAction(null);
      setPendingPlacementAction(placementAction);
    },
    [clearMultiSelect, exitDrawingMode],
  );

  const finishPlacementAction = useCallback(
    (placementAction, ratioPoint) => {
      if (!placementAction) return;
      const shouldAutoNumber =
        placementAction.kind === 'palette-player' &&
        placementAction.paletteIconId &&
        !placementAction.clone?.isGoalkeeper;
      const currentNumber = shouldAutoNumber
        ? iconCounters.current[placementAction.paletteIconId] || placementAction.number || 1
        : placementAction.clone.number;
      const clone = {
        ...placementAction.clone,
        id: `${placementAction.clone.idBase || placementAction.clone.type}-clone-${Date.now()}-${Math.random()}`,
        xRatio: ratioPoint.x,
        yRatio: ratioPoint.y,
        zIndex: getNextZIndex(placementAction.clone.type),
        number: currentNumber,
      };
      delete clone.idBase;

      setClones((prev) => [clone, ...prev]);

      if (shouldAutoNumber) {
        const nextNumber = currentNumber + 1;
        iconCounters.current[placementAction.paletteIconId] = nextNumber;
        setPaletteIcons((prev) =>
          prev.map((ic) =>
            ic.id === placementAction.paletteIconId ? { ...ic, number: nextNumber } : ic,
          ),
        );
      }

      if (placementAction.kind === 'team-player' && placementAction.playerId) {
        setAvailablePlayers((prev) => prev.filter((p) => p.uniqueId !== placementAction.playerId));
        setSelectedPlayerIds((prev) =>
          prev.includes(placementAction.playerId) ? prev : [...prev, placementAction.playerId],
        );
      }

      if (placementAction.kind === 'staff' && placementAction.staffRoleId) {
        setSelectedStaffIds((prev) =>
          prev.includes(placementAction.staffRoleId)
            ? prev
            : [...prev, placementAction.staffRoleId],
        );
      }

      if (placementAction.repeat) {
        setPendingPlacementAction({
          ...placementAction,
          number:
            shouldAutoNumber && placementAction.paletteIconId
              ? iconCounters.current[placementAction.paletteIconId]
              : placementAction.number,
          clone: {
            ...placementAction.clone,
            number:
              shouldAutoNumber && placementAction.paletteIconId
                ? iconCounters.current[placementAction.paletteIconId]
                : placementAction.clone.number,
          },
        });
      } else {
        setPendingPlacementAction(null);
      }
      if (placementAction.kind === 'free-text') {
        setTimeout(() => {
          setSelectedCloneId(clone.id);
          setTextEditPanel({ visible: true, icon: clone, isNew: true });
        }, 80);
      }
      if (saveClonesHistory) setTimeout(() => saveClonesHistory(), 0);
    },
    [getNextZIndex, saveClonesHistory],
  );

  // 3. Reemplazar la funci�n handleIconPalettePress con esta versi�n
  const handleIconPalettePress = useCallback(
    (icon, paletteIndex) => {
      // Deseleccionar cualquier elemento seleccionado
      setSelectedCloneId(null);
      clearMultiSelect();

      // Manejar el bot�n de jugadores del equipo
      if (icon.type === 'team-players') {
        exitDrawingMode();
        setPendingLineAction(null);
        setPendingPlacementAction(null);
        setShowingPlayersPalette(true);
        setShowingMaterialsPalette(false);
        setShowingStaffPalette(false);
        return;
      }

      // Manejar el bot�n de cuerpo t�cnico
      if (icon.type === 'coaching-staff') {
        exitDrawingMode();
        setPendingLineAction(null);
        setPendingPlacementAction(null);
        setShowingStaffPalette(true);
        setShowingPlayersPalette(false);
        setShowingMaterialsPalette(false);
        return;
      }

      // Manejar el bot�n de materiales
      if (icon.type === 'materials-button') {
        exitDrawingMode();
        setPendingLineAction(null);
        setPendingPlacementAction(null);
        setShowingMaterialsPalette(true);
        setShowingPlayersPalette(false);
        setShowingStaffPalette(false);
        return;
      }

      // Manejar el bot�n de figura personalizada de manera especial
      if (icon.type === 'custom-shape-button') {
        if (drawingCustomShape && pendingLineAction?.paletteIndex === paletteIndex) {
          handleDeselectDrawingTool();
          setPendingLineAction(null);
          return;
        }
        setPendingLineAction({
          type: 'custom-shape',
          paletteIndex: paletteIndex,
          icon: { ...icon, type: 'custom-shape-button' },
        });
        // Iniciar modo de dibujo directamente desde la paleta (NO cerrar la paleta)
        setDrawingCustomShape(true);
        setDrawingStraightArrow(false);
        setDrawingStraightLine(false);
        setDrawingCurveLine(false);
        setDrawingCurveArrow(false);
        setDrawingCircle(false);
        setDrawingRectangle(false);
        setEraserMode(false);
        setPendingPlacementAction(null);
        return;
      }

      // Iniciar modo de dibujo directamente desde la paleta para l�neas, flechas y formas (no abrir modal de estilo)
      if (
        icon.type === 'straight-arrow' ||
        icon.type === 'straight-line' ||
        icon.type === 'curve-arrow' ||
        icon.type === 'curve-line' ||
        icon.type === 'circle' ||
        icon.type === 'rectangle'
      ) {
        const sameDrawingTool =
          pendingLineAction?.type === icon.type && pendingLineAction?.paletteIndex === paletteIndex;
        const isSameToolActive =
          (icon.type === 'straight-arrow' && drawingStraightArrow) ||
          (icon.type === 'straight-line' && drawingStraightLine) ||
          (icon.type === 'curve-line' && drawingCurveLine) ||
          (icon.type === 'curve-arrow' && drawingCurveArrow) ||
          (icon.type === 'circle' && drawingCircle) ||
          (icon.type === 'rectangle' && drawingRectangle);

        if (sameDrawingTool && isSameToolActive) {
          handleDeselectDrawingTool();
          setPendingLineAction(null);
          return;
        }

        setPendingLineAction({
          type: icon.type,
          paletteIndex: paletteIndex,
          icon: icon,
        });

        // Cargar Configuraci�n guardada en la paleta (si existe)
        const pIcon = paletteIcons[paletteIndex] || icon || {};
        setLineType(pIcon.lineType ? pIcon.lineType : 'solid');
        setDotSize(pIcon.dotSize !== undefined && pIcon.dotSize !== null ? pIcon.dotSize : 2);
        setDotSpacing(
          pIcon.dotSpacing !== undefined && pIcon.dotSpacing !== null ? pIcon.dotSpacing : 4,
        );
        setArrowThickness(
          pIcon.thickness !== undefined && pIcon.thickness !== null
            ? pIcon.thickness
            : pIcon.thickness || 2,
        );
        // Si la paleta tiene fillColor/lineType/dotSize/dotSpacing, guardarlas en pending para shapes
        setPendingLineAction((prev) =>
          prev
            ? {
                ...prev,
                icon: {
                  ...prev.icon,
                  fillColor: pIcon.fillColor !== undefined ? pIcon.fillColor : prev.icon?.fillColor,
                  lineType: pIcon.lineType ? pIcon.lineType : prev.icon?.lineType,
                  dotSize:
                    pIcon.dotSize !== undefined && pIcon.dotSize !== null
                      ? pIcon.dotSize
                      : prev.icon?.dotSize,
                  dotSpacing:
                    pIcon.dotSpacing !== undefined && pIcon.dotSpacing !== null
                      ? pIcon.dotSpacing
                      : prev.icon?.dotSpacing,
                },
              }
            : {
                type: icon.type,
                paletteIndex,
                icon: {
                  ...icon,
                  fillColor: pIcon.fillColor,
                  lineType: pIcon.lineType,
                  dotSize: pIcon.dotSize,
                  dotSpacing: pIcon.dotSpacing,
                },
              },
        );

        // NO cerrar la paleta - el usuario quiere mantenerla abierta
        // Desactivar TODOS los modos de dibujo primero, luego activar el correcto
        setDrawingStraightArrow(false);
        setDrawingStraightLine(false);
        setDrawingCurveLine(false);
        setDrawingCurveArrow(false);
        setDrawingCircle(false);
        setDrawingRectangle(false);
        setDrawingCustomShape(false);
        setEraserMode(false);
        setPendingPlacementAction(null);

        // Activar solo el modo de dibujo correspondiente
        if (icon.type === 'straight-arrow') {
          setDrawingStraightArrow(true);
        } else if (icon.type === 'straight-line') {
          setDrawingStraightLine(true);
        } else if (icon.type === 'curve-line') {
          setDrawingCurveLine(true);
        } else if (icon.type === 'curve-arrow') {
          setDrawingCurveArrow(true);
        } else if (icon.type === 'circle') {
          setDrawingCircle(true);
        } else if (icon.type === 'rectangle') {
          setDrawingRectangle(true);
        }
        return;
      }

      if (
        (pendingPlacementAction?.kind === 'palette-icon' ||
          pendingPlacementAction?.kind === 'palette-player') &&
        pendingPlacementAction?.paletteIndex === paletteIndex &&
        pendingPlacementAction?.clone?.type === icon.type
      ) {
        setPendingPlacementAction(null);
        return;
      }

      // Para otros tipos de iconos (jugadores, conos, etc.)
      let number = undefined;
      if (icon.type === 'player') {
        number = iconCounters.current[icon.id];
      }

      // Usar la Configuraci�n actual de la paleta (color, tama�o, thickness)
      // Obtener el icono actualizado de la paleta para usar su Configuraci�n m�s reciente
      const currentPaletteIcon = paletteIcons[paletteIndex] || icon || {};

      activatePlacementMode({
        kind: icon.type === 'player' ? 'palette-player' : 'palette-icon',
        paletteIndex,
        paletteIconId: icon.id,
        number,
        repeat: true,
        clone: {
          ...icon,
          idBase: icon.id,
          number,
          rotation: 0,
          size: currentPaletteIcon.size || standardSize, // Usar el tama�o actual de la paleta
          color: isValidHexColor(currentPaletteIcon.color) ? currentPaletteIcon.color : '#000000', // Color actual de la paleta
          paletteIndex,
          thickness: currentPaletteIcon.thickness || icon.thickness, // Thickness actual de la paleta
          fillColor: currentPaletteIcon.fillColor || icon.fillColor || 'transparent',
          numberColor: currentPaletteIcon.numberColor || icon.numberColor || '#ffffff',
          backgroundColor: currentPaletteIcon.backgroundColor || icon.backgroundColor,
          isNeutral: currentPaletteIcon.isNeutral === true || icon.isNeutral === true,
          shape: currentPaletteIcon.shape || icon.shape || 'circle',
          hasStripes:
            currentPaletteIcon.hasStripes !== undefined
              ? currentPaletteIcon.hasStripes
              : icon.hasStripes,
          hasBib: currentPaletteIcon.hasBib !== undefined ? currentPaletteIcon.hasBib : icon.hasBib,
          bibColor:
            currentPaletteIcon.bibColor !== undefined ? currentPaletteIcon.bibColor : icon.bibColor,
          stripeColor: currentPaletteIcon.stripeColor || icon.stripeColor || '#ffffff',
          goalkeeperStripeColor:
            currentPaletteIcon.goalkeeperStripeColor || icon.goalkeeperStripeColor || '#ffffff',
          zIndex: getNextZIndex(icon.type),
        },
      });

      // Al a�adir un elemento, quitar multi-select y salir de cualquier modo de dibujo
    },
    [
      paletteIcons,
      standardSize,
      iconCounters,
      clearMultiSelect,
      exitDrawingMode,
      getNextZIndex,
      activatePlacementMode,
      handleDeselectDrawingTool,
      pendingLineAction,
      pendingPlacementAction,
      drawingStraightArrow,
      drawingStraightLine,
      drawingCurveLine,
      drawingCurveArrow,
      drawingCircle,
      drawingRectangle,
      drawingCustomShape,
    ],
  );

  // Funcin para manejar la seleccin de un jugador del equipo
  const handleSelectPlayer = (player, cloneIdOverride = null) => {
    if (assigningCloneId || cloneIdOverride) {
      const targetCloneId = cloneIdOverride || assigningCloneId;
      setAssigningCloneId(null);
      setPlayersModalVisible(false);

      const targetClone = clones.find((c) => c.id === targetCloneId);
      if (!targetClone) return;

      const prevPlayer = targetClone.playerData;
      const prevPlayerUniqueId = prevPlayer
        ? prevPlayer.uniqueId || `player-${prevPlayer._id || prevPlayer.id}`
        : null;
      const defaultNumber =
        targetClone.defaultSetPieceNumber ?? targetClone.originalNumber ?? targetClone.number ?? '';

      if (!player) {
        setSelectedPlayerIds((prev) =>
          prevPlayerUniqueId ? prev.filter((id) => id !== prevPlayerUniqueId) : prev,
        );
        setClones((prev) =>
          prev.map((c) =>
            c.id === targetCloneId
              ? {
                  ...c,
                  number: c.defaultSetPieceNumber ?? c.originalNumber ?? defaultNumber,
                  playerData: undefined,
                  photoUrl: undefined,
                  preserveVisualStyle: true,
                  displayLabel: c.defaultDisplayLabel,
                  _lastUpdate: Date.now(),
                }
              : c,
          ),
        );
        setVideoKeyframes((prevKeyframes) => {
          if (!prevKeyframes || prevKeyframes.length === 0) return prevKeyframes;
          return prevKeyframes.map((kf) => ({
            ...kf,
            elements: (kf.elements || []).map((elem) =>
              elem.id === targetCloneId
                ? {
                    ...elem,
                    number: elem.defaultSetPieceNumber ?? elem.originalNumber ?? defaultNumber,
                    playerData: undefined,
                    photoUrl: undefined,
                    preserveVisualStyle: true,
                    displayLabel: elem.defaultDisplayLabel,
                    _lastUpdate: Date.now(),
                  }
                : elem,
            ),
          }));
        });
        return;
      }

      setSelectedPlayerIds((prev) => {
        let filtered = prev;
        if (prevPlayerUniqueId) {
          filtered = filtered.filter((id) => id !== prevPlayerUniqueId);
        }
        if (!filtered.includes(player.uniqueId)) {
          filtered = [...filtered, player.uniqueId];
        }
        return filtered;
      });

      const updatedClones = clones.map((c) => {
        if (c.id === targetCloneId) {
          const number = player.dorsal || player.number || '';
          const keepsGoalkeeperStyle =
            c.isGoalkeeper ||
            c.playerData?.posicion === 'portero' ||
            c.playerData?.position === 'goalkeeper' ||
            c.playerData?.demarcacion === 'POR';
          return {
            ...c,
            defaultSetPieceNumber: c.defaultSetPieceNumber ?? c.number,
            defaultDisplayLabel: c.defaultDisplayLabel ?? c.displayLabel,
            number,
            playerData: { ...player, uniqueId: player.uniqueId },
            photoUrl: player.foto ? cdnUrl(player.foto) : c.photoUrl,
            showPhotos: teamPlayerStyle.showPhotos || Boolean(player.foto),
            preserveVisualStyle: true,
            isGoalkeeper: keepsGoalkeeperStyle === true,
            displayLabel:
              c.displayLabel !== undefined && player.posicion
                ? getPositionAbbreviation(player.posicion)
                : c.displayLabel,
            _lastUpdate: Date.now(),
          };
        }
        return c;
      });
      setClones(updatedClones);

      setVideoKeyframes((prevKeyframes) => {
        if (!prevKeyframes || prevKeyframes.length === 0) return prevKeyframes;
        return prevKeyframes.map((kf) => {
          if (!kf.elements) return kf;
          return {
            ...kf,
            elements: kf.elements.map((elem) => {
              if (elem.id === targetCloneId) {
                const number = player.dorsal || player.number || '';
                const keepsGoalkeeperStyle =
                  elem.isGoalkeeper ||
                  elem.playerData?.posicion === 'portero' ||
                  elem.playerData?.position === 'goalkeeper' ||
                  elem.playerData?.demarcacion === 'POR';
                return {
                  ...elem,
                  defaultSetPieceNumber: elem.defaultSetPieceNumber ?? elem.number,
                  defaultDisplayLabel: elem.defaultDisplayLabel ?? elem.displayLabel,
                  number,
                  playerData: {
                    nombre: getPlayerFullName(player),
                    fullName: getPlayerFullName(player),
                    demarcacion: player.demarcacion,
                    posicion: player.posicion,
                    foto: player.foto,
                    uniqueId: player.uniqueId,
                  },
                  photoUrl: player.foto ? cdnUrl(player.foto) : elem.photoUrl,
                  showPhotos: teamPlayerStyle.showPhotos || Boolean(player.foto),
                  preserveVisualStyle: true,
                  isGoalkeeper: keepsGoalkeeperStyle === true,
                  displayLabel:
                    elem.displayLabel !== undefined && player.posicion
                      ? getPositionAbbreviation(player.posicion)
                      : elem.displayLabel,
                  _lastUpdate: Date.now(),
                };
              }
              return elem;
            }),
          };
        });
      });

      return;
    }

    // Determinar la etiqueta a mostrar segn la Configuracin
    let displayLabel = undefined;
    if (teamPlayerStyle.showPosition && player.posicion) {
      // Obtener abreviatura de posicin
      const positionAbbreviation = getPositionAbbreviation(player.posicion);
      displayLabel = positionAbbreviation;
    }

    setSelectedCloneId(null);
    clearMultiSelect();
    exitDrawingMode();
    setEraserMode(false);
    setPendingLineAction(null);
    setPendingPlacementAction(null);

    finishPlacementAction(
      {
        kind: 'team-player',
        playerId: player.uniqueId,
        clone: {
          idBase: `player-${player.uniqueId}`,
          type: 'player',
          number: player.dorsal || player.number,
          rotation: 0,
          size: teamPlayerStyle.size || standardSize,
          color:
            player.posicion &&
            ['portero', 'goalkeeper', 'gk', 'pt'].includes(player.posicion.toLowerCase()) &&
            teamPlayerStyle.differentiateGoalkeeper
              ? teamPlayerStyle.goalkeeperColor || '#ff4a4a'
              : teamPlayerStyle.color || '#2176ff',
          numberColor: teamPlayerStyle.numberColor || '#ffffff',
          textColor: teamPlayerStyle.textColor || '#000000',
          textBackgroundColor: teamPlayerStyle.textBackgroundColor || '#ffffff',
          shape: teamPlayerStyle.shape || 'circle',
          hasStripes: teamPlayerStyle.hasStripes === true,
          hasBib: teamPlayerStyle.hasBib === true,
          bibColor: teamPlayerStyle.bibColor || NEUTRAL_PLAYER_COLORS.bib,
          stripeColor: teamPlayerStyle.stripeColor || '#ffffff',
          paletteIndex: 0, // No importa mucho
          thickness: 1,
          playerData: player, // Guardar los datos del jugador
          isGoalkeeper:
            player.posicion &&
            ['portero', 'goalkeeper', 'gk', 'pt'].includes(player.posicion.toLowerCase()),
          goalkeeperStripeColor: teamPlayerStyle.goalkeeperStripeColor || '#ffffff',
          displayLabel: displayLabel, // Etiqueta de posici�n si est� habilitada
          zIndex: getNextZIndex('player'),
        },
      },
      getNextAutoPlacementRatio('player'),
    );
  };

  // Funci�n para manejar la selecci�n de un material de entrenamiento
  const handleUnassignPlayerClone = (cloneId) => {
    handleSelectPlayer(null, cloneId);
  };

  const handleSelectMaterial = useCallback(
    (material) => {
      if (
        pendingPlacementAction?.kind === 'material' &&
        pendingPlacementAction?.materialType === material.type
      ) {
        setPendingPlacementAction(null);
        return;
      }

      // Obtener Configuraci�n personalizada del material
      const customConfig = materialsConfig[material.type] || {};

      activatePlacementMode({
        kind: 'material',
        materialType: material.type,
        repeat: true,
        clone: {
          idBase: material.type,
          type: material.type,
          rotation: 0,
          size: customConfig.size || material.size || standardSize,
          color: customConfig.color || material.color || '#FF6B00',
          paletteIndex: 0,
          thickness: 1,
          rotatable: material.rotatable || false,
          zIndex: getNextZIndex(material.type),
        },
      });
    },
    [standardSize, materialsConfig, activatePlacementMode, getNextZIndex, pendingPlacementAction],
  );

  // Funci�n para manejar la selecci�n de un miembro del cuerpo t�cnico
  const handleSelectStaff = useCallback(
    (staffRole) => {
      if (
        pendingPlacementAction?.kind === 'staff' &&
        pendingPlacementAction?.staffRoleId === staffRole.id
      ) {
        setPendingPlacementAction(null);
        return;
      }

      setSelectedCloneId(null);
      clearMultiSelect();
      exitDrawingMode();
      setEraserMode(false);
      setPendingLineAction(null);
      setPendingPlacementAction(null);

      finishPlacementAction(
        {
          kind: 'staff',
          staffRoleId: staffRole.id,
          clone: {
            idBase: `staff-${staffRole.id}`,
            type: 'staff',
            staffRole: staffRole.id,
            rotation: 0,
            size: standardSize,
            color: '#333333',
            numberColor: '#ffffff',
            displayLabel: staffRole.code, // Mostrar el c�digo (E1, E2, PF, etc)
            staffLabel: staffRole.label, // Etiqueta completa para referencia
            paletteIndex: 0,
            thickness: 1,
            zIndex: getNextZIndex('staff'),
          },
        },
        getNextAutoPlacementRatio('staff'),
      );

      // A�adir a la lista de staff seleccionados (para que desaparezca de la paleta)
    },
    [
      standardSize,
      clearMultiSelect,
      exitDrawingMode,
      finishPlacementAction,
      getNextAutoPlacementRatio,
      getNextZIndex,
      pendingPlacementAction,
    ],
  );

  // Manejador para editar material de la paleta (long press)
  const handleLongPressMaterial = useCallback(
    (material, idx) => {
      // Crear un objeto icon ficticio para abrir el panel de edici�n
      const customConfig = materialsConfig[material.type] || {};
      const fakeIcon = {
        id: `palette-material-${material.type}`,
        type: material.type,
        color: customConfig.color || material.color,
        size: customConfig.size || material.size,
        isMaterialPalette: true, // Marca especial para indicar que es de la paleta de materiales
        materialType: material.type,
      };
      setEditingIcon(fakeIcon);
      setLeftPanelVisible(true);
    },
    [materialsConfig],
  );

  // Manejador para actualizar Configuraci�n de materiales desde el panel de edici�n
  const handleMaterialsConfigUpdate = useCallback((materialType, newConfig) => {
    setMaterialsConfig((prev) => ({
      ...prev,
      [materialType]: {
        ...(prev[materialType] || {}),
        ...newConfig,
      },
    }));

    setPendingPlacementAction((prev) => {
      if (!prev || prev.kind !== 'material' || prev.materialType !== materialType) return prev;
      return {
        ...prev,
        clone: {
          ...prev.clone,
          color: newConfig.color ?? prev.clone?.color,
          size: newConfig.size ?? prev.clone?.size,
          _lastUpdate: Date.now(),
        },
      };
    });
  }, []);

  // Manejador para editar jugador de la paleta (long press)
  const handleLongPressTeamPlayer = (player) => {
    // Crear un objeto icon ficticio para abrir el panel de edici�n
    const fakeIcon = {
      id: `palette-player-${player.uniqueId}`,
      type: 'player',
      color: teamPlayerStyle.color,
      size: teamPlayerStyle.size,
      number: player.dorsal || player.number,
      numberColor: teamPlayerStyle.numberColor || '#ffffff',
      textColor: teamPlayerStyle.textColor || '#000000',
      textBackgroundColor: teamPlayerStyle.textBackgroundColor || '#ffffff',
      shape: teamPlayerStyle.shape || 'circle',
      hasStripes: teamPlayerStyle.hasStripes === true,
      hasBib: teamPlayerStyle.hasBib === true,
      bibColor: teamPlayerStyle.bibColor || NEUTRAL_PLAYER_COLORS.bib,
      stripeColor: teamPlayerStyle.stripeColor || '#ffffff',
      playerData: player,
      isPalettePlayer: true, // Marca especial para indicar que es de la paleta
    };
    setEditingIcon(fakeIcon);
    setLeftPanelVisible(true);
  };

  // 4. A�adir el manejador para aplicar el estilo de l�nea seleccionado
  const handleLineStyleSelect = ({
    lineType,
    dotSize,
    dotSpacing,
    color,
    thickness,
    fillColor,
  }) => {
    if (!pendingLineAction) return;

    const { type, icon, paletteIndex } = pendingLineAction;

    // Actualizar solo el estilo global si el tipo de elemento es uno que utiliza la Configuraci�n global
    const GLOBAL_STYLE_TYPES = [
      'straight-arrow',
      'straight-line',
      'curve-arrow',
      'curve-line',
      'circle',
      'rectangle',
    ];
    if (GLOBAL_STYLE_TYPES.includes(type)) {
      setLineType(lineType);
      setDotSize(dotSize);
      setDotSpacing(dotSpacing);
    }

    // Actualizar el color/grosor y tipo de trazo en la paleta para los nuevos elementos
    if (paletteIndex !== undefined) {
      setPaletteIcons((prev) =>
        prev.map((ic, idx) => {
          if (idx === paletteIndex) {
            return {
              ...ic,
              color: color || ic.color,
              thickness: thickness !== undefined && thickness !== null ? thickness : ic.thickness,
              fillColor:
                fillColor !== undefined && fillColor !== null
                  ? fillColor
                  : ic.fillColor || 'transparent',
              // A�adir tipo de trazo y par�metros punteado
              lineType: lineType || ic.lineType || 'solid',
              dotSize: dotSize !== undefined && dotSize !== null ? dotSize : ic.dotSize,
              dotSpacing:
                dotSpacing !== undefined && dotSpacing !== null ? dotSpacing : ic.dotSpacing,
            };
          }
          return ic;
        }),
      );
    }

    // Guardar el grosor para usar al dibujar
    setArrowThickness(
      thickness !== undefined && thickness !== null ? thickness : parseInt(icon.thickness) || 2,
    );

    // Guardar la Configuraci�n de estilo en pendingLineAction para usarla despu�s
    setPendingLineAction((prev) =>
      prev
        ? {
            ...prev,
            icon: {
              ...prev.icon,
              color: color || prev.icon?.color,
              thickness:
                thickness !== undefined && thickness !== null ? thickness : prev.icon?.thickness,
              fillColor:
                fillColor !== undefined && fillColor !== null
                  ? fillColor
                  : prev.icon?.fillColor || 'transparent',
              lineType: lineType || prev.icon?.lineType || 'solid',
              dotSize: dotSize !== undefined && dotSize !== null ? dotSize : prev.icon?.dotSize,
              dotSpacing:
                dotSpacing !== undefined && dotSpacing !== null
                  ? dotSpacing
                  : prev.icon?.dotSpacing,
            },
          }
        : null,
    );

    // Cerrar la paleta de elementos
    setPaletteVisible(false);

    // Activar el modo de dibujo correspondiente y guardar la Configuraci�n
    if (type === 'straight-arrow') {
      setDrawingStraightArrow(true);
      setDrawingStraightLine(false);
      setDrawingCurveLine(false);
      setDrawingCurveArrow(false);
      setDrawingCircle(false);
      setDrawingRectangle(false);
      setDrawingCustomShape(false);
    } else if (type === 'straight-line') {
      setDrawingStraightLine(true);
      setDrawingStraightArrow(false);
      setDrawingCurveLine(false);
      setDrawingCurveArrow(false);
      setDrawingCircle(false);
      setDrawingRectangle(false);
      setDrawingCustomShape(false);
    } else if (type === 'curve-line') {
      setDrawingCurveLine(true);
      setDrawingStraightLine(false);
      setDrawingStraightArrow(false);
      setDrawingCurveArrow(false);
      setDrawingCircle(false);
      setDrawingRectangle(false);
      setDrawingCustomShape(false);
    } else if (type === 'curve-arrow') {
      setDrawingCurveArrow(true);
      setDrawingCurveLine(false);
      setDrawingStraightLine(false);
      setDrawingStraightArrow(false);
      setDrawingCircle(false);
      setDrawingRectangle(false);
      setDrawingCustomShape(false);
    } else if (type === 'circle') {
      setDrawingCircle(true);
      setDrawingRectangle(false);
      setDrawingCurveArrow(false);
      setDrawingCurveLine(false);
      setDrawingStraightLine(false);
      setDrawingStraightArrow(false);
      setDrawingCustomShape(false);
    } else if (type === 'rectangle') {
      setDrawingRectangle(true);
      setDrawingCircle(false);
      setDrawingCurveArrow(false);
      setDrawingCurveLine(false);
      setDrawingStraightLine(false);
      setDrawingStraightArrow(false);
      setDrawingCustomShape(false);
    } else if (type === 'custom-shape') {
      setDrawingCustomShape(true);
      setDrawingCircle(false);
      setDrawingRectangle(false);
      setDrawingCurveArrow(false);
      setDrawingCurveLine(false);
      setDrawingStraightLine(false);
      setDrawingStraightArrow(false);
      setCustomShapePoints([]);
      setShowCloseCircle(false);

      setInstructionMessage({
        visible: true,
        text: 'Toca para a�adir puntos y crear tu figura',
        subtext: 'Cuando tengas 3 o m�s puntos, toca el c�rculo inicial para cerrar',
      });

      setTimeout(() => {
        setInstructionMessage(null);
      }, 5000);
    }

    // No anulamos pendingLineAction aqu�, se usa para obtener las propiedades al crear las figuras
  };

  const handleCustomShapeStart = useCallback(
    (e) => {
      if (!drawingCustomShape) return;

      const { locationX, locationY } = e.nativeEvent;
      const newPoint = displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight);

      if (customShapePoints.length >= 3) {
        const firstPoint = customShapePoints[0];
        const { x: firstPointX, y: firstPointY } = ratioToDisplay(
          firstPoint.x,
          firstPoint.y,
          viewMode,
          imageWidth,
          imageHeight,
        );
        const distance = Math.sqrt(
          Math.pow(locationX - firstPointX, 2) + Math.pow(locationY - firstPointY, 2),
        );

        if (distance <= 15) {
          const uniqueId = `custom-shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Obtener Configuraci�n de la paleta
          const paletteIcon = paletteIcons.find((ic) => ic.type === 'custom-shape-button');
          const paletteIndex = paletteIcons.findIndex((ic) => ic.type === 'custom-shape-button');

          // Usar valores de la paleta de custom-shape en lugar de los globales
          const shapeLineType =
            pendingLineAction?.icon?.lineType || paletteIcon?.lineType || 'solid';
          const shapeDotSize = pendingLineAction?.icon?.dotSize ?? paletteIcon?.dotSize ?? 2;
          const shapeDotSpacing =
            pendingLineAction?.icon?.dotSpacing ?? paletteIcon?.dotSpacing ?? 4;

          const newShape = {
            id: uniqueId,
            type: 'custom-shape',
            color: pendingLineAction?.icon?.color || paletteIcon?.color || '#000000',
            thickness: pendingLineAction?.icon?.thickness || paletteIcon?.thickness || 5,
            lineType: shapeLineType,
            dotSize: shapeDotSize,
            dotSpacing: shapeDotSpacing,
            fillColor:
              pendingLineAction?.icon?.fillColor || paletteIcon?.fillColor || 'transparent',
            size: standardSize, // Usar standardSize directamente
            points: [...customShapePoints],
            imageWidth,
            imageHeight,
            xRatio: 0.5,
            yRatio: 0.5,
            isCustomShapeComplete: true,
            paletteIndex: paletteIndex >= 0 ? paletteIndex : undefined,
            zIndex: getNextZIndex('custom-shape'),
          };

          setClones((prev) => [newShape, ...prev]);

          setCustomShapePoints([]);
          setShowCloseCircle(false);
          setDrawingCustomShape(false);
          setPreviewPoint(null);
          setIsPreviewingPoint(false);
          setPendingLineAction(null);
          return;
        }
      }

      setPreviewPoint(newPoint);
      setIsPreviewingPoint(true);
    },
    [
      drawingCustomShape,
      customShapePoints,
      viewMode,
      imageWidth,
      imageHeight,
      paletteIcons,
      pendingLineAction,
      lineType,
      dotSize,
      dotSpacing,
      standardSize,
      getNextZIndex,
    ],
  );

  const handleCustomShapeMove = useCallback(
    (e) => {
      if (!drawingCustomShape || !isPreviewingPoint) return;

      const { locationX, locationY } = e.nativeEvent;
      const newPoint = displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight);

      setPreviewPoint(newPoint);
    },
    [drawingCustomShape, isPreviewingPoint, viewMode, imageWidth, imageHeight],
  );

  const handleCustomShapeEnd = useCallback(
    (e) => {
      if (!drawingCustomShape || !isPreviewingPoint || !previewPoint) return;

      setCustomShapePoints((prev) => {
        const newPoints = [...prev, previewPoint];
        if (newPoints.length >= 3) {
          setShowCloseCircle(true);
        }
        return newPoints;
      });

      setPreviewPoint(null);
      setIsPreviewingPoint(false);
    },
    [drawingCustomShape, isPreviewingPoint, previewPoint],
  );

  const handleGuardarGrafico = async () => {
    setSelectedCloneId(null);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // En modo sandbox, abrir directamente el grabador de video sin guardar
    if (sandbox) {
      setVideoRecorderVisible(true);
      return;
    }

    if (canvasRef.current) {
      try {
        const savedClones = clones.map((clone) =>
          clone?.type === 'player'
            ? {
                ...clone,
                playersWithNumber,
                preserveVisualStyle: true,
                differentiateGoalkeeper:
                  clone.differentiateGoalkeeper ?? teamPlayerStyle.differentiateGoalkeeper,
                showPhotos: clone.showPhotos ?? teamPlayerStyle.showPhotos,
              }
            : clone,
        );
        const teamPlayersConfig = {
          color: teamPlayerStyle.color,
          goalkeeperColor: teamPlayerStyle.goalkeeperColor,
          size: teamPlayerStyle.size,
          numberColor: teamPlayerStyle.numberColor,
          textColor: teamPlayerStyle.textColor,
          textBackgroundColor: teamPlayerStyle.textBackgroundColor,
          showPosition: teamPlayerStyle.showPosition,
          differentiateGoalkeeper: teamPlayerStyle.differentiateGoalkeeper,
          goalkeeperStripeColor: teamPlayerStyle.goalkeeperStripeColor,
          showPhotos: teamPlayerStyle.showPhotos,
          shape: teamPlayerStyle.shape,
          hasStripes: teamPlayerStyle.hasStripes,
          hasBib: teamPlayerStyle.hasBib,
          bibColor: teamPlayerStyle.bibColor,
          stripeColor: teamPlayerStyle.stripeColor,
        };
        const configToSave = {
          ...initialConfig,
          playersWithNumber,
          connectors,
          teamPlayers: teamPlayersConfig,
          boardSettings: normalizeBoardSettings({
            ...boardSettings,
            teamPlayers: teamPlayersConfig,
          }),
          formationSettings,
          showPhotos: teamPlayerStyle.showPhotos,
        };
        let imageBase64 = '';
        if (Platform.OS === 'web') {
          imageBase64 = await captureViewShotBase64(canvasRef);
        }

        if (!imageBase64 && Platform.OS === 'web' && typeof document !== 'undefined') {
          const aspectVal = getAspectForView(viewMode);
          const aspect = aspectVal ? 1 / aspectVal : referenceWidth / referenceHeight;
          const { width: exportWidth, height: exportHeight } = getVideoDimensions(aspect);
          const canvas = document.createElement('canvas');
          canvas.width = exportWidth;
          canvas.height = exportHeight;
          const ctx = canvas.getContext('2d', { alpha: false });

          const fieldBase64 = await captureViewShotBase64(fieldBaseRef);
          const fieldImage = await loadCanvasImage(fieldBase64);
          renderFrameToCanvas(
            ctx,
            exportWidth,
            exportHeight,
            normalizeElementsForCanvas(savedClones),
            connectors,
            fieldImage,
            {
              playersWithNumber,
              showPhotos: teamPlayerStyle.showPhotos,
              viewMode,
            },
          );
          imageBase64 = canvas.toDataURL('image/png').split(',')[1];
        }

        if (!imageBase64) {
          imageBase64 = await captureViewShotBase64(canvasRef);
        }

        if (saveCallback) {
          saveCallback(savedClones, selectedField, imageBase64, configToSave);
        }
        // Limpiar keyframes al guardar
        setVideoKeyframes([]);
        // Liberar orientaci�n antes de navegar
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          setTimeout(() => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(() => {});
          }, 300);
        } catch (e) {
          // Device may not support orientation lock
        }
        if (!embeddedBoard) navigation.goBack();
      } catch (error) {
        console.error('Error capturing field:', error);
      }
    }
  };

  const handleCancelar = useCallback(async () => {
    // Verificar si hay cambios sin guardar
    const hasUnsavedChanges = clones.length > 0 || videoKeyframes.length > 0;

    if (hasUnsavedChanges) {
      Alert.alert(
        sandbox ? t('field.exitConfirmTitle') : t('field.unsavedChangesTitle'),
        sandbox ? t('field.exitConfirmMessage') : t('field.unsavedChangesMessage'),
        [
          {
            text: t('message.cancel'),
            style: 'cancel',
          },
          {
            text: sandbox ? t('field.exitConfirmButton') : t('field.closeWithoutSaving'),
            style: 'destructive',
            onPress: async () => {
              if (cancelCallback) {
                cancelCallback();
              }
              // Limpiar todo el estado temporal al cancelar
              clearBoardState();
              await unlockOrientationAndGoBack();
            },
          },
        ],
      );
    } else {
      if (cancelCallback) {
        cancelCallback();
      }
      // Limpiar todo el estado temporal al cancelar
      clearBoardState();
      await unlockOrientationAndGoBack();
    }
  }, [
    cancelCallback,
    clones.length,
    videoKeyframes.length,
    clearBoardState,
    unlockOrientationAndGoBack,
    sandbox,
    t,
  ]);
  // Efecto para actualizar la imagen del campo cuando cambia selectedField (SVG → base64 via ViewShot)
  useEffect(() => {
    // SVG fields are instant " mark ready immediately
    setFieldImageReady(true);
    setIsLoadingField(false);

    // Capture field base image for video after a short delay to allow SVG render
    const timer = setTimeout(async () => {
      try {
        if (fieldBaseRef.current) {
          const imageBase64 = await captureViewShotBase64(fieldBaseRef);
          setFieldImageForVideo(imageBase64 ? `data:image/png;base64,${imageBase64}` : null);
        }
      } catch (error) {
        setFieldImageForVideo(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedField]);

  const loadAssociatedVideoForEditing = useCallback(async () => {
    if (isEditingVideo || videoKeyframes.length > 0 || (!ejercicioId && !estrategiaId))
      return false;
    try {
      const videosResult = ejercicioId
        ? await getVideosByExercise(ejercicioId)
        : await getVideosByStrategy(estrategiaId);
      const videos = Array.isArray(videosResult) ? videosResult : videosResult?.videos || [];
      const video = videos[0];
      const videoId = video?._id || video?.id || video?.videoId;
      if (!videoId) return false;
      const result = await getVideoForEdit(videoId);
      if (!result?.success || !result.video) return false;
      const videoData = result.video;
      return loadEditVideoDataIntoBoard(
        {
          videoId: videoData.id || videoData._id || videoId,
          nombre: videoData.nombre || presetVideoName || '',
          descripcion: videoData.descripcion || '',
          fieldType: videoData.fieldType,
          keyframes: videoData.keyframes,
          config: videoData.config,
          folderId: videoData.folder?._id || videoData.folder || null,
        },
        true,
      );
    } catch (error) {
      console.warn('Error cargando video asociado:', error);
      return false;
    }
  }, [
    ejercicioId,
    estrategiaId,
    isEditingVideo,
    loadEditVideoDataIntoBoard,
    presetVideoName,
    videoKeyframes.length,
  ]);

  // Funcin para abrir el grabador de video (desde otras rutas)
  const handleOpenVideoRecorder = useCallback(async () => {
    const loadedAssociatedVideo = await loadAssociatedVideoForEditing();
    try {
      savedClonesOriginalRef.current = JSON.parse(JSON.stringify(actualClonesRef.current || []));
    } catch (e) {
      savedClonesOriginalRef.current = actualClonesRef.current ? [...actualClonesRef.current] : [];
    }
    keepVideoChangesRef.current = false;
    if (!isEditingVideo && !loadedAssociatedVideo) {
      setLoadedEditVideoKeyframeCount(0);
    }
    setVideoRecorderVisible(true);
  }, [isEditingVideo, loadAssociatedVideoForEditing]); // Sin [clones] " usa actualClonesRef

  const handleEditVideoSaved = useCallback(async () => {
    setIsSavingVideoEdit(true);
    // Cerrar primero el grabador para que la transicin quede limpia
    setVideoRecorderVisible(false);
    setFieldImageForVideo(null);
    savedClonesOriginalRef.current = null;
    keepVideoChangesRef.current = false;
    // Seal global para que la pantalla origen muestre mensaje de xito
    global.pendingVideoEditSuccess = true;
    if (isSetPieceOrStrategy) {
      await handleGuardarGrafico();
    } else {
      clearBoardState();
      await new Promise((resolve) => setTimeout(resolve, 120));
      await unlockOrientationAndGoBack();
    }
    setIsSavingVideoEdit(false);
  }, [clearBoardState, unlockOrientationAndGoBack, isSetPieceOrStrategy, handleGuardarGrafico]);

  // Funcin para cerrar el grabador de video
  const unlockOrientationAndGoBack = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setTimeout(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(() => {});
      }, 300);
    } catch (e) {
      // Device may not support orientation lock
    }
    if (!embeddedBoard) navigation.goBack();
  }, [navigation, embeddedBoard]);

  const handleCloseVideoRecorder = useCallback(() => {
    boardPreviewPlaybackIdRef.current += 1;
    // Mantener los elementos dibujados en el campo al cerrar
    keepVideoChangesRef.current = true;
    setVideoRecorderVisible(false);
    setFieldImageForVideo(null);

    // Restaurar clones originales si el usuario NO aplic� cambios permanentemente
    // Esto SÍ se guarda en el historial para poder hacer undo
    if (!keepVideoChangesRef.current && savedClonesOriginalRef.current) {
      try {
        const toRestore = Array.isArray(savedClonesOriginalRef.current)
          ? savedClonesOriginalRef.current
          : savedClonesOriginalRef.current || [];

        let restored = [];
        try {
          const parsed = JSON.parse(JSON.stringify(toRestore));
          restored = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
        } catch (e) {
          restored = Array.isArray(toRestore) ? toRestore : toRestore ? [toRestore] : [];
        }

        // Usar setClones para que se guarde en el historial
        setClones(restored);
      } catch (e) {
        // Error silencioso
      }
    }

    // Limpiar referencias
    savedClonesOriginalRef.current = null;
    keepVideoChangesRef.current = false;
  }, [setClones]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleCancelar();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        subscription.remove();
      };
    }, [handleCancelar]),
  );

  // Ensure we clear board state when the screen is being removed (navigation away)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async () => {
      clearBoardState();
      // Forzar portrait primero (necesario en iOS), luego desbloquear
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setTimeout(() => {
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(() => {});
        }, 300);
      } catch (e) {
        // Device may not support orientation lock
      }
    });
    return unsubscribe;
  }, [navigation, clearBoardState]);

  // Funci�n para alternar modo de selecci�n m�ltiple
  const handleToggleMultiSelect = useCallback(() => {
    setMultiSelectMode((prev) => {
      const newMode = !prev;
      // Si estamos desactivando el modo, limpiar selecci�n completa
      if (!newMode) {
        setSelectedCloneIds([]);
        setSelectionRect(null);
        setIsSelecting(false);
        setSelectionInteractionMode('select');
        selectionStartRef.current = null;
        setSelectedCloneId(null);
      } else {
        // Al activar, limpiar selecci�n individual y preparar modo 'select'
        // Adem�s cancelar cualquier modo de dibujo/paleta activo y deseleccionar
        setSelectedCloneId(null);
        setSelectedCloneIds([]);
        setSelectionRect(null);
        setIsSelecting(false);
        setSelectionInteractionMode('select');
        selectionStartRef.current = null;

        // Si hay alguna selecci�n que sea una l�nea, flecha o forma, quitarla para evitar pintar
        if (selectedCloneId) {
          const sel = actualClonesRef.current.find((c) => c.id === selectedCloneId);
          const drawableTypes = [
            'straight-line',
            'straight-arrow',
            'curve-line',
            'curve-arrow',
            'circle',
            'rectangle',
            'custom-shape',
          ];
          if (sel && drawableTypes.includes(sel.type)) {
            setSelectedCloneId(null);
          }
        }

        // Cancelar modos de dibujo o acci�n pendiente de paleta
        try {
          exitDrawingMode();
        } catch (e) {
          // no-op
        }
        try {
          handleDeselectDrawingTool();
        } catch (e) {
          // no-op
        }
        setPendingLineAction(null);
        setLineStyleModalVisible(false);
        setPaletteVisible(false);
      }
      return newMode;
    });
  }, [selectedCloneId, exitDrawingMode, handleDeselectDrawingTool]); // Sin [clones] "� usa actualClonesRef

  // Funci�n para limpiar selecci�n m�ltiple
  const clearSelection = useCallback(() => {
    setSelectedCloneIds([]);
    setSelectionRect(null);
    setIsSelecting(false);
    selectionStartRef.current = null;
  }, []);

  // Funci�n para cancelar el rect�ngulo de selecci�n (sin limpiar los seleccionados)
  const cancelSelectionRect = useCallback(() => {
    setIsSelecting(false);
    setSelectionRect(null);
    if (selectionStartRef.current) {
      selectionStartRef.current.isDragging = true;
    }
  }, []);

  const toggleSelectionInteractionMode = useCallback(() => {
    setSelectionInteractionMode((prev) => (prev === 'select' ? 'move' : 'select'));
    // Limpiar el rect�ngulo al cambiar de modo
    setSelectionRect(null);
    setIsSelecting(false);
    selectionStartRef.current = null;
  }, []);

  // Funci�n para eliminar elementos seleccionados
  const deleteSelectedElements = useCallback(() => {
    if (selectedCloneIds.length === 0) return;

    // Encontrar los elementos que se van a eliminar
    const clonesBeingDeleted = actualClonesRef.current.filter((clone) =>
      selectedCloneIds.includes(clone.id),
    );

    // Encontrar los jugadores del equipo que se van a eliminar para liberarlos
    const playersToRestore = clonesBeingDeleted
      .filter((clone) => clone.playerData && clone.playerData.uniqueId)
      .map((clone) => clone.playerData);
    const playerUniqueIds = playersToRestore.map((p) => p.uniqueId);

    // Liberar los jugadores del equipo de selectedPlayerIds para que reaparezcan en la paleta
    if (playerUniqueIds.length > 0) {
      setSelectedPlayerIds((prev) => prev.filter((uid) => !playerUniqueIds.includes(uid)));
      setAvailablePlayers((prev) => [...prev, ...playersToRestore]);
    }

    // Encontrar los miembros del staff que se van a eliminar para liberarlos
    const staffToRestore = clonesBeingDeleted
      .filter((clone) => clone.type === 'staff' && clone.staffRole)
      .map((clone) => clone.staffRole);

    // Liberar los miembros del staff de selectedStaffIds para que reaparezcan en la paleta
    if (staffToRestore.length > 0) {
      setSelectedStaffIds((prev) => prev.filter((staffId) => !staffToRestore.includes(staffId)));
    }

    setClones((prev) => prev.filter((clone) => !selectedCloneIds.includes(clone.id)));
    clearSelection();
    // Desactivar el modo multi-select despu�s de borrar
    setMultiSelectMode(false);
  }, [selectedCloneIds, clearSelection]); // Sin [clones] "� usa actualClonesRef

  // Helper: obtener coords del evento relativas al overlay.
  // En react-native-web, locationX/locationY a veces es undefined en eventos de mouse,
  // por lo que calculamos desde pageX/pageY menos el bounding rect del overlay.
  const getEventCoords = useCallback((e) => {
    const ne = e.nativeEvent || {};
    let x = ne.locationX;
    let y = ne.locationY;
    if (typeof x !== 'number' || typeof y !== 'number' || (x === 0 && y === 0)) {
      // Intentar calcular desde pageX/pageY usando el DOM node del overlay (web)
      const node = selectionOverlayRef.current;
      const domNode =
        node &&
        (node._node ||
          node.node ||
          (typeof node.getBoundingClientRect === 'function' ? node : null));
      if (domNode && typeof domNode.getBoundingClientRect === 'function') {
        const rect = domNode.getBoundingClientRect();
        const px =
          ne.pageX != null
            ? ne.pageX
            : ne.changedTouches && ne.changedTouches[0] && ne.changedTouches[0].pageX;
        const py =
          ne.pageY != null
            ? ne.pageY
            : ne.changedTouches && ne.changedTouches[0] && ne.changedTouches[0].pageY;
        if (typeof px === 'number' && typeof py === 'number') {
          x = px - rect.left;
          y = py - rect.top;
        }
      }
    }
    return { x: x || 0, y: y || 0 };
  }, []);

  // Funciones simplificadas para selecci�n m�ltiple

  const fieldSizeRef = useRef({ w: imageWidth, h: imageHeight, viewMode });
  fieldSizeRef.current = { w: imageWidth, h: imageHeight, viewMode };

  const findContainedIds = useCallback((rect) => {
    const { w: imgW, h: imgH, viewMode: vm } = fieldSizeRef.current;
    const clonesNow = actualClonesRef.current || [];
    const rectLeft = rect.x;
    const rectRight = rect.x + rect.width;
    const rectTop = rect.y;
    const rectBottom = rect.y + rect.height;

    return clonesNow
      .filter((clone) => {
        const strokeTol = (clone.thickness || clone.size || 0) / 2;

        // CÍRCULOS: verificar si la circunferencia está completamente contenida
        if (clone.type === 'circle' && clone.points && clone.points.length === 2) {
          const pts = clone.points.map((p) => {
            if (p.x <= 1 && p.y <= 1) return ratioToDisplay(p.x, p.y, vm, imgW, imgH);
            return { x: p.x, y: p.y };
          });

          const cx = (pts[0].x + pts[1].x) / 2;
          const cy = (pts[0].y + pts[1].y) / 2;
          const dx = pts[1].x - pts[0].x;
          const dy = pts[1].y - pts[0].y;
          const radius = Math.sqrt(dx * dx + dy * dy) / 2;

          return (
            cx - radius - strokeTol >= rectLeft &&
            cx + radius + strokeTol <= rectRight &&
            cy - radius - strokeTol >= rectTop &&
            cy + radius + strokeTol <= rectBottom
          );
        }

        // RECTÁNGULOS: verificar si todo el rectángulo está completamente contenido
        if (clone.type === 'rectangle' && clone.points && clone.points.length === 2) {
          const pts = clone.points.map((p) => {
            if (p.x <= 1 && p.y <= 1) return ratioToDisplay(p.x, p.y, vm, imgW, imgH);
            return { x: p.x, y: p.y };
          });

          const minX = Math.min(pts[0].x, pts[1].x) - strokeTol;
          const maxX = Math.max(pts[0].x, pts[1].x) + strokeTol;
          const minY = Math.min(pts[0].y, pts[1].y) - strokeTol;
          const maxY = Math.max(pts[0].y, pts[1].y) + strokeTol;

          return minX >= rectLeft && maxX <= rectRight && minY >= rectTop && maxY <= rectBottom;
        }

        // LÍNEAS / FLECHAS / SHAPES con array de puntos: todos los puntos del trazado deben estar dentro del rectángulo de selección
        if (clone.points && Array.isArray(clone.points) && clone.points.length > 0) {
          const pts = clone.points.map((p) => {
            if (p.x <= 1 && p.y <= 1) return ratioToDisplay(p.x, p.y, vm, imgW, imgH);
            return { x: p.x, y: p.y };
          });

          const minX = Math.min(...pts.map((p) => p.x)) - strokeTol;
          const maxX = Math.max(...pts.map((p) => p.x)) + strokeTol;
          const minY = Math.min(...pts.map((p) => p.y)) - strokeTol;
          const maxY = Math.max(...pts.map((p) => p.y)) + strokeTol;

          return minX >= rectLeft && maxX <= rectRight && minY >= rectTop && maxY <= rectBottom;
        }

        // Para elementos puntuales (jugadores, balón, conos, textos)
        let elemX, elemY;
        if (typeof clone.x === 'number') {
          elemX = clone.x;
          elemY = clone.y;
        } else if (clone.xRatio != null) {
          const coords = ratioToDisplay(clone.xRatio, clone.yRatio, vm, imgW, imgH);
          elemX = coords.x;
          elemY = coords.y;
        } else {
          return false;
        }

        const origW = clone.imageWidth || imgW;
        const origH = clone.imageHeight || imgH;
        const scale = (imgW / origW + imgH / origH) / 2;
        const half = ((clone.size || standardSize) * scale) / 2;

        const elementLeft = elemX - half;
        const elementRight = elemX + half;
        const elementTop = elemY - half;
        const elementBottom = elemY + half;

        return (
          elementLeft >= rectLeft &&
          elementRight <= rectRight &&
          elementTop >= rectTop &&
          elementBottom <= rectBottom
        );
      })
      .map((c) => c.id);
  }, []);

  // Setup de listeners pointer + dibujo del rect�ngulo. Solo corre cuando
  // se entra a modo selecci�n. Estrategia: TODOS los listeners en window
  // con capture=true. Validamos manualmente que el evento empieza dentro
  // del overlay. Esto evita cualquier problema de elementos hijos del
  // overlay que pudieran interceptar pointerdown.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!multiSelectMode || selectionInteractionMode !== 'select') return;

    const overlay = selectionOverlayRef.current;
    if (!(overlay instanceof Element)) {
      console.warn('[ms] overlay ref vac�o');
      return;
    }

    overlay.style.touchAction = 'none';
    overlay.style.userSelect = 'none';
    overlay.style.cursor = 'crosshair';

    // Crear el rect�ngulo visual una sola vez. Lo agregamos DENTRO del
    // overlay (position:absolute relativo a �l) para evitar interferencias
    // del CSS global `body > div:not(#root) { position:fixed; inset:0; ... }`
    // (GlobalStyles.js:95) que afecta a hijos directos del body. Como el
    // overlay es un div web nativo (no react-native View con transform),
    // position:absolute es seguro aqu�.
    const rectEl = document.createElement('div');
    rectEl.setAttribute('data-ms-rect', '');
    Object.assign(rectEl.style, {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: '0px',
      height: '0px',
      backgroundColor: 'rgba(52,152,219,0.20)',
      border: '2px dashed #3498db',
      pointerEvents: 'none',
      display: 'none',
      zIndex: '10001',
      boxSizing: 'border-box',
      willChange: 'left,top,width,height',
    });
    overlay.appendChild(rectEl);

    let dragging = false;
    let active = false;
    let activeId = null;
    // Coords en client (viewport) durante el drag; convertimos a coords
    // relativas al overlay al pintar y al detectar contenidos.
    let sCx = 0,
      sCy = 0,
      cCx = 0,
      cCy = 0;
    const THRESHOLD = 4;

    const overlayRect = () => overlay.getBoundingClientRect();

    const clientToLocal = (clientX, clientY) => {
      const r = overlayRect();
      const scaleX = r.width && overlay.offsetWidth ? r.width / overlay.offsetWidth : 1;
      const scaleY = r.height && overlay.offsetHeight ? r.height / overlay.offsetHeight : 1;
      return {
        x: (clientX - r.left) / (scaleX || 1),
        y: (clientY - r.top) / (scaleY || 1),
      };
    };

    const drawRect = () => {
      const start = clientToLocal(sCx, sCy);
      const current = clientToLocal(cCx, cCy);
      const left = Math.min(start.x, current.x);
      const top = Math.min(start.y, current.y);
      rectEl.style.left = left + 'px';
      rectEl.style.top = top + 'px';
      rectEl.style.width = Math.abs(current.x - start.x) + 'px';
      rectEl.style.height = Math.abs(current.y - start.y) + 'px';
      rectEl.style.display = 'block';
    };

    const isInsideOverlay = (clientX, clientY) => {
      const r = overlayRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    };

    const onDown = (ev) => {
      if (ev.button !== undefined && ev.button !== 0) return;
      if (!isInsideOverlay(ev.clientX, ev.clientY)) return;
      ev.preventDefault();
      ev.stopPropagation();
      active = true;
      activeId = ev.pointerId ?? 'mouse';
      sCx = cCx = ev.clientX;
      sCy = cCy = ev.clientY;
      dragging = false;
      rectEl.style.display = 'none';
    };

    const onMove = (ev) => {
      if (!active) return;
      if (ev.pointerId != null && activeId !== 'mouse' && ev.pointerId !== activeId) return;
      cCx = ev.clientX;
      cCy = ev.clientY;
      if (!dragging) {
        const dx = cCx - sCx,
          dy = cCy - sCy;
        if (dx * dx + dy * dy > THRESHOLD * THRESHOLD) {
          dragging = true;
        }
      }
      if (dragging) {
        ev.preventDefault();
        drawRect();
      }
    };

    const onUp = (ev) => {
      if (!active) return;
      if (ev.pointerId != null && activeId !== 'mouse' && ev.pointerId !== activeId) return;
      const wasDragging = dragging;
      active = false;
      activeId = null;
      dragging = false;
      rectEl.style.display = 'none';

      if (!wasDragging) {
        return;
      }

      // Convertir coords client a coords locales del overlay, compensando zoom/pan CSS.
      const start = clientToLocal(sCx, sCy);
      const current = clientToLocal(cCx, cCy);
      const left = Math.min(start.x, current.x);
      const top = Math.min(start.y, current.y);
      const w = Math.abs(current.x - start.x);
      const h = Math.abs(current.y - start.y);

      if (w < 8 || h < 8) return;

      const ids = findContainedIds({ x: left, y: top, width: w, height: h });
      setSelectedCloneIds(ids);
      if (ids.length > 0) setSelectionInteractionMode('move');
    };

    const onCancel = () => {
      active = false;
      activeId = null;
      dragging = false;
      rectEl.style.display = 'none';
    };

    // TODOS los listeners en window con capture=true para garantizar
    // recepcin antes que cualquier handler del overlay/hijos.
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onCancel, true);

    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onCancel, true);
      if (rectEl.parentNode) rectEl.parentNode.removeChild(rectEl);
    };
  }, [multiSelectMode, selectionInteractionMode, findContainedIds]);

  const openCarouselModal = () => {
    setCarouselModalVisible(true);
  };

  const closeCarouselModal = () => setCarouselModalVisible(false);

  // Handler for the new SVG FieldSelectorModal (lineType + viewMode)
  const handleFieldSelect = useCallback((newLineType, newViewMode) => {
    setFieldLineType(newLineType);
    setViewMode(newViewMode);
    setFieldImageReady(true);
    setIsLoadingField(false);
    setDraggingOutside(false);
  }, []);

  const [paletteEdit, setPaletteEdit] = useState({
    visible: false,
    icon: null,
    paletteIndex: null,
  });

  const handleLongPressPaletteIcon = (icon, paletteIndex) => {
    setPaletteEdit({ visible: true, icon: { ...icon, paletteIndex }, paletteIndex });
  };

  const handleApplyPaletteEdit = (iconEdited) => {
    handlePaletteIconEdit(iconEdited);
    setPaletteEdit({ visible: false, icon: null, paletteIndex: null });
  };

  const handleApplyTextEdit = useCallback((iconEdited) => {
    setClones((clones) =>
      clones.map((cl) => (cl.id === iconEdited.id ? { ...cl, ...iconEdited } : cl)),
    );
    setTextEditPanel({ visible: false, icon: null, isNew: false });
  }, []);

  // Vista previa en tiempo real para texto mientras se edita
  const handleTextPreviewChange = useCallback((previewIcon) => {
    if (!previewIcon || !previewIcon.id) return;
    setActualClones((prev) =>
      prev.map((cl) => (cl.id === previewIcon.id ? { ...cl, ...previewIcon } : cl)),
    );
  }, []);

  const handleAddText = useCallback(() => {
    if (pendingPlacementAction?.kind === 'free-text') {
      setPendingPlacementAction(null);
      return;
    }

    activatePlacementMode({
      kind: 'free-text',
      clone: {
        idBase: 'free-text',
        type: 'free-text',
        value: '',
        color: '#000000',
        size: 18,
        backgroundColor: 'transparent',
        zIndex: getNextZIndex('free-text'),
      },
    });
  }, [activatePlacementMode, getNextZIndex, pendingPlacementAction]);

  // Funcin para activar/desactivar el modo goma de borrar
  const handleToggleEraser = useCallback(() => {
    // Desactivar todas las herramientas de dibujo
    setDrawingStraightArrow(false);
    setDrawingStraightLine(false);
    setDrawingCurveLine(false);
    setDrawingCurveArrow(false);
    setDrawingCircle(false);
    setDrawingRectangle(false);
    setDrawingCustomShape(false);
    setPendingLineAction(null);
    setPendingPlacementAction(null);
    // Toggle eraser mode
    setEraserMode((prev) => !prev);
    // Deseleccionar elementos
    setSelectedCloneId(null);
    clearMultiSelect();
  }, [clearMultiSelect]);

  // Funcin para actualizar estados relacionados cuando se elimina un elemento (sin hacer setClones)
  const handleElementDeleted = useCallback((cloneToDelete) => {
    if (!cloneToDelete) return;

    setSelectedCloneId(null);

    // Eliminar conectores relacionados
    setConnectors((prev) =>
      prev.filter((c) => c.fromId !== cloneToDelete.id && c.toId !== cloneToDelete.id),
    );

    // Si es un jugador del equipo, removerlo de selectedPlayerIds y aadirlo a availablePlayers
    if (cloneToDelete.playerData) {
      setSelectedPlayerIds((prev) =>
        prev.filter((uid) => uid !== cloneToDelete.playerData.uniqueId),
      );
      setAvailablePlayers((prev) => [...prev, cloneToDelete.playerData]);
    }

    // Si es un miembro del cuerpo tcnico, removerlo de selectedStaffIds para que vuelva a la paleta
    if (cloneToDelete.type === 'staff' && cloneToDelete.staffRole) {
      setSelectedStaffIds((prev) => prev.filter((staffId) => staffId !== cloneToDelete.staffRole));
    }
  }, []);

  // Funcin para borrar un elemento por ID (incluyendo setClones)
  const eraseElementById = useCallback(
    (id) => {
      const cloneToDelete = actualClonesRef.current.find((clone) => clone.id === id);
      setClones((prev) => prev.filter((clone) => clone.id !== id));
      handleElementDeleted(cloneToDelete);
    },
    [handleElementDeleted],
  ); // Sin [clones] " usa actualClonesRef

  // Funcin para encontrar elemento en una posicin (para la goma)
  const findElementAtPosition = useCallback(
    (touchX, touchY) => {
      return (
        findTopBoardCloneAtPoint(
          actualClonesRef.current,
          touchX,
          touchY,
          viewMode,
          imageWidth,
          imageHeight,
          standardSize,
          selectedCloneId,
        )?.id || null
      );
    },
    [viewMode, imageWidth, imageHeight, standardSize, selectedCloneId],
  ); // Sin [clones] " usa actualClonesRef

  // Ref para trackear elementos ya borrados durante un arrastre
  const erasedElementsRef = useRef(new Set());
  const lastEraserPointRef = useRef(null);

  const eraseAtPoint = useCallback(
    (touchX, touchY) => {
      const elementId = findElementAtPosition(touchX, touchY);
      if (elementId && !erasedElementsRef.current.has(elementId)) {
        eraseElementById(elementId);
        erasedElementsRef.current.add(elementId);
        return true;
      }
      return false;
    },
    [findElementAtPosition, eraseElementById],
  );

  const eraseAlongStroke = useCallback(
    (fromPoint, toPoint) => {
      if (!fromPoint) {
        eraseAtPoint(toPoint.x, toPoint.y);
        return;
      }

      const distance = Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y);
      const steps = Math.max(1, Math.ceil(distance / 4));
      for (let step = 1; step <= steps; step++) {
        const t = step / steps;
        eraseAtPoint(
          fromPoint.x + (toPoint.x - fromPoint.x) * t,
          fromPoint.y + (toPoint.y - fromPoint.y) * t,
        );
      }
    },
    [eraseAtPoint],
  );

  // Handler para el inicio del borrado (touch start)
  const handleEraserStart = useCallback(
    (e) => {
      if (!eraserMode) return;
      erasedElementsRef.current = new Set();
      const touchX = e.nativeEvent.locationX;
      const touchY = e.nativeEvent.locationY;
      lastEraserPointRef.current = { x: touchX, y: touchY };
      eraseAtPoint(touchX, touchY);
    },
    [eraserMode, eraseAtPoint],
  );

  // Handler para el movimiento del borrado (touch move)
  const handleEraserMove = useCallback(
    (e) => {
      if (!eraserMode) return;
      const touchX = e.nativeEvent.locationX;
      const touchY = e.nativeEvent.locationY;
      const nextPoint = { x: touchX, y: touchY };
      eraseAlongStroke(lastEraserPointRef.current, nextPoint);
      lastEraserPointRef.current = nextPoint;
    },
    [eraserMode, eraseAlongStroke],
  );

  // Handler para el fin del borrado (touch end)
  const handleEraserEnd = useCallback(() => {
    erasedElementsRef.current = new Set();
    lastEraserPointRef.current = null;
  }, []);

  // Ref para almacenar el estado de arrastre de elementos
  const elementDragState = useRef(null);
  // Ref para detectar taps (toque corto sin movimiento) en el campo
  const fieldTouchStartRef = useRef(null);

  const releaseElementDragLock = useCallback(
    (dragState = elementDragState.current) => {
      if (dragState?.dragKey) {
        releaseBoardDrag(dragStart, dragState.dragKey);
      }
    },
    [dragStart],
  );

  const findInteractiveCloneAtPosition = useCallback(
    (touchX, touchY) => {
      return findTopBoardCloneAtPoint(
        actualClonesRef.current,
        touchX,
        touchY,
        viewMode,
        imageWidth,
        imageHeight,
        standardSize,
        selectedCloneId,
      );
    },
    [viewMode, imageWidth, imageHeight, standardSize, selectedCloneId],
  );

  const handlePendingPlacementOnField = useCallback(
    (e) => {
      if (!pendingPlacementAction) return false;
      const { locationX, locationY } = e.nativeEvent;
      const ratioPoint = displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight);
      finishPlacementAction(pendingPlacementAction, {
        x: clampBoardRatio(ratioPoint.x),
        y: clampBoardRatio(ratioPoint.y),
      });
      return true;
    },
    [pendingPlacementAction, finishPlacementAction, viewMode, imageWidth, imageHeight],
  );

  // Handler para iniciar arrastre de cualquier elemento existente si su detector especfico no captura el gesto.
  const handleElementDragStart = useCallback(
    (e) => {
      if (multiSelectMode && selectionInteractionMode === 'select') return false;

      const { locationX, locationY, pageX, pageY } = e.nativeEvent;
      const hitClone = findInteractiveCloneAtPosition(locationX, locationY);
      if (!hitClone) {
        elementDragState.current = null;
        setDraggingOutside(false);
        return false;
      }

      const isMultiSelected = selectedCloneIdsSet
        ? selectedCloneIdsSet.has(hitClone.id)
        : selectedCloneIds.includes(hitClone.id);
      if (multiSelectMode && selectionInteractionMode === 'move' && !isMultiSelected) {
        elementDragState.current = null;
        setDraggingOutside(false);
        return false;
      }

      const selectedIds =
        ALLOW_MULTI_ELEMENT_DRAG &&
        multiSelectMode &&
        selectionInteractionMode === 'move' &&
        isMultiSelected
          ? selectedCloneIds.filter((id) =>
              actualClonesRef.current.some((clone) => clone.id === id && !clone.locked),
            )
          : [hitClone.id];
      const initialPositions = buildBoardDragSnapshots(actualClonesRef.current, selectedIds);
      if (Object.keys(initialPositions).length === 0) {
        elementDragState.current = null;
        setDraggingOutside(false);
        return false;
      }

      const dragKey = `fallback-${hitClone.id}`;
      if (!acquireBoardDrag(dragStart, dragKey)) {
        elementDragState.current = null;
        setDraggingOutside(false);
        return false;
      }

      elementDragState.current = {
        dragKey,
        primaryId: hitClone.id,
        selectedIds,
        initialPositions,
        startPageX: pageX,
        startPageY: pageY,
      };
      setDraggingOutside(false);

      if (!multiSelectMode) {
        setSelectedCloneId(hitClone.id);
      } else if (cancelSelectionRect) {
        cancelSelectionRect();
      }

      return true;
    },
    [
      multiSelectMode,
      selectionInteractionMode,
      findInteractiveCloneAtPosition,
      selectedCloneIdsSet,
      selectedCloneIds,
      dragStart,
      setSelectedCloneId,
      cancelSelectionRect,
    ],
  );

  // Handler para mover elementos existentes
  const handleElementDragMove = useCallback(
    (e) => {
      if (
        !elementDragState.current ||
        !isBoardDragOwner(dragStart, elementDragState.current.dragKey)
      )
        return;

      const { pageX, pageY } = e.nativeEvent;
      const { selectedIds, initialPositions, startPageX, startPageY } = elementDragState.current;
      const dxDisplay = (pageX - startPageX) / zoomLevel;
      const dyDisplay = (pageY - startPageY) / zoomLevel;
      const { dxRatio, dyRatio } = deltaToRatio(
        dxDisplay,
        dyDisplay,
        viewMode,
        imageWidth,
        imageHeight,
      );

      const anyOutside = selectedIds.some((selectedId) => {
        const clone = actualClonesRef.current.find((item) => item.id === selectedId);
        if (!clone || clone.locked) return false;
        const candidate = applyBoardDragSnapshot(
          clone,
          initialPositions[selectedId],
          dxRatio,
          dyRatio,
          dxDisplay,
          dyDisplay,
        );
        return isBoardCloneOutsideForDelete(candidate, viewMode, imageWidth, imageHeight);
      });
      setDraggingOutside(anyOutside);

      setClones((prev) =>
        prev.map((c) => {
          if (!selectedIds.includes(c.id) || c.locked) return c;
          return applyBoardDragSnapshot(
            c,
            initialPositions[c.id],
            dxRatio,
            dyRatio,
            dxDisplay,
            dyDisplay,
          );
        }),
      );
    },
    [viewMode, imageWidth, imageHeight, zoomLevel, dragStart, setClones],
  );

  // Handler para finalizar arrastre de elementos
  const handleElementDragEnd = useCallback(() => {
    const dragState = elementDragState.current;
    elementDragState.current = null;
    setDraggingOutside(false);
    if (!dragState) return;
    if (!isBoardDragOwner(dragStart, dragState.dragKey)) return;

    setClones((prev) => {
      const deleted = [];
      const remaining = prev.filter((clone) => {
        if (!dragState.selectedIds.includes(clone.id) || clone.locked) return true;
        if (clone.points && Array.isArray(clone.points) && clone.points.length >= 2) {
          const outside = areAllPointsOutside(clone.points, viewMode, imageWidth, imageHeight);
          if (outside) deleted.push(clone);
          return !outside;
        }
        if (clone.xRatio !== undefined) {
          const outside = isOutsideVisibleField(
            clone.xRatio,
            clone.yRatio,
            viewMode,
            imageWidth,
            imageHeight,
          );
          if (outside) deleted.push(clone);
          return !outside;
        }
        return true;
      });
      if (deleted.length > 0) {
        setTimeout(() => deleted.forEach((clone) => handleElementDeleted(clone)), 0);
      }
      return deleted.length > 0 ? remaining : prev;
    });

    releaseElementDragLock(dragState);
    if (saveClonesHistory) saveClonesHistory();
  }, [
    viewMode,
    imageWidth,
    imageHeight,
    dragStart,
    setClones,
    handleElementDeleted,
    releaseElementDragLock,
    saveClonesHistory,
  ]);

  // Funciones para dibujar lneas rectas
  const handleStraightLineDrawStart = useCallback(
    (e) => {
      if (!drawingStraightArrow && !drawingStraightLine && !drawingCircle && !drawingRectangle)
        return;

      const { locationX, locationY } = e.nativeEvent;
      setStraightLineStart(displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight));
      setTemporaryLinePoints([
        displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight),
      ]);
    },
    [
      drawingStraightArrow,
      drawingStraightLine,
      drawingCircle,
      drawingRectangle,
      viewMode,
      imageWidth,
      imageHeight,
    ],
  );

  const handleStraightLineDrawMove = useCallback(
    (e) => {
      if (
        (!drawingStraightArrow && !drawingStraightLine && !drawingCircle && !drawingRectangle) ||
        !straightLineStart
      )
        return;

      const { locationX, locationY } = e.nativeEvent;
      const rawEnd = displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight);

      // Apply snapping if drawing a straight line or arrow
      const finalEnd =
        drawingStraightLine || drawingStraightArrow
          ? snapToHorizontalOrVertical(straightLineStart, rawEnd)
          : rawEnd;

      setStraightLineEnd(finalEnd);
      setTemporaryLinePoints([straightLineStart, finalEnd]);
    },
    [
      drawingStraightArrow,
      drawingStraightLine,
      drawingCircle,
      drawingRectangle,
      straightLineStart,
      viewMode,
      imageWidth,
      imageHeight,
    ],
  );

  // 5. Reemplazar la funcin handleStraightLineDrawEnd
  const handleStraightLineDrawEnd = () => {
    if (
      (!drawingStraightArrow && !drawingStraightLine && !drawingCircle && !drawingRectangle) ||
      !straightLineStart ||
      !straightLineEnd
    ) {
      setStraightLineStart(null);
      setStraightLineEnd(null);
      setTemporaryLinePoints([]);
      return;
    }

    let type = '';
    if (drawingStraightArrow) type = 'straight-arrow';
    else if (drawingStraightLine) type = 'straight-line';
    else if (drawingCircle) type = 'circle';
    else if (drawingRectangle) type = 'rectangle';

    let points = [
      { x: straightLineStart.x, y: straightLineStart.y },
      { x: straightLineEnd.x, y: straightLineEnd.y },
    ];

    // Obtener el icono de la paleta para usar su Configuracin
    const paletteIcon = paletteIcons.find((ic) => ic.type === type);
    const paletteIndex = paletteIcons.findIndex((ic) => ic.type === type);

    const newObj = {
      id: `${type}-${Date.now()}`,
      type: type,
      color: paletteIcon?.color || '#000000',
      thickness: paletteIcon?.thickness || (type === 'circle' ? 5 : arrowThickness),
      lineType: lineType,
      dotSize: dotSize,
      dotSpacing: dotSpacing,
      // Relleno para formas geomtricas
      fillColor:
        pendingLineAction?.icon?.fillColor !== undefined
          ? pendingLineAction.icon.fillColor
          : paletteIcon?.fillColor || 'transparent',
      size: standardSize, // Usar standardSize directamente
      points: points,
      imageWidth,
      imageHeight,
      xRatio: 0.5,
      yRatio: 0.5,
      paletteIndex: paletteIndex >= 0 ? paletteIndex : undefined,
      zIndex: getNextZIndex(type),
    };

    setClones((prev) => [newObj, ...prev]);

    setStraightLineStart(null);
    setStraightLineEnd(null);
    setTemporaryLinePoints([]);
    // Mantener el modo de dibujo activo para formas geomtricas (crculos y rectngulos)
    // Solo resetear para lneas y flechas rectas
    // setDrawingStraightArrow(false);
    // setDrawingStraightLine(false);
    // No resetear drawingCircle y drawingRectangle para permitir dibujo continuo
  };

  // Funciones para dibujar curvas
  const handleCurveDrawStart = useCallback(
    (e) => {
      if (!drawingCurveLine && !drawingCurveArrow) return;

      const { locationX, locationY } = e.nativeEvent;
      const newPoint = displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight);

      setCurvePoints([newPoint]);
      setIsDrawing(true);
    },
    [drawingCurveLine, drawingCurveArrow, viewMode, imageWidth, imageHeight],
  );

  const handleCurveDrawMove = useCallback(
    (e) => {
      if ((!drawingCurveLine && !drawingCurveArrow) || !isDrawing) return;

      const { locationX, locationY } = e.nativeEvent;
      const newPoint = displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight);

      setCurvePoints((prev) => [...prev, newPoint]);
    },
    [drawingCurveLine, drawingCurveArrow, isDrawing, viewMode, imageWidth, imageHeight],
  );

  // 6. Reemplazar la funcin handleCurveDrawEnd
  const handleCurveDrawEnd = () => {
    if ((!drawingCurveLine && !drawingCurveArrow) || !isDrawing || curvePoints.length < 2) {
      setCurvePoints([]);
      setIsDrawing(false);
      return;
    }

    const type = drawingCurveArrow ? 'curve-arrow' : 'curve-line';

    // Obtener el icono de la paleta para usar su Configuracin
    const paletteIcon = paletteIcons.find((ic) => ic.type === type);
    const paletteIndex = paletteIcons.findIndex((ic) => ic.type === type);

    const newObj = {
      id: `${type}-${Date.now()}`,
      type: type,
      color: paletteIcon?.color || '#141414',
      thickness: paletteIcon?.thickness || arrowThickness,
      lineType: lineType,
      dotSize: dotSize,
      dotSpacing: dotSpacing,
      size: standardSize, // Usar standardSize directamente
      points: curvePoints,
      imageWidth,
      imageHeight,
      paletteIndex: paletteIndex >= 0 ? paletteIndex : undefined,
      zIndex: getNextZIndex(type),
    };

    setClones((prev) => [newObj, ...prev]);

    setCurvePoints([]);
    setIsDrawing(false);
  };

  // 7. Funcin para renderizar lneas rectas directamente en SVG

  const handleDeleteClone = useCallback((id) => {
    const cloneToDelete = actualClonesRef.current.find((clone) => clone.id === id);
    setClones((prev) => prev.filter((clone) => clone.id !== id));
    setSelectedCloneId(null);

    // Eliminar conectores relacionados con el elemento eliminado
    setConnectors((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));

    // Si es un jugador del equipo, removerlo de selectedPlayerIds y aadirlo a availablePlayers
    if (cloneToDelete && cloneToDelete.playerData) {
      setSelectedPlayerIds((prev) =>
        prev.filter((uid) => uid !== cloneToDelete.playerData.uniqueId),
      );
      setAvailablePlayers((prev) => [...prev, cloneToDelete.playerData]);
    }

    // Si es un miembro del cuerpo tcnico, removerlo de selectedStaffIds para que vuelva a la paleta
    if (cloneToDelete && cloneToDelete.type === 'staff' && cloneToDelete.staffRole) {
      setSelectedStaffIds((prev) => prev.filter((staffId) => staffId !== cloneToDelete.staffRole));
    }
  }, []); // Sin [clones] " usa actualClonesRef para identidad estable

  // Funcin para duplicar un elemento
  const handleDuplicateClone = useCallback(
    (id) => {
      const elementToDuplicate = actualClonesRef.current.find((clone) => clone.id === id);

      if (elementToDuplicate) {
        // Crear una copia con un nuevo ID y ligeramente desplazada
        const duplicatedElement = {
          ...elementToDuplicate,
          id: `${elementToDuplicate.type}-${Date.now()}`, // Generar un nuevo ID
        };

        // Desplazar ligeramente el elemento duplicado segn su tipo
        if (duplicatedElement.points && duplicatedElement.points.length > 0) {
          // Para formas con puntos (lneas, polgonos, etc.)
          duplicatedElement.points = duplicatedElement.points.map((point) => ({
            x: Math.min(1, point.x + 0.05), // Desplazar a la derecha un 5%
            y: Math.min(1, point.y + 0.05), // Desplazar hacia abajo un 5%
          }));
        } else {
          // Para elementos con posicin por ratio (iconos, textos, etc.)
          duplicatedElement.xRatio = Math.min(1, (duplicatedElement.xRatio || 0.5) + 0.05);
          duplicatedElement.yRatio = Math.min(1, (duplicatedElement.yRatio || 0.5) + 0.05);
        }

        // Aadir el elemento duplicado al array de clones (con nuevo zIndex)
        const duplicatedWithZIndex = {
          ...duplicatedElement,
          zIndex: getNextZIndex(duplicatedElement.type),
        };
        setClones((prev) => [duplicatedWithZIndex, ...prev]);

        // Seleccionar el nuevo elemento duplicado
        setSelectedCloneId(duplicatedWithZIndex.id);
      }
    },
    [getNextZIndex],
  ); // Sin [clones] " usa actualClonesRef
  const duplicateSelectedElements = useCallback(() => {
    if (!selectedCloneIds || selectedCloneIds.length === 0) return;

    // Obtener todos los elementos seleccionados
    const selectedElements = selectedCloneIds
      .map((id) => actualClonesRef.current.find((c) => c.id === id))
      .filter(Boolean);

    if (selectedElements.length === 0) return;

    // Calcular el centroide del grupo para mantener posiciones relativas
    let sumX = 0,
      sumY = 0,
      count = 0;
    selectedElements.forEach((el) => {
      if (el.points && el.points.length > 0) {
        // Para elementos con puntos, usar el centroide de los puntos
        el.points.forEach((p) => {
          sumX += p.x;
          sumY += p.y;
          count++;
        });
      } else {
        // Para elementos con xRatio/yRatio
        sumX += el.xRatio || 0.5;
        sumY += el.yRatio || 0.5;
        count++;
      }
    });

    const centroidX = count > 0 ? sumX / count : 0.5;
    const centroidY = count > 0 ? sumY / count : 0.5;

    // Offset fijo para todo el grupo (5% hacia abajo y derecha)
    const offsetX = 0.05;
    const offsetY = 0.05;

    const duplicates = selectedElements.map((elementToDuplicate, idx) => {
      const duplicatedElement = {
        ...elementToDuplicate,
        id: `${elementToDuplicate.type}-${Date.now()}-${idx}`,
        zIndex: getNextZIndex(elementToDuplicate.type),
      };

      if (duplicatedElement.points && duplicatedElement.points.length > 0) {
        // Mantener la posicin relativa: aplicar el mismo offset a todos los puntos
        duplicatedElement.points = duplicatedElement.points.map((point) => ({
          x: Math.max(0, Math.min(1, point.x + offsetX)),
          y: Math.max(0, Math.min(1, point.y + offsetY)),
        }));
      } else {
        // Mantener la posicin relativa: aplicar el mismo offset
        duplicatedElement.xRatio = Math.max(
          0,
          Math.min(1, (duplicatedElement.xRatio || 0.5) + offsetX),
        );
        duplicatedElement.yRatio = Math.max(
          0,
          Math.min(1, (duplicatedElement.yRatio || 0.5) + offsetY),
        );
      }

      return duplicatedElement;
    });

    if (duplicates.length === 0) return;

    setClones((prev) => [...duplicates, ...prev]);
    setSelectedCloneIds(duplicates.map((d) => d.id));
    setSelectedCloneId(duplicates[0].id);
  }, [selectedCloneIds, getNextZIndex]); // Sin [clones] " usa actualClonesRef

  // Funcin para rotar elementos seleccionados alrededor del centroide del grupo
  const rotateSelectedElements = useCallback(
    (angleDegrees = 15) => {
      if (!selectedCloneIds || selectedCloneIds.length === 0) return;

      // Obtener todos los elementos seleccionados
      const selectedElements = selectedCloneIds
        .map((id) => actualClonesRef.current.find((c) => c.id === id))
        .filter(Boolean);

      if (selectedElements.length === 0) return;

      // Calcular el centroide del grupo
      let sumX = 0,
        sumY = 0,
        count = 0;
      selectedElements.forEach((el) => {
        if (el.points && el.points.length > 0) {
          el.points.forEach((p) => {
            sumX += p.x;
            sumY += p.y;
            count++;
          });
        } else {
          sumX += el.xRatio || 0.5;
          sumY += el.yRatio || 0.5;
          count++;
        }
      });

      const centroidX = count > 0 ? sumX / count : 0.5;
      const centroidY = count > 0 ? sumY / count : 0.5;

      // Convertir ngulo a radianes
      const angleRad = (angleDegrees * Math.PI) / 180;
      const cosAngle = Math.cos(angleRad);
      const sinAngle = Math.sin(angleRad);

      setClones((prev) =>
        prev.map((c) => {
          if (!selectedCloneIds.includes(c.id)) return c;

          if (c.points && c.points.length > 0) {
            // Rotar cada punto alrededor del centroide
            const newPoints = c.points.map((p) => {
              const dx = p.x - centroidX;
              const dy = p.y - centroidY;
              const newX = centroidX + (dx * cosAngle - dy * sinAngle);
              const newY = centroidY + (dx * sinAngle + dy * cosAngle);
              return {
                x: Math.max(0, Math.min(1, newX)),
                y: Math.max(0, Math.min(1, newY)),
              };
            });
            return { ...c, points: newPoints };
          } else {
            // Rotar la posicin del elemento alrededor del centroide
            const dx = (c.xRatio || 0.5) - centroidX;
            const dy = (c.yRatio || 0.5) - centroidY;
            const newX = centroidX + (dx * cosAngle - dy * sinAngle);
            const newY = centroidY + (dx * sinAngle + dy * cosAngle);
            return {
              ...c,
              xRatio: Math.max(0, Math.min(1, newX)),
              yRatio: Math.max(0, Math.min(1, newY)),
            };
          }
        }),
      );
    },
    [selectedCloneIds],
  ); // Sin [clones] " usa actualClonesRef

  // Funcin para alternar bloquear/desbloquear todos los seleccionados
  const toggleLockSelected = useCallback(() => {
    if (!selectedCloneIds || selectedCloneIds.length === 0) return;

    const anyUnlocked = selectedCloneIds.some((id) => {
      const c = actualClonesRef.current.find((x) => x.id === id);
      return c && c.locked !== true;
    });

    setClones((prev) =>
      prev.map((c) => {
        if (selectedCloneIds.includes(c.id)) {
          const isLocking = anyUnlocked;
          return {
            ...c,
            locked: isLocking,
            zIndex: isLocking ? 1 : c.originalZIndex || getZIndexBaseForType(c.type),
            originalZIndex: isLocking ? c.zIndex || getZIndexBaseForType(c.type) : c.originalZIndex,
          };
        }
        return c;
      }),
    );
  }, [selectedCloneIds]); // Sin [clones] " usa actualClonesRef

  // Funcin para traer los seleccionados al frente
  const bringSelectedToFront = useCallback(() => {
    if (!selectedCloneIds || selectedCloneIds.length === 0) return;

    setClones((prev) => {
      const maxZIndex = Math.max(...prev.map((c) => c.zIndex || 0), 0);
      const selected = prev.filter((c) => selectedCloneIds.includes(c.id));
      const others = prev.filter((c) => !selectedCloneIds.includes(c.id));
      return [...others, ...selected.map((s, i) => ({ ...s, zIndex: maxZIndex + 1000 + i }))];
    });
  }, [selectedCloneIds]);

  // Funcin para enviar los seleccionados al fondo
  const sendSelectedToBack = useCallback(() => {
    if (!selectedCloneIds || selectedCloneIds.length === 0) return;

    setClones((prev) => {
      const selected = prev.filter((c) => selectedCloneIds.includes(c.id));
      const others = prev.filter((c) => !selectedCloneIds.includes(c.id));
      return [...selected.map((s) => ({ ...s, zIndex: 1 })), ...others];
    });
  }, [selectedCloneIds]);

  // Funcin para aumentar el tamao de un elemento
  const handleIncreaseSize = useCallback(
    (iconId) => {
      if (!iconId) return;

      setClones((prev) =>
        prev.map((c) => {
          if (c.id === iconId) {
            // Para circle, rectangle, custom-shape: escalar puntos desde el centro
            if (
              (c.type === 'circle' || c.type === 'rectangle' || c.type === 'custom-shape') &&
              c.points &&
              c.points.length >= 2
            ) {
              const cx = c.points.reduce((s, p) => s + p.x, 0) / c.points.length;
              const cy = c.points.reduce((s, p) => s + p.y, 0) / c.points.length;
              const sf = 1.1;
              return {
                ...c,
                points: c.points.map((p) => ({
                  x: Math.max(0, Math.min(1, cx + (p.x - cx) * sf)),
                  y: Math.max(0, Math.min(1, cy + (p.y - cy) * sf)),
                })),
              };
            }

            // Para lneas/flechas, aumentamos el grosor
            if (
              c.type === 'straight-line' ||
              c.type === 'straight-arrow' ||
              c.type === 'curve-line' ||
              c.type === 'curve-arrow'
            ) {
              return {
                ...c,
                thickness: Math.min(20, (c.thickness || 2) + 1),
              };
            }

            // Para iconos y otros elementos, aumentamos el tamao (sin lmite mximo)
            return {
              ...c,
              size: (c.size || standardSize) + 2,
            };
          }
          return c;
        }),
      );
    },
    [standardSize],
  );

  // Funcin para disminuir el tamao de un elemento
  const handleDecreaseSize = useCallback(
    (iconId) => {
      if (!iconId) return;

      setClones((prev) =>
        prev.map((c) => {
          if (c.id === iconId) {
            // Para circle, rectangle, custom-shape: escalar puntos hacia el centro
            if (
              (c.type === 'circle' || c.type === 'rectangle' || c.type === 'custom-shape') &&
              c.points &&
              c.points.length >= 2
            ) {
              const cx = c.points.reduce((s, p) => s + p.x, 0) / c.points.length;
              const cy = c.points.reduce((s, p) => s + p.y, 0) / c.points.length;
              const sf = 0.9;
              const newPts = c.points.map((p) => ({
                x: Math.max(0, Math.min(1, cx + (p.x - cx) * sf)),
                y: Math.max(0, Math.min(1, cy + (p.y - cy) * sf)),
              }));
              // Verificar tamao mnimo
              const xs = newPts.map((p) => p.x);
              const ys = newPts.map((p) => p.y);
              const w = Math.max(...xs) - Math.min(...xs);
              const h = Math.max(...ys) - Math.min(...ys);
              if (w < 0.02 || h < 0.02) return c;
              return { ...c, points: newPts };
            }

            // Para lneas/flechas, disminuimos el grosor
            if (
              c.type === 'straight-line' ||
              c.type === 'straight-arrow' ||
              c.type === 'curve-line' ||
              c.type === 'curve-arrow'
            ) {
              return {
                ...c,
                thickness: Math.max(1, (c.thickness || 2) - 1),
              };
            }

            // Para iconos y otros elementos, disminuimos el tamao
            return {
              ...c,
              size: Math.max(10, (c.size || standardSize) - 2),
            };
          }
          return c;
        }),
      );
    },
    [standardSize],
  );

  // Funcin para bloquear/desbloquear un elemento
  const handleToggleLock = useCallback((iconId) => {
    if (!iconId) return;

    setClones((prev) =>
      prev.map((c) => {
        if (c.id === iconId) {
          const isLocking = c.locked !== true;
          return {
            ...c,
            locked: isLocking,
            zIndex: isLocking ? 1 : c.originalZIndex || getZIndexBaseForType(c.type),
            originalZIndex: isLocking ? c.zIndex || getZIndexBaseForType(c.type) : c.originalZIndex,
          };
        }
        return c;
      }),
    );
  }, []);

  // Funcin para subir un elemento a la primera capa (solo dentro de su grupo)
  const handleBringToFront = useCallback((iconId) => {
    if (!iconId) return;

    setClones((prev) => {
      const element = prev.find((c) => c.id === iconId);
      if (!element) return prev;

      const base = getZIndexBaseForType(element.type);
      // Filtrar solo elementos del mismo grupo de tipo
      const sameGroup = prev.filter((c) => getZIndexBaseForType(c.type) === base);
      const maxGroupZIndex = Math.max(...sameGroup.map((c) => c.zIndex || base), base);
      const newZIndex = maxGroupZIndex + 1;

      const withoutElement = prev.filter((c) => c.id !== iconId);
      return [...withoutElement, { ...element, zIndex: newZIndex }];
    });
  }, []);

  // Funcin para enviar un elemento al fondo (solo dentro de su grupo)
  const handleSendToBack = useCallback((iconId) => {
    if (!iconId) return;

    setClones((prev) => {
      const element = prev.find((c) => c.id === iconId);
      if (!element) return prev;

      const base = getZIndexBaseForType(element.type);
      // Filtrar solo elementos del mismo grupo de tipo
      const sameGroup = prev.filter(
        (c) => getZIndexBaseForType(c.type) === base && c.id !== iconId,
      );
      const minGroupZIndex =
        sameGroup.length > 0 ? Math.min(...sameGroup.map((c) => c.zIndex || base)) : base;
      const newZIndex = Math.max(minGroupZIndex - 1, base);

      const withoutElement = prev.filter((c) => c.id !== iconId);
      return [{ ...element, zIndex: newZIndex }, ...withoutElement];
    });
  }, []);

  // Funcin para desbloquear un elemento desde el panel de elementos bloqueados
  const handleUnlockFromPanel = useCallback((iconId) => {
    setClones((prev) =>
      prev.map((clone) =>
        clone.id === iconId
          ? {
              ...clone,
              locked: false,
              // Restaurar zIndex original o usar valor por defecto segn tipo
              zIndex: clone.originalZIndex || getZIndexBaseForType(clone.type),
            }
          : clone,
      ),
    );
  }, []);

  // 8. Funcin para renderizar lneas curvas directamente en SVG

  // 9. Funcin para renderizar custom-shape directamente en SVG
  function renderCustomShape({
    icon,
    imageWidth,
    imageHeight,
    selectedCloneId,
    selectedCloneIds = [],
    selectedCloneIdsSet,
    multiSelectMode = false,
  }) {
    if (!icon.points || icon.points.length < 2) return null;

    const originalWidth = icon.imageWidth || imageWidth;
    const originalHeight = icon.imageHeight || imageHeight;
    const widthRatio = imageWidth / originalWidth;
    const heightRatio = imageHeight / originalHeight;
    const scale = (widthRatio + heightRatio) / 2;

    // Transformar puntos relativos a coordenadas absolutas
    const pts = icon.points.map((p) => ({
      x: p.x * imageWidth,
      y: p.y * imageHeight,
    }));

    // Determinar si est seleccionado en modo multi-seleccin (O(1) con Set)
    const isMultiSelected =
      multiSelectMode &&
      (selectedCloneIdsSet ? selectedCloneIdsSet.has(icon.id) : selectedCloneIds.includes(icon.id));

    // Generar path para custom-shape (conectar todos los puntos)
    let pathData = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      pathData += ` L${pts[i].x},${pts[i].y}`;
    }
    // Cerrar el path si es un custom-shape completo
    if (icon.isCustomShapeComplete) {
      pathData += ' Z';
    }

    // Grosor reducido para lneas ms finas
    const thickness = (icon.thickness || 5) * scale * 0.7;

    // Crear elementos SVG para el custom-shape
    const customShapeElements = [];

    // Highlight for multi-selection
    if (isMultiSelected) {
      customShapeElements.push(
        <Path
          key={`custom-shape-highlight-${icon.id}`}
          d={pathData}
          stroke="#3498db"
          strokeWidth={thickness + 6}
          strokeOpacity={0.25}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />,
      );
    }

    // Lnea principal (con o sin punteado)
    const customShapeStrokeDasharray2 =
      icon.lineType === 'dotted' ? `${icon.dotSize || 2}, ${icon.dotSpacing || 4}` : null;

    customShapeElements.push(
      <Path
        key={`custom-shape-${icon.id}-${icon.color}-${thickness}-${icon.lineType || 'solid'}-${icon.dotSize || 2}-${icon.dotSpacing || 4}-${icon.fillColor || 'transparent'}`}
        d={pathData}
        stroke={isMultiSelected ? '#3498db' : icon.color}
        strokeWidth={thickness}
        strokeDasharray={customShapeStrokeDasharray2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />,
    );

    return customShapeElements;
  }

  const { width: canvasWidth, height: canvasHeight } = { width: imageWidth, height: imageHeight };

  // Cache de positionedClones para evitar recalcular todo en cada cambio de posicin
  const positionedClonesCache = useRef({ clones: [], result: [], clonesLength: 0 });

  // Memoizar el clculo y ordenamiento de clones para evitar recalcular en cada render
  const positionedClones = useMemo(() => {
    const cache = positionedClonesCache.current;

    // Forzar reclculo completo si la longitud cambi
    if (cache.clonesLength !== clones.length) {
      cache.clonesLength = clones.length;
      cache.clones = [];
      cache.result = [];
    }

    // Optimizacin: si solo cambi la posicin de un elemento (drag), actualizar solo ese
    // Pero si cambi ms de un elemento o propiedades distintas a posicin, recalcular todo
    if (cache.clones.length === clones.length && cache.result.length > 0) {
      let changedCount = 0;
      let changedIndex = -1;
      let onlyPositionChanged = true;

      for (let i = 0; i < clones.length; i++) {
        if (cache.clones[i] !== clones[i]) {
          changedCount++;
          changedIndex = i;

          // Verificar si solo cambi la posicin o si cambiaron otras propiedades
          if (changedCount === 1 && cache.clones[i]) {
            const oldClone = cache.clones[i];
            const newClone = clones[i];
            // Si cambiaron propiedades visuales (no solo posicin), forzar reclculo completo
            if (
              oldClone.color !== newClone.color ||
              oldClone.size !== newClone.size ||
              oldClone.thickness !== newClone.thickness ||
              oldClone.lineType !== newClone.lineType ||
              oldClone.fillColor !== newClone.fillColor ||
              oldClone.dotSize !== newClone.dotSize ||
              oldClone.dotSpacing !== newClone.dotSpacing ||
              oldClone.numberColor !== newClone.numberColor ||
              oldClone.textColor !== newClone.textColor ||
              oldClone.textBackgroundColor !== newClone.textBackgroundColor ||
              oldClone._lastUpdate !== newClone._lastUpdate
            ) {
              onlyPositionChanged = false;
            }
          }

          if (changedCount > 1) {
            onlyPositionChanged = false;
            break;
          }
        }
      }

      // Si solo cambi la posicin de un elemento (drag), actualizar solo ese
      if (changedCount === 1 && onlyPositionChanged) {
        const clone = clones[changedIndex];
        const coords = fromRatioCoords(
          clone.xRatio,
          clone.yRatio,
          canvasWidth,
          canvasHeight,
          viewMode,
        );

        const updatedResult = [...cache.result];
        const resultIndex = updatedResult.findIndex((r) => r.id === clone.id);

        if (resultIndex !== -1) {
          updatedResult[resultIndex] = {
            ...updatedResult[resultIndex],
            ...clone,
            x: coords.x,
            y: coords.y,
          };

          cache.clones = clones;
          cache.result = updatedResult;
          return updatedResult;
        }
      }
      // Si cambiaron propiedades visuales o mltiples elementos, continuar para recalcular todo
    }

    // Sin lmite artificial - manejar cualquier cantidad de elementos

    // Calcular z-index de manera optimizada
    const clonesWithZIndex = clones.map((clone, originalIndex) => {
      const isLineType = LINE_TYPES_SET.has(clone.type);
      const isMaterialType = MATERIAL_TYPES_SET.has(clone.type);
      const coords = fromRatioCoords(
        clone.xRatio,
        clone.yRatio,
        canvasWidth,
        canvasHeight,
        viewMode,
      );

      // Calcular zIndex: usar el zIndex asignado en creacin, con fallbacks
      let zIndex;
      if (clone.locked === true) {
        zIndex = 1;
      } else if (selectedCloneId === clone.id) {
        // Seleccionado siempre encima de todo
        zIndex = 99999;
      } else if (clone.zIndex) {
        zIndex = clone.zIndex;
      } else {
        // Fallback para elementos legacy sin zIndex asignado
        if (isLineType) zIndex = ZINDEX_BASE_LINES;
        else if (isMaterialType) zIndex = ZINDEX_BASE_MATERIALS;
        else zIndex = ZINDEX_BASE_ICONS;
      }

      return {
        ...clone,
        calculatedZIndex: zIndex,
        isLineType,
        x: coords.x,
        y: coords.y,
        originalIndex,
      };
    });

    // Ordenar solo si es necesario
    const sorted = clonesWithZIndex.sort((a, b) => a.calculatedZIndex - b.calculatedZIndex);

    // Guardar en cache
    positionedClonesCache.current.clones = clones;
    positionedClonesCache.current.result = sorted;

    return sorted;
  }, [clones, selectedCloneId, canvasWidth, canvasHeight, viewMode]);

  // Helper: check if a clone is visible in the current viewport
  // Elements being actively dragged are always visible (so gesture handlers survive for delete-on-drop)
  const isCloneVisible = useCallback(
    (clone) => {
      if (!viewMode || viewMode === 'entire') return true;
      // Keep elements visible while being dragged (prevents gesture handler unmount mid-drag)
      const isDragged =
        Object.values(dragStart.current).some(
          (v) =>
            v?.id === clone.id ||
            (v?.selectedIds && Array.isArray(v.selectedIds) && v.selectedIds.includes(clone.id)),
        ) ||
        dragStart.current[clone.id] !== undefined ||
        (elementDragState.current &&
          (elementDragState.current.primaryId === clone.id ||
            (elementDragState.current.selectedIds &&
              Array.isArray(elementDragState.current.selectedIds) &&
              elementDragState.current.selectedIds.includes(clone.id))));
      if (isDragged) return true;
      // Lines/shapes: visible if ANY point is in viewport
      if (clone.points && Array.isArray(clone.points) && clone.points.length >= 2) {
        return clone.points.some((p) => isVisibleInView(p.x, p.y, viewMode));
      }
      // Point elements: visible if position is in viewport
      if (clone.xRatio !== undefined && clone.yRatio !== undefined) {
        return isVisibleInView(clone.xRatio, clone.yRatio, viewMode);
      }
      return true;
    },
    [viewMode],
  );

  // Memoizar textos libres con virtualizaci�n optimizada
  const freeTextElements = useMemo(() => {
    const textClones = positionedClones.filter(
      (clone) => clone.type === 'free-text' && isCloneVisible(clone),
    );

    // Si hay muy pocos elementos, retornar todos sin virtualizaci�n
    if (textClones.length < 30) {
      return textClones;
    }

    // Virtualizaci�n con c�lculo m�s r�pido
    const MARGIN = 150;
    const minX = -MARGIN;
    const maxX = imageWidth + MARGIN;
    const minY = -MARGIN;
    const maxY = imageHeight + MARGIN;
    const size = 100;

    return textClones.filter((clone) => {
      const display =
        clone.xRatio !== undefined && clone.yRatio !== undefined
          ? ratioToDisplay(clone.xRatio, clone.yRatio, viewMode, imageWidth, imageHeight)
          : { x: clone.x || 0, y: clone.y || 0 };
      const x = display.x;
      const y = display.y;
      return x + size >= minX && x - size <= maxX && y + size >= minY && y - size <= maxY;
    });
  }, [positionedClones, imageWidth, imageHeight, viewMode, isCloneVisible]);

  // Memoizar elementos de herramientas/materiales (se renderizan en capa inferior)
  const materialElements = useMemo(() => {
    return positionedClones.filter(
      (clone) => MATERIAL_TYPES_SET.has(clone.type) && isCloneVisible(clone),
    );
  }, [positionedClones, isCloneVisible]);

  // Memoizar elementos regulares con virtualizaci�n optimizada (sin materiales ni texto)
  const regularElements = useMemo(() => {
    const nonTextClones = positionedClones.filter(
      (clone) =>
        clone.type !== 'free-text' && !MATERIAL_TYPES_SET.has(clone.type) && isCloneVisible(clone),
    );

    // Si hay pocos elementos, retornar todos sin virtualizaci�n
    if (nonTextClones.length < 30) {
      return nonTextClones;
    }

    // Virtualizaci�n con c�lculo m�s r�pido
    const MARGIN = 150;
    const minX = -MARGIN;
    const maxX = imageWidth + MARGIN;
    const minY = -MARGIN;
    const maxY = imageHeight + MARGIN;

    return nonTextClones.filter((clone) => {
      const x = clone.x || 0;
      const y = clone.y || 0;
      const size = (clone.size || standardSize) * 3;
      return x + size >= minX && x - size <= maxX && y + size >= minY && y - size <= maxY;
    });
  }, [positionedClones, imageWidth, imageHeight, standardSize, isCloneVisible]);

  // OPTIMIZACIÓN: Arrays separados para l�neas rectas y curvas (para BatchLinesRenderer)
  const straightLines = useMemo(() => {
    return positionedClones.filter(
      (clone) =>
        (clone.type === 'straight-line' || clone.type === 'straight-arrow') &&
        isCloneVisible(clone),
    );
  }, [positionedClones, isCloneVisible]);

  const curveLines = useMemo(() => {
    return positionedClones.filter(
      (clone) =>
        (clone.type === 'curve-line' || clone.type === 'curve-arrow') && isCloneVisible(clone),
    );
  }, [positionedClones, isCloneVisible]);

  // OPTIMIZACIÓN: Arrays separados para figuras geom�tricas (para BatchShapesRenderer)
  const circleElements = useMemo(() => {
    return positionedClones.filter((clone) => clone.type === 'circle' && isCloneVisible(clone));
  }, [positionedClones, isCloneVisible]);

  const rectangleElements = useMemo(() => {
    return positionedClones.filter((clone) => clone.type === 'rectangle' && isCloneVisible(clone));
  }, [positionedClones, isCloneVisible]);

  const customShapeElements = useMemo(() => {
    return positionedClones.filter(
      (clone) =>
        clone.type === 'custom-shape' && clone.isCustomShapeComplete && isCloneVisible(clone),
    );
  }, [positionedClones, isCloneVisible]);

  // OPTIMIZACIÓN: Memoizar elementos de l�nea para BatchSvgRenderer

  // OPTIMIZACIÓN: Escala memoizada
  const renderScale = useMemo(() => {
    return Math.min(imageWidth, imageHeight) / 500;
  }, [imageWidth, imageHeight]);

  // OPTIMIZACIÓN: Verificar si hay alg�n modo de dibujo activo (incluye eraserMode)
  const isAnyDrawingMode = useMemo(() => {
    return (
      drawingStraightArrow ||
      drawingStraightLine ||
      drawingCurveArrow ||
      drawingCurveLine ||
      drawingCircle ||
      drawingRectangle ||
      drawingCustomShape ||
      eraserMode
    );
  }, [
    drawingStraightArrow,
    drawingStraightLine,
    drawingCurveArrow,
    drawingCurveLine,
    drawingCircle,
    drawingRectangle,
    drawingCustomShape,
    eraserMode,
  ]);

  const handleApplyEdit = (iconEdited, applyToAll = false) => {
    // Asegurarse de que el grosor se convierta a n�mero
    if (iconEdited.thickness && typeof iconEdited.thickness === 'string') {
      iconEdited.thickness = parseInt(iconEdited.thickness) || 2;
    }

    if (applyToAll) {
      // Aplicar cambios a todos los elementos del mismo tipo
      // Criterios para "mismo tipo":
      // 1. Para jugadores de equipo (playerData): mismo tipo + mismo estilo (color de paleta)
      // 2. Para jugadores sin nombre: mismo paletteIndex
      // 3. Para l�neas/flechas/figuras: mismo tipo (type)
      // 4. Para materiales: mismo tipo (type)

      setClones((prev) =>
        prev.map((cl) => {
          let shouldApply = false;

          // Para jugadores de equipo con playerData
          if (iconEdited.playerData && cl.playerData) {
            // Aplicar a todos los jugadores de equipo
            shouldApply = true;
          }
          // Para jugadores de paleta (icon1, icon2, icon3) - mismo paletteIndex
          else if (
            iconEdited.type === 'player' &&
            cl.type === 'player' &&
            !iconEdited.playerData &&
            !cl.playerData
          ) {
            // Usar paletteIndex si existe, o comparar el ID base
            if (
              typeof iconEdited.paletteIndex === 'number' &&
              cl.paletteIndex === iconEdited.paletteIndex
            ) {
              shouldApply = true;
            }
          }
          // Para l�neas, flechas, c�rculos, rect�ngulos y figuras - mismo type
          else if (
            [
              'straight-arrow',
              'straight-line',
              'curve-arrow',
              'curve-line',
              'circle',
              'rectangle',
              'custom-shape',
            ].includes(iconEdited.type)
          ) {
            if (cl.type === iconEdited.type) {
              shouldApply = true;
            }
          }
          // Para materiales - mismo type
          else if (
            [
              'cone',
              'cone-pro',
              'cone-flat',
              'ring',
              'dummy',
              'barrier',
              'pole',
              'goal',
              'goal-large',
              'goal-small',
              'ball',
              'ladder',
            ].includes(iconEdited.type)
          ) {
            if (cl.type === iconEdited.type) {
              shouldApply = true;
            }
          }

          if (shouldApply) {
            // Aplicar todos los cambios relevantes - crear nuevo objeto para forzar re-render
            return {
              ...cl,
              color: iconEdited.color !== undefined ? iconEdited.color : cl.color,
              size: iconEdited.size !== undefined ? iconEdited.size : cl.size,
              thickness: iconEdited.thickness !== undefined ? iconEdited.thickness : cl.thickness,
              lineType: iconEdited.lineType !== undefined ? iconEdited.lineType : cl.lineType,
              dotSize: iconEdited.dotSize !== undefined ? iconEdited.dotSize : cl.dotSize,
              dotSpacing:
                iconEdited.dotSpacing !== undefined ? iconEdited.dotSpacing : cl.dotSpacing,
              fillColor: iconEdited.fillColor !== undefined ? iconEdited.fillColor : cl.fillColor,
              numberColor:
                iconEdited.numberColor !== undefined ? iconEdited.numberColor : cl.numberColor,
              backgroundColor:
                iconEdited.backgroundColor !== undefined
                  ? iconEdited.backgroundColor
                  : cl.backgroundColor,
              isNeutral: iconEdited.isNeutral !== undefined ? iconEdited.isNeutral : cl.isNeutral,
              shape: iconEdited.shape !== undefined ? iconEdited.shape : cl.shape,
              hasStripes:
                iconEdited.hasStripes !== undefined ? iconEdited.hasStripes : cl.hasStripes,
              hasBib: iconEdited.hasBib !== undefined ? iconEdited.hasBib : cl.hasBib,
              bibColor: iconEdited.bibColor !== undefined ? iconEdited.bibColor : cl.bibColor,
              stripeColor:
                iconEdited.stripeColor !== undefined ? iconEdited.stripeColor : cl.stripeColor,
              goalkeeperStripeColor:
                iconEdited.goalkeeperStripeColor !== undefined
                  ? iconEdited.goalkeeperStripeColor
                  : cl.goalkeeperStripeColor,
              textColor: cl.playerData
                ? iconEdited.textColor !== undefined
                  ? iconEdited.textColor
                  : cl.textColor
                : cl.textColor,
              textBackgroundColor: cl.playerData
                ? iconEdited.textBackgroundColor !== undefined
                  ? iconEdited.textBackgroundColor
                  : cl.textBackgroundColor
                : cl.textBackgroundColor,
              // Forzar actualizaci�n a�adiendo timestamp
              _lastUpdate: Date.now(),
            };
          }

          // Para el elemento actual, aplicar todos los cambios incluso si no coincide el criterio general
          if (cl.id === iconEdited.id) {
            return {
              ...cl,
              ...iconEdited,
              lineType: iconEdited.lineType !== undefined ? iconEdited.lineType : cl.lineType,
              dotSize: iconEdited.dotSize !== undefined ? iconEdited.dotSize : cl.dotSize,
              dotSpacing:
                iconEdited.dotSpacing !== undefined ? iconEdited.dotSpacing : cl.dotSpacing,
              fillColor: iconEdited.fillColor !== undefined ? iconEdited.fillColor : cl.fillColor,
              _lastUpdate: Date.now(),
            };
          }
          return cl;
        }),
      );
    } else {
      // Solo aplicar al elemento actual - asegurar que todas las propiedades se copien
      setClones((prev) =>
        prev.map((cl) => {
          if (cl.id === iconEdited.id) {
            return {
              ...cl,
              ...iconEdited,
              // Asegurar que estas propiedades se copien expl�citamente
              lineType: iconEdited.lineType !== undefined ? iconEdited.lineType : cl.lineType,
              dotSize: iconEdited.dotSize !== undefined ? iconEdited.dotSize : cl.dotSize,
              dotSpacing:
                iconEdited.dotSpacing !== undefined ? iconEdited.dotSpacing : cl.dotSpacing,
              fillColor: iconEdited.fillColor !== undefined ? iconEdited.fillColor : cl.fillColor,
            };
          }
          return cl;
        }),
      );
    }

    setLeftPanelVisible(false);
    if (iconEdited.type === 'player' && iconEdited.number && !isNeutralPlayerIcon(iconEdited)) {
      const nextNum = parseInt(iconEdited.number, 10) + 1;
      if (!isNaN(nextNum) && nextNum > iconCounters.current[iconEdited.id]) {
        iconCounters.current[iconEdited.id] = nextNum;
        setPaletteIcons((prev) =>
          prev.map((ic) =>
            ic.id === iconEdited.id ? { ...ic, number: iconCounters.current[iconEdited.id] } : ic,
          ),
        );
      }
    }
  };

  const handlePaletteIconEdit = (iconEdited) => {
    // Si es un jugador de equipo (isPalettePlayer o tiene playerData), no actualizar paletteIcons
    if (iconEdited.isPalettePlayer || iconEdited.playerData) {
      // Actualizar teamPlayerStyle en su lugar
      if (iconEdited.type === 'player') {
        setTeamPlayerStyle((prev) => ({
          ...prev,
          color: iconEdited.color !== undefined ? iconEdited.color : prev.color,
          size: iconEdited.size !== undefined ? iconEdited.size : prev.size,
          numberColor:
            iconEdited.numberColor !== undefined ? iconEdited.numberColor : prev.numberColor,
          textColor: iconEdited.textColor !== undefined ? iconEdited.textColor : prev.textColor,
          textBackgroundColor:
            iconEdited.textBackgroundColor !== undefined
              ? iconEdited.textBackgroundColor
              : prev.textBackgroundColor,
          shape: iconEdited.shape !== undefined ? iconEdited.shape : prev.shape,
          hasStripes: iconEdited.hasStripes !== undefined ? iconEdited.hasStripes : prev.hasStripes,
          hasBib: iconEdited.hasBib !== undefined ? iconEdited.hasBib : prev.hasBib,
          bibColor: iconEdited.bibColor !== undefined ? iconEdited.bibColor : prev.bibColor,
          stripeColor:
            iconEdited.stripeColor !== undefined ? iconEdited.stripeColor : prev.stripeColor,
          goalkeeperStripeColor:
            iconEdited.goalkeeperStripeColor !== undefined
              ? iconEdited.goalkeeperStripeColor
              : prev.goalkeeperStripeColor,
        }));
      }
      // Cerrar paneles
      setPaletteEdit({ visible: false, icon: null, paletteIndex: null });
      setLeftPanelVisible(false);
      return;
    }

    // SOLO actualizar la paleta, NO modificar los elementos ya pintados en el campo
    setPaletteIcons((prev) =>
      prev.map((ic, idx) => {
        if (idx === iconEdited.paletteIndex) {
          // Para jugadores sin nombre, aplicar color, tama�o y n�mero
          if (iconEdited.type === 'player') {
            const editedIsNeutral =
              iconEdited.isNeutral === true || ic.isNeutral === true || ic.id === 'neutral-player';
            // Actualizar el n�mero si se ha proporcionado uno nuevo
            const newNumber = editedIsNeutral
              ? 'N'
              : iconEdited.number !== undefined && iconEdited.number !== ''
                ? parseInt(iconEdited.number, 10)
                : ic.number;

            // Actualizar tambi�n el contador de iconos para que los siguientes jugadores
            // contin�en desde este n�mero
            if (!editedIsNeutral && !isNaN(newNumber) && newNumber > 0) {
              iconCounters.current[ic.id] = newNumber;
            }

            return {
              ...ic,
              color: iconEdited.color,
              size: iconEdited.size,
              numberColor: iconEdited.numberColor || ic.numberColor,
              number: editedIsNeutral ? 'N' : isNaN(newNumber) ? ic.number : newNumber,
              backgroundColor:
                iconEdited.backgroundColor !== undefined
                  ? iconEdited.backgroundColor
                  : ic.backgroundColor,
              isNeutral: editedIsNeutral,
              shape: iconEdited.shape || ic.shape,
              hasStripes:
                iconEdited.hasStripes !== undefined ? iconEdited.hasStripes : ic.hasStripes,
              hasBib: iconEdited.hasBib !== undefined ? iconEdited.hasBib : ic.hasBib,
              bibColor: iconEdited.bibColor !== undefined ? iconEdited.bibColor : ic.bibColor,
              stripeColor: iconEdited.stripeColor || ic.stripeColor,
              goalkeeperStripeColor: iconEdited.goalkeeperStripeColor || ic.goalkeeperStripeColor,
            };
          }
          // Para otros tipos, aplicar todo (incluyendo lineType, fillColor y par�metros de punto)
          return {
            ...ic,
            color: iconEdited.color,
            size: iconEdited.size,
            thickness: iconEdited.thickness,
            number: iconEdited.number,
            fillColor: iconEdited.fillColor !== undefined ? iconEdited.fillColor : ic.fillColor,
            lineType: iconEdited.lineType !== undefined ? iconEdited.lineType : ic.lineType,
            dotSize: iconEdited.dotSize !== undefined ? iconEdited.dotSize : ic.dotSize,
            dotSpacing: iconEdited.dotSpacing !== undefined ? iconEdited.dotSpacing : ic.dotSpacing,
          };
        }
        return ic;
      }),
    );

    // Si el icono editado corresponde con el que est� seleccionado para dibujar (pendingLineAction),
    // actualizar tambi�n pendingLineAction y los estados relevantes para que el siguiente dibujo use
    // la Configuraci�n reci�n aplicada.
    if (
      typeof iconEdited.paletteIndex === 'number' &&
      pendingLineAction &&
      pendingLineAction.paletteIndex === iconEdited.paletteIndex
    ) {
      // Actualizar pendingLineAction.icon con los nuevos valores (sin eliminar otras propiedades)
      setPendingLineAction((prev) =>
        prev
          ? {
              ...prev,
              icon: {
                ...prev.icon,
                color: iconEdited.color !== undefined ? iconEdited.color : prev.icon?.color,
                thickness:
                  iconEdited.thickness !== undefined ? iconEdited.thickness : prev.icon?.thickness,
                fillColor:
                  iconEdited.fillColor !== undefined ? iconEdited.fillColor : prev.icon?.fillColor,
                lineType:
                  iconEdited.lineType !== undefined ? iconEdited.lineType : prev.icon?.lineType,
                dotSize: iconEdited.dotSize !== undefined ? iconEdited.dotSize : prev.icon?.dotSize,
                dotSpacing:
                  iconEdited.dotSpacing !== undefined
                    ? iconEdited.dotSpacing
                    : prev.icon?.dotSpacing,
              },
            }
          : prev,
      );

      // Sincronizar estados globales usados al crear shapes SOLO si el tipo pendiente corresponde
      // a un tipo que debe afectar los estilos globales (no aplicar a custom-shape)
      const GLOBAL_STYLE_TYPES = [
        'straight-arrow',
        'straight-line',
        'curve-arrow',
        'curve-line',
        'circle',
        'rectangle',
      ];
      if (GLOBAL_STYLE_TYPES.includes(pendingLineAction?.type)) {
        if (iconEdited.lineType !== undefined) setLineType(iconEdited.lineType);
        if (iconEdited.dotSize !== undefined) setDotSize(iconEdited.dotSize);
        if (iconEdited.dotSpacing !== undefined) setDotSpacing(iconEdited.dotSpacing);
        if (iconEdited.thickness !== undefined) setArrowThickness(iconEdited.thickness);
      }
    }

    if (
      typeof iconEdited.paletteIndex === 'number' &&
      pendingPlacementAction &&
      pendingPlacementAction.paletteIndex === iconEdited.paletteIndex
    ) {
      setPendingPlacementAction((prev) =>
        prev
          ? {
              ...prev,
              clone: {
                ...prev.clone,
                color: iconEdited.color !== undefined ? iconEdited.color : prev.clone?.color,
                size: iconEdited.size !== undefined ? iconEdited.size : prev.clone?.size,
                numberColor:
                  iconEdited.numberColor !== undefined
                    ? iconEdited.numberColor
                    : prev.clone?.numberColor,
                backgroundColor:
                  iconEdited.backgroundColor !== undefined
                    ? iconEdited.backgroundColor
                    : prev.clone?.backgroundColor,
                isNeutral:
                  iconEdited.isNeutral !== undefined ? iconEdited.isNeutral : prev.clone?.isNeutral,
                shape: iconEdited.shape !== undefined ? iconEdited.shape : prev.clone?.shape,
                hasStripes:
                  iconEdited.hasStripes !== undefined
                    ? iconEdited.hasStripes
                    : prev.clone?.hasStripes,
                hasBib: iconEdited.hasBib !== undefined ? iconEdited.hasBib : prev.clone?.hasBib,
                bibColor:
                  iconEdited.bibColor !== undefined ? iconEdited.bibColor : prev.clone?.bibColor,
                stripeColor:
                  iconEdited.stripeColor !== undefined
                    ? iconEdited.stripeColor
                    : prev.clone?.stripeColor,
                goalkeeperStripeColor:
                  iconEdited.goalkeeperStripeColor !== undefined
                    ? iconEdited.goalkeeperStripeColor
                    : prev.clone?.goalkeeperStripeColor,
                _lastUpdate: Date.now(),
              },
            }
          : prev,
      );
    }

    // NO actualizar los clones ya pintados - cada elemento mantiene sus propiedades originales
    // Los cambios en la paleta solo afectan a los nuevos elementos que se dibujen

    if (iconEdited.type === 'player' && iconEdited.number) {
      const nextNum = parseInt(iconEdited.number, 10);
      if (!isNaN(nextNum)) {
        iconCounters.current[iconEdited.id] = nextNum;
      }
    }

    // Cerrar ambos paneles posibles
    setPaletteEdit({ visible: false, icon: null, paletteIndex: null });
    setLeftPanelVisible(false);
  };

  // 10. A�adir el componente LineStyleModal - MEJORADO con color, grosor y relleno

  // Solo ocultar TODOS los botones cuando hay modales que realmente lo requieren
  const shouldHideFloatingButtons =
    settingsPanelVisible ||
    lockedElementsVisible ||
    leftPanelVisible ||
    textEditPanel.visible ||
    paletteEdit.visible ||
    carouselModalVisible ||
    lineStyleModalVisible;

  // Ocultar solo botones inferiores cuando la paleta o zoom est� visible
  const shouldHideBottomButtons = paletteVisible || zoomVisible;

  const {
    LineStyleModal,
    TeamPlayerSettingsModal,
    TeamPlayersModal,
    FloatingButtons,
    SlidingPlayersPalette,
    SlidingMaterialsPalette,
    SlidingStaffPalette,
    SlidingPalette,
    SlidingZoomControls,
  } = createFieldUiComponents({
    Alert,
    Animated,
    Circle,
    DEFAULT_PLAYER_ICON_SIZE,
    Dimensions,
    Feather,
    Image,
    Ionicons,
    LongPressGestureHandler,
    MaterialCommunityIcons,
    MaterialIcons,
    MemoizedIcon,
    MiniColorPickerModal,
    Modal,
    NEUTRAL_PLAYER_COLORS,
    Path,
    Pressable,
    React,
    Rect,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    SafeAreaView,
    ScrollView,
    State,
    StyleSheet,
    Svg,
    Switch,
    Text,
    TouchableOpacity,
    View,
    bringSelectedToFront,
    cdnUrl,
    clearSelection,
    clones,
    deleteSelectedElements,
    duplicateSelectedElements,
    formationSettings,
    getMaterialsIcons,
    getPlayerFullName,
    handleCancelar,
    isEditingVideo,
    rotateSelectedElements,
    safeArea,
    sendSelectedToBack,
    styles,
    t,
    toggleLockSelected,
    useEffect,
    useMemo,
    useRef,
    useSafeAreaInsets,
    useScreenDimensions,
    useState,
    useTranslation,
  });

  return (
    <SafeAreaView
      edges={[]}
      style={{
        flex: 1,
        backgroundColor: '#4a8c3f',
      }}
    >
      <View
        ref={containerRef}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          backgroundColor: '#4a8c3f',
          position: 'relative',
          touchAction: isMobile ? 'none' : 'auto',
          overflow: 'hidden',
          paddingRight: 0,
        }}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#4a8c3f"
          translucent={false}
          hidden={isMobile} // Ocultar barra de estado en m�vil para m�s espacio
        />

        {/* Llamada como funci�n (no JSX) para evitar que React trate
              FloatingButtons como un "tipo de componente nuevo" en cada
              render "� al estar definido dentro de Field, su identidad
              cambia cada render y montar/desmontar TouchableOpacity hac�a
              que el primer click no llegara a disparar onPress. */}
        {FloatingButtons({
          visible: !shouldHideFloatingButtons,
          hideBottomButtons: shouldHideBottomButtons,
          sandbox,
          isSetPieceOrStrategy,
          onSave: handleGuardarGrafico,
          onCancel: handleCancelar,
          onSettings: () => {
            setVideoRecorderVisible(false);
            setSettingsPanelVisible(true);
          },
          onLocked: () => {
            setVideoRecorderVisible(false);
            setLockedElementsVisible(true);
          },
          onChangeField: () => {
            setVideoRecorderVisible(false);
            openCarouselModal();
          },
          onTogglePalette: () => {
            // Permitir abrir/cerrar la paleta tambi�n con el VideoRecorder
            // visible: el usuario quiere a�adir/seleccionar iconos sin
            // tener que cerrar la grabadora previamente.
            setPaletteVisible(!paletteVisible);
          },
          onToggleZoom: () => {
            if (!videoRecorderVisible) setZoomVisible(!zoomVisible);
          },
          onVideoRecorder: handleOpenVideoRecorder,
          onFormations: () => setFormationModalVisible(true),
          onToggleMultiSelect: handleToggleMultiSelect,
          onUndo: undo,
          onRedo: redo,
          canUndo,
          canRedo,
          multiSelectMode,
          selectedCloneIds,
          selectionInteractionMode,
          toggleSelectionInteractionMode,
          lockedCount: clones.filter((c) => c.locked === true).length,
          isMobile,
        })}

        {/* Bot�n de deseleccionar herramienta de dibujo - siempre visible */}
        {(drawingStates.drawingStraightArrow ||
          drawingStates.drawingStraightLine ||
          drawingStates.drawingCurveLine ||
          drawingStates.drawingCurveArrow ||
          drawingStates.drawingCircle ||
          drawingStates.drawingRectangle ||
          drawingStates.drawingCustomShape ||
          drawingStates.pendingPlacementAction) && (
          <TouchableOpacity
            onPress={handleDeselectDrawingTool}
            style={{
              position: 'absolute',
              top: (isMobile ? 58 : 82) + safeArea.top,
              right: (isMobile ? 12 : 24) + safeArea.right,
              minWidth: isMobile ? 42 : 54,
              height: isMobile ? 36 : 42,
              borderRadius: 999,
              paddingHorizontal: isMobile ? 10 : 14,
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              zIndex: 1000,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.18,
              shadowRadius: 8,
              elevation: 8,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.22)',
            }}
          >
            <MaterialCommunityIcons
              name="cursor-default-click"
              size={isMobile ? 18 : 22}
              color="#ffffff"
            />
          </TouchableOpacity>
        )}

        <View
          style={{
            position: 'absolute',
            top: isMobile ? safeArea.top : 0,
            left: isMobile ? safeArea.left : 0,
            right: isMobile ? safeArea.right : 0,
            bottom: isMobile ? safeArea.bottom : 0,
            flexDirection: showPlayersSidebar ? 'row' : 'column',
            alignItems: 'stretch',
            justifyContent: 'center',
            overflow: 'visible',
          }}
        >
          <View
            style={{
              flex: 1,
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible', // Permitir ver elementos fuera del campo
            }}
          >
            <View
              style={[
                styles.canvasHolder,
                {
                  width: imageWidth,
                  height: imageHeight,
                  alignSelf: 'center',
                  flex: 0,
                  backgroundColor: 'transparent',
                  marginBottom: isMobile ? 4 : 8,
                  overflow: 'visible',
                  touchAction: isMobile ? 'none' : 'auto',
                  transform: isMobile
                    ? [
                        {
                          translateY: -24,
                        },
                      ]
                    : undefined,
                },
              ]}
            >
              <View
                style={{
                  position: 'absolute',
                  left: -10000,
                  top: 0,
                  width: referenceWidth,
                  height: referenceHeight,
                }}
              >
                <ViewShot
                  ref={fieldBaseRef}
                  options={FIELD_CAPTURE_OPTIONS}
                  style={{
                    width: referenceWidth,
                    height: referenceHeight,
                    backgroundColor: FIELD_CAPTURE_BACKGROUND,
                  }}
                >
                  <FieldSVGRenderer
                    lineType={fieldLineType}
                    viewMode={viewMode}
                    width={referenceWidth}
                    height={referenceHeight}
                    clipIdPrefix="capture-"
                  />
                </ViewShot>
              </View>

              <View
                style={{
                  width: imageWidth,
                  height: imageHeight,
                  overflow: 'visible',
                  transform: [
                    {
                      scale: zoomLevel,
                    },
                    {
                      translateX: panOffset.x,
                    },
                    {
                      translateY: panOffset.y,
                    },
                  ],
                }}
              >
                <ViewShot
                  ref={(ref) => {
                    canvasRef.current = ref;
                    fieldRef.current = ref;
                  }}
                  options={FIELD_CAPTURE_OPTIONS}
                  style={{
                    width: imageWidth,
                    height: imageHeight,
                    backgroundColor: FIELD_CAPTURE_BACKGROUND,
                  }}
                >
                  <View
                    style={{
                      width: imageWidth,
                      height: imageHeight,
                      overflow: 'visible',
                      backgroundColor: FIELD_CAPTURE_BACKGROUND,
                    }}
                  >
                    <View
                      style={{
                        width: imageWidth,
                        height: imageHeight,
                        backgroundColor: FIELD_CAPTURE_BACKGROUND,
                        opacity: fieldImageReady ? 1 : 0,
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        WebkitTouchCallout: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        touchAction: 'none',
                        zIndex: multiSelectMode
                          ? 9999
                          : drawingStraightArrow ||
                              drawingStraightLine ||
                              drawingCircle ||
                              drawingRectangle ||
                              drawingCurveLine ||
                              drawingCurveArrow ||
                              drawingCustomShape ||
                              eraserMode ||
                              pendingPlacementAction
                            ? 9999
                            : 0,
                      }}
                      onStartShouldSetResponder={() => true}
                      onMoveShouldSetResponder={() => {
                        return (
                          eraserMode ||
                          drawingStraightArrow ||
                          drawingStraightLine ||
                          drawingCircle ||
                          drawingRectangle ||
                          drawingCurveLine ||
                          drawingCurveArrow ||
                          drawingCustomShape ||
                          pendingPlacementAction
                        );
                      }}
                      onResponderGrant={(e) => {
                        const { locationX, locationY } = e.nativeEvent;
                        fieldTouchStartRef.current = {
                          x: locationX,
                          y: locationY,
                          timestamp: Date.now(),
                        };
                        if (pendingPlacementAction) {
                          handlePendingPlacementOnField(e);
                          fieldTouchStartRef.current = null;
                          return;
                        }
                        if (eraserMode) {
                          handleEraserStart(e);
                          return;
                        }
                        if (
                          drawingStraightArrow ||
                          drawingStraightLine ||
                          drawingCircle ||
                          drawingRectangle
                        ) {
                          handleStraightLineDrawStart(e);
                        } else if (drawingCurveLine || drawingCurveArrow) {
                          handleCurveDrawStart(e);
                        } else if (drawingCustomShape) {
                          handleCustomShapeStart(e);
                        } else {
                          handleElementDragStart(e);
                        }
                      }}
                      onResponderMove={(e) => {
                        if (pendingPlacementAction) {
                          return;
                        }
                        if (eraserMode) {
                          handleEraserMove(e);
                          return;
                        }
                        if (
                          drawingStraightArrow ||
                          drawingStraightLine ||
                          drawingCircle ||
                          drawingRectangle
                        ) {
                          handleStraightLineDrawMove(e);
                        } else if (drawingCurveLine || drawingCurveArrow) {
                          handleCurveDrawMove(e);
                        } else if (drawingCustomShape) {
                          handleCustomShapeMove(e);
                        } else {
                          handleElementDragMove(e);
                        }
                      }}
                      onResponderRelease={(e) => {
                        if (pendingPlacementAction) {
                          fieldTouchStartRef.current = null;
                          return;
                        }
                        if (eraserMode) {
                          handleEraserEnd();
                          fieldTouchStartRef.current = null;
                          return;
                        }
                        if (
                          drawingStraightArrow ||
                          drawingStraightLine ||
                          drawingCircle ||
                          drawingRectangle
                        ) {
                          handleStraightLineDrawEnd(e);
                          fieldTouchStartRef.current = null;
                          return;
                        }
                        if (drawingCurveLine || drawingCurveArrow) {
                          handleCurveDrawEnd(e);
                          fieldTouchStartRef.current = null;
                          return;
                        }
                        if (drawingCustomShape) {
                          handleCustomShapeEnd(e);
                          fieldTouchStartRef.current = null;
                          return;
                        }
                        handleElementDragEnd(e);

                        // Detectar tap (toque corto sin movimiento) para selecci�n/deselecci�n
                        if (fieldTouchStartRef.current) {
                          const touchX = e.nativeEvent.locationX;
                          const touchY = e.nativeEvent.locationY;
                          const dx = touchX - fieldTouchStartRef.current.x;
                          const dy = touchY - fieldTouchStartRef.current.y;
                          const dist = Math.sqrt(dx * dx + dy * dy);
                          if (dist < 15) {
                            const tappedClone = findInteractiveCloneAtPosition(touchX, touchY);
                            if (tappedClone) {
                              if (!multiSelectMode) setSelectedCloneId(tappedClone.id);
                            } else {
                              const timeSinceLastSelection =
                                Date.now() - boardInteractionState.iconSelectionTime;
                              if (timeSinceLastSelection > 100) setSelectedCloneId(null);
                            }
                          }
                        }
                        fieldTouchStartRef.current = null;
                      }}
                      onResponderTerminate={() => {
                        if (eraserMode) handleEraserEnd();
                        releaseElementDragLock();
                        elementDragState.current = null;
                        setDraggingOutside(false);
                        fieldTouchStartRef.current = null;
                      }}
                    >
                      <View
                        style={{
                          width: imageWidth,
                          height: imageHeight,
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          zIndex: 1,
                        }}
                        pointerEvents="none"
                      >
                        <FieldSVGRenderer
                          lineType={fieldLineType}
                          viewMode={viewMode}
                          width={imageWidth}
                          height={imageHeight}
                          clipIdPrefix="visible-"
                        />
                      </View>

                      <Svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: imageWidth,
                          height: imageHeight,
                          zIndex: 200,
                        }}
                        pointerEvents="none"
                      >
                        {/* OPTIMIZACIÓN: Ya no iteramos sobre positionedClones para SVG */}
                        {/* Todas las figuras y l�neas se renderizan con componentes batch optimizados */}

                        {/* OPTIMIZACIÓN: Renderizar todas las figuras en batch */}
                        <BatchShapesRenderer
                          circles={circleElements}
                          rectangles={rectangleElements}
                          customShapes={customShapeElements}
                          imageWidth={imageWidth}
                          imageHeight={imageHeight}
                          selectedCloneIdsSet={selectedCloneIdsSet}
                          selectedCloneId={selectedCloneId}
                          multiSelectMode={multiSelectMode}
                          viewMode={viewMode}
                        />

                        {/* OPTIMIZACIÓN: Renderizar todas las l�neas en batch */}
                        <BatchLinesRenderer
                          straightLines={straightLines}
                          curveLines={curveLines}
                          imageWidth={imageWidth}
                          imageHeight={imageHeight}
                          selectedCloneIdsSet={selectedCloneIdsSet}
                          multiSelectMode={multiSelectMode}
                          viewMode={viewMode}
                        />
                      </Svg>

                      {/* Renderizar conectores entre elementos */}
                      <ConnectorsRenderer
                        connectors={connectors}
                        clones={clones}
                        imageWidth={imageWidth}
                        imageHeight={imageHeight}
                        viewMode={viewMode}
                      />

                      {/* Contenedor para �reas de detecci�n - deshabilitado cuando se est� dibujando */}
                      <View
                        style={{
                          position: 'absolute',
                          width: imageWidth,
                          height: imageHeight,
                          zIndex: 200,
                        }}
                        pointerEvents={
                          drawingStraightArrow ||
                          drawingStraightLine ||
                          drawingCircle ||
                          drawingRectangle ||
                          drawingCurveLine ||
                          drawingCurveArrow ||
                          drawingCustomShape
                            ? 'none'
                            : 'box-none'
                        }
                      >
                        {/* OPTIMIZACIÓN: Detectores de c�rculos memoizados */}
                        {circleElements.map((icon) => (
                          <MemoizedCircleDetector
                            key={`circle-detector-${icon.id}`}
                            icon={icon}
                            imageWidth={imageWidth}
                            imageHeight={imageHeight}
                            viewMode={viewMode}
                            selectedCloneId={selectedCloneId}
                            setSelectedCloneId={setSelectedCloneId}
                            setClones={setClones}
                            dragStart={dragStart}
                            clones={clones}
                            selectedCloneIds={selectedCloneIds}
                            selectedCloneIdsSet={selectedCloneIdsSet}
                            multiSelectMode={multiSelectMode}
                            selectionInteractionMode={selectionInteractionMode}
                            setOptionsMenu={setOptionsMenu}
                            isAnyDrawingMode={isAnyDrawingMode}
                            renderScale={renderScale}
                            zoomLevel={zoomLevel}
                            saveClonesHistory={saveClonesHistory}
                            setEditingIcon={setEditingIcon}
                            setLeftPanelVisible={setLeftPanelVisible}
                          />
                        ))}

                        {/* OPTIMIZACIÓN: Detectores de rect�ngulos memoizados */}
                        {rectangleElements.map((icon) => (
                          <MemoizedRectangleDetector
                            key={`rect-detector-${icon.id}`}
                            icon={icon}
                            imageWidth={imageWidth}
                            imageHeight={imageHeight}
                            viewMode={viewMode}
                            selectedCloneId={selectedCloneId}
                            setSelectedCloneId={setSelectedCloneId}
                            setClones={setClones}
                            dragStart={dragStart}
                            clones={clones}
                            selectedCloneIds={selectedCloneIds}
                            selectedCloneIdsSet={selectedCloneIdsSet}
                            multiSelectMode={multiSelectMode}
                            selectionInteractionMode={selectionInteractionMode}
                            setOptionsMenu={setOptionsMenu}
                            isAnyDrawingMode={isAnyDrawingMode}
                            renderScale={renderScale}
                            zoomLevel={zoomLevel}
                            saveClonesHistory={saveClonesHistory}
                            setEditingIcon={setEditingIcon}
                            setLeftPanelVisible={setLeftPanelVisible}
                          />
                        ))}

                        {/* OPTIMIZACIÓN: Detectores de custom-shapes memoizados */}
                        {customShapeElements.map((icon) => (
                          <MemoizedCustomShapeDetector
                            key={`custom-detector-${icon.id}`}
                            icon={icon}
                            imageWidth={imageWidth}
                            imageHeight={imageHeight}
                            viewMode={viewMode}
                            selectedCloneId={selectedCloneId}
                            setSelectedCloneId={setSelectedCloneId}
                            setClones={setClones}
                            dragStart={dragStart}
                            clones={clones}
                            selectedCloneIds={selectedCloneIds}
                            selectedCloneIdsSet={selectedCloneIdsSet}
                            multiSelectMode={multiSelectMode}
                            selectionInteractionMode={selectionInteractionMode}
                            setOptionsMenu={setOptionsMenu}
                            isAnyDrawingMode={isAnyDrawingMode}
                            renderScale={renderScale}
                            zoomLevel={zoomLevel}
                            saveClonesHistory={saveClonesHistory}
                            setEditingIcon={setEditingIcon}
                            setLeftPanelVisible={setLeftPanelVisible}
                          />
                        ))}

                        {/* Renderizado de elementos del campo */}
                        {/* Renderizar materiales (bal�n, conos, porter�as, etc.) */}
                        {materialElements.map((icon) => {
                          if (icon.type === 'custom-shape-button') return null;
                          return (
                            <DraggableIcon
                              key={icon.id}
                              icon={icon}
                              idx={icon.originalIndex || 0}
                              imageWidth={imageWidth}
                              imageHeight={imageHeight}
                              selectedCloneId={selectedCloneId}
                              setSelectedCloneId={setSelectedCloneId}
                              clones={clones}
                              setClones={setClones}
                              dragStart={dragStart}
                              setOptionsMenu={setOptionsMenu}
                              saveClonesHistory={saveClonesHistory}
                              playersWithNumber={playersWithNumber}
                              scale={renderScale}
                              isMobile={isMobile}
                              drawingStates={drawingStates}
                              multiSelectMode={multiSelectMode}
                              selectedCloneIds={selectedCloneIds}
                              selectedCloneIdsSet={selectedCloneIdsSet}
                              setSelectedCloneIds={setSelectedCloneIds}
                              cancelSelection={cancelSelectionRect}
                              selectionInteractionMode={selectionInteractionMode}
                              differentiateGoalkeeper={teamPlayerStyle.differentiateGoalkeeper}
                              goalkeeperStripeColor={teamPlayerStyle.goalkeeperStripeColor}
                              showPhotos={teamPlayerStyle.showPhotos}
                              onDeleteClone={handleElementDeleted}
                              viewMode={viewMode}
                              zoomLevel={zoomLevel}
                              setDraggingOutside={setDraggingOutside}
                              setEditingIcon={setEditingIcon}
                              setLeftPanelVisible={setLeftPanelVisible}
                            />
                          );
                        })}

                        {/* Renderizar elementos regulares (no texto libre) usando array memoizado */}
                        {regularElements.map((icon) => {
                          const size = getProportionalIconSize(icon, imageWidth, standardSize);

                          // FILTRO ESTRICTO: Nunca renderizar custom-shape-button en el campo
                          if (icon.type === 'custom-shape-button') {
                            return null;
                          }

                          // Para custom-shape, solo renderizar si est� completado
                          if (icon.type === 'custom-shape') {
                            // Las figuras personalizadas se renderizan en SVG, no aqu�
                            return null;
                          }

                          // Excluir las l�neas ya que se renderizan por separado
                          if (
                            icon.type === 'straight-line' ||
                            icon.type === 'straight-arrow' ||
                            icon.type === 'curve-line' ||
                            icon.type === 'curve-arrow' ||
                            icon.type === 'circle' ||
                            icon.type === 'rectangle'
                          ) {
                            return null;
                          }

                          // Renderizado para otros tipos de iconos usando el componente memoizado
                          return (
                            <DraggableIcon
                              key={icon.id}
                              icon={icon}
                              idx={icon.originalIndex || 0}
                              imageWidth={imageWidth}
                              imageHeight={imageHeight}
                              selectedCloneId={selectedCloneId}
                              setSelectedCloneId={setSelectedCloneId}
                              clones={clones}
                              setClones={setClones}
                              dragStart={dragStart}
                              setOptionsMenu={setOptionsMenu}
                              saveClonesHistory={saveClonesHistory}
                              playersWithNumber={playersWithNumber}
                              scale={renderScale}
                              isMobile={isMobile}
                              drawingStates={drawingStates}
                              multiSelectMode={multiSelectMode}
                              selectedCloneIds={selectedCloneIds}
                              selectedCloneIdsSet={selectedCloneIdsSet}
                              setSelectedCloneIds={setSelectedCloneIds}
                              cancelSelection={cancelSelectionRect}
                              selectionInteractionMode={selectionInteractionMode}
                              differentiateGoalkeeper={teamPlayerStyle.differentiateGoalkeeper}
                              goalkeeperStripeColor={teamPlayerStyle.goalkeeperStripeColor}
                              showPhotos={teamPlayerStyle.showPhotos}
                              onDeleteClone={handleElementDeleted}
                              viewMode={viewMode}
                              zoomLevel={zoomLevel}
                              setDraggingOutside={setDraggingOutside}
                              setEditingIcon={setEditingIcon}
                              setLeftPanelVisible={setLeftPanelVisible}
                              isSetPieceMode={hasSidebar}
                              onTapPlayerClone={handleTapPlayerClone}
                              onUnassignPlayerClone={handleUnassignPlayerClone}
                            />
                          );
                        })}

                        {/* Renderizar textos libres separadamente usando array memoizado */}
                        {freeTextElements.map((icon) => {
                          return (
                            <FreeTextTool
                              key={icon.id}
                              textObj={icon}
                              idx={icon.originalIndex || 0}
                              imageWidth={imageWidth}
                              imageHeight={imageHeight}
                              selectedCloneId={selectedCloneId}
                              setSelectedCloneId={setSelectedCloneId}
                              setClones={setClones}
                              dragStart={dragStart}
                              applySmootherMovement={applySmootherMovement}
                              setOptionsMenu={setOptionsMenu}
                              saveClonesHistory={saveClonesHistory}
                              multiSelectMode={multiSelectMode}
                              selectedCloneIds={selectedCloneIds}
                              selectedCloneIdsSet={selectedCloneIdsSet}
                              selectionInteractionMode={selectionInteractionMode}
                              clones={clones}
                              eraserMode={eraserMode}
                              onEraseElement={eraseElementById}
                              viewMode={viewMode}
                              zoomLevel={zoomLevel}
                              setDraggingOutside={setDraggingOutside}
                              setTextEditPanel={setTextEditPanel}
                            />
                          );
                        })}

                        {/* Áreas de detecci�n para l�neas - OPTIMIZADO con componentes memoizados */}
                        {straightLines.map((icon, idx) => (
                          <MemoizedStraightLineDetector
                            key={`sl-det-${icon.id}`}
                            icon={icon}
                            imageWidth={imageWidth}
                            imageHeight={imageHeight}
                            viewMode={viewMode}
                            selectedCloneId={selectedCloneId}
                            setSelectedCloneId={setSelectedCloneId}
                            setClones={setClones}
                            dragStart={dragStart}
                            clones={clones}
                            selectedCloneIds={selectedCloneIds}
                            selectedCloneIdsSet={selectedCloneIdsSet}
                            multiSelectMode={multiSelectMode}
                            selectionInteractionMode={selectionInteractionMode}
                            setOptionsMenu={setOptionsMenu}
                            isAnyDrawingMode={isAnyDrawingMode}
                            originalIdx={idx}
                            saveClonesHistory={saveClonesHistory}
                            zoomLevel={zoomLevel}
                            setEditingIcon={setEditingIcon}
                            setLeftPanelVisible={setLeftPanelVisible}
                          />
                        ))}

                        {curveLines.map((icon, idx) => (
                          <MemoizedCurveLineDetector
                            key={`cl-det-${icon.id}`}
                            icon={icon}
                            imageWidth={imageWidth}
                            imageHeight={imageHeight}
                            viewMode={viewMode}
                            selectedCloneId={selectedCloneId}
                            setSelectedCloneId={setSelectedCloneId}
                            setClones={setClones}
                            dragStart={dragStart}
                            clones={clones}
                            selectedCloneIds={selectedCloneIds}
                            selectedCloneIdsSet={selectedCloneIdsSet}
                            multiSelectMode={multiSelectMode}
                            selectionInteractionMode={selectionInteractionMode}
                            setOptionsMenu={setOptionsMenu}
                            isAnyDrawingMode={isAnyDrawingMode}
                            originalIdx={idx + straightLines.length}
                            zoomLevel={zoomLevel}
                            saveClonesHistory={saveClonesHistory}
                            setEditingIcon={setEditingIcon}
                            setLeftPanelVisible={setLeftPanelVisible}
                          />
                        ))}
                      </View>
                      {/* Fin del contenedor de �reas de detecci�n */}

                      {/* Vista previa de l�neas y flechas rectas */}
                      {(drawingStraightArrow ||
                        drawingStraightLine ||
                        drawingCircle ||
                        drawingRectangle) &&
                        temporaryLinePoints.length === 2 &&
                        (() => {
                          // Obtener el icono ACTUAL de la paleta buscando por type
                          const currentPaletteIcon = paletteIcons.find(
                            (icon) => icon.type === pendingLineAction?.type,
                          );

                          // Calcular el grosor EXACTAMENTE como en el renderizado final
                          const scale = 1; // No hay redimensionamiento al dibujar
                          const baseThickness = currentPaletteIcon?.thickness || 1;
                          const previewThickness = baseThickness * scale * 0.7;
                          const previewColor = currentPaletteIcon?.color || '#000000';
                          const previewFillColor = currentPaletteIcon?.fillColor || 'transparent';
                          const previewFill =
                            previewFillColor && previewFillColor !== 'transparent'
                              ? `${previewFillColor}99`
                              : 'transparent';

                          // Convert ratio coords to display coords
                          const dp0 = ratioToDisplay(
                            temporaryLinePoints[0].x,
                            temporaryLinePoints[0].y,
                            viewMode,
                            imageWidth,
                            imageHeight,
                          );
                          const dp1 = ratioToDisplay(
                            temporaryLinePoints[1].x,
                            temporaryLinePoints[1].y,
                            viewMode,
                            imageWidth,
                            imageHeight,
                          );

                          // Calcular punto final de l�nea si es flecha
                          let lineEndX = dp1.x;
                          let lineEndY = dp1.y;
                          let arrowPoints = '';
                          if (drawingStraightArrow) {
                            const arrowData = getArrowHeadForStraightLine(
                              dp0,
                              dp1,
                              standardSize,
                              0.5,
                              previewThickness,
                            );
                            arrowPoints = arrowData.arrowPoints;
                            lineEndX = arrowData.lineEnd.x;
                            lineEndY = arrowData.lineEnd.y;
                          }
                          return (
                            <Svg
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: imageWidth,
                                height: imageHeight,
                                zIndex: 100,
                              }}
                            >
                              {/* Lnea normal */}
                              {(drawingStraightArrow || drawingStraightLine) &&
                                lineType === 'solid' && (
                                  <Path
                                    d={`M${dp0.x},${dp0.y} L${lineEndX},${lineEndY}`}
                                    stroke={previewColor}
                                    strokeWidth={previewThickness}
                                    fill="none"
                                    strokeLinecap="round"
                                  />
                                )}

                              {/* Lnea punteada */}
                              {(drawingStraightArrow || drawingStraightLine) &&
                                lineType === 'dotted' && (
                                  <Path
                                    d={`M${dp0.x},${dp0.y} L${lineEndX},${lineEndY}`}
                                    stroke={previewColor}
                                    strokeWidth={previewThickness}
                                    strokeDasharray={`${dotSize},${dotSpacing}`}
                                    fill="none"
                                    strokeLinecap="round"
                                  />
                                )}

                              {drawingStraightArrow && (
                                <Polygon
                                  points={arrowPoints}
                                  fill={previewColor}
                                  strokeLinejoin="round"
                                />
                              )}

                              {/* C�rculo */}
                              {drawingCircle && (
                                <Ellipse
                                  cx={(dp0.x + dp1.x) / 2}
                                  cy={(dp0.y + dp1.y) / 2}
                                  rx={Math.abs(dp1.x - dp0.x) / 2}
                                  ry={Math.abs(dp1.y - dp0.y) / 2}
                                  stroke={previewColor}
                                  strokeWidth={previewThickness}
                                  fill={previewFill}
                                  strokeDasharray={
                                    lineType === 'dotted' ? `${dotSize},${dotSpacing}` : undefined
                                  }
                                  strokeLinecap="round"
                                  vectorEffect="non-scaling-stroke"
                                />
                              )}

                              {/* Rect�ngulo */}
                              {drawingRectangle && (
                                <Rect
                                  x={Math.min(dp0.x, dp1.x)}
                                  y={Math.min(dp0.y, dp1.y)}
                                  width={Math.abs(dp1.x - dp0.x)}
                                  height={Math.abs(dp1.y - dp0.y)}
                                  stroke={previewColor}
                                  strokeWidth={previewThickness}
                                  fill={previewFill}
                                  strokeDasharray={
                                    lineType === 'dotted' ? `${dotSize},${dotSpacing}` : undefined
                                  }
                                  strokeLinecap="round"
                                  vectorEffect="non-scaling-stroke"
                                />
                              )}
                            </Svg>
                          );
                        })()}

                      {/* Vista previa de l�neas y flechas curvas */}
                      {(drawingCurveArrow || drawingCurveLine) &&
                        curvePoints.length >= 1 &&
                        (() => {
                          // Obtener el icono ACTUAL de la paleta buscando por type
                          const currentPaletteIcon = paletteIcons.find(
                            (icon) => icon.type === pendingLineAction?.type,
                          );

                          // Calcular el grosor EXACTAMENTE como en el renderizado final
                          const scale = 1;
                          const baseThickness = currentPaletteIcon?.thickness || 1;
                          const previewThickness = baseThickness * scale * 0.7;
                          const previewColor = currentPaletteIcon?.color || '#000000';
                          const displayCurvePoints = curvePoints.map((pt) =>
                            ratioToDisplay(pt.x, pt.y, viewMode, imageWidth, imageHeight),
                          );
                          return (
                            <Svg
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: imageWidth,
                                height: imageHeight,
                                zIndex: 100,
                              }}
                            >
                              {/* L�nea s�lida */}
                              {lineType === 'solid' && (
                                <Path
                                  key="curve-preview-solid"
                                  d={displayCurvePoints
                                    .map((pt, i) =>
                                      i === 0 ? `M${pt.x},${pt.y}` : `L${pt.x},${pt.y}`,
                                    )
                                    .join(' ')}
                                  stroke={previewColor}
                                  strokeWidth={previewThickness}
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}

                              {/* L�nea punteada */}
                              {lineType === 'dotted' && (
                                <Path
                                  key="curve-preview-dotted"
                                  d={displayCurvePoints
                                    .map((pt, i) =>
                                      i === 0 ? `M${pt.x},${pt.y}` : `L${pt.x},${pt.y}`,
                                    )
                                    .join(' ')}
                                  stroke={previewColor}
                                  strokeWidth={previewThickness}
                                  strokeDasharray={`${dotSize},${dotSpacing}`}
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}

                              {/* Flecha curva mejorada - usar los �ltimos 2 puntos para mejor direcci�n */}
                              {drawingCurveArrow &&
                                curvePoints.length >= 2 &&
                                (() => {
                                  // Buscar los dos �ltimos puntos diferentes para calcular la direcci�n correcta
                                  let lastIdx = curvePoints.length - 1;
                                  let secondLastIdx = lastIdx - 1;

                                  // Si los �ltimos puntos est�n muy cerca, buscar uno m�s alejado
                                  while (secondLastIdx >= 0) {
                                    const dist = Math.sqrt(
                                      Math.pow(
                                        displayCurvePoints[lastIdx].x -
                                          displayCurvePoints[secondLastIdx].x,
                                        2,
                                      ) +
                                        Math.pow(
                                          displayCurvePoints[lastIdx].y -
                                            displayCurvePoints[secondLastIdx].y,
                                          2,
                                        ),
                                    );
                                    if (dist > 5) break; // Al menos 5 p�xeles de diferencia
                                    secondLastIdx--;
                                  }
                                  if (secondLastIdx < 0) secondLastIdx = 0;
                                  const arrowData = getArrowHeadForStraightLine(
                                    displayCurvePoints[secondLastIdx],
                                    displayCurvePoints[lastIdx],
                                    standardSize || DEFAULT_PLAYER_ICON_SIZE,
                                    0.5,
                                    previewThickness,
                                  );
                                  return (
                                    <Polygon
                                      key="curve-arrow-preview"
                                      points={arrowData.arrowPoints}
                                      fill={previewColor}
                                      strokeLinejoin="round"
                                    />
                                  );
                                })()}
                            </Svg>
                          );
                        })()}
                      {drawingCustomShape &&
                        (customShapePoints.length > 0 || previewPoint) &&
                        (() => {
                          // Obtener el icono ACTUAL de la paleta buscando por type
                          const currentPaletteIcon = paletteIcons.find(
                            (icon) => icon.type === 'custom-shape-button',
                          );

                          // Calcular el grosor din�mico basado en el icono pendiente
                          const baseThickness = currentPaletteIcon?.thickness || 1;
                          const previewScale = (imageWidth / 500 + imageHeight / 500) / 2;
                          const previewThickness = baseThickness * previewScale * 0.7;
                          const previewColor = currentPaletteIcon?.color || '#000000';
                          const displayShapePoints = customShapePoints.map((pt) =>
                            ratioToDisplay(pt.x, pt.y, viewMode, imageWidth, imageHeight),
                          );
                          const displayPreviewPt = previewPoint
                            ? ratioToDisplay(
                                previewPoint.x,
                                previewPoint.y,
                                viewMode,
                                imageWidth,
                                imageHeight,
                              )
                            : null;
                          return (
                            <Svg
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: imageWidth,
                                height: imageHeight,
                                zIndex: 100,
                              }}
                            >
                              {/* L�neas ya confirmadas */}
                              {customShapePoints.map((pt, i) => {
                                if (i === 0) return null;
                                return (
                                  <G key={`custom-confirmed-${i}`}>
                                    {(!lineType || lineType === 'solid') && (
                                      <Path
                                        d={`M${displayShapePoints[i - 1].x},${displayShapePoints[i - 1].y} L${displayShapePoints[i].x},${displayShapePoints[i].y}`}
                                        stroke={previewColor}
                                        strokeWidth={previewThickness}
                                        fill="none"
                                        strokeLinecap="round"
                                      />
                                    )}

                                    {lineType === 'dotted' && (
                                      <Path
                                        d={`M${displayShapePoints[i - 1].x},${displayShapePoints[i - 1].y} L${displayShapePoints[i].x},${displayShapePoints[i].y}`}
                                        stroke={previewColor}
                                        strokeWidth={previewThickness}
                                        strokeDasharray={`${dotSize},${dotSpacing}`}
                                        fill="none"
                                        strokeLinecap="round"
                                      />
                                    )}
                                  </G>
                                );
                              })}

                              {/* L�nea de previsualizaci�n desde el �ltimo punto confirmado al punto actual */}
                              {previewPoint && customShapePoints.length > 0 && (
                                <G key={`preview-line-custom-shape`}>
                                  {(!lineType || lineType === 'solid') && (
                                    <Path
                                      d={`M${displayShapePoints[displayShapePoints.length - 1].x},${displayShapePoints[displayShapePoints.length - 1].y} L${displayPreviewPt.x},${displayPreviewPt.y}`}
                                      stroke={previewColor}
                                      strokeWidth={previewThickness}
                                      fill="none"
                                      strokeLinecap="round"
                                      opacity={0.6}
                                      strokeDasharray="10,5"
                                    />
                                  )}

                                  {lineType === 'dotted' && (
                                    <Path
                                      d={`M${displayShapePoints[displayShapePoints.length - 1].x},${displayShapePoints[displayShapePoints.length - 1].y} L${displayPreviewPt.x},${displayPreviewPt.y}`}
                                      stroke={previewColor}
                                      strokeWidth={previewThickness}
                                      strokeDasharray={`${dotSize},${dotSpacing}`}
                                      fill="none"
                                      strokeLinecap="round"
                                      opacity={0.6}
                                    />
                                  )}
                                </G>
                              )}

                              {/* L�nea de cierre de previsualizaci�n si hay suficientes puntos */}
                              {previewPoint && customShapePoints.length >= 2 && (
                                <G key={`preview-close-custom-shape`}>
                                  {(!lineType || lineType === 'solid') && (
                                    <Path
                                      d={`M${displayPreviewPt.x},${displayPreviewPt.y} L${displayShapePoints[0].x},${displayShapePoints[0].y}`}
                                      stroke={previewColor}
                                      strokeWidth={previewThickness}
                                      strokeDasharray="5,5"
                                      fill="none"
                                      strokeLinecap="round"
                                      opacity={0.3}
                                    />
                                  )}

                                  {lineType === 'dotted' && (
                                    <Path
                                      d={`M${displayPreviewPt.x},${displayPreviewPt.y} L${displayShapePoints[0].x},${displayShapePoints[0].y}`}
                                      stroke={previewColor}
                                      strokeWidth={previewThickness}
                                      strokeDasharray={`${dotSize},${dotSpacing}`}
                                      fill="none"
                                      strokeLinecap="round"
                                      opacity={0.3}
                                    />
                                  )}
                                </G>
                              )}

                              {/* C�rculo de cierre en el primer punto */}
                              {showCloseCircle && customShapePoints.length >= 3 && (
                                <>
                                  <Circle
                                    cx={displayShapePoints[0].x}
                                    cy={displayShapePoints[0].y}
                                    r={15}
                                    fill="rgba(33, 118, 255, 0.3)"
                                    stroke="#2176ff"
                                    strokeWidth={2}
                                  />
                                  <Circle
                                    cx={displayShapePoints[0].x}
                                    cy={displayShapePoints[0].y}
                                    r={5}
                                    fill="#2176ff"
                                  />
                                </>
                              )}

                              {/* Puntos confirmados */}
                              {displayShapePoints.map((pt, i) => (
                                <Circle
                                  key={`confirmed-point-${i}`}
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={4}
                                  fill={pendingLineAction?.icon?.color || '#000000'}
                                />
                              ))}

                              {/* Punto de previsualizaci�n */}
                              {previewPoint && (
                                <Circle
                                  cx={displayPreviewPt.x}
                                  cy={displayPreviewPt.y}
                                  r={4}
                                  fill={pendingLineAction?.icon?.color || '#000000'}
                                  opacity={0.7}
                                  stroke="#fff"
                                  strokeWidth={1}
                                />
                              )}
                            </Svg>
                          );
                        })()}
                    </View>

                    {/* Rect�ngulo de selecci�n: pintado por DOM nativo dentro
                          del overlay multi-select (ver useEffect multi-select v3).
                          El SVG fallback legacy fue eliminado porque no estaba
                          wired a ning�n handler activo y pod�a ocultar el rect
                          nativo si por alg�n motivo aparec�a. */}

                    {/* Controles de selecci�n m�ltiple movidos: ahora se muestran a la derecha (fuera del campo) */}

                    {/* Indicador de carga */}
                    {isLoadingField && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: imageWidth,
                          height: imageHeight,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: 'rgba(178, 247, 184, 0.95)',
                          zIndex: 1000,
                        }}
                      >
                        <ActivityIndicator size="large" color="#2e7d32" />
                        <Text
                          style={{
                            marginTop: 10,
                            color: '#2e7d32',
                            fontSize: 16,
                            fontWeight: '600',
                          }}
                        >
                          Cargando campo...
                        </Text>
                      </View>
                    )}
                  </View>
                </ViewShot>

                {activeBallTrajectoryPrompts.map((prompt) => {
                  const ratioPoint = getSnapshotRatioPoint(prompt.ball);
                  if (!ratioPoint) return null;
                  const displayPoint = ratioToDisplay(
                    ratioPoint.x,
                    ratioPoint.y,
                    viewMode,
                    imageWidth,
                    imageHeight,
                  );
                  const cardWidth = isMobile ? (SCREEN_WIDTH < 380 ? 124 : 138) : 224;
                  const cardHeight = isMobile ? 76 : 112;
                  const left = clampLayoutValue(
                    displayPoint.x - cardWidth / 2,
                    4,
                    Math.max(4, imageWidth - cardWidth - 4),
                  );
                  const preferTop = displayPoint.y + 18;
                  const top =
                    preferTop + cardHeight > imageHeight
                      ? clampLayoutValue(
                          displayPoint.y - cardHeight - 18,
                          4,
                          Math.max(4, imageHeight - cardHeight - 4),
                        )
                      : clampLayoutValue(preferTop, 4, Math.max(4, imageHeight - cardHeight - 4));
                  const trajectory = prompt.trajectory || 'ground';
                  return (
                    <View
                      key={prompt.key}
                      style={[
                        styles.ballTrajectoryPrompt,
                        isMobile && styles.ballTrajectoryPromptMobile,
                        {
                          left,
                          top,
                          width: cardWidth,
                        },
                      ]}
                    >
                      <View style={styles.ballTrajectoryPromptHeader}>
                        <View style={styles.ballTrajectoryIcon}>
                          <Feather name="send" size={isMobile ? 9 : 14} color="#0f172a" />
                        </View>
                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text style={styles.ballTrajectoryTitle} numberOfLines={1}>
                            {getBallMotionTitle(prompt.fromBall, prompt.ball)}
                          </Text>
                          <Text style={styles.ballTrajectorySubtitle} numberOfLines={1}>
                            {getBallMotionSubLabel(prompt.fromBall, prompt.ball)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.ballTrajectoryOptions}>
                        <TouchableOpacity
                          style={[
                            styles.ballTrajectoryOption,
                            trajectory === 'ground' && styles.ballTrajectoryOptionGround,
                          ]}
                          onPress={() =>
                            updateSegmentBallTrajectory(
                              prompt.segmentIndex,
                              prompt.ball.id,
                              'ground',
                              prompt.key,
                            )
                          }
                          accessibilityRole="button"
                          accessibilityLabel={t('videoRecorder.ballGround', 'Suelo')}
                        >
                          <Feather
                            name="arrow-right"
                            size={isMobile ? 9 : 15}
                            color={trajectory === 'ground' ? '#fff' : '#166534'}
                          />
                          <Text
                            style={[
                              styles.ballTrajectoryOptionText,
                              trajectory === 'ground' && styles.ballTrajectoryOptionTextActive,
                            ]}
                          >
                            {t('videoRecorder.ballGround', 'Suelo')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.ballTrajectoryOption,
                            trajectory === 'air' && styles.ballTrajectoryOptionAir,
                          ]}
                          onPress={() =>
                            updateSegmentBallTrajectory(
                              prompt.segmentIndex,
                              prompt.ball.id,
                              'air',
                              prompt.key,
                            )
                          }
                          accessibilityRole="button"
                          accessibilityLabel={t('videoRecorder.ballAir', 'Aire')}
                        >
                          <Feather
                            name="trending-up"
                            size={isMobile ? 9 : 15}
                            color={trajectory === 'air' ? '#fff' : '#92400e'}
                          />
                          <Text
                            style={[
                              styles.ballTrajectoryOptionText,
                              trajectory === 'air' && styles.ballTrajectoryOptionTextActive,
                            ]}
                          >
                            {t('videoRecorder.ballAir', 'Aire')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {draggingOutside && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: imageWidth,
                      height: imageHeight,
                      borderWidth: 4,
                      borderColor: '#ef4444',
                      borderStyle: 'dashed',
                      borderRadius: 8,
                      backgroundColor: 'rgba(239,68,68,0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 20000,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: 'rgba(239,68,68,0.92)',
                        paddingHorizontal: 18,
                        paddingVertical: 8,
                        borderRadius: 8,
                        shadowColor: '#ef4444',
                        shadowOffset: {
                          width: 0,
                          height: 4,
                        },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: '#ffffff',
                          fontSize: 14,
                          fontWeight: '800',
                        }}
                      >
                        {t('tacticalBoard.dragToDelete', 'Suelta para eliminar')}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Capa de overlay para multi-select dentro de las mismas transformaciones.
                    En web usamos un <div> nativo en lugar de <View> para tener
                    control total sobre los eventos de mouse/touch "� el sistema
                    de responder de RN no se dispara de forma fiable con mouse
                    sobre overlays transparentes en react-native-web. */}
                {multiSelectMode && selectionInteractionMode === 'select' && (
                  <div
                    ref={(node) => {
                      selectionOverlayRef.current = node;
                    }}
                    data-multiselect-overlay="true"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: imageWidth,
                      height: imageHeight,
                      zIndex: 10000,
                      backgroundColor: 'transparent',
                      cursor: 'crosshair',
                      touchAction: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {/* Rect�ngulo de selecci�n: en web se dibuja por DOM nativo
                        desde el useEffect (ver bloque multi-select). El SVG fallback
                        solo aparece si por alg�n motivo isSelecting llega a estar true
                        sin que el div DOM est� pint�ndolo. */}
                  </div>
                )}
              </View>
            </View>
          </View>

          {showPlayersSidebar && (
            <View
              style={[
                styles.sidebarContainer,
                {
                  width: sidebarWidth,
                },
              ]}
            >
              {/* Sidebar header */}
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle} numberOfLines={1}>
                  {t('setPieces.assignedPlayers', 'Jugadores')}
                </Text>
              </View>

              {/* Scrollable list */}
              <ScrollView
                style={styles.sidebarScrollView}
                contentContainerStyle={styles.sidebarContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* Available Players Section */}
                <Text style={styles.sidebarSectionTitle}>
                  {t('setPieces.availablePlayersTitle', 'Jugadores Disponibles')}
                </Text>
                {availablePlayers.length === 0 ? (
                  <Text style={styles.sidebarEmptyText}>
                    {t('setPieces.noAvailablePlayers', 'No hay jugadores disponibles')}
                  </Text>
                ) : (
                  availablePlayers.map((player) => {
                    const posColor = getPositionColor(player.posicion)?.[0] || '#666';
                    return (
                      <View key={player.uniqueId} style={styles.sidebarPlayerCard}>
                        <View
                          style={[
                            styles.sidebarPlayerDorsalBadge,
                            {
                              backgroundColor: posColor,
                            },
                          ]}
                        >
                          <Text style={styles.sidebarPlayerDorsalText}>{player.dorsal || '-'}</Text>
                        </View>
                        <View style={styles.sidebarPlayerInfo}>
                          <Text style={styles.sidebarPlayerName} numberOfLines={1}>
                            {getPlayerFullName(player)}
                          </Text>
                          {!!player.posicion && (
                            <Text style={styles.sidebarPlayerPos} numberOfLines={1}>
                              {player.posicion.toUpperCase()}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}

                {/* Separator line */}
                <View style={styles.sidebarDivider} />

                {/* Placed/Active Players Section */}
                <Text style={styles.sidebarSectionTitle}>
                  {t('setPieces.onBoardPlayersTitle', 'En Pizarra')}
                </Text>
                {(() => {
                  const placedPlayers = clones.filter((c) => c.type === 'player' && c.playerData);
                  if (placedPlayers.length === 0) {
                    return (
                      <Text style={styles.sidebarEmptyText}>
                        {t('setPieces.noOnBoardPlayers', 'Ningún jugador en la pizarra')}
                      </Text>
                    );
                  }
                  return placedPlayers.map((clone) => {
                    const player = clone.playerData;
                    const posColor = getPositionColor(player.posicion)?.[0] || '#666';
                    return (
                      <View key={clone.id} style={styles.sidebarPlayerCard}>
                        <View
                          style={[
                            styles.sidebarPlayerDorsalBadge,
                            {
                              backgroundColor: posColor,
                            },
                          ]}
                        >
                          <Text style={styles.sidebarPlayerDorsalText}>
                            {player.dorsal || clone.number || '-'}
                          </Text>
                        </View>
                        <View style={styles.sidebarPlayerInfo}>
                          <Text style={styles.sidebarPlayerName} numberOfLines={1}>
                            {getPlayerFullName(player)}
                          </Text>
                          {!!player.posicion && (
                            <Text style={styles.sidebarPlayerPos} numberOfLines={1}>
                              {player.posicion.toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity onPress={() => eraseElementById(clone.id)}>
                          <Ionicons name="trash-outline" size={18} color="#ff4a4a" />
                        </TouchableOpacity>
                      </View>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          )}
        </View>

        {showingPlayersPalette ? (
          <SlidingPlayersPalette
            visible={paletteVisible}
            onClose={() => {
              setShowingPlayersPalette(false);
              // Mantener la paleta abierta con los iconos normales
            }}
            availablePlayers={availablePlayers}
            onSelectPlayer={handleSelectPlayer}
            onLongPressPlayer={handleLongPressTeamPlayer}
            onOpenSettings={() => setTeamPlayerSettingsVisible(true)}
            isMobile={isMobile}
            teamPlayerColor={
              teamPlayerStyle?.color || boardSettings?.teamPlayers?.color || '#2176ff'
            }
            goalkeeperColor={
              teamPlayerStyle?.goalkeeperColor ||
              boardSettings?.teamPlayers?.goalkeeperColor ||
              '#ff4a4a'
            }
            numberColor={teamPlayerStyle?.numberColor || '#ffffff'}
            textColor={teamPlayerStyle?.textColor || '#000000'}
            textBackgroundColor={teamPlayerStyle?.textBackgroundColor || '#ffffff'}
            showPosition={teamPlayerStyle?.showPosition || false}
            differentiateGoalkeeper={teamPlayerStyle?.differentiateGoalkeeper !== false}
            goalkeeperStripeColor={teamPlayerStyle?.goalkeeperStripeColor || '#ffffff'}
            showPhotos={teamPlayerStyle?.showPhotos || false}
            playerShape={teamPlayerStyle?.shape || 'circle'}
            hasPlayerStripes={teamPlayerStyle?.hasStripes === true}
            playerStripeColor={teamPlayerStyle?.stripeColor || '#ffffff'}
            hasBib={teamPlayerStyle?.hasBib === true}
            bibColor={teamPlayerStyle?.bibColor || NEUTRAL_PLAYER_COLORS.bib}
          />
        ) : showingMaterialsPalette ? (
          <SlidingMaterialsPalette
            visible={paletteVisible}
            onClose={() => {
              setShowingMaterialsPalette(false);
              // Mantener la paleta abierta con los iconos normales
            }}
            onSelectMaterial={handleSelectMaterial}
            onLongPressMaterial={handleLongPressMaterial}
            materialsConfig={materialsConfig}
            pendingPlacementAction={pendingPlacementAction}
            isMobile={isMobile}
          />
        ) : showingStaffPalette ? (
          <SlidingStaffPalette
            visible={paletteVisible}
            onClose={() => {
              setShowingStaffPalette(false);
              // Mantener la paleta abierta con los iconos normales
            }}
            onSelectStaff={handleSelectStaff}
            isMobile={isMobile}
            staffColor="#333333"
            selectedStaffIds={selectedStaffIds}
          />
        ) : (
          <SlidingPalette
            visible={paletteVisible}
            onClose={() => setPaletteVisible(false)}
            paletteIcons={paletteIcons}
            onIconPress={handleIconPalettePress}
            onIconLongPress={handleLongPressPaletteIcon}
            onAddText={handleAddText}
            onToggleEraser={handleToggleEraser}
            drawingStates={drawingStates}
            isMobile={isMobile}
            playersWithNumber={playersWithNumber}
          />
        )}

        <SlidingZoomControls
          visible={zoomVisible}
          onClose={() => setZoomVisible(false)}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onPanLeft={handlePanLeft}
          onPanRight={handlePanRight}
          onPanUp={handlePanUp}
          onPanDown={handlePanDown}
          onReset={handleResetView}
        />

        <LeftEditPanel
          visible={leftPanelVisible}
          icon={editingIcon}
          onClose={() => setLeftPanelVisible(false)}
          onApply={handleApplyEdit}
          onPaletteUpdate={handlePaletteIconEdit}
          standardSize={standardSize}
          playersWithNumber={playersWithNumber}
          paletteIcons={paletteIcons}
          teamPlayerStyle={teamPlayerStyle}
          setTeamPlayerStyle={setTeamPlayerStyle}
          onMaterialsConfigUpdate={handleMaterialsConfigUpdate}
        />
        <LeftEditPanel
          visible={paletteEdit.visible}
          icon={paletteEdit.icon}
          onClose={() =>
            setPaletteEdit({
              visible: false,
              icon: null,
              paletteIndex: null,
            })
          }
          onApply={handleApplyPaletteEdit}
          standardSize={standardSize}
          playersWithNumber={playersWithNumber}
          onPaletteUpdate={handlePaletteIconEdit}
          paletteIcons={paletteIcons}
          teamPlayerStyle={teamPlayerStyle}
          setTeamPlayerStyle={setTeamPlayerStyle}
          hideApplyToPalette={true}
          onMaterialsConfigUpdate={handleMaterialsConfigUpdate}
        />
        <TextEditPanel
          visible={textEditPanel.visible}
          icon={textEditPanel.icon}
          isNewElement={textEditPanel.isNew}
          onClose={() =>
            setTextEditPanel({
              visible: false,
              icon: null,
              isNew: false,
            })
          }
          onApply={handleApplyTextEdit}
          onPreviewChange={handleTextPreviewChange}
          onDelete={(id) => {
            setClones((prev) => prev.filter((c) => c.id !== id));
            setSelectedCloneId(null);
          }}
        />
        <SettingsPanel
          visible={settingsPanelVisible}
          onClose={() => setSettingsPanelVisible(false)}
          standardSize={standardSize}
          setStandardSize={setStandardSize}
          playersWithNumber={playersWithNumber}
          setPlayersWithNumber={setPlayersWithNumber}
          boardSettings={boardSettings}
          setBoardSettings={setBoardSettings}
          onApplyBoardSettings={handleApplyBoardSettings}
          onSaveBoardSettings={handleSaveBoardSettings}
          onOpenConnectors={() => setConnectorsModalVisible(true)}
        />

        {/* Modal de conectores */}
        <ConnectorsModal
          visible={connectorsModalVisible}
          onClose={() => setConnectorsModalVisible(false)}
          clones={clones}
          connectors={connectors}
          setConnectors={setConnectorsWithHistory}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
        />

        {/* Selector de campo SVG */}
        <FieldSelectorModal
          visible={carouselModalVisible}
          currentLineType={fieldLineType}
          currentViewMode={viewMode}
          onSelect={handleFieldSelect}
          onClose={closeCarouselModal}
          screenWidth={SCREEN_WIDTH}
          screenHeight={SCREEN_HEIGHT}
        />

        {/* 11. A�adir el modal de estilo de l�nea aqu� */}
        <LineStyleModal
          visible={lineStyleModalVisible}
          onClose={() => setLineStyleModalVisible(false)}
          onSelect={handleLineStyleSelect}
          initialLineType={pendingLineAction?.icon?.lineType || lineType}
          initialDotSize={pendingLineAction?.icon?.dotSize ?? dotSize}
          initialDotSpacing={pendingLineAction?.icon?.dotSpacing ?? dotSpacing}
          initialColor={pendingLineAction?.icon?.color || '#000000'}
          initialThickness={pendingLineAction?.icon?.thickness || 2}
          initialFillColor={pendingLineAction?.icon?.fillColor || 'transparent'}
          shapeType={
            pendingLineAction?.type === 'custom-shape-button'
              ? 'custom-shape'
              : pendingLineAction?.type
          }
        />

        {/* Modal de jugadores del equipo */}
        <TeamPlayersModal
          visible={playersModalVisible}
          onClose={() => {
            setPlayersModalVisible(false);
            setAssigningCloneId(null);
          }}
          availablePlayers={availablePlayers}
          onSelectPlayer={handleSelectPlayer}
          isMobile={isMobile}
          showPhotos={teamPlayerStyle.showPhotos}
          setTeamPlayerStyle={setTeamPlayerStyle}
          teamPlayerStyle={teamPlayerStyle}
        />

        {/* Modal de ajustes de jugadores del equipo */}
        <TeamPlayerSettingsModal
          visible={teamPlayerSettingsVisible}
          onClose={() => setTeamPlayerSettingsVisible(false)}
          teamPlayerStyle={teamPlayerStyle}
          setTeamPlayerStyle={setTeamPlayerStyle}
          isMobile={isMobile}
        />

        {/* Floating multi-select buttons removed "� actions are now available in the selection status modal */}

        {/* Men� de opciones para elementos seleccionados */}
        <OptionsMenu
          visible={optionsMenu.visible}
          position={optionsMenu.position}
          onClose={() =>
            setOptionsMenu({
              ...optionsMenu,
              visible: false,
            })
          }
          onDelete={() => handleDeleteClone(optionsMenu.iconId)}
          onDuplicate={() => handleDuplicateClone(optionsMenu.iconId)}
          onRotate={optionsMenu.canRotate ? () => handleRotateIcon(optionsMenu.iconId) : null}
          onIncreaseSize={() => handleIncreaseSize(optionsMenu.iconId)}
          onDecreaseSize={() => handleDecreaseSize(optionsMenu.iconId)}
          onLock={() => handleToggleLock(optionsMenu.iconId)}
          onBringToFront={() => handleBringToFront(optionsMenu.iconId)}
          onSendToBack={() => handleSendToBack(optionsMenu.iconId)}
          isLocked={clones.find((c) => c.id === optionsMenu.iconId)?.locked || false}
          isMobile={isMobile}
          onEdit={() => {
            // Buscar el elemento por id y establecerlo como elemento de edici�n
            const elementToEdit = clones.find((clone) => clone.id === optionsMenu.iconId);
            if (elementToEdit) {
              if (elementToEdit.type === 'free-text') {
                // Para elementos de texto, usar el panel de edici�n de texto (no es nuevo)
                setTextEditPanel({
                  visible: true,
                  icon: elementToEdit,
                  isNew: false,
                });
              } else {
                // Para otros elementos, usar el panel izquierdo
                setEditingIcon(elementToEdit);
                setLeftPanelVisible(true);
              }
            }
            // Cerrar el men� de opciones
            setOptionsMenu({
              ...optionsMenu,
              visible: false,
            });
          }}
          hideEdit={optionsMenu.hideEdit}
          scale={renderScale}
        />

        {/* Panel de elementos bloqueados */}
        <LockedElementsPanel
          visible={lockedElementsVisible}
          onClose={() => setLockedElementsVisible(false)}
          lockedElements={clones.filter((c) => c.locked === true)}
          onUnlock={handleUnlockFromPanel}
          scale={renderScale}
        />

        {/* Modal de formaciones */}
        <FormationModal
          visible={formationModalVisible}
          onClose={() => setFormationModalVisible(false)}
          onSelectFormation={applyFormation}
          onDeleteFormation={deleteFormation}
          initialColor={teamPlayerStyle?.color}
          initialSize={standardSize}
          formationSettings={formationSettings}
          setFormationSettings={setFormationSettings}
          onSaveFormationSettings={handleSaveFormationSettings}
          teamPlayerStyle={teamPlayerStyle}
          setTeamPlayerStyle={setTeamPlayerStyle}
        />

        {instructionMessage?.visible && (
          <View style={styles.instructionOverlay}>
            <View style={styles.instructionContainer}>
              <View style={styles.instructionIconContainer}>
                <Feather name="info" size={24} color="#2176ff" />
              </View>
              <View style={styles.instructionTextContainer}>
                <Text style={styles.instructionText}>{instructionMessage.text}</Text>
                {instructionMessage.subtext && (
                  <Text style={styles.instructionSubtext}>{instructionMessage.subtext}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setInstructionMessage(null)}
                style={styles.instructionCloseButton}
              >
                <Feather name="x" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Indicador de modo goma de borrar */}
        {eraserMode && (
          <TouchableOpacity
            onPress={() => setEraserMode(false)}
            style={[
              styles.eraserModeIndicator,
              {
                top: (isMobile ? 6 : 30) + safeArea.top,
                left: (isMobile ? 112 : 230) + safeArea.left,
              },
            ]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="cleaning-services" size={16} color="#fff" />
            <Text style={styles.eraserModeText}>{t('field.eraserMode')}</Text>
            <Feather name="x" size={14} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        )}

        {/* Grabador de video */}
        {videoRecorderVisible && (
          <VideoRecorder
            elements={clones}
            connectors={connectors}
            fieldImage={fieldImageForVideo}
            onClose={handleCloseVideoRecorder}
            viewMode={viewMode}
            fieldWidth={referenceWidth}
            fieldHeight={referenceHeight}
            fieldDisplayWidth={imageWidth}
            fieldDisplayHeight={imageHeight}
            fieldRef={fieldRef}
            videoFrameControl={videoFrameControlRef}
            fieldBaseRef={fieldBaseRef}
            fieldImageReady={fieldImageReady}
            fieldType={selectedField}
            keyframes={videoKeyframes}
            onKeyframesChange={setVideoKeyframes}
            onClearKeyframes={clearVideoKeyframes}
            onSelectKeyframe={goToKeyframe}
            onApplyKeyframe={applyKeyframe}
            onGoToLastKeyframe={goToLastKeyframe}
            onRestoreOriginal={restoreToOriginalState}
            onPreviewPlayback={previewVideoOnBoard}
            ejercicioId={ejercicioId}
            estrategiaId={estrategiaId}
            showPhotos={teamPlayerStyle.showPhotos}
            playersWithNumber={playersWithNumber}
            isEditingVideo={isEditingVideo}
            editingVideoId={editingVideoId}
            editingVideoName={editingVideoName}
            editingVideoDescription={editingVideoDescription}
            editingVideoFolderId={editingVideoFolderId}
            hideFolderPicker={hideFolderPicker}
            presetFolderId={presetFolderId}
            isGlobalExercise={isGlobalExercise}
            isGlobalStrategy={isGlobalStrategy}
            onEditVideoSaved={isEditingVideo ? handleEditVideoSaved : null}
            onSavingChange={setIsSavingVideoEdit}
          />
        )}

        {isSavingVideoEdit && (
          <View style={styles.videoEditSavingOverlay} pointerEvents="auto">
            <View style={styles.videoEditSavingCard}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.videoEditSavingTitle}>{t('videoRecorder.savingVideoEdit')}</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// Actualiza algunos estilos espec�ficos
