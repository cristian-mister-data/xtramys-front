// v2
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  View, Text, StyleSheet, Pressable, Image, TextInput,
  ScrollView, Dimensions, BackHandler, Animated, Button, Modal, TouchableWithoutFeedback, Platform, StatusBar, Switch, ActivityIndicator, InteractionManager, Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniColorPickerModal } from './colorPicker';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { PanGestureHandler, TapGestureHandler, State, LongPressGestureHandler } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons, Entypo, Feather } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUsuario } from '@/store/slices/user/userThunks';
import { fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';
import Svg, { Path, Polygon, Rect, Circle, G, Defs, ClipPath, RadialGradient, Stop } from 'react-native-svg';
import ViewShot from "react-native-view-shot";
import * as ScreenOrientation from 'expo-screen-orientation';
import * as FileSystem from 'expo-file-system/legacy'; // Usar la API legacy
import { Asset } from 'expo-asset';
import VideoRecorder from './videoRecorder';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getPlayerFullName } from '@/components/player/playerHelpers';
import { FieldSVGRenderer, decomposeFieldId, composeFieldId, getAspectForView, ratioToDisplay, displayToRatio, deltaToRatio, isVisibleInView, isOutsideVisibleField, areAllPointsOutside } from './fields';
import FieldSelectorModal from './FieldSelectorModal';
import { cdnUrl } from '@/config';
import ballImage from '@/images/ball.png';


function TouchableOpacity({ activeOpacity = 0.2, style, onPress, disabled, children, ...props }) {
  return (
    <Pressable
      style={({ pressed }) => [
        style,
        pressed && !disabled && { opacity: activeOpacity },
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      {...props}
    >
      {children}
    </Pressable>
  );
}

const FIELD_CAPTURE_BACKGROUND = '#4a8c3f';
const FIELD_CAPTURE_OPTIONS = { format: 'png', quality: 1, backgroundColor: FIELD_CAPTURE_BACKGROUND };
const REFERENCE_WIDTH = 1280;

function getFieldCaptureOptions(extraOptions = {}) {
  return Platform.OS === 'web'
    ? { ...FIELD_CAPTURE_OPTIONS, result: 'base64', ...extraOptions }
    : { ...FIELD_CAPTURE_OPTIONS, ...extraOptions };
}

async function captureViewShotBase64(viewShotRef, extraOptions = {}) {
  const ref = viewShotRef?.current || viewShotRef;
  if (!ref?.capture) return '';

  const captured = await ref.capture(getFieldCaptureOptions(extraOptions));
  if (typeof captured === 'string') {
    if (captured.startsWith('data:')) {
      const commaIndex = captured.indexOf(',');
      return commaIndex >= 0 ? captured.slice(commaIndex + 1) : captured;
    }
    if (Platform.OS === 'web' && !/^(file|content|blob|https?):/i.test(captured)) {
      return captured;
    }
  }

  return FileSystem.readAsStringAsync(captured, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

// Variable de m�dulo para proteger la selecci�n de deselecci�n inmediata
// Cuando un icono es seleccionado, se guarda el timestamp para evitar
// que el onPress del campo lo deseleccione inmediatamente
let lastIconSelectionTime = 0;

function fromRatioCoords(xRatio, yRatio, imageWidth, imageHeight, viewMode) {
  if (viewMode && viewMode !== 'entire') {
    return ratioToDisplay(xRatio, yRatio, viewMode, imageWidth, imageHeight);
  }
  return {
    x: xRatio * imageWidth,
    y: yRatio * imageHeight,
  };
}

// Componentes memoizados para iconos SVG personalizados
const BallImage = React.memo(({ size, rotation }) => {
  return (
    <View style={[
      {
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
      },
      rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined
    ]}>
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
}, (prevProps, nextProps) => prevProps.size === nextProps.size && prevProps.rotation === nextProps.rotation);

// Portería grande profesional (11 jugadores) - 3D con perspectiva profesional y red
const GoalLargeImage = React.memo(({ size, rotation }) => {
  const width = size;
  const height = size * 0.65;

  const netD = React.useMemo(() => {
    const getQuadNetPath = (p0, p1, p2, p3, uDivs = 8, vDivs = 6) => {
      const getPt = (u, v) => {
        const x = (1 - u) * ((1 - v) * p0.x + v * p3.x) + u * ((1 - v) * p1.x + v * p2.x);
        const y = (1 - u) * ((1 - v) * p0.y + v * p3.y) + u * ((1 - v) * p1.y + v * p2.y);
        return { x, y };
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
    const topPanel = getQuadNetPath({ x: 15, y: 32 }, { x: 105, y: 32 }, { x: 98, y: 12 }, { x: 22, y: 12 }, 10, 4);
    const backPanel = getQuadNetPath({ x: 22, y: 12 }, { x: 98, y: 12 }, { x: 98, y: 22 }, { x: 22, y: 22 }, 10, 4);
    const leftPanel = getQuadNetPath({ x: 15, y: 32 }, { x: 22, y: 12 }, { x: 22, y: 22 }, { x: 15, y: 38 }, 4, 4);
    const rightPanel = getQuadNetPath({ x: 105, y: 32 }, { x: 105, y: 38 }, { x: 98, y: 22 }, { x: 98, y: 12 }, 4, 4);

    return `${topPanel}${backPanel}${leftPanel}${rightPanel}`;
  }, []);

  return (
    <View
      style={[
        { width, height },
        rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined,
      ]}
    >
      <Svg width={width} height={height} viewBox="0 0 120 70">
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
        <Path d="M 15 38 L 15 32 L 105 32 L 105 38" stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="square" />
      </Svg>
    </View>
  );
}, (prevProps, nextProps) =>
  prevProps.size === nextProps.size && prevProps.rotation === nextProps.rotation
);

// Portería pequeña (fútbol 7 / mini) - 3D con perspectiva profesional y red
const GoalSmallImage = React.memo(({ size, rotation }) => {
  const width = size * 0.75;
  const height = size * 0.55;

  const netD = React.useMemo(() => {
    const getQuadNetPath = (p0, p1, p2, p3, uDivs = 8, vDivs = 6) => {
      const getPt = (u, v) => {
        const x = (1 - u) * ((1 - v) * p0.x + v * p3.x) + u * ((1 - v) * p1.x + v * p2.x);
        const y = (1 - u) * ((1 - v) * p0.y + v * p3.y) + u * ((1 - v) * p1.y + v * p2.y);
        return { x, y };
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
    const topPanel = getQuadNetPath({ x: 10, y: 23 }, { x: 70, y: 23 }, { x: 65, y: 10 }, { x: 15, y: 10 }, 8, 4);
    const backPanel = getQuadNetPath({ x: 15, y: 10 }, { x: 65, y: 10 }, { x: 65, y: 17 }, { x: 15, y: 17 }, 8, 4);
    const leftPanel = getQuadNetPath({ x: 10, y: 23 }, { x: 15, y: 10 }, { x: 15, y: 17 }, { x: 10, y: 28 }, 4, 4);
    const rightPanel = getQuadNetPath({ x: 70, y: 23 }, { x: 70, y: 28 }, { x: 65, y: 17 }, { x: 65, y: 10 }, 4, 4);

    return `${topPanel}${backPanel}${leftPanel}${rightPanel}`;
  }, []);

  return (
    <View
      style={[
        { width, height },
        rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined,
      ]}
    >
      <Svg width={width} height={height} viewBox="0 0 80 50">
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
        <Path d="M 10 28 L 10 23 L 70 23 L 70 28" stroke="#FF6B00" strokeWidth="3.5" fill="none" strokeLinecap="square" />
      </Svg>
    </View>
  );
}, (prevProps, nextProps) =>
  prevProps.size === nextProps.size && prevProps.rotation === nextProps.rotation
);

// Valla/Barrera de entrenamiento (antes era "goal")
const BarrierImage = React.memo(({ size, rotation, color = '#FFFFFF' }) => {
  const width = size;
  const height = size * 0.4;

  return (
    <View
      style={[
        { width, height },
        rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined,
      ]}
    >
      <Svg width={width} height={height} viewBox="0 0 100 40">
        {/* Valla - 3 lados */}
        <Path d="M 5 35 L 5 8 L 95 8 L 95 35" stroke={color} strokeWidth="3" fill="none" />
      </Svg>
    </View>
  );
}, (prevProps, nextProps) =>
  prevProps.size === nextProps.size && prevProps.rotation === nextProps.rotation && prevProps.color === nextProps.color
);

// Maniqu� de entrenamiento
const DummyImage = React.memo(({ size, rotation, color = '#2196F3' }) => {
  const width = size * 0.5;
  const height = size;
  // Calcular color m�s oscuro para el borde
  const darkerColor = color === '#2196F3' ? '#1565C0' : color;

  return (
    <View
      style={[
        { width, height },
        rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined,
      ]}
    >
      <Svg width={width} height={height} viewBox="0 0 40 80">
        {/* Base/soporte */}
        <Circle cx="20" cy="75" r="8" fill="#333333" />
        {/* Poste central */}
        <Rect x="18" y="25" width="4" height="50" fill="#444444" />
        {/* Torso del maniqu� */}
        <Path d="M 8 25 Q 20 20 32 25 L 30 50 Q 20 52 10 50 Z" fill={color} stroke={darkerColor} strokeWidth="1" />
        {/* Hombros */}
        <Path d="M 5 28 Q 20 22 35 28" stroke={darkerColor} strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Cabeza */}
        <Circle cx="20" cy="12" r="10" fill="#FFE0B2" stroke="#FFCC80" strokeWidth="1" />
      </Svg>
    </View>
  );
}, (prevProps, nextProps) =>
  prevProps.size === nextProps.size && prevProps.rotation === nextProps.rotation && prevProps.color === nextProps.color
);

// Pica (palo con cono)
const PoleImage = React.memo(({ size, rotation, color = '#FFD700' }) => {
  const width = size * 0.3;
  const height = size;

  return (
    <View
      style={[
        { width, height },
        rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined,
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
}, (prevProps, nextProps) =>
  prevProps.size === nextProps.size && prevProps.rotation === nextProps.rotation && prevProps.color === nextProps.color
);

// Cono de f�tbol profesional
const ConeProImage = React.memo(({ size, color = '#FF6B00' }) => {
  const width = size;
  const height = size;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 50 50">
        {/* Cono con degradado visual */}
        <Path d="M 10 45 L 25 8 L 40 45 Z" fill={color} stroke="#000" strokeWidth="1" />
        {/* L�neas blancas reflectantes */}
        <Path d="M 15 38 L 25 15 L 35 38" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.7" />
        {/* Base del cono */}
        <Rect x="8" y="43" width="34" height="5" fill={color} stroke="#000" strokeWidth="1" rx="1" />
        {/* Highlight */}
        <Path d="M 18 35 L 25 18" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
      </Svg>
    </View>
  );
}, (prevProps, nextProps) =>
  prevProps.size === nextProps.size && prevProps.color === nextProps.color
);

// Cono plano/disco (peque�o y circular)
const ConeFlatImage = React.memo(({ size, color = '#FF6B00' }) => {
  const actualSize = size || 18;
  return (
    <View style={{ width: actualSize, height: actualSize * 0.5, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={actualSize} height={actualSize * 0.5} viewBox="0 0 40 20">
        {/* Elipse principal del disco */}
        <Path
          d="M 2 14 Q 20 22 38 14 Q 20 6 2 14 Z"
          fill={color}
          stroke="#000"
          strokeWidth="1"
        />
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
}, (prevProps, nextProps) =>
  prevProps.size === nextProps.size && prevProps.color === nextProps.color
);

// Aro de entrenamiento (c�rculo hueco)
const RingImage = React.memo(({ size, color = '#FFD700' }) => {
  const actualSize = size || 24;
  const strokeWidth = Math.max(2, actualSize * 0.12);
  return (
    <View style={{ width: actualSize, height: actualSize, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={actualSize} height={actualSize} viewBox="0 0 40 40">
        {/* C�rculo hueco (aro) */}
        <Circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
        />
        {/* Sombra interior para dar profundidad */}
        <Circle
          cx="20"
          cy="20"
          r="13"
          fill="none"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1"
        />
      </Svg>
    </View>
  );
}, (prevProps, nextProps) =>
  prevProps.size === nextProps.size && prevProps.color === nextProps.color
);

// Pesas / Mancuernas de entrenamiento
const WeightsImage = React.memo(({ size, color = '#333333' }) => {
  const actualSize = size || 40;
  return (
    <View style={{ width: actualSize, height: actualSize, justifyContent: 'center', alignItems: 'center' }}>
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
}, (prevProps, nextProps) =>
  prevProps.size === nextProps.size && prevProps.color === nextProps.color
);

// Mantener GoalImage como alias de BarrierImage para compatibilidad
const GoalImage = React.memo(({ size, rotation }) => {
  const width = size;
  const height = size;

  return (
    <View
      style={[
        { width, height },
        rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined,
      ]}
    >
      <Svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
      >
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
}, (prevProps, nextProps) =>
  prevProps.size === nextProps.size && prevProps.rotation === nextProps.rotation
);

// Definiciones de formaciones de f�tbol con posiciones en ratios (0-1)
// yRatio: 0 = arriba (ataque), 1 = abajo (defensa)
// xRatio: 0 = izquierda, 1 = derecha
// Posiciones est�ndar disponibles
const POSITION_TYPES = [
  'GK',  // Portero
  'LB',  // Lateral Izquierdo
  'CB',  // Central
  'RB',  // Lateral Derecho
  'CDM', // Mediocentro Defensivo
  'CM',  // Centrocampista
  'CAM', // Mediapunta
  'LM',  // Mediocampista Izquierdo
  'RM',  // Mediocampista Derecho
  'LW',  // Extremo Izquierdo
  'RW',  // Extremo Derecho
  'ST',  // Delantero Centro
  'CF',  // Centro Delantero
];

// Etiquetas por defecto para posiciones (m�ximo 2 caracteres)
// Funci�n que retorna las etiquetas traducidas seg�n el idioma actual
const getDefaultPositionLabels = () => ({
  GK: i18n.t('formations.positionLabels.GK'),
  LB: i18n.t('formations.positionLabels.LB'),
  CB: i18n.t('formations.positionLabels.CB'),
  RB: i18n.t('formations.positionLabels.RB'),
  CDM: i18n.t('formations.positionLabels.CDM'),
  CM: i18n.t('formations.positionLabels.CM'),
  CAM: i18n.t('formations.positionLabels.CAM'),
  LM: i18n.t('formations.positionLabels.LM'),
  RM: i18n.t('formations.positionLabels.RM'),
  LW: i18n.t('formations.positionLabels.LW'),
  RW: i18n.t('formations.positionLabels.RW'),
  ST: i18n.t('formations.positionLabels.ST'),
  CF: i18n.t('formations.positionLabels.CF'),
});

const FORMATIONS = {
  '1-4-4-2': {
    name: '1-4-4-2',
    positions: [
      // Portero
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      // Defensas (4)
      { xRatio: 0.15, yRatio: 0.75, number: 2, position: 'LB' },
      { xRatio: 0.35, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.85, yRatio: 0.75, number: 5, position: 'RB' },
      // Medios (4)
      { xRatio: 0.15, yRatio: 0.6, number: 6, position: 'LM' },
      { xRatio: 0.35, yRatio: 0.6, number: 7, position: 'CM' },
      { xRatio: 0.65, yRatio: 0.6, number: 8, position: 'CM' },
      { xRatio: 0.85, yRatio: 0.6, number: 9, position: 'RM' },
      // Delanteros (2)
      { xRatio: 0.35, yRatio: 0.4, number: 10, position: 'ST' },
      { xRatio: 0.65, yRatio: 0.4, number: 11, position: 'ST' },
    ],
  },
  '1-4-3-3': {
    name: '1-4-3-3',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.15, yRatio: 0.75, number: 2, position: 'LB' },
      { xRatio: 0.35, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.85, yRatio: 0.75, number: 5, position: 'RB' },
      { xRatio: 0.25, yRatio: 0.6, number: 6, position: 'CM' },
      { xRatio: 0.5, yRatio: 0.6, number: 7, position: 'CM' },
      { xRatio: 0.75, yRatio: 0.6, number: 8, position: 'CM' },
      { xRatio: 0.15, yRatio: 0.4, number: 9, position: 'LW' },
      { xRatio: 0.5, yRatio: 0.35, number: 10, position: 'ST' },
      { xRatio: 0.85, yRatio: 0.4, number: 11, position: 'RW' },
    ],
  },
  '1-4-2-3-1': {
    name: '1-4-2-3-1',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.15, yRatio: 0.75, number: 2, position: 'LB' },
      { xRatio: 0.35, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.85, yRatio: 0.75, number: 5, position: 'RB' },
      { xRatio: 0.35, yRatio: 0.6, number: 6, position: 'CDM' },
      { xRatio: 0.65, yRatio: 0.6, number: 7, position: 'CDM' },
      { xRatio: 0.15, yRatio: 0.45, number: 8, position: 'LW' },
      { xRatio: 0.5, yRatio: 0.45, number: 9, position: 'CAM' },
      { xRatio: 0.85, yRatio: 0.45, number: 10, position: 'RW' },
      { xRatio: 0.5, yRatio: 0.35, number: 11, position: 'ST' },
    ],
  },
  '1-3-5-2': {
    name: '1-3-5-2',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.25, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.75, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.1, yRatio: 0.6, number: 5, position: 'LM' },
      { xRatio: 0.3, yRatio: 0.6, number: 6, position: 'CM' },
      { xRatio: 0.5, yRatio: 0.6, number: 7, position: 'CM' },
      { xRatio: 0.7, yRatio: 0.6, number: 8, position: 'CM' },
      { xRatio: 0.9, yRatio: 0.6, number: 9, position: 'RM' },
      { xRatio: 0.35, yRatio: 0.4, number: 10, position: 'ST' },
      { xRatio: 0.65, yRatio: 0.4, number: 11, position: 'ST' },
    ],
  },
  '1-3-4-3': {
    name: '1-3-4-3',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.25, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.75, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.2, yRatio: 0.6, number: 5, position: 'LM' },
      { xRatio: 0.4, yRatio: 0.6, number: 6, position: 'CM' },
      { xRatio: 0.6, yRatio: 0.6, number: 7, position: 'CM' },
      { xRatio: 0.8, yRatio: 0.6, number: 8, position: 'RM' },
      { xRatio: 0.15, yRatio: 0.4, number: 9, position: 'LW' },
      { xRatio: 0.5, yRatio: 0.35, number: 10, position: 'ST' },
      { xRatio: 0.85, yRatio: 0.4, number: 11, position: 'RW' },
    ],
  },
  '1-4-5-1': {
    name: '1-4-5-1',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.15, yRatio: 0.75, number: 2, position: 'LB' },
      { xRatio: 0.35, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.85, yRatio: 0.75, number: 5, position: 'RB' },
      { xRatio: 0.1, yRatio: 0.6, number: 6, position: 'LM' },
      { xRatio: 0.3, yRatio: 0.6, number: 7, position: 'CM' },
      { xRatio: 0.5, yRatio: 0.6, number: 8, position: 'CM' },
      { xRatio: 0.7, yRatio: 0.6, number: 9, position: 'CM' },
      { xRatio: 0.9, yRatio: 0.6, number: 10, position: 'RM' },
      { xRatio: 0.5, yRatio: 0.4, number: 11, position: 'ST' },
    ],
  },
  '1-5-3-2': {
    name: '1-5-3-2',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.1, yRatio: 0.75, number: 2, position: 'LB' },
      { xRatio: 0.3, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.7, yRatio: 0.75, number: 5, position: 'CB' },
      { xRatio: 0.9, yRatio: 0.75, number: 6, position: 'RB' },
      { xRatio: 0.25, yRatio: 0.6, number: 7, position: 'CM' },
      { xRatio: 0.5, yRatio: 0.6, number: 8, position: 'CM' },
      { xRatio: 0.75, yRatio: 0.6, number: 9, position: 'CM' },
      { xRatio: 0.35, yRatio: 0.4, number: 10, position: 'ST' },
      { xRatio: 0.65, yRatio: 0.4, number: 11, position: 'ST' },
    ],
  },
  '1-5-4-1': {
    name: '1-5-4-1',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.1, yRatio: 0.75, number: 2, position: 'LB' },
      { xRatio: 0.3, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.7, yRatio: 0.75, number: 5, position: 'CB' },
      { xRatio: 0.9, yRatio: 0.75, number: 6, position: 'RB' },
      { xRatio: 0.2, yRatio: 0.6, number: 7, position: 'LM' },
      { xRatio: 0.4, yRatio: 0.6, number: 8, position: 'CM' },
      { xRatio: 0.6, yRatio: 0.6, number: 9, position: 'CM' },
      { xRatio: 0.8, yRatio: 0.6, number: 10, position: 'RM' },
      { xRatio: 0.5, yRatio: 0.4, number: 11, position: 'ST' },
    ],
  },
  '1-4-1-4-1': {
    name: '1-4-1-4-1',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.15, yRatio: 0.75, number: 2, position: 'LB' },
      { xRatio: 0.35, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.85, yRatio: 0.75, number: 5, position: 'RB' },
      { xRatio: 0.5, yRatio: 0.65, number: 6, position: 'CDM' },
      { xRatio: 0.15, yRatio: 0.55, number: 7, position: 'LM' },
      { xRatio: 0.35, yRatio: 0.55, number: 8, position: 'CM' },
      { xRatio: 0.65, yRatio: 0.55, number: 9, position: 'CM' },
      { xRatio: 0.85, yRatio: 0.55, number: 10, position: 'RM' },
      { xRatio: 0.5, yRatio: 0.4, number: 11, position: 'ST' },
    ],
  },
  '1-3-4-1-2': {
    name: '1-3-4-1-2',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.25, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.75, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.2, yRatio: 0.6, number: 5, position: 'LM' },
      { xRatio: 0.4, yRatio: 0.6, number: 6, position: 'CM' },
      { xRatio: 0.6, yRatio: 0.6, number: 7, position: 'CM' },
      { xRatio: 0.8, yRatio: 0.6, number: 8, position: 'RM' },
      { xRatio: 0.5, yRatio: 0.5, number: 9, position: 'CAM' },
      { xRatio: 0.35, yRatio: 0.4, number: 10, position: 'ST' },
      { xRatio: 0.65, yRatio: 0.4, number: 11, position: 'ST' },
    ],
  },
  '1-4-3-2-1': {
    name: '1-4-3-2-1',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.15, yRatio: 0.75, number: 2, position: 'LB' },
      { xRatio: 0.35, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.85, yRatio: 0.75, number: 5, position: 'RB' },
      { xRatio: 0.25, yRatio: 0.6, number: 6, position: 'CM' },
      { xRatio: 0.5, yRatio: 0.6, number: 7, position: 'CM' },
      { xRatio: 0.75, yRatio: 0.6, number: 8, position: 'CM' },
      { xRatio: 0.35, yRatio: 0.4, number: 9, position: 'CAM' },
      { xRatio: 0.65, yRatio: 0.4, number: 10, position: 'CAM' },
      { xRatio: 0.5, yRatio: 0.35, number: 11, position: 'ST' },
    ],
  },
  '1-4-1-2-1-2': {
    name: '1-4-1-2-1-2',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.15, yRatio: 0.75, number: 2, position: 'LB' },
      { xRatio: 0.35, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.85, yRatio: 0.75, number: 5, position: 'RB' },
      { xRatio: 0.5, yRatio: 0.65, number: 6, position: 'CDM' },
      { xRatio: 0.35, yRatio: 0.55, number: 7, position: 'CM' },
      { xRatio: 0.65, yRatio: 0.55, number: 8, position: 'CM' },
      { xRatio: 0.5, yRatio: 0.45, number: 9, position: 'CAM' },
      { xRatio: 0.35, yRatio: 0.35, number: 10, position: 'ST' },
      { xRatio: 0.65, yRatio: 0.35, number: 11, position: 'ST' },
    ],
  },
};

// Formaciones para 8 jugadores (f�tbol 8)
const FORMATIONS_8 = {
  '1-3-3-1': {
    name: '1-3-3-1',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.25, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.75, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.25, yRatio: 0.55, number: 5, position: 'LM' },
      { xRatio: 0.5, yRatio: 0.55, number: 6, position: 'CM' },
      { xRatio: 0.75, yRatio: 0.55, number: 7, position: 'RM' },
      { xRatio: 0.5, yRatio: 0.35, number: 8, position: 'ST' },
    ],
  },
  '1-2-3-2': {
    name: '1-2-3-2',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.35, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.25, yRatio: 0.55, number: 4, position: 'LM' },
      { xRatio: 0.5, yRatio: 0.55, number: 5, position: 'CM' },
      { xRatio: 0.75, yRatio: 0.55, number: 6, position: 'RM' },
      { xRatio: 0.35, yRatio: 0.35, number: 7, position: 'ST' },
      { xRatio: 0.65, yRatio: 0.35, number: 8, position: 'ST' },
    ],
  },
  '1-3-2-2': {
    name: '1-3-2-2',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.25, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.75, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.35, yRatio: 0.55, number: 5, position: 'CM' },
      { xRatio: 0.65, yRatio: 0.55, number: 6, position: 'CM' },
      { xRatio: 0.35, yRatio: 0.35, number: 7, position: 'ST' },
      { xRatio: 0.65, yRatio: 0.35, number: 8, position: 'ST' },
    ],
  },
  '1-2-4-1': {
    name: '1-2-4-1',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.35, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.15, yRatio: 0.55, number: 4, position: 'LM' },
      { xRatio: 0.38, yRatio: 0.55, number: 5, position: 'CM' },
      { xRatio: 0.62, yRatio: 0.55, number: 6, position: 'CM' },
      { xRatio: 0.85, yRatio: 0.55, number: 7, position: 'RM' },
      { xRatio: 0.5, yRatio: 0.35, number: 8, position: 'ST' },
    ],
  },
  '1-3-1-3': {
    name: '1-3-1-3',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.25, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.75, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.55, number: 5, position: 'CM' },
      { xRatio: 0.2, yRatio: 0.35, number: 6, position: 'LW' },
      { xRatio: 0.5, yRatio: 0.35, number: 7, position: 'ST' },
      { xRatio: 0.8, yRatio: 0.35, number: 8, position: 'RW' },
    ],
  },
  '1-4-2-1': {
    name: '1-4-2-1',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.15, yRatio: 0.75, number: 2, position: 'LB' },
      { xRatio: 0.38, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.62, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.85, yRatio: 0.75, number: 5, position: 'RB' },
      { xRatio: 0.35, yRatio: 0.55, number: 6, position: 'CM' },
      { xRatio: 0.65, yRatio: 0.55, number: 7, position: 'CM' },
      { xRatio: 0.5, yRatio: 0.35, number: 8, position: 'ST' },
    ],
  },
};

// Formaciones para 7 jugadores (f�tbol 7)
const FORMATIONS_7 = {
  '1-3-2-1': {
    name: '1-3-2-1',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.25, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.75, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.35, yRatio: 0.55, number: 5, position: 'CM' },
      { xRatio: 0.65, yRatio: 0.55, number: 6, position: 'CM' },
      { xRatio: 0.5, yRatio: 0.35, number: 7, position: 'ST' },
    ],
  },
  '1-2-3-1': {
    name: '1-2-3-1',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.35, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.25, yRatio: 0.55, number: 4, position: 'LM' },
      { xRatio: 0.5, yRatio: 0.55, number: 5, position: 'CM' },
      { xRatio: 0.75, yRatio: 0.55, number: 6, position: 'RM' },
      { xRatio: 0.5, yRatio: 0.35, number: 7, position: 'ST' },
    ],
  },
  '1-2-2-2': {
    name: '1-2-2-2',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.35, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.35, yRatio: 0.55, number: 4, position: 'CM' },
      { xRatio: 0.65, yRatio: 0.55, number: 5, position: 'CM' },
      { xRatio: 0.35, yRatio: 0.35, number: 6, position: 'ST' },
      { xRatio: 0.65, yRatio: 0.35, number: 7, position: 'ST' },
    ],
  },
  '1-3-1-2': {
    name: '1-3-1-2',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.25, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.75, yRatio: 0.75, number: 4, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.55, number: 5, position: 'CM' },
      { xRatio: 0.35, yRatio: 0.35, number: 6, position: 'ST' },
      { xRatio: 0.65, yRatio: 0.35, number: 7, position: 'ST' },
    ],
  },
  '1-1-3-2': {
    name: '1-1-3-2',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.5, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.25, yRatio: 0.55, number: 3, position: 'LM' },
      { xRatio: 0.5, yRatio: 0.55, number: 4, position: 'CM' },
      { xRatio: 0.75, yRatio: 0.55, number: 5, position: 'RM' },
      { xRatio: 0.35, yRatio: 0.35, number: 6, position: 'ST' },
      { xRatio: 0.65, yRatio: 0.35, number: 7, position: 'ST' },
    ],
  },
  '1-2-1-3': {
    name: '1-2-1-3',
    positions: [
      { xRatio: 0.5, yRatio: 0.92, number: 1, position: 'GK' },
      { xRatio: 0.35, yRatio: 0.75, number: 2, position: 'CB' },
      { xRatio: 0.65, yRatio: 0.75, number: 3, position: 'CB' },
      { xRatio: 0.5, yRatio: 0.55, number: 4, position: 'CM' },
      { xRatio: 0.2, yRatio: 0.35, number: 5, position: 'LW' },
      { xRatio: 0.5, yRatio: 0.35, number: 6, position: 'ST' },
      { xRatio: 0.8, yRatio: 0.35, number: 7, position: 'RW' },
    ],
  },
};

// Mapa de formaciones por cantidad de jugadores
const FORMATIONS_BY_PLAYER_COUNT = {
  7: FORMATIONS_7,
  8: FORMATIONS_8,
  11: FORMATIONS,
};

// Legacy helper removed "� field selection now uses lineType + viewMode directly

// Funci�n para obtener los iconos iniciales con etiquetas traducidas
const getInitialIcons = () => [
  { id: 'icon1', type: 'player', label: i18n.t('tacticalBoard.icons.bluePlayer'), color: '#2176ff', size: 24, number: 1 },
  { id: 'icon2', type: 'player', label: i18n.t('tacticalBoard.icons.redPlayer'), color: '#ff3838', size: 24, number: 1 },
  { id: 'icon3', type: 'player', label: i18n.t('tacticalBoard.icons.orangePlayer'), color: '#ffa600', size: 24, number: 1 },
  { id: 'team-players', type: 'team-players', label: i18n.t('tacticalBoard.icons.teamPlayers'), color: '#000000ff', size: 24 },
  { id: 'coaching-staff', type: 'coaching-staff', label: i18n.t('tacticalBoard.icons.coachingStaff'), color: '#333333', size: 24 },
  { id: 'materials-button', type: 'materials-button', label: i18n.t('tacticalBoard.icons.materials'), color: '#666', size: 24 },
  { id: 'straight-arrow', type: 'straight-arrow', label: i18n.t('tacticalBoard.icons.straightArrow'), color: '#000000', size: 32, thickness: 1 },
  { id: 'straight-line', type: 'straight-line', label: i18n.t('tacticalBoard.icons.straightLine'), color: '#000000', size: 32, thickness: 1 },
  { id: 'curve-line', type: 'curve-line', label: i18n.t('tacticalBoard.icons.curvedLine'), color: '#000000', size: 32, thickness: 1 },
  { id: 'curve-arrow', type: 'curve-arrow', label: i18n.t('tacticalBoard.icons.curvedArrow'), color: '#000000', size: 32, thickness: 1 },
  { id: 'circle', type: 'circle', label: i18n.t('tacticalBoard.icons.circle'), color: '#000000', size: 32, thickness: 1 },
  { id: 'rectangle', type: 'rectangle', label: i18n.t('tacticalBoard.icons.rectangle'), color: '#000000', size: 32, thickness: 1 },
  { id: 'custom-shape-button', type: 'custom-shape-button', label: i18n.t('tacticalBoard.icons.customShape'), color: '#000000', size: 32, thickness: 1, inPalette: true },
];

// Set de tipos de materiales/herramientas para filtrado r�pido
const MATERIAL_TYPES_SET = new Set(['ball', 'ball-shadow', 'cone-pro', 'cone-flat', 'ring', 'goal-large', 'goal-small', 'barrier', 'dummy', 'pole', 'ladder', 'weights']);

// Set de tipos de l�neas/formas
const LINE_TYPES_SET = new Set(['straight-line', 'straight-arrow', 'curve-line', 'curve-arrow', 'circle', 'rectangle', 'custom-shape']);

// Bases de z-index por grupo (l�neas abajo, materiales medio, jugadores/staff arriba)
const ZINDEX_BASE_LINES = 1000;
const ZINDEX_BASE_MATERIALS = 5000;
const ZINDEX_BASE_ICONS = 10000;

function getZIndexBaseForType(type) {
  if (LINE_TYPES_SET.has(type)) return ZINDEX_BASE_LINES;
  if (MATERIAL_TYPES_SET.has(type)) return ZINDEX_BASE_MATERIALS;
  return ZINDEX_BASE_ICONS;
}

const ACTIVE_BOARD_DRAG_KEY = '__activeBoardDragKey';

function acquireBoardDrag(dragStart, dragKey) {
  if (!dragStart?.current) return false;
  const key = String(dragKey);
  const activeKey = dragStart.current[ACTIVE_BOARD_DRAG_KEY];
  if (activeKey && activeKey !== key) return false;
  dragStart.current[ACTIVE_BOARD_DRAG_KEY] = key;
  return true;
}

function isBoardDragOwner(dragStart, dragKey) {
  return dragStart?.current?.[ACTIVE_BOARD_DRAG_KEY] === String(dragKey);
}

function releaseBoardDrag(dragStart, dragKey) {
  if (isBoardDragOwner(dragStart, dragKey)) {
    delete dragStart.current[ACTIVE_BOARD_DRAG_KEY];
  }
}

// Funci�n para obtener los iconos de materiales con etiquetas traducidas
const getMaterialsIcons = () => [
  { id: 'ball', type: 'ball', label: i18n.t('tacticalBoard.icons.ball'), color: '#fff', size: 14, editable: true },
  { id: 'cone-pro', type: 'cone-pro', label: i18n.t('tacticalBoard.icons.cone'), color: '#FF6B00', size: 18, editable: true },
  { id: 'cone-flat', type: 'cone-flat', label: i18n.t('tacticalBoard.icons.coneFlat'), color: '#FF6B00', size: 24, editable: true },
  { id: 'ring', type: 'ring', label: i18n.t('tacticalBoard.icons.ring'), color: '#FFD700', size: 24, editable: true },
  { id: 'goal-large', type: 'goal-large', label: i18n.t('tacticalBoard.icons.bigGoal'), color: '#FFFFFF', size: 50, rotatable: true, editable: true },
  { id: 'goal-small', type: 'goal-small', label: i18n.t('tacticalBoard.icons.smallGoal'), color: '#FF6B00', size: 40, rotatable: true, editable: true },
  { id: 'barrier', type: 'barrier', label: i18n.t('tacticalBoard.icons.fence'), color: '#FFFFFF', size: 40, rotatable: true, editable: true },
  { id: 'dummy', type: 'dummy', label: i18n.t('tacticalBoard.icons.mannequin'), color: '#2196F3', size: 40, rotatable: true, editable: true },
  { id: 'pole', type: 'pole', label: i18n.t('tacticalBoard.icons.pole'), color: '#FFD700', size: 35, rotatable: true, editable: true },
  { id: 'ladder', type: 'ladder', label: i18n.t('tacticalBoard.icons.ladder'), color: '#000000', size: 40, rotatable: true, editable: true },
  { id: 'weights', type: 'weights', label: i18n.t('tacticalBoard.icons.weights'), color: '#333333', size: 24, editable: true },
];

function isValidHexColor(color) {
  return typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color);
}

// Funci�n para obtener abreviatura de posici�n de jugador
function getPositionAbbreviation(position) {
  if (!position) return '';
  const positionLower = position.toLowerCase();
  const abbreviations = {
    'portero': 'POR',
    'goalkeeper': 'GK',
    'lateral': 'LAT',
    'lateral derecho': 'LD',
    'lateral izquierdo': 'LI',
    'right back': 'RB',
    'left back': 'LB',
    'central': 'DEF',
    'defensa': 'DEF',
    'defensa central': 'DC',
    'center back': 'CB',
    'centrocampista': 'MC',
    'mediocentro': 'MC',
    'mediocampista': 'MC',
    'midfielder': 'MF',
    'central midfielder': 'CM',
    'pivote': 'PIV',
    'mediapunta': 'MP',
    'attacking midfielder': 'AM',
    'extremo': 'EXT',
    'extremo derecho': 'ED',
    'extremo izquierdo': 'EI',
    'winger': 'W',
    'right winger': 'RW',
    'left winger': 'LW',
    'delantero': 'DEL',
    'delantero centro': 'DC',
    'forward': 'FW',
    'striker': 'ST',
  };
  return abbreviations[positionLower] || position.substring(0, 3).toUpperCase();
}

function useScreenDimensions() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    return () => sub?.remove();
  }, []);
  return dimensions;
}

function OptionsMenu({
  visible,
  onClose,
  onDelete,
  onDuplicate,
  onRotate = null,
  onEdit = null,
  onIncreaseSize = null,
  onDecreaseSize = null,
  onLock = null,
  onBringToFront = null,
  onSendToBack = null,
  isLocked = false,
  position = { x: 0, y: 0 },
  hideEdit = false,
  isMobile = false,
}) {
  const { t } = useTranslation();
  // Detectar si es tablet
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;

  // Tama�os fijos del men� (sin escalar seg�n la imagen)
  const menuWidth = isTablet ? 160 : 145;
  const menuItemHeight = isTablet ? 42 : 38;
  const fontSize = isTablet ? 14 : 13;
  const iconSize = isTablet ? 18 : 16;
  const horizontalPadding = isTablet ? 14 : 12;
  const verticalPadding = isTablet ? 10 : 9;
  const iconTextGap = isTablet ? 12 : 10;

  if (!visible) return null;

  // Calcular el n�mero de items visibles
  const itemCount = [
    true, // Duplicar
    onRotate,
    onIncreaseSize,
    onDecreaseSize,
    onEdit && !hideEdit,
    onLock,
    onBringToFront,
    onSendToBack,
    true // Eliminar
  ].filter(Boolean).length;

  const estimatedMenuHeight = itemCount * menuItemHeight;

  // Ajustar posici�n para que no se salga de la pantalla
  let adjustedX = position.x;
  let adjustedY = position.y;

  // Offset para que el men� aparezca al lado del icono, no encima
  const offsetX = 10; // Peque�o margen a la derecha

  // Ajuste horizontal - intentar mostrar a la derecha del elemento
  if (adjustedX + menuWidth + offsetX > width - 10) {
    // Si no cabe a la derecha, mostrarlo a la izquierda
    adjustedX = adjustedX - menuWidth - offsetX;
  } else {
    adjustedX = adjustedX + offsetX;
  }

  // Asegurar que no se salga por la izquierda
  if (adjustedX < 10) {
    adjustedX = 10;
  }

  // Ajuste vertical - centrar el men� verticalmente respecto al punto de toque
  // En m�vil, mostrar m�s abajo para no interferir con los botones flotantes
  const verticalOffset = isMobile ? 60 : 0; // Offset adicional para m�vil
  adjustedY = adjustedY - (estimatedMenuHeight / 2) + verticalOffset;

  // Asegurar que no se salga por arriba
  if (adjustedY < 10) {
    adjustedY = 10;
  }

  // Asegurar que no se salga por abajo
  if (adjustedY + estimatedMenuHeight > height - 10) {
    adjustedY = height - estimatedMenuHeight - 10;
  }

  // Estilos multiplataforma optimizados
  const menuStyle = {
    position: 'absolute',
    minWidth: menuWidth,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    zIndex: 1000,
    left: adjustedX,
    top: adjustedY,
    // Sombra multiplataforma
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
    // Borde para mejor definici�n
    borderColor: '#e0e0e0',
  };

  const menuItemStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: horizontalPadding,
    paddingVertical: verticalPadding,
    minHeight: menuItemHeight,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  };

  const lastItemStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: horizontalPadding,
    paddingVertical: verticalPadding,
    minHeight: menuItemHeight,
  };

  const textStyle = {
    fontSize,
    color: '#2c3e50',
    fontWeight: '600',
    flexShrink: 0,
    // Optimizaci�n multiplataforma
    includeFontPadding: false,
    verticalAlign: 'middle',
  };

  const iconContainerStyle = {
    width: iconSize,
    height: iconSize,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iconTextGap,
    flexShrink: 0,
  };

  const MenuItem = ({ onPress, iconName, iconColor, label, isLast = false }) => (
    <TouchableOpacity
      style={isLast ? lastItemStyle : menuItemStyle}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
    >
      <View style={iconContainerStyle}>
        <Feather name={iconName} size={iconSize} color={iconColor} />
      </View>
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
        }} />
      </TouchableWithoutFeedback>

      <View style={menuStyle}>
        <MenuItem
          onPress={() => { onDuplicate(); onClose(); }}
          iconName="copy"
          iconColor="#27ae60"
          label={t('tacticalBoard.menu.duplicate')}
        />

        {onRotate && (
          <MenuItem
            onPress={onRotate}
            iconName="rotate-cw"
            iconColor="#007aff"
            label={t('tacticalBoard.menu.rotate')}
          />
        )}

        {onIncreaseSize && (
          <MenuItem
            onPress={onIncreaseSize}
            iconName="plus-circle"
            iconColor="#27ae60"
            label={t('tacticalBoard.menu.increase')}
          />
        )}

        {onDecreaseSize && (
          <MenuItem
            onPress={onDecreaseSize}
            iconName="minus-circle"
            iconColor="#e74c3c"
            label={t('tacticalBoard.menu.decrease')}
          />
        )}

        {onEdit && !hideEdit && (
          <MenuItem
            onPress={() => { onEdit(); onClose(); }}
            iconName="settings"
            iconColor="#8e44ad"
            label={t('tacticalBoard.menu.moreOptions')}
          />
        )}

        {onLock && (
          <MenuItem
            onPress={() => { onLock(); onClose(); }}
            iconName={isLocked ? "unlock" : "lock"}
            iconColor={isLocked ? "#f39c12" : "#3498db"}
            label={isLocked ? t('tacticalBoard.menu.unlock') : t('tacticalBoard.menu.lock')}
          />
        )}

        {onBringToFront && (
          <MenuItem
            onPress={() => { onBringToFront(); onClose(); }}
            iconName="arrow-up-circle"
            iconColor="#9b59b6"
            label={t('tacticalBoard.menu.bringToFront')}
          />
        )}

        {onSendToBack && (
          <MenuItem
            onPress={() => { onSendToBack(); onClose(); }}
            iconName="arrow-down-circle"
            iconColor="#8e44ad"
            label={t('tacticalBoard.menu.sendToBack')}
          />
        )}

        <MenuItem
          onPress={() => { onDelete(); onClose(); }}
          iconName="trash-2"
          iconColor="#ff3b30"
          label={t('tacticalBoard.menu.delete')}
          isLast={true}
        />
      </View>
    </>
  );
}

// Mantenemos el ControlButton para compatibilidad, pero no lo usaremos directamente
function ControlButton({ onPress, color, position, scale = 1 }) {
  const buttonSize = 28 * scale;
  const iconSize = 16 * scale;

  // Definir posiciones para cada tipo de bot�n
  let positionStyle;
  if (position === 'delete') {
    positionStyle = { top: -buttonSize / 4, right: -buttonSize / 4 };
  } else if (position === 'duplicate') {
    positionStyle = { top: -buttonSize / 4, right: buttonSize }; // Posicionado a la izquierda del bot�n de eliminar
  } else {
    positionStyle = { top: -buttonSize / 4, left: -buttonSize / 4 }; // Bot�n de rotaci�n
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[{
        position: 'absolute',
        width: buttonSize,
        height: buttonSize,
        borderRadius: buttonSize / 2,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#dddddd',
        zIndex: 100,
        ...positionStyle
      }]}
    >
      {position === 'delete' ? (
        <Feather name="x" size={iconSize} color={color || "#ff3b30"} />
      ) : position === 'duplicate' ? (
        <Feather name="copy" size={iconSize} color={color || "#27ae60"} />
      ) : (
        <Feather name="rotate-cw" size={iconSize} color={color || "#007aff"} />
      )}
    </TouchableOpacity>
  );
}

const FreeTextTool = React.memo(({
  textObj,
  idx,
  imageWidth,
  imageHeight,
  selectedCloneId,
  setSelectedCloneId,
  setOptionsMenu,
  saveClonesHistory,
  multiSelectMode,
  selectedCloneIds,
  selectedCloneIdsSet,
  selectionInteractionMode,
  clones,
  setClones,
  dragStart,
  eraserMode,
  onEraseElement,
  viewMode,
  zoomLevel = 1,
  setDraggingOutside = null,
}) => {
  // Detectar si es m�vil
  const { width, height } = Dimensions.get('window');
  const isMobile = Math.min(width, height) < 768;
  // Factor de escala aumentado para m�viles
  const baseScale = Math.min(imageWidth, imageHeight) / 500;
  const scale = isMobile ? baseScale * 1.35 : baseScale;
  const rafRef = useRef(null);
  const pendingUpdateRef = useRef(null);

  const dragKey = `text-${textObj.id}`;

  // Usar Set para O(1) lookup
  const isMultiSelected = selectedCloneIdsSet ? selectedCloneIdsSet.has(textObj.id) : selectedCloneIds.includes(textObj.id);

  // Indicador visual de zona de eliminaci�n (ref para evitar re-renders innecesarios durante drag)
  const isNearDeleteZoneRef = useRef(false);
  const [deleteZoneTick, setDeleteZoneTick] = useState(0);
  const isNearDeleteZone = isNearDeleteZoneRef.current;
  const setIsNearDeleteZone = useCallback((val) => {
    if (isNearDeleteZoneRef.current !== val) {
      isNearDeleteZoneRef.current = val;
      setDeleteZoneTick(t => t + 1);
    }
  }, []);
  const scheduleTextDragUpdate = useCallback((updater) => {
    pendingUpdateRef.current = updater;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      if (pendingUpdateRef.current) {
        setClones(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
      rafRef.current = null;
    });
  }, [setClones]);

  // En multi-drag, derivar indicador de eliminaci�n de la posici�n actual del elemento
  const textDisplayX = textObj.x !== undefined ? textObj.x : (textObj.xRatio || 0.5) * imageWidth;
  const textDisplayY = textObj.y !== undefined ? textObj.y : (textObj.yRatio || 0.5) * imageHeight;
  const isOutsideInMultiDrag = ALLOW_MULTI_ELEMENT_DRAG && multiSelectMode && selectionInteractionMode === 'move' && isMultiSelected &&
    (textDisplayX < 0 || textDisplayX > imageWidth || textDisplayY < 0 || textDisplayY > imageHeight);
  const showDeleteIndicator = isNearDeleteZone || isOutsideInMultiDrag;

  return (
    <PanGestureHandler
      key={dragKey}
      enabled={!eraserMode && !textObj.locked && (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isMultiSelected))}
      shouldCancelWhenOutside={false}
      avgTouches={Platform.OS === 'android'}
      activeOffsetX={[-1, 1]}
      activeOffsetY={[-1, 1]}
      onHandlerStateChange={e => {
        // Iniciar drag en BEGAN para respuesta inmediata
        if (e.nativeEvent.state === State.BEGAN && !textObj.locked) {
          setDraggingOutside?.(false);
          if (!acquireBoardDrag(dragStart, dragKey)) return;
          // Multi-drag support
          if (ALLOW_MULTI_ELEMENT_DRAG && multiSelectMode && selectionInteractionMode === 'move' && isMultiSelected) {
            const initialPositions = {};
            selectedCloneIds.forEach(id => {
              const c = clones.find(cl => cl.id === id);
              if (!c) return;
              if (c.points && Array.isArray(c.points)) {
                initialPositions[id] = c.points.map(p => ({ x: p.x, y: p.y }));
              } else {
                initialPositions[id] = { xRatio: c.xRatio, yRatio: c.yRatio };
              }
            });
            dragStart.current[dragKey] = {
              multiSelect: true,
              selectedIds: [...selectedCloneIds],
              initialPositions,
            };
          } else {
            dragStart.current[dragKey] = {
              xRatio: textObj.xRatio,
              yRatio: textObj.yRatio,
              id: textObj.id
            };
          }
        }
        if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED || e.nativeEvent.state === State.FAILED) {
          setDraggingOutside?.(false);
          setIsNearDeleteZone(false);
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          if (pendingUpdateRef.current) {
            setClones(pendingUpdateRef.current);
            pendingUpdateRef.current = null;
          }
          // Verificar si elementos est�n fuera del campo y eliminarlos
          if (e.nativeEvent.state === State.END && dragStart.current[dragKey]) {
            const start = dragStart.current[dragKey];
            if (start.multiSelect && start.selectedIds) {
              // Multi-drag: eliminar TODOS los seleccionados que est�n fuera del campo
              setClones((prev) => {
                const toDelete = [];
                const remaining = prev.filter(c => {
                  if (!start.selectedIds.includes(c.id) || c.locked) return true;
                  let outside = false;
                  if (c.points && Array.isArray(c.points) && c.points.length >= 2) {
                    outside = areAllPointsOutside(c.points, viewMode, imageWidth, imageHeight);
                  } else if (c.xRatio !== undefined) {
                    outside = isOutsideVisibleField(c.xRatio, c.yRatio, viewMode, imageWidth, imageHeight);
                  }
                  if (outside) { toDelete.push(c); return false; }
                  return true;
                });
                return toDelete.length > 0 ? remaining : prev;
              });
            } else {
              // Single drag: solo eliminar este elemento
              setClones((prev) => {
                const currentClone = prev.find(c => c.id === textObj.id);
                if (currentClone && !currentClone.locked) {
                  const { xRatio, yRatio } = currentClone;
                  if (isOutsideVisibleField(xRatio, yRatio, viewMode, imageWidth, imageHeight)) {
                    return prev.filter(c => c.id !== textObj.id);
                  }
                }
                return prev;
              });
            }
          }
          delete dragStart.current[dragKey];
          releaseBoardDrag(dragStart, dragKey);
          // Guardar en historial al finalizar el drag
          if (saveClonesHistory) saveClonesHistory();
        }
      }}
      onGestureEvent={e => {
        if (e.nativeEvent.state === State.ACTIVE && !textObj.locked && dragStart.current[dragKey] && isBoardDragOwner(dragStart, dragKey)) {
          const base = dragStart.current[dragKey];
          // Dividir translaci�n por zoomLevel para compensar la escala del contenedor
          const { dxRatio: dx, dyRatio: dy } = deltaToRatio(e.nativeEvent.translationX / zoomLevel, e.nativeEvent.translationY / zoomLevel, viewMode, imageWidth, imageHeight);

          const newX = (base.multiSelect ? (textObj.xRatio || 0) : base.xRatio) + dx;
          const newY = (base.multiSelect ? (textObj.yRatio || 0) : base.yRatio) + dy;

          // Multi-drag update
          if (base.multiSelect && base.selectedIds && base.initialPositions) {
            const anyOutside = base.selectedIds.some(id => {
              const init = base.initialPositions[id];
              if (!init) return false;
              const candidate = Array.isArray(init)
                ? { points: init.map(pt => ({ x: pt.x + dx, y: pt.y + dy })) }
                : { xRatio: (init.xRatio || 0) + dx, yRatio: (init.yRatio || 0) + dy };
              return isBoardCloneOutsideForDelete(candidate, viewMode, imageWidth, imageHeight);
            });
            setDraggingOutside?.(anyOutside);
            scheduleTextDragUpdate(prev => prev.map(c => {
              if (!base.selectedIds.includes(c.id)) return c;
              const init = base.initialPositions[c.id];
              if (!init) return c;
              if (Array.isArray(init)) {
                return {
                  ...c,
                  // Permitir valores fuera de 0-1 para que el elemento pueda salir del campo
                  points: init.map(pt => ({ x: pt.x + dx, y: pt.y + dy }))
                };
              }
              return {
                ...c,
                xRatio: (init.xRatio || 0) + dx,
                yRatio: (init.yRatio || 0) + dy
              };
            }));
            return;
          }

          // Actualizar indicador visual de zona de eliminaci�n
          const inDeleteZone = isOutsideVisibleField(newX, newY, viewMode, imageWidth, imageHeight);
          setDraggingOutside?.(inDeleteZone);
          if (inDeleteZone !== isNearDeleteZone) {
            setIsNearDeleteZone(inDeleteZone);
          }

          scheduleTextDragUpdate(prev => {
            const correctIndex = prev.findIndex(c => c.id === textObj.id);
            if (correctIndex === -1) return prev;

            const next = [...prev];
            next[correctIndex] = {
              ...next[correctIndex],
              xRatio: base.xRatio + dx,
              yRatio: base.yRatio + dy,
            };
            return next;
          });
        }
      }}
    >
      <View
        key={textObj.id}
        style={{
          position: 'absolute',
          left: textObj.x !== undefined ? textObj.x : (textObj.xRatio || 0.5) * imageWidth,
          top: textObj.y !== undefined ? textObj.y : (textObj.yRatio || 0.5) * imageHeight,
          zIndex: textObj.calculatedZIndex || (textObj.locked === true ? 1 : (textObj.zIndex || ZINDEX_BASE_ICONS)),
          minWidth: 40,
          minHeight: 30,
          opacity: showDeleteIndicator ? 0.5 : 1,
          transform: showDeleteIndicator ? [{ scale: 0.8 }] : [],
        }}
      >
        {/* Indicador visual de zona de eliminaci�n */}
        {showDeleteIndicator && (
          <View style={{
            position: 'absolute',
            top: -6,
            left: -6,
            right: -6,
            bottom: -6,
            borderRadius: 8,
            borderWidth: 3,
            borderColor: '#e74c3c',
            borderStyle: 'dashed',
            backgroundColor: 'rgba(231, 76, 60, 0.15)',
            pointerEvents: 'none',
            zIndex: -1
          }} />
        )}
        <Pressable
          onPress={() => {
            // Si est� en modo borrador, borrar el elemento
            if (eraserMode) {
              if (onEraseElement) {
                onEraseElement(textObj.id);
              }
              return;
            }
            // No togglear selecci�n individual en modo multi-select
            if (!multiSelectMode) {
              setSelectedCloneId(textObj.id);
            }
          }}
          style={{
            minWidth: 40,
            minHeight: 30,
            padding: 4,
            userSelect: 'none',
            backgroundColor: selectedCloneId === textObj.id
              ? 'rgba(255, 255, 224, 0.7)'
              : (textObj.backgroundColor || 'transparent'),
            borderRadius: 6,
            borderWidth: selectedCloneId === textObj.id ? 1 : 0,
            borderColor: '#888',
            transform: [{ rotate: `${textObj.rotation || 0}deg` }],
          }}
        >
          <Text
            style={{
              fontSize: textObj.size || 18,
              color: textObj.color || "#000",
              fontWeight: "bold",
              userSelect: 'none',
            }}
          >
            {textObj.value}
          </Text>
          {/* Indicador visual para selecci�n m�ltiple en textos */}
          {multiSelectMode && isMultiSelected && (
            <View style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: '#3498db',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 101,
              borderWidth: 2,
              borderColor: '#fff'
            }}>
              <Feather name="check" size={10} color="#fff" />
            </View>
          )}

          {selectedCloneId === textObj.id && !multiSelectMode && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                // Usar measure para obtener la posici�n absoluta en pantalla
                e.target.measure((x, y, width, height, pageX, pageY) => {
                  setOptionsMenu({
                    visible: true,
                    position: {
                      x: pageX + width, // Posici�n a la derecha del elemento
                      y: pageY + (height / 2) // Centrado verticalmente
                    },
                    iconId: textObj.id,
                    canRotate: false,
                    hideEdit: false
                  });
                });
              }}
              style={{
                position: 'absolute',
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#ffffff',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 1.5,
                elevation: 3,
                borderWidth: 1,
                borderColor: '#dddddd',
                zIndex: 100,
                top: -7,
                right: -7
              }}
            >
              <Feather name="more-vertical" size={16} color="#444444" />
            </TouchableOpacity>
          )}

        </Pressable>
      </View>
    </PanGestureHandler>
  );
}, (prevProps, nextProps) => {
  const textObj = prevProps.textObj;
  const nextTextObj = nextProps.textObj;

  // Comparaci�n optimizada solo de propiedades cr�ticas
  if (prevProps.imageWidth !== nextProps.imageWidth ||
    prevProps.imageHeight !== nextProps.imageHeight) {
    return false;
  }

  if (prevProps.viewMode !== nextProps.viewMode) return false;
  if (prevProps.eraserMode !== nextProps.eraserMode) return false;

  const wasSelected = prevProps.selectedCloneId === textObj.id;
  const isSelected = nextProps.selectedCloneId === nextTextObj.id;

  if (textObj.id !== nextTextObj.id) return false;
  if (wasSelected !== isSelected) return false;
  if (textObj.xRatio !== nextTextObj.xRatio || textObj.yRatio !== nextTextObj.yRatio) return false;
  if (textObj.x !== nextTextObj.x || textObj.y !== nextTextObj.y) return false;
  if (textObj.locked !== nextTextObj.locked) return false;

  // Multi-select state
  if (prevProps.multiSelectMode !== nextProps.multiSelectMode) return false;
  if (prevProps.selectionInteractionMode !== nextProps.selectionInteractionMode) return false;
  const prevSet = prevProps.selectedCloneIdsSet;
  const nextSet = nextProps.selectedCloneIdsSet;
  const wasMultiSelected = prevSet ? prevSet.has(textObj.id) : prevProps.selectedCloneIds.includes(textObj.id);
  const isMultiSelected = nextSet ? nextSet.has(nextTextObj.id) : nextProps.selectedCloneIds.includes(nextTextObj.id);
  if (wasMultiSelected !== isMultiSelected) return false;

  // Solo verificar propiedades visuales si est� seleccionado o cambi�
  if (isSelected || wasSelected ||
    textObj.value !== nextTextObj.value ||
    textObj.color !== nextTextObj.color ||
    textObj.size !== nextTextObj.size) {
    if (textObj.value !== nextTextObj.value ||
      textObj.color !== nextTextObj.color ||
      textObj.size !== nextTextObj.size ||
      textObj.backgroundColor !== nextTextObj.backgroundColor ||
      textObj.rotation !== nextTextObj.rotation) return false;
  }

  return true;
});

function TextEditPanel({ visible, icon, onClose, onApply, onPreviewChange, onDelete, isNewElement }) {
  const { t } = useTranslation();
  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  const [color, setColor] = useState(icon?.color || "#000000");
  const [backgroundColor, setBackgroundColor] = useState(icon?.backgroundColor || "transparent");
  const [size, setSize] = useState(icon?.size?.toString() || "18");
  const [value, setValue] = useState(icon?.value || "");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [backgroundPickerVisible, setBackgroundPickerVisible] = useState(false);

  // Guardar valores iniciales para restaurar al cancelar
  const initialValuesRef = useRef({
    color: icon?.color || "#000000",
    backgroundColor: icon?.backgroundColor || "transparent",
    size: icon?.size?.toString() || "18",
    value: icon?.value || ""
  });

  useEffect(() => {
    setColor(icon?.color || "#000000");
    setBackgroundColor(icon?.backgroundColor || "transparent");
    setSize(icon?.size?.toString() || "18");
    setValue(icon?.value ?? "");
    // Actualizar valores iniciales cuando cambia el icono
    initialValuesRef.current = {
      color: icon?.color || "#000000",
      backgroundColor: icon?.backgroundColor || "transparent",
      size: icon?.size?.toString() || "18",
      value: icon?.value ?? ""
    };
  }, [icon]);

  // Enviar vista previa en tiempo real cuando cambian los valores
  useEffect(() => {
    if (onPreviewChange && icon) {
      onPreviewChange({
        ...icon,
        color,
        backgroundColor,
        size: parseInt(size) || 18,
        value
      });
    }
  }, [color, backgroundColor, size, value, icon, onPreviewChange]);

  // Manejar cierre/cancelaci�n - restaurar valores originales o eliminar si est� vac�o
  const handleClose = useCallback(() => {
    // Si es un elemento nuevo y el valor est� vac�o, eliminarlo
    if (isNewElement && (!value || value.trim() === '')) {
      if (onDelete && icon?.id) {
        onDelete(icon.id);
      }
      onClose();
      return;
    }

    // Si no es nuevo pero el valor se dej� vac�o, tambi�n eliminar
    if (!isNewElement && (!value || value.trim() === '') && initialValuesRef.current.value === '') {
      if (onDelete && icon?.id) {
        onDelete(icon.id);
      }
      onClose();
      return;
    }

    if (onPreviewChange && icon) {
      // Restaurar valores originales
      onPreviewChange({
        ...icon,
        color: initialValuesRef.current.color,
        backgroundColor: initialValuesRef.current.backgroundColor,
        size: parseInt(initialValuesRef.current.size) || 18,
        value: initialValuesRef.current.value
      });
    }
    onClose();
  }, [onPreviewChange, icon, onClose, isNewElement, value, onDelete]);

  if (!visible || !icon) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.proModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.proModalContainer, isMobile && { width: Math.min(SCREEN_WIDTH * 0.70, 320), maxHeight: SCREEN_HEIGHT * 0.85 }]}>
                {/* Header */}
                <View style={styles.proModalHeader}>
                  <View style={styles.proModalHeaderIcon}>
                    <Text style={{ fontSize: 14 }}>📝</Text>
                  </View>
                  <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                    {t('tacticalBoard.textPanel.title')}
                  </Text>
                  <TouchableOpacity style={styles.proModalCloseBtn} onPress={handleClose}>
                    <Text style={{ fontSize: 14, color: '#666' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <KeyboardAwareScrollView contentContainerStyle={styles.proModalBody} showsVerticalScrollIndicator={false}>
                  {/* Campo de texto */}
                  <View style={styles.proModalSection}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.textPanel.textLabel')}
                    </Text>
                    <TextInput
                      value={value}
                      onChangeText={setValue}
                      multiline
                      style={[
                        isMobile ? styles.proModalInputMobile : styles.proModalInput,
                        {
                          fontSize: isMobile ? 14 : parseInt(size) || 18,
                          color: color,
                          minHeight: 60,
                          verticalAlign: 'top',
                        }
                      ]}
                    />
                  </View>

                  {/* Color del texto */}
                  <View style={styles.proModalSection}>
                    <View style={styles.proModalRow}>
                      <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                        {t('tacticalBoard.textPanel.colorLabel')}
                      </Text>
                      <TouchableOpacity
                        style={[
                          isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                          { backgroundColor: color }
                        ]}
                        onPress={() => setPickerVisible(true)}
                      />
                    </View>
                  </View>

                  <MiniColorPickerModal
                    visible={pickerVisible}
                    initialColor={color}
                    onClose={() => setPickerVisible(false)}
                    onSelect={setColor}
                  />

                  {/* Color de fondo */}
                  <View style={styles.proModalSection}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.textPanel.backgroundColorLabel')}
                    </Text>
                    <View style={[styles.proModalRow, { marginTop: 8 }]}>
                      <TouchableOpacity
                        style={[
                          isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                          {
                            backgroundColor: backgroundColor === 'transparent' ? '#fff' : backgroundColor,
                            opacity: backgroundColor === 'transparent' ? 0.4 : 1
                          }
                        ]}
                        onPress={() => setBackgroundPickerVisible(true)}
                      />
                      <TouchableOpacity
                        onPress={() => setBackgroundColor('transparent')}
                        style={[
                          styles.proModalChip,
                          backgroundColor === 'transparent' && styles.proModalChipSelected
                        ]}
                      >
                        <Text style={[
                          styles.proModalChipText,
                          backgroundColor === 'transparent' && styles.proModalChipTextSelected
                        ]}>
                          {t('tacticalBoard.textPanel.noBackground')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <MiniColorPickerModal
                    visible={backgroundPickerVisible}
                    initialColor={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
                    onClose={() => setBackgroundPickerVisible(false)}
                    onSelect={setBackgroundColor}
                  />

                  {/* Tama�o */}
                  <View style={styles.proModalSection}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.textPanel.sizeLabel')}
                    </Text>
                    <View style={styles.proModalStepperRow}>
                      <TouchableOpacity
                        style={styles.proModalStepperBtn}
                        onPress={() => {
                          const current = parseInt(size) || 18;
                          if (current > 8) setSize(String(current - 1));
                        }}
                      >
                        <Feather name="minus" size={18} color="#666" />
                      </TouchableOpacity>
                      <View style={styles.proModalStepperValue}>
                        <Text style={styles.proModalStepperValueText}>{size}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.proModalStepperBtn}
                        onPress={() => {
                          const current = parseInt(size) || 18;
                          if (current < 100) setSize(String(current + 1));
                        }}
                      >
                        <Feather name="plus" size={18} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Preview */}
                  <View style={styles.proModalPreview}>
                    <Text style={{
                      fontSize: parseInt(size) || 18,
                      color: color,
                      backgroundColor: backgroundColor,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                    }}>
                      {value || 'Preview'}
                    </Text>
                  </View>
                </KeyboardAwareScrollView>

                {/* Footer */}
                <View style={styles.proModalFooter}>
                  <TouchableOpacity
                    style={[styles.proModalBtn, styles.proModalBtnSecondary]}
                    onPress={handleClose}
                  >
                    <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                      {t('tacticalBoard.textPanel.close')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.proModalBtn, styles.proModalBtnPrimary]}
                    onPress={() => {
                      onApply({ ...icon, color, backgroundColor, size: parseInt(size), value });
                    }}
                  >
                    <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                      {t('tacticalBoard.textPanel.apply')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </Modal>
  );
}

// =====================================================
// MODAL DE CONECTORES
// =====================================================
function ConnectorsModal({
  visible,
  onClose,
  clones,
  connectors,
  setConnectors,
  imageWidth,
  imageHeight,
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;

  const [selectedIcon1, setSelectedIcon1] = useState(null);
  const [selectedIcon2, setSelectedIcon2] = useState(null);
  const [lineColor, setLineColor] = useState('#000000');
  const [lineThickness, setLineThickness] = useState('2');
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [editingConnector, setEditingConnector] = useState(null);

  // Filtrar solo los elementos que pueden tener conectores (jugadores e iconos)
  const connectableElements = useMemo(() => {
    return clones.filter(clone =>
      clone.type === 'player' ||
      clone.playerData || // Jugadores del equipo
      clone.type === 'ball' ||
      clone.type === 'cone' ||
      clone.type === 'cone-pro' ||
      clone.type === 'cone-flat' ||
      clone.type === 'ring' ||
      clone.type === 'dummy' ||
      clone.type === 'barrier' ||
      clone.type === 'pole' ||
      clone.type === 'goal' ||
      clone.type === 'goal-large' ||
      clone.type === 'goal-small' ||
      clone.type === 'ladder' ||
      clone.type === 'weights'
    );
  }, [clones]);

  const handleAddConnector = () => {
    if (!selectedIcon1 || !selectedIcon2 || selectedIcon1 === selectedIcon2) {
      return;
    }

    const newConnector = {
      id: `connector-${Date.now()}`,
      fromId: selectedIcon1,
      toId: selectedIcon2,
      color: lineColor,
      thickness: parseInt(lineThickness) || 2,
    };

    setConnectors(prev => [...prev, newConnector]);
    setSelectedIcon1(null);
    setSelectedIcon2(null);
  };

  const handleUpdateConnector = () => {
    if (!editingConnector) return;

    setConnectors(prev => prev.map(c =>
      c.id === editingConnector.id
        ? { ...c, color: lineColor, thickness: parseInt(lineThickness) || 2 }
        : c
    ));
    setEditingConnector(null);
  };

  const handleDeleteConnector = (connectorId) => {
    setConnectors(prev => prev.filter(c => c.id !== connectorId));
  };

  const handleEditConnector = (connector) => {
    setEditingConnector(connector);
    setLineColor(connector.color);
    setLineThickness(connector.thickness.toString());
  };

  const getElementLabel = (id) => {
    const element = clones.find(c => c.id === id);
    if (!element) return t('tacticalBoard.connectors.unknown');

    if (element.playerData) {
      return element.playerData.nombre || element.playerData.name || t('tacticalBoard.connectors.teamPlayer');
    }
    if (element.type === 'player') {
      if (element.value) return element.value;
      return `${t('tacticalBoard.connectors.player')} ${element.number || ''}`.trim();
    }
    if (element.type === 'ball') return t('tacticalBoard.elements.ball');
    if (element.type === 'cone' || element.type === 'cone-pro') return t('tacticalBoard.elements.cone');
    if (element.type === 'cone-flat') return t('tacticalBoard.elements.coneFlat');
    if (element.type === 'ring') return t('tacticalBoard.elements.ring');
    if (element.type === 'dummy') return t('tacticalBoard.elements.dummy');
    if (element.type === 'barrier' || element.type === 'goal') return t('tacticalBoard.elements.barrier');
    if (element.type === 'pole') return t('tacticalBoard.elements.pole');
    if (element.type === 'goal-large') return t('tacticalBoard.elements.goalLarge');
    if (element.type === 'goal-small') return t('tacticalBoard.elements.goalSmall');
    if (element.type === 'ladder') return t('tacticalBoard.elements.ladder');
    if (element.type === 'weights') return t('tacticalBoard.elements.weights');
    return t('tacticalBoard.connectors.element');
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.proModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.proModalContainerSide, { top: insets.top, bottom: 0, paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom }, isMobile && {
            width: SCREEN_WIDTH * 0.80,
            maxWidth: 340,
          }]}>
            {/* Header */}
            <View style={styles.proModalHeader}>
              <View style={styles.proModalHeaderIcon}>
                <Text style={{ fontSize: 14 }}>🔗</Text>
              </View>
              <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                {t('tacticalBoard.connectors.title')}
              </Text>
              <TouchableOpacity style={styles.proModalCloseBtn} onPress={onClose}>
                <Text style={{ fontSize: 18, color: '#666' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView contentContainerStyle={styles.proModalBody} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
              {/* Crear nuevo conector */}
              <View style={styles.proModalSection}>
                <Text style={styles.proModalSectionTitle}>
                  {editingConnector ? t('tacticalBoard.connectors.editConnector') : t('tacticalBoard.connectors.createConnector')}
                </Text>

                {!editingConnector && (
                  <>
                    {/* Selector de primer elemento */}
                    <Text style={styles.proModalLabel}>{t('tacticalBoard.connectors.fromElement')}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 12 }}
                    >
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {connectableElements.map(element => (
                          <TouchableOpacity
                            key={element.id}
                            style={[
                              styles.connectorElementBtn,
                              selectedIcon1 === element.id && styles.connectorElementBtnSelected
                            ]}
                            onPress={() => setSelectedIcon1(element.id)}
                          >
                            <Text style={[
                              styles.connectorElementText,
                              selectedIcon1 === element.id && styles.connectorElementTextSelected
                            ]} numberOfLines={1}>
                              {getElementLabel(element.id)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>

                    {/* Selector de segundo elemento */}
                    <Text style={styles.proModalLabel}>{t('tacticalBoard.connectors.toElement')}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 12 }}
                    >
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {connectableElements.filter(e => e.id !== selectedIcon1).map(element => (
                          <TouchableOpacity
                            key={element.id}
                            style={[
                              styles.connectorElementBtn,
                              selectedIcon2 === element.id && styles.connectorElementBtnSelected
                            ]}
                            onPress={() => setSelectedIcon2(element.id)}
                          >
                            <Text style={[
                              styles.connectorElementText,
                              selectedIcon2 === element.id && styles.connectorElementTextSelected
                            ]} numberOfLines={1}>
                              {getElementLabel(element.id)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </>
                )}

                {/* Color y grosor */}
                <View style={styles.proModalRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.proModalLabel}>{t('tacticalBoard.connectors.lineColor')}</Text>
                    <TouchableOpacity
                      style={[styles.proModalColorBtn, { backgroundColor: lineColor, width: '100%', height: 40 }]}
                      onPress={() => setColorPickerVisible(true)}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.proModalLabel}>{t('tacticalBoard.connectors.lineThickness')}</Text>
                    <TextInput
                      style={[styles.proModalInputMobile, { height: 40 }]}
                      keyboardType="number-pad"
                      autoComplete="off"
                      value={lineThickness}
                      onChangeText={setLineThickness}
                      placeholder="2"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                {/* Bot�n de crear/actualizar */}
                <TouchableOpacity
                  style={[
                    styles.proModalBtn,
                    styles.proModalBtnPrimary,
                    { marginTop: 12 },
                    (!editingConnector && (!selectedIcon1 || !selectedIcon2)) && { opacity: 0.5 }
                  ]}
                  onPress={editingConnector ? handleUpdateConnector : handleAddConnector}
                  disabled={!editingConnector && (!selectedIcon1 || !selectedIcon2)}
                >
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                    {editingConnector ? t('tacticalBoard.connectors.update') : t('tacticalBoard.connectors.add')}
                  </Text>
                </TouchableOpacity>

                {editingConnector && (
                  <TouchableOpacity
                    style={[styles.proModalBtn, styles.proModalBtnSecondary, { marginTop: 8 }]}
                    onPress={() => {
                      setEditingConnector(null);
                      setLineColor('#000000');
                      setLineThickness('2');
                    }}
                  >
                    <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                      {t('tacticalBoard.connectors.cancelEdit')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.proModalDivider} />

              {/* Lista de conectores existentes */}
              <View style={styles.proModalSection}>
                <Text style={styles.proModalSectionTitle}>
                  {t('tacticalBoard.connectors.existingConnectors')} ({connectors.length})
                </Text>

                {connectors.length === 0 ? (
                  <Text style={styles.proModalHint}>
                    {t('tacticalBoard.connectors.noConnectors')}
                  </Text>
                ) : (
                  connectors.map(connector => (
                    <View key={connector.id} style={styles.connectorItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.connectorItemText} numberOfLines={1}>
                          {getElementLabel(connector.fromId)} → {getElementLabel(connector.toId)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <View style={[styles.connectorColorPreview, { backgroundColor: connector.color }]} />
                          <Text style={styles.connectorItemSubtext}>
                            {t('tacticalBoard.connectors.thickness')}: {connector.thickness}px
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={styles.connectorActionBtn}
                          onPress={() => handleEditConnector(connector)}
                        >
                          <Ionicons name="pencil" size={18} color="#2176ff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.connectorActionBtn}
                          onPress={() => handleDeleteConnector(connector.id)}
                        >
                          <Ionicons name="trash" size={18} color="#ff3838" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </KeyboardAwareScrollView>

            {/* Footer */}
            <View style={styles.proModalFooter}>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnSecondary]}
                onPress={onClose}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                  {t('tacticalBoard.connectors.close')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Color Picker */}
            <MiniColorPickerModal
              visible={colorPickerVisible}
              initialColor={lineColor}
              onClose={() => setColorPickerVisible(false)}
              onSelect={(c) => setLineColor(c)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// =====================================================
// COMPONENTE PARA RENDERIZAR LAS LÍNEAS DE CONECTORES
// =====================================================
const ConnectorsRenderer = React.memo(({
  connectors,
  clones,
  imageWidth,
  imageHeight,
  viewMode
}) => {
  // Calcular las posiciones de las l�neas bas�ndose en las posiciones de los elementos
  const lines = useMemo(() => {
    return connectors.map(connector => {
      const fromElement = clones.find(c => c.id === connector.fromId);
      const toElement = clones.find(c => c.id === connector.toId);

      if (!fromElement || !toElement) return null;

      // Obtener coordenadas del centro de cada elemento
      const from = ratioToDisplay(fromElement.xRatio || 0, fromElement.yRatio || 0, viewMode, imageWidth, imageHeight);
      const to = ratioToDisplay(toElement.xRatio || 0, toElement.yRatio || 0, viewMode, imageWidth, imageHeight);

      return {
        id: connector.id,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        color: connector.color,
        thickness: connector.thickness,
      };
    }).filter(Boolean);
  }, [connectors, clones, imageWidth, imageHeight, viewMode]);

  if (lines.length === 0) return null;

  return (
    <Svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: imageWidth,
        height: imageHeight,
        zIndex: 200, // Conectores al mismo nivel que dibujos y jugadores
      }}
      pointerEvents="none"
    >
      <G>
        {lines.map(line => (
          <Path
            key={line.id}
            d={`M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`}
            stroke={line.color}
            strokeWidth={line.thickness}
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </G>
    </Svg>
  );
}, (prevProps, nextProps) => {
  // Comparaci�n profunda optimizada
  if (prevProps.connectors.length !== nextProps.connectors.length) return false;
  if (prevProps.imageWidth !== nextProps.imageWidth) return false;
  if (prevProps.imageHeight !== nextProps.imageHeight) return false;
  if (prevProps.viewMode !== nextProps.viewMode) return false;

  // Comparar conectores
  for (let i = 0; i < prevProps.connectors.length; i++) {
    const prev = prevProps.connectors[i];
    const next = nextProps.connectors[i];
    if (prev.id !== next.id || prev.color !== next.color || prev.thickness !== next.thickness) {
      return false;
    }
  }

  // Comparar posiciones de los clones relevantes
  const relevantIds = new Set(prevProps.connectors.flatMap(c => [c.fromId, c.toId]));
  for (const id of relevantIds) {
    const prevClone = prevProps.clones.find(c => c.id === id);
    const nextClone = nextProps.clones.find(c => c.id === id);
    if (!prevClone || !nextClone) return false;
    if (prevClone.xRatio !== nextClone.xRatio || prevClone.yRatio !== nextClone.yRatio) {
      return false;
    }
  }

  return true;
});

function SettingsPanel({
  visible,
  onClose,
  standardSize,
  setStandardSize,
  playersWithNumber,
  setPlayersWithNumber,
  boardSettings,
  setBoardSettings,
  onSaveBoardSettings,
  onOpenConnectors
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  const [size, setSize] = useState(standardSize.toString());
  const MIN_SIZE = 16;  // Tama�o m�nimo para que quepa el n�mero
  const [savingSettings, setSavingSettings] = useState(false);

  // Estados locales para los tama�os de cada jugador (para permitir edici�n libre)
  const [size1, setSize1] = useState((boardSettings?.playerIcon1?.size || 24).toString());
  const [size2, setSize2] = useState((boardSettings?.playerIcon2?.size || 24).toString());
  const [size3, setSize3] = useState((boardSettings?.playerIcon3?.size || 24).toString());
  const [sizeTeam, setSizeTeam] = useState((boardSettings?.teamPlayers?.size || 24).toString());

  // Estados para color pickers
  const [colorPicker1Visible, setColorPicker1Visible] = useState(false);
  const [colorPicker2Visible, setColorPicker2Visible] = useState(false);
  const [colorPicker3Visible, setColorPicker3Visible] = useState(false);
  const [colorPickerTeamVisible, setColorPickerTeamVisible] = useState(false);

  useEffect(() => {
    setSize(standardSize.toString());
  }, [standardSize]);

  // Sincronizar estados locales cuando cambia boardSettings
  useEffect(() => {
    if (boardSettings) {
      setSize1((boardSettings.playerIcon1?.size || 24).toString());
      setSize2((boardSettings.playerIcon2?.size || 24).toString());
      setSize3((boardSettings.playerIcon3?.size || 24).toString());
      setSizeTeam((boardSettings.teamPlayers?.size || 24).toString());
    }
  }, [boardSettings]);

  if (!visible) return null;

  const handleApply = () => {
    const parsedSize = parseInt(size);
    if (!isNaN(parsedSize)) {
      // Validar solo el m�nimo
      const validSize = Math.max(MIN_SIZE, parsedSize);
      setStandardSize(validSize);
      setSize(validSize.toString()); // Actualizar el input con el valor validado
    }
    onClose();
  };

  const handleSave = async () => {
    const parsedSize = parseInt(size);
    if (!isNaN(parsedSize)) {
      const validSize = Math.max(MIN_SIZE, parsedSize);
      setStandardSize(validSize);
    }

    // Validar y actualizar tama�os de jugadores antes de guardar
    const validSize1 = size1.trim() === '' ? 24 : Math.max(MIN_SIZE, parseInt(size1) || 24);
    const validSize2 = size2.trim() === '' ? 24 : Math.max(MIN_SIZE, parseInt(size2) || 24);
    const validSize3 = size3.trim() === '' ? 24 : Math.max(MIN_SIZE, parseInt(size3) || 24);
    const validSizeTeam = sizeTeam.trim() === '' ? 24 : Math.max(MIN_SIZE, parseInt(sizeTeam) || 24);

    // Construir objeto con los nuevos settings y aplicarlo directamente
    const newSettings = {
      ...boardSettings,
      playerIcon1: { ...boardSettings.playerIcon1, size: validSize1 },
      playerIcon2: { ...boardSettings.playerIcon2, size: validSize2 },
      playerIcon3: { ...boardSettings.playerIcon3, size: validSize3 },
      teamPlayers: { ...boardSettings.teamPlayers, size: validSizeTeam }
    };

    setBoardSettings(newSettings);

    // Actualizar estados locales con valores validados
    setSize1(validSize1.toString());
    setSize2(validSize2.toString());
    setSize3(validSize3.toString());
    setSizeTeam(validSizeTeam.toString());

    if (onSaveBoardSettings) {
      setSavingSettings(true);
      try {
        // Pasar los nuevos settings al callback para evitar usar un estado stale
        await onSaveBoardSettings(newSettings);
      } finally {
        setSavingSettings(false);
      }
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.proModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.proModalContainerSide, { top: insets.top, bottom: 0, paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom }, isMobile && {
            width: SCREEN_WIDTH * 0.75,
            maxWidth: 320,
          }]}>
            {/* Header */}
            <View style={styles.proModalHeader}>
              <View style={styles.proModalHeaderIcon}>
                <Text style={{ fontSize: 14 }}>⚙️</Text>
              </View>
              <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                {t('tacticalBoard.settings.title')}
              </Text>
              <TouchableOpacity style={styles.proModalCloseBtn} onPress={onClose}>
                <Text style={{ fontSize: 18, color: '#666' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView contentContainerStyle={styles.proModalBody} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
              {/* Tama�o de �conos */}
              <View style={styles.proModalSection}>
                <Text style={styles.proModalSectionTitle}>{t('tacticalBoard.settings.iconSizeLabel')}</Text>
                <TextInput
                  style={isMobile ? styles.proModalInputMobile : styles.proModalInput}
                  keyboardType="number-pad"
                  autoComplete="off"
                  value={size}
                  onChangeText={setSize}
                  placeholder={`M�nimo ${MIN_SIZE}`}
                  placeholderTextColor="#999"
                />
                <Text style={styles.proModalHint}>
                  Tama�o m�nimo: {MIN_SIZE} p�xeles
                </Text>
              </View>

              {/* Switch n�meros */}
              <View style={styles.proModalSwitch}>
                <Text style={styles.proModalSwitchLabel}>
                  {t('tacticalBoard.settings.showPlayerNumbers')}
                </Text>
                <Switch
                  value={playersWithNumber}
                  onValueChange={setPlayersWithNumber}
                  trackColor={{ false: "#ddd", true: "#81b0ff" }}
                  thumbColor={playersWithNumber ? "#2176ff" : "#f4f3f4"}
                />
              </View>

              {/* Bot�n de Conectores */}
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnPrimary, { marginTop: 12, marginBottom: 12 }]}
                onPress={() => {
                  onClose();
                  if (onOpenConnectors) onOpenConnectors();
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>🔗</Text>
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                    {t('tacticalBoard.connectors.title')}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.proModalDivider} />

              {/* Colores de jugadores */}
              <View style={styles.proModalSection}>
                <Text style={styles.proModalSectionTitle}>
                  {t('tacticalBoard.settings.playerColors')}
                </Text>

                {/* Jugador 1 */}
                <View style={styles.proModalCard}>
                  <View style={styles.proModalCardHeader}>
                    <View style={[
                      styles.proModalColorBtn,
                      {
                        backgroundColor: boardSettings?.playerIcon1?.color || '#2176ff',
                        width: 32, height: 32, borderRadius: 16
                      }
                    ]} />
                    <Text style={styles.proModalCardTitle}>{t('tacticalBoard.settings.unnamedPlayer1')}</Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        { backgroundColor: boardSettings?.playerIcon1?.color || '#2176ff' }
                      ]}
                      onPress={() => setColorPicker1Visible(true)}
                    />
                    <TextInput
                      style={[styles.proModalInputMobile, { flex: 1 }]}
                      keyboardType="number-pad"
                      autoComplete="off"
                      value={size1}
                      onChangeText={setSize1}
                      placeholder="Tama�o"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                {/* Jugador 2 */}
                <View style={styles.proModalCard}>
                  <View style={styles.proModalCardHeader}>
                    <View style={[
                      styles.proModalColorBtn,
                      {
                        backgroundColor: boardSettings?.playerIcon2?.color || '#ff3838',
                        width: 32, height: 32, borderRadius: 16
                      }
                    ]} />
                    <Text style={styles.proModalCardTitle}>{t('tacticalBoard.settings.unnamedPlayer2')}</Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        { backgroundColor: boardSettings?.playerIcon2?.color || '#ff3838' }
                      ]}
                      onPress={() => setColorPicker2Visible(true)}
                    />
                    <TextInput
                      style={[styles.proModalInputMobile, { flex: 1 }]}
                      keyboardType="number-pad"
                      autoComplete="off"
                      value={size2}
                      onChangeText={setSize2}
                      placeholder="Tama�o"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                {/* Jugador 3 */}
                <View style={styles.proModalCard}>
                  <View style={styles.proModalCardHeader}>
                    <View style={[
                      styles.proModalColorBtn,
                      {
                        backgroundColor: boardSettings?.playerIcon3?.color || '#ffa600',
                        width: 32, height: 32, borderRadius: 16
                      }
                    ]} />
                    <Text style={styles.proModalCardTitle}>{t('tacticalBoard.settings.unnamedPlayer3')}</Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        { backgroundColor: boardSettings?.playerIcon3?.color || '#ffa600' }
                      ]}
                      onPress={() => setColorPicker3Visible(true)}
                    />
                    <TextInput
                      style={[styles.proModalInputMobile, { flex: 1 }]}
                      keyboardType="number-pad"
                      autoComplete="off"
                      value={size3}
                      onChangeText={setSize3}
                      placeholder="Tama�o"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                {/* Jugadores del equipo */}
                <View style={styles.proModalCard}>
                  <View style={styles.proModalCardHeader}>
                    <View style={[
                      styles.proModalColorBtn,
                      {
                        backgroundColor: boardSettings?.teamPlayers?.color || '#2176ff',
                        width: 32, height: 32, borderRadius: 16
                      }
                    ]} />
                    <Text style={styles.proModalCardTitle}>{t('tacticalBoard.settings.teamPlayers')}</Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        { backgroundColor: boardSettings?.teamPlayers?.color || '#2176ff' }
                      ]}
                      onPress={() => setColorPickerTeamVisible(true)}
                    />
                    <TextInput
                      style={[styles.proModalInputMobile, { flex: 1 }]}
                      keyboardType="number-pad"
                      autoComplete="off"
                      value={sizeTeam}
                      onChangeText={setSizeTeam}
                      placeholder="Tama�o"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>
            </KeyboardAwareScrollView>

            {/* Footer */}
            <View style={styles.proModalFooter}>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnSecondary]}
                onPress={onClose}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                  {t('tacticalBoard.settings.close')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnSuccess]}
                onPress={handleApply}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                  {t('tacticalBoard.settings.apply')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={savingSettings}
                style={[
                  styles.proModalBtn,
                  styles.proModalBtnPrimary,
                  savingSettings && { opacity: 0.6 }
                ]}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                  {savingSettings ? t('tacticalBoard.settings.saving') : t('tacticalBoard.settings.save')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Color Pickers */}
            <MiniColorPickerModal
              visible={colorPicker1Visible}
              initialColor={boardSettings?.playerIcon1?.color || '#2176ff'}
              onClose={() => setColorPicker1Visible(false)}
              onSelect={(c) => setBoardSettings(prev => ({
                ...prev,
                playerIcon1: { ...prev.playerIcon1, color: c }
              }))}
            />
            <MiniColorPickerModal
              visible={colorPicker2Visible}
              initialColor={boardSettings?.playerIcon2?.color || '#ff3838'}
              onClose={() => setColorPicker2Visible(false)}
              onSelect={(c) => setBoardSettings(prev => ({
                ...prev,
                playerIcon2: { ...prev.playerIcon2, color: c }
              }))}
            />
            <MiniColorPickerModal
              visible={colorPicker3Visible}
              initialColor={boardSettings?.playerIcon3?.color || '#ffa600'}
              onClose={() => setColorPicker3Visible(false)}
              onSelect={(c) => setBoardSettings(prev => ({
                ...prev,
                playerIcon3: { ...prev.playerIcon3, color: c }
              }))}
            />
            <MiniColorPickerModal
              visible={colorPickerTeamVisible}
              initialColor={boardSettings?.teamPlayers?.color || '#2176ff'}
              onClose={() => setColorPickerTeamVisible(false)}
              onSelect={(c) => setBoardSettings(prev => ({
                ...prev,
                teamPlayers: { ...prev.teamPlayers, color: c }
              }))}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LeftEditPanel({
  visible,
  icon,
  onClose,
  onApply,
  standardSize,
  playersWithNumber,
  onPaletteUpdate,
  paletteIcons = [],
  teamPlayerStyle,
  setTeamPlayerStyle,
  hideApplyToPalette = false,
  onMaterialsConfigUpdate,
}) {
  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  const isArrowType = icon?.type === 'straight-arrow' || icon?.type === 'straight-line';
  const isCurveType = icon?.type === 'curve-arrow' || icon?.type === 'curve-line';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Determinar si el elemento puede tener color
  const canHaveColor = icon?.type === 'player' ||
    icon?.type === 'cone' ||
    icon?.type === 'cone-pro' ||
    icon?.type === 'cone-flat' ||
    icon?.type === 'ring' ||
    icon?.type === 'dummy' ||
    icon?.type === 'barrier' ||
    icon?.type === 'pole' ||
    icon?.type === 'ladder' ||
    isArrowType ||
    isCurveType ||
    icon?.type === 'circle' ||
    icon?.type === 'rectangle' ||
    icon?.type === 'custom-shape' ||
    icon?.type === 'custom-shape-button' ||
    icon?.type === 'goal';

  const [size, setSize] = useState(
    isNaN(Number(icon?.size)) ? (standardSize?.toString() || '24') : icon.size?.toString()
  );
  const [color, setColor] = useState(isValidHexColor(icon?.color) ? icon.color : '#000000');
  const [number, setNumber] = useState(icon?.type === 'player' ? (icon.number?.toString() || '') : '');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [applyToPalette, setApplyToPalette] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const [thickness, setThickness] = useState(icon?.thickness !== undefined ? icon.thickness.toString() : '2');
  const [textColor, setTextColor] = useState(icon?.textColor || '#000000');
  const [textBackgroundColor, setTextBackgroundColor] = useState(icon?.textBackgroundColor || '#ffffff');
  const [textPickerVisible, setTextPickerVisible] = useState(false);
  const [textBackgroundPickerVisible, setTextBackgroundPickerVisible] = useState(false);
  // Nuevos estados para tipo de l�nea y relleno
  const [localLineType, setLocalLineType] = useState(icon?.lineType || 'solid');
  const [fillColor, setFillColor] = useState(icon?.fillColor || 'transparent');
  const [fillPickerVisible, setFillPickerVisible] = useState(false);
  // Estado para el color del n�mero
  const [numberColor, setNumberColor] = useState(icon?.numberColor || '#ffffff');
  const [numberColorPickerVisible, setNumberColorPickerVisible] = useState(false);
  // Estados para el tama�o y espaciado de los puntos
  const [localDotSize, setLocalDotSize] = useState(icon?.dotSize ?? 2);
  const [localDotSpacing, setLocalDotSpacing] = useState(icon?.dotSpacing ?? 4);
  // Estados para portero
  const [goalkeeperStripeColor, setGoalkeeperStripeColor] = useState(icon?.goalkeeperStripeColor || teamPlayerStyle?.goalkeeperStripeColor || '#ffffff');
  const [goalkeeperStripePickerVisible, setGoalkeeperStripePickerVisible] = useState(false);

  // Detectar si el jugador es portero
  const isGoalkeeper = icon?.type === 'player' && (
    icon?.isGoalkeeper ||
    icon?.playerData?.posicion === 'portero' ||
    icon?.playerData?.position === 'goalkeeper' ||
    icon?.playerData?.demarcacion === 'POR'
  );

  // Tipos que pueden tener lineType (tipo de trazado)
  const canHaveLineType = isArrowType || isCurveType ||
    icon?.type === 'circle' ||
    icon?.type === 'rectangle' ||
    icon?.type === 'custom-shape' ||
    icon?.type === 'custom-shape-button';

  // Tipos que pueden tener relleno
  const canHaveFill = icon?.type === 'circle' ||
    icon?.type === 'rectangle' ||
    icon?.type === 'custom-shape' ||
    icon?.type === 'custom-shape-button';

  useEffect(() => {
    setSize(isNaN(Number(icon?.size)) ? (standardSize?.toString() || '24') : icon?.size?.toString());
    setColor(isValidHexColor(icon?.color) ? icon.color : '#000000');
    setNumber(icon?.type === 'player' ? (icon.number?.toString() || '') : '');
    setApplyToPalette(false);
    setApplyToAll(false);
    setThickness(icon?.thickness !== undefined ? icon.thickness.toString() : '2');
    setTextColor(icon?.textColor || '#000000');
    setTextBackgroundColor(icon?.textBackgroundColor || '#ffffff');
    setLocalLineType(icon?.lineType || 'solid');
    setFillColor(icon?.fillColor || 'transparent');
    setNumberColor(icon?.numberColor || '#ffffff');
    setLocalDotSize(icon?.dotSize ?? 2);
    setLocalDotSpacing(icon?.dotSpacing ?? 4);
    setGoalkeeperStripeColor(icon?.goalkeeperStripeColor || teamPlayerStyle?.goalkeeperStripeColor || '#ffffff');
  }, [icon, standardSize, teamPlayerStyle]);

  if (!visible || !icon) return null;
  const isPaletteIcon = typeof icon.paletteIndex === "number";
  const isPalettePlayer = icon.isPalettePlayer === true; // Jugador de la paleta de jugadores con nombre

  // Tipos de materiales que se pueden aplicar a la paleta
  const materialTypes = ['ball', 'cone-pro', 'cone-flat', 'ring', 'goal-large', 'goal-small', 'barrier', 'dummy', 'pole', 'ladder', 'weights'];
  const isMaterialType = materialTypes.includes(icon.type);

  // Tipos que pueden aplicarse a la paleta
  // Para jugadores del equipo solo si es de la paleta (isPalettePlayer)
  // Para otros elementos, si ya tienen paletteIndex o son del tipo correcto
  const canApplyToPalette = isPalettePlayer || isPaletteIcon || isMaterialType ||
    (icon.type === 'straight-arrow' ||
      icon.type === 'straight-line' ||
      icon.type === 'curve-arrow' ||
      icon.type === 'curve-line' ||
      icon.type === 'circle' ||
      icon.type === 'rectangle' ||
      icon.type === 'custom-shape') && (!icon.playerData || isPalettePlayer); // No mostrar para jugadores ya pintados en el campo, excepto si son de la paleta

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.proModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.proModalContainerSide, { top: insets.top, bottom: 0, paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom }, isMobile && { width: Math.min(240, SCREEN_WIDTH * 0.50) }]}>
            {/* Header */}
            <View style={[styles.proModalHeader, { paddingVertical: 8, paddingHorizontal: 10 }]}>
              <Text style={[isMobile ? styles.proModalTitleMobile : styles.proModalTitle, { fontSize: isMobile ? 12 : 14 }]}>
                {t('tacticalBoard.editPanel.editTitle')} {
                  icon.type === 'straight-arrow' ? t('tacticalBoard.elements.straightArrow') :
                    icon.type === 'straight-line' ? t('tacticalBoard.elements.straightLine') :
                      icon.type === 'curve-arrow' ? t('tacticalBoard.elements.curveArrow') :
                        icon.type === 'curve-line' ? t('tacticalBoard.elements.curveLine') :
                          icon.type === 'circle' ? t('tacticalBoard.elements.circle') :
                            icon.type === 'rectangle' ? t('tacticalBoard.elements.rectangle') :
                              icon.type === 'custom-shape' ? t('tacticalBoard.elements.customShape') :
                                icon.type === 'goal' ? t('tacticalBoard.elements.barrier') :
                                  icon.type === 'goal-large' ? t('tacticalBoard.elements.goalLarge') :
                                    icon.type === 'goal-small' ? t('tacticalBoard.elements.goalSmall') :
                                      icon.type === 'barrier' ? t('tacticalBoard.elements.barrier') :
                                        icon.type === 'dummy' ? t('tacticalBoard.elements.dummy') :
                                          icon.type === 'pole' ? t('tacticalBoard.elements.pole') :
                                            icon.type === 'cone-pro' ? t('tacticalBoard.elements.cone') :
                                              icon.type === 'cone-flat' ? t('tacticalBoard.elements.coneFlat') :
                                                icon.type === 'ring' ? t('tacticalBoard.elements.ring') :
                                                  icon.type === 'ladder' ? t('tacticalBoard.elements.ladder') :
                                                    icon.type === 'weights' ? t('tacticalBoard.elements.weights') :
                                                      icon.type === 'ball' ? t('tacticalBoard.elements.ball') :
                                                        icon.type
                }
              </Text>
              <TouchableOpacity style={[styles.proModalCloseBtn, { width: 28, height: 28 }]} onPress={onClose}>
                <Text style={{ fontSize: 14, color: '#666' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {(hideApplyToPalette || icon?.isMaterialPalette) && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 8 }}>
                <Text style={[styles.proModalHint, { color: '#2176ff', fontStyle: 'normal', fontWeight: '500' }]}>
                  {t('tacticalBoard.editPanel.editingPalette')}
                </Text>
              </View>
            )}

            <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 14 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>

              {/* Color para todos los tipos que lo soporten */}
              {canHaveColor && (
                <>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>{t('tacticalBoard.editPanel.colorLabel')}</Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        { backgroundColor: color }
                      ]}
                      onPress={() => setPickerVisible(true)}
                    />
                  </View>
                  <MiniColorPickerModal
                    visible={pickerVisible}
                    initialColor={color}
                    onClose={() => setPickerVisible(false)}
                    onSelect={c => setColor(c)}
                  />
                </>
              )}

              {/* N�mero para jugadores */}
              {(icon.type === 'player' && playersWithNumber) && (
                <>
                  <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>{t('tacticalBoard.editPanel.numberLabel')}</Text>
                  <TextInput
                    style={isMobile ? styles.proModalInputMobile : styles.proModalInput}
                    keyboardType="number-pad"
                    autoComplete="off"
                    value={number}
                    onChangeText={setNumber}
                    placeholder="N�mero"
                    placeholderTextColor="#888"
                  />

                  {/* Color del n�mero */}
                  <View style={[styles.proModalRow, { marginTop: 10 }]}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>{t('tacticalBoard.editPanel.textColorLabel')}</Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        { backgroundColor: numberColor, borderColor: numberColor === '#ffffff' ? '#ccc' : '#e0e0e0' }
                      ]}
                      onPress={() => setNumberColorPickerVisible(true)}
                    />
                  </View>
                  <MiniColorPickerModal
                    visible={numberColorPickerVisible}
                    initialColor={numberColor}
                    onClose={() => setNumberColorPickerVisible(false)}
                    onSelect={setNumberColor}
                  />
                </>
              )}

              {/* Color del texto para jugadores con nombre o de paleta */}
              {icon.type === 'player' && (icon.playerData || isPalettePlayer) && (
                <>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>{t('tacticalBoard.editPanel.textColorLabel')}</Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        { backgroundColor: textColor }
                      ]}
                      onPress={() => setTextPickerVisible(true)}
                    />
                  </View>
                  <MiniColorPickerModal
                    visible={textPickerVisible}
                    initialColor={textColor}
                    onClose={() => setTextPickerVisible(false)}
                    onSelect={setTextColor}
                  />
                </>
              )}

              {/* Color de fondo del texto para jugadores con nombre o de paleta */}
              {icon.type === 'player' && (icon.playerData || isPalettePlayer) && (
                <>
                  <Text style={[isMobile ? styles.proModalLabelMobile : styles.proModalLabel, { marginTop: 10 }]}>{t('tacticalBoard.editPanel.textBackgroundLabel')}</Text>
                  <View style={[styles.proModalRow, { marginTop: 6 }]}>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor: textBackgroundColor === 'transparent' ? '#fff' : textBackgroundColor,
                          opacity: textBackgroundColor === 'transparent' ? 0.4 : 1
                        }
                      ]}
                      onPress={() => setTextBackgroundPickerVisible(true)}
                    />
                    <TouchableOpacity
                      onPress={() => setTextBackgroundColor('transparent')}
                      style={[
                        styles.proModalChip,
                        textBackgroundColor === 'transparent' && styles.proModalChipSelected
                      ]}
                    >
                      <Text style={[
                        styles.proModalChipText,
                        textBackgroundColor === 'transparent' && styles.proModalChipTextSelected
                      ]}>
                        {t('tacticalBoard.editPanel.noBackground')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <MiniColorPickerModal
                    visible={textBackgroundPickerVisible}
                    initialColor={textBackgroundColor === 'transparent' ? '#ffffff' : textBackgroundColor}
                    onClose={() => setTextBackgroundPickerVisible(false)}
                    onSelect={setTextBackgroundColor}
                  />
                </>
              )}

              {/* Opciones de portero - solo si es portero y est� activa la diferenciaci�n */}
              {isGoalkeeper && teamPlayerStyle?.differentiateGoalkeeper && (
                <>
                  <View style={[styles.proModalRow, { marginTop: 12, alignItems: 'center', backgroundColor: '#f0f7ff', padding: 8, borderRadius: 8 }]}>
                    <Feather name="user" size={16} color="#2176ff" />
                    <Text style={[isMobile ? styles.proModalLabelMobile : styles.proModalLabel, { marginLeft: 6, color: '#2176ff', fontWeight: '600' }]}>
                      {t('tacticalBoard.editPanel.goalkeeperLabel')}
                    </Text>
                  </View>
                  <Text style={[isMobile ? styles.proModalLabelMobile : styles.proModalLabel, { marginTop: 8 }]}>
                    {t('tacticalBoard.editPanel.goalkeeperStripeColorLabel')}
                  </Text>
                  <View style={[styles.proModalRow, { marginTop: 6 }]}>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        { backgroundColor: goalkeeperStripeColor, borderColor: goalkeeperStripeColor === '#ffffff' ? '#ccc' : '#e0e0e0' }
                      ]}
                      onPress={() => setGoalkeeperStripePickerVisible(true)}
                    />
                  </View>
                  <MiniColorPickerModal
                    visible={goalkeeperStripePickerVisible}
                    initialColor={goalkeeperStripeColor}
                    onClose={() => setGoalkeeperStripePickerVisible(false)}
                    onSelect={setGoalkeeperStripeColor}
                  />
                </>
              )}

              {/* Tama�o - NO mostrar para l�neas, flechas, figuras ni custom-shape */}
              {!['custom-shape', 'custom-shape-button', 'straight-arrow', 'straight-line', 'curve-line', 'curve-arrow', 'circle', 'rectangle'].includes(icon.type) && (
                <>
                  <Text style={[isMobile ? styles.proModalLabelMobile : styles.proModalLabel, { marginTop: 10 }]}>{t('tacticalBoard.editPanel.sizeLabel')}</Text>
                  <View style={styles.proModalStepperRow}>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        const current = parseInt(size) || 24;
                        if (current > 1) setSize(String(current - 1));
                      }}
                    >
                      <Feather name="minus" size={18} color="#666" />
                    </TouchableOpacity>
                    <View style={styles.proModalStepperValue}>
                      <Text style={styles.proModalStepperValueText}>{size}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        const current = parseInt(size) || 24;
                        if (current < 200) setSize(String(current + 1));
                      }}
                    >
                      <Feather name="plus" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Grosor para l�neas, flechas, c�rculos y custom-shape */}
              {(isArrowType || isCurveType || icon.type === 'circle' || icon.type === 'rectangle' || icon.type === 'custom-shape' || icon.type === 'custom-shape-button') && (
                <>
                  <Text style={[isMobile ? styles.proModalLabelMobile : styles.proModalLabel, { marginTop: 10 }]}>{t('tacticalBoard.editPanel.strokeLabel')}</Text>
                  <View style={styles.proModalStepperRow}>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        const current = parseInt(thickness) || 2;
                        if (current > 1) setThickness(String(current - 1));
                      }}
                    >
                      <Feather name="minus" size={18} color="#666" />
                    </TouchableOpacity>
                    <View style={styles.proModalStepperValue}>
                      <Text style={styles.proModalStepperValueText}>{thickness}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        const current = parseInt(thickness) || 2;
                        if (current < 50) setThickness(String(current + 1));
                      }}
                    >
                      <Feather name="plus" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Tipo de trazado (s�lido/punteado) para l�neas, flechas y figuras */}
              {canHaveLineType && (
                <>
                  <Text style={[isMobile ? styles.proModalLabelMobile : styles.proModalLabel, { marginTop: 12 }]}>{t('tacticalBoard.editPanel.strokeTypeLabel')}</Text>
                  <View style={[styles.proModalGrid, { marginTop: 8 }]}>
                    <TouchableOpacity
                      style={[
                        styles.proModalGridItem,
                        localLineType === 'solid' && styles.proModalGridItemSelected
                      ]}
                      onPress={() => setLocalLineType('solid')}
                    >
                      <View style={{ width: 36, height: 2, backgroundColor: color }} />
                      <Text style={[styles.proModalChipText, { marginTop: 4 }, localLineType === 'solid' && styles.proModalChipTextSelected]}>
                        {t('tacticalBoard.editPanel.solid')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.proModalGridItem,
                        localLineType === 'dotted' && styles.proModalGridItemSelected
                      ]}
                      onPress={() => setLocalLineType('dotted')}
                    >
                      <View style={{ width: 36, height: 2, flexDirection: 'row', justifyContent: 'space-between' }}>
                        {[...Array(5)].map((_, i) => (
                          <View key={i} style={{ width: 4, height: 2, backgroundColor: color }} />
                        ))}
                      </View>
                      <Text style={[styles.proModalChipText, { marginTop: 4 }, localLineType === 'dotted' && styles.proModalChipTextSelected]}>
                        {t('tacticalBoard.editPanel.dashed')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Opciones de espaciado cuando es punteado */}
                  {localLineType === 'dotted' && (
                    <>
                      <Text style={[isMobile ? styles.proModalLabelMobile : styles.proModalLabel, { marginTop: 12 }]}>{t('tacticalBoard.editPanel.dotSize')}:</Text>
                      <View style={[styles.proModalGrid, { marginTop: 6 }]}>
                        {[1, 2, 3, 4].map(size => (
                          <TouchableOpacity
                            key={`dot-size-${size}`}
                            style={[
                              styles.proModalGridItem,
                              { minWidth: 40 },
                              localDotSize === size && styles.proModalGridItemSelected
                            ]}
                            onPress={() => setLocalDotSize(size)}
                          >
                            <Svg width="30" height="8">
                              <Path
                                d="M2,4 L28,4"
                                stroke={color}
                                strokeWidth="2"
                                strokeDasharray={`${size},${localDotSpacing}`}
                                fill="none"
                                strokeLinecap="round"
                              />
                            </Svg>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={[isMobile ? styles.proModalLabelMobile : styles.proModalLabel, { marginTop: 10 }]}>{t('tacticalBoard.editPanel.dotSpacing')}:</Text>
                      <View style={[styles.proModalGrid, { marginTop: 6 }]}>
                        {[2, 4, 6, 8, 10].map(spacing => (
                          <TouchableOpacity
                            key={`dot-spacing-${spacing}`}
                            style={[
                              styles.proModalGridItem,
                              { minWidth: 40 },
                              localDotSpacing === spacing && styles.proModalGridItemSelected
                            ]}
                            onPress={() => setLocalDotSpacing(spacing)}
                          >
                            <Svg width="30" height="8">
                              <Path
                                d="M2,4 L28,4"
                                stroke={color}
                                strokeWidth="2"
                                strokeDasharray={`${localDotSize},${spacing}`}
                                fill="none"
                                strokeLinecap="round"
                              />
                            </Svg>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Vista previa del trazado */}
                  <Text style={[isMobile ? styles.proModalLabelMobile : styles.proModalLabel, { marginTop: 14 }]}>{t('tacticalBoard.editPanel.preview')}:</Text>
                  <View style={styles.proModalPreview}>
                    <Svg width="180" height="60" key={`preview-${localLineType}-${localDotSize}-${localDotSpacing}-${color}-${thickness}-${fillColor}`}>
                      {/* Vista previa seg�n el tipo de forma */}
                      {(icon.type === 'straight-line') && (
                        localLineType === 'dotted' ? (
                          <Path
                            d="M15,30 L165,30"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            strokeDasharray={`${localDotSize},${localDotSpacing}`}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ) : (
                          <Path
                            d="M15,30 L165,30"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                          />
                        )
                      )}
                      {(icon.type === 'straight-arrow') && (
                        <>
                          {localLineType === 'dotted' ? (
                            <Path
                              d="M15,30 L145,30"
                              stroke={color}
                              strokeWidth={parseInt(thickness) || 2}
                              strokeDasharray={`${localDotSize},${localDotSpacing}`}
                              fill="none"
                              strokeLinecap="round"
                            />
                          ) : (
                            <Path
                              d="M15,30 L145,30"
                              stroke={color}
                              strokeWidth={parseInt(thickness) || 2}
                              fill="none"
                              strokeLinecap="round"
                            />
                          )}
                          <Path
                            d="M145,30 L130,20 M145,30 L130,40"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                      {(icon.type === 'curve-line') && (
                        localLineType === 'dotted' ? (
                          <Path
                            d="M15,45 Q90,5 165,45"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            strokeDasharray={`${localDotSize},${localDotSpacing}`}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ) : (
                          <Path
                            d="M15,45 Q90,5 165,45"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                          />
                        )
                      )}
                      {(icon.type === 'curve-arrow') && (
                        <>
                          {localLineType === 'dotted' ? (
                            <Path
                              d="M15,45 Q90,5 145,45"
                              stroke={color}
                              strokeWidth={parseInt(thickness) || 2}
                              strokeDasharray={`${localDotSize},${localDotSpacing}`}
                              fill="none"
                              strokeLinecap="round"
                            />
                          ) : (
                            <Path
                              d="M15,45 Q90,5 145,45"
                              stroke={color}
                              strokeWidth={parseInt(thickness) || 2}
                              fill="none"
                              strokeLinecap="round"
                            />
                          )}
                          <Path
                            d="M145,45 L135,32 M145,45 L130,50"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                      {icon.type === 'circle' && (
                        localLineType === 'dotted' ? (
                          <Circle
                            cx="90"
                            cy="30"
                            r="22"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            strokeDasharray={`${localDotSize},${localDotSpacing}`}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                          />
                        ) : (
                          <Circle
                            cx="90"
                            cy="30"
                            r="22"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                          />
                        )
                      )}
                      {icon.type === 'rectangle' && (
                        localLineType === 'dotted' ? (
                          <Rect
                            x="30"
                            y="10"
                            width="120"
                            height="40"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            strokeDasharray={`${localDotSize},${localDotSpacing}`}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                          />
                        ) : (
                          <Rect
                            x="30"
                            y="10"
                            width="120"
                            height="40"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                          />
                        )
                      )}
                      {(icon.type === 'custom-shape' || icon.type === 'custom-shape-button') && (
                        localLineType === 'dotted' ? (
                          <Path
                            d="M90,10 L130,50 L50,50 Z"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            strokeDasharray={`${localDotSize},${localDotSpacing}`}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <Path
                            d="M90,10 L130,50 L50,50 Z"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )
                      )}
                    </Svg>
                  </View>
                </>
              )}

              {/* Color de relleno para c�rculos, rect�ngulos y custom-shape */}
              {canHaveFill && (
                <>
                  <Text style={[isMobile ? styles.proModalLabelMobile : styles.proModalLabel, { marginTop: 12 }]}>{t('tacticalBoard.editPanel.fillColorLabel')}</Text>
                  <View style={[styles.proModalRow, { marginTop: 6 }]}>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor: fillColor === 'transparent' ? '#fff' : fillColor,
                          opacity: fillColor === 'transparent' ? 0.4 : 1
                        }
                      ]}
                      onPress={() => setFillPickerVisible(true)}
                    />
                    <TouchableOpacity
                      onPress={() => setFillColor('transparent')}
                      style={[
                        styles.proModalChip,
                        fillColor === 'transparent' && styles.proModalChipSelected
                      ]}
                    >
                      <Text style={[
                        styles.proModalChipText,
                        fillColor === 'transparent' && styles.proModalChipTextSelected
                      ]}>
                        {t('tacticalBoard.editPanel.noFill')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <MiniColorPickerModal
                    visible={fillPickerVisible}
                    initialColor={fillColor === 'transparent' ? '#ff0000' : fillColor}
                    onClose={() => setFillPickerVisible(false)}
                    onSelect={(c) => setFillColor(c)}
                  />
                </>
              )}

              {/* Checkbox para aplicar a la paleta */}
              {canApplyToPalette && !hideApplyToPalette && !icon?.isMaterialPalette && (
                <View style={[styles.proModalSwitch, { marginTop: 14 }]}>
                  <Text style={styles.proModalSwitchLabel}>
                    {t('tacticalBoard.editPanel.applyToPalette')}
                  </Text>
                  <Switch
                    value={applyToPalette}
                    onValueChange={setApplyToPalette}
                    trackColor={{ false: "#ddd", true: "#81b0ff" }}
                    thumbColor={applyToPalette ? "#2176ff" : "#f4f3f4"}
                  />
                </View>
              )}

              {/* Checkbox para aplicar a todos los elementos del mismo tipo */}
              {/* Mostrar "Aplicar a todos" cuando estamos editando un elemento del campo (no de la paleta) */}
              {!hideApplyToPalette && !isPalettePlayer && !icon?.isMaterialPalette && icon.type !== 'free-text' && (
                <View style={[styles.proModalSwitch, { marginTop: canApplyToPalette ? 0 : 14 }]}>
                  <Text style={styles.proModalSwitchLabel}>
                    {t('tacticalBoard.editPanel.applyToAll')}
                  </Text>
                  <Switch
                    value={applyToAll}
                    onValueChange={setApplyToAll}
                    trackColor={{ false: "#ddd", true: "#81b0ff" }}
                    thumbColor={applyToAll ? "#2176ff" : "#f4f3f4"}
                  />
                </View>
              )}

            </KeyboardAwareScrollView>

            {/* Footer */}
            <View style={styles.proModalFooter}>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnSecondary]}
                onPress={onClose}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                  {t('tacticalBoard.editPanel.close')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnPrimary]}
                onPress={() => {
                  const updatedIcon = {
                    ...icon,
                    // No actualizar size para custom-shape (su tama�o viene de los puntos dibujados)
                    size: (icon.type === 'custom-shape' || icon.type === 'custom-shape-button')
                      ? icon.size
                      : parseInt(size),
                    color: canHaveColor && isValidHexColor(color) ? color : icon.color,
                    number: icon.type === 'player' ? number : undefined,
                    numberColor: icon.type === 'player' ? numberColor : icon.numberColor,
                    thickness: (isArrowType || isCurveType || icon.type === 'circle' || icon.type === 'rectangle' || icon.type === 'custom-shape' || icon.type === 'custom-shape-button')
                      ? parseInt(thickness) || 5
                      : icon.thickness,
                    textColor: icon.type === 'player' && (icon.playerData || isPalettePlayer) ? textColor : icon.textColor,
                    textBackgroundColor: icon.type === 'player' && (icon.playerData || isPalettePlayer) ? textBackgroundColor : icon.textBackgroundColor,
                    // Propiedades de portero
                    goalkeeperStripeColor: isGoalkeeper ? goalkeeperStripeColor : icon.goalkeeperStripeColor,
                    // Nuevas propiedades para tipo de l�nea y relleno
                    lineType: canHaveLineType ? localLineType : icon.lineType,
                    fillColor: canHaveFill ? fillColor : icon.fillColor,
                    // Propiedades de espaciado para l�neas punteadas
                    dotSize: canHaveLineType ? localDotSize : icon.dotSize,
                    dotSpacing: canHaveLineType ? localDotSpacing : icon.dotSpacing,
                  };

                  // Si es un material de la paleta (isMaterialPalette)
                  if (icon.isMaterialPalette) {
                    // Actualizar la Configuraci�n de materiales
                    if (onMaterialsConfigUpdate) {
                      onMaterialsConfigUpdate(icon.materialType || icon.type, {
                        color: updatedIcon.color,
                        size: updatedIcon.size,
                      });
                    }
                    onClose();
                    return;
                  }

                  // Si es un jugador de la paleta (isPalettePlayer)
                  if (isPalettePlayer) {
                    // Solo cerrar el panel, no hay nada que aplicar en el campo
                    // Si se marc� aplicar a paleta, actualizar teamPlayerStyle
                    if (applyToPalette && setTeamPlayerStyle) {
                      setTeamPlayerStyle(prev => ({
                        ...prev,
                        color: updatedIcon.color,
                        size: updatedIcon.size,
                        numberColor: updatedIcon.numberColor || prev.numberColor || '#ffffff',
                        textColor: updatedIcon.textColor || prev.textColor || '#000000',
                        textBackgroundColor: updatedIcon.textBackgroundColor || prev.textBackgroundColor || '#ffffff'
                      }));
                    }
                    onClose();
                  } else {
                    // Aplicar cambios al elemento pintado
                    onApply(updatedIcon, applyToAll);

                    // Si se marc� aplicar a paleta
                    if (applyToPalette && canApplyToPalette) {
                      // Tipos de materiales
                      const materialTypes = ['ball', 'cone-pro', 'cone-flat', 'ring', 'goal-large', 'goal-small', 'barrier', 'dummy', 'pole', 'ladder', 'weights'];
                      const isMaterial = materialTypes.includes(icon.type);

                      if (isMaterial) {
                        // Para materiales, usar onMaterialsConfigUpdate
                        if (onMaterialsConfigUpdate) {
                          onMaterialsConfigUpdate(icon.type, {
                            color: updatedIcon.color,
                            size: updatedIcon.size,
                          });
                        }
                      } else {
                        // Si no tiene paletteIndex, buscarlo por tipo
                        let paletteIdx = icon.paletteIndex;
                        if (typeof paletteIdx !== "number") {
                          // Buscar el �ndice en la paleta seg�n el tipo
                          const searchType = icon.type === 'custom-shape' ? 'custom-shape-button' : icon.type;
                          paletteIdx = paletteIcons.findIndex(ic => ic.type === searchType);
                        }

                        if (typeof paletteIdx === "number" && paletteIdx >= 0) {
                          // Para jugadores sin nombre, solo aplicar color y tama�o
                          const paletteUpdate = icon.type === 'player' && !icon.playerData
                            ? {
                              ...updatedIcon,
                              paletteIndex: paletteIdx,
                              color: updatedIcon.color,
                              size: updatedIcon.size,
                              numberColor: updatedIcon.numberColor, // incluir color del n�mero
                              textColor: updatedIcon.textColor, // incluir color del texto
                              textBackgroundColor: updatedIcon.textBackgroundColor, // incluir fondo del texto
                              // No incluir number ni thickness
                            }
                            : {
                              ...updatedIcon,
                              paletteIndex: paletteIdx,
                            };

                          onPaletteUpdate && onPaletteUpdate(paletteUpdate);
                        }
                      }
                    }
                  }
                }}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                  {t('tacticalBoard.editPanel.apply')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LockedElementsPanel({
  visible,
  onClose,
  lockedElements,
  onUnlock,
  scale = 1
}) {
  const { t } = useTranslation();
  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  if (!visible) return null;


  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.proModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.proModalContainer,
          isMobile && {
            width: SCREEN_WIDTH * 0.80,
            maxWidth: 320,
            maxHeight: SCREEN_HEIGHT * 0.80
          },
          !isMobile && { width: Math.min(300 * scale, 340), maxHeight: '75%' }
          ]}>
            {/* Header */}
            <View style={styles.proModalHeader}>
              <View style={styles.proModalHeaderIcon}>
                <Text style={{ fontSize: 14 }}>🔒</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                  {t('tacticalBoard.lockedPanel.title')}
                </Text>
              </View>
              <TouchableOpacity style={styles.proModalCloseBtn} onPress={onClose}>
                <Text style={{ fontSize: 14, color: '#666' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {lockedElements.length === 0 ? (
              <View style={[styles.proModalBody, { alignItems: 'center', paddingVertical: 40 }]}>
                <Text style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>
                  {t('tacticalBoard.lockedPanel.noLockedElements')}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: SCREEN_HEIGHT * 0.6, width: '100%', minHeight: 80 }}
                contentContainerStyle={styles.proModalBody}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {lockedElements.map((element) => (
                  <View key={element.id} style={[styles.proModalCard, { padding: 12 }]}>
                    <View style={styles.lockedElementInfo}>
                      <View style={styles.lockedElementIcon}>
                        {element.type === 'player' && (
                          <View style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: element.color || '#2176ff',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}>
                            {element.number && (
                              <Text style={{
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 'bold',
                              }}>
                                {element.number}
                              </Text>
                            )}
                          </View>
                        )}
                        {element.type === 'ball' && (
                          <View style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: '#fff',
                            borderWidth: 2,
                            borderColor: '#000',
                          }} />
                        )}
                        {(element.type === 'cone' || element.type === 'cone-pro') && (
                          <View style={{
                            width: 0,
                            height: 0,
                            borderLeftWidth: 7,
                            borderRightWidth: 7,
                            borderBottomWidth: 14,
                            borderStyle: 'solid',
                            borderLeftColor: 'transparent',
                            borderRightColor: 'transparent',
                            borderBottomColor: element.color || '#FF6B00',
                          }} />
                        )}
                        {element.type === 'cone-flat' && (
                          <View style={{
                            width: 16,
                            height: 6,
                            backgroundColor: element.color || '#FF6B00',
                            borderRadius: 2,
                          }} />
                        )}
                        {element.type === 'ring' && (
                          <View style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            borderWidth: 3,
                            borderColor: element.color || '#FFD700',
                            backgroundColor: 'transparent',
                          }} />
                        )}
                        {(element.type === 'text' || element.type === 'free-text') && (
                          <Feather name="type" size={18} color={element.color || '#000'} />
                        )}
                        {(element.type === 'straight-arrow' || element.type === 'curve-arrow') && (
                          <Feather name="arrow-right" size={18} color={element.color || '#141414'} />
                        )}
                        {(element.type === 'straight-line' || element.type === 'curve-line') && (
                          <Feather name="minus" size={18} color={element.color || '#444'} />
                        )}
                        {element.type === 'circle' && (
                          <Feather name="circle" size={18} color={element.color || '#000'} />
                        )}
                        {element.type === 'rectangle' && (
                          <Feather name="square" size={18} color={element.color || '#000'} />
                        )}
                        {element.type === 'custom-shape' && (
                          <Feather name="edit-3" size={18} color={element.color || '#000'} />
                        )}
                        {(element.type === 'goal-large' || element.type === 'goal-small') && (
                          <MaterialIcons name="sports-soccer" size={18} color={element.color || '#888'} />
                        )}
                        {element.type === 'barrier' && (
                          <MaterialIcons name="fence" size={18} color={element.color || '#888'} />
                        )}
                        {element.type === 'dummy' && (
                          <MaterialIcons name="accessibility" size={18} color={element.color || '#2196F3'} />
                        )}
                        {element.type === 'pole' && (
                          <View style={{
                            width: 4,
                            height: 18,
                            backgroundColor: element.color || '#FFD700',
                            borderRadius: 2,
                          }} />
                        )}
                        {element.type === 'ladder' && (
                          <MaterialIcons name="view-headline" size={18} color={element.color || '#000'} />
                        )}
                        {element.type === 'weights' && (
                          <MaterialCommunityIcons name="dumbbell" size={18} color={element.color || '#333'} />
                        )}
                      </View>
                      <View style={styles.lockedElementDetails}>
                        <Text style={styles.lockedElementName}>
                          {element.type === 'player' && `Jugador ${element.number ? `#${element.number}` : ''}${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'ball' && 'Bal�n'}
                          {(element.type === 'cone' || element.type === 'cone-pro') && `Cono${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'cone-flat' && `Cono plano${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'ring' && `Aro${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'text' && `Texto: "${element.value?.substring(0, 20) || 'Sin contenido'}${element.value?.length > 20 ? '...' : ''}"`}
                          {element.type === 'free-text' && `Texto libre: "${element.value?.substring(0, 15) || 'Sin contenido'}${element.value?.length > 15 ? '...' : ''}"`}
                          {element.type === 'straight-arrow' && `Flecha recta${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'curve-arrow' && `Flecha curva${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'straight-line' && `L�nea recta${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'curve-line' && `L�nea curva${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'circle' && `C�rculo${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'rectangle' && `Rect�ngulo${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'custom-shape' && `Forma personalizada${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'goal-large' && 'Porter�a grande'}
                          {element.type === 'goal-small' && 'Porter�a peque�a'}
                          {element.type === 'barrier' && `Valla${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'dummy' && `Maniqu�${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'pole' && `Pica${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'ladder' && `Escalera${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'weights' && `Pesas${element.color ? ` (${element.color})` : ''}`}
                        </Text>
                        <Text style={styles.lockedElementType}>
                          Tipo: {
                            element.type === 'player' ? 'Jugador' :
                              element.type === 'ball' ? 'Bal�n' :
                                element.type === 'cone' || element.type === 'cone-pro' ? 'Cono' :
                                  element.type === 'cone-flat' ? 'Cono plano' :
                                    element.type === 'ring' ? 'Aro' :
                                      element.type === 'text' || element.type === 'free-text' ? 'Texto' :
                                        element.type === 'straight-arrow' ? 'Flecha recta' :
                                          element.type === 'curve-arrow' ? 'Flecha curva' :
                                            element.type === 'straight-line' ? 'L�nea recta' :
                                              element.type === 'curve-line' ? 'L�nea curva' :
                                                element.type === 'circle' ? 'C�rculo' :
                                                  element.type === 'rectangle' ? 'Rect�ngulo' :
                                                    element.type === 'custom-shape' ? 'Forma personalizada' :
                                                      element.type === 'goal-large' ? 'Porter�a grande' :
                                                        element.type === 'goal-small' ? 'Porter�a peque�a' :
                                                          element.type === 'barrier' ? 'Valla' :
                                                            element.type === 'dummy' ? 'Maniqu�' :
                                                              element.type === 'pole' ? 'Pica' :
                                                                element.type === 'ladder' ? 'Escalera' :
                                                                  element.type === 'weights' ? 'Pesas' :
                                                                    'Desconocido'
                          }
                          {element.size && ` "� Tama�o: ${element.size}`}
                          {element.thickness && ` "� Grosor: ${element.thickness}`}
                        </Text>
                        <View style={styles.lockedElementBadge}>
                          <Feather name="lock" size={12} color="#f39c12" />
                          <Text style={styles.lockedBadgeText}>{t('tacticalBoard.lockedPanel.locked')}</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.unlockButton}
                      onPress={() => onUnlock(element.id)}
                    >
                      <Feather name="unlock" size={16} color="#27ae60" />
                      <Text style={styles.unlockButtonText}>{t('tacticalBoard.lockedPanel.unlock')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.proModalFooter}>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnSecondary, { flex: 1 }]}
                onPress={onClose}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                  {t('tacticalBoard.lockedPanel.close')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// Componente modal para seleccionar formaciones
function FormationModal({ visible, onClose, onSelectFormation, initialColor = '#2176ff', initialSize = 24, onDeleteFormation, formationSettings, setFormationSettings, onSaveFormationSettings, teamPlayerStyle, setTeamPlayerStyle }) {
  const { t } = useTranslation();
  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  const insets = useSafeAreaInsets();

  // Obtener jugadores del equipo actual
  const players = useSelector(state => state.player.players || []);
  const equipos = useSelector(state => state.team.teams || []);
  const selectedTeam = equipos.find(e => e.seleccionado === true);
  const teamPlayerCount = selectedTeam?.jugadoresPorEquipo || 11;

  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [selectedSize, setSelectedSize] = useState(initialSize.toString());
  const [isOpponent, setIsOpponent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [numberColorPickerVisible, setNumberColorPickerVisible] = useState(false);
  const [textColorPickerVisible, setTextColorPickerVisible] = useState(false);
  const [textBgColorPickerVisible, setTextBgColorPickerVisible] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Estados para jugadores reales
  const [useRealPlayers, setUseRealPlayers] = useState(false);
  const [playerSelectorVisible, setPlayerSelectorVisible] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [pendingFormationKey, setPendingFormationKey] = useState(null);
  const [selectedPlayerCount, setSelectedPlayerCount] = useState(teamPlayerCount);

  // Configuraci�n de visualizaci�n (n�mero o posici�n)
  const displayMode = formationSettings?.displayMode || 'number'; // 'number' o 'position'
  const customLabels = formationSettings?.customLabels || { ...getDefaultPositionLabels() };
  // Para equipo LOCAL, usar los colores de teamPlayerStyle (sincronizados con la paleta)
  // Para RIVAL, usar los de formationSettings
  const numberColor = teamPlayerStyle?.numberColor || '#ffffff';
  const textColor = teamPlayerStyle?.textColor || '#000000';
  const textBackgroundColor = teamPlayerStyle?.textBackgroundColor || '#ffffff';

  useEffect(() => {
    setSelectedColor(initialColor);
  }, [initialColor]);
  useEffect(() => {
    // Usar el tama�o de teamPlayerStyle si est� disponible
    setSelectedSize(teamPlayerStyle?.size?.toString() || initialSize?.toString() || '24');
  }, [initialSize, teamPlayerStyle?.size]);

  // When toggling opponent/team, set a sensible default color
  useEffect(() => {
    if (isOpponent) {
      setSelectedColor('#ff3b30'); // default rival red
    } else {
      // Usar el color de teamPlayerStyle para equipo local
      setSelectedColor(teamPlayerStyle?.color || initialColor);
    }
  }, [isOpponent]);

  if (!visible) return null;

  const currentFormations = FORMATIONS_BY_PLAYER_COUNT[selectedPlayerCount] || FORMATIONS;
  const formationKeys = Object.keys(currentFormations);
  const mobileModalMargin = Math.max(10, Math.min(16, SCREEN_WIDTH * 0.035));
  const formationModalPanelStyle = isMobile
    ? {
      width: Math.min(520, Math.max(280, SCREEN_WIDTH - mobileModalMargin * 2)),
      maxWidth: SCREEN_WIDTH - mobileModalMargin * 2,
      maxHeight: SCREEN_HEIGHT - insets.top - insets.bottom - mobileModalMargin * 2,
      borderRadius: 16,
    }
    : {
      top: insets.top,
      bottom: 0,
      paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom,
      width: 380,
      borderRadius: 0,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
    };

  // Funci�n para asignar jugadores a posiciones seg�n la formaci�n
  const assignPlayersToPositions = (formation, selectedPlayersList) => {
    const positions = formation.positions;
    const numPositions = positions.length;
    const assignedPlayers = new Array(numPositions).fill(null);
    const usedPlayers = new Set();

    // Mapeo de posiciones de la app a posiciones de formaci�n
    const positionMapping = {
      'portero': ['GK'],
      'central': ['CB'],
      'lateral': ['LB', 'RB'],
      'centrocampista': ['CM', 'CDM', 'CAM', 'LM', 'RM'],
      'extremo': ['LW', 'RW'],
      'delantero': ['ST', 'CF']
    };

    // Primero asignar jugadores a sus posiciones naturales
    positions.forEach((pos, idx) => {
      const posType = pos.position;

      // Buscar jugador con posici�n compatible
      const compatiblePlayer = selectedPlayersList.find(player => {
        if (usedPlayers.has(player._id)) return false;
        const playerPos = player.posicion?.toLowerCase() || '';

        // Verificar si la posici�n del jugador es compatible
        const compatiblePositions = positionMapping[playerPos] || [];
        return compatiblePositions.includes(posType);
      });

      if (compatiblePlayer) {
        assignedPlayers[idx] = compatiblePlayer;
        usedPlayers.add(compatiblePlayer._id);
      }
    });

    // Rellenar posiciones vac�as con jugadores restantes
    const remainingPlayers = selectedPlayersList.filter(p => !usedPlayers.has(p._id));
    let remainingIdx = 0;

    assignedPlayers.forEach((player, idx) => {
      if (!player && remainingIdx < remainingPlayers.length) {
        assignedPlayers[idx] = remainingPlayers[remainingIdx];
        remainingIdx++;
      }
    });

    return assignedPlayers;
  };

  function handleSelectFormation(key) {
    const sizeNum = Math.max(8, Math.min(96, Number(selectedSize) || initialSize));

    if (useRealPlayers && !isOpponent) {
      // Si quiere usar jugadores reales, abrir el selector
      setPendingFormationKey(key);
      setSelectedPlayers([]);
      setPlayerSelectorVisible(true);
    } else {
      // Comportamiento normal
      setFormationSettings && setFormationSettings(prev => ({ ...prev, displayMode, customLabels, numberColor, textColor, textBackgroundColor }));
      onSelectFormation(key, {
        color: selectedColor,
        size: sizeNum,
        opponent: isOpponent,
        displayMode,
        customLabels,
        numberColor,
        textColor,
        textBackgroundColor
      });
    }
  }

  const handleConfirmPlayers = () => {
    if (!pendingFormationKey) return;

    const formation = currentFormations[pendingFormationKey];
    const sizeNum = Math.max(8, Math.min(96, Number(selectedSize) || initialSize));

    // Asignar jugadores a posiciones
    const assignedPlayers = assignPlayersToPositions(formation, selectedPlayers);

    // Generar n�meros para posiciones sin jugador asignado
    const usedDorsals = new Set(assignedPlayers.filter(p => p).map(p => p.dorsal));
    let nextNumber = 1;
    const getNextNumber = () => {
      while (usedDorsals.has(nextNumber) || usedDorsals.has(String(nextNumber))) {
        nextNumber++;
      }
      usedDorsals.add(nextNumber);
      return nextNumber;
    };

    setFormationSettings && setFormationSettings(prev => ({ ...prev, displayMode, customLabels, numberColor, textColor, textBackgroundColor }));
    onSelectFormation(pendingFormationKey, {
      color: selectedColor,
      size: sizeNum,
      opponent: false,
      displayMode: 'name', // Modo especial para mostrar nombres
      customLabels,
      numberColor,
      textColor,
      textBackgroundColor,
      realPlayers: assignedPlayers.map((player, idx) => {
        if (player) {
          return {
            name: player.nombre?.substring(0, 3).toUpperCase() || player.apellido?.substring(0, 3).toUpperCase() || `J${idx + 1}`,
            fullName: getPlayerFullName(player),
            dorsal: player.dorsal,
            posicion: player.posicion,
            playerId: player._id,
            foto: player.foto // Incluir foto del jugador
          };
        } else {
          // Jugador ficticio para completar
          return {
            name: String(getNextNumber()),
            fullName: null,
            dorsal: null,
            posicion: null,
            playerId: null,
            isPlaceholder: true,
            foto: null
          };
        }
      })
    });

    setPlayerSelectorVisible(false);
    setPendingFormationKey(null);
    setSelectedPlayers([]);
    onClose();
  };

  const togglePlayerSelection = (player) => {
    setSelectedPlayers(prev => {
      const isSelected = prev.some(p => p._id === player._id);
      if (isSelected) {
        return prev.filter(p => p._id !== player._id);
      } else if (prev.length < selectedPlayerCount) {
        return [...prev, player];
      }
      return prev;
    });
  };

  // Ordenar jugadores por posici�n
  const sortedPlayers = [...players].sort((a, b) => {
    const posOrder = { 'portero': 1, 'central': 2, 'lateral': 3, 'centrocampista': 4, 'extremo': 5, 'delantero': 6 };
    return (posOrder[a.posicion] || 99) - (posOrder[b.posicion] || 99);
  });

  const handleLabelChange = (posKey, value) => {
    // M�ximo 2 caracteres
    const newValue = value.slice(0, 2).toUpperCase();
    setFormationSettings && setFormationSettings(prev => ({
      ...prev,
      customLabels: { ...(prev.customLabels || {}), [posKey]: newValue }
    }));
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={{ flex: 1 }}>
        <View style={[styles.proModalOverlay, isMobile ? { padding: mobileModalMargin } : { alignItems: 'flex-end' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[isMobile ? styles.proModalContainer : styles.proModalContainerSide, formationModalPanelStyle]}>
            {/* Header */}
            <View style={styles.proModalHeader}>
              <View style={styles.proModalHeaderIcon}>
                <Text style={{ fontSize: 14 }}>⚽</Text>
              </View>
              <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                {t('formations.title')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowSettings(!showSettings)}
                style={[styles.proModalCloseBtn, {
                  backgroundColor: showSettings ? '#2176ff' : '#f5f5f5',
                  marginRight: 6
                }]}
              >
                <Feather name="settings" size={14} color={showSettings ? '#fff' : '#666'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.proModalCloseBtn} onPress={onClose}>
                <Text style={{ fontSize: 16, color: '#666' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Contenido con scroll */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: isMobile ? 12 : 0, paddingBottom: isMobile ? 8 : 0 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >

              {/* Selector de cantidad de jugadores (7, 8, 11) */}
              <View style={{ flexDirection: 'row', marginHorizontal: isMobile ? 0 : 12, marginTop: 10, marginBottom: 4, borderRadius: 8, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
                {[7, 8, 11].map(count => (
                  <TouchableOpacity
                    key={count}
                    onPress={() => setSelectedPlayerCount(count)}
                    style={{
                      flex: 1,
                      paddingVertical: isMobile ? 8 : 10,
                      backgroundColor: selectedPlayerCount === count ? '#2176ff' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{
                      fontSize: isMobile ? 12 : 14,
                      fontWeight: '700',
                      color: selectedPlayerCount === count ? '#fff' : '#666',
                    }}>
                      {isMobile ? count : t('formations.playerCountLabel', { count })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Panel de Configuraci�n */}
              {showSettings && (
                <View style={[styles.proModalCard, { margin: isMobile ? 0 : 12, marginTop: isMobile ? 10 : 12, marginBottom: 8 }]}>
                  <Text style={styles.proModalSectionTitle}>
                    {t('formations.displaySettings')}
                  </Text>

                  {/* Selector de modo: N�mero o Posici�n */}
                  <View style={[styles.proModalGrid, { marginBottom: 12 }]}>
                    <TouchableOpacity
                      onPress={() => setFormationSettings && setFormationSettings(prev => ({ ...prev, displayMode: 'number' }))}
                      style={[
                        styles.proModalGridItem,
                        { flex: 1 },
                        displayMode === 'number' && styles.proModalGridItemSelected
                      ]}
                    >
                      <Text style={[
                        styles.proModalChipText,
                        displayMode === 'number' && styles.proModalChipTextSelected
                      ]}>
                        {t('formations.byNumber')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setFormationSettings && setFormationSettings(prev => ({ ...prev, displayMode: 'position' }))}
                      style={[
                        styles.proModalGridItem,
                        { flex: 1 },
                        displayMode === 'position' && styles.proModalGridItemSelected
                      ]}
                    >
                      <Text style={[
                        styles.proModalChipText,
                        displayMode === 'position' && styles.proModalChipTextSelected
                      ]}>
                        {t('formations.byPosition')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Color del n�mero/texto */}
                  <View style={[styles.proModalRow, { marginBottom: 10 }]}>
                    <Text style={styles.proModalHint}>
                      {t('formations.textColor')}:
                    </Text>
                    <TouchableOpacity
                      onPress={() => setNumberColorPickerVisible(true)}
                      style={[
                        styles.proModalColorBtnMobile,
                        { backgroundColor: numberColor, borderColor: numberColor === '#ffffff' ? '#ccc' : '#e0e0e0' }
                      ]}
                    />
                  </View>

                  {/* Color del texto del nombre (debajo del icono) */}
                  <View style={[styles.proModalRow, { marginBottom: 10 }]}>
                    <Text style={styles.proModalHint}>
                      {t('formations.nameTextColor')}:
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTextColorPickerVisible(true)}
                      style={[
                        styles.proModalColorBtnMobile,
                        { backgroundColor: textColor, borderColor: textColor === '#ffffff' ? '#ccc' : '#e0e0e0' }
                      ]}
                    />
                  </View>

                  {/* Color del fondo del texto del nombre */}
                  <View style={styles.proModalRow}>
                    <Text style={styles.proModalHint}>
                      {t('formations.nameBgColor')}:
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTextBgColorPickerVisible(true)}
                      style={[
                        styles.proModalColorBtnMobile,
                        {
                          backgroundColor: textBackgroundColor === 'transparent' ? '#fff' : textBackgroundColor,
                          opacity: textBackgroundColor === 'transparent' ? 0.5 : 1
                        }
                      ]}
                    />
                    <TouchableOpacity
                      onPress={() => setTeamPlayerStyle && setTeamPlayerStyle(prev => ({ ...prev, textBackgroundColor: 'transparent' }))}
                      style={[
                        styles.proModalChip,
                        textBackgroundColor === 'transparent' && styles.proModalChipSelected
                      ]}
                    >
                      <Text style={[
                        styles.proModalChipText,
                        { fontSize: 10 },
                        textBackgroundColor === 'transparent' && styles.proModalChipTextSelected
                      ]}>
                        {t('common.transparent') || 'Transparente'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Configuraci�n de etiquetas de posiciones (solo si est� en modo posici�n) */}
                  {displayMode === 'position' && (
                    <View>
                      <Text style={{ fontSize: isMobile ? 11 : 12, color: '#666', marginBottom: 6 }}>
                        {t('formations.customLabels')} ({t('formations.max2chars')}):
                      </Text>
                      <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          {POSITION_TYPES.map(pos => (
                            <View key={pos} style={{ width: '33%', paddingHorizontal: 2, marginBottom: 6 }}>
                              <Text style={{ fontSize: isMobile ? 9 : 10, color: '#888' }}>{t(`formations.positions.${pos}`)}</Text>
                              <TextInput
                                value={customLabels[pos] || getDefaultPositionLabels()[pos]}
                                onChangeText={(v) => handleLabelChange(pos, v)}
                                maxLength={2}
                                style={{
                                  backgroundColor: '#fff',
                                  borderRadius: 4,
                                  paddingHorizontal: 6,
                                  paddingVertical: 4,
                                  fontSize: isMobile ? 11 : 12,
                                  textAlign: 'center',
                                  borderWidth: 1,
                                  borderColor: '#ddd'
                                }}
                              />
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Bot�n para guardar la Configuraci�n en la base de datos */}
                  <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                      onPress={async () => {
                        if (!onSaveFormationSettings) return;
                        try {
                          setSavingSettings(true);
                          await onSaveFormationSettings();
                        } finally {
                          setSavingSettings(false);
                        }
                      }}
                      style={{
                        backgroundColor: '#2176ff',
                        paddingVertical: isMobile ? 8 : 10,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        alignItems: 'center'
                      }}
                      disabled={savingSettings}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>{savingSettings ? t('formations.saving') : t('formations.saveSettings')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Target (Team / Opponent) - Mejorado */}
              <View style={[styles.proModalCard, { flexDirection: 'row', padding: 4, marginHorizontal: 0, marginTop: 8, marginBottom: 10 }]}>
                <TouchableOpacity
                  onPress={() => setIsOpponent(false)}
                  style={{
                    flex: 1,
                    paddingVertical: isMobile ? 10 : 12,
                    paddingHorizontal: isMobile ? 12 : 16,
                    borderRadius: 10,
                    backgroundColor: !isOpponent ? '#2176ff' : 'transparent',
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="users" size={isMobile ? 14 : 16} color={!isOpponent ? '#fff' : '#666'} style={{ marginRight: 6 }} />
                  <Text style={{ color: !isOpponent ? '#fff' : '#666', fontWeight: '600', fontSize: isMobile ? 13 : 15 }}>{t('formations.team')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsOpponent(true)}
                  style={{
                    flex: 1,
                    paddingVertical: isMobile ? 10 : 12,
                    paddingHorizontal: isMobile ? 12 : 16,
                    borderRadius: 10,
                    backgroundColor: isOpponent ? '#ff3b30' : 'transparent',
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="shield" size={isMobile ? 14 : 16} color={isOpponent ? '#fff' : '#666'} style={{ marginRight: 6 }} />
                  <Text style={{ color: isOpponent ? '#fff' : '#666', fontWeight: '600', fontSize: isMobile ? 13 : 15 }}>{t('formations.opponent')}</Text>
                </TouchableOpacity>
              </View>

              {/* Checkbox jugadores reales - solo visible cuando no es rival */}
              {!isOpponent && players.length > 0 && (
                <TouchableOpacity
                  onPress={() => setUseRealPlayers(!useRealPlayers)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 10,
                    padding: 12,
                    backgroundColor: useRealPlayers ? '#e8f5e9' : '#f8f9fa',
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: useRealPlayers ? '#4caf50' : 'transparent'
                  }}
                >
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: useRealPlayers ? '#4caf50' : '#ccc',
                    backgroundColor: useRealPlayers ? '#4caf50' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    {useRealPlayers && (
                      <Feather name="check" size={16} color="#fff" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: isMobile ? 13 : 14, color: useRealPlayers ? '#2e7d32' : '#333', fontWeight: '600' }}>
                      {t('formations.realPlayers')}
                    </Text>
                    <Text style={{ fontSize: isMobile ? 10 : 11, color: '#999', marginTop: 2 }}>
                      {t('formations.realPlayersHint')}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={useRealPlayers ? '#4caf50' : '#ccc'} />
                </TouchableOpacity>
              )}

              {/* Compact Color & Size controls */}
              <View style={[styles.proModalCard, { flexDirection: 'row', alignItems: 'center', padding: isMobile ? 10 : 12, marginHorizontal: 0, marginTop: 8, marginBottom: 10 }]}>
                <TouchableOpacity
                  onPress={() => setColorPickerVisible(true)}
                  style={{
                    width: isMobile ? 40 : 48,
                    height: isMobile ? 40 : 48,
                    borderRadius: 10,
                    backgroundColor: selectedColor,
                    borderWidth: 3,
                    borderColor: '#fff',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 3
                  }}
                />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: isMobile ? 11 : 12, color: '#888', marginBottom: 4, fontWeight: '500' }}>
                    {t('formations.playerSize')}
                  </Text>
                  <View style={styles.proModalStepperRow}>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        setSelectedSize(s => {
                          const newSize = String(Math.max(8, parseInt(s) - 1 || 23));
                          setTeamPlayerStyle && setTeamPlayerStyle(prev => ({ ...prev, size: parseInt(newSize) }));
                          return newSize;
                        });
                      }}
                    >
                      <Feather name="minus" size={18} color="#666" />
                    </TouchableOpacity>
                    <View style={styles.proModalStepperValue}>
                      <Text style={styles.proModalStepperValueText}>{selectedSize}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        setSelectedSize(s => {
                          const newSize = String(Math.min(96, parseInt(s) + 1 || 25));
                          setTeamPlayerStyle && setTeamPlayerStyle(prev => ({ ...prev, size: parseInt(newSize) }));
                          return newSize;
                        });
                      }}
                    >
                      <Feather name="plus" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Grid de formaciones */}
              <View style={{ flex: 1, marginTop: 4, minHeight: isMobile ? 160 : 200 }}>
                <Text style={{ fontSize: isMobile ? 11 : 12, color: '#888', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t('formations.selectFormation')}
                </Text>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    {formationKeys.map((key, index) => (
                      <TouchableOpacity
                        key={key}
                        style={{
                          width: '48%',
                          minHeight: isMobile ? 96 : 112,
                          paddingVertical: isMobile ? 12 : 18,
                          paddingHorizontal: isMobile ? 8 : 14,
                          marginBottom: isMobile ? 8 : 12,
                          backgroundColor: '#fff',
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: isOpponent ? '#ff3b30' : '#2176ff',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.08,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                        onPress={() => {
                          handleSelectFormation(key);
                          // Solo cerrar si NO usamos jugadores reales (porque abrir� el selector)
                          if (!useRealPlayers || isOpponent) {
                            onClose();
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        {/* Icono de formaci�n mini */}
                        <View style={{
                          width: isMobile ? 44 : 50,
                          height: isMobile ? 30 : 32,
                          backgroundColor: isOpponent ? 'rgba(255,59,48,0.1)' : 'rgba(33,118,255,0.1)',
                          borderRadius: 6,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 6
                        }}>
                          <Text style={{ fontSize: isMobile ? 11 : 12, color: isOpponent ? '#ff3b30' : '#2176ff' }}>⚽</Text>
                        </View>
                        <Text style={{
                          fontSize: isMobile ? 15 : 20,
                          fontWeight: '700',
                          color: isOpponent ? '#ff3b30' : '#2176ff',
                          letterSpacing: 0.5,
                        }}>
                          {currentFormations[key].name}
                        </Text>
                        <Text style={{
                          fontSize: isMobile ? 10 : 11,
                          color: '#999',
                          marginTop: 2,
                        }}>
                          {currentFormations[key].positions.length} {t('formations.players').toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>

            {/* Footer con botones */}
            <View style={styles.proModalFooter}>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    t('formations.delete'),
                    t('formations.deleteConfirm', { side: isOpponent ? t('formations.opponent') : t('formations.team') }),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('formations.delete'), style: 'destructive', onPress: () => { onDeleteFormation && onDeleteFormation(isOpponent ? 'opponent' : 'team'); onClose(); } }
                    ]
                  );
                }}
                style={[styles.proModalBtn, { backgroundColor: '#dc3545', flex: 1, marginRight: 8 }]}
              >
                <Feather name="trash-2" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>{t('formations.delete')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={[styles.proModalBtn, styles.proModalBtnSecondary, { flex: 1 }]}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>

            <MiniColorPickerModal
              visible={colorPickerVisible}
              initialColor={selectedColor}
              onClose={() => setColorPickerVisible(false)}
              onSelect={(c) => {
                setSelectedColor(c);
                if (!isOpponent) {
                  setTeamPlayerStyle && setTeamPlayerStyle(prev => ({ ...prev, color: c }));
                }
              }}
            />

            <MiniColorPickerModal
              visible={numberColorPickerVisible}
              initialColor={numberColor}
              onClose={() => setNumberColorPickerVisible(false)}
              onSelect={(c) => setTeamPlayerStyle && setTeamPlayerStyle(prev => ({ ...prev, numberColor: c }))}
            />

            <MiniColorPickerModal
              visible={textColorPickerVisible}
              initialColor={textColor}
              onClose={() => setTextColorPickerVisible(false)}
              onSelect={(c) => setTeamPlayerStyle && setTeamPlayerStyle(prev => ({ ...prev, textColor: c }))}
            />

            <MiniColorPickerModal
              visible={textBgColorPickerVisible}
              initialColor={textBackgroundColor === 'transparent' ? '#ffffff' : textBackgroundColor}
              onClose={() => setTextBgColorPickerVisible(false)}
              onSelect={(c) => setTeamPlayerStyle && setTeamPlayerStyle(prev => ({ ...prev, textBackgroundColor: c }))}
            />

            {/* Modal de selecci�n de jugadores */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={playerSelectorVisible}
              onRequestClose={() => setPlayerSelectorVisible(false)}
              statusBarTranslucent={true}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{
                  width: isMobile ? SCREEN_WIDTH * 0.9 : 450,
                  maxHeight: SCREEN_HEIGHT * 0.8,
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  overflow: 'hidden'
                }}>
                  {/* Header */}
                  <View style={{
                    backgroundColor: '#2176ff',
                    padding: 16,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <View>
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                        {t('formations.selectPlayers')}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>
                        {t('formations.selectedCount', { count: selectedPlayers.length })}/{selectedPlayerCount}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setPlayerSelectorVisible(false)}>
                      <Feather name="x" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Toggle mostrar fotos */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    backgroundColor: '#f8f9fa',
                    borderBottomWidth: 1,
                    borderBottomColor: '#eee'
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Feather name="camera" size={18} color="#666" style={{ marginRight: 10 }} />
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
                          {t('tacticalBoard.teamSettings.showPhotos') || 'Mostrar fotos'}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                          {t('formations.showPhotosInFormation') || 'Mostrar foto en lugar de n�mero'}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={teamPlayerStyle?.showPhotos || false}
                      onValueChange={(val) => {
                        setTeamPlayerStyle && setTeamPlayerStyle(prev => ({
                          ...prev,
                          showPhotos: val,
                          // Si se activan fotos, desactivar mostrar posici�n
                          showPosition: val ? false : prev.showPosition
                        }));
                      }}
                      trackColor={{ false: "#ddd", true: "#81b0ff" }}
                      thumbColor={teamPlayerStyle?.showPhotos ? "#2176ff" : "#f4f3f4"}
                    />
                  </View>

                  {/* Lista de jugadores */}
                  <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.5, padding: 12 }}>
                    {sortedPlayers.length === 0 ? (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Feather name="users" size={48} color="#ccc" />
                        <Text style={{ color: '#999', marginTop: 12, textAlign: 'center' }}>
                          {t('formations.noPlayersAvailable')}
                        </Text>
                      </View>
                    ) : (
                      sortedPlayers.map((player) => {
                        const isSelected = selectedPlayers.some(p => p._id === player._id);
                        const positionLabels = {
                          'portero': 'POR',
                          'central': 'DEF',
                          'lateral': 'LAT',
                          'centrocampista': 'MED',
                          'extremo': 'EXT',
                          'delantero': 'DEL'
                        };
                        return (
                          <TouchableOpacity
                            key={player._id}
                            onPress={() => togglePlayerSelection(player)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: 12,
                              marginBottom: 8,
                              backgroundColor: isSelected ? '#e3f2fd' : '#f5f5f5',
                              borderRadius: 10,
                              borderWidth: 2,
                              borderColor: isSelected ? '#2176ff' : 'transparent'
                            }}
                          >
                            {/* Checkbox */}
                            <View style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              borderWidth: 2,
                              borderColor: isSelected ? '#2176ff' : '#ccc',
                              backgroundColor: isSelected ? '#2176ff' : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12
                            }}>
                              {isSelected && <Feather name="check" size={14} color="#fff" />}
                            </View>

                            {/* Dorsal o Foto */}
                            <View style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: teamPlayerStyle?.showPhotos && player.foto ? 'transparent' : selectedColor,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12,
                              borderWidth: teamPlayerStyle?.showPhotos && player.foto ? 2 : 0,
                              borderColor: selectedColor,
                              overflow: 'hidden',
                            }}>
                              {teamPlayerStyle?.showPhotos && player.foto ? (
                                <Image
                                  source={{ uri: cdnUrl(player.foto) }}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                  }}
                                  resizeMode="cover"
                                />
                              ) : (
                                <Text style={{ color: numberColor, fontWeight: 'bold', fontSize: 14 }}>
                                  {player.dorsal || '?'}
                                </Text>
                              )}
                            </View>

                            {/* Info del jugador */}
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: '600', fontSize: 14, color: '#333' }}>
                                {getPlayerFullName(player)}
                              </Text>
                              <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                                {positionLabels[player.posicion] || player.posicion || '-'}
                              </Text>
                            </View>

                            {/* Badge de posici�n */}
                            <View style={{
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 4,
                              backgroundColor: player.posicion === 'portero' ? '#ff9800' :
                                player.posicion === 'central' || player.posicion === 'lateral' ? '#4caf50' :
                                  player.posicion === 'centrocampista' ? '#2196f3' :
                                    player.posicion === 'extremo' || player.posicion === 'delantero' ? '#f44336' : '#9e9e9e'
                            }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                                {positionLabels[player.posicion] || '?'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>

                  {/* Footer con botones */}
                  <View style={{
                    flexDirection: 'row',
                    padding: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#eee'
                  }}>
                    <TouchableOpacity
                      onPress={() => {
                        setPlayerSelectorVisible(false);
                        setSelectedPlayers([]);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 8,
                        backgroundColor: '#f5f5f5',
                        alignItems: 'center',
                        marginRight: 8
                      }}
                    >
                      <Text style={{ color: '#666', fontWeight: '600' }}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleConfirmPlayers}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 8,
                        backgroundColor: selectedPlayers.length > 0 ? '#2176ff' : '#ccc',
                        alignItems: 'center'
                      }}
                      disabled={selectedPlayers.length === 0}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>
                        {t('formations.confirm')} ({selectedPlayers.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

          </View>
        </View>
      </View>
    </Modal>
  );
}

function FieldCarouselModal({
  visible,
  FIELD_IMAGES,
  carouselIndex,
  setCarouselIndex,
  handleFieldChangeFromCarousel,
  closeCarouselModal,
  SCREEN_WIDTH,
  SCREEN_HEIGHT
}) {
  const { t } = useTranslation();
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={closeCarouselModal}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.proModalOverlay}>
          <View style={[
            styles.proModalContainer,
            {
              width: isMobile ? Math.min(SCREEN_WIDTH * 0.65, 280) : Math.min(SCREEN_WIDTH * 0.9, 420),
              maxHeight: SCREEN_HEIGHT * 0.8
            }
          ]}>
            {/* Header */}
            <View style={styles.proModalHeader}>
              <View style={styles.proModalHeaderIcon}>
                <Text style={{ fontSize: 16 }}>🏟️</Text>
              </View>
              <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                {t('field.selectField')}
              </Text>
              <TouchableOpacity style={styles.proModalCloseBtn} onPress={closeCarouselModal}>
                <Text style={{ fontSize: 16, color: '#666' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.proModalBody}>
              {FIELD_IMAGES.map((field, idx) => (
                <TouchableOpacity
                  key={field.id}
                  style={[
                    styles.proModalCard,
                    { padding: 14, marginBottom: 8 },
                    carouselIndex === idx && {
                      backgroundColor: '#e8f4ff',
                      borderColor: '#2176ff',
                      borderWidth: 2
                    }
                  ]}
                  onPress={() => setCarouselIndex(idx)}
                >
                  <Text style={[
                    { fontSize: 15, color: '#333' },
                    carouselIndex === idx && { fontWeight: '600', color: '#2176ff' }
                  ]}>
                    {t(`field.images.${field.id}`) || field.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Footer */}
            <View style={styles.proModalFooter}>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnSecondary]}
                onPress={closeCarouselModal}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                  {t('tacticalBoard.formationModal.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnPrimary]}
                onPress={() => handleFieldChangeFromCarousel(carouselIndex)}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                  {t('tacticalBoard.formationModal.select')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
function renderIconCanvas(icon, size = 24, rotation = 0, number = undefined, playersWithNumber = true, displayLabel = undefined, numberColor = '#ffffff', isGoalkeeper = false, differentiateGoalkeeper = true, goalkeeperStripeColor = '#ffffff', showPhotos = false, photoUrl = null) {
  const color = isValidHexColor(icon.color) ? icon.color : '#000000';
  const style = rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined;
  const halfSize = size / 2;

  // Determinar qu� mostrar: displayLabel (posici�n) o number
  const displayText = displayLabel !== undefined ? displayLabel : number;
  const isPositionLabel = displayLabel !== undefined;
  const textColor = icon.numberColor || numberColor;
  const fontSize = isPositionLabel ? Math.max(10, size * 0.45) : (String(displayText).length > 2 ? size * 0.4 : size * 0.6);

  // Determinar si mostrar rayas de portero
  const showGoalkeeperStripes = isGoalkeeper && differentiateGoalkeeper && !showPhotos;
  // Color de las rayas m�s vivo (70% opacidad)
  const stripeColor = goalkeeperStripeColor || '#ffffff';

  // Determinar si mostrar foto (solo si showPhotos est� activo y hay foto)
  const shouldShowPhoto = showPhotos && photoUrl;

  switch (icon.type) {
    case 'player':
      return (
        <View style={[
          {
            width: size, height: size, borderRadius: halfSize,
            backgroundColor: shouldShowPhoto ? 'transparent' : color,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: shouldShowPhoto ? 2 : 1,
            borderColor: shouldShowPhoto ? color : '#222',
            overflow: 'hidden',
          },
          style,
        ]}>
          {/* Foto del jugador si est� activo */}
          {shouldShowPhoto && (
            <Image
              source={{ uri: photoUrl }}
              style={{
                width: size - 4,
                height: size - 4,
                borderRadius: (size - 4) / 2,
              }}
              resizeMode="cover"
            />
          )}
          {/* Rayas horizontales para portero (solo si no hay foto) */}
          {showGoalkeeperStripes && !shouldShowPhoto && (
            <>
              <View style={{ position: 'absolute', top: size * 0.1, left: 0, right: 0, height: 2, backgroundColor: stripeColor, opacity: 0.85 }} />
              <View style={{ position: 'absolute', top: size * 0.35, left: 0, right: 0, height: 2, backgroundColor: stripeColor, opacity: 0.85 }} />
              <View style={{ position: 'absolute', top: size * 0.6, left: 0, right: 0, height: 2, backgroundColor: stripeColor, opacity: 0.85 }} />
              <View style={{ position: 'absolute', top: size * 0.85, left: 0, right: 0, height: 2, backgroundColor: stripeColor, opacity: 0.85 }} />
            </>
          )}
          {/* N�mero/posici�n solo si no hay foto */}
          {!shouldShowPhoto && playersWithNumber && displayText !== undefined &&
            <Text style={{
              color: textColor,
              fontWeight: isPositionLabel ? '600' : 'bold',
              fontSize,
              lineHeight: fontSize,
              textAlign: 'center',
              includeFontPadding: false,
              verticalAlign: 'middle',
              ...(Platform.OS === 'web' ? {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
              } : {}),
            }}>{displayText}</Text>
          }
        </View>
      );
    case 'staff':
      // Icono para el cuerpo t�cnico (c�rculo con c�digo)
      const staffDisplayText = icon.displayLabel || 'CT';
      const staffFontSize = String(staffDisplayText).length > 2 ? size * 0.4 : size * 0.5;
      return (
        <View style={[
          {
            width: size, height: size, borderRadius: halfSize,
            backgroundColor: color,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#666',
          },
          style,
        ]}>
          <Text style={{
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: staffFontSize,
            lineHeight: staffFontSize,
            textAlign: 'center',
            includeFontPadding: false,
            verticalAlign: 'middle',
            ...(Platform.OS === 'web' ? {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
            } : {}),
          }}>{staffDisplayText}</Text>
        </View>
      );
    case 'ball':
      return <BallImage size={size} rotation={rotation} />;
    case 'ball-shadow': {
      const shadowScale = typeof icon.shadowScale === 'number' ? icon.shadowScale : 0.8;
      const shadowOpacity = typeof icon.opacity === 'number' ? icon.opacity : 0.35;
      const baseSize = size * 0.82;
      const shadowW = baseSize * 0.92 * shadowScale;
      const shadowH = baseSize * 0.34 * shadowScale;
      const softOpacity = Math.max(0, shadowOpacity * 0.28);
      const midOpacity = Math.max(0, shadowOpacity * 0.55);
      return (
        <View
          pointerEvents="none"
          style={{
            width: baseSize,
            height: baseSize,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [
              { translateX: shadowW * 0.1 },
              { translateY: shadowH * 0.04 },
              { rotate: '-8deg' },
            ],
          }}
        >
          <View style={{
            position: 'absolute',
            width: shadowW,
            height: shadowH,
            borderRadius: shadowH / 2,
            backgroundColor: '#000',
            opacity: softOpacity,
          }} />
          <View style={{
            position: 'absolute',
            width: shadowW * 0.72,
            height: shadowH * 0.7,
            borderRadius: (shadowH * 0.7) / 2,
            backgroundColor: '#000',
            opacity: midOpacity,
          }} />
          <View style={{
            width: shadowW * 0.42,
            height: shadowH * 0.48,
            borderRadius: (shadowH * 0.48) / 2,
            backgroundColor: '#000',
            opacity: shadowOpacity,
          }} />
        </View>
      );
    }
    case 'cone':
      // Cono de f�tbol con base negra y cuerpo naranja
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{
            width: 0, height: 0,
            borderLeftWidth: size * 0.5,
            borderRightWidth: size * 0.5,
            borderBottomWidth: size * 0.85,
            borderStyle: 'solid',
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          }} />
          <View style={{
            width: size * 0.6,
            height: size * 0.13,
            backgroundColor: '#222',
            borderRadius: size * 0.07,
            marginTop: -2,
          }} />
        </View>
      );
    case 'goal':
      return <GoalImage size={size} rotation={rotation} />;
    case 'goal-large':
      return <GoalLargeImage size={size} rotation={rotation} />;
    case 'goal-small':
      return <GoalSmallImage size={size} rotation={rotation} />;
    case 'barrier':
      return <BarrierImage size={size} rotation={rotation} color={color} />;
    case 'dummy':
      return <DummyImage size={size} rotation={rotation} color={color} />;
    case 'pole':
      return <PoleImage size={size} rotation={rotation} color={color} />;
    case 'cone-pro':
      return <ConeProImage size={size} color={color} />;
    case 'cone-flat':
      return <ConeFlatImage size={size} color={color} />;
    case 'ring':
      return <RingImage size={size} color={color} />;
    case 'ladder':
      // Escalera de agilidad - l�neas verticales y horizontales
      return (
        <Svg width={size} height={size * 0.4} style={style}>
          {/* L�nea horizontal superior */}
          <Path d={`M 0,${size * 0.05} H${size}`} stroke={color} strokeWidth={2} />
          {/* L�nea horizontal inferior */}
          <Path d={`M 0,${size * 0.35} H${size}`} stroke={color} strokeWidth={2} />
          {/* L�neas verticales (pelda�os) */}
          {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
            <Path key={i} d={`M${size * f},${size * 0.05} V${size * 0.35}`} stroke={color} strokeWidth={2} />
          ))}
        </Svg>
      );
    case 'weights':
      return <WeightsImage size={size} color={color} />;
    case 'materials-button':
      // Icono para el bot�n de materiales (cono + valla)
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="construct-outline" size={size * 0.8} color="#000000" />
        </View>
      );
    case 'straight-arrow':
      const arrowLineType = icon.lineType || 'solid';
      const arrowDashArray = arrowLineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : undefined;
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size}>
            <Path
              d={`M${size * 0.1},${size * 0.5} L${size * 0.65},${size * 0.5}`}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={arrowDashArray}
              fill="none"
              strokeLinecap="round"
            />
            <Polygon
              points={`${size * 0.9},${size * 0.5} ${size * 0.65},${size * 0.3} ${size * 0.65},${size * 0.7}`}
              fill={color}
            />
          </Svg>
        </View>
      );
    case 'straight-line':
      const straightLineType = icon.lineType || 'solid';
      const straightDashArray = straightLineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : undefined;
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size}>
            <Path
              d={`M${size * 0.1},${size * 0.5} L${size * 0.9},${size * 0.5}`}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={straightDashArray}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
        </View>
      );
    case 'curve-line':
      const curveLineType = icon.lineType || 'solid';
      const curveDashArray = curveLineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : undefined;
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size}>
            <Path
              d={`M${size * 0.2},${size * 0.5} Q${size * 0.5},${size * 0.2} ${size * 0.8},${size * 0.5}`}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={curveDashArray}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
        </View>
      );
    case 'curve-arrow':
      const curveArrowLineType = icon.lineType || 'solid';
      const curveArrowDashArray = curveArrowLineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : undefined;
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size}>
            <Path
              d={`M${size * 0.2},${size * 0.5} Q${size * 0.5},${size * 0.2} ${size * 0.8},${size * 0.5}`}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={curveArrowDashArray}
              fill="none"
              strokeLinecap="round"
            />
            <Polygon
              points={`${size * 0.9},${size * 0.55} ${size * 0.7},${size * 0.25} ${size * 0.65},${size * 0.55}`}
              fill={color}
            />
          </Svg>
        </View>
      );
    case 'circle':
      const circleLineType = icon.lineType || 'solid';
      const circleDashArray = circleLineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : undefined;
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size}>
            <Circle
              cx={size * 0.5}
              cy={size * 0.5}
              r={size * 0.35}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={circleDashArray}
              fill={icon.fillColor && icon.fillColor !== 'transparent' ? `${icon.fillColor}66` : "none"}
            />
          </Svg>
        </View>
      );
    case 'rectangle':
      const rectLineType = icon.lineType || 'solid';
      const rectDashArray = rectLineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : undefined;
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size}>
            <Rect
              x={size * 0.15}
              y={size * 0.2}
              width={size * 0.7}
              height={size * 0.6}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={rectDashArray}
              fill={icon.fillColor && icon.fillColor !== 'transparent' ? `${icon.fillColor}66` : "none"}
            />
          </Svg>
        </View>
      );
    case 'custom-shape-button':
      // IMPORTANTE: Este case solo debe usarse en la paleta, NUNCA en el canvas
      if (!icon.inPalette) {
        return null; // No renderizar si no est� expl�citamente marcado como de paleta
      }

      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size}>
            {/* Icono de l�piz/estrella para representar dibujo libre */}
            <Path
              d={`M${size * 0.5},${size * 0.1} L${size * 0.7},${size * 0.4} L${size * 0.9},${size * 0.45} L${size * 0.7},${size * 0.6} L${size * 0.8},${size * 0.9} L${size * 0.5},${size * 0.7} L${size * 0.2},${size * 0.9} L${size * 0.3},${size * 0.6} L${size * 0.1},${size * 0.45} L${size * 0.3},${size * 0.4} Z`}
              stroke={color}
              strokeWidth={1.2}
              fill="none"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      );

    case 'team-players':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            width: size * 0.9,
            height: size * 0.9,
            borderRadius: size * 0.45,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MaterialIcons name="people" size={size * 0.6} color="#ffffff" />
          </View>
        </View>
      );

    case 'coaching-staff':
      // Icono de cuerpo t�cnico - persona con portapapeles
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            width: size * 0.9,
            height: size * 0.9,
            borderRadius: size * 0.45,
            backgroundColor: color || '#333333',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MaterialCommunityIcons name="clipboard-account" size={size * 0.55} color="#ffffff" />
          </View>
        </View>
      );

    default:
      return null;
  }
}

// Componente memoizado para renderizar iconos sin parpadeo
const MemoizedIcon = React.memo(({ icon, size, rotation, number, playersWithNumber, displayLabel, numberColor, isGoalkeeper, differentiateGoalkeeper, goalkeeperStripeColor, showPhotos, photoUrl }) => {
  return renderIconCanvas(icon, size, rotation, number, playersWithNumber, displayLabel, numberColor, isGoalkeeper, differentiateGoalkeeper, goalkeeperStripeColor, showPhotos, photoUrl);
}, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian las props relevantes
  return prevProps.size === nextProps.size &&
    prevProps.rotation === nextProps.rotation &&
    prevProps.number === nextProps.number &&
    prevProps.icon.color === nextProps.icon.color &&
    prevProps.icon.type === nextProps.icon.type &&
    prevProps.icon.lineType === nextProps.icon.lineType &&
    prevProps.icon.fillColor === nextProps.icon.fillColor &&
    prevProps.icon.thickness === nextProps.icon.thickness &&
    prevProps.icon.dotSize === nextProps.icon.dotSize &&
    prevProps.icon.dotSpacing === nextProps.icon.dotSpacing &&
    prevProps.icon._lastUpdate === nextProps.icon._lastUpdate &&
    prevProps.playersWithNumber === nextProps.playersWithNumber &&
    prevProps.displayLabel === nextProps.displayLabel &&
    prevProps.numberColor === nextProps.numberColor &&
    prevProps.icon.numberColor === nextProps.icon.numberColor &&
    prevProps.isGoalkeeper === nextProps.isGoalkeeper &&
    prevProps.differentiateGoalkeeper === nextProps.differentiateGoalkeeper &&
    prevProps.goalkeeperStripeColor === nextProps.goalkeeperStripeColor &&
    prevProps.showPhotos === nextProps.showPhotos &&
    prevProps.photoUrl === nextProps.photoUrl;
});

// Componente memoizado completo para cada icono individual
const DraggableIcon = React.memo(({
  icon,
  idx,
  imageWidth,
  imageHeight,
  selectedCloneId,
  setSelectedCloneId,
  clones,
  setClones,
  dragStart,
  setOptionsMenu,
  saveClonesHistory,
  playersWithNumber,
  scale,
  isMobile,
  drawingStates,
  multiSelectMode,
  selectedCloneIds,
  selectedCloneIdsSet, // OPTIMIZACIÓN: Set para b�squeda O(1)
  setSelectedCloneIds,
  cancelSelection,
  selectionInteractionMode,
  differentiateGoalkeeper,
  goalkeeperStripeColor,
  showPhotos,
  onDeleteClone,
  viewMode,
  zoomLevel = 1,
  setDraggingOutside = null
}) => {
  const size = icon.size * scale;
  const dragKey = `icon-${icon.id}`;
  const rafRef = useRef(null);
  const pendingDragUpdateRef = useRef(null);
  const lastUpdateRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isNearDeleteZoneRef = useRef(false);
  const [deleteZoneTick, setDeleteZoneTick] = useState(0); // Solo para forzar re-render visual
  const isNearDeleteZone = isNearDeleteZoneRef.current;
  const setIsNearDeleteZone = useCallback((val) => {
    if (isNearDeleteZoneRef.current !== val) {
      isNearDeleteZoneRef.current = val;
      setDeleteZoneTick(t => t + 1);
    }
  }, []);
  const scheduleDragUpdate = useCallback((updater) => {
    pendingDragUpdateRef.current = updater;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      if (pendingDragUpdateRef.current) {
        setClones(pendingDragUpdateRef.current);
        pendingDragUpdateRef.current = null;
      }
      rafRef.current = null;
    });
  }, [setClones]);

  // Refs para coordinar gestos
  const panRef = useRef(null);
  const tapRef = useRef(null);

  const isDrawingMode = drawingStates?.drawingStraightArrow || drawingStates?.drawingStraightLine ||
    drawingStates?.drawingCurveArrow || drawingStates?.drawingCurveLine ||
    drawingStates?.drawingCircle || drawingStates?.drawingRectangle ||
    drawingStates?.drawingCustomShape || drawingStates?.eraserMode;

  // OPTIMIZACIÓN: Usar Set para b�squeda O(1) si est� disponible
  const isSelected = selectedCloneIdsSet ? selectedCloneIdsSet.has(icon.id) : selectedCloneIds.includes(icon.id);
  const canDrag = !icon.locked && !isDrawingMode &&
    (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));

  // En multi-drag, derivar indicador de eliminaci�n de la posici�n actual del elemento
  const isOutsideInMultiDrag = ALLOW_MULTI_ELEMENT_DRAG && multiSelectMode && selectionInteractionMode === 'move' && isSelected &&
    (icon.x < 0 || icon.x > imageWidth || icon.y < 0 || icon.y > imageHeight);
  const showDeleteIndicator = isNearDeleteZone || isOutsideInMultiDrag;

  // Detectar si est� fuera del campo visible (zona de eliminaci�n)
  const checkDeleteZone = useCallback((xRatio, yRatio) => {
    return isOutsideVisibleField(xRatio, yRatio, viewMode, imageWidth, imageHeight);
  }, [viewMode, imageWidth, imageHeight]);

  // Handler para tap - selecciona el elemento
  // Usamos solo State.END para evitar doble disparo
  const handleTap = useCallback((e) => {
    if (e.nativeEvent.state === State.END) {
      // Solo seleccionar si no estamos arrastrando
      if (!isDragging.current && !isDrawingMode && !multiSelectMode && !icon.locked) {
        // Marcar el tiempo de selecci�n para proteger contra deselecci�n inmediata
        lastIconSelectionTime = Date.now();
        setSelectedCloneId(icon.id);
      }
    }
  }, [isDrawingMode, multiSelectMode, icon.locked, icon.id, setSelectedCloneId]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: icon.x - size / 2,
        top: icon.y - size / 2,
        width: size,
        height: size,
        zIndex: icon.calculatedZIndex || (icon.locked === true ? 1 : (icon.zIndex || 200)),
      }}
    >
      {/* Indicador visual de zona de eliminacion - se renderiza FUERA del wrapper
        escalado/opacado para que sea nitido y completamente visible (mismo
        comportamiento que ahora tiene el texto al sacarse de la pizarra). */}
      {showDeleteIndicator && (
        <View pointerEvents="none" style={{
          position: 'absolute',
          top: -12,
          left: -12,
          right: -12,
          bottom: -12,
          borderRadius: (size + 24) / 2,
          borderWidth: 3,
          borderColor: '#e74c3c',
          borderStyle: 'dashed',
          backgroundColor: 'rgba(231, 76, 60, 0.22)',
          zIndex: 99,
        }}>
          <View style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: '#e74c3c',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
            elevation: 4,
          }}>
            <Feather name="trash-2" size={12} color="#fff" />
          </View>
        </View>
      )}
      <View style={{
        flex: 1,
        opacity: showDeleteIndicator ? 0.5 : 1,
        transform: showDeleteIndicator ? [{ scale: 0.8 }] : [],
      }} pointerEvents="box-none">
        <TapGestureHandler
          ref={tapRef}
          waitFor={panRef}
          enabled={!isDrawingMode && !icon.locked}
          onHandlerStateChange={handleTap}
        >
          <View style={{ flex: 1 }} pointerEvents="box-none">
            <PanGestureHandler
              ref={panRef}
              key={dragKey}
              enabled={canDrag}
              shouldCancelWhenOutside={false}
              avgTouches={Platform.OS === 'android'}
              activeOffsetX={[-5, 5]}
              activeOffsetY={[-5, 5]}
              onHandlerStateChange={(e) => {
                // ACTIVE: El gesto de pan fue reconocido (el dedo se movi� lo suficiente)
                // Inicializar el arrastre aqu�
                if (e.nativeEvent.state === State.ACTIVE && !icon.locked && !isDragging.current) {
                  setDraggingOutside?.(false);
                  if (!acquireBoardDrag(dragStart, dragKey)) return;
                  isDragging.current = true;

                  // Si estamos en modo multi-select, cancelar el rect�ngulo de selecci�n
                  if (multiSelectMode && cancelSelection) {
                    cancelSelection();
                  }

                  // Si hay selecci�n m�ltiple y este icono est� en la selecci�n
                  if (ALLOW_MULTI_ELEMENT_DRAG && multiSelectMode && isSelected && clones && Array.isArray(clones)) {
                    // Guardar posiciones iniciales de TODOS los elementos seleccionados
                    // Incluyendo iconos (xRatio/yRatio) y l�neas/figuras (points)
                    const initialPositions = {};
                    selectedCloneIds.forEach(id => {
                      const clone = clones.find(c => c.id === id);
                      if (clone) {
                        // Para l�neas y figuras, guardar los puntos
                        if (clone.points && Array.isArray(clone.points)) {
                          initialPositions[id] = {
                            points: clone.points.map(p => ({ x: p.x, y: p.y }))
                          };
                        } else {
                          // Para iconos normales
                          initialPositions[id] = {
                            xRatio: clone.xRatio,
                            yRatio: clone.yRatio
                          };
                        }
                      }
                    });

                    dragStart.current[dragKey] = {
                      xRatio: icon.xRatio,
                      yRatio: icon.yRatio,
                      id: icon.id,
                      multiSelect: true,
                      selectedIds: [...selectedCloneIds],
                      initialPositions: initialPositions
                    };
                  } else {
                    dragStart.current[dragKey] = {
                      xRatio: icon.xRatio,
                      yRatio: icon.yRatio,
                      id: icon.id
                    };
                  }
                  lastUpdateRef.current = { x: icon.xRatio, y: icon.yRatio };
                }

                if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED || e.nativeEvent.state === State.FAILED) {
                  isDragging.current = false;
                  setDraggingOutside?.(false);
                  setIsNearDeleteZone(false); // Resetear indicador visual
                  if (rafRef.current) {
                    cancelAnimationFrame(rafRef.current);
                    rafRef.current = null;
                  }
                  if (pendingDragUpdateRef.current) {
                    setClones(pendingDragUpdateRef.current);
                    pendingDragUpdateRef.current = null;
                  }

                  // Verificar si elementos est�n fuera del campo y eliminarlos
                  if (e.nativeEvent.state === State.END && dragStart.current[dragKey]) {
                    const start = dragStart.current[dragKey];
                    if (start.multiSelect && start.selectedIds) {
                      // Multi-drag: eliminar TODOS los seleccionados que est�n fuera del campo
                      setClones((prev) => {
                        const toDelete = [];
                        const remaining = prev.filter(c => {
                          if (!start.selectedIds.includes(c.id) || c.locked) return true;
                          let outside = false;
                          if (c.points && Array.isArray(c.points) && c.points.length >= 2) {
                            outside = areAllPointsOutside(c.points, viewMode, imageWidth, imageHeight);
                          } else if (c.xRatio !== undefined) {
                            outside = isOutsideVisibleField(c.xRatio, c.yRatio, viewMode, imageWidth, imageHeight);
                          }
                          if (outside) { toDelete.push(c); return false; }
                          return true;
                        });
                        if (toDelete.length > 0 && onDeleteClone) {
                          setTimeout(() => toDelete.forEach(c => onDeleteClone(c)), 0);
                        }
                        return toDelete.length > 0 ? remaining : prev;
                      });
                    } else {
                      // Single drag: solo eliminar este elemento
                      setClones((prev) => {
                        const currentClone = prev.find(c => c.id === icon.id);
                        if (currentClone && !currentClone.locked) {
                          const { xRatio, yRatio } = currentClone;
                          if (isOutsideVisibleField(xRatio, yRatio, viewMode, imageWidth, imageHeight)) {
                            if (onDeleteClone) {
                              setTimeout(() => onDeleteClone(currentClone), 0);
                            }
                            return prev.filter(c => c.id !== icon.id);
                          }
                        }
                        return prev;
                      });
                    }
                  }

                  delete dragStart.current[dragKey];
                  releaseBoardDrag(dragStart, dragKey);
                  // Guardar en historial al finalizar el drag
                  if (saveClonesHistory) saveClonesHistory();
                }
              }}
              onGestureEvent={(e) => {
                if (e.nativeEvent.state === State.ACTIVE && !icon.locked && dragStart.current[dragKey] && isBoardDragOwner(dragStart, dragKey)) {
                  const start = dragStart.current[dragKey];
                  // Dividir translaci�n por zoomLevel para compensar la escala del contenedor
                  const { dxRatio: dx, dyRatio: dy } = deltaToRatio(e.nativeEvent.translationX / zoomLevel, e.nativeEvent.translationY / zoomLevel, viewMode, imageWidth, imageHeight);

                  // Si es arrastre de m�ltiples elementos
                  if (start.multiSelect && start.selectedIds && start.initialPositions) {
                    const anyOutside = start.selectedIds.some(selectedId => {
                      const initialPos = start.initialPositions[selectedId];
                      if (!initialPos) return false;
                      const candidate = initialPos.points && Array.isArray(initialPos.points)
                        ? { points: initialPos.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy })) }
                        : { xRatio: initialPos.xRatio + dx, yRatio: initialPos.yRatio + dy };
                      return isBoardCloneOutsideForDelete(candidate, viewMode, imageWidth, imageHeight);
                    });
                    setDraggingOutside?.(anyOutside);
                    // Actualizar inmediatamente para mejor respuesta
                    scheduleDragUpdate((prev) => {
                      const next = [...prev];
                      start.selectedIds.forEach(selectedId => {
                        const cloneIndex = next.findIndex(c => c.id === selectedId);
                        if (cloneIndex !== -1 && !next[cloneIndex].locked) {
                          const initialPos = start.initialPositions[selectedId];
                          if (initialPos) {
                            // Si tiene puntos (l�neas/figuras), mover los puntos
                            if (initialPos.points && Array.isArray(initialPos.points)) {
                              next[cloneIndex] = {
                                ...next[cloneIndex],
                                points: initialPos.points.map(pt => ({
                                  x: pt.x + dx,
                                  y: pt.y + dy
                                }))
                              };
                            } else {
                              // Iconos normales: permitir valores fuera de 0-1 para que el elemento pueda salir del campo
                              const newXRatio = initialPos.xRatio + dx;
                              const newYRatio = initialPos.yRatio + dy;
                              next[cloneIndex] = {
                                ...next[cloneIndex],
                                xRatio: newXRatio,
                                yRatio: newYRatio
                              };
                            }
                          }
                        }
                      });
                      return next;
                    });
                  } else {
                    // Arrastre de un solo elemento - permitir valores fuera de 0-1
                    const newXRatio = start.xRatio + dx;
                    const newYRatio = start.yRatio + dy;

                    // Actualizar indicador visual de zona de eliminaci�n
                    const inDeleteZone = checkDeleteZone(newXRatio, newYRatio);
                    setDraggingOutside?.(inDeleteZone);
                    if (inDeleteZone !== isNearDeleteZone) {
                      setIsNearDeleteZone(inDeleteZone);
                    }

                    if (Platform.OS === 'android') {
                      scheduleDragUpdate((prev) => {
                        const correctIndex = idx;
                        if (correctIndex >= prev.length || prev[correctIndex].id !== icon.id) {
                          const fallbackIndex = prev.findIndex(c => c.id === icon.id);
                          if (fallbackIndex === -1) return prev;

                          const next = [...prev];
                          next[fallbackIndex] = {
                            ...next[fallbackIndex],
                            xRatio: newXRatio,
                            yRatio: newYRatio
                          };
                          return next;
                        }

                        const next = [...prev];
                        next[correctIndex] = {
                          ...next[correctIndex],
                          xRatio: newXRatio,
                          yRatio: newYRatio
                        };
                        return next;
                      });
                    } else {
                      const deltaX = Math.abs(newXRatio - lastUpdateRef.current.x);
                      const deltaY = Math.abs(newYRatio - lastUpdateRef.current.y);

                      if (deltaX < 0.002 && deltaY < 0.002) {
                        return;
                      }

                      lastUpdateRef.current = { x: newXRatio, y: newYRatio };
                      scheduleDragUpdate((prev) => {
                        const correctIndex = idx;
                        if (correctIndex >= prev.length || prev[correctIndex].id !== icon.id) {
                          const fallbackIndex = prev.findIndex(c => c.id === icon.id);
                          if (fallbackIndex === -1) return prev;

                          const next = [...prev];
                          next[fallbackIndex] = {
                            ...next[fallbackIndex],
                            xRatio: newXRatio,
                            yRatio: newYRatio
                          };
                          return next;
                        }

                        const next = [...prev];
                        next[correctIndex] = {
                          ...next[correctIndex],
                          xRatio: newXRatio,
                          yRatio: newYRatio
                        };
                        return next;
                      });
                    }
                  }
                }
              }}
            >
              <View style={{ flex: 1 }}>
                <View
                  pointerEvents={isDrawingMode ? "none" : "box-none"}
                  style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
                >
                  {/* Indicador visual de selecci�n m�ltiple */}
                  {multiSelectMode && isSelected && (
                    <View style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#3498db',
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 101,
                      borderWidth: 2,
                      borderColor: '#fff'
                    }}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  )}

                  {/* Borde para elementos seleccionados en modo multi-selecci�n */}
                  {multiSelectMode && isSelected && (
                    <View style={{
                      position: 'absolute',
                      top: -2,
                      left: -2,
                      right: -2,
                      bottom: -2,
                      borderRadius: size / 2,
                      borderWidth: 2,
                      borderColor: '#3498db',
                      pointerEvents: 'none'
                    }} />
                  )}

                  {/* Bot�n de opciones - solo para selecci�n individual o primer elemento de multi-selecci�n */}
                  {selectedCloneId === icon.id && !multiSelectMode && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        e.target.measure((x, y, width, height, pageX, pageY) => {
                          setOptionsMenu({
                            visible: true,
                            position: {
                              x: pageX + width,
                              y: pageY + 40 + (height / 2)
                            },
                            iconId: icon.id,
                            canRotate: !!icon.rotatable,
                            hideEdit: icon.type === 'goal'
                          });
                        });
                      }}
                      style={{
                        position: 'absolute',
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: '#ffffff',
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1.5,
                        elevation: 3,
                        borderWidth: 1,
                        borderColor: '#dddddd',
                        zIndex: 100,
                        top: -7,
                        right: -7
                      }}
                    >
                      <Feather name="more-vertical" size={16} color="#444444" />
                    </TouchableOpacity>
                  )}

                  <MemoizedIcon
                    icon={icon}
                    size={size}
                    rotation={icon.rotation || 0}
                    number={icon.type === 'player' ? icon.number : undefined}
                    playersWithNumber={playersWithNumber}
                    displayLabel={icon.displayLabel}
                    numberColor={icon.numberColor}
                    isGoalkeeper={icon.playerData?.posicion === 'portero' || icon.playerData?.posicion === 'goalkeeper'}
                    differentiateGoalkeeper={differentiateGoalkeeper}
                    goalkeeperStripeColor={icon.goalkeeperStripeColor || goalkeeperStripeColor}
                    showPhotos={showPhotos && icon.playerData}
                    photoUrl={cdnUrl(icon.playerData?.foto || '')}
                  />

                  {icon.playerData && (
                    <Text
                      style={{
                        position: 'absolute',
                        bottom: -22,
                        left: -20,
                        right: -20,
                        textAlign: 'center',
                        fontSize: isMobile ? 8 : 10,
                        color: icon.textColor || '#000',
                        backgroundColor: icon.textBackgroundColor === 'transparent' ? 'transparent' : (icon.textBackgroundColor || '#fff'),
                        paddingHorizontal: icon.textBackgroundColor === 'transparent' ? 0 : 2,
                        paddingVertical: icon.textBackgroundColor === 'transparent' ? 0 : 1,
                        borderRadius: 4,
                        borderWidth: icon.textBackgroundColor === 'transparent' ? 0 : 1,
                        borderColor: '#ccc',
                      }}
                    >
                      {icon.playerData.nombre || icon.playerData.name}
                    </Text>
                  )}
                </View>
              </View>
            </PanGestureHandler>
          </View>
        </TapGestureHandler>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  const icon = prevProps.icon;
  const nextIcon = nextProps.icon;

  // Quick identity check - if same reference, nothing changed
  if (prevProps === nextProps) return true;

  // Comparaci�n ultra-r�pida: solo verificar cambios relevantes
  if (prevProps.imageWidth !== nextProps.imageWidth ||
    prevProps.imageHeight !== nextProps.imageHeight ||
    prevProps.scale !== nextProps.scale) {
    return false;
  }

  // ID check first (most common bailout)
  if (icon.id !== nextIcon.id) return false;

  // Position changes - most frequent update
  if (icon.xRatio !== nextIcon.xRatio || icon.yRatio !== nextIcon.yRatio) return false;

  // Lock state
  if (icon.locked !== nextIcon.locked) return false;

  // Selection state - only re-render if selection changed FOR THIS element
  const wasSelected = prevProps.selectedCloneId === icon.id;
  const isSelected = nextProps.selectedCloneId === nextIcon.id;
  if (wasSelected !== isSelected) return false;

  // Multi-select state
  if (prevProps.multiSelectMode !== nextProps.multiSelectMode) return false;
  if (prevProps.selectionInteractionMode !== nextProps.selectionInteractionMode) return false;

  // Multi-select inclusion - use Set lookup for O(1) instead of includes O(n)
  const prevSet = prevProps.selectedCloneIdsSet;
  const nextSet = nextProps.selectedCloneIdsSet;
  const wasMultiSelected = prevSet ? prevSet.has(icon.id) : prevProps.selectedCloneIds.includes(icon.id);
  const isMultiSelected = nextSet ? nextSet.has(icon.id) : nextProps.selectedCloneIds.includes(icon.id);
  if (wasMultiSelected !== isMultiSelected) return false;

  // Drawing mode - check if drawing state affects this element
  const prevDrawing = prevProps.drawingStates;
  const nextDrawing = nextProps.drawingStates;
  const wasDrawingMode = prevDrawing?.drawingStraightArrow || prevDrawing?.drawingStraightLine ||
    prevDrawing?.drawingCurveArrow || prevDrawing?.drawingCurveLine ||
    prevDrawing?.drawingCircle || prevDrawing?.drawingRectangle ||
    prevDrawing?.drawingCustomShape || prevDrawing?.eraserMode;
  const isDrawingMode = nextDrawing?.drawingStraightArrow || nextDrawing?.drawingStraightLine ||
    nextDrawing?.drawingCurveArrow || nextDrawing?.drawingCurveLine ||
    nextDrawing?.drawingCircle || nextDrawing?.drawingRectangle ||
    nextDrawing?.drawingCustomShape || nextDrawing?.eraserMode;
  if (wasDrawingMode !== isDrawingMode) return false;

  // Visual props - SIEMPRE verificar para detectar cambios de "Aplicar a todos"
  if (icon.size !== nextIcon.size ||
    icon.color !== nextIcon.color ||
    icon.rotation !== nextIcon.rotation ||
    icon.number !== nextIcon.number ||
    icon.displayLabel !== nextIcon.displayLabel ||
    icon.numberColor !== nextIcon.numberColor ||
    icon.textColor !== nextIcon.textColor ||
    icon.textBackgroundColor !== nextIcon.textBackgroundColor ||
    icon._lastUpdate !== nextIcon._lastUpdate) return false;

  // Goalkeeper differentiation setting
  if (prevProps.differentiateGoalkeeper !== nextProps.differentiateGoalkeeper) return false;
  if (prevProps.goalkeeperStripeColor !== nextProps.goalkeeperStripeColor) return false;

  // Show photos setting
  if (prevProps.showPhotos !== nextProps.showPhotos) return false;

  // Players with number setting
  if (prevProps.playersWithNumber !== nextProps.playersWithNumber) return false;

  // Photo URL for player
  if (icon.playerData?.foto !== nextIcon.playerData?.foto) return false;

  // View mode changes affect display coordinates
  if (prevProps.viewMode !== nextProps.viewMode) return false;

  // Display coords (computed from ratioToDisplay)
  if (icon.x !== nextIcon.x || icon.y !== nextIcon.y) return false;

  return true;
});

function getProportionalIconSize(icon, imageWidth, standardSize = 24) {
  const baseSize = icon.size || standardSize;
  const REFERENCE_SCALE = 1.5;
  const viewportRatio = imageWidth / REFERENCE_WIDTH;
  const scaleFactor = Math.max(0.5, REFERENCE_SCALE * viewportRatio);
  return baseSize * scaleFactor;
}

const BOARD_OBJECT_HIT_TOLERANCE = 24;
const SHAPE_BORDER_HIT_TOLERANCE = 10;
const ALLOW_MULTI_ELEMENT_DRAG = true;

function distanceToBoardSegment(pointX, pointY, startX, startY, endX, endY) {
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;
  if (segmentLengthSq === 0) return Math.hypot(pointX - startX, pointY - startY);
  const projection = Math.max(0, Math.min(1, ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / segmentLengthSq));
  return Math.hypot(pointX - (startX + projection * segmentX), pointY - (startY + projection * segmentY));
}

function getResponderLocalPoint(event, offsetX = 0, offsetY = 0) {
  const nativeEvent = event?.nativeEvent || {};
  return {
    x: (nativeEvent.locationX || 0) + offsetX,
    y: (nativeEvent.locationY || 0) + offsetY,
  };
}

function isCircleBorderTouch(localX, localY, centerX, centerY, radius, tolerance) {
  if (!Number.isFinite(radius) || radius <= 0) return false;
  const usableTolerance = Math.min(tolerance, SHAPE_BORDER_HIT_TOLERANCE, Math.max(4, radius * 0.14));
  return Math.abs(Math.hypot(localX - centerX, localY - centerY) - radius) <= usableTolerance;
}

function isRectangleBorderTouch(localX, localY, rectX, rectY, rectWidth, rectHeight, tolerance) {
  if (rectWidth <= 0 || rectHeight <= 0) return false;
  const outerLeft = rectX - tolerance;
  const outerRight = rectX + rectWidth + tolerance;
  const outerTop = rectY - tolerance;
  const outerBottom = rectY + rectHeight + tolerance;
  if (localX < outerLeft || localX > outerRight || localY < outerTop || localY > outerBottom) return false;

  const insideX = localX >= rectX && localX <= rectX + rectWidth;
  const insideY = localY >= rectY && localY <= rectY + rectHeight;
  if (insideX && insideY) {
    const innerTolerance = Math.min(tolerance, SHAPE_BORDER_HIT_TOLERANCE, Math.max(4, Math.min(rectWidth, rectHeight) * 0.14));
    return Math.min(
      localX - rectX,
      rectX + rectWidth - localX,
      localY - rectY,
      rectY + rectHeight - localY,
    ) <= innerTolerance;
  }

  const dx = Math.max(rectX - localX, 0, localX - (rectX + rectWidth));
  const dy = Math.max(rectY - localY, 0, localY - (rectY + rectHeight));
  return Math.hypot(dx, dy) <= tolerance;
}

function isPolygonBorderTouch(localX, localY, points, tolerance, minX, minY, touchMargin, width, height) {
  const pointX = localX + minX - touchMargin;
  const pointY = localY + minY - touchMargin;
  const usableTolerance = Math.min(tolerance, SHAPE_BORDER_HIT_TOLERANCE, Math.max(4, Math.min(width, height) * 0.14));
  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (distanceToBoardSegment(pointX, pointY, current.x, current.y, next.x, next.y) <= usableTolerance) {
      return true;
    }
  }
  return false;
}

function isPointInsidePolygon(pointX, pointY, points) {
  let inside = false;
  for (let currentIndex = 0, previousIndex = points.length - 1; currentIndex < points.length; previousIndex = currentIndex++) {
    const currentPoint = points[currentIndex];
    const previousPoint = points[previousIndex];
    const crossesY = (currentPoint.y > pointY) !== (previousPoint.y > pointY);
    const intersectionX = ((previousPoint.x - currentPoint.x) * (pointY - currentPoint.y)) / ((previousPoint.y - currentPoint.y) || 1) + currentPoint.x;
    if (crossesY && pointX < intersectionX) inside = !inside;
  }
  return inside;
}

function getCloneDisplayPoints(clone, viewMode, imageWidth, imageHeight) {
  if (!Array.isArray(clone.points)) return [];
  return clone.points.map(point => ratioToDisplay(point.x, point.y, viewMode, imageWidth, imageHeight));
}

function getCloneHitTolerance(clone, imageWidth, imageHeight) {
  const originalWidth = clone.imageWidth || imageWidth;
  const originalHeight = clone.imageHeight || imageHeight;
  const renderScale = ((imageWidth / originalWidth) + (imageHeight / originalHeight)) / 2;
  const strokeWidth = (clone.thickness || 2) * renderScale * 0.7;
  return Math.max(strokeWidth / 2 + 16, BOARD_OBJECT_HIT_TOLERANCE);
}

function isPointNearPointList(pointX, pointY, points, tolerance, closed = false) {
  const lastSegmentIndex = closed ? points.length : points.length - 1;
  for (let pointIndex = 0; pointIndex < lastSegmentIndex; pointIndex++) {
    const currentPoint = points[pointIndex];
    const nextPoint = points[(pointIndex + 1) % points.length];
    if (distanceToBoardSegment(pointX, pointY, currentPoint.x, currentPoint.y, nextPoint.x, nextPoint.y) <= tolerance) {
      return true;
    }
  }
  return false;
}

function isPointOnBoardClone(clone, pointX, pointY, viewMode, imageWidth, imageHeight, standardSize = 24) {
  if (!clone || clone.type === 'custom-shape-button') return false;
  const tolerance = getCloneHitTolerance(clone, imageWidth, imageHeight);

  if ((clone.type === 'straight-line' || clone.type === 'straight-arrow' || clone.type === 'curve-line' || clone.type === 'curve-arrow') && clone.points?.length >= 2) {
    return isPointNearPointList(pointX, pointY, getCloneDisplayPoints(clone, viewMode, imageWidth, imageHeight), tolerance, false);
  }

  if (clone.type === 'circle' && clone.points?.length === 2) {
    const firstPoint = ratioToDisplay(clone.points[0].x, clone.points[0].y, viewMode, imageWidth, imageHeight);
    const secondPoint = ratioToDisplay(clone.points[1].x, clone.points[1].y, viewMode, imageWidth, imageHeight);
    const centerX = (firstPoint.x + secondPoint.x) / 2;
    const centerY = (firstPoint.y + secondPoint.y) / 2;
    const radius = Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y) / 2;
    return isCircleBorderTouch(pointX, pointY, centerX, centerY, radius, tolerance);
  }

  if (clone.type === 'rectangle' && clone.points?.length === 2) {
    const firstPoint = ratioToDisplay(clone.points[0].x, clone.points[0].y, viewMode, imageWidth, imageHeight);
    const secondPoint = ratioToDisplay(clone.points[1].x, clone.points[1].y, viewMode, imageWidth, imageHeight);
    const minX = Math.min(firstPoint.x, secondPoint.x);
    const minY = Math.min(firstPoint.y, secondPoint.y);
    const width = Math.abs(secondPoint.x - firstPoint.x);
    const height = Math.abs(secondPoint.y - firstPoint.y);
    return isRectangleBorderTouch(pointX, pointY, minX, minY, width, height, tolerance);
  }

  if (clone.type === 'custom-shape' && clone.points?.length >= 3) {
    const points = getCloneDisplayPoints(clone, viewMode, imageWidth, imageHeight);
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const width = Math.max(...xs) - minX;
    const height = Math.max(...ys) - minY;
    const usableTolerance = Math.min(tolerance, SHAPE_BORDER_HIT_TOLERANCE, Math.max(4, Math.min(width, height) * 0.14));
    return isPointNearPointList(pointX, pointY, points, usableTolerance, true);
  }

  if (clone.xRatio !== undefined && clone.yRatio !== undefined) {
    const center = ratioToDisplay(clone.xRatio, clone.yRatio, viewMode, imageWidth, imageHeight);
    if (clone.type === 'free-text') {
      const fontSize = clone.size || 18;
      const textWidth = Math.max(40, String(clone.value || '').length * fontSize * 0.6 + 8);
      const textHeight = Math.max(30, fontSize * 1.4 + 8);
      return pointX >= center.x - tolerance && pointX <= center.x + textWidth + tolerance
        && pointY >= center.y - tolerance && pointY <= center.y + textHeight + tolerance;
    }
    const iconSize = getProportionalIconSize(clone, imageWidth, standardSize);
    const hitRadius = Math.max(iconSize / 2 + tolerance, BOARD_OBJECT_HIT_TOLERANCE);
    return Math.abs(pointX - center.x) <= hitRadius && Math.abs(pointY - center.y) <= hitRadius;
  }

  return false;
}

function getCloneInteractionZIndex(clone, originalIndex, selectedCloneId) {
  if (clone.locked === true) return 1;
  return clone.zIndex || getZIndexBaseForType(clone.type) + originalIndex;
}

function findTopBoardCloneAtPoint(clones, pointX, pointY, viewMode, imageWidth, imageHeight, standardSize, selectedCloneId) {
  return clones
    .map((clone, originalIndex) => ({ clone, originalIndex, zIndex: getCloneInteractionZIndex(clone, originalIndex, selectedCloneId) }))
    .sort((first, second) => first.zIndex - second.zIndex || first.originalIndex - second.originalIndex)
    .reverse()
    .find(({ clone }) => !clone.locked && isPointOnBoardClone(clone, pointX, pointY, viewMode, imageWidth, imageHeight, standardSize))?.clone || null;
}

function createBoardDragSnapshot(clone) {
  if (!clone) return null;
  if (clone.points && Array.isArray(clone.points)) {
    return { points: clone.points.map(point => ({ x: point.x, y: point.y })) };
  }
  if (clone.xRatio !== undefined && clone.yRatio !== undefined) {
    return { xRatio: clone.xRatio, yRatio: clone.yRatio };
  }
  if (clone.x !== undefined && clone.y !== undefined) {
    return { x: clone.x, y: clone.y };
  }
  return null;
}

function applyBoardDragSnapshot(clone, snapshot, dxRatio, dyRatio, dxDisplay, dyDisplay) {
  if (!snapshot) return clone;
  if (snapshot.points) {
    return { ...clone, points: snapshot.points.map(point => ({ x: point.x + dxRatio, y: point.y + dyRatio })) };
  }
  if (snapshot.xRatio !== undefined && snapshot.yRatio !== undefined) {
    return { ...clone, xRatio: snapshot.xRatio + dxRatio, yRatio: snapshot.yRatio + dyRatio };
  }
  if (snapshot.x !== undefined && snapshot.y !== undefined) {
    return { ...clone, x: snapshot.x + dxDisplay, y: snapshot.y + dyDisplay };
  }
  return clone;
}

function buildBoardDragSnapshots(clones, selectedIds) {
  return selectedIds.reduce((snapshots, selectedId) => {
    const clone = clones.find(item => item.id === selectedId);
    const snapshot = createBoardDragSnapshot(clone);
    if (snapshot) snapshots[selectedId] = snapshot;
    return snapshots;
  }, {});
}

function isBoardCloneOutsideForDelete(clone, viewMode, imageWidth, imageHeight) {
  if (!clone) return false;
  if (clone.points && Array.isArray(clone.points) && clone.points.length >= 2) {
    return areAllPointsOutside(clone.points, viewMode, imageWidth, imageHeight);
  }
  if (clone.xRatio !== undefined && clone.yRatio !== undefined) {
    return isOutsideVisibleField(clone.xRatio, clone.yRatio, viewMode, imageWidth, imageHeight);
  }
  if (clone.x !== undefined && clone.y !== undefined) {
    return clone.x < 0 || clone.x > imageWidth || clone.y < 0 || clone.y > imageHeight;
  }
  return false;
}

function getArrowHeadForStraightLine(start, end, size = 24, ratio = 0.5, thickness = 2) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return { arrowPoints: "", lineEnd: end };

  // Calcular el �ngulo de la l�nea
  const angle = Math.atan2(dy, dx);
  // Tama�o de flecha proporcional al grosor de la l�nea (m�s fino = flecha m�s peque�a)
  const arrowSize = Math.max(6 * thickness, 8);

  // Calcular los puntos para la punta de flecha
  const x3 = end.x - arrowSize * Math.cos(angle - Math.PI / 6);
  const y3 = end.y - arrowSize * Math.sin(angle - Math.PI / 6);
  const x4 = end.x - arrowSize * Math.cos(angle + Math.PI / 6);
  const y4 = end.y - arrowSize * Math.sin(angle + Math.PI / 6);

  // Calcular el punto donde debe terminar la l�nea (base de la flecha)
  const lineEndX = end.x - arrowSize * 0.85 * Math.cos(angle);
  const lineEndY = end.y - arrowSize * 0.85 * Math.sin(angle);

  return {
    arrowPoints: `${end.x},${end.y} ${x3},${y3} ${x4},${y4}`,
    lineEnd: { x: lineEndX, y: lineEndY }
  };
}

// Funci�n para generar el path SVG para l�neas curvas
function generateCurvePath(points) {
  if (!points || points.length < 2) return '';

  // Comenzamos con un 'M' (move to) para el primer punto
  let path = `M${points[0].x},${points[0].y}`;

  // Para cada punto restante, a�adimos un comando 'L' (line to)
  for (let i = 1; i < points.length; i++) {
    path += ` L${points[i].x},${points[i].y}`;
  }

  return path;
}

// Funci�n auxiliar para calcular la distancia de un punto a un segmento de l�nea
function distanceToLineSegment(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// =====================================================
// COMPONENTES MEMOIZADOS PARA LÍNEAS - OPTIMIZACIÓN CRÍTICA
// =====================================================

// Componente memoizado para l�neas rectas - evita re-renders innecesarios
const MemoizedStraightLine = React.memo(({
  id,
  x1, y1, x2, y2,
  color,
  thickness,
  lineType,
  dotSize,
  dotSpacing,
  isArrow,
  arrowPoints,
  lineEndX,
  lineEndY,
  isMultiSelected
}) => {
  const actualEndX = isArrow ? lineEndX : x2;
  const actualEndY = isArrow ? lineEndY : y2;
  const pathD = `M${x1},${y1} L${actualEndX},${actualEndY}`;
  const strokeColor = isMultiSelected ? '#3498db' : color;
  const strokeDasharray = lineType === 'dotted' ? `${dotSize || 2}, ${dotSpacing || 4}` : null;

  return (
    <G>
      {/* Highlight para multi-selecci�n */}
      {isMultiSelected && (
        <Path
          d={pathD}
          stroke="#3498db"
          strokeWidth={thickness + 6}
          strokeOpacity={0.25}
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* L�nea principal (con o sin punteado) */}
      <Path
        key={`line-${id}-${lineType || 'solid'}-${dotSize || 2}-${dotSpacing || 4}`}
        d={pathD}
        stroke={strokeColor}
        strokeWidth={thickness}
        strokeDasharray={strokeDasharray}
        fill="none"
        strokeLinecap="round"
      />

      {/* Punta de flecha */}
      {isArrow && arrowPoints && (
        <Polygon
          points={arrowPoints}
          fill={color}
          strokeLinejoin="round"
        />
      )}
    </G>
  );
}, (prevProps, nextProps) => {
  // Comparaci�n profunda para evitar re-renders innecesarios
  return (
    prevProps.id === nextProps.id &&
    prevProps.x1 === nextProps.x1 &&
    prevProps.y1 === nextProps.y1 &&
    prevProps.x2 === nextProps.x2 &&
    prevProps.y2 === nextProps.y2 &&
    prevProps.color === nextProps.color &&
    prevProps.thickness === nextProps.thickness &&
    prevProps.lineType === nextProps.lineType &&
    prevProps.dotSize === nextProps.dotSize &&
    prevProps.dotSpacing === nextProps.dotSpacing &&
    prevProps.isArrow === nextProps.isArrow &&
    prevProps.isMultiSelected === nextProps.isMultiSelected &&
    prevProps.arrowPoints === nextProps.arrowPoints &&
    prevProps.lineEndX === nextProps.lineEndX &&
    prevProps.lineEndY === nextProps.lineEndY
  );
});

// Componente memoizado para l�neas curvas - evita re-renders innecesarios
const MemoizedCurveLine = React.memo(({
  id,
  pathData,
  color,
  thickness,
  lineType,
  dotSize,
  dotSpacing,
  isArrow,
  arrowPoints,
  isMultiSelected
}) => {
  const strokeColor = isMultiSelected ? '#3498db' : color;
  const strokeDasharray = lineType === 'dotted' ? `${dotSize || 2}, ${dotSpacing || 4}` : null;

  return (
    <G>
      {/* Highlight para multi-selecci�n */}
      {isMultiSelected && (
        <Path
          d={pathData}
          stroke="#3498db"
          strokeWidth={thickness + 6}
          strokeOpacity={0.25}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* L�nea principal (con o sin punteado) */}
      <Path
        key={`curve-${id}-${lineType || 'solid'}-${dotSize || 2}-${dotSpacing || 4}`}
        d={pathData}
        stroke={strokeColor}
        strokeWidth={thickness}
        strokeDasharray={strokeDasharray}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Punta de flecha */}
      {isArrow && arrowPoints && (
        <Polygon
          points={arrowPoints}
          fill={color}
          strokeLinejoin="round"
        />
      )}
    </G>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.pathData === nextProps.pathData &&
    prevProps.color === nextProps.color &&
    prevProps.thickness === nextProps.thickness &&
    prevProps.lineType === nextProps.lineType &&
    prevProps.dotSize === nextProps.dotSize &&
    prevProps.dotSpacing === nextProps.dotSpacing &&
    prevProps.isArrow === nextProps.isArrow &&
    prevProps.isMultiSelected === nextProps.isMultiSelected &&
    prevProps.arrowPoints === nextProps.arrowPoints
  );
});

// Componente batch para renderizar muchas l�neas en un solo SVG Group
const BatchLinesRenderer = React.memo(({
  straightLines,
  curveLines,
  imageWidth,
  imageHeight,
  selectedCloneIdsSet,
  multiSelectMode,
  viewMode
}) => {
  // Helper: convert ratio point to display coords
  const tp = useCallback((xR, yR) => {
    if (!viewMode || viewMode === 'entire') return { x: xR * imageWidth, y: yR * imageHeight };
    return ratioToDisplay(xR, yR, viewMode, imageWidth, imageHeight);
  }, [viewMode, imageWidth, imageHeight]);

  // Pre-calcular todos los datos de l�neas rectas
  const straightLineData = useMemo(() => {
    return straightLines.map(icon => {
      if (!icon.points || icon.points.length !== 2) return null;

      const originalWidth = icon.imageWidth || imageWidth;
      const originalHeight = icon.imageHeight || imageHeight;
      const widthRatio = imageWidth / originalWidth;
      const heightRatio = imageHeight / originalHeight;
      const scale = (widthRatio + heightRatio) / 2;

      const p1 = tp(icon.points[0].x, icon.points[0].y);
      const p2 = tp(icon.points[1].x, icon.points[1].y);
      const x1 = p1.x;
      const y1 = p1.y;
      const x2 = p2.x;
      const y2 = p2.y;

      const thickness = (icon.thickness || 1) * scale * 0.7;
      const isMultiSelected = multiSelectMode && selectedCloneIdsSet?.has(icon.id);
      const isArrow = icon.type === 'straight-arrow';

      let arrowPoints = '';
      let lineEndX = x2;
      let lineEndY = y2;

      if (isArrow) {
        const arrowData = getArrowHeadForStraightLine(
          { x: x1, y: y1 },
          { x: x2, y: y2 },
          icon.size || 24,
          0.5,
          thickness
        );
        arrowPoints = arrowData.arrowPoints;
        lineEndX = arrowData.lineEnd.x;
        lineEndY = arrowData.lineEnd.y;
      }

      return {
        id: icon.id,
        x1, y1, x2, y2,
        color: icon.color,
        thickness,
        lineType: icon.lineType,
        dotSize: icon.dotSize,
        dotSpacing: icon.dotSpacing,
        isArrow,
        arrowPoints,
        lineEndX,
        lineEndY,
        isMultiSelected
      };
    }).filter(Boolean);
  }, [straightLines, imageWidth, imageHeight, selectedCloneIdsSet, multiSelectMode, tp]);

  // Pre-calcular todos los datos de l�neas curvas
  const curveLineData = useMemo(() => {
    return curveLines.map(icon => {
      if (!icon.points || icon.points.length < 2) return null;

      const originalWidth = icon.imageWidth || imageWidth;
      const originalHeight = icon.imageHeight || imageHeight;
      const widthRatio = imageWidth / originalWidth;
      const heightRatio = imageHeight / originalHeight;
      const scale = (widthRatio + heightRatio) / 2;

      const pts = icon.points.map(p => tp(p.x, p.y));

      const pathData = generateCurvePath(pts);
      const thickness = (icon.thickness || 1) * scale * 0.7;
      const isMultiSelected = multiSelectMode && selectedCloneIdsSet?.has(icon.id);
      const isArrow = icon.type === 'curve-arrow';

      let arrowPoints = '';
      if (isArrow && pts.length >= 2) {
        const lastIdx = pts.length - 1;
        let secondLastIdx = lastIdx - 1;

        while (secondLastIdx >= 0 && lastIdx > 0) {
          const dist = Math.sqrt(
            Math.pow(pts[lastIdx].x - pts[secondLastIdx].x, 2) +
            Math.pow(pts[lastIdx].y - pts[secondLastIdx].y, 2)
          );
          if (dist > 5) break;
          secondLastIdx--;
        }
        if (secondLastIdx < 0) secondLastIdx = 0;

        const lastPoint = pts[lastIdx];
        const secondLastPoint = pts[secondLastIdx];

        const dx = lastPoint.x - secondLastPoint.x;
        const dy = lastPoint.y - secondLastPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0) {
          const angle = Math.atan2(dy, dx);
          const arrowSize = Math.max(6 * thickness, 8);
          const x3 = lastPoint.x - arrowSize * Math.cos(angle - Math.PI / 6);
          const y3 = lastPoint.y - arrowSize * Math.sin(angle - Math.PI / 6);
          const x4 = lastPoint.x - arrowSize * Math.cos(angle + Math.PI / 6);
          const y4 = lastPoint.y - arrowSize * Math.sin(angle + Math.PI / 6);
          arrowPoints = `${lastPoint.x},${lastPoint.y} ${x3},${y3} ${x4},${y4}`;
        }
      }

      return {
        id: icon.id,
        pathData,
        color: icon.color,
        thickness,
        lineType: icon.lineType,
        dotSize: icon.dotSize,
        dotSpacing: icon.dotSpacing,
        isArrow,
        arrowPoints,
        isMultiSelected
      };
    }).filter(Boolean);
  }, [curveLines, imageWidth, imageHeight, selectedCloneIdsSet, multiSelectMode, tp]);

  return (
    <G>
      {/* Renderizar l�neas rectas */}
      {straightLineData.map(data => (
        <MemoizedStraightLine key={`sl-${data.id}`} {...data} />
      ))}

      {/* Renderizar l�neas curvas */}
      {curveLineData.map(data => (
        <MemoizedCurveLine key={`cl-${data.id}`} {...data} />
      ))}
    </G>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si realmente cambiaron las l�neas
  if (prevProps.straightLines.length !== nextProps.straightLines.length) return false;
  if (prevProps.curveLines.length !== nextProps.curveLines.length) return false;
  if (prevProps.imageWidth !== nextProps.imageWidth) return false;
  if (prevProps.imageHeight !== nextProps.imageHeight) return false;
  if (prevProps.multiSelectMode !== nextProps.multiSelectMode) return false;

  // Comparar referencias de l�neas
  for (let i = 0; i < prevProps.straightLines.length; i++) {
    const prev = prevProps.straightLines[i];
    const next = nextProps.straightLines[i];
    if (prev.id !== next.id ||
      prev.color !== next.color ||
      prev.thickness !== next.thickness ||
      prev.lineType !== next.lineType ||
      prev.dotSize !== next.dotSize ||
      prev.dotSpacing !== next.dotSpacing ||
      !arraysEqual(prev.points, next.points)) {
      return false;
    }
  }

  for (let i = 0; i < prevProps.curveLines.length; i++) {
    const prev = prevProps.curveLines[i];
    const next = nextProps.curveLines[i];
    if (prev.id !== next.id ||
      prev.color !== next.color ||
      prev.thickness !== next.thickness ||
      prev.lineType !== next.lineType ||
      prev.dotSize !== next.dotSize ||
      prev.dotSpacing !== next.dotSpacing ||
      !arraysEqual(prev.points, next.points)) {
      return false;
    }
  }

  return true;
});

// Helper para comparar arrays de puntos
function arraysEqual(a, b) {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false;
  }
  return true;
}

// =====================================================
// COMPONENTE MEMOIZADO PARA DETECTORES DE LÍNEAS RECTAS
// =====================================================
const MemoizedStraightLineDetector = React.memo(({
  icon,
  imageWidth,
  imageHeight,
  viewMode,
  selectedCloneId,
  setSelectedCloneId,
  setClones,
  dragStart,
  clones,
  selectedCloneIds,
  selectedCloneIdsSet,
  multiSelectMode,
  selectionInteractionMode,
  setOptionsMenu,
  isAnyDrawingMode,
  originalIdx,
  saveClonesHistory,
  zoomLevel = 1
}) => {
  if (!icon.points || icon.points.length !== 2) return null;
  if (isAnyDrawingMode) return null;
  const rafRef = useRef(null);
  const pendingUpdateRef = useRef(null);

  const originalWidth = icon.imageWidth || imageWidth;
  const originalHeight = icon.imageHeight || imageHeight;
  const widthRatio = imageWidth / originalWidth;
  const heightRatio = imageHeight / originalHeight;
  const scale = (widthRatio + heightRatio) / 2;

  const { x: x1, y: y1 } = ratioToDisplay(icon.points[0].x, icon.points[0].y, viewMode, imageWidth, imageHeight);
  const { x: x2, y: y2 } = ratioToDisplay(icon.points[1].x, icon.points[1].y, viewMode, imageWidth, imageHeight);

  const lineThickness = (icon.thickness || 2) * scale;
  const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);

  const isSelected = selectedCloneIdsSet?.has(icon.id);
  const canDrag = !icon.locked && !isAnyDrawingMode && (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));

  const touchTolerance = Math.max(lineThickness / 2 + 12, 18);
  const touchMargin = 22;
  const touchWidth = maxX - minX + touchMargin * 2;
  const touchHeight = maxY - minY + touchMargin * 2;
  const detectorZIndex = icon.calculatedZIndex || (ZINDEX_BASE_LINES + originalIdx);

  // Dimensiones del bot�n de opciones (3 puntos)
  const optionsButtonSize = 28;
  const optionsButtonLeft = centerX - minX + touchMargin - 14;
  const optionsButtonTop = centerY - minY + touchMargin - 14;

  // Funci�n para verificar si el toque est� en el �rea del bot�n de opciones
  const isTouchOnOptionsButton = (touchX, touchY) => {
    if (selectedCloneId !== icon.id || multiSelectMode) return false;
    const buttonCenterX = optionsButtonLeft + optionsButtonSize / 2;
    const buttonCenterY = optionsButtonTop + optionsButtonSize / 2;
    const dx = touchX - buttonCenterX;
    const dy = touchY - buttonCenterY;
    const distFromButton = Math.sqrt(dx * dx + dy * dy);
    return distFromButton <= optionsButtonSize / 2 + 5; // 5px de margen extra
  };

  const handleResponderGrant = (e) => {
    if (selectedCloneId && selectedCloneId !== icon.id) {
      setSelectedCloneId(null);
    }
    if (!canDrag) {
      if (!multiSelectMode) setSelectedCloneId(icon.id);
      return;
    }

    if (!acquireBoardDrag(dragStart, icon.id)) return;

    if (ALLOW_MULTI_ELEMENT_DRAG && multiSelectMode && selectionInteractionMode === 'move' && isSelected) {
      const initialPositions = {};
      selectedCloneIds.forEach(id => {
        const c = clones.find(cl => cl.id === id);
        if (!c) return;
        if (c.points && Array.isArray(c.points)) {
          initialPositions[id] = c.points.map(p => ({ x: p.x, y: p.y }));
        } else {
          initialPositions[id] = { xRatio: c.xRatio, yRatio: c.yRatio };
        }
      });
      dragStart.current[icon.id] = { multiSelect: true, selectedIds: [...selectedCloneIds], initialPositions, isValid: true, startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY };
    } else {
      dragStart.current[icon.id] = { points: icon.points.map(p => ({ x: p.x, y: p.y })), isValid: true, startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY };
    }
  };

  const handleResponderMove = (e) => {
    if (!canDrag || !dragStart.current[icon.id]?.isValid || !isBoardDragOwner(dragStart, icon.id)) return;
    const base = dragStart.current[icon.id];
    const { dxRatio: dx, dyRatio: dy } = deltaToRatio((e.nativeEvent.pageX - base.startX) / zoomLevel, (e.nativeEvent.pageY - base.startY) / zoomLevel, viewMode, imageWidth, imageHeight);

    if (base.multiSelect && base.selectedIds && base.initialPositions) {
      pendingUpdateRef.current = (prev) => prev.map(c => {
        if (!base.selectedIds.includes(c.id)) return c;
        const init = base.initialPositions[c.id];
        if (!init) return c;
        if (Array.isArray(init)) {
          return { ...c, points: init.map(pt => ({ x: pt.x + dx, y: pt.y + dy })) };
        }
        return { ...c, xRatio: (init.xRatio || 0) + dx, yRatio: (init.yRatio || 0) + dy };
      });
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingUpdateRef.current) {
            setClones(pendingUpdateRef.current);
            pendingUpdateRef.current = null;
          }
          rafRef.current = null;
        });
      }
      return;
    }

    pendingUpdateRef.current = (prev) => {
      const correctIndex = prev.findIndex(c => c.id === icon.id);
      if (correctIndex === -1) return prev;
      const next = [...prev];
      next[correctIndex] = { ...next[correctIndex], points: base.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy })) };
      return next;
    };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          setClones(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        rafRef.current = null;
      });
    }
  };

  const handleResponderRelease = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pendingUpdateRef.current) {
      setClones(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    const base = dragStart.current[icon.id];
    if (base?.multiSelect && base.selectedIds) {
      // Multi-drag: eliminar TODOS los seleccionados que est�n fuera del campo
      setClones((prev) => {
        const remaining = prev.filter(c => {
          if (!base.selectedIds.includes(c.id) || c.locked) return true;
          if (c.points && Array.isArray(c.points) && c.points.length >= 2) {
            return !areAllPointsOutside(c.points, viewMode, imageWidth, imageHeight);
          }
          if (c.xRatio !== undefined) {
            return !isOutsideVisibleField(c.xRatio, c.yRatio, viewMode, imageWidth, imageHeight);
          }
          return true;
        });
        return remaining.length < prev.length ? remaining : prev;
      });
    } else {
      // Single drag: solo eliminar este elemento
      setClones((prev) => {
        const currentClone = prev.find(c => c.id === icon.id);
        if (currentClone && !currentClone.locked && currentClone.points) {
          if (areAllPointsOutside(currentClone.points, viewMode, imageWidth, imageHeight)) {
            return prev.filter(c => c.id !== icon.id);
          }
        }
        return prev;
      });
    }
    delete dragStart.current[icon.id];
    releaseBoardDrag(dragStart, icon.id);
    if (!multiSelectMode) setSelectedCloneId(icon.id);
    if (saveClonesHistory) saveClonesHistory();
  };

  const responderProps = {
    onStartShouldSetResponderCapture: (e) => {
      return !isTouchOnOptionsButton(e.nativeEvent.pageX - (minX - touchMargin), e.nativeEvent.pageY - (minY - touchMargin));
    },
    onStartShouldSetResponder: (e) => {
      return !isTouchOnOptionsButton(e.nativeEvent.pageX - (minX - touchMargin), e.nativeEvent.pageY - (minY - touchMargin));
    },
    onMoveShouldSetResponder: () => canDrag,
    onResponderGrant: handleResponderGrant,
    onResponderMove: handleResponderMove,
    onResponderRelease: handleResponderRelease,
    onResponderTerminate: handleResponderRelease,
  };

  const generateTouchSegments = () => {
    const segments = [];
    const segmentSize = Math.max(8, touchTolerance);
    const numSegments = Math.max(2, Math.ceil(distance / segmentSize) + 1);

    for (let pointIndex = 0; pointIndex < numSegments; pointIndex++) {
      const t = numSegments === 1 ? 0.5 : pointIndex / (numSegments - 1);
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;

      segments.push(
        <View
          key={`straight-seg-${pointIndex}`}
          pointerEvents="auto"
          style={{
            position: 'absolute',
            left: x - minX + touchMargin - touchTolerance,
            top: y - minY + touchMargin - touchTolerance,
            width: touchTolerance * 2,
            height: touchTolerance * 2,
            backgroundColor: 'transparent',
            borderRadius: touchTolerance,
          }}
          {...responderProps}
        />
      );
    }

    return segments;
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: minX - touchMargin,
        top: minY - touchMargin,
        width: touchWidth,
        height: touchHeight,
        backgroundColor: 'transparent',
        zIndex: detectorZIndex,
      }}
    >
      {generateTouchSegments()}

      {/* Indicador visual para selecci�n m�ltiple en l�neas rectas */}
      {multiSelectMode && isSelected && (
        <View pointerEvents="none" style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#3498db',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10001,
          borderWidth: 2,
          borderColor: '#fff',
        }}>
          <Feather name="check" size={10} color="#fff" />
        </View>
      )}

      {selectedCloneId === icon.id && !multiSelectMode && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            setOptionsMenu({ visible: true, position: { x: centerX + 20, y: centerY }, iconId: icon.id, canRotate: true, hideEdit: false });
          }}
          style={{
            position: 'absolute',
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5,
            elevation: 10, borderWidth: 1, borderColor: '#dddddd', zIndex: 10000,
            left: optionsButtonLeft, top: optionsButtonTop,
          }}
        >
          <Feather name="more-vertical" size={16} color="#444444" />
        </TouchableOpacity>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian props relevantes
  return (
    prevProps.icon.id === nextProps.icon.id &&
    prevProps.icon.locked === nextProps.icon.locked &&
    prevProps.icon.thickness === nextProps.icon.thickness &&
    arraysEqual(prevProps.icon.points, nextProps.icon.points) &&
    prevProps.selectedCloneId === nextProps.selectedCloneId &&
    prevProps.multiSelectMode === nextProps.multiSelectMode &&
    prevProps.selectionInteractionMode === nextProps.selectionInteractionMode &&
    prevProps.isAnyDrawingMode === nextProps.isAnyDrawingMode &&
    prevProps.imageWidth === nextProps.imageWidth &&
    prevProps.imageHeight === nextProps.imageHeight &&
    prevProps.viewMode === nextProps.viewMode &&
    (prevProps.selectedCloneIdsSet?.has(prevProps.icon.id) === nextProps.selectedCloneIdsSet?.has(nextProps.icon.id))
  );
});

// =====================================================
// COMPONENTE MEMOIZADO PARA DETECTORES DE LÍNEAS CURVAS
// =====================================================
const MemoizedCurveLineDetector = React.memo(({
  icon,
  imageWidth,
  imageHeight,
  viewMode,
  selectedCloneId,
  setSelectedCloneId,
  setClones,
  dragStart,
  clones,
  selectedCloneIds,
  selectedCloneIdsSet,
  multiSelectMode,
  selectionInteractionMode,
  setOptionsMenu,
  isAnyDrawingMode,
  originalIdx,
  saveClonesHistory,
  zoomLevel = 1
}) => {
  if (!icon.points || icon.points.length < 2) return null;
  if (isAnyDrawingMode) return null;

  const rafRef = useRef(null);
  const pendingUpdateRef = useRef(null);

  const originalWidth = icon.imageWidth || imageWidth;
  const originalHeight = icon.imageHeight || imageHeight;
  const widthRatio = imageWidth / originalWidth;
  const heightRatio = imageHeight / originalHeight;
  const scale = (widthRatio + heightRatio) / 2;

  const pts = icon.points.map(p => ratioToDisplay(p.x, p.y, viewMode, imageWidth, imageHeight));
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const isSelected = selectedCloneIdsSet?.has(icon.id);
  const canDrag = !icon.locked && !isAnyDrawingMode && (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));

  const lineThickness = (icon.thickness || 2) * scale;
  const touchTolerance = Math.max(lineThickness / 2 + 12, 18);
  const touchMargin = 22;
  const touchWidth = maxX - minX + touchMargin * 2;
  const touchHeight = maxY - minY + touchMargin * 2;
  const detectorZIndex = icon.calculatedZIndex || (ZINDEX_BASE_LINES + originalIdx);

  // Dimensiones del bot�n de opciones (3 puntos)
  const optionsButtonSize = 28;
  const optionsButtonLeft = touchWidth / 2 - 14;
  const optionsButtonTop = touchHeight / 2 - 14;

  // Funci�n para verificar si el toque est� en el �rea del bot�n de opciones
  const isTouchOnOptionsButton = (touchX, touchY) => {
    if (selectedCloneId !== icon.id || multiSelectMode) return false;
    const buttonCenterX = optionsButtonLeft + optionsButtonSize / 2;
    const buttonCenterY = optionsButtonTop + optionsButtonSize / 2;
    const dx = touchX - buttonCenterX;
    const dy = touchY - buttonCenterY;
    const distFromButton = Math.sqrt(dx * dx + dy * dy);
    return distFromButton <= optionsButtonSize / 2 + 5; // 5px de margen extra
  };

  // Handlers para arrastre
  const handleResponderGrant = (e) => {
    if (selectedCloneId && selectedCloneId !== icon.id) {
      setSelectedCloneId(null);
    }
    if (!canDrag) {
      if (!multiSelectMode) setSelectedCloneId(icon.id);
      return;
    }
    if (!acquireBoardDrag(dragStart, icon.id)) return;

    if (ALLOW_MULTI_ELEMENT_DRAG && multiSelectMode && selectionInteractionMode === 'move' && isSelected) {
      const initialPositions = {};
      selectedCloneIds.forEach(id => {
        const c = clones.find(cl => cl.id === id);
        if (!c) return;
        if (c.points && Array.isArray(c.points)) {
          initialPositions[id] = c.points.map(p => ({ x: p.x, y: p.y }));
        } else {
          initialPositions[id] = { xRatio: c.xRatio, yRatio: c.yRatio };
        }
      });
      dragStart.current[icon.id] = { multiSelect: true, selectedIds: [...selectedCloneIds], initialPositions, isValid: true, startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY };
    } else {
      dragStart.current[icon.id] = { points: icon.points.map(p => ({ x: p.x, y: p.y })), isValid: true, startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY };
    }
  };

  const handleResponderMove = (e) => {
    if (!canDrag || !dragStart.current[icon.id]?.isValid || !isBoardDragOwner(dragStart, icon.id)) return;
    const base = dragStart.current[icon.id];
    const { dxRatio: dx, dyRatio: dy } = deltaToRatio((e.nativeEvent.pageX - base.startX) / zoomLevel, (e.nativeEvent.pageY - base.startY) / zoomLevel, viewMode, imageWidth, imageHeight);

    if (base.multiSelect && base.selectedIds && base.initialPositions) {
      pendingUpdateRef.current = (prev) => prev.map(c => {
        if (!base.selectedIds.includes(c.id)) return c;
        const init = base.initialPositions[c.id];
        if (!init) return c;
        if (Array.isArray(init)) {
          return { ...c, points: init.map(pt => ({ x: pt.x + dx, y: pt.y + dy })) };
        }
        return { ...c, xRatio: (init.xRatio || 0) + dx, yRatio: (init.yRatio || 0) + dy };
      });
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingUpdateRef.current) {
            setClones(pendingUpdateRef.current);
            pendingUpdateRef.current = null;
          }
          rafRef.current = null;
        });
      }
      return;
    }
    pendingUpdateRef.current = (prev) => {
      const correctIndex = prev.findIndex(c => c.id === icon.id);
      if (correctIndex === -1) return prev;
      const next = [...prev];
      next[correctIndex] = { ...next[correctIndex], points: base.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy })) };
      return next;
    };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          setClones(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        rafRef.current = null;
      });
    }
  };

  const handleResponderRelease = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pendingUpdateRef.current) {
      setClones(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    const base = dragStart.current[icon.id];
    if (base?.multiSelect && base.selectedIds) {
      // Multi-drag: eliminar TODOS los seleccionados que est�n fuera del campo
      setClones((prev) => {
        const remaining = prev.filter(c => {
          if (!base.selectedIds.includes(c.id) || c.locked) return true;
          if (c.points && Array.isArray(c.points) && c.points.length >= 2) {
            return !areAllPointsOutside(c.points, viewMode, imageWidth, imageHeight);
          }
          if (c.xRatio !== undefined) {
            return !isOutsideVisibleField(c.xRatio, c.yRatio, viewMode, imageWidth, imageHeight);
          }
          return true;
        });
        return remaining.length < prev.length ? remaining : prev;
      });
    } else {
      // Single drag: solo eliminar esta l�nea
      setClones((prev) => {
        const currentClone = prev.find(c => c.id === icon.id);
        if (currentClone && !currentClone.locked && currentClone.points) {
          if (areAllPointsOutside(currentClone.points, viewMode, imageWidth, imageHeight)) {
            return prev.filter(c => c.id !== icon.id);
          }
        }
        return prev;
      });
    }
    delete dragStart.current[icon.id];
    releaseBoardDrag(dragStart, icon.id);
    if (!multiSelectMode) setSelectedCloneId(icon.id);
    // Guardar en historial al finalizar el drag
    if (saveClonesHistory) saveClonesHistory();
  };

  // Props comunes de responder
  const responderProps = {
    onStartShouldSetResponderCapture: (e) => {
      // No capturar si el toque est� en el bot�n de opciones
      return !isTouchOnOptionsButton(e.nativeEvent.pageX - (minX - touchMargin), e.nativeEvent.pageY - (minY - touchMargin));
    },
    onStartShouldSetResponder: (e) => {
      // No capturar si el toque est� en el bot�n de opciones
      return !isTouchOnOptionsButton(e.nativeEvent.pageX - (minX - touchMargin), e.nativeEvent.pageY - (minY - touchMargin));
    },
    onMoveShouldSetResponder: () => canDrag,
    onResponderGrant: handleResponderGrant,
    onResponderMove: handleResponderMove,
    onResponderRelease: handleResponderRelease,
    onResponderTerminate: handleResponderRelease,
  };

  // Generar segmentos de toque a lo largo de la curva
  // Cada segmento es un peque�o View posicionado sobre el trazado
  const generateTouchSegments = () => {
    const segments = [];
    const segmentSize = touchTolerance * 2;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Crear un segmento por cada trozo del path
      const numSegments = Math.max(1, Math.ceil(length / segmentSize));

      for (let j = 0; j < numSegments; j++) {
        const t = numSegments === 1 ? 0.5 : j / (numSegments - 1 || 1);
        const x = p1.x + dx * t;
        const y = p1.y + dy * t;

        segments.push(
          <View
            key={`seg-${i}-${j}`}
            pointerEvents="auto"
            style={{
              position: 'absolute',
              left: x - minX + touchMargin - touchTolerance,
              top: y - minY + touchMargin - touchTolerance,
              width: touchTolerance * 2,
              height: touchTolerance * 2,
              backgroundColor: 'transparent',
              borderRadius: touchTolerance,
            }}
            {...responderProps}
          />
        );
      }
    }

    return segments;
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: minX - touchMargin,
        top: minY - touchMargin,
        width: touchWidth,
        height: touchHeight,
        backgroundColor: 'transparent',
        zIndex: detectorZIndex,
      }}
    >
      {/* Segmentos de toque a lo largo de la curva */}
      {generateTouchSegments()}

      {/* Indicador visual para selecci�n m�ltiple */}
      {multiSelectMode && isSelected && (
        <View pointerEvents="none" style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#3498db',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10001,
          borderWidth: 2,
          borderColor: '#fff'
        }}>
          <Feather name="check" size={10} color="#fff" />
        </View>
      )}

      {/* Bot�n de men� cuando est� seleccionado */}
      {selectedCloneId === icon.id && !multiSelectMode && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            setOptionsMenu({ visible: true, position: { x: centerX + 20, y: centerY }, iconId: icon.id, canRotate: true, hideEdit: false });
          }}
          style={{
            position: 'absolute',
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5,
            elevation: 10, borderWidth: 1, borderColor: '#dddddd', zIndex: 10000,
            left: touchWidth / 2 - 14, top: touchHeight / 2 - 14,
          }}
        >
          <Feather name="more-vertical" size={16} color="#444444" />
        </TouchableOpacity>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.icon.id === nextProps.icon.id &&
    prevProps.icon.locked === nextProps.icon.locked &&
    prevProps.icon.thickness === nextProps.icon.thickness &&
    arraysEqual(prevProps.icon.points, nextProps.icon.points) &&
    prevProps.selectedCloneId === nextProps.selectedCloneId &&
    prevProps.multiSelectMode === nextProps.multiSelectMode &&
    prevProps.selectionInteractionMode === nextProps.selectionInteractionMode &&
    prevProps.isAnyDrawingMode === nextProps.isAnyDrawingMode &&
    prevProps.imageWidth === nextProps.imageWidth &&
    prevProps.imageHeight === nextProps.imageHeight &&
    prevProps.viewMode === nextProps.viewMode &&
    (prevProps.selectedCloneIdsSet?.has(prevProps.icon.id) === nextProps.selectedCloneIdsSet?.has(nextProps.icon.id))
  );
});

// =====================================================
// COMPONENTES SVG MEMOIZADOS PARA CÍRCULOS Y RECTÁNGULOS
// =====================================================

// C�rculo SVG memoizado - solo renderiza el SVG
const MemoizedCircleSvg = React.memo(({
  id, centerX, centerY, radius, color, thickness, fillColor, lineType, dotSize, dotSpacing, isMultiSelected
}) => {
  const dashArray = lineType === 'dotted' ? `${dotSize || 2},${dotSpacing || 4}` : null;
  return (
    <Circle
      key={`circle-${id}-${lineType || 'solid'}-${dotSize || 2}-${dotSpacing || 4}`}
      cx={centerX}
      cy={centerY}
      r={radius}
      stroke={isMultiSelected ? '#3498db' : color}
      strokeWidth={thickness}
      fill={fillColor && fillColor !== 'transparent' ? `${fillColor}99` : "transparent"}
      strokeDasharray={dashArray}
    />
  );
}, (prev, next) => (
  prev.id === next.id &&
  prev.centerX === next.centerX &&
  prev.centerY === next.centerY &&
  prev.radius === next.radius &&
  prev.color === next.color &&
  prev.thickness === next.thickness &&
  prev.fillColor === next.fillColor &&
  prev.lineType === next.lineType &&
  prev.dotSize === next.dotSize &&
  prev.dotSpacing === next.dotSpacing &&
  prev.isMultiSelected === next.isMultiSelected
));

// Rect�ngulo SVG memoizado - solo renderiza el SVG
const MemoizedRectangleSvg = React.memo(({
  id, x, y, width, height, color, thickness, fillColor, lineType, dotSize, dotSpacing, isMultiSelected
}) => {
  const dashArray = lineType === 'dotted' ? `${dotSize || 2},${dotSpacing || 4}` : null;
  return (
    <Rect
      key={`rect-${id}-${lineType || 'solid'}-${dotSize || 2}-${dotSpacing || 4}`}
      x={x}
      y={y}
      width={width}
      height={height}
      stroke={isMultiSelected ? '#3498db' : color}
      strokeWidth={thickness}
      fill={fillColor && fillColor !== 'transparent' ? `${fillColor}99` : "transparent"}
      strokeDasharray={dashArray}
    />
  );
}, (prev, next) => (
  prev.id === next.id &&
  prev.x === next.x &&
  prev.y === next.y &&
  prev.width === next.width &&
  prev.height === next.height &&
  prev.color === next.color &&
  prev.thickness === next.thickness &&
  prev.fillColor === next.fillColor &&
  prev.lineType === next.lineType &&
  prev.dotSize === next.dotSize &&
  prev.dotSpacing === next.dotSpacing &&
  prev.isMultiSelected === next.isMultiSelected
));

// Custom Shape SVG memoizado
const MemoizedCustomShapeSvg = React.memo(({
  id, pathData, color, thickness, fillColor, lineType, dotSize, dotSpacing, isMultiSelected
}) => {
  const dashArray = lineType === 'dotted' ? `${dotSize || 2},${dotSpacing || 4}` : null;
  return (
    <Path
      key={`cs-${id}-${lineType || 'solid'}-${dotSize || 2}-${dotSpacing || 4}`}
      d={pathData}
      stroke={isMultiSelected ? '#3498db' : color}
      strokeWidth={thickness}
      fill={fillColor && fillColor !== 'transparent' ? `${fillColor}99` : "transparent"}
      strokeDasharray={dashArray}
      strokeLinejoin="round"
    />
  );
}, (prev, next) => (
  prev.id === next.id &&
  prev.pathData === next.pathData &&
  prev.color === next.color &&
  prev.thickness === next.thickness &&
  prev.fillColor === next.fillColor &&
  prev.lineType === next.lineType &&
  prev.dotSize === next.dotSize &&
  prev.dotSpacing === next.dotSpacing &&
  prev.isMultiSelected === next.isMultiSelected
));

// Batch renderer para todas las figuras geom�tricas
const BatchShapesRenderer = React.memo(({
  circles,
  rectangles,
  customShapes,
  imageWidth,
  imageHeight,
  selectedCloneIdsSet,
  multiSelectMode,
  viewMode
}) => {
  // Helper: convert ratio point to display coords
  const tp = useCallback((xR, yR) => {
    if (!viewMode || viewMode === 'entire') return { x: xR * imageWidth, y: yR * imageHeight };
    return ratioToDisplay(xR, yR, viewMode, imageWidth, imageHeight);
  }, [viewMode, imageWidth, imageHeight]);

  // Pre-calcular datos de c�rculos
  const circleData = useMemo(() => {
    return circles.map(icon => {
      if (!icon.points || icon.points.length !== 2) return null;

      const originalWidth = icon.imageWidth || imageWidth;
      const originalHeight = icon.imageHeight || imageHeight;
      const scale = ((imageWidth / originalWidth) + (imageHeight / originalHeight)) / 2;

      const p1 = tp(icon.points[0].x, icon.points[0].y);
      const p2 = tp(icon.points[1].x, icon.points[1].y);
      const p1x = p1.x;
      const p1y = p1.y;
      const p2x = p2.x;
      const p2y = p2.y;

      const centerX = (p1x + p2x) / 2;
      const centerY = (p1y + p2y) / 2;
      const dx = p2x - p1x;
      const dy = p2y - p1y;
      const radius = Math.sqrt(dx * dx + dy * dy) / 2;
      const thickness = (icon.thickness || 1) * scale * 0.7;

      return {
        id: icon.id,
        shapeType: 'circle',
        zIndex: icon.zIndex || 0,
        centerX, centerY, radius,
        color: icon.color || "#2980b9",
        thickness,
        fillColor: icon.fillColor,
        lineType: icon.lineType,
        dotSize: icon.dotSize,
        dotSpacing: icon.dotSpacing,
        isMultiSelected: multiSelectMode && selectedCloneIdsSet?.has(icon.id)
      };
    }).filter(Boolean);
  }, [circles, imageWidth, imageHeight, selectedCloneIdsSet, multiSelectMode, tp]);

  // Pre-calcular datos de rect�ngulos
  const rectangleData = useMemo(() => {
    return rectangles.map(icon => {
      if (!icon.points || icon.points.length !== 2) return null;

      const originalWidth = icon.imageWidth || imageWidth;
      const originalHeight = icon.imageHeight || imageHeight;
      const scale = ((imageWidth / originalWidth) + (imageHeight / originalHeight)) / 2;

      const p1 = tp(icon.points[0].x, icon.points[0].y);
      const p2 = tp(icon.points[1].x, icon.points[1].y);
      const p1x = p1.x;
      const p1y = p1.y;
      const p2x = p2.x;
      const p2y = p2.y;

      const x = Math.min(p1x, p2x);
      const y = Math.min(p1y, p2y);
      const width = Math.abs(p2x - p1x);
      const height = Math.abs(p2y - p1y);
      const thickness = (icon.thickness || 1) * scale * 0.7;

      return {
        id: icon.id,
        shapeType: 'rectangle',
        zIndex: icon.zIndex || 0,
        x, y, width, height,
        color: icon.color || "#2980b9",
        thickness,
        fillColor: icon.fillColor,
        lineType: icon.lineType,
        dotSize: icon.dotSize,
        dotSpacing: icon.dotSpacing,
        isMultiSelected: multiSelectMode && selectedCloneIdsSet?.has(icon.id)
      };
    }).filter(Boolean);
  }, [rectangles, imageWidth, imageHeight, selectedCloneIdsSet, multiSelectMode, tp]);

  // Pre-calcular datos de custom shapes
  const customShapeData = useMemo(() => {
    return customShapes.map(icon => {
      if (!icon.points || icon.points.length < 3 || !icon.isCustomShapeComplete) return null;

      const originalWidth = icon.imageWidth || imageWidth;
      const originalHeight = icon.imageHeight || imageHeight;
      const scale = ((imageWidth / originalWidth) + (imageHeight / originalHeight)) / 2;

      const pts = icon.points.map(p => tp(p.x, p.y));
      const pathData = `M${pts.map(p => `${p.x},${p.y}`).join(' L')} Z`;
      const thickness = (icon.thickness || 1) * scale * 0.7;

      return {
        id: icon.id,
        shapeType: 'custom-shape',
        zIndex: icon.zIndex || 0,
        pathData,
        color: icon.color || "#2980b9",
        thickness,
        fillColor: icon.fillColor,
        lineType: icon.lineType,
        dotSize: icon.dotSize,
        dotSpacing: icon.dotSpacing,
        isMultiSelected: multiSelectMode && selectedCloneIdsSet?.has(icon.id)
      };
    }).filter(Boolean);
  }, [customShapes, imageWidth, imageHeight, selectedCloneIdsSet, multiSelectMode, tp]);

  // Combinar todas las figuras y ordenar por zIndex para renderizado correcto
  const allShapes = useMemo(() => {
    const shapes = [...circleData, ...rectangleData, ...customShapeData];
    shapes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    return shapes;
  }, [circleData, rectangleData, customShapeData]);

  return (
    <G>
      {allShapes.map(data => {
        if (data.shapeType === 'circle') return <MemoizedCircleSvg key={`c-${data.id}`} {...data} />;
        if (data.shapeType === 'rectangle') return <MemoizedRectangleSvg key={`r-${data.id}`} {...data} />;
        return <MemoizedCustomShapeSvg key={`cs-${data.id}`} {...data} />;
      })}
    </G>
  );
}, (prevProps, nextProps) => {
  if (prevProps.circles.length !== nextProps.circles.length) return false;
  if (prevProps.rectangles.length !== nextProps.rectangles.length) return false;
  if (prevProps.customShapes.length !== nextProps.customShapes.length) return false;
  if (prevProps.imageWidth !== nextProps.imageWidth) return false;
  if (prevProps.imageHeight !== nextProps.imageHeight) return false;
  if (prevProps.multiSelectMode !== nextProps.multiSelectMode) return false;

  // Comparar c�rculos
  for (let i = 0; i < prevProps.circles.length; i++) {
    const prev = prevProps.circles[i];
    const next = nextProps.circles[i];
    if (prev.id !== next.id || prev.color !== next.color || prev.thickness !== next.thickness ||
      prev.fillColor !== next.fillColor || prev.lineType !== next.lineType ||
      prev.dotSize !== next.dotSize || prev.dotSpacing !== next.dotSpacing ||
      prev.zIndex !== next.zIndex ||
      !arraysEqual(prev.points, next.points)) return false;
  }

  // Comparar rect�ngulos
  for (let i = 0; i < prevProps.rectangles.length; i++) {
    const prev = prevProps.rectangles[i];
    const next = nextProps.rectangles[i];
    if (prev.id !== next.id || prev.color !== next.color || prev.thickness !== next.thickness ||
      prev.fillColor !== next.fillColor || prev.lineType !== next.lineType ||
      prev.dotSize !== next.dotSize || prev.dotSpacing !== next.dotSpacing ||
      prev.zIndex !== next.zIndex ||
      !arraysEqual(prev.points, next.points)) return false;
  }

  // Comparar custom shapes
  for (let i = 0; i < prevProps.customShapes.length; i++) {
    const prev = prevProps.customShapes[i];
    const next = nextProps.customShapes[i];
    if (prev.id !== next.id || prev.color !== next.color || prev.thickness !== next.thickness ||
      prev.fillColor !== next.fillColor || prev.lineType !== next.lineType ||
      prev.dotSize !== next.dotSize || prev.dotSpacing !== next.dotSpacing ||
      prev.zIndex !== next.zIndex ||
      !arraysEqual(prev.points, next.points)) return false;
  }

  return true;
});

// =====================================================
// DETECTORES MEMOIZADOS PARA FIGURAS GEOMÉTRICAS
// =====================================================

// Detector memoizado para c�rculos
const MemoizedCircleDetector = React.memo(({
  icon, imageWidth, imageHeight, viewMode, selectedCloneId, setSelectedCloneId, setClones, dragStart,
  clones, selectedCloneIds, selectedCloneIdsSet, multiSelectMode, selectionInteractionMode,
  setOptionsMenu, isAnyDrawingMode, renderScale, saveClonesHistory, zoomLevel = 1
}) => {
  if (!icon.points || icon.points.length !== 2) return null;
  if (isAnyDrawingMode) return null;
  const rafRef = useRef(null);
  const pendingUpdateRef = useRef(null);

  const originalWidth = icon.imageWidth || imageWidth;
  const originalHeight = icon.imageHeight || imageHeight;
  const scale = ((imageWidth / originalWidth) + (imageHeight / originalHeight)) / 2;

  const { x: p1x, y: p1y } = ratioToDisplay(icon.points[0].x, icon.points[0].y, viewMode, imageWidth, imageHeight);
  const { x: p2x, y: p2y } = ratioToDisplay(icon.points[1].x, icon.points[1].y, viewMode, imageWidth, imageHeight);

  const centerX = (p1x + p2x) / 2;
  const centerY = (p1y + p2y) / 2;
  const dx = p2x - p1x;
  const dy = p2y - p1y;
  const radius = Math.sqrt(dx * dx + dy * dy) / 2;
  const thickness = (icon.thickness || 1) * scale * 0.7;

  const touchTolerance = Math.max(thickness / 2 + 12, 18);
  const touchMargin = 22;

  const isSelected = selectedCloneIdsSet?.has(icon.id);
  const canDrag = !icon.locked && !isAnyDrawingMode && (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));
  const detectorZIndex = icon.calculatedZIndex || ZINDEX_BASE_LINES;

  // Bounding box del c�rculo
  const minX = centerX - radius;
  const minY = centerY - radius;
  const touchWidth = radius * 2 + touchMargin * 2;
  const touchHeight = radius * 2 + touchMargin * 2;

  // Handlers para arrastre
  const handleResponderGrant = (e) => {
    if (selectedCloneId && selectedCloneId !== icon.id) {
      setSelectedCloneId(null);
    }
    if (!canDrag) {
      if (!multiSelectMode) setSelectedCloneId(icon.id);
      return;
    }
    if (!acquireBoardDrag(dragStart, icon.id)) return;

    if (ALLOW_MULTI_ELEMENT_DRAG && multiSelectMode && selectionInteractionMode === 'move' && isSelected) {
      const initialPositions = {};
      selectedCloneIds.forEach(id => {
        const c = clones.find(cl => cl.id === id);
        if (!c) return;
        if (c.points && Array.isArray(c.points)) {
          initialPositions[id] = { points: c.points.map(p => ({ x: p.x, y: p.y })) };
        } else {
          initialPositions[id] = { xRatio: c.xRatio, yRatio: c.yRatio };
        }
      });
      dragStart.current[icon.id] = { multiSelect: true, selectedIds: [...selectedCloneIds], initialPositions, isValid: true, startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY };
    } else {
      dragStart.current[icon.id] = { points: icon.points.map(p => ({ x: p.x, y: p.y })), isValid: true, startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY };
    }
  };

  const handleResponderMove = (e) => {
    if (!canDrag || !dragStart.current[icon.id]?.isValid || !isBoardDragOwner(dragStart, icon.id)) return;
    const base = dragStart.current[icon.id];
    const { dxRatio: ddx, dyRatio: ddy } = deltaToRatio((e.nativeEvent.pageX - base.startX) / zoomLevel, (e.nativeEvent.pageY - base.startY) / zoomLevel, viewMode, imageWidth, imageHeight);

    if (base.multiSelect && base.selectedIds && base.initialPositions) {
      pendingUpdateRef.current = prev => prev.map(c => {
        if (!base.selectedIds.includes(c.id)) return c;
        const init = base.initialPositions[c.id];
        if (!init) return c;
        if (init.points && Array.isArray(init.points)) {
          return { ...c, points: init.points.map(pt => ({ x: pt.x + ddx, y: pt.y + ddy })) };
        }
        return { ...c, xRatio: (init.xRatio || 0) + ddx, yRatio: (init.yRatio || 0) + ddy };
      });
    } else {
      pendingUpdateRef.current = prev => {
        const idx = prev.findIndex(c => c.id === icon.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], points: base.points.map(pt => ({ x: pt.x + ddx, y: pt.y + ddy })) };
        return next;
      };
    }
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          setClones(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        rafRef.current = null;
      });
    }
  };

  const handleResponderRelease = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (pendingUpdateRef.current) {
      setClones(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    const base = dragStart.current[icon.id];
    if (base?.multiSelect && base.selectedIds) {
      setClones((prev) => {
        const remaining = prev.filter(c => {
          if (!base.selectedIds.includes(c.id) || c.locked) return true;
          if (c.points && Array.isArray(c.points) && c.points.length >= 2) {
            return !areAllPointsOutside(c.points, viewMode, imageWidth, imageHeight);
          }
          if (c.xRatio !== undefined) {
            return !isOutsideVisibleField(c.xRatio, c.yRatio, viewMode, imageWidth, imageHeight);
          }
          return true;
        });
        return remaining.length < prev.length ? remaining : prev;
      });
    } else {
      setClones((prev) => {
        const currentClone = prev.find(c => c.id === icon.id);
        if (currentClone && !currentClone.locked && currentClone.points) {
          if (areAllPointsOutside(currentClone.points, viewMode, imageWidth, imageHeight)) {
            return prev.filter(c => c.id !== icon.id);
          }
        }
        return prev;
      });
    }
    delete dragStart.current[icon.id];
    releaseBoardDrag(dragStart, icon.id);
    if (!multiSelectMode) setSelectedCloneId(icon.id);
    if (saveClonesHistory) saveClonesHistory();
  };

  // Resize handlers for circle diameter
  const handleCircleResizeGrant = (handle, e) => {
    const cxR = (icon.points[0].x + icon.points[1].x) / 2;
    const cyR = (icon.points[0].y + icon.points[1].y) / 2;
    dragStart.current[`${icon.id}-resize`] = {
      handle,
      startX: e.nativeEvent.pageX,
      startY: e.nativeEvent.pageY,
      origPoints: icon.points.map(p => ({ x: p.x, y: p.y })),
      cxR, cyR
    };
  };

  const handleCircleResizeMove = (e) => {
    const base = dragStart.current[`${icon.id}-resize`];
    if (!base) return;

    const { dxRatio, dyRatio } = deltaToRatio(
      (e.nativeEvent.pageX - base.startX) / zoomLevel,
      (e.nativeEvent.pageY - base.startY) / zoomLevel,
      viewMode, imageWidth, imageHeight
    );

    const halfDxR = (base.origPoints[1].x - base.origPoints[0].x) / 2;
    const halfDyR = (base.origPoints[1].y - base.origPoints[0].y) / 2;
    const halfDxPx = halfDxR * imageWidth;
    const halfDyPx = halfDyR * imageHeight;
    const origRadiusPx = Math.sqrt(halfDxPx * halfDxPx + halfDyPx * halfDyPx);

    if (origRadiusPx < 1) return;

    let radiusChangePx = 0;
    const dragDxPx = dxRatio * imageWidth;
    const dragDyPx = dyRatio * imageHeight;

    switch (base.handle) {
      case 'right': radiusChangePx = dragDxPx; break;
      case 'left': radiusChangePx = -dragDxPx; break;
      case 'top': radiusChangePx = -dragDyPx; break;
      case 'bottom': radiusChangePx = dragDyPx; break;
    }

    const newRadiusPx = Math.max(10, origRadiusPx + radiusChangePx);
    const scaleFactor = newRadiusPx / origRadiusPx;

    const newHalfDxR = halfDxR * scaleFactor;
    const newHalfDyR = halfDyR * scaleFactor;

    const newP0x = Math.max(0, Math.min(1, base.cxR - newHalfDxR));
    const newP0y = Math.max(0, Math.min(1, base.cyR - newHalfDyR));
    const newP1x = Math.max(0, Math.min(1, base.cxR + newHalfDxR));
    const newP1y = Math.max(0, Math.min(1, base.cyR + newHalfDyR));

    pendingUpdateRef.current = prev => {
      const idx = prev.findIndex(c => c.id === icon.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], points: [{ x: newP0x, y: newP0y }, { x: newP1x, y: newP1y }] };
      return next;
    };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          setClones(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        rafRef.current = null;
      });
    }
  };

  const handleCircleResizeRelease = () => {
    delete dragStart.current[`${icon.id}-resize`];
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (pendingUpdateRef.current) {
      setClones(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    if (saveClonesHistory) saveClonesHistory();
  };

  const isBorderResponderHit = (e, offsetX = 0, offsetY = 0) => {
    const point = getResponderLocalPoint(e, offsetX, offsetY);
    return isCircleBorderTouch(point.x, point.y, touchMargin + radius, touchMargin + radius, radius, touchTolerance);
  };

  // Props comunes de responder
  const responderProps = {
    onStartShouldSetResponder: (e) => isBorderResponderHit(e),
    onMoveShouldSetResponder: (e) => canDrag && isBorderResponderHit(e),
    onResponderGrant: handleResponderGrant,
    onResponderMove: handleResponderMove,
    onResponderRelease: handleResponderRelease,
    onResponderTerminate: handleResponderRelease,
  };

  // Generar segmentos de toque a lo largo del per�metro del c�rculo
  const generateTouchSegments = () => {
    const segments = [];
    const segmentSize = touchTolerance * 2;

    // Calcular cu�ntos segmentos necesitamos para cubrir todo el per�metro
    const perimeter = 2 * Math.PI * radius;
    const numSegments = Math.max(12, Math.ceil(perimeter / segmentSize));

    for (let i = 0; i < numSegments; i++) {
      const angle = (i / numSegments) * 2 * Math.PI;
      // Posici�n en el per�metro del c�rculo
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const segmentLeft = x - minX + touchMargin - touchTolerance;
      const segmentTop = y - minY + touchMargin - touchTolerance;

      segments.push(
        <View
          key={`seg-${i}`}
          pointerEvents="auto"
          style={{
            position: 'absolute',
            left: segmentLeft,
            top: segmentTop,
            width: touchTolerance * 2,
            height: touchTolerance * 2,
            backgroundColor: 'transparent',
            borderRadius: touchTolerance,
          }}
          {...{
            ...responderProps,
            onStartShouldSetResponder: (e) => isBorderResponderHit(e, segmentLeft, segmentTop),
            onMoveShouldSetResponder: (e) => canDrag && isBorderResponderHit(e, segmentLeft, segmentTop),
          }}
        />
      );
    }

    return segments;
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: minX - touchMargin,
        top: minY - touchMargin,
        width: touchWidth,
        height: touchHeight,
        backgroundColor: 'transparent',
        zIndex: detectorZIndex,
      }}
    >
      {/* Segmentos de toque a lo largo del per�metro del c�rculo */}
      {generateTouchSegments()}

      {/* Resize handles en los puntos cardinales del c�rculo */}
      {selectedCloneId === icon.id && !multiSelectMode && (
        <>
          {[
            { handle: 'top', cx: touchMargin + radius, cy: touchMargin },
            { handle: 'right', cx: touchMargin + radius * 2, cy: touchMargin + radius },
            { handle: 'bottom', cx: touchMargin + radius, cy: touchMargin + radius * 2 },
            { handle: 'left', cx: touchMargin, cy: touchMargin + radius },
          ].map(({ handle, cx, cy }) => (
            <View
              key={`resize-${handle}`}
              pointerEvents="auto"
              style={{
                position: 'absolute',
                left: cx - 14,
                top: cy - 14,
                width: 28,
                height: 28,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10001,
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => handleCircleResizeGrant(handle, e)}
              onResponderMove={handleCircleResizeMove}
              onResponderRelease={handleCircleResizeRelease}
              onResponderTerminate={handleCircleResizeRelease}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', borderWidth: 2, borderColor: '#3498db' }} />
            </View>
          ))}
        </>
      )}

      {/* Indicador visual para selecci�n m�ltiple en c�rculos */}
      {multiSelectMode && isSelected && (
        <View pointerEvents="none" style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#3498db',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10001,
          borderWidth: 2,
          borderColor: '#fff'
        }}>
          <Feather name="check" size={10} color="#fff" />
        </View>
      )}

      {selectedCloneId === icon.id && !multiSelectMode && (
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); setOptionsMenu({ visible: true, position: { x: centerX + radius + 20, y: centerY }, iconId: icon.id, canRotate: false, hideEdit: false }); }}
          style={{ position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 10, borderWidth: 1, borderColor: '#ddd', zIndex: 10000, right: -14, top: touchHeight / 2 - 14 }}>
          <Feather name="more-vertical" size={16} color="#444" />
        </TouchableOpacity>
      )}
    </View>
  );
}, (prev, next) => (
  prev.icon.id === next.icon.id &&
  prev.icon.locked === next.icon.locked &&
  prev.icon.thickness === next.icon.thickness &&
  arraysEqual(prev.icon.points, next.icon.points) &&
  prev.selectedCloneId === next.selectedCloneId &&
  prev.multiSelectMode === next.multiSelectMode &&
  prev.selectionInteractionMode === next.selectionInteractionMode &&
  prev.isAnyDrawingMode === next.isAnyDrawingMode &&
  prev.imageWidth === next.imageWidth &&
  prev.imageHeight === next.imageHeight &&
  prev.viewMode === next.viewMode &&
  (prev.selectedCloneIdsSet?.has(prev.icon.id) === next.selectedCloneIdsSet?.has(next.icon.id))
));

// Detector memoizado para rect�ngulos - Solo detecta toques en los BORDES
const MemoizedRectangleDetector = React.memo(({
  icon, imageWidth, imageHeight, viewMode, selectedCloneId, setSelectedCloneId, setClones, dragStart,
  clones, selectedCloneIds, selectedCloneIdsSet, multiSelectMode, selectionInteractionMode,
  setOptionsMenu, isAnyDrawingMode, renderScale, saveClonesHistory, zoomLevel = 1
}) => {
  if (!icon.points || icon.points.length !== 2) return null;
  if (isAnyDrawingMode) return null;
  const rafRef = useRef(null);
  const pendingUpdateRef = useRef(null);

  const originalWidth = icon.imageWidth || imageWidth;
  const originalHeight = icon.imageHeight || imageHeight;
  const scale = ((imageWidth / originalWidth) + (imageHeight / originalHeight)) / 2;

  const { x: p1x, y: p1y } = ratioToDisplay(icon.points[0].x, icon.points[0].y, viewMode, imageWidth, imageHeight);
  const { x: p2x, y: p2y } = ratioToDisplay(icon.points[1].x, icon.points[1].y, viewMode, imageWidth, imageHeight);

  const minX = Math.min(p1x, p2x);
  const minY = Math.min(p1y, p2y);
  const width = Math.abs(p2x - p1x);
  const height = Math.abs(p2y - p1y);
  const thickness = (icon.thickness || 1) * scale * 0.7;
  const touchTolerance = Math.max(thickness / 2 + 12, 18);
  const centerY = minY + height / 2;

  const isSelected = selectedCloneIdsSet?.has(icon.id);
  const canDrag = !icon.locked && !isAnyDrawingMode && (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));
  const detectorZIndex = icon.calculatedZIndex || ZINDEX_BASE_LINES;

  const handleResponderGrant = (e) => {
    if (selectedCloneId && selectedCloneId !== icon.id) {
      setSelectedCloneId(null);
    }
    if (!canDrag) {
      if (!multiSelectMode) setSelectedCloneId(icon.id);
      return;
    }
    if (!acquireBoardDrag(dragStart, icon.id)) return;

    if (ALLOW_MULTI_ELEMENT_DRAG && multiSelectMode && selectionInteractionMode === 'move' && isSelected) {
      const initialPositions = {};
      selectedCloneIds.forEach(id => {
        const c = clones.find(cl => cl.id === id);
        if (!c) return;
        if (c.points && Array.isArray(c.points)) {
          initialPositions[id] = { points: c.points.map(p => ({ x: p.x, y: p.y })) };
        } else {
          initialPositions[id] = { xRatio: c.xRatio, yRatio: c.yRatio };
        }
      });
      dragStart.current[icon.id] = { multiSelect: true, selectedIds: [...selectedCloneIds], initialPositions, isValid: true, startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY };
    } else {
      dragStart.current[icon.id] = { points: icon.points.map(p => ({ x: p.x, y: p.y })), isValid: true, startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY };
    }
  };

  const handleResponderMove = (e) => {
    if (!canDrag || !dragStart.current[icon.id]?.isValid || !isBoardDragOwner(dragStart, icon.id)) return;
    const base = dragStart.current[icon.id];
    const { dxRatio: ddx, dyRatio: ddy } = deltaToRatio((e.nativeEvent.pageX - base.startX) / zoomLevel, (e.nativeEvent.pageY - base.startY) / zoomLevel, viewMode, imageWidth, imageHeight);

    if (base.multiSelect && base.selectedIds && base.initialPositions) {
      pendingUpdateRef.current = prev => prev.map(c => {
        if (!base.selectedIds.includes(c.id)) return c;
        const init = base.initialPositions[c.id];
        if (!init) return c;
        if (init.points && Array.isArray(init.points)) {
          return { ...c, points: init.points.map(pt => ({ x: pt.x + ddx, y: pt.y + ddy })) };
        }
        return { ...c, xRatio: (init.xRatio || 0) + ddx, yRatio: (init.yRatio || 0) + ddy };
      });
    } else {
      pendingUpdateRef.current = prev => {
        const idx = prev.findIndex(c => c.id === icon.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], points: base.points.map(pt => ({ x: pt.x + ddx, y: pt.y + ddy })) };
        return next;
      };
    }
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          setClones(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        rafRef.current = null;
      });
    }
  };

  const handleResponderRelease = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (pendingUpdateRef.current) {
      setClones(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    const base = dragStart.current[icon.id];
    if (base?.multiSelect && base.selectedIds) {
      setClones((prev) => {
        const remaining = prev.filter(c => {
          if (!base.selectedIds.includes(c.id) || c.locked) return true;
          if (c.points && Array.isArray(c.points) && c.points.length >= 2) {
            return !areAllPointsOutside(c.points, viewMode, imageWidth, imageHeight);
          }
          if (c.xRatio !== undefined) {
            return !isOutsideVisibleField(c.xRatio, c.yRatio, viewMode, imageWidth, imageHeight);
          }
          return true;
        });
        return remaining.length < prev.length ? remaining : prev;
      });
    } else {
      setClones((prev) => {
        const currentClone = prev.find(c => c.id === icon.id);
        if (currentClone && !currentClone.locked && currentClone.points) {
          if (areAllPointsOutside(currentClone.points, viewMode, imageWidth, imageHeight)) {
            return prev.filter(c => c.id !== icon.id);
          }
        }
        return prev;
      });
    }
    delete dragStart.current[icon.id];
    releaseBoardDrag(dragStart, icon.id);
    if (!multiSelectMode) setSelectedCloneId(icon.id);
    if (saveClonesHistory) saveClonesHistory();
  };

  // Resize handlers for corner drag
  const handleResizeGrant = (corner, e) => {
    dragStart.current[`${icon.id}-resize`] = {
      corner,
      startX: e.nativeEvent.pageX,
      startY: e.nativeEvent.pageY,
      origPoints: icon.points.map(p => ({ x: p.x, y: p.y }))
    };
  };

  const handleResizeMove = (e) => {
    const base = dragStart.current[`${icon.id}-resize`];
    if (!base) return;

    const { dxRatio, dyRatio } = deltaToRatio(
      (e.nativeEvent.pageX - base.startX) / zoomLevel,
      (e.nativeEvent.pageY - base.startY) / zoomLevel,
      viewMode, imageWidth, imageHeight
    );

    const origMinX = Math.min(base.origPoints[0].x, base.origPoints[1].x);
    const origMinY = Math.min(base.origPoints[0].y, base.origPoints[1].y);
    const origMaxX = Math.max(base.origPoints[0].x, base.origPoints[1].x);
    const origMaxY = Math.max(base.origPoints[0].y, base.origPoints[1].y);

    let nMinX = origMinX, nMinY = origMinY, nMaxX = origMaxX, nMaxY = origMaxY;
    const minDim = 0.03;

    switch (base.corner) {
      case 'tl': nMinX += dxRatio; nMinY += dyRatio; break;
      case 'tr': nMaxX += dxRatio; nMinY += dyRatio; break;
      case 'bl': nMinX += dxRatio; nMaxY += dyRatio; break;
      case 'br': nMaxX += dxRatio; nMaxY += dyRatio; break;
    }

    if (nMaxX - nMinX < minDim) {
      if (base.corner === 'tl' || base.corner === 'bl') nMinX = nMaxX - minDim;
      else nMaxX = nMinX + minDim;
    }
    if (nMaxY - nMinY < minDim) {
      if (base.corner === 'tl' || base.corner === 'tr') nMinY = nMaxY - minDim;
      else nMaxY = nMinY + minDim;
    }

    nMinX = Math.max(0, Math.min(1, nMinX));
    nMinY = Math.max(0, Math.min(1, nMinY));
    nMaxX = Math.max(0, Math.min(1, nMaxX));
    nMaxY = Math.max(0, Math.min(1, nMaxY));

    pendingUpdateRef.current = prev => {
      const idx = prev.findIndex(c => c.id === icon.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], points: [{ x: nMinX, y: nMinY }, { x: nMaxX, y: nMaxY }] };
      return next;
    };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          setClones(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        rafRef.current = null;
      });
    }
  };

  const handleResizeRelease = () => {
    delete dragStart.current[`${icon.id}-resize`];
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (pendingUpdateRef.current) {
      setClones(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    if (saveClonesHistory) saveClonesHistory();
  };

  // Estilo base para las bandas de borde
  const edgeBandStyle = {
    position: 'absolute',
    backgroundColor: 'transparent',
  };

  const makeEdgeResponderProps = (offsetX = 0, offsetY = 0) => ({
    onStartShouldSetResponder: (e) => {
      const point = getResponderLocalPoint(e, offsetX, offsetY);
      return isRectangleBorderTouch(point.x, point.y, touchTolerance, touchTolerance, width, height, touchTolerance);
    },
    onMoveShouldSetResponder: (e) => {
      const point = getResponderLocalPoint(e, offsetX, offsetY);
      return canDrag && isRectangleBorderTouch(point.x, point.y, touchTolerance, touchTolerance, width, height, touchTolerance);
    },
    onResponderGrant: handleResponderGrant,
    onResponderMove: handleResponderMove,
    onResponderRelease: handleResponderRelease,
    onResponderTerminate: handleResponderRelease,
  });

  // Props comunes de responder para las bandas
  const topEdgeResponderProps = makeEdgeResponderProps(0, 0);
  const bottomEdgeResponderProps = makeEdgeResponderProps(0, height);
  const leftEdgeResponderProps = makeEdgeResponderProps(0, touchTolerance * 2);
  const rightEdgeResponderProps = makeEdgeResponderProps(width, touchTolerance * 2);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: minX - touchTolerance,
        top: minY - touchTolerance,
        width: width + touchTolerance * 2,
        height: height + touchTolerance * 2,
        backgroundColor: 'transparent',
        zIndex: detectorZIndex,
      }}
    >
      {/* Banda superior */}
      <View
        pointerEvents="auto"
        style={[edgeBandStyle, {
          left: 0,
          top: 0,
          width: width + touchTolerance * 2,
          height: touchTolerance * 2,
        }]}
        {...topEdgeResponderProps}
      />

      {/* Banda inferior */}
      <View
        pointerEvents="auto"
        style={[edgeBandStyle, {
          left: 0,
          bottom: 0,
          width: width + touchTolerance * 2,
          height: touchTolerance * 2,
        }]}
        {...bottomEdgeResponderProps}
      />

      {/* Banda izquierda (solo la parte central, para no superponer con superior/inferior) */}
      <View
        pointerEvents="auto"
        style={[edgeBandStyle, {
          left: 0,
          top: touchTolerance * 2,
          width: touchTolerance * 2,
          height: height - touchTolerance * 2,
        }]}
        {...leftEdgeResponderProps}
      />

      {/* Banda derecha (solo la parte central) */}
      <View
        pointerEvents="auto"
        style={[edgeBandStyle, {
          right: 0,
          top: touchTolerance * 2,
          width: touchTolerance * 2,
          height: height - touchTolerance * 2,
        }]}
        {...rightEdgeResponderProps}
      />

      {/* Resize handles en las esquinas del rect�ngulo */}
      {selectedCloneId === icon.id && !multiSelectMode && (
        <>
          {[
            { corner: 'tl', cx: touchTolerance, cy: touchTolerance },
            { corner: 'tr', cx: touchTolerance + width, cy: touchTolerance },
            { corner: 'bl', cx: touchTolerance, cy: touchTolerance + height },
            { corner: 'br', cx: touchTolerance + width, cy: touchTolerance + height },
          ].map(({ corner, cx, cy }) => (
            <View
              key={`resize-${corner}`}
              pointerEvents="auto"
              style={{
                position: 'absolute',
                left: cx - 14,
                top: cy - 14,
                width: 28,
                height: 28,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10001,
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => handleResizeGrant(corner, e)}
              onResponderMove={handleResizeMove}
              onResponderRelease={handleResizeRelease}
              onResponderTerminate={handleResizeRelease}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', borderWidth: 2, borderColor: '#3498db' }} />
            </View>
          ))}
        </>
      )}

      {/* Indicador visual para selecci�n m�ltiple en rect�ngulos */}
      {multiSelectMode && isSelected && (
        <View pointerEvents="none" style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#3498db',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10001,
          borderWidth: 2,
          borderColor: '#fff'
        }}>
          <Feather name="check" size={10} color="#fff" />
        </View>
      )}

      {/* Bot�n de men� - solo visible cuando est� seleccionado */}
      {selectedCloneId === icon.id && !multiSelectMode && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            setOptionsMenu({ visible: true, position: { x: minX + width + 20, y: centerY }, iconId: icon.id, canRotate: false, hideEdit: false });
          }}
          style={{
            position: 'absolute',
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 10,
            borderWidth: 1,
            borderColor: '#ddd',
            zIndex: 10000,
            right: -14,
            top: (height + touchTolerance * 2) / 2 - 14
          }}
        >
          <Feather name="more-vertical" size={16} color="#444" />
        </TouchableOpacity>
      )}
    </View>
  );
}, (prev, next) => (
  prev.icon.id === next.icon.id &&
  prev.icon.locked === next.icon.locked &&
  prev.icon.thickness === next.icon.thickness &&
  arraysEqual(prev.icon.points, next.icon.points) &&
  prev.selectedCloneId === next.selectedCloneId &&
  prev.multiSelectMode === next.multiSelectMode &&
  prev.selectionInteractionMode === next.selectionInteractionMode &&
  prev.isAnyDrawingMode === next.isAnyDrawingMode &&
  prev.imageWidth === next.imageWidth &&
  prev.imageHeight === next.imageHeight &&
  prev.viewMode === next.viewMode &&
  (prev.selectedCloneIdsSet?.has(prev.icon.id) === next.selectedCloneIdsSet?.has(next.icon.id))
));

// Detector memoizado para custom shapes - Solo detecta toques en el PERÍMETRO
const MemoizedCustomShapeDetector = React.memo(({
  icon, imageWidth, imageHeight, viewMode, selectedCloneId, setSelectedCloneId, setClones, dragStart,
  clones, selectedCloneIds, selectedCloneIdsSet, multiSelectMode, selectionInteractionMode,
  setOptionsMenu, isAnyDrawingMode, renderScale, saveClonesHistory, zoomLevel = 1
}) => {
  const rafRef = useRef(null);
  const pendingUpdateRef = useRef(null);

  if (!icon.points || icon.points.length < 3 || !icon.isCustomShapeComplete) return null;
  if (isAnyDrawingMode) return null;

  const originalWidth = icon.imageWidth || imageWidth;
  const originalHeight = icon.imageHeight || imageHeight;
  const scale = ((imageWidth / originalWidth) + (imageHeight / originalHeight)) / 2;

  const pts = icon.points.map(p => ratioToDisplay(p.x, p.y, viewMode, imageWidth, imageHeight));
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const touchTolerance = Math.max(16, 12 * renderScale);
  const touchMargin = 22;

  const isSelected = selectedCloneIdsSet?.has(icon.id);
  const canDrag = !icon.locked && !isAnyDrawingMode && (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));
  const detectorZIndex = icon.calculatedZIndex || ZINDEX_BASE_LINES;

  // Handlers para arrastre
  const handleResponderGrant = (e) => {
    if (selectedCloneId && selectedCloneId !== icon.id) {
      setSelectedCloneId(null);
    }
    if (!canDrag) {
      if (!multiSelectMode) setSelectedCloneId(icon.id);
      return;
    }
    if (!acquireBoardDrag(dragStart, icon.id)) return;

    if (ALLOW_MULTI_ELEMENT_DRAG && multiSelectMode && selectionInteractionMode === 'move' && isSelected) {
      const initialPositions = {};
      selectedCloneIds.forEach(id => {
        const c = clones.find(cl => cl.id === id);
        if (!c) return;
        const snapshot = createBoardDragSnapshot(c);
        if (snapshot) initialPositions[id] = snapshot;
      });
      dragStart.current[icon.id] = { multiSelect: true, selectedIds: [...selectedCloneIds], initialPositions, isValid: true, startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY };
    } else {
      dragStart.current[icon.id] = { points: icon.points.map(p => ({ x: p.x, y: p.y })), isValid: true, startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY };
    }
  };

  const handleResponderMove = (e) => {
    if (!canDrag || !dragStart.current[icon.id]?.isValid || !isBoardDragOwner(dragStart, icon.id)) return;
    const base = dragStart.current[icon.id];
    const { dxRatio: ddx, dyRatio: ddy } = deltaToRatio((e.nativeEvent.pageX - base.startX) / zoomLevel, (e.nativeEvent.pageY - base.startY) / zoomLevel, viewMode, imageWidth, imageHeight);

    if (base.multiSelect && base.selectedIds && base.initialPositions) {
      pendingUpdateRef.current = prev => prev.map(c => {
        if (!base.selectedIds.includes(c.id)) return c;
        const init = base.initialPositions[c.id];
        if (!init) return c;
        return applyBoardDragSnapshot(c, init, ddx, ddy, 0, 0);
      });
    } else {
      pendingUpdateRef.current = prev => {
        const idx = prev.findIndex(c => c.id === icon.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], points: base.points.map(pt => ({ x: pt.x + ddx, y: pt.y + ddy })) };
        return next;
      };
    }
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          setClones(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        rafRef.current = null;
      });
    }
  };

  const handleResponderRelease = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (pendingUpdateRef.current) {
      setClones(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    const base = dragStart.current[icon.id];
    if (base?.multiSelect && base.selectedIds) {
      // Multi-drag: eliminar TODOS los seleccionados que est�n fuera del campo
      setClones((prev) => {
        const remaining = prev.filter(c => {
          if (!base.selectedIds.includes(c.id) || c.locked) return true;
          if (c.points && Array.isArray(c.points) && c.points.length >= 2) {
            return !areAllPointsOutside(c.points, viewMode, imageWidth, imageHeight);
          }
          if (c.xRatio !== undefined) {
            return !isOutsideVisibleField(c.xRatio, c.yRatio, viewMode, imageWidth, imageHeight);
          }
          return true;
        });
        return remaining.length < prev.length ? remaining : prev;
      });
    } else {
      // Single drag: solo eliminar esta forma
      setClones((prev) => {
        const currentClone = prev.find(c => c.id === icon.id);
        if (currentClone && !currentClone.locked && currentClone.points) {
          if (areAllPointsOutside(currentClone.points, viewMode, imageWidth, imageHeight)) {
            return prev.filter(c => c.id !== icon.id);
          }
        }
        return prev;
      });
    }
    delete dragStart.current[icon.id];
    releaseBoardDrag(dragStart, icon.id);
    if (!multiSelectMode) setSelectedCloneId(icon.id);
    if (saveClonesHistory) saveClonesHistory();
  };

  // Vertex resize handlers for custom-shape
  const handleVertexGrant = (vertexIdx, e) => {
    dragStart.current[`${icon.id}-vertex`] = {
      vertexIdx,
      startX: e.nativeEvent.pageX,
      startY: e.nativeEvent.pageY,
      origPoints: icon.points.map(p => ({ x: p.x, y: p.y }))
    };
  };

  const handleVertexMove = (e) => {
    const base = dragStart.current[`${icon.id}-vertex`];
    if (!base) return;

    const { dxRatio, dyRatio } = deltaToRatio(
      (e.nativeEvent.pageX - base.startX) / zoomLevel,
      (e.nativeEvent.pageY - base.startY) / zoomLevel,
      viewMode, imageWidth, imageHeight
    );

    const newPoints = base.origPoints.map((p, i) => {
      if (i === base.vertexIdx) {
        return {
          x: Math.max(0, Math.min(1, p.x + dxRatio)),
          y: Math.max(0, Math.min(1, p.y + dyRatio))
        };
      }
      return { ...p };
    });

    pendingUpdateRef.current = prev => {
      const idx = prev.findIndex(c => c.id === icon.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], points: newPoints };
      return next;
    };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          setClones(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        rafRef.current = null;
      });
    }
  };

  const handleVertexRelease = () => {
    delete dragStart.current[`${icon.id}-vertex`];
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (pendingUpdateRef.current) {
      setClones(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    if (saveClonesHistory) saveClonesHistory();
  };

  const isBorderResponderHit = (e, offsetX = 0, offsetY = 0) => {
    const point = getResponderLocalPoint(e, offsetX, offsetY);
    return isPolygonBorderTouch(point.x, point.y, pts, touchTolerance, minX, minY, touchMargin, width, height);
  };

  // Props comunes de responder
  const responderProps = {
    onStartShouldSetResponder: (e) => isBorderResponderHit(e),
    onMoveShouldSetResponder: (e) => canDrag && isBorderResponderHit(e),
    onResponderGrant: handleResponderGrant,
    onResponderMove: handleResponderMove,
    onResponderRelease: handleResponderRelease,
    onResponderTerminate: handleResponderRelease,
  };

  // Generar segmentos de toque a lo largo del per�metro del pol�gono
  const generateTouchSegments = () => {
    const segments = [];
    const segmentSize = touchTolerance * 2;

    // Recorrer cada lado del pol�gono (incluyendo el que cierra la forma)
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length]; // El �ltimo punto conecta con el primero
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      // Crear segmentos a lo largo de cada lado
      const numSegments = Math.max(1, Math.ceil(length / segmentSize));

      for (let j = 0; j < numSegments; j++) {
        const t = numSegments === 1 ? 0.5 : j / (numSegments - 1 || 1);
        const x = p1.x + dx * t;
        const y = p1.y + dy * t;
        const segmentLeft = x - minX + touchMargin - touchTolerance;
        const segmentTop = y - minY + touchMargin - touchTolerance;

        segments.push(
          <View
            key={`seg-${i}-${j}`}
            pointerEvents="auto"
            style={{
              position: 'absolute',
              left: segmentLeft,
              top: segmentTop,
              width: touchTolerance * 2,
              height: touchTolerance * 2,
              backgroundColor: 'transparent',
              borderRadius: touchTolerance,
            }}
            {...{
              ...responderProps,
              onStartShouldSetResponder: (e) => isBorderResponderHit(e, segmentLeft, segmentTop),
              onMoveShouldSetResponder: (e) => canDrag && isBorderResponderHit(e, segmentLeft, segmentTop),
            }}
          />
        );
      }
    }

    return segments;
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: minX - touchMargin,
        top: minY - touchMargin,
        width: width + touchMargin * 2,
        height: height + touchMargin * 2,
        backgroundColor: 'transparent',
        zIndex: detectorZIndex,
      }}
    >
      {/* Segmentos de toque a lo largo del per�metro */}
      {generateTouchSegments()}

      {/* Vertex resize handles en cada v�rtice del custom-shape */}
      {selectedCloneId === icon.id && !multiSelectMode && (
        <>
          {pts.map((pt, i) => (
            <View
              key={`vertex-${i}`}
              pointerEvents="auto"
              style={{
                position: 'absolute',
                left: pt.x - minX + touchMargin - 14,
                top: pt.y - minY + touchMargin - 14,
                width: 28,
                height: 28,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10001,
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => handleVertexGrant(i, e)}
              onResponderMove={handleVertexMove}
              onResponderRelease={handleVertexRelease}
              onResponderTerminate={handleVertexRelease}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', borderWidth: 2, borderColor: '#3498db' }} />
            </View>
          ))}
        </>
      )}

      {/* Indicador visual para selecci�n m�ltiple */}
      {multiSelectMode && isSelected && (
        <View pointerEvents="none" style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#3498db',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10001,
          borderWidth: 2,
          borderColor: '#fff'
        }}>
          <Feather name="check" size={10} color="#fff" />
        </View>
      )}

      {/* Bot�n de men� cuando est� seleccionado */}
      {selectedCloneId === icon.id && !multiSelectMode && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            setOptionsMenu({ visible: true, position: { x: maxX + 20, y: centerY }, iconId: icon.id, canRotate: false, hideEdit: false });
          }}
          style={{
            position: 'absolute',
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 10,
            borderWidth: 1,
            borderColor: '#ddd',
            zIndex: 10000,
            right: -14,
            top: (height + touchMargin * 2) / 2 - 14
          }}
        >
          <Feather name="more-vertical" size={16} color="#444" />
        </TouchableOpacity>
      )}
    </View>
  );
}, (prev, next) => (
  prev.icon.id === next.icon.id &&
  prev.icon.locked === next.icon.locked &&
  prev.icon.thickness === next.icon.thickness &&
  arraysEqual(prev.icon.points, next.icon.points) &&
  prev.selectedCloneId === next.selectedCloneId &&
  prev.multiSelectMode === next.multiSelectMode &&
  prev.selectionInteractionMode === next.selectionInteractionMode &&
  prev.isAnyDrawingMode === next.isAnyDrawingMode &&
  prev.imageWidth === next.imageWidth &&
  prev.imageHeight === next.imageHeight &&
  prev.viewMode === next.viewMode &&
  (prev.selectedCloneIdsSet?.has(prev.icon.id) === next.selectedCloneIdsSet?.has(next.icon.id))
));

export default function Field(props = {}) {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const players = useSelector(state => state.player.players || []);
  const season = useSelector(state => state.season.season);
  const equipos = useSelector(state => state.team.teams || []);

  // route.params (vienen de location.state cuando se naveg� v�a
  // navigation.navigate) siempre tiene prioridad. Los props directos
  // (p.ej. <Field sandbox /> en TacticalBoardPage standalone) se usan
  // s�lo como FALLBACK para los flags que no est�n en params, para no
  // pisar las navegaciones reales desde ejercicios/estrategias.
  const mergedParams = { ...(props || {}), ...(route.params || {}) };

  const {
    initialElements = [],
    initialFieldType = 'full',
    fieldImages = [],
    isStrategyMode = false, // Nueva prop para modo estrategia
    sandbox = false, // Modo sandbox: solo para crear videos, no guarda estrategias ni ejercicios
    ejercicioId = null, // ID del ejercicio para asociar videos
    estrategiaId = null, // ID de la estrategia para asociar videos
    editVideoData: editVideoDataParam = null, // Datos del video a editar (desde params)
    autoOpenVideoRecorder = false, // Abrir grabador de video autom�ticamente
    hideFolderPicker = false, // Ocultar selector de carpeta en el grabador de video
    presetFolderId = null, // Carpeta preseleccionada para guardar videos
    presetVideoName = '', // Nombre preseleccionado para el video (auto-naming)
    isGlobalExercise = false, // Si el ejercicio es global (admin)
    // Eliminar onSave y onCancel de los par�metros para evitar el warning
    // onSave,
    // onCancel
  } = mergedParams;

  // Obtener editVideoData de global si no viene en params
  const editVideoData = editVideoDataParam || global.editVideoData || null;

  // Estado para modo de edici�n de video - inicializar basado en editVideoData
  const [isEditingVideo, setIsEditingVideo] = useState(!!editVideoData);
  const [editingVideoId, setEditingVideoId] = useState(editVideoData?.videoId || null);
  const [editingVideoName, setEditingVideoName] = useState(editVideoData?.nombre || presetVideoName || '');
  const [editingVideoDescription, setEditingVideoDescription] = useState(editVideoData?.descripcion || '');
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
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE
          );
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
        if (isWebPlatform && typeof window !== 'undefined' && window.screen?.orientation?.addEventListener) {
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
            if (orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
              orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN) {
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
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(() => { });
          }, 300);
        })
        .catch(() => { });
    };
  }, []);

  // Efecto para controlar el estado de carga "� SVG fields render instantly
  // (defined here, but runs after render when fieldLineType/viewMode are available)

  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;

  // Detectar si es m�vil (menor a 768px en el lado m�s corto)
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  // Decompose initialFieldType (may be legacy ID like 'full' or compound 'full:entire')
  const initialDecomposed = useMemo(() => decomposeFieldId(initialFieldType), [initialFieldType]);
  const [fieldLineType, setFieldLineType] = useState(initialDecomposed.lineType);
  const [viewMode, setViewMode] = useState(initialDecomposed.viewMode);
  const selectedField = useMemo(() => composeFieldId(fieldLineType, viewMode), [fieldLineType, viewMode]);

  useEffect(() => {
    setIsLoadingField(false);
    setFieldImageReady(true);
  }, [fieldLineType, viewMode, initialElements, sandbox, editVideoData]);

  // Obtener iconos traducidos
  const INITIAL_ICONS = useMemo(() => getInitialIcons(), []);

  // Filtrar iconos seg�n el modo estrategia
  const filteredIcons = useMemo(() => {
    if (isStrategyMode) {
      // En modo estrategia, solo mostrar: jugadores, team-players, materiales (para bal�n), flechas, l�neas, figuras
      return INITIAL_ICONS.filter(icon =>
        icon.type === 'player' ||
        icon.type === 'team-players' ||
        icon.type === 'materials-button' ||
        icon.type === 'straight-arrow' ||
        icon.type === 'curve-arrow' ||
        icon.type === 'straight-line' ||
        icon.type === 'curve-line' ||
        icon.type === 'circle' ||
        icon.type === 'rectangle' ||
        icon.type === 'custom-shape-button'
      ).map(i => ({ ...i }));
    }
    return INITIAL_ICONS.map(i => ({ ...i }));
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
  const canvasOriginRef = useRef({ px: 0, py: 0 });
  // Container refs for measuring absolute positions
  const containerRef = useRef();
  const containerOriginRef = useRef({ px: 0, py: 0 });
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
  const [playersModalVisible, setPlayersModalVisible] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]); // IDs de staff en el campo
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [fieldImageReady, setFieldImageReady] = useState(false);
  const [isLoadingField, setIsLoadingField] = useState(true);
  const [showingPlayersPalette, setShowingPlayersPalette] = useState(false);
  const [showingMaterialsPalette, setShowingMaterialsPalette] = useState(false);
  const [showingStaffPalette, setShowingStaffPalette] = useState(false);
  const [teamPlayerSettingsVisible, setTeamPlayerSettingsVisible] = useState(false);
  const [standardSize, setStandardSize] = useState(24);
  // Estado para el estilo por defecto de jugadores del equipo
  const [teamPlayerStyle, setTeamPlayerStyle] = useState({
    color: '#2176ff',
    size: 24,
    numberColor: '#ffffff',
    textColor: '#000000',
    textBackgroundColor: '#ffffff',
    showPosition: false,
    differentiateGoalkeeper: true,
    goalkeeperStripeColor: '#ffffff',
    showPhotos: false
  });
  // Estado para Configuraci�n de materiales de entrenamiento (colores personalizados)
  const [materialsConfig, setMaterialsConfig] = useState({
    'cone-pro': { color: '#FF6B00', size: 18 },
    'cone-flat': { color: '#FF6B00', size: 24 },
    'ring': { color: '#FFD700', size: 24 },
    'dummy': { color: '#2196F3', size: 40 },
  });
  // Estados para el grabador de video
  const [videoRecorderVisible, setVideoRecorderVisible] = useState(false);
  const [fieldImageForVideo, setFieldImageForVideo] = useState(null);
  const [videoKeyframes, setVideoKeyframes] = useState([]);
  const [formationModalVisible, setFormationModalVisible] = useState(false);

  // Estado para Configuraci�n de formaciones (n�mero vs posici�n, etiquetas personalizadas, color del n�mero)
  const [formationSettings, setFormationSettings] = useState({
    displayMode: 'number', // 'number' o 'position'
    customLabels: { ...getDefaultPositionLabels() },
    numberColor: '#ffffff',
    textColor: '#000000',
    textBackgroundColor: '#ffffff'
  });

  // Estado para Configuraci�n de la pizarra (colores y tama�os de iconos de jugadores)
  const [boardSettings, setBoardSettings] = useState({
    playerIcon1: { color: '#2176ff', size: 24 },
    playerIcon2: { color: '#ff3838', size: 24 },
    playerIcon3: { color: '#ffa600', size: 24 },
    teamPlayers: { color: '#2176ff', size: 24, numberColor: '#ffffff', textColor: '#000000', textBackgroundColor: '#ffffff', differentiateGoalkeeper: true, goalkeeperStripeColor: '#ffffff', showPhotos: false }
  });

  // Estado para conectores (l�neas que conectan elementos)
  const [connectors, setConnectors] = useState([]);
  const [connectorsModalVisible, setConnectorsModalVisible] = useState(false);

  // Persistir formaci�n en Configuraci�n de usuario (debounced)
  useEffect(() => {
    let timer = setTimeout(async () => {
      try {
        const str = await AsyncStorage.getItem('usuario');
        if (!str) return;
        const usuario = JSON.parse(str);
        if (!usuario || !usuario._id) return;
        const response = await dispatch(updateUsuario({ id: usuario._id, updatedUser: { formationSettings } }));
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

    setBoardSettings(prev => ({
      ...prev,
      teamPlayers: {
        color: teamPlayerStyle.color,
        size: teamPlayerStyle.size,
        numberColor: teamPlayerStyle.numberColor,
        textColor: teamPlayerStyle.textColor,
        textBackgroundColor: teamPlayerStyle.textBackgroundColor,
        differentiateGoalkeeper: teamPlayerStyle.differentiateGoalkeeper,
        goalkeeperStripeColor: teamPlayerStyle.goalkeeperStripeColor,
        showPhotos: teamPlayerStyle.showPhotos
      }
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
  const selectionProtectedRef = useRef(false);

  // Refs para guardar/restaurar el estado al abrir el grabador
  const savedClonesOriginalRef = useRef(null);
  const keepVideoChangesRef = useRef(false);

  // Funci�n para abrir el grabador de video (guardamos el estado actual de clones)
  const openVideoRecorder = useCallback(() => {
    try {
      savedClonesOriginalRef.current = JSON.parse(JSON.stringify(actualClonesRef.current || []));
    } catch (e) {
      savedClonesOriginalRef.current = actualClonesRef.current ? [...actualClonesRef.current] : [];
    }
    keepVideoChangesRef.current = false;
    setVideoRecorderVisible(true);
  }, []); // Sin [clones] "� usa actualClonesRef

  // Guardado inmediato de formationSettings (bot�n Guardar)
  const handleSaveFormationSettings = useCallback(async () => {
    try {
      const str = await AsyncStorage.getItem('usuario');
      if (!str) return;
      const usuario = JSON.parse(str);
      if (!usuario || !usuario._id) return;

      const result = await dispatch(updateUsuario({ id: usuario._id, updatedUser: { formationSettings } }));
      const updated = result?.payload;
      if (updated && typeof updated === 'object') {
        await AsyncStorage.setItem('usuario', JSON.stringify(updated));

        // Mostrar mensaje temporal de confirmaci�n
        setInstructionMessage({ visible: true, text: t('formations.settingsSaved') });
        setTimeout(() => setInstructionMessage(null), 2000);
      }
    } catch (err) {
      Alert.alert(t('message.error'), t('formations.saveError') || 'Error al guardar la Configuraci�n');
    }
  }, [dispatch, formationSettings, t]);

  // Guardado inmediato de boardSettings (bot�n Guardar en panel de ajustes)
  // Ahora acepta un par�metro opcional settingsParam para evitar efectos de estado stale
  const handleSaveBoardSettings = useCallback(async (settingsParam) => {
    const settingsToSave = settingsParam || boardSettings;
    try {
      const str = await AsyncStorage.getItem('usuario');
      if (!str) return;
      const usuario = JSON.parse(str);
      if (!usuario || !usuario._id) return;

      const result = await dispatch(updateUsuario({ id: usuario._id, updatedUser: { boardSettings: settingsToSave } }));
      const updated = result?.payload;
      if (updated && typeof updated === 'object') {
        await AsyncStorage.setItem('usuario', JSON.stringify(updated));

        // Actualizar los iconos de la paleta con los nuevos valores (usar settingsToSave)
        setPaletteIcons(prev => prev.map(icon => {
          if (icon.id === 'icon1') {
            return { ...icon, color: settingsToSave.playerIcon1.color, size: settingsToSave.playerIcon1.size };
          }
          if (icon.id === 'icon2') {
            return { ...icon, color: settingsToSave.playerIcon2.color, size: settingsToSave.playerIcon2.size };
          }
          if (icon.id === 'icon3') {
            return { ...icon, color: settingsToSave.playerIcon3.color, size: settingsToSave.playerIcon3.size };
          }
          return icon;
        }));

        // Actualizar teamPlayerStyle
        setTeamPlayerStyle(prev => ({
          ...prev,
          color: settingsToSave.teamPlayers.color,
          size: settingsToSave.teamPlayers.size,
          numberColor: settingsToSave.teamPlayers.numberColor || prev.numberColor,
          textColor: settingsToSave.teamPlayers.textColor || prev.textColor,
          textBackgroundColor: settingsToSave.teamPlayers.textBackgroundColor || prev.textBackgroundColor,
          differentiateGoalkeeper: settingsToSave.teamPlayers.differentiateGoalkeeper !== undefined ? settingsToSave.teamPlayers.differentiateGoalkeeper : prev.differentiateGoalkeeper,
          goalkeeperStripeColor: settingsToSave.teamPlayers.goalkeeperStripeColor || prev.goalkeeperStripeColor,
          showPhotos: settingsToSave.teamPlayers.showPhotos !== undefined ? settingsToSave.teamPlayers.showPhotos : prev.showPhotos
        }));

        // Mostrar mensaje temporal de confirmaci�n
        setInstructionMessage({ visible: true, text: t('settings.settingsSaved') || 'Configuraci�n guardada' });
        setTimeout(() => setInstructionMessage(null), 2000);
      }
    } catch (err) {
      Alert.alert(t('message.error'), t('settings.saveError') || 'Error al guardar la Configuraci�n');
    }
  }, [dispatch, boardSettings, t]);

  // Cargar Configuraci�n guardada del usuario al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      const loadUserSettings = async () => {
        // Si ya se cargaron los datos en esta sesi�n, no volver a cargar
        if (userSettingsLoadedRef.current) return;

        try {
          const str = await AsyncStorage.getItem('usuario');
          if (!str) {
            userSettingsLoadedRef.current = true;
            return;
          }

          const usuario = JSON.parse(str);

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

            setFormationSettings(prev => ({
              ...prev,
              ...usuario.formationSettings,
              customLabels: { ...(prev.customLabels || {}), ...serverLabels }
            }));
          }

          // Cargar boardSettings del usuario
          if (usuario && usuario.boardSettings) {
            setBoardSettings(prev => ({
              ...prev,
              playerIcon1: { ...prev.playerIcon1, ...usuario.boardSettings.playerIcon1 },
              playerIcon2: { ...prev.playerIcon2, ...usuario.boardSettings.playerIcon2 },
              playerIcon3: { ...prev.playerIcon3, ...usuario.boardSettings.playerIcon3 },
              teamPlayers: { ...prev.teamPlayers, ...usuario.boardSettings.teamPlayers }
            }));

            // Actualizar tambi�n los iconos de la paleta y teamPlayerStyle con los valores del usuario
            setPaletteIcons(prev => prev.map(icon => {
              if (icon.id === 'icon1' && usuario.boardSettings.playerIcon1) {
                return { ...icon, color: usuario.boardSettings.playerIcon1.color || icon.color, size: usuario.boardSettings.playerIcon1.size || icon.size };
              }
              if (icon.id === 'icon2' && usuario.boardSettings.playerIcon2) {
                return { ...icon, color: usuario.boardSettings.playerIcon2.color || icon.color, size: usuario.boardSettings.playerIcon2.size || icon.size };
              }
              if (icon.id === 'icon3' && usuario.boardSettings.playerIcon3) {
                return { ...icon, color: usuario.boardSettings.playerIcon3.color || icon.color, size: usuario.boardSettings.playerIcon3.size || icon.size };
              }
              return icon;
            }));

            // Actualizar teamPlayerStyle con los valores del usuario
            if (usuario.boardSettings.teamPlayers) {
              const tp = usuario.boardSettings.teamPlayers;
              // Usar valores de BD si existen, si no mantener los por defecto
              setTeamPlayerStyle({
                color: tp.color !== undefined && tp.color !== null ? tp.color : '#2176ff',
                size: tp.size !== undefined && tp.size !== null ? tp.size : standardSize,
                numberColor: tp.numberColor !== undefined && tp.numberColor !== null ? tp.numberColor : '#ffffff',
                textColor: tp.textColor !== undefined && tp.textColor !== null ? tp.textColor : '#000000',
                textBackgroundColor: tp.textBackgroundColor !== undefined && tp.textBackgroundColor !== null ? tp.textBackgroundColor : '#ffffff',
                differentiateGoalkeeper: tp.differentiateGoalkeeper !== undefined ? tp.differentiateGoalkeeper : true,
                goalkeeperStripeColor: tp.goalkeeperStripeColor !== undefined && tp.goalkeeperStripeColor !== null ? tp.goalkeeperStripeColor : '#ffffff'
              });
            }
          }

          // Marcar que se cargaron los datos del usuario
          userSettingsLoadedRef.current = true;
        } catch (err) {
          console.warn('Error loading user settings', err);
          // Marcar como cargado incluso si hay error para permitir que funcione
          userSettingsLoadedRef.current = true;
        }
      };

      loadUserSettings();
    }, [])
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
      size: 24,
      numberColor: '#ffffff',
      textColor: '#000000',
      textBackgroundColor: '#ffffff',
      showPosition: false,
      differentiateGoalkeeper: true,
      goalkeeperStripeColor: '#ffffff',
      showPhotos: false
    });
    setBoardSettings({
      playerIcon1: { color: '#2176ff', size: 24 },
      playerIcon2: { color: '#ff3838', size: 24 },
      playerIcon3: { color: '#ffa600', size: 24 },
      teamPlayers: { color: '#2176ff', size: 24, numberColor: '#ffffff', textColor: '#000000', textBackgroundColor: '#ffffff', differentiateGoalkeeper: true, goalkeeperStripeColor: '#ffffff', showPhotos: false }
    });
    setFormationSettings({
      displayMode: 'number',
      customLabels: { ...getDefaultPositionLabels() },
      numberColor: '#ffffff',
      textColor: '#000000',
      textBackgroundColor: '#ffffff'
    });
    setMaterialsConfig({
      'cone-pro': { color: '#FF6B00', size: 18 },
      'cone-flat': { color: '#FF6B00', size: 24 },
      'ring': { color: '#FFD700', size: 24 },
      'dummy': { color: '#2196F3', size: 40 },
    });

    // Resetear iconos de paleta a valores iniciales
    setPaletteIcons(filteredIcons.map(i => ({ ...i })));

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
    setCanUndo(prev => prev === false ? prev : false);
    setCanRedo(prev => prev === false ? prev : false);
  }, [exitDrawingMode, filteredIcons]);

  // Funci�n para cerrar el grabador de video
  const closeVideoRecorder = useCallback(() => {
    setVideoRecorderVisible(false);
  }, []);

  // Funci�n para limpiar keyframes
  const clearVideoKeyframes = useCallback(() => {
    setVideoKeyframes([]);
  }, []);

  // Helper: convertir snapshot de keyframe (coordenadas absolutas) a un clone del sistema (ratios)
  const snapshotToClone = useCallback((snap, originalDimensions = null) => {
    // Usar dimensiones originales si se proporcionan (para videos guardados),
    // sino usar las dimensiones actuales del campo
    const sourceWidth = originalDimensions?.fieldWidth || imageWidth || 1;
    const sourceHeight = originalDimensions?.fieldHeight || imageHeight || 1;

    const pxToRatioX = (x) => (sourceWidth > 0 ? x / sourceWidth : 0);
    const pxToRatioY = (y) => (sourceHeight > 0 ? y / sourceHeight : 0);

    const id = snap.id || `${snap.type || 'elem'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const clone = { id, type: snap.type || 'unknown' };

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

    // Jugador
    if (snap.type === 'player') {
      if (snap.number !== undefined) clone.number = snap.number;
      if (snap.playerData) clone.playerData = snap.playerData;
      // Mantener color y tama�o
      if (!clone.size) clone.size = standardSize;
      if (!clone.color) clone.color = teamPlayerStyle.color || '#2176ff';
      clone.numberColor = snap.numberColor || clone.numberColor || '#ffffff';
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
      clone.points = snap.pointsRatio.map(p => ({ x: p.x, y: p.y }));
      clone.thickness = snap.baseThickness !== undefined ? snap.baseThickness : (snap.thickness !== undefined ? snap.thickness : clone.thickness);
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
      clone.points = snap.points.map(p => ({ x: pxToRatioX(p.x), y: pxToRatioY(p.y) }));
      clone.thickness = snap.baseThickness !== undefined ? snap.baseThickness : (snap.thickness !== undefined ? snap.thickness : clone.thickness);
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
        { x: pxToRatioX(snap.x2), y: pxToRatioY(snap.y2) }
      ];
      clone.thickness = snap.baseThickness !== undefined ? snap.baseThickness : (snap.thickness !== undefined ? snap.thickness : clone.thickness);
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
      clone.points = [{ x: pxToRatioX(p1.x), y: pxToRatioY(p1.y) }, { x: pxToRatioX(p2.x), y: pxToRatioY(p2.y) }];
      clone.thickness = snap.baseThickness !== undefined ? snap.baseThickness : (snap.thickness !== undefined ? snap.thickness : clone.thickness);
      if (snap.fillColor) clone.fillColor = snap.fillColor;
      if (snap.color) clone.color = snap.color;
      if (snap.lineType) clone.lineType = snap.lineType;
      if (snap.dotSize !== undefined) clone.dotSize = snap.dotSize;
      if (snap.dotSpacing !== undefined) clone.dotSpacing = snap.dotSpacing;
      clone.type = 'circle';
    }

    // Rect�ngulos (x,y,width,height) -> dos puntos (tl, br) - solo si no se procesaron puntos arriba
    if (!clone.points && typeof snap.width === 'number' && typeof snap.height === 'number' && typeof snap.x === 'number') {
      const x1 = snap.x;
      const y1 = snap.y;
      const x2 = snap.x + snap.width;
      const y2 = snap.y + snap.height;
      clone.points = [{ x: pxToRatioX(x1), y: pxToRatioY(y1) }, { x: pxToRatioX(x2), y: pxToRatioY(y2) }];
      clone.thickness = snap.baseThickness !== undefined ? snap.baseThickness : (snap.thickness !== undefined ? snap.thickness : clone.thickness);
      if (snap.fillColor) clone.fillColor = snap.fillColor;
      if (snap.color) clone.color = snap.color;
      if (snap.lineType) clone.lineType = snap.lineType;
      if (snap.dotSize !== undefined) clone.dotSize = snap.dotSize;
      if (snap.dotSpacing !== undefined) clone.dotSpacing = snap.dotSpacing;
      clone.type = 'rectangle';
      if (snap.rotation) clone.rotation = snap.rotation;
    }

    return clone;
  }, [imageWidth, imageHeight, standardSize, teamPlayerStyle.color]);

  // Preview de un keyframe (temporal): reemplaza clones en pantalla y conectores
  const goToKeyframe = useCallback((index) => {
    const kf = videoKeyframes && videoKeyframes[index];
    if (!kf || !kf.elements) return;
    // Usar dimensiones originales del video si estamos editando, para conversi�n correcta de coordenadas
    const originalDimensions = editingVideoConfigRef.current;
    const newClones = kf.elements.map(elem => snapshotToClone(elem, originalDimensions));
    // Deseleccionar y limpiar multi-select para evitar conflictos
    setSelectedCloneId(null);
    clearMultiSelect();
    setClones(newClones);
    // Restaurar conectores del keyframe (si existen)
    if (kf.connectors && Array.isArray(kf.connectors)) {
      setConnectors(kf.connectors.map(c => ({
        id: c.id,
        fromId: c.fromId,
        toId: c.toId,
        color: c.color || '#000000',
        thickness: c.thickness || 2,
      })));
    } else {
      // Si el keyframe no tiene conectores, limpiar los existentes
      setConnectors([]);
    }
  }, [videoKeyframes, snapshotToClone, clearMultiSelect]);

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
      const newClones = kf.elements.map(elem => snapshotToClone(elem, originalDimensions));
      setSelectedCloneId(null);
      clearMultiSelect();
      setClones(newClones);
      // Restaurar conectores del �ltimo keyframe (si existen)
      if (kf.connectors && Array.isArray(kf.connectors)) {
        setConnectors(kf.connectors.map(c => ({
          id: c.id,
          fromId: c.fromId,
          toId: c.toId,
          color: c.color || '#000000',
          thickness: c.thickness || 2,
        })));
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
        const newClones = elementSnapshots.map(elem => snapshotToClone(elem));
        setActualClones(newClones);
        if (frameConnectors && Array.isArray(frameConnectors)) {
          setConnectors(frameConnectors.map(c => ({
            id: c.id,
            fromId: c.fromId,
            toId: c.toId,
            color: c.color || '#000000',
            thickness: c.thickness || 2,
          })));
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
  };

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
  const applyKeyframe = useCallback((index) => {
    const kf = videoKeyframes && videoKeyframes[index];
    if (!kf || !kf.elements) return;
    // Usar dimensiones originales del video si estamos editando, para conversi�n correcta de coordenadas
    const originalDimensions = editingVideoConfigRef.current;
    const newClones = kf.elements.map(elem => snapshotToClone(elem, originalDimensions));
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
  }, [videoKeyframes, snapshotToClone, clearMultiSelect]);

  // =====================================================
  // CARGA DE VIDEO PARA EDICIÓN
  // =====================================================
  // Ref para almacenar el ID del �ltimo video cargado (para detectar cambios)
  const lastLoadedVideoIdRef = useRef(null);

  // Efecto para cargar datos del video cuando estamos en modo edici�n
  // Usamos useFocusEffect para que se ejecute cada vez que la pantalla gana el foco
  useFocusEffect(
    useCallback(() => {
      // Obtener editVideoData fresco desde global cada vez que ganamos el foco
      const currentEditVideoData = global.editVideoData;

      // Si no hay datos de video para editar, no hacer nada
      if (!currentEditVideoData) {
        return;
      }

      lastLoadedVideoIdRef.current = currentEditVideoData.videoId;

      // Limpiar global.editVideoData despu�s de usarlo
      global.editVideoData = null;

      // Establecer modo edici�n
      setIsEditingVideo(true);
      setEditingVideoId(currentEditVideoData.videoId);
      setEditingVideoName(currentEditVideoData.nombre || '');
      setEditingVideoDescription(currentEditVideoData.descripcion || '');
      setEditingVideoFolderId(currentEditVideoData.folderId || null);

      // Cambiar el tipo de campo si es diferente
      if (currentEditVideoData.fieldType) {
        const decomposed = decomposeFieldId(currentEditVideoData.fieldType);
        setFieldLineType(decomposed.lineType);
        setViewMode(decomposed.viewMode);
      }

      // Cargar keyframes
      if (currentEditVideoData.keyframes && currentEditVideoData.keyframes.length > 0) {
        // Obtener dimensiones originales del video para conversi�n correcta de coordenadas
        const originalDimensions = currentEditVideoData.config || { fieldWidth: 1280, fieldHeight: 720 };
        // Guardar en ref para uso posterior (goToKeyframe, goToLastKeyframe)
        editingVideoConfigRef.current = originalDimensions;

        // Convertir keyframes del formato de BD al formato de videoKeyframes
        const loadedKeyframes = currentEditVideoData.keyframes.map(kf => ({
          timestamp: kf.timestamp,
          elements: kf.elements || [],
          connectors: kf.connectors || [],
          // Preservar el tipo de trayectoria del balón para el segmento que
          // sale de este keyframe (suelo por defecto, aire si así se guardó).
          ballTrajectoryType: kf.ballTrajectoryType || 'ground',
          // No incluimos fieldImageData porque se generar� al capturar
        }));

        setVideoKeyframes(loadedKeyframes);

        // Cargar el primer keyframe en el campo
        if (loadedKeyframes[0] && loadedKeyframes[0].elements) {
          // Pasar dimensiones originales para convertir correctamente las coordenadas absolutas a ratios
          const firstKeyframeElements = loadedKeyframes[0].elements.map(elem => snapshotToClone(elem, originalDimensions));
          setClones(firstKeyframeElements);

          // Cargar conectores del primer keyframe si existen
          if (loadedKeyframes[0].connectors && loadedKeyframes[0].connectors.length > 0) {
            setConnectors(loadedKeyframes[0].connectors);
          }

          // Guardar como estado original
          try {
            savedClonesOriginalRef.current = JSON.parse(JSON.stringify(firstKeyframeElements));
          } catch (e) {
            savedClonesOriginalRef.current = firstKeyframeElements;
          }
        }

        // Abrir autom�ticamente el grabador de video
        setTimeout(() => {
          setVideoRecorderVisible(true);
        }, 300);
      } else {
        // Si no hay keyframes, abrir VideoRecorder para empezar de cero
        setTimeout(() => {
          setVideoRecorderVisible(true);
        }, 300);
      }

      // Cleanup cuando se sale de la pantalla - resetear el ID del �ltimo video cargado
      return () => {
        lastLoadedVideoIdRef.current = null;
      };
    }, [fieldLineType, viewMode, snapshotToClone])
  );
  // =====================================================
  // FIN CARGA DE VIDEO PARA EDICIÓN
  // =====================================================

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  }, []); // Array de dependencias VACÍO

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 1));
  }, []); // Array de dependencias VACÍO

  const handlePanLeft = useCallback(() => {
    setPanOffset(prev => ({ ...prev, x: prev.x + 30 }));
  }, []); // Array de dependencias VACÍO

  const handlePanRight = useCallback(() => {
    setPanOffset(prev => ({ ...prev, x: prev.x - 30 }));
  }, []); // Array de dependencias VACÍO

  const handlePanUp = useCallback(() => {
    setPanOffset(prev => ({ ...prev, y: prev.y + 30 }));
  }, []); // Array de dependencias VACÍO

  const handlePanDown = useCallback(() => {
    setPanOffset(prev => ({ ...prev, y: prev.y - 30 }));
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

  const applyFormation = useCallback((formationKey, options = {}) => {
    // Buscar la formaci�n en todos los mapas de formaciones
    const formation = FORMATIONS[formationKey] || FORMATIONS_8[formationKey] || FORMATIONS_7[formationKey];
    if (!formation) return;

    const color = options.color || teamPlayerStyle.color || '#2176ff';
    const size = options.size || standardSize;
    const ownerType = options.opponent ? 'opponent' : 'team';
    const displayMode = options.displayMode || 'number';
    const customLabels = options.customLabels || getDefaultPositionLabels();
    const numberColor = options.numberColor || teamPlayerStyle.numberColor || '#ffffff';
    const textColor = options.textColor || teamPlayerStyle.textColor || '#000000';
    const textBackgroundColor = options.textBackgroundColor || teamPlayerStyle.textBackgroundColor || '#ffffff';
    const realPlayers = options.realPlayers || null; // Array de jugadores reales si se seleccionaron

    const newPlayers = formation.positions.map((pos, idx) => {
      const id = `formation-player-${Date.now()}-${Math.random()}`;
      const rotated = rotateToHorizontal(pos);
      // Mirror horizontally if this is opponent alignment (keep goalkeeper on right)
      const finalX = options.opponent ? Math.max(0, Math.min(1, 1 - rotated.xRatio)) : rotated.xRatio;

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
          foto: rp.foto // Incluir foto
        };
      } else if (displayMode === 'position' && pos.position) {
        displayLabel = customLabels[pos.position] || getDefaultPositionLabels()[pos.position] || pos.position;
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
        playerData: isRealPlayer && playerInfo?.fullName ? {
          nombre: playerInfo.fullName.split(' ')[0], // Solo el primer nombre
          fullName: playerInfo.fullName,
          foto: playerInfo.foto, // Incluir foto
          posicion: playerInfo.posicion // Incluir posici�n para detectar portero
        } : null,
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
  }, [rotateToHorizontal, teamPlayerStyle.color, teamPlayerStyle.numberColor, teamPlayerStyle.textColor, teamPlayerStyle.textBackgroundColor, standardSize, playersWithNumber, t]);

  // Delete formation of the specified ownerType ('team'|'opponent')
  const deleteFormation = useCallback((ownerType) => {
    setClones((prev) => prev.filter((c) => !(c.type === 'player' && c.ownerType === ownerType)));
    setInstructionMessage({
      visible: true,
      text: t('formations.deleted', { side: ownerType === 'opponent' ? t('formations.opponent') : t('formations.team') }),
    });
    setTimeout(() => setInstructionMessage(null), 2500);
  }, [t]);

  // Memoizar estados de dibujo para evitar recrear el objeto
  const drawingStates = useMemo(() => ({
    drawingStraightArrow,
    drawingStraightLine,
    drawingCurveArrow,
    drawingCurveLine,
    drawingCircle,
    drawingRectangle,
    drawingCustomShape,
    eraserMode
  }), [drawingStraightArrow, drawingStraightLine, drawingCurveArrow, drawingCurveLine, drawingCircle, drawingRectangle, drawingCustomShape, eraserMode]);

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
  }, []);

  const canvasRef = useRef();

  // Estado real de clones
  const [actualClones, setActualClones] = useState(
    (initialElements ?? []).map(clone => {
      if (
        typeof clone.xRatio === 'number' &&
        typeof clone.yRatio === 'number'
      ) {
        return { ...clone };
      } else if (
        typeof clone.x === 'number' &&
        typeof clone.y === 'number'
      ) {
        const initAspect = getAspectForView(viewMode);
        const initW = REFERENCE_WIDTH;
        const initH = REFERENCE_WIDTH * initAspect;
        return {
          ...clone,
          xRatio: clone.x / initW,
          yRatio: clone.y / initH
        };
      } else {
        return { ...clone };
      }
    })
  );

  // Alias y wrapper para setClones
  const clones = actualClones;

  // =====================================================
  // SISTEMA DE UNDO/REDO OPTIMIZADO CON DEBOUNCE (INCLUYE CONECTORES)
  // =====================================================
  const MAX_HISTORY_SIZE = 50; // M�ximo de estados en el historial
  // El historial ahora guarda objetos con { clones, connectors }
  const historyRef = useRef([JSON.stringify({ clones: actualClones, connectors: [] })]); // Historial de estados
  const historyIndexRef = useRef(0); // Índice actual en el historial
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const lastSavedStateRef = useRef(JSON.stringify({ clones: actualClones, connectors: [] })); // Último estado guardado
  const debounceTimerRef = useRef(null); // Timer para debounce
  const pendingStateRef = useRef(null); // Estado pendiente de guardar
  const DEBOUNCE_DELAY = 300; // ms - tiempo para agrupar cambios de drag
  const connectorsRef = useRef([]); // Referencia actual de conectores para undo/redo

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
    setCanUndo(prev => {
      const next = historyIndexRef.current > 0;
      return prev === next ? prev : next;
    });
    setCanRedo(prev => prev === false ? prev : false);
  }, []);

  const saveToHistoryDebounced = useCallback((newClones, newConnectors) => {
    const stateObj = { clones: newClones, connectors: newConnectors || connectorsRef.current };
    const newStateStr = JSON.stringify(stateObj);
    commitToHistory(newStateStr);
  }, [commitToHistory]);

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
  const saveClonesHistory = useCallback((customClones) => {
    if (customClones !== undefined) {
      saveToHistoryDebounced(customClones, connectorsRef.current);
    } else {
      setTimeout(() => {
        saveToHistoryDebounced(actualClonesRef.current, connectorsRef.current);
      }, 0);
    }
  }, [saveToHistoryDebounced]);

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

  // Función UNDO optimizada (restaura clones y conectores)
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

      setCanUndo(prev => { const n = historyIndexRef.current > 0; return prev === n ? prev : n; });
      setCanRedo(prev => prev === true ? prev : true);
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

      setCanUndo(prev => prev === true ? prev : true);
      setCanRedo(prev => { const n = historyIndexRef.current < historyRef.current.length - 1; return prev === n ? prev : n; });
    }
  }, []);

  // Limpiar historial cuando se resetea el campo
  // Usa actualClonesRef (ref estable) en lugar de actualClones (cambia cada render durante drag)
  const clearHistory = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingStateRef.current = null;
    const initialState = JSON.stringify({ clones: actualClonesRef.current, connectors: connectorsRef.current });
    historyRef.current = [initialState];
    historyIndexRef.current = 0;
    lastSavedStateRef.current = initialState;
    setCanUndo(prev => prev === false ? prev : false);
    setCanRedo(prev => prev === false ? prev : false);
  }, []);

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
  const setConnectorsWithHistory = useCallback((updater) => {
    setConnectors(prev => {
      const newConnectors = typeof updater === 'function' ? updater(prev) : updater;
      connectorsRef.current = newConnectors;
      return newConnectors;
    });
    // setTimeout fuera del state updater: correcto seg�n React
    setTimeout(() => {
      saveToHistoryDebounced(actualClonesRef.current, connectorsRef.current);
    }, 0);
  }, [saveToHistoryDebounced]);

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
  const [playersWithNumber, setPlayersWithNumber] = useState(true);
  const [arrowThickness, setArrowThickness] = useState(2);
  const [textEditPanel, setTextEditPanel] = useState({ visible: false, icon: null, isNew: false });
  const [debugPanelVisible, setDebugPanelVisible] = useState(false);

  // Inicializar availablePlayers con todos los jugadores no seleccionados
  useEffect(() => {
    if (players.length > 0) {
      const mapped = players.map((p, idx) => ({ ...p, uniqueId: `player-${p.id || idx}` }));
      setAvailablePlayers(mapped.filter(p => !selectedPlayerIds.includes(p.uniqueId)));
    }
  }, [players, selectedPlayerIds]);

  // Cargar equipos de la temporada
  useEffect(() => {
    if (season?._id) {
      dispatch(fetchEquiposTemporada({ season: season._id }));
    }
  }, [season, dispatch]);

  // Cargar jugadores del equipo actual
  useEffect(() => {
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    const teamId = selectedTeam?._id;
    if (teamId && players.length === 0) {
      dispatch(fetchJugadoresEquipo({ team: teamId }));
    }
  }, [equipos, players.length, dispatch]);

  // Mantener el tama�o de teamPlayerStyle sincronizado con standardSize
  useEffect(() => {
    setTeamPlayerStyle(prev => ({
      ...prev,
      size: standardSize
    }));
  }, [standardSize]);

  const [useSmootherMovement] = useState(true); // Flag para movimientos m�s suaves
  const rafRef = useRef(null); // Referencia para requestAnimationFrame

  // Estado para el men� de opciones
  const [optionsMenu, setOptionsMenu] = useState({
    visible: false,
    position: { x: 0, y: 0 },
    iconId: null,
    canRotate: false,
    hideEdit: false
  });

  // Estado para el panel de elementos bloqueados
  const [lockedElementsVisible, setLockedElementsVisible] = useState(false);

  // Funci�n para rotar un elemento
  const handleRotateIcon = useCallback((iconId) => {
    if (!iconId) return;

    setClones(prev => prev.map(clone => {
      if (clone.id !== iconId) return clone;

      // Para custom-shapes y l�neas, rotar los puntos alrededor del centro
      if (clone.type === 'custom-shape' ||
        clone.type === 'straight-line' ||
        clone.type === 'straight-arrow' ||
        clone.type === 'curve-line' ||
        clone.type === 'curve-arrow' ||
        clone.type === 'circle') {

        if (!clone.points || clone.points.length < 2) return clone;

        // Calcular el centro de la figura
        const centerX = clone.points.reduce((sum, p) => sum + p.x, 0) / clone.points.length;
        const centerY = clone.points.reduce((sum, p) => sum + p.y, 0) / clone.points.length;

        // Rotar cada punto 45 grados alrededor del centro
        const rotatedPoints = clone.points.map(point => {
          const dx = point.x - centerX;
          const dy = point.y - centerY;
          const angle = Math.PI / 4; // 45 grados

          return {
            x: centerX + (dx * Math.cos(angle) - dy * Math.sin(angle)),
            y: centerY + (dx * Math.sin(angle) + dy * Math.cos(angle))
          };
        });

        return {
          ...clone,
          points: rotatedPoints
        };
      }

      // Para otros elementos, usar la rotaci�n normal
      return {
        ...clone,
        rotation: ((clone.rotation || 0) + 45) % 360
      };
    }));
  }, []);

  // Funci�n para aplicar movimientos suaves con InteractionManager
  const applySmootherMovement = useCallback((updateFn) => {
    if (useSmootherMovement) {
      // Usar InteractionManager para ejecutar despu�s de las animaciones
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
  }, [useSmootherMovement]);

  // 1. A�adir estos estados en el componente Field principal
  const [lineStyleModalVisible, setLineStyleModalVisible] = useState(false);

  const [lineType, setLineType] = useState('solid'); // 'solid', 'dotted', 'wavy'
  const [dotSize, setDotSize] = useState(2);
  const [dotSpacing, setDotSpacing] = useState(4);
  const [pendingLineAction, setPendingLineAction] = useState(null);

  const [panelVisible] = useState(true);
  const [carouselModalVisible, setCarouselModalVisible] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const panelAnim = useRef(new Animated.Value(0)).current;

  // Ajusta el panel seg�n el tama�o de la pantalla
  const isSmallScreen = SCREEN_WIDTH < 360;

  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: panelVisible ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [panelVisible]);

  const iconCounters = useRef({});
  paletteIcons.forEach((icon) => {
    if (!iconCounters.current[icon.id]) iconCounters.current[icon.id] = 1;
  });

  // Contador incremental de z-index para ordenar elementos por orden de creaci�n
  const zIndexCounter = useRef(0);
  const getNextZIndex = useCallback((type) => {
    zIndexCounter.current += 1;
    return getZIndexBaseForType(type) + zIndexCounter.current;
  }, []);

  const safetyTimerRef = useRef(null);

  const dragStart = useRef({});

  const aspect = getAspectForView(viewMode);

  const referenceWidth = REFERENCE_WIDTH;
  const referenceHeight = REFERENCE_WIDTH * aspect;

  // Calcular tama�o �ptimo para el campo (memoizado para estabilidad de referencias)
  const { imageWidth, imageHeight } = useMemo(() => {
    let w, h;
    if (isMobile) {
      const topButtonsSpace = 44;
      const bottomButtonsSpace = 44;
      const videoPanelW = videoRecorderVisible ? 112 : 0;
      const sideMargin = 6;
      const usableWidth = SCREEN_WIDTH - sideMargin * 2 - videoPanelW;
      const usableHeight = SCREEN_HEIGHT - topButtonsSpace - bottomButtonsSpace;

      w = usableWidth;
      h = w * aspect;

      if (h > usableHeight) {
        h = usableHeight;
        w = h / aspect;
      }
    } else {
      const headerHeight = Platform.OS === 'ios' ? 54 : 44;
      const verticalMargin = Platform.OS === 'ios' ? (16 + headerHeight) : headerHeight;
      const horizontalMargin = 16;
      const PANEL_HEIGHT = 150;

      const maxFieldHeight = SCREEN_HEIGHT - verticalMargin - PANEL_HEIGHT - 8;
      const maxFieldWidth = SCREEN_WIDTH - horizontalMargin * 2;

      w = maxFieldWidth;
      h = w * aspect;

      if (h > maxFieldHeight) {
        h = maxFieldHeight;
        w = h / aspect;
      }
    }
    return { imageWidth: w, imageHeight: h };
  }, [isMobile, SCREEN_WIDTH, SCREEN_HEIGHT, aspect, videoRecorderVisible]);

  // Helper: calcular el centro visible del campo seg�n el viewMode activo
  const getVisibleCenterRatio = useCallback(() => {
    return displayToRatio(imageWidth / 2, imageHeight / 2, viewMode, imageWidth, imageHeight);
  }, [viewMode, imageWidth, imageHeight]);

  // 3. Reemplazar la funci�n handleIconPalettePress con esta versi�n
  const handleIconPalettePress = useCallback((icon, paletteIndex) => {
    // Deseleccionar cualquier elemento seleccionado
    setSelectedCloneId(null);
    clearMultiSelect();



    // Manejar el bot�n de jugadores del equipo
    if (icon.type === 'team-players') {
      setShowingPlayersPalette(true);
      setShowingMaterialsPalette(false);
      setShowingStaffPalette(false);
      return;
    }

    // Manejar el bot�n de cuerpo t�cnico
    if (icon.type === 'coaching-staff') {
      setShowingStaffPalette(true);
      setShowingPlayersPalette(false);
      setShowingMaterialsPalette(false);
      return;
    }

    // Manejar el bot�n de materiales
    if (icon.type === 'materials-button') {
      setShowingMaterialsPalette(true);
      setShowingPlayersPalette(false);
      setShowingStaffPalette(false);
      return;
    }

    // Manejar el bot�n de figura personalizada de manera especial
    if (icon.type === 'custom-shape-button') {
      setPendingLineAction({
        type: 'custom-shape',
        paletteIndex: paletteIndex,
        icon: { ...icon, type: 'custom-shape-button' }
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
      return;
    }

    // Iniciar modo de dibujo directamente desde la paleta para l�neas, flechas y formas (no abrir modal de estilo)
    if (icon.type === 'straight-arrow' || icon.type === 'straight-line' ||
      icon.type === 'curve-arrow' || icon.type === 'curve-line' ||
      icon.type === 'circle' || icon.type === 'rectangle') {
      setPendingLineAction({
        type: icon.type,
        paletteIndex: paletteIndex,
        icon: icon
      });

      // Cargar Configuraci�n guardada en la paleta (si existe)
      const pIcon = paletteIcons[paletteIndex] || icon || {};
      setLineType(pIcon.lineType ? pIcon.lineType : 'solid');
      setDotSize((pIcon.dotSize !== undefined && pIcon.dotSize !== null) ? pIcon.dotSize : 2);
      setDotSpacing((pIcon.dotSpacing !== undefined && pIcon.dotSpacing !== null) ? pIcon.dotSpacing : 4);
      setArrowThickness((pIcon.thickness !== undefined && pIcon.thickness !== null) ? pIcon.thickness : (pIcon.thickness || 2));
      // Si la paleta tiene fillColor/lineType/dotSize/dotSpacing, guardarlas en pending para shapes
      setPendingLineAction(prev => prev ? {
        ...prev,
        icon: {
          ...prev.icon,
          fillColor: pIcon.fillColor !== undefined ? pIcon.fillColor : prev.icon?.fillColor,
          lineType: pIcon.lineType ? pIcon.lineType : prev.icon?.lineType,
          dotSize: (pIcon.dotSize !== undefined && pIcon.dotSize !== null) ? pIcon.dotSize : prev.icon?.dotSize,
          dotSpacing: (pIcon.dotSpacing !== undefined && pIcon.dotSpacing !== null) ? pIcon.dotSpacing : prev.icon?.dotSpacing,
        }
      } : { type: icon.type, paletteIndex, icon: { ...icon, fillColor: pIcon.fillColor, lineType: pIcon.lineType, dotSize: pIcon.dotSize, dotSpacing: pIcon.dotSpacing } });

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

    // Para otros tipos de iconos (jugadores, conos, etc.)
    let number = undefined;
    if (icon.type === 'player') {
      number = iconCounters.current[icon.id];
      iconCounters.current[icon.id] = number + 1;
      setPaletteIcons(prev =>
        prev.map(ic =>
          ic.id === icon.id
            ? { ...ic, number: iconCounters.current[icon.id] }
            : ic
        )
      );
    }

    // Usar la Configuraci�n actual de la paleta (color, tama�o, thickness)
    // Obtener el icono actualizado de la paleta para usar su Configuraci�n m�s reciente
    const currentPaletteIcon = paletteIcons[paletteIndex];

    const { x: centerX, y: centerY } = getVisibleCenterRatio();

    setClones((prev) => [
      {
        ...icon,
        id: `${icon.id}-clone-${Date.now()}-${Math.random()}`,
        xRatio: centerX,
        yRatio: centerY,
        number,
        rotation: 0,
        size: currentPaletteIcon.size || standardSize, // Usar el tama�o actual de la paleta
        color: isValidHexColor(currentPaletteIcon.color) ? currentPaletteIcon.color : '#000000', // Color actual de la paleta
        paletteIndex,
        thickness: currentPaletteIcon.thickness || icon.thickness, // Thickness actual de la paleta
        fillColor: currentPaletteIcon.fillColor || icon.fillColor || 'transparent',
        numberColor: currentPaletteIcon.numberColor || icon.numberColor || '#ffffff',
        zIndex: getNextZIndex(icon.type)
      },
      ...prev,
    ]);

    // Al a�adir un elemento, quitar multi-select y salir de cualquier modo de dibujo
    clearMultiSelect();
    exitDrawingMode();
  }, [paletteIcons, standardSize, iconCounters, clearMultiSelect, exitDrawingMode, getNextZIndex, getVisibleCenterRatio]);

  // Funci�n para manejar la selecci�n de un jugador del equipo
  const handleSelectPlayer = (player) => {
    // Determinar la etiqueta a mostrar seg�n la Configuraci�n
    let displayLabel = undefined;
    if (teamPlayerStyle.showPosition && player.posicion) {
      // Obtener abreviatura de posici�n
      const positionAbbreviation = getPositionAbbreviation(player.posicion);
      displayLabel = positionAbbreviation;
    }

    const { x: centerX, y: centerY } = getVisibleCenterRatio();

    // Crear un clone con los datos del jugador
    setClones((prev) => [
      {
        id: `player-${player.uniqueId}-clone-${Date.now()}-${Math.random()}`,
        type: 'player',
        xRatio: centerX,
        yRatio: centerY,
        number: player.dorsal || player.number,
        rotation: 0,
        size: teamPlayerStyle.size || standardSize,
        color: teamPlayerStyle.color || '#2176ff',
        numberColor: teamPlayerStyle.numberColor || '#ffffff',
        textColor: teamPlayerStyle.textColor || '#000000',
        textBackgroundColor: teamPlayerStyle.textBackgroundColor || '#ffffff',
        paletteIndex: 0, // No importa mucho
        thickness: 1,
        playerData: player, // Guardar los datos del jugador
        displayLabel: displayLabel, // Etiqueta de posici�n si est� habilitada
        zIndex: getNextZIndex('player')
      },
      ...prev,
    ]);

    // Remover el jugador de la lista de disponibles
    setAvailablePlayers((prev) => prev.filter(p => p.uniqueId !== player.uniqueId));
    setSelectedPlayerIds((prev) => [...prev, player.uniqueId]);

    // Desactivar modo dibujo al seleccionar un jugador
    exitDrawingMode();
  };

  // Funci�n para manejar la selecci�n de un material de entrenamiento
  const handleSelectMaterial = useCallback((material) => {
    // Obtener Configuraci�n personalizada del material
    const customConfig = materialsConfig[material.type] || {};

    const { x: centerX, y: centerY } = getVisibleCenterRatio();

    // Crear un clone del material seleccionado
    setClones((prev) => [
      {
        id: `${material.type}-clone-${Date.now()}-${Math.random()}`,
        type: material.type,
        xRatio: centerX,
        yRatio: centerY,
        rotation: 0,
        size: customConfig.size || material.size || standardSize,
        color: customConfig.color || material.color || '#FF6B00',
        paletteIndex: 0,
        thickness: 1,
        rotatable: material.rotatable || false,
        zIndex: getNextZIndex(material.type)
      },
      ...prev,
    ]);

    // Desactivar modo dibujo al seleccionar un material
    exitDrawingMode();
  }, [standardSize, materialsConfig, exitDrawingMode, getNextZIndex, getVisibleCenterRatio]);

  // Funci�n para manejar la selecci�n de un miembro del cuerpo t�cnico
  const handleSelectStaff = useCallback((staffRole) => {
    const { x: centerX, y: centerY } = getVisibleCenterRatio();

    // Crear un clone del staff seleccionado
    setClones((prev) => [
      {
        id: `staff-${staffRole.id}-clone-${Date.now()}-${Math.random()}`,
        type: 'staff',
        staffRole: staffRole.id,
        xRatio: centerX,
        yRatio: centerY,
        rotation: 0,
        size: standardSize,
        color: '#333333',
        numberColor: '#ffffff',
        displayLabel: staffRole.code, // Mostrar el c�digo (E1, E2, PF, etc)
        staffLabel: staffRole.label, // Etiqueta completa para referencia
        paletteIndex: 0,
        thickness: 1,
        zIndex: getNextZIndex('staff')
      },
      ...prev,
    ]);

    // A�adir a la lista de staff seleccionados (para que desaparezca de la paleta)
    setSelectedStaffIds((prev) => [...prev, staffRole.id]);

    // Desactivar modo dibujo al seleccionar un staff
    exitDrawingMode();
  }, [standardSize, exitDrawingMode, getNextZIndex, getVisibleCenterRatio]);

  // Manejador para editar material de la paleta (long press)
  const handleLongPressMaterial = useCallback((material, idx) => {
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
  }, [materialsConfig]);

  // Manejador para actualizar Configuraci�n de materiales desde el panel de edici�n
  const handleMaterialsConfigUpdate = useCallback((materialType, newConfig) => {
    setMaterialsConfig(prev => ({
      ...prev,
      [materialType]: {
        ...(prev[materialType] || {}),
        ...newConfig,
      }
    }));
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
      playerData: player,
      isPalettePlayer: true, // Marca especial para indicar que es de la paleta
    };
    setEditingIcon(fakeIcon);
    setLeftPanelVisible(true);
  };

  // 4. A�adir el manejador para aplicar el estilo de l�nea seleccionado
  const handleLineStyleSelect = ({ lineType, dotSize, dotSpacing, color, thickness, fillColor }) => {
    if (!pendingLineAction) return;

    const { type, icon, paletteIndex } = pendingLineAction;

    // Actualizar solo el estilo global si el tipo de elemento es uno que utiliza la Configuraci�n global
    const GLOBAL_STYLE_TYPES = ['straight-arrow', 'straight-line', 'curve-arrow', 'curve-line', 'circle', 'rectangle'];
    if (GLOBAL_STYLE_TYPES.includes(type)) {
      setLineType(lineType);
      setDotSize(dotSize);
      setDotSpacing(dotSpacing);
    }

    // Actualizar el color/grosor y tipo de trazo en la paleta para los nuevos elementos
    if (paletteIndex !== undefined) {
      setPaletteIcons(prev => prev.map((ic, idx) => {
        if (idx === paletteIndex) {
          return {
            ...ic,
            color: color || ic.color,
            thickness: (thickness !== undefined && thickness !== null) ? thickness : ic.thickness,
            fillColor: (fillColor !== undefined && fillColor !== null) ? fillColor : (ic.fillColor || 'transparent'),
            // A�adir tipo de trazo y par�metros punteado
            lineType: lineType || ic.lineType || 'solid',
            dotSize: (dotSize !== undefined && dotSize !== null) ? dotSize : ic.dotSize,
            dotSpacing: (dotSpacing !== undefined && dotSpacing !== null) ? dotSpacing : ic.dotSpacing
          };
        }
        return ic;
      }));
    }

    // Guardar el grosor para usar al dibujar
    setArrowThickness((thickness !== undefined && thickness !== null) ? thickness : (parseInt(icon.thickness) || 2));

    // Guardar la Configuraci�n de estilo en pendingLineAction para usarla despu�s
    setPendingLineAction(prev => prev ? {
      ...prev,
      icon: {
        ...prev.icon,
        color: color || prev.icon?.color,
        thickness: (thickness !== undefined && thickness !== null) ? thickness : prev.icon?.thickness,
        fillColor: (fillColor !== undefined && fillColor !== null) ? fillColor : (prev.icon?.fillColor || 'transparent'),
        lineType: lineType || prev.icon?.lineType || 'solid',
        dotSize: (dotSize !== undefined && dotSize !== null) ? dotSize : prev.icon?.dotSize,
        dotSpacing: (dotSpacing !== undefined && dotSpacing !== null) ? dotSpacing : prev.icon?.dotSpacing
      }
    } : null);

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
        subtext: 'Cuando tengas 3 o m�s puntos, toca el c�rculo inicial para cerrar'
      });

      setTimeout(() => {
        setInstructionMessage(null);
      }, 5000);
    }

    // No anulamos pendingLineAction aqu�, se usa para obtener las propiedades al crear las figuras
  };



  const handleCustomShapeStart = useCallback((e) => {
    if (!drawingCustomShape) return;

    const { locationX, locationY } = e.nativeEvent;
    const newPoint = displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight);

    if (customShapePoints.length >= 3) {
      const firstPoint = customShapePoints[0];
      const { x: firstPointX, y: firstPointY } = ratioToDisplay(firstPoint.x, firstPoint.y, viewMode, imageWidth, imageHeight);
      const distance = Math.sqrt(
        Math.pow(locationX - firstPointX, 2) + Math.pow(locationY - firstPointY, 2)
      );

      if (distance <= 15) {
        const uniqueId = `custom-shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Obtener Configuraci�n de la paleta
        const paletteIcon = paletteIcons.find(ic => ic.type === 'custom-shape-button');
        const paletteIndex = paletteIcons.findIndex(ic => ic.type === 'custom-shape-button');

        // Usar valores de la paleta de custom-shape en lugar de los globales
        const shapeLineType = pendingLineAction?.icon?.lineType || paletteIcon?.lineType || 'solid';
        const shapeDotSize = pendingLineAction?.icon?.dotSize ?? paletteIcon?.dotSize ?? 2;
        const shapeDotSpacing = pendingLineAction?.icon?.dotSpacing ?? paletteIcon?.dotSpacing ?? 4;

        const newShape = {
          id: uniqueId,
          type: 'custom-shape',
          color: pendingLineAction?.icon?.color || paletteIcon?.color || '#000000',
          thickness: pendingLineAction?.icon?.thickness || paletteIcon?.thickness || 5,
          lineType: shapeLineType,
          dotSize: shapeDotSize,
          dotSpacing: shapeDotSpacing,
          fillColor: pendingLineAction?.icon?.fillColor || paletteIcon?.fillColor || 'transparent',
          size: standardSize, // Usar standardSize directamente
          points: [...customShapePoints],
          imageWidth,
          imageHeight,
          xRatio: 0.5,
          yRatio: 0.5,
          isCustomShapeComplete: true,
          paletteIndex: paletteIndex >= 0 ? paletteIndex : undefined,
          zIndex: getNextZIndex('custom-shape')
        };

        setClones(prev => [newShape, ...prev]);

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
  }, [drawingCustomShape, customShapePoints, viewMode, imageWidth, imageHeight, paletteIcons, pendingLineAction, lineType, dotSize, dotSpacing, standardSize, getNextZIndex]);

  const handleCustomShapeMove = useCallback((e) => {
    if (!drawingCustomShape || !isPreviewingPoint) return;

    const { locationX, locationY } = e.nativeEvent;
    const newPoint = displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight);

    setPreviewPoint(newPoint);
  }, [drawingCustomShape, isPreviewingPoint, viewMode, imageWidth, imageHeight]);

  const handleCustomShapeEnd = useCallback((e) => {
    if (!drawingCustomShape || !isPreviewingPoint || !previewPoint) return;

    setCustomShapePoints(prev => {
      const newPoints = [...prev, previewPoint];
      if (newPoints.length >= 3) {
        setShowCloseCircle(true);
      }
      return newPoints;
    });

    setPreviewPoint(null);
    setIsPreviewingPoint(false);
  }, [drawingCustomShape, isPreviewingPoint, previewPoint]);

  function renderCustomShape({ icon, imageWidth, imageHeight }) {
    // VALIDACIÓN ESTRICTA con la bandera de completado
    if (!icon.isCustomShapeComplete ||
      !icon.points ||
      icon.points.length < 3 ||
      !icon.imageWidth ||
      !icon.imageHeight ||
      icon.imageWidth === 0 ||
      icon.imageHeight === 0) {
      return null;
    }

    const originalWidth = icon.imageWidth;
    const originalHeight = icon.imageHeight;
    const widthRatio = imageWidth / originalWidth;
    const heightRatio = imageHeight / originalHeight;
    const scale = (widthRatio + heightRatio) / 2;

    const pts = icon.points.map(p => ({
      x: p.x * imageWidth,
      y: p.y * imageHeight,
    }));

    // Grosor reducido para l�neas m�s finas
    const thickness = (icon.thickness || 1) * scale * 0.7;

    // Crear el path cerrando la figura - SOLO las l�neas dibujadas por el usuario
    const pathData = pts.map((pt, i) =>
      i === 0 ? `M${pt.x},${pt.y}` : `L${pt.x},${pt.y}`
    ).join(' ') + ' Z';

    // Determinar el color de relleno con transparencia
    const fillColor = icon.fillColor && icon.fillColor !== 'transparent'
      ? icon.fillColor + '99' // Agregar 60% de opacidad (hex 99)
      : 'transparent';

    const customShapeElements = [];

    // Relleno (si existe)
    if (fillColor !== 'transparent') {
      customShapeElements.push(
        <Path
          key={`fill-custom-shape-${icon.id}`}
          d={pathData}
          stroke="none"
          fill={fillColor}
        />
      );
    }

    // L�nea principal (con o sin punteado)
    const customShapeStrokeDasharray = icon.lineType === 'dotted'
      ? `${icon.dotSize || 2}, ${icon.dotSpacing || 4}`
      : null;

    customShapeElements.push(
      <Path
        key={`custom-shape-${icon.id}-${icon.color}-${thickness}-${icon.lineType || 'solid'}-${icon.dotSize || 2}-${icon.dotSpacing || 4}-${icon.fillColor || 'transparent'}`}
        d={pathData}
        stroke={icon.color}
        strokeWidth={thickness}
        strokeDasharray={customShapeStrokeDasharray}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );

    return customShapeElements;
  }

  const handleGuardarGrafico = async () => {
    setSelectedCloneId(null);
    await new Promise(resolve => setTimeout(resolve, 100));

    // En modo sandbox, abrir directamente el grabador de video sin guardar
    if (sandbox) {
      setVideoRecorderVisible(true);
      return;
    }

    if (canvasRef.current) {
      try {
        const imageBase64 = await captureViewShotBase64(canvasRef);

        if (saveCallback) {
          saveCallback(clones, selectedField, imageBase64);
        }
        // Limpiar keyframes al guardar
        setVideoKeyframes([]);
        // Liberar orientaci�n antes de navegar
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          setTimeout(() => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(() => { });
          }, 300);
        } catch (e) {
          // Device may not support orientation lock
        }
        navigation.goBack();
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
        ]
      );
    } else {
      if (cancelCallback) {
        cancelCallback();
      }
      // Limpiar todo el estado temporal al cancelar
      clearBoardState();
      await unlockOrientationAndGoBack();
    }
  }, [cancelCallback, clones.length, videoKeyframes.length, clearBoardState, unlockOrientationAndGoBack, sandbox, t]);
  // Efecto para actualizar la imagen del campo cuando cambia selectedField (SVG → base64 via ViewShot)
  useEffect(() => {
    // SVG fields are instant "� mark ready immediately
    setFieldImageReady(true);
    setIsLoadingField(false);

    // Capture field base image for video after a short delay to allow SVG render
    const timer = setTimeout(async () => {
      try {
        if (fieldBaseRef.current) {
          const imageBase64 = await captureViewShotBase64(fieldBaseRef);
          setFieldImageForVideo(`data:image/png;base64,${imageBase64}`);
        }
      } catch (error) {
        console.error('Error capturing field image for video:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedField]);

  // Funci�n para abrir el grabador de video (desde otras rutas)
  const handleOpenVideoRecorder = useCallback(() => {
    try {
      savedClonesOriginalRef.current = JSON.parse(JSON.stringify(actualClonesRef.current || []));
    } catch (e) {
      savedClonesOriginalRef.current = actualClonesRef.current ? [...actualClonesRef.current] : [];
    }
    keepVideoChangesRef.current = false;
    setVideoRecorderVisible(true);
  }, []); // Sin [clones] "� usa actualClonesRef

  // Funci�n para cerrar el grabador de video
  const unlockOrientationAndGoBack = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setTimeout(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(() => { });
      }, 300);
    } catch (e) {
      // Device may not support orientation lock
    }
    navigation.goBack();
  }, [navigation]);

  const handleEditVideoSaved = useCallback(async () => {
    // Cerrar primero el grabador para que la transici�n quede limpia
    setVideoRecorderVisible(false);
    setFieldImageForVideo(null);
    savedClonesOriginalRef.current = null;
    keepVideoChangesRef.current = false;
    // Se�al global para que la pantalla origen muestre mensaje de �xito
    global.pendingVideoEditSuccess = true;
    clearBoardState();
    await new Promise(resolve => setTimeout(resolve, 120));
    await unlockOrientationAndGoBack();
  }, [clearBoardState, unlockOrientationAndGoBack]);

  const handleCloseVideoRecorder = useCallback(() => {
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
          : (savedClonesOriginalRef.current || []);

        let restored = [];
        try {
          const parsed = JSON.parse(JSON.stringify(toRestore));
          restored = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        } catch (e) {
          restored = Array.isArray(toRestore) ? toRestore : (toRestore ? [toRestore] : []);
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
    }, [handleCancelar])
  );

  // Ensure we clear board state when the screen is being removed (navigation away)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async () => {
      clearBoardState();
      // Forzar portrait primero (necesario en iOS), luego desbloquear
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setTimeout(() => {
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(() => { });
        }, 300);
      } catch (e) {
        // Device may not support orientation lock
      }
    });
    return unsubscribe;
  }, [navigation, clearBoardState]);

  // Funci�n para alternar modo de selecci�n m�ltiple
  const handleToggleMultiSelect = useCallback(() => {
    setMultiSelectMode(prev => {
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
          const sel = actualClonesRef.current.find(c => c.id === selectedCloneId);
          const drawableTypes = ['straight-line', 'straight-arrow', 'curve-line', 'curve-arrow', 'circle', 'rectangle', 'custom-shape'];
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
    setSelectionInteractionMode(prev => prev === 'select' ? 'move' : 'select');
    // Limpiar el rect�ngulo al cambiar de modo
    setSelectionRect(null);
    setIsSelecting(false);
    selectionStartRef.current = null;
  }, []);

  // Funci�n para eliminar elementos seleccionados
  const deleteSelectedElements = useCallback(() => {
    if (selectedCloneIds.length === 0) return;

    // Encontrar los elementos que se van a eliminar
    const clonesBeingDeleted = actualClonesRef.current.filter(clone => selectedCloneIds.includes(clone.id));

    // Encontrar los jugadores del equipo que se van a eliminar para liberarlos
    const playersToRestore = clonesBeingDeleted
      .filter(clone => clone.playerData && clone.playerData.uniqueId)
      .map(clone => clone.playerData);
    const playerUniqueIds = playersToRestore.map(p => p.uniqueId);

    // Liberar los jugadores del equipo de selectedPlayerIds para que reaparezcan en la paleta
    if (playerUniqueIds.length > 0) {
      setSelectedPlayerIds(prev => prev.filter(uid => !playerUniqueIds.includes(uid)));
      setAvailablePlayers(prev => [...prev, ...playersToRestore]);
    }

    // Encontrar los miembros del staff que se van a eliminar para liberarlos
    const staffToRestore = clonesBeingDeleted
      .filter(clone => clone.type === 'staff' && clone.staffRole)
      .map(clone => clone.staffRole);

    // Liberar los miembros del staff de selectedStaffIds para que reaparezcan en la paleta
    if (staffToRestore.length > 0) {
      setSelectedStaffIds(prev => prev.filter(staffId => !staffToRestore.includes(staffId)));
    }

    setClones(prev => prev.filter(clone => !selectedCloneIds.includes(clone.id)));
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
      const domNode = node && (node._node || node.node || (typeof node.getBoundingClientRect === 'function' ? node : null));
      if (domNode && typeof domNode.getBoundingClientRect === 'function') {
        const rect = domNode.getBoundingClientRect();
        const px = ne.pageX != null ? ne.pageX : (ne.changedTouches && ne.changedTouches[0] && ne.changedTouches[0].pageX);
        const py = ne.pageY != null ? ne.pageY : (ne.changedTouches && ne.changedTouches[0] && ne.changedTouches[0].pageY);
        if (typeof px === 'number' && typeof py === 'number') {
          x = px - rect.left;
          y = py - rect.top;
        }
      }
    }
    return { x: x || 0, y: y || 0 };
  }, []);

  // Funciones simplificadas para selecci�n m�ltiple
  const handleSelectionStart = useCallback((e) => {
    if (!multiSelectMode || selectionInteractionMode !== 'select') return;

    const { x, y } = getEventCoords(e);

    selectionStartRef.current = { x, y };
    setSelectionRect({ x, y, width: 0, height: 0 });
    setIsSelecting(false); // Solo activar cuando se mueva
  }, [multiSelectMode, selectionInteractionMode, getEventCoords]);

  const handleSelectionMove = useCallback((e) => {
    if (!multiSelectMode || selectionInteractionMode !== 'select' || !selectionStartRef.current) return;

    const { x, y } = getEventCoords(e);
    const startX = selectionStartRef.current.x;
    const startY = selectionStartRef.current.y;

    // Activar selecci�n solo si se movi� m�s de 10px
    const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
    if (distance > 10) {
      setIsSelecting(true);
      setSelectionRect({
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY)
      });
    }
  }, [multiSelectMode, selectionInteractionMode, getEventCoords]);

  const handleSelectionEnd = useCallback(() => {
    if (!multiSelectMode) {
      selectionStartRef.current = null;
      setSelectionRect(null);
      setIsSelecting(false);
      return;
    }

    // Si fue solo un clic (no arrastre), no seleccionar nada
    if (!isSelecting || !selectionRect || selectionRect.width < 10 || selectionRect.height < 10) {
      selectionStartRef.current = null;
      setSelectionRect(null);
      setIsSelecting(false);
      return;
    }

    // Buscar elementos dentro del rect�ngulo
    const padding = 12; // expansi�n m�nima para capturar l�neas finas y textos
    const rectLeft = selectionRect.x;
    const rectRight = selectionRect.x + selectionRect.width;
    const rectTop = selectionRect.y;
    const rectBottom = selectionRect.y + selectionRect.height;

    // helper: segment intersection
    function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
      const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
      if (det === 0) return false; // parallel
      const lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
      const gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
      return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
    }

    // Helper: verificar si la circunferencia de un c�rculo est� completamente contenida en un rect�ngulo
    function isCircleContainedInRect(centerX, centerY, radius, left, top, right, bottom) {
      // La circunferencia est� contenida si el centro + radio en todas direcciones est� dentro
      return (
        (centerX - radius) >= left &&
        (centerX + radius) <= right &&
        (centerY - radius) >= top &&
        (centerY + radius) <= bottom
      );
    }

    // Helper: verificar si un rect�ngulo (shape) est� completamente contenido
    function isRectShapeContainedInRect(minX, minY, maxX, maxY, left, top, right, bottom) {
      return (
        minX >= left &&
        maxX <= right &&
        minY >= top &&
        maxY <= bottom
      );
    }

    const selected = clones.filter(clone => {
      // Tolerancia basada en grosor del trazo
      const strokeTolerance = (clone.thickness || clone.size || 0) / 2;
      const pad = Math.max(2, padding) + strokeTolerance;

      // CÍRCULOS: verificar si la circunferencia est� contenida
      if (clone.type === 'circle' && clone.points && clone.points.length === 2) {
        const pts = clone.points.map(p => {
          if (p.x <= 1 && p.y <= 1) return ratioToDisplay(p.x, p.y, viewMode, imageWidth, imageHeight);
          return { x: p.x, y: p.y };
        });

        // Calcular centro y radio del c�rculo
        const centerX = (pts[0].x + pts[1].x) / 2;
        const centerY = (pts[0].y + pts[1].y) / 2;
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const radius = Math.sqrt(dx * dx + dy * dy) / 2;

        // Verificar si la circunferencia (incluyendo el grosor del trazo) est� contenida
        return isCircleContainedInRect(
          centerX, centerY, radius + strokeTolerance,
          rectLeft - pad, rectTop - pad, rectRight + pad, rectBottom + pad
        );
      }

      // RECTÁNGULOS: verificar si el per�metro est� contenido
      if (clone.type === 'rectangle' && clone.points && clone.points.length === 2) {
        const pts = clone.points.map(p => {
          if (p.x <= 1 && p.y <= 1) return ratioToDisplay(p.x, p.y, viewMode, imageWidth, imageHeight);
          return { x: p.x, y: p.y };
        });

        const minX = Math.min(pts[0].x, pts[1].x);
        const maxX = Math.max(pts[0].x, pts[1].x);
        const minY = Math.min(pts[0].y, pts[1].y);
        const maxY = Math.max(pts[0].y, pts[1].y);

        // Verificar si el rect�ngulo (incluyendo grosor del trazo) est� contenido
        return isRectShapeContainedInRect(
          minX - strokeTolerance, minY - strokeTolerance,
          maxX + strokeTolerance, maxY + strokeTolerance,
          rectLeft - pad, rectTop - pad, rectRight + pad, rectBottom + pad
        );
      }

      // Si el elemento tiene puntos (l�neas, flechas, shapes), seleccionar SOLO si el recuadro recubre completamente el trazado
      if (clone.points && Array.isArray(clone.points) && clone.points.length > 0) {
        // Normalizar puntos a coords en pixels (algunos pueden estar en ratio 0..1)
        const pts = clone.points.map(p => {
          if (p.x <= 1 && p.y <= 1) return ratioToDisplay(p.x, p.y, viewMode, imageWidth, imageHeight);
          return { x: p.x, y: p.y };
        });

        const expandedLeft = rectLeft - pad;
        const expandedRight = rectRight + pad;
        const expandedTop = rectTop - pad;
        const expandedBottom = rectBottom + pad;

        // Para considerar que el recuadro recubre el trazado completo, TODOS los puntos del trazado deben estar dentro del rect�ngulo expandido
        const allPointsInside = pts.every(pt => (
          pt.x >= expandedLeft && pt.x <= expandedRight && pt.y >= expandedTop && pt.y <= expandedBottom
        ));

        if (allPointsInside) return true;

        // No seleccionamos si solo hay intersecci�n parcial; requerimos cobertura completa del trazado
        return false;
      }

      // Para elementos puntuales (jugadores, bal�n, conos, textos), usar xRatio/yRatio o x/y en pixels
      let elemX, elemY;
      if (typeof clone.x === 'number') {
        elemX = clone.x;
        elemY = clone.y;
      } else if (clone.xRatio != null) {
        const coords = ratioToDisplay(clone.xRatio, clone.yRatio, viewMode, imageWidth, imageHeight);
        elemX = coords.x;
        elemY = coords.y;
      } else {
        elemX = null;
        elemY = null;
      }

      if (elemX === null || elemY === null) return false;

      // Calcular el scale del elemento basado en su tama�o original vs actual
      const originalWidth = clone.imageWidth || imageWidth;
      const originalHeight = clone.imageHeight || imageHeight;
      const widthRatio = imageWidth / originalWidth;
      const heightRatio = imageHeight / originalHeight;
      const elementScale = (widthRatio + heightRatio) / 2;

      // Calcular el tama�o visual real del elemento (size * scale) - sin padding extra
      const baseSize = clone.size || 24;
      const visualSize = baseSize * elementScale;

      // Usar exactamente el tama�o visual del icono (mitad del tama�o a cada lado del centro)
      const halfSize = visualSize / 2;
      const elementLeft = elemX - halfSize;
      const elementRight = elemX + halfSize;
      const elementTop = elemY - halfSize;
      const elementBottom = elemY + halfSize;

      // Requerir contenci�n completa del elemento dentro del rect�ngulo de selecci�n
      const fullyContained = (elementLeft >= rectLeft && elementRight <= rectRight && elementTop >= rectTop && elementBottom <= rectBottom);
      return fullyContained;
    }).map(c => c.id);

    setSelectedCloneIds(selected);

    // Cambiar autom�ticamente a modo mover si se seleccionaron elementos
    if (selected.length > 0) {
      setSelectionInteractionMode('move');
    }

    selectionStartRef.current = null;
    setSelectionRect(null);
    setIsSelecting(false);
  }, [multiSelectMode, isSelecting, selectionRect, clones, imageWidth, imageHeight]);

  // ============================================================
  // Multi-select web v3: rewrite completo desde cero (DOM nativo).
  //
  // - Overlay div nativo (en JSX) escucha pointer events.
  // - Rect�ngulo de selecci�n dibujado por DOM puro durante el drag,
  //   sin tocar React state hasta el pointerup → cero re-renders intra-drag.
  // - Detecci�n de elementos contenidos v�a funci�n pura `findContainedIds`
  //   que lee refs estables (actualClonesRef, refs de tama�o/viewMode).
  // - Listeners attachados al `window` para move/up: el browser garantiza
  //   que llegan aunque el puntero salga del overlay (m�s robusto que
  //   setPointerCapture, que a veces falla con elementos React encima).
  // ============================================================

  // Refs estables para tama�o/viewMode (evitan re-attach del effect)
  const fieldSizeRef = useRef({ w: imageWidth, h: imageHeight, viewMode });
  fieldSizeRef.current = { w: imageWidth, h: imageHeight, viewMode };

  // Funci�n pura: dado un rect en coords del overlay, devuelve los IDs
  // de clones contenidos. Replica la l�gica original de handleSelectionEnd
  // pero sin depender de React state.
  const findContainedIds = useCallback((rect) => {
    const { w: imgW, h: imgH, viewMode: vm } = fieldSizeRef.current;
    const clonesNow = actualClonesRef.current || [];
    const padding = 12;
    const rectLeft = rect.x;
    const rectRight = rect.x + rect.width;
    const rectTop = rect.y;
    const rectBottom = rect.y + rect.height;

    function rectsOverlap(aL, aT, aR, aB, bL, bT, bR, bB) {
      return aL <= bR && aR >= bL && aT <= bB && aB >= bT;
    }
    function pointInRect(x, y, l, t, r, b) {
      return x >= l && x <= r && y >= t && y <= b;
    }
    function ccw(ax, ay, bx, by, cx, cy) {
      return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
    }
    function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
      return ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy)
        && ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy);
    }
    function segmentIntersectsRect(x1, y1, x2, y2, l, t, r, b) {
      if (pointInRect(x1, y1, l, t, r, b) || pointInRect(x2, y2, l, t, r, b)) return true;
      return segmentsIntersect(x1, y1, x2, y2, l, t, r, t)
        || segmentsIntersect(x1, y1, x2, y2, r, t, r, b)
        || segmentsIntersect(x1, y1, x2, y2, r, b, l, b)
        || segmentsIntersect(x1, y1, x2, y2, l, b, l, t);
    }
    function circleIn(cx, cy, rad, l, t, r, b) {
      const closestX = Math.max(l, Math.min(cx, r));
      const closestY = Math.max(t, Math.min(cy, b));
      return Math.hypot(cx - closestX, cy - closestY) <= rad;
    }

    return clonesNow.filter((clone) => {
      const strokeTol = (clone.thickness || clone.size || 0) / 2;
      const pad = padding + strokeTol;
      const L = rectLeft - pad, R = rectRight + pad, T = rectTop - pad, B = rectBottom + pad;

      // CÍRCULOS
      if (clone.type === 'circle' && clone.points && clone.points.length === 2) {
        const pts = clone.points.map(p =>
          (p.x <= 1 && p.y <= 1) ? ratioToDisplay(p.x, p.y, vm, imgW, imgH) : { x: p.x, y: p.y }
        );
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const radius = Math.sqrt(dx * dx + dy * dy) / 2;
        return circleIn(cx, cy, radius + strokeTol, L, T, R, B);
      }

      // RECTÁNGULOS
      if (clone.type === 'rectangle' && clone.points && clone.points.length === 2) {
        const pts = clone.points.map(p =>
          (p.x <= 1 && p.y <= 1) ? ratioToDisplay(p.x, p.y, vm, imgW, imgH) : { x: p.x, y: p.y }
        );
        const minX = Math.min(pts[0].x, pts[1].x) - strokeTol;
        const maxX = Math.max(pts[0].x, pts[1].x) + strokeTol;
        const minY = Math.min(pts[0].y, pts[1].y) - strokeTol;
        const maxY = Math.max(pts[0].y, pts[1].y) + strokeTol;
        return rectsOverlap(minX, minY, maxX, maxY, L, T, R, B);
      }

      // LÍNEAS / FLECHAS / SHAPES con array de puntos
      if (clone.points && Array.isArray(clone.points) && clone.points.length > 0) {
        const pts = clone.points.map(p =>
          (p.x <= 1 && p.y <= 1) ? ratioToDisplay(p.x, p.y, vm, imgW, imgH) : { x: p.x, y: p.y }
        );
        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        if (!rectsOverlap(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), L, T, R, B)) {
          return false;
        }
        for (let i = 0; i < pts.length - 1; i++) {
          if (segmentIntersectsRect(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, L, T, R, B)) return true;
        }
        if (clone.type === 'custom-shape' && pts.length > 2) {
          const first = pts[0];
          const last = pts[pts.length - 1];
          if (segmentIntersectsRect(last.x, last.y, first.x, first.y, L, T, R, B)) return true;
        }
        return pts.some(p => pointInRect(p.x, p.y, L, T, R, B));
      }

      // PUNTUALES (jugadores, bal�n, conos, textos)
      let elemX, elemY;
      if (typeof clone.x === 'number') {
        elemX = clone.x; elemY = clone.y;
      } else if (clone.xRatio != null) {
        const c = ratioToDisplay(clone.xRatio, clone.yRatio, vm, imgW, imgH);
        elemX = c.x; elemY = c.y;
      } else return false;

      const origW = clone.imageWidth || imgW;
      const origH = clone.imageHeight || imgH;
      const scale = ((imgW / origW) + (imgH / origH)) / 2;
      const half = ((clone.size || 24) * scale) / 2;
      return rectsOverlap(elemX - half, elemY - half, elemX + half, elemY + half, rectLeft, rectTop, rectRight, rectBottom);
    }).map(c => c.id);
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
      left: '0px', top: '0px', width: '0px', height: '0px',
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
    let sCx = 0, sCy = 0, cCx = 0, cCy = 0;
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
      return clientX >= r.left && clientX <= r.right
        && clientY >= r.top && clientY <= r.bottom;
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
        const dx = cCx - sCx, dy = cCy - sCy;
        if ((dx * dx + dy * dy) > THRESHOLD * THRESHOLD) {
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

  const [paletteEdit, setPaletteEdit] = useState({ visible: false, icon: null, paletteIndex: null });

  const handleLongPressPaletteIcon = (icon, paletteIndex) => {
    setPaletteEdit({ visible: true, icon: { ...icon, paletteIndex }, paletteIndex });
  };

  const handleApplyPaletteEdit = (iconEdited) => {
    handlePaletteIconEdit(iconEdited);
    setPaletteEdit({ visible: false, icon: null, paletteIndex: null });
  };

  const handleApplyTextEdit = useCallback((iconEdited) => {
    setClones(clones => clones.map(cl => cl.id === iconEdited.id ? { ...cl, ...iconEdited } : cl));
    setTextEditPanel({ visible: false, icon: null, isNew: false });
  }, []);

  // Vista previa en tiempo real para texto mientras se edita
  const handleTextPreviewChange = useCallback((previewIcon) => {
    if (!previewIcon || !previewIcon.id) return;
    setActualClones(prev => prev.map(cl =>
      cl.id === previewIcon.id ? { ...cl, ...previewIcon } : cl
    ));
  }, []);

  const handleAddText = useCallback(() => {
    const newTextId = `free-text-${Date.now()}`;
    const newTextElement = {
      id: newTextId,
      type: "free-text",
      xRatio: 0.5,
      yRatio: 0.5,
      value: "",
      color: "#000000",
      size: 18,
      backgroundColor: "transparent",
      zIndex: getNextZIndex('free-text')
    };

    setClones(prev => [newTextElement, ...prev]);

    // Abrir inmediatamente el panel de edicin para el nuevo texto (marcado como nuevo)
    setTimeout(() => {
      setTextEditPanel({ visible: true, icon: newTextElement, isNew: true });
      setSelectedCloneId(newTextId);
    }, 100);
  }, [getNextZIndex]);

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
    // Toggle eraser mode
    setEraserMode(prev => !prev);
    // Deseleccionar elementos
    setSelectedCloneId(null);
    clearMultiSelect();
  }, [clearMultiSelect]);

  // Funcin para actualizar estados relacionados cuando se elimina un elemento (sin hacer setClones)
  const handleElementDeleted = useCallback((cloneToDelete) => {
    if (!cloneToDelete) return;

    setSelectedCloneId(null);

    // Eliminar conectores relacionados
    setConnectors(prev => prev.filter(c => c.fromId !== cloneToDelete.id && c.toId !== cloneToDelete.id));

    // Si es un jugador del equipo, removerlo de selectedPlayerIds y aadirlo a availablePlayers
    if (cloneToDelete.playerData) {
      setSelectedPlayerIds(prev => prev.filter(uid => uid !== cloneToDelete.playerData.uniqueId));
      setAvailablePlayers(prev => [...prev, cloneToDelete.playerData]);
    }

    // Si es un miembro del cuerpo tcnico, removerlo de selectedStaffIds para que vuelva a la paleta
    if (cloneToDelete.type === 'staff' && cloneToDelete.staffRole) {
      setSelectedStaffIds(prev => prev.filter(staffId => staffId !== cloneToDelete.staffRole));
    }
  }, []);

  // Funcin para borrar un elemento por ID (incluyendo setClones)
  const eraseElementById = useCallback((id) => {
    const cloneToDelete = actualClonesRef.current.find(clone => clone.id === id);
    setClones(prev => prev.filter(clone => clone.id !== id));
    handleElementDeleted(cloneToDelete);
  }, [handleElementDeleted]); // Sin [clones] " usa actualClonesRef

  // Funcin auxiliar para distancia a segmento (debe ir antes de findElementAtPosition)
  const distanceToSegment = useCallback((px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }, []);

  // Funcin para encontrar elemento en una posicin (para la goma)
  // Tolerancia ajustada para detectar elementos bajo el dedo
  const findElementAtPosition = useCallback((touchX, touchY) => {
    const LINE_TOLERANCE = 8; // Tolerancia para lneas
    const ICON_TOLERANCE = 8; // Tolerancia para iconos

    // Buscar en clones (iconos, jugadores, textos, etc.)
    for (let i = actualClonesRef.current.length - 1; i >= 0; i--) {
      const clone = actualClonesRef.current[i];

      // Para elementos con puntos (lneas, formas)
      if (clone.points && clone.points.length > 0) {
        // Para lneas (rectas o curvas)
        if (clone.type === 'straight-line' || clone.type === 'straight-arrow' ||
          clone.type === 'curve-line' || clone.type === 'curve-arrow') {
          const pts = clone.points.map(p => ratioToDisplay(p.x, p.y, viewMode, imageWidth, imageHeight));

          // Verificar proximidad a cada segmento de la lnea
          for (let j = 0; j < pts.length - 1; j++) {
            const dist = distanceToSegment(touchX, touchY, pts[j].x, pts[j].y, pts[j + 1].x, pts[j + 1].y);
            // Solo borrar si est MUY cerca de la lnea
            if (dist <= LINE_TOLERANCE) {
              return clone.id;
            }
          }
        }
        // Para rectngulos - solo borrar si est sobre el borde, no dentro
        else if (clone.type === 'rectangle' && clone.points.length === 2) {
          const { x: p1x, y: p1y } = ratioToDisplay(clone.points[0].x, clone.points[0].y, viewMode, imageWidth, imageHeight);
          const { x: p2x, y: p2y } = ratioToDisplay(clone.points[1].x, clone.points[1].y, viewMode, imageWidth, imageHeight);
          const minX = Math.min(p1x, p2x);
          const maxX = Math.max(p1x, p2x);
          const minY = Math.min(p1y, p2y);
          const maxY = Math.max(p1y, p2y);

          // Verificar si est sobre algn borde del rectngulo (no dentro)
          const onTopEdge = touchY >= minY - LINE_TOLERANCE && touchY <= minY + LINE_TOLERANCE && touchX >= minX && touchX <= maxX;
          const onBottomEdge = touchY >= maxY - LINE_TOLERANCE && touchY <= maxY + LINE_TOLERANCE && touchX >= minX && touchX <= maxX;
          const onLeftEdge = touchX >= minX - LINE_TOLERANCE && touchX <= minX + LINE_TOLERANCE && touchY >= minY && touchY <= maxY;
          const onRightEdge = touchX >= maxX - LINE_TOLERANCE && touchX <= maxX + LINE_TOLERANCE && touchY >= minY && touchY <= maxY;

          if (onTopEdge || onBottomEdge || onLeftEdge || onRightEdge) {
            return clone.id;
          }
        }
        // Para crculos - detectar si est sobre el borde (igual que rectngulo)
        else if (clone.type === 'circle' && clone.points.length === 2) {
          const { x: centerX, y: centerY } = ratioToDisplay(clone.points[0].x, clone.points[0].y, viewMode, imageWidth, imageHeight);
          const { x: edgeX, y: edgeY } = ratioToDisplay(clone.points[1].x, clone.points[1].y, viewMode, imageWidth, imageHeight);
          const radius = Math.hypot(edgeX - centerX, edgeY - centerY);
          const distFromCenter = Math.hypot(touchX - centerX, touchY - centerY);

          // Detectar si est en la zona del borde del crculo (como rectngulo)
          // Zona externa: desde radius - tolerancia hasta radius + tolerancia
          const innerRadius = Math.max(0, radius - LINE_TOLERANCE);
          const outerRadius = radius + LINE_TOLERANCE;

          if (distFromCenter >= innerRadius && distFromCenter <= outerRadius) {
            return clone.id;
          }
        }
        // Para formas personalizadas - solo si est sobre un borde
        else if (clone.type === 'custom-shape') {
          const pts = clone.points.map(p => ratioToDisplay(p.x, p.y, viewMode, imageWidth, imageHeight));

          // Verificar si est cerca de algn borde de la forma
          for (let j = 0; j < pts.length; j++) {
            const nextIdx = (j + 1) % pts.length;
            const dist = distanceToSegment(touchX, touchY, pts[j].x, pts[j].y, pts[nextIdx].x, pts[nextIdx].y);
            if (dist <= LINE_TOLERANCE) {
              return clone.id;
            }
          }
        }
      }
      // Para elementos con posicin (iconos, jugadores, textos)
      else if (clone.xRatio !== undefined && clone.yRatio !== undefined) {
        const { x: elemX, y: elemY } = ratioToDisplay(clone.xRatio, clone.yRatio, viewMode, imageWidth, imageHeight);

        // Para textos, usar un rea ms grande basada en el texto
        if (clone.type === 'free-text') {
          const textLength = (clone.value || '').length;
          const fontSize = clone.size || 18;
          const textWidth = Math.max(textLength * fontSize * 0.6, 40);
          const textHeight = fontSize + 10;

          if (touchX >= elemX - textWidth / 2 - ICON_TOLERANCE && touchX <= elemX + textWidth / 2 + ICON_TOLERANCE &&
            touchY >= elemY - textHeight / 2 - ICON_TOLERANCE && touchY <= elemY + textHeight / 2 + ICON_TOLERANCE) {
            return clone.id;
          }
        } else {
          // Para iconos y jugadores
          const elemSize = clone.size || 40;
          const halfSize = elemSize / 2;

          // Solo borrar si el dedo est DENTRO del rea del elemento
          if (touchX >= elemX - halfSize - ICON_TOLERANCE && touchX <= elemX + halfSize + ICON_TOLERANCE &&
            touchY >= elemY - halfSize - ICON_TOLERANCE && touchY <= elemY + halfSize + ICON_TOLERANCE) {
            return clone.id;
          }
        }
      }
    }
    return null;
  }, [imageWidth, imageHeight, distanceToSegment]); // Sin [clones] " usa actualClonesRef

  // Ref para trackear elementos ya borrados durante un arrastre
  const erasedElementsRef = useRef(new Set());

  // Handler para el inicio del borrado (touch start)
  const handleEraserStart = useCallback((e) => {
    if (!eraserMode) return;
    erasedElementsRef.current = new Set();
    const touchX = e.nativeEvent.locationX;
    const touchY = e.nativeEvent.locationY;
    const elementId = findElementAtPosition(touchX, touchY);
    if (elementId) {
      eraseElementById(elementId);
      erasedElementsRef.current.add(elementId);
    }
  }, [eraserMode, findElementAtPosition, eraseElementById]);

  // Handler para el movimiento del borrado (touch move)
  const handleEraserMove = useCallback((e) => {
    if (!eraserMode) return;
    const touchX = e.nativeEvent.locationX;
    const touchY = e.nativeEvent.locationY;
    const elementId = findElementAtPosition(touchX, touchY);
    if (elementId && !erasedElementsRef.current.has(elementId)) {
      eraseElementById(elementId);
      erasedElementsRef.current.add(elementId);
    }
  }, [eraserMode, findElementAtPosition, eraseElementById]);

  // Handler para el fin del borrado (touch end)
  const handleEraserEnd = useCallback(() => {
    erasedElementsRef.current = new Set();
  }, []);

  // Ref para almacenar el estado de arrastre de elementos
  const elementDragState = useRef(null);
  // Ref para detectar taps (toque corto sin movimiento) en el campo
  const fieldTouchStartRef = useRef(null);

  const releaseElementDragLock = useCallback((dragState = elementDragState.current) => {
    if (dragState?.dragKey) {
      releaseBoardDrag(dragStart, dragState.dragKey);
    }
  }, [dragStart]);

  const findInteractiveCloneAtPosition = useCallback((touchX, touchY) => {
    return findTopBoardCloneAtPoint(
      actualClonesRef.current,
      touchX,
      touchY,
      viewMode,
      imageWidth,
      imageHeight,
      standardSize,
      selectedCloneId
    );
  }, [viewMode, imageWidth, imageHeight, standardSize, selectedCloneId]);

  // Handler para iniciar arrastre de cualquier elemento existente si su detector especfico no captura el gesto.
  const handleElementDragStart = useCallback((e) => {
    if (multiSelectMode && selectionInteractionMode === 'select') return false;

    const { locationX, locationY, pageX, pageY } = e.nativeEvent;
    const hitClone = findInteractiveCloneAtPosition(locationX, locationY);
    if (!hitClone) {
      elementDragState.current = null;
      setDraggingOutside(false);
      return false;
    }

    const isMultiSelected = selectedCloneIdsSet ? selectedCloneIdsSet.has(hitClone.id) : selectedCloneIds.includes(hitClone.id);
    if (multiSelectMode && selectionInteractionMode === 'move' && !isMultiSelected) {
      elementDragState.current = null;
      setDraggingOutside(false);
      return false;
    }

    const selectedIds = ALLOW_MULTI_ELEMENT_DRAG && multiSelectMode && selectionInteractionMode === 'move' && isMultiSelected
      ? selectedCloneIds.filter(id => actualClonesRef.current.some(clone => clone.id === id && !clone.locked))
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
  }, [multiSelectMode, selectionInteractionMode, findInteractiveCloneAtPosition, selectedCloneIdsSet, selectedCloneIds, dragStart, setSelectedCloneId, cancelSelectionRect]);

  // Handler para mover elementos existentes
  const handleElementDragMove = useCallback((e) => {
    if (!elementDragState.current || !isBoardDragOwner(dragStart, elementDragState.current.dragKey)) return;

    const { pageX, pageY } = e.nativeEvent;
    const { selectedIds, initialPositions, startPageX, startPageY } = elementDragState.current;
    const dxDisplay = (pageX - startPageX) / zoomLevel;
    const dyDisplay = (pageY - startPageY) / zoomLevel;
    const { dxRatio, dyRatio } = deltaToRatio(dxDisplay, dyDisplay, viewMode, imageWidth, imageHeight);

    const anyOutside = selectedIds.some(selectedId => {
      const clone = actualClonesRef.current.find(item => item.id === selectedId);
      if (!clone || clone.locked) return false;
      const candidate = applyBoardDragSnapshot(clone, initialPositions[selectedId], dxRatio, dyRatio, dxDisplay, dyDisplay);
      return isBoardCloneOutsideForDelete(candidate, viewMode, imageWidth, imageHeight);
    });
    setDraggingOutside(anyOutside);

    setClones(prev => prev.map(c => {
      if (!selectedIds.includes(c.id) || c.locked) return c;
      return applyBoardDragSnapshot(c, initialPositions[c.id], dxRatio, dyRatio, dxDisplay, dyDisplay);
    }));
  }, [viewMode, imageWidth, imageHeight, zoomLevel, dragStart, setClones]);

  // Handler para finalizar arrastre de elementos
  const handleElementDragEnd = useCallback(() => {
    const dragState = elementDragState.current;
    elementDragState.current = null;
    setDraggingOutside(false);
    if (!dragState) return;
    if (!isBoardDragOwner(dragStart, dragState.dragKey)) return;

    setClones(prev => {
      const deleted = [];
      const remaining = prev.filter(clone => {
        if (!dragState.selectedIds.includes(clone.id) || clone.locked) return true;
        if (clone.points && Array.isArray(clone.points) && clone.points.length >= 2) {
          const outside = areAllPointsOutside(clone.points, viewMode, imageWidth, imageHeight);
          if (outside) deleted.push(clone);
          return !outside;
        }
        if (clone.xRatio !== undefined) {
          const outside = isOutsideVisibleField(clone.xRatio, clone.yRatio, viewMode, imageWidth, imageHeight);
          if (outside) deleted.push(clone);
          return !outside;
        }
        return true;
      });
      if (deleted.length > 0) {
        setTimeout(() => deleted.forEach(clone => handleElementDeleted(clone)), 0);
      }
      return deleted.length > 0 ? remaining : prev;
    });

    releaseElementDragLock(dragState);
    if (saveClonesHistory) saveClonesHistory();
  }, [viewMode, imageWidth, imageHeight, dragStart, setClones, handleElementDeleted, releaseElementDragLock, saveClonesHistory]);

  // Funciones para dibujar lneas rectas
  const handleStraightLineDrawStart = useCallback((e) => {
    if (!drawingStraightArrow && !drawingStraightLine &&
      !drawingCircle && !drawingRectangle) return;

    const { locationX, locationY } = e.nativeEvent;
    setStraightLineStart(displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight));
    setTemporaryLinePoints([displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight)]);
  }, [drawingStraightArrow, drawingStraightLine, drawingCircle, drawingRectangle, viewMode, imageWidth, imageHeight]);

  const handleStraightLineDrawMove = useCallback((e) => {
    if ((!drawingStraightArrow && !drawingStraightLine &&
      !drawingCircle && !drawingRectangle) || !straightLineStart) return;

    const { locationX, locationY } = e.nativeEvent;
    setStraightLineEnd(displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight));
    setTemporaryLinePoints([
      straightLineStart,
      displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight)
    ]);
  }, [drawingStraightArrow, drawingStraightLine, drawingCircle, drawingRectangle, straightLineStart, viewMode, imageWidth, imageHeight]);

  // 5. Reemplazar la funcin handleStraightLineDrawEnd
  const handleStraightLineDrawEnd = () => {
    if ((!drawingStraightArrow && !drawingStraightLine &&
      !drawingCircle && !drawingRectangle) ||
      !straightLineStart || !straightLineEnd) {
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
      { x: straightLineEnd.x, y: straightLineEnd.y }
    ];

    // Obtener el icono de la paleta para usar su Configuracin
    const paletteIcon = paletteIcons.find(ic => ic.type === type);
    const paletteIndex = paletteIcons.findIndex(ic => ic.type === type);

    const newObj = {
      id: `${type}-${Date.now()}`,
      type: type,
      color: paletteIcon?.color || '#000000',
      thickness: paletteIcon?.thickness || (type === 'circle' ? 5 : arrowThickness),
      lineType: lineType,
      dotSize: dotSize,
      dotSpacing: dotSpacing,
      // Relleno para formas geomtricas
      fillColor: (pendingLineAction?.icon?.fillColor !== undefined) ? pendingLineAction.icon.fillColor : (paletteIcon?.fillColor || 'transparent'),
      size: standardSize, // Usar standardSize directamente
      points: points,
      imageWidth,
      imageHeight,
      xRatio: 0.5,
      yRatio: 0.5,
      paletteIndex: paletteIndex >= 0 ? paletteIndex : undefined,
      zIndex: getNextZIndex(type)
    };

    setClones(prev => [newObj, ...prev]);

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
  const handleCurveDrawStart = useCallback((e) => {
    if (!drawingCurveLine && !drawingCurveArrow) return;

    const { locationX, locationY } = e.nativeEvent;
    const newPoint = displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight);

    setCurvePoints([newPoint]);
    setIsDrawing(true);
  }, [drawingCurveLine, drawingCurveArrow, viewMode, imageWidth, imageHeight]);

  const handleCurveDrawMove = useCallback((e) => {
    if ((!drawingCurveLine && !drawingCurveArrow) || !isDrawing) return;

    const { locationX, locationY } = e.nativeEvent;
    const newPoint = displayToRatio(locationX, locationY, viewMode, imageWidth, imageHeight);

    setCurvePoints(prev => [...prev, newPoint]);
  }, [drawingCurveLine, drawingCurveArrow, isDrawing, viewMode, imageWidth, imageHeight]);

  // 6. Reemplazar la funcin handleCurveDrawEnd
  const handleCurveDrawEnd = () => {
    if ((!drawingCurveLine && !drawingCurveArrow) || !isDrawing || curvePoints.length < 2) {
      setCurvePoints([]);
      setIsDrawing(false);
      return;
    }

    const type = drawingCurveArrow ? 'curve-arrow' : 'curve-line';

    // Obtener el icono de la paleta para usar su Configuracin
    const paletteIcon = paletteIcons.find(ic => ic.type === type);
    const paletteIndex = paletteIcons.findIndex(ic => ic.type === type);

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
      zIndex: getNextZIndex(type)
    };

    setClones(prev => [newObj, ...prev]);

    setCurvePoints([]);
    setIsDrawing(false);
  };

  // 7. Funcin para renderizar lneas rectas directamente en SVG
  function renderStraightLine({ icon, imageWidth, imageHeight, selectedCloneId, selectedCloneIds = [], selectedCloneIdsSet, multiSelectMode = false }) {
    if (!icon.points || icon.points.length !== 2) return null;

    const originalWidth = icon.imageWidth || imageWidth;
    const originalHeight = icon.imageHeight || imageHeight;
    const widthRatio = imageWidth / originalWidth;
    const heightRatio = imageHeight / originalHeight;
    const scale = (widthRatio + heightRatio) / 2;

    const pts = icon.points.map(p => ({
      x: p.x * imageWidth,
      y: p.y * imageHeight,
    }));

    const x1 = pts[0].x;
    const y1 = pts[0].y;
    const x2 = pts[1].x;
    const y2 = pts[1].y;

    // Grosor reducido para lneas ms finas
    const thickness = (icon.thickness || 1) * scale * 0.7;

    // Determinar si est seleccionado en modo multi-seleccin (O(1) con Set)
    const isMultiSelected = multiSelectMode && (selectedCloneIdsSet ? selectedCloneIdsSet.has(icon.id) : selectedCloneIds.includes(icon.id));

    // Crear elementos SVG para la lnea
    const lineElements = [];

    // Calcular punto final de la lnea si es una flecha
    let lineEndX = x2;
    let lineEndY = y2;
    let arrowPoints = '';

    if (icon.type === 'straight-arrow') {
      const arrowData = getArrowHeadForStraightLine(
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        icon.size || 24,
        0.5,
        thickness
      );
      arrowPoints = arrowData.arrowPoints;
      lineEndX = arrowData.lineEnd.x;
      lineEndY = arrowData.lineEnd.y;
    }

    // Si est multi-seleccionada, aadir una capa exterior para destacar
    if (isMultiSelected) {
      lineElements.push(
        <Path
          key={`line-highlight-${icon.id}`}
          d={`M${x1},${y1} L${lineEndX},${lineEndY}`}
          stroke="#3498db"
          strokeWidth={thickness + 6}
          strokeOpacity={0.25}
          fill="none"
          strokeLinecap="round"
        />
      );
    }

    // Lnea principal (con o sin punteado)
    const lineStrokeDasharray = icon.lineType === 'dotted'
      ? `${icon.dotSize || 2}, ${icon.dotSpacing || 4}`
      : null;

    lineElements.push(
      <Path
        key={`line-${icon.id}-${icon.color}-${thickness}-${icon.lineType || 'solid'}-${icon.dotSize || 2}-${icon.dotSpacing || 4}`}
        d={`M${x1},${y1} L${lineEndX},${lineEndY}`}
        stroke={isMultiSelected ? '#3498db' : icon.color}
        strokeWidth={thickness}
        strokeDasharray={lineStrokeDasharray}
        fill="none"
        strokeLinecap="round"
      />
    );

    // Punta de flecha si es necesario
    if (icon.type === 'straight-arrow') {
      lineElements.push(
        <Polygon
          key={`arrow-${icon.id}`}
          points={arrowPoints}
          fill={icon.color}
          strokeLinejoin="round"
        />
      );
    }

    return lineElements;
  }

  const handleDeleteClone = useCallback((id) => {
    const cloneToDelete = actualClonesRef.current.find(clone => clone.id === id);
    setClones(prev => prev.filter(clone => clone.id !== id));
    setSelectedCloneId(null);

    // Eliminar conectores relacionados con el elemento eliminado
    setConnectors(prev => prev.filter(c => c.fromId !== id && c.toId !== id));

    // Si es un jugador del equipo, removerlo de selectedPlayerIds y aadirlo a availablePlayers
    if (cloneToDelete && cloneToDelete.playerData) {
      setSelectedPlayerIds(prev => prev.filter(uid => uid !== cloneToDelete.playerData.uniqueId));
      setAvailablePlayers(prev => [...prev, cloneToDelete.playerData]);
    }

    // Si es un miembro del cuerpo tcnico, removerlo de selectedStaffIds para que vuelva a la paleta
    if (cloneToDelete && cloneToDelete.type === 'staff' && cloneToDelete.staffRole) {
      setSelectedStaffIds(prev => prev.filter(staffId => staffId !== cloneToDelete.staffRole));
    }
  }, []); // Sin [clones] " usa actualClonesRef para identidad estable

  // Funcin para duplicar un elemento
  const handleDuplicateClone = useCallback((id) => {
    const elementToDuplicate = actualClonesRef.current.find(clone => clone.id === id);

    if (elementToDuplicate) {
      // Crear una copia con un nuevo ID y ligeramente desplazada
      const duplicatedElement = {
        ...elementToDuplicate,
        id: `${elementToDuplicate.type}-${Date.now()}`, // Generar un nuevo ID
      };

      // Desplazar ligeramente el elemento duplicado segn su tipo
      if (duplicatedElement.points && duplicatedElement.points.length > 0) {
        // Para formas con puntos (lneas, polgonos, etc.)
        duplicatedElement.points = duplicatedElement.points.map(point => ({
          x: Math.min(1, point.x + 0.05), // Desplazar a la derecha un 5%
          y: Math.min(1, point.y + 0.05)  // Desplazar hacia abajo un 5%
        }));
      } else {
        // Para elementos con posicin por ratio (iconos, textos, etc.)
        duplicatedElement.xRatio = Math.min(1, (duplicatedElement.xRatio || 0.5) + 0.05);
        duplicatedElement.yRatio = Math.min(1, (duplicatedElement.yRatio || 0.5) + 0.05);
      }

      // Aadir el elemento duplicado al array de clones (con nuevo zIndex)
      const duplicatedWithZIndex = { ...duplicatedElement, zIndex: getNextZIndex(duplicatedElement.type) };
      setClones(prev => [duplicatedWithZIndex, ...prev]);

      // Seleccionar el nuevo elemento duplicado
      setSelectedCloneId(duplicatedWithZIndex.id);
    }
  }, [getNextZIndex]); // Sin [clones] " usa actualClonesRef
  const duplicateSelectedElements = useCallback(() => {
    if (!selectedCloneIds || selectedCloneIds.length === 0) return;

    // Obtener todos los elementos seleccionados
    const selectedElements = selectedCloneIds
      .map(id => actualClonesRef.current.find(c => c.id === id))
      .filter(Boolean);

    if (selectedElements.length === 0) return;

    // Calcular el centroide del grupo para mantener posiciones relativas
    let sumX = 0, sumY = 0, count = 0;
    selectedElements.forEach(el => {
      if (el.points && el.points.length > 0) {
        // Para elementos con puntos, usar el centroide de los puntos
        el.points.forEach(p => {
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
        duplicatedElement.points = duplicatedElement.points.map(point => ({
          x: Math.max(0, Math.min(1, point.x + offsetX)),
          y: Math.max(0, Math.min(1, point.y + offsetY))
        }));
      } else {
        // Mantener la posicin relativa: aplicar el mismo offset
        duplicatedElement.xRatio = Math.max(0, Math.min(1, (duplicatedElement.xRatio || 0.5) + offsetX));
        duplicatedElement.yRatio = Math.max(0, Math.min(1, (duplicatedElement.yRatio || 0.5) + offsetY));
      }

      return duplicatedElement;
    });

    if (duplicates.length === 0) return;

    setClones(prev => [...duplicates, ...prev]);
    setSelectedCloneIds(duplicates.map(d => d.id));
    setSelectedCloneId(duplicates[0].id);
  }, [selectedCloneIds, getNextZIndex]); // Sin [clones] " usa actualClonesRef

  // Funcin para rotar elementos seleccionados alrededor del centroide del grupo
  const rotateSelectedElements = useCallback((angleDegrees = 15) => {
    if (!selectedCloneIds || selectedCloneIds.length === 0) return;

    // Obtener todos los elementos seleccionados
    const selectedElements = selectedCloneIds
      .map(id => actualClonesRef.current.find(c => c.id === id))
      .filter(Boolean);

    if (selectedElements.length === 0) return;

    // Calcular el centroide del grupo
    let sumX = 0, sumY = 0, count = 0;
    selectedElements.forEach(el => {
      if (el.points && el.points.length > 0) {
        el.points.forEach(p => {
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

    setClones(prev => prev.map(c => {
      if (!selectedCloneIds.includes(c.id)) return c;

      if (c.points && c.points.length > 0) {
        // Rotar cada punto alrededor del centroide
        const newPoints = c.points.map(p => {
          const dx = p.x - centroidX;
          const dy = p.y - centroidY;
          const newX = centroidX + (dx * cosAngle - dy * sinAngle);
          const newY = centroidY + (dx * sinAngle + dy * cosAngle);
          return {
            x: Math.max(0, Math.min(1, newX)),
            y: Math.max(0, Math.min(1, newY))
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
          yRatio: Math.max(0, Math.min(1, newY))
        };
      }
    }));
  }, [selectedCloneIds]); // Sin [clones] " usa actualClonesRef

  // Funcin para alternar bloquear/desbloquear todos los seleccionados
  const toggleLockSelected = useCallback(() => {
    if (!selectedCloneIds || selectedCloneIds.length === 0) return;

    const anyUnlocked = selectedCloneIds.some(id => {
      const c = actualClonesRef.current.find(x => x.id === id);
      return c && c.locked !== true;
    });

    setClones(prev => prev.map(c => {
      if (selectedCloneIds.includes(c.id)) {
        const isLocking = anyUnlocked;
        return {
          ...c,
          locked: isLocking,
          zIndex: isLocking ? 1 : (c.originalZIndex || getZIndexBaseForType(c.type)),
          originalZIndex: isLocking ? (c.zIndex || getZIndexBaseForType(c.type)) : c.originalZIndex
        };
      }
      return c;
    }));
  }, [selectedCloneIds]); // Sin [clones] " usa actualClonesRef

  // Funcin para traer los seleccionados al frente
  const bringSelectedToFront = useCallback(() => {
    if (!selectedCloneIds || selectedCloneIds.length === 0) return;

    setClones(prev => {
      const maxZIndex = Math.max(...prev.map(c => c.zIndex || 0), 0);
      const selected = prev.filter(c => selectedCloneIds.includes(c.id));
      const others = prev.filter(c => !selectedCloneIds.includes(c.id));
      return [
        ...others,
        ...selected.map((s, i) => ({ ...s, zIndex: maxZIndex + 1000 + i }))
      ];
    });
  }, [selectedCloneIds]);

  // Funcin para enviar los seleccionados al fondo
  const sendSelectedToBack = useCallback(() => {
    if (!selectedCloneIds || selectedCloneIds.length === 0) return;

    setClones(prev => {
      const selected = prev.filter(c => selectedCloneIds.includes(c.id));
      const others = prev.filter(c => !selectedCloneIds.includes(c.id));
      return [
        ...selected.map(s => ({ ...s, zIndex: 1 })),
        ...others
      ];
    });
  }, [selectedCloneIds]);

  // Funcin para aumentar el tamao de un elemento
  const handleIncreaseSize = useCallback((iconId) => {
    if (!iconId) return;

    setClones(prev => prev.map(c => {
      if (c.id === iconId) {
        // Para circle, rectangle, custom-shape: escalar puntos desde el centro
        if ((c.type === 'circle' || c.type === 'rectangle' || c.type === 'custom-shape') && c.points && c.points.length >= 2) {
          const cx = c.points.reduce((s, p) => s + p.x, 0) / c.points.length;
          const cy = c.points.reduce((s, p) => s + p.y, 0) / c.points.length;
          const sf = 1.1;
          return {
            ...c,
            points: c.points.map(p => ({
              x: Math.max(0, Math.min(1, cx + (p.x - cx) * sf)),
              y: Math.max(0, Math.min(1, cy + (p.y - cy) * sf))
            }))
          };
        }

        // Para lneas/flechas, aumentamos el grosor
        if (c.type === 'straight-line' || c.type === 'straight-arrow' || c.type === 'curve-line' || c.type === 'curve-arrow') {
          return {
            ...c,
            thickness: Math.min(20, (c.thickness || 2) + 1)
          };
        }

        // Para iconos y otros elementos, aumentamos el tamao (sin lmite mximo)
        return {
          ...c,
          size: (c.size || standardSize) + 2
        };
      }
      return c;
    }));
  }, [standardSize]);

  // Funcin para disminuir el tamao de un elemento
  const handleDecreaseSize = useCallback((iconId) => {
    if (!iconId) return;

    setClones(prev => prev.map(c => {
      if (c.id === iconId) {
        // Para circle, rectangle, custom-shape: escalar puntos hacia el centro
        if ((c.type === 'circle' || c.type === 'rectangle' || c.type === 'custom-shape') && c.points && c.points.length >= 2) {
          const cx = c.points.reduce((s, p) => s + p.x, 0) / c.points.length;
          const cy = c.points.reduce((s, p) => s + p.y, 0) / c.points.length;
          const sf = 0.9;
          const newPts = c.points.map(p => ({
            x: Math.max(0, Math.min(1, cx + (p.x - cx) * sf)),
            y: Math.max(0, Math.min(1, cy + (p.y - cy) * sf))
          }));
          // Verificar tamao mnimo
          const xs = newPts.map(p => p.x);
          const ys = newPts.map(p => p.y);
          const w = Math.max(...xs) - Math.min(...xs);
          const h = Math.max(...ys) - Math.min(...ys);
          if (w < 0.02 || h < 0.02) return c;
          return { ...c, points: newPts };
        }

        // Para lneas/flechas, disminuimos el grosor
        if (c.type === 'straight-line' || c.type === 'straight-arrow' || c.type === 'curve-line' || c.type === 'curve-arrow') {
          return {
            ...c,
            thickness: Math.max(1, (c.thickness || 2) - 1)
          };
        }

        // Para iconos y otros elementos, disminuimos el tamao
        return {
          ...c,
          size: Math.max(10, (c.size || standardSize) - 2)
        };
      }
      return c;
    }));
  }, [standardSize]);

  // Funcin para bloquear/desbloquear un elemento
  const handleToggleLock = useCallback((iconId) => {
    if (!iconId) return;

    setClones(prev => prev.map(c => {
      if (c.id === iconId) {
        const isLocking = c.locked !== true;
        return {
          ...c,
          locked: isLocking,
          zIndex: isLocking ? 1 : (c.originalZIndex || getZIndexBaseForType(c.type)),
          originalZIndex: isLocking ? (c.zIndex || getZIndexBaseForType(c.type)) : c.originalZIndex
        };
      }
      return c;
    }));
  }, []);

  // Funcin para subir un elemento a la primera capa (solo dentro de su grupo)
  const handleBringToFront = useCallback((iconId) => {
    if (!iconId) return;

    setClones(prev => {
      const element = prev.find(c => c.id === iconId);
      if (!element) return prev;

      const base = getZIndexBaseForType(element.type);
      // Filtrar solo elementos del mismo grupo de tipo
      const sameGroup = prev.filter(c => getZIndexBaseForType(c.type) === base);
      const maxGroupZIndex = Math.max(...sameGroup.map(c => c.zIndex || base), base);
      const newZIndex = maxGroupZIndex + 1;

      const withoutElement = prev.filter(c => c.id !== iconId);
      return [...withoutElement, { ...element, zIndex: newZIndex }];
    });
  }, []);

  // Funcin para enviar un elemento al fondo (solo dentro de su grupo)
  const handleSendToBack = useCallback((iconId) => {
    if (!iconId) return;

    setClones(prev => {
      const element = prev.find(c => c.id === iconId);
      if (!element) return prev;

      const base = getZIndexBaseForType(element.type);
      // Filtrar solo elementos del mismo grupo de tipo
      const sameGroup = prev.filter(c => getZIndexBaseForType(c.type) === base && c.id !== iconId);
      const minGroupZIndex = sameGroup.length > 0 ? Math.min(...sameGroup.map(c => c.zIndex || base)) : base;
      const newZIndex = Math.max(minGroupZIndex - 1, base);

      const withoutElement = prev.filter(c => c.id !== iconId);
      return [{ ...element, zIndex: newZIndex }, ...withoutElement];
    });
  }, []);

  // Funcin para desbloquear un elemento desde el panel de elementos bloqueados
  const handleUnlockFromPanel = useCallback((iconId) => {
    setClones(prev => prev.map(clone =>
      clone.id === iconId
        ? {
          ...clone,
          locked: false,
          // Restaurar zIndex original o usar valor por defecto segn tipo
          zIndex: clone.originalZIndex || getZIndexBaseForType(clone.type)
        }
        : clone
    ));
  }, []);

  // 8. Funcin para renderizar lneas curvas directamente en SVG
  function renderCurveLine({ icon, imageWidth, imageHeight, selectedCloneId, selectedCloneIds = [], selectedCloneIdsSet, multiSelectMode = false }) {
    if (!icon.points || icon.points.length < 2) return null;

    const originalWidth = icon.imageWidth || imageWidth;
    const originalHeight = icon.imageHeight || imageHeight;
    const widthRatio = imageWidth / originalWidth;
    const heightRatio = imageHeight / originalHeight;
    const scale = (widthRatio + heightRatio) / 2;

    // Transformar puntos relativos a coordenadas absolutas
    const pts = icon.points.map(p => ({
      x: p.x * imageWidth,
      y: p.y * imageHeight,
    }));

    // Determinar si est seleccionado en modo multi-seleccin (O(1) con Set)
    const isMultiSelected = multiSelectMode && (selectedCloneIdsSet ? selectedCloneIdsSet.has(icon.id) : selectedCloneIds.includes(icon.id));

    // Generar path para SVG
    const pathData = generateCurvePath(pts);

    // Grosor reducido para lneas ms finas
    const thickness = (icon.thickness || 1) * scale * 0.7;

    // Encontrar los dos ltimos puntos significativos para calcular la direccin de la flecha
    let lastIdx = pts.length - 1;
    let secondLastIdx = lastIdx - 1;

    // Si los ltimos puntos estn muy cerca, buscar uno ms alejado para mejor direccin
    while (secondLastIdx >= 0 && lastIdx > 0) {
      const dist = Math.sqrt(
        Math.pow(pts[lastIdx].x - pts[secondLastIdx].x, 2) +
        Math.pow(pts[lastIdx].y - pts[secondLastIdx].y, 2)
      );
      if (dist > 5) break; // Al menos 5 pxeles de diferencia
      secondLastIdx--;
    }

    if (secondLastIdx < 0) secondLastIdx = 0;

    const lastPoint = pts[lastIdx];
    const secondLastPoint = pts[secondLastIdx];

    // Crear elementos SVG para la curva
    const curveElements = [];

    // Si est multi-seleccionada, aadir una capa exterior para destacar
    if (isMultiSelected) {
      curveElements.push(
        <Path
          key={`curve-highlight-${icon.id}`}
          d={pathData}
          stroke="#3498db"
          strokeWidth={thickness + 6}
          strokeOpacity={0.25}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    // Lnea principal (con o sin punteado)
    const curveStrokeDasharray = icon.lineType === 'dotted'
      ? `${icon.dotSize || 2}, ${icon.dotSpacing || 4}`
      : null;

    curveElements.push(
      <Path
        key={`curve-${icon.id}-${icon.color}-${thickness}-${icon.lineType || 'solid'}-${icon.dotSize || 2}-${icon.dotSpacing || 4}`}
        d={pathData}
        stroke={isMultiSelected ? '#3498db' : icon.color}
        strokeWidth={thickness}
        strokeDasharray={curveStrokeDasharray}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );

    // Punta de flecha si es necesario - CORRECCIÓN AQUÍ
    if (icon.type === 'curve-arrow' && pts.length >= 2) {
      const arrowData = getArrowHeadForStraightLine(
        secondLastPoint,
        lastPoint,
        icon.size || 24, // Usar icon.size en lugar de solo icon
        0.5,
        thickness
      );

      // Recalcular pathData sin el ltimo segmento completo, terminando en lineEnd
      let adjustedPathData = pathData;
      if (pts.length > 1) {
        // Reconstruir el path hasta el penltimo punto y luego hasta lineEnd
        adjustedPathData = `M${pts[0].x},${pts[0].y}`;
        for (let i = 1; i < pts.length - 1; i++) {
          adjustedPathData += ` L${pts[i].x},${pts[i].y}`;
        }
        adjustedPathData += ` L${arrowData.lineEnd.x},${arrowData.lineEnd.y}`;
      }

      // Actualizar el path de la curva para terminar antes de la flecha
      if (icon.lineType === 'dotted') {
        // Reemplazar el ltimo elemento de punteado
        curveElements[curveElements.length - 1] = (
          <Path
            key={`dotted-curve-${icon.id}`}
            d={adjustedPathData}
            stroke={icon.color}
            strokeWidth={thickness}
            strokeDasharray={`${icon.dotSize || 2}, ${icon.dotSpacing || 4}`}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      } else {
        // Reemplazar el ltimo elemento slido
        curveElements[curveElements.length - 1] = (
          <Path
            key={`curve-${icon.id}`}
            d={adjustedPathData}
            stroke={icon.color}
            strokeWidth={thickness}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      }

      curveElements.push(
        <Polygon
          key={`curve-arrow-${icon.id}`}
          points={arrowData.arrowPoints}
          fill={icon.color}
          strokeLinejoin="round"
        />
      );
    }

    return curveElements;
  }

  // 9. Funcin para renderizar custom-shape directamente en SVG
  function renderCustomShape({ icon, imageWidth, imageHeight, selectedCloneId, selectedCloneIds = [], selectedCloneIdsSet, multiSelectMode = false }) {
    if (!icon.points || icon.points.length < 2) return null;

    const originalWidth = icon.imageWidth || imageWidth;
    const originalHeight = icon.imageHeight || imageHeight;
    const widthRatio = imageWidth / originalWidth;
    const heightRatio = imageHeight / originalHeight;
    const scale = (widthRatio + heightRatio) / 2;

    // Transformar puntos relativos a coordenadas absolutas
    const pts = icon.points.map(p => ({
      x: p.x * imageWidth,
      y: p.y * imageHeight,
    }));

    // Determinar si est seleccionado en modo multi-seleccin (O(1) con Set)
    const isMultiSelected = multiSelectMode && (selectedCloneIdsSet ? selectedCloneIdsSet.has(icon.id) : selectedCloneIds.includes(icon.id));

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
        />
      );
    }

    // Lnea principal (con o sin punteado)
    const customShapeStrokeDasharray2 = icon.lineType === 'dotted'
      ? `${icon.dotSize || 2}, ${icon.dotSpacing || 4}`
      : null;

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
      />
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
            if (oldClone.color !== newClone.color ||
              oldClone.size !== newClone.size ||
              oldClone.thickness !== newClone.thickness ||
              oldClone.lineType !== newClone.lineType ||
              oldClone.fillColor !== newClone.fillColor ||
              oldClone.dotSize !== newClone.dotSize ||
              oldClone.dotSpacing !== newClone.dotSpacing ||
              oldClone.numberColor !== newClone.numberColor ||
              oldClone.textColor !== newClone.textColor ||
              oldClone.textBackgroundColor !== newClone.textBackgroundColor ||
              oldClone._lastUpdate !== newClone._lastUpdate) {
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
        const coords = fromRatioCoords(clone.xRatio, clone.yRatio, canvasWidth, canvasHeight, viewMode);

        const updatedResult = [...cache.result];
        const resultIndex = updatedResult.findIndex(r => r.id === clone.id);

        if (resultIndex !== -1) {
          updatedResult[resultIndex] = {
            ...updatedResult[resultIndex],
            ...clone,
            x: coords.x,
            y: coords.y
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
      const coords = fromRatioCoords(clone.xRatio, clone.yRatio, canvasWidth, canvasHeight, viewMode);

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
        originalIndex
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
  const isCloneVisible = useCallback((clone) => {
    if (!viewMode || viewMode === 'entire') return true;
    // Keep elements visible while being dragged (prevents gesture handler unmount mid-drag)
    const isDragged =
      Object.values(dragStart.current).some(v =>
        v?.id === clone.id ||
        (v?.selectedIds && Array.isArray(v.selectedIds) && v.selectedIds.includes(clone.id))
      ) ||
      (dragStart.current[clone.id] !== undefined) ||
      (elementDragState.current && (
        elementDragState.current.primaryId === clone.id ||
        (elementDragState.current.selectedIds && Array.isArray(elementDragState.current.selectedIds) && elementDragState.current.selectedIds.includes(clone.id))
      ));
    if (isDragged) return true;
    // Lines/shapes: visible if ANY point is in viewport
    if (clone.points && Array.isArray(clone.points) && clone.points.length >= 2) {
      return clone.points.some(p => isVisibleInView(p.x, p.y, viewMode));
    }
    // Point elements: visible if position is in viewport
    if (clone.xRatio !== undefined && clone.yRatio !== undefined) {
      return isVisibleInView(clone.xRatio, clone.yRatio, viewMode);
    }
    return true;
  }, [viewMode]);

  // Memoizar textos libres con virtualizaci�n optimizada
  const freeTextElements = useMemo(() => {
    const textClones = positionedClones.filter(clone => clone.type === 'free-text' && isCloneVisible(clone));

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

    return textClones.filter(clone => {
      const x = clone.x || 0;
      const y = clone.y || 0;
      return x + size >= minX && x - size <= maxX && y + size >= minY && y - size <= maxY;
    });
  }, [positionedClones, imageWidth, imageHeight, isCloneVisible]);

  // Memoizar elementos de herramientas/materiales (se renderizan en capa inferior)
  const materialElements = useMemo(() => {
    return positionedClones.filter(clone => MATERIAL_TYPES_SET.has(clone.type) && isCloneVisible(clone));
  }, [positionedClones, isCloneVisible]);

  // Memoizar elementos regulares con virtualizaci�n optimizada (sin materiales ni texto)
  const regularElements = useMemo(() => {
    const nonTextClones = positionedClones.filter(clone => clone.type !== 'free-text' && !MATERIAL_TYPES_SET.has(clone.type) && isCloneVisible(clone));

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

    return nonTextClones.filter(clone => {
      const x = clone.x || 0;
      const y = clone.y || 0;
      const size = (clone.size || standardSize) * 3;
      return x + size >= minX && x - size <= maxX && y + size >= minY && y - size <= maxY;
    });
  }, [positionedClones, imageWidth, imageHeight, standardSize, isCloneVisible]);

  // OPTIMIZACIÓN: Arrays separados para l�neas rectas y curvas (para BatchLinesRenderer)
  const straightLines = useMemo(() => {
    return positionedClones.filter(clone =>
      (clone.type === 'straight-line' || clone.type === 'straight-arrow') && isCloneVisible(clone)
    );
  }, [positionedClones, isCloneVisible]);

  const curveLines = useMemo(() => {
    return positionedClones.filter(clone =>
      (clone.type === 'curve-line' || clone.type === 'curve-arrow') && isCloneVisible(clone)
    );
  }, [positionedClones, isCloneVisible]);

  // OPTIMIZACIÓN: Arrays separados para figuras geom�tricas (para BatchShapesRenderer)
  const circleElements = useMemo(() => {
    return positionedClones.filter(clone => clone.type === 'circle' && isCloneVisible(clone));
  }, [positionedClones, isCloneVisible]);

  const rectangleElements = useMemo(() => {
    return positionedClones.filter(clone => clone.type === 'rectangle' && isCloneVisible(clone));
  }, [positionedClones, isCloneVisible]);

  const customShapeElements = useMemo(() => {
    return positionedClones.filter(clone =>
      clone.type === 'custom-shape' && clone.isCustomShapeComplete && isCloneVisible(clone)
    );
  }, [positionedClones, isCloneVisible]);

  // OPTIMIZACIÓN: Memoizar elementos de l�nea para BatchSvgRenderer
  const lineElements = useMemo(() => {
    return positionedClones.filter(clone => {
      return (clone.type === 'straight-line' ||
        clone.type === 'straight-arrow' ||
        clone.type === 'curve-line' ||
        clone.type === 'curve-arrow' ||
        (clone.type === 'custom-shape' && clone.isCustomShapeComplete)) && isCloneVisible(clone);
    }).map(clone => {
      // Preparar datos para BatchSvgRenderer
      if (clone.type === 'straight-line' || clone.type === 'straight-arrow') {
        if (!clone.points || clone.points.length !== 2) return null;
        return {
          ...clone,
          startX: clone.points[0].x,
          startY: clone.points[0].y,
          endX: clone.points[1].x,
          endY: clone.points[1].y,
        };
      }
      if (clone.type === 'curve-line' || clone.type === 'curve-arrow') {
        if (!clone.points || clone.points.length < 2) return null;
        return clone;
      }
      return clone;
    }).filter(Boolean);
  }, [positionedClones, isCloneVisible]);

  // OPTIMIZACIÓN: Escala memoizada
  const renderScale = useMemo(() => {
    return Math.min(imageWidth, imageHeight) / 500;
  }, [imageWidth, imageHeight]);

  // OPTIMIZACIÓN: Verificar si hay alg�n modo de dibujo activo (incluye eraserMode)
  const isAnyDrawingMode = useMemo(() => {
    return drawingStraightArrow || drawingStraightLine ||
      drawingCurveArrow || drawingCurveLine ||
      drawingCircle || drawingRectangle || drawingCustomShape || eraserMode;
  }, [drawingStraightArrow, drawingStraightLine, drawingCurveArrow, drawingCurveLine, drawingCircle, drawingRectangle, drawingCustomShape, eraserMode]);

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

      setClones(prev => prev.map(cl => {
        let shouldApply = false;

        // Para jugadores de equipo con playerData
        if (iconEdited.playerData && cl.playerData) {
          // Aplicar a todos los jugadores de equipo
          shouldApply = true;
        }
        // Para jugadores de paleta (icon1, icon2, icon3) - mismo paletteIndex
        else if (iconEdited.type === 'player' && cl.type === 'player' && !iconEdited.playerData && !cl.playerData) {
          // Usar paletteIndex si existe, o comparar el ID base
          if (typeof iconEdited.paletteIndex === 'number' && cl.paletteIndex === iconEdited.paletteIndex) {
            shouldApply = true;
          }
        }
        // Para l�neas, flechas, c�rculos, rect�ngulos y figuras - mismo type
        else if (['straight-arrow', 'straight-line', 'curve-arrow', 'curve-line', 'circle', 'rectangle', 'custom-shape'].includes(iconEdited.type)) {
          if (cl.type === iconEdited.type) {
            shouldApply = true;
          }
        }
        // Para materiales - mismo type
        else if (['cone', 'cone-pro', 'cone-flat', 'ring', 'dummy', 'barrier', 'pole', 'goal', 'goal-large', 'goal-small', 'ball', 'ladder'].includes(iconEdited.type)) {
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
            dotSpacing: iconEdited.dotSpacing !== undefined ? iconEdited.dotSpacing : cl.dotSpacing,
            fillColor: iconEdited.fillColor !== undefined ? iconEdited.fillColor : cl.fillColor,
            numberColor: iconEdited.numberColor !== undefined ? iconEdited.numberColor : cl.numberColor,
            // Para jugadores de equipo, tambi�n actualizar colores de texto
            textColor: cl.playerData ? (iconEdited.textColor !== undefined ? iconEdited.textColor : cl.textColor) : cl.textColor,
            textBackgroundColor: cl.playerData ? (iconEdited.textBackgroundColor !== undefined ? iconEdited.textBackgroundColor : cl.textBackgroundColor) : cl.textBackgroundColor,
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
            dotSpacing: iconEdited.dotSpacing !== undefined ? iconEdited.dotSpacing : cl.dotSpacing,
            fillColor: iconEdited.fillColor !== undefined ? iconEdited.fillColor : cl.fillColor,
            _lastUpdate: Date.now(),
          };
        }
        return cl;
      }));
    } else {
      // Solo aplicar al elemento actual - asegurar que todas las propiedades se copien
      setClones(prev => prev.map(cl => {
        if (cl.id === iconEdited.id) {
          return {
            ...cl,
            ...iconEdited,
            // Asegurar que estas propiedades se copien expl�citamente
            lineType: iconEdited.lineType !== undefined ? iconEdited.lineType : cl.lineType,
            dotSize: iconEdited.dotSize !== undefined ? iconEdited.dotSize : cl.dotSize,
            dotSpacing: iconEdited.dotSpacing !== undefined ? iconEdited.dotSpacing : cl.dotSpacing,
            fillColor: iconEdited.fillColor !== undefined ? iconEdited.fillColor : cl.fillColor,
          };
        }
        return cl;
      }));
    }

    setLeftPanelVisible(false);
    if (iconEdited.type === 'player' && iconEdited.number) {
      const nextNum = parseInt(iconEdited.number, 10) + 1;
      if (!isNaN(nextNum) && nextNum > iconCounters.current[iconEdited.id]) {
        iconCounters.current[iconEdited.id] = nextNum;
        setPaletteIcons(prev =>
          prev.map(ic =>
            ic.id === iconEdited.id
              ? { ...ic, number: iconCounters.current[iconEdited.id] }
              : ic
          )
        );
      }
    }
  };

  const handlePaletteIconEdit = (iconEdited) => {
    // Si es un jugador de equipo (isPalettePlayer o tiene playerData), no actualizar paletteIcons
    if (iconEdited.isPalettePlayer || iconEdited.playerData) {
      // Actualizar teamPlayerStyle en su lugar
      if (iconEdited.type === 'player') {
        setTeamPlayerStyle({
          color: iconEdited.color,
          size: iconEdited.size
        });
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
            // Actualizar el n�mero si se ha proporcionado uno nuevo
            const newNumber = iconEdited.number !== undefined && iconEdited.number !== ''
              ? parseInt(iconEdited.number, 10)
              : ic.number;

            // Actualizar tambi�n el contador de iconos para que los siguientes jugadores
            // contin�en desde este n�mero
            if (!isNaN(newNumber) && newNumber > 0) {
              iconCounters.current[ic.id] = newNumber;
            }

            return {
              ...ic,
              color: iconEdited.color,
              size: iconEdited.size,
              numberColor: iconEdited.numberColor || ic.numberColor,
              number: isNaN(newNumber) ? ic.number : newNumber,
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
            dotSpacing: iconEdited.dotSpacing !== undefined ? iconEdited.dotSpacing : ic.dotSpacing
          };
        }
        return ic;
      })
    );

    // Si el icono editado corresponde con el que est� seleccionado para dibujar (pendingLineAction),
    // actualizar tambi�n pendingLineAction y los estados relevantes para que el siguiente dibujo use
    // la Configuraci�n reci�n aplicada.
    if (typeof iconEdited.paletteIndex === 'number' && pendingLineAction && pendingLineAction.paletteIndex === iconEdited.paletteIndex) {
      // Actualizar pendingLineAction.icon con los nuevos valores (sin eliminar otras propiedades)
      setPendingLineAction(prev => prev ? ({
        ...prev,
        icon: {
          ...prev.icon,
          color: iconEdited.color !== undefined ? iconEdited.color : prev.icon?.color,
          thickness: iconEdited.thickness !== undefined ? iconEdited.thickness : prev.icon?.thickness,
          fillColor: iconEdited.fillColor !== undefined ? iconEdited.fillColor : prev.icon?.fillColor,
          lineType: iconEdited.lineType !== undefined ? iconEdited.lineType : prev.icon?.lineType,
          dotSize: iconEdited.dotSize !== undefined ? iconEdited.dotSize : prev.icon?.dotSize,
          dotSpacing: iconEdited.dotSpacing !== undefined ? iconEdited.dotSpacing : prev.icon?.dotSpacing,
        }
      }) : prev);

      // Sincronizar estados globales usados al crear shapes SOLO si el tipo pendiente corresponde
      // a un tipo que debe afectar los estilos globales (no aplicar a custom-shape)
      const GLOBAL_STYLE_TYPES = ['straight-arrow', 'straight-line', 'curve-arrow', 'curve-line', 'circle', 'rectangle'];
      if (GLOBAL_STYLE_TYPES.includes(pendingLineAction?.type)) {
        if (iconEdited.lineType !== undefined) setLineType(iconEdited.lineType);
        if (iconEdited.dotSize !== undefined) setDotSize(iconEdited.dotSize);
        if (iconEdited.dotSpacing !== undefined) setDotSpacing(iconEdited.dotSpacing);
        if (iconEdited.thickness !== undefined) setArrowThickness(iconEdited.thickness);
      }
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
  function LineStyleModal({
    visible,
    onClose,
    onSelect,
    initialLineType = 'solid',
    initialDotSize = 2,
    initialDotSpacing = 4,
    initialColor = '#000000',
    initialThickness = 2,
    initialFillColor = 'transparent',
    shapeType = 'line' // 'line', 'arrow', 'circle', 'rectangle', 'custom-shape'
  }) {
    const { t } = useTranslation();
    const dimensions = useScreenDimensions();
    const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
    const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
    const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
    const [selectedType, setSelectedType] = useState(initialLineType);
    const [selectedDotSize, setSelectedDotSize] = useState(initialDotSize);
    const [selectedDotSpacing, setSelectedDotSpacing] = useState(initialDotSpacing);
    const [selectedColor, setSelectedColor] = useState(initialColor);
    const [selectedThickness, setSelectedThickness] = useState(initialThickness.toString());
    const [selectedFillColor, setSelectedFillColor] = useState(initialFillColor);
    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const [fillColorPickerVisible, setFillColorPickerVisible] = useState(false);

    // Determinar si es una figura que puede tener relleno
    const canHaveFill = shapeType === 'circle' || shapeType === 'rectangle' || shapeType === 'custom-shape';

    useEffect(() => {
      setSelectedType(initialLineType);
      setSelectedDotSize(initialDotSize);
      setSelectedDotSpacing(initialDotSpacing);
      setSelectedColor(initialColor);
      setSelectedThickness(initialThickness.toString());
      setSelectedFillColor(initialFillColor);
    }, [initialLineType, initialDotSize, initialDotSpacing, initialColor, initialThickness, initialFillColor, visible]);

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.proModalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            <View style={[styles.proModalContainer, isMobile && {
              width: SCREEN_WIDTH * 0.80,
              maxWidth: 340,
              maxHeight: SCREEN_HEIGHT * 0.85
            }]}>
              {/* Header */}
              <View style={styles.proModalHeader}>
                <View style={styles.proModalHeaderIcon}>
                  <Text style={{ fontSize: 12 }}>{canHaveFill ? '◼' : '━'}</Text>
                </View>
                <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                  {canHaveFill ? t('tacticalBoard.lineConfig.titleShape') : t('tacticalBoard.lineConfig.titleLine')}
                </Text>
                <TouchableOpacity style={styles.proModalCloseBtn} onPress={onClose}>
                  <Text style={{ fontSize: 14, color: '#666' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.proModalBody} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">

                {/* Color del trazado */}
                <View style={styles.proModalSection}>
                  <Text style={styles.proModalLabel}>{t('tacticalBoard.editPanel.colorLabel')}</Text>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      onPress={() => setColorPickerVisible(true)}
                      style={[styles.proModalColorBtn, { backgroundColor: selectedColor }]}
                    />
                    <Text style={styles.proModalHint}>{selectedColor}</Text>
                  </View>
                </View>

                {/* Grosor */}
                <View style={styles.proModalSection}>
                  <Text style={styles.proModalLabel}>{t('tacticalBoard.editPanel.strokeLabel')}</Text>
                  <View style={styles.proModalGrid}>
                    {[1, 2, 3, 4, 5, 6].map(thickness => (
                      <TouchableOpacity
                        key={`thickness-${thickness}`}
                        style={[
                          styles.proModalGridItem,
                          parseInt(selectedThickness) === thickness && styles.proModalGridItemSelected
                        ]}
                        onPress={() => setSelectedThickness(thickness.toString())}
                      >
                        <View style={{
                          width: 28,
                          height: thickness * 2,
                          backgroundColor: selectedColor,
                          borderRadius: thickness
                        }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Tipo de trazado */}
                <View style={styles.proModalSection}>
                  <Text style={styles.proModalLabel}>{t('tacticalBoard.editPanel.strokeTypeLabel')}</Text>
                  <View style={styles.proModalGrid}>
                    <TouchableOpacity
                      style={[
                        styles.proModalGridItem,
                        { paddingVertical: 12, paddingHorizontal: 16 },
                        selectedType === 'solid' && styles.proModalGridItemSelected
                      ]}
                      onPress={() => setSelectedType('solid')}
                    >
                      <View style={{ width: 40, height: 3, backgroundColor: selectedColor, borderRadius: 2 }} />
                      <Text style={[styles.proModalChipText, { marginTop: 4 }, selectedType === 'solid' && styles.proModalChipTextSelected]}>{t('tacticalBoard.editPanel.solid')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.proModalGridItem,
                        { paddingVertical: 12, paddingHorizontal: 16 },
                        selectedType === 'dotted' && styles.proModalGridItemSelected
                      ]}
                      onPress={() => setSelectedType('dotted')}
                    >
                      <Svg width="40" height="10">
                        <Path
                          d="M5,5 L35,5"
                          stroke={selectedColor}
                          strokeWidth="2"
                          strokeDasharray="2,4"
                        />
                      </Svg>
                      <Text style={[styles.proModalChipText, { marginTop: 4 }, selectedType === 'dotted' && styles.proModalChipTextSelected]}>{t('tacticalBoard.editPanel.dashed')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {selectedType === 'dotted' && (
                  <>
                    <View style={styles.proModalSection}>
                      <Text style={styles.proModalLabel}>{t('tacticalBoard.editPanel.dotSize')}</Text>
                      <View style={styles.proModalGrid}>
                        {[1, 2, 3, 4].map(size => (
                          <TouchableOpacity
                            key={`dot-size-${size}`}
                            style={[
                              styles.proModalGridItem,
                              selectedDotSize === size && styles.proModalGridItemSelected
                            ]}
                            onPress={() => setSelectedDotSize(size)}
                          >
                            <Svg width="36" height="10">
                              <Path
                                d="M5,5 L31,5"
                                stroke={selectedColor}
                                strokeWidth="2"
                                strokeDasharray={`${size},${selectedDotSpacing}`}
                                fill="none"
                                strokeLinecap="round"
                              />
                            </Svg>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.proModalSection}>
                      <Text style={styles.proModalLabel}>{t('tacticalBoard.editPanel.dotSpacing')}</Text>
                      <View style={styles.proModalGrid}>
                        {[2, 4, 6, 8].map(spacing => (
                          <TouchableOpacity
                            key={`dot-spacing-${spacing}`}
                            style={[
                              styles.proModalGridItem,
                              selectedDotSpacing === spacing && styles.proModalGridItemSelected
                            ]}
                            onPress={() => setSelectedDotSpacing(spacing)}
                          >
                            <Svg width="36" height="10">
                              <Path
                                d="M5,5 L31,5"
                                stroke={selectedColor}
                                strokeWidth="2"
                                strokeDasharray={`${selectedDotSize},${spacing}`}
                                fill="none"
                                strokeLinecap="round"
                              />
                            </Svg>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {/* Relleno - solo para figuras */}
                {canHaveFill && (
                  <View style={styles.proModalSection}>
                    <Text style={styles.proModalLabel}>{t('tacticalBoard.editPanel.fillColorLabel')}</Text>
                    <View style={styles.proModalRow}>
                      <TouchableOpacity
                        onPress={() => setFillColorPickerVisible(true)}
                        style={[
                          styles.proModalColorBtn,
                          {
                            backgroundColor: selectedFillColor === 'transparent' ? '#fff' : selectedFillColor,
                            opacity: selectedFillColor === 'transparent' ? 0.4 : 0.7,
                          }
                        ]}
                      >
                        {selectedFillColor === 'transparent' && (
                          <Feather name="slash" size={16} color="#999" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setSelectedFillColor('transparent')}
                        style={[
                          styles.proModalChip,
                          selectedFillColor === 'transparent' && styles.proModalChipSelected
                        ]}
                      >
                        <Text style={[
                          styles.proModalChipText,
                          selectedFillColor === 'transparent' && styles.proModalChipTextSelected
                        ]}>
                          {t('tacticalBoard.editPanel.noFill')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.proModalHint}>
                      {t('tacticalBoard.editPanel.fillHint')}
                    </Text>
                  </View>
                )}

                {/* Vista previa */}
                <View style={styles.proModalSection}>
                  <Text style={styles.proModalLabel}>{t('tacticalBoard.editPanel.preview')}</Text>
                  <View style={styles.proModalPreview}>
                    <Svg width="200" height="80" key={`modal-preview-${selectedType}-${selectedDotSize}-${selectedDotSpacing}-${selectedColor}-${selectedThickness}-${selectedFillColor}`}>
                      {/* Vista previa seg�n el tipo de forma */}
                      {(shapeType === 'line' || shapeType === 'straight-line') && (
                        selectedType === 'dotted' ? (
                          <Path
                            d="M20,40 L180,40"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ) : (
                          <Path
                            d="M20,40 L180,40"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                          />
                        )
                      )}
                      {(shapeType === 'arrow' || shapeType === 'straight-arrow') && (
                        <>
                          {selectedType === 'dotted' ? (
                            <Path
                              d="M20,40 L160,40"
                              stroke={selectedColor}
                              strokeWidth={parseInt(selectedThickness) || 2}
                              strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                              fill="none"
                              strokeLinecap="round"
                            />
                          ) : (
                            <Path
                              d="M20,40 L160,40"
                              stroke={selectedColor}
                              strokeWidth={parseInt(selectedThickness) || 2}
                              fill="none"
                              strokeLinecap="round"
                            />
                          )}
                          <Path
                            d="M160,40 L145,30 M160,40 L145,50"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                      {(shapeType === 'curve-line') && (
                        selectedType === 'dotted' ? (
                          <Path
                            d="M20,60 Q100,10 180,60"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ) : (
                          <Path
                            d="M20,60 Q100,10 180,60"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                          />
                        )
                      )}
                      {(shapeType === 'curve-arrow') && (
                        <>
                          {selectedType === 'dotted' ? (
                            <Path
                              d="M20,60 Q100,10 160,60"
                              stroke={selectedColor}
                              strokeWidth={parseInt(selectedThickness) || 2}
                              strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                              fill="none"
                              strokeLinecap="round"
                            />
                          ) : (
                            <Path
                              d="M20,60 Q100,10 160,60"
                              stroke={selectedColor}
                              strokeWidth={parseInt(selectedThickness) || 2}
                              fill="none"
                              strokeLinecap="round"
                            />
                          )}
                          <Path
                            d="M160,60 L150,45 M160,60 L145,65"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                      {shapeType === 'circle' && (
                        selectedType === 'dotted' ? (
                          <Circle
                            cx="100"
                            cy="40"
                            r="30"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                          />
                        ) : (
                          <Circle
                            cx="100"
                            cy="40"
                            r="30"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                          />
                        )
                      )}
                      {shapeType === 'rectangle' && (
                        selectedType === 'dotted' ? (
                          <Rect
                            x="40"
                            y="15"
                            width="120"
                            height="50"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                          />
                        ) : (
                          <Rect
                            x="40"
                            y="15"
                            width="120"
                            height="50"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                          />
                        )
                      )}
                      {shapeType === 'custom-shape' && (
                        selectedType === 'dotted' ? (
                          <Path
                            d="M100,15 L140,65 L60,65 Z"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <Path
                            d="M100,15 L140,65 L60,65 Z"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )
                      )}
                    </Svg>
                  </View>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.proModalFooter}>
                <TouchableOpacity
                  style={[styles.proModalBtn, styles.proModalBtnSecondary]}
                  onPress={onClose}
                >
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.proModalBtn, styles.proModalBtnPrimary]}
                  onPress={() => {
                    onSelect({
                      lineType: selectedType,
                      dotSize: selectedDotSize,
                      dotSpacing: selectedDotSpacing,
                      color: selectedColor,
                      thickness: parseInt(selectedThickness) || 2,
                      fillColor: selectedFillColor
                    });
                    onClose();
                  }}
                >
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>{t('tacticalBoard.lineConfig.draw')}</Text>
                </TouchableOpacity>
              </View>

              {/* Color Picker Modals */}
              <MiniColorPickerModal
                visible={colorPickerVisible}
                initialColor={selectedColor}
                onClose={() => setColorPickerVisible(false)}
                onSelect={setSelectedColor}
              />
              <MiniColorPickerModal
                visible={fillColorPickerVisible}
                initialColor={selectedFillColor === 'transparent' ? '#ffffff' : selectedFillColor}
                onClose={() => setFillColorPickerVisible(false)}
                onSelect={setSelectedFillColor}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // Modal de ajustes para jugadores del equipo
  function TeamPlayerSettingsModal({
    visible,
    onClose,
    teamPlayerStyle,
    setTeamPlayerStyle,
    isMobile
  }) {
    const { t } = useTranslation();
    const dimensions = useScreenDimensions();
    const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
    const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
    const [color, setColor] = useState(teamPlayerStyle?.color || '#2176ff');
    const [size, setSize] = useState(teamPlayerStyle?.size?.toString() || '24');
    const [numberColor, setNumberColor] = useState(teamPlayerStyle?.numberColor || '#ffffff');
    const [textColor, setTextColor] = useState(teamPlayerStyle?.textColor || '#000000');
    const [textBackgroundColor, setTextBackgroundColor] = useState(teamPlayerStyle?.textBackgroundColor || '#ffffff');
    const [showPosition, setShowPosition] = useState(teamPlayerStyle?.showPosition || false);
    const [differentiateGoalkeeper, setDifferentiateGoalkeeper] = useState(teamPlayerStyle?.differentiateGoalkeeper !== false);
    const [goalkeeperStripeColor, setGoalkeeperStripeColor] = useState(teamPlayerStyle?.goalkeeperStripeColor || '#ffffff');
    const [showPhotos, setShowPhotos] = useState(teamPlayerStyle?.showPhotos || false);

    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const [numberColorPickerVisible, setNumberColorPickerVisible] = useState(false);
    const [textColorPickerVisible, setTextColorPickerVisible] = useState(false);
    const [textBgColorPickerVisible, setTextBgColorPickerVisible] = useState(false);
    const [stripeColorPickerVisible, setStripeColorPickerVisible] = useState(false);

    // Sincronizar con props cuando cambia teamPlayerStyle
    useEffect(() => {
      setColor(teamPlayerStyle?.color || '#2176ff');
      setSize(teamPlayerStyle?.size?.toString() || '24');
      setNumberColor(teamPlayerStyle?.numberColor || '#ffffff');
      setTextColor(teamPlayerStyle?.textColor || '#000000');
      setTextBackgroundColor(teamPlayerStyle?.textBackgroundColor || '#ffffff');
      setShowPosition(teamPlayerStyle?.showPosition || false);
      setDifferentiateGoalkeeper(teamPlayerStyle?.differentiateGoalkeeper !== false);
      setGoalkeeperStripeColor(teamPlayerStyle?.goalkeeperStripeColor || '#ffffff');
      setShowPhotos(teamPlayerStyle?.showPhotos || false);
    }, [teamPlayerStyle]);

    if (!visible) return null;

    const handleApply = () => {
      setTeamPlayerStyle({
        color,
        size: parseInt(size) || 24,
        numberColor,
        textColor,
        textBackgroundColor,
        showPosition,
        differentiateGoalkeeper,
        goalkeeperStripeColor,
        showPhotos
      });
      onClose();
    };

    const iconPreviewSize = isMobile ? 40 : 50;

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.proModalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            <View style={[styles.proModalContainer, isMobile && { width: SCREEN_WIDTH * 0.80, maxWidth: 340, maxHeight: SCREEN_HEIGHT * 0.88 }]}>
              {/* Header */}
              <View style={styles.proModalHeader}>
                <View style={styles.proModalHeaderIcon}>
                  <Text style={{ fontSize: 12 }}>👥</Text>
                </View>
                <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                  {t('tacticalBoard.teamSettings.title') || 'Ajustes de Jugadores'}
                </Text>
                <TouchableOpacity style={styles.proModalCloseBtn} onPress={onClose}>
                  <Text style={{ fontSize: 14, color: '#666' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.proModalBody}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* Vista previa */}
                <View style={[styles.proModalPreview, { marginBottom: 12, alignItems: 'center' }]}>
                  <View style={{
                    width: iconPreviewSize,
                    height: iconPreviewSize,
                    borderRadius: iconPreviewSize / 2,
                    backgroundColor: showPhotos ? 'transparent' : color,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: showPhotos ? 2 : 1,
                    borderColor: showPhotos ? color : '#222',
                    overflow: 'hidden',
                  }}>
                    {/* Icono de foto si est� activo */}
                    {showPhotos ? (
                      <View style={{
                        width: iconPreviewSize,
                        height: iconPreviewSize,
                        borderRadius: iconPreviewSize / 2,
                        backgroundColor: '#e0e0e0',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="person" size={iconPreviewSize * 0.6} color="#888" />
                      </View>
                    ) : (
                      <>
                        {/* Rayas de portero si est� activo */}
                        {differentiateGoalkeeper && (
                          <>
                            <View style={{ position: 'absolute', top: iconPreviewSize * 0.1, left: 0, right: 0, height: 2, backgroundColor: goalkeeperStripeColor, opacity: 0.85 }} />
                            <View style={{ position: 'absolute', top: iconPreviewSize * 0.35, left: 0, right: 0, height: 2, backgroundColor: goalkeeperStripeColor, opacity: 0.85 }} />
                            <View style={{ position: 'absolute', top: iconPreviewSize * 0.6, left: 0, right: 0, height: 2, backgroundColor: goalkeeperStripeColor, opacity: 0.85 }} />
                            <View style={{ position: 'absolute', top: iconPreviewSize * 0.85, left: 0, right: 0, height: 2, backgroundColor: goalkeeperStripeColor, opacity: 0.85 }} />
                          </>
                        )}
                        <Text style={{
                          color: numberColor,
                          fontSize: iconPreviewSize * 0.5,
                          fontWeight: 'bold',
                        }}>
                          {showPosition ? 'PT' : '1'}
                        </Text>
                      </>
                    )}
                  </View>
                  <View style={{
                    backgroundColor: textBackgroundColor === 'transparent' ? 'transparent' : textBackgroundColor,
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 4,
                    marginTop: 4,
                  }}>
                    <Text style={{ color: textColor, fontSize: 11, fontWeight: '500' }}>{t('tacticalBoard.teamSettings.nameLabel')}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                    {t('tacticalBoard.teamSettings.goalkeeperPreview') || '(Vista previa de portero)'}
                  </Text>
                </View>

                {/* Color del icono */}
                <View style={styles.proModalSection}>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.teamSettings.iconColor') || 'Color del icono:'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        { backgroundColor: color }
                      ]}
                      onPress={() => setColorPickerVisible(true)}
                    />
                  </View>
                </View>

                <MiniColorPickerModal
                  visible={colorPickerVisible}
                  initialColor={color}
                  onClose={() => setColorPickerVisible(false)}
                  onSelect={setColor}
                />

                {/* Color del n�mero/texto */}
                <View style={styles.proModalSection}>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.teamSettings.numberColor') || 'Color del n�mero:'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        { backgroundColor: numberColor, borderColor: numberColor === '#ffffff' ? '#ccc' : '#e0e0e0' }
                      ]}
                      onPress={() => setNumberColorPickerVisible(true)}
                    />
                  </View>
                </View>

                <MiniColorPickerModal
                  visible={numberColorPickerVisible}
                  initialColor={numberColor}
                  onClose={() => setNumberColorPickerVisible(false)}
                  onSelect={setNumberColor}
                />

                {/* Color del texto del nombre */}
                <View style={styles.proModalSection}>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.teamSettings.nameTextColor') || 'Color del nombre:'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        { backgroundColor: textColor }
                      ]}
                      onPress={() => setTextColorPickerVisible(true)}
                    />
                  </View>
                </View>

                <MiniColorPickerModal
                  visible={textColorPickerVisible}
                  initialColor={textColor}
                  onClose={() => setTextColorPickerVisible(false)}
                  onSelect={setTextColor}
                />

                {/* Color de fondo del nombre */}
                <View style={styles.proModalSection}>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.teamSettings.nameBgColor') || 'Fondo del nombre:'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor: textBackgroundColor === 'transparent' ? '#fff' : textBackgroundColor,
                          opacity: textBackgroundColor === 'transparent' ? 0.4 : 1
                        }
                      ]}
                      onPress={() => setTextBgColorPickerVisible(true)}
                    />
                    <TouchableOpacity
                      onPress={() => setTextBackgroundColor('transparent')}
                      style={[
                        styles.proModalChip,
                        textBackgroundColor === 'transparent' && styles.proModalChipSelected
                      ]}
                    >
                      <Text style={[
                        styles.proModalChipText,
                        { fontSize: 10 },
                        textBackgroundColor === 'transparent' && styles.proModalChipTextSelected
                      ]}>
                        {t('tacticalBoard.editPanel.noBackground') || 'Sin fondo'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <MiniColorPickerModal
                  visible={textBgColorPickerVisible}
                  initialColor={textBackgroundColor === 'transparent' ? '#ffffff' : textBackgroundColor}
                  onClose={() => setTextBgColorPickerVisible(false)}
                  onSelect={setTextBackgroundColor}
                />

                {/* Tama�o */}
                <View style={styles.proModalSection}>
                  <Text style={[isMobile ? styles.proModalLabelMobile : styles.proModalLabel, { marginBottom: 8 }]}>
                    {t('tacticalBoard.editPanel.sizeLabel') || 'Tama�o:'}
                  </Text>
                  <View style={styles.proModalStepperRow}>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        const current = parseInt(size) || 24;
                        if (current > 12) setSize(String(current - 2));
                      }}
                    >
                      <Feather name="minus" size={18} color="#666" />
                    </TouchableOpacity>
                    <View style={styles.proModalStepperValue}>
                      <Text style={styles.proModalStepperValueText}>{size}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        const current = parseInt(size) || 24;
                        if (current < 80) setSize(String(current + 2));
                      }}
                    >
                      <Feather name="plus" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Mostrar posici�n en lugar de n�mero */}
                <View style={[styles.proModalSwitch, { marginTop: 12 }]}>
                  <Text style={styles.proModalSwitchLabel}>
                    {t('tacticalBoard.teamSettings.showPosition') || 'Mostrar posici�n'}
                  </Text>
                  <Switch
                    value={showPosition}
                    onValueChange={setShowPosition}
                    trackColor={{ false: "#ddd", true: "#81b0ff" }}
                    thumbColor={showPosition ? "#2176ff" : "#f4f3f4"}
                    disabled={showPhotos}
                  />
                </View>

                {/* Mostrar fotos de los jugadores */}
                <View style={[styles.proModalSwitch, { marginTop: 4 }]}>
                  <Text style={styles.proModalSwitchLabel}>
                    {t('tacticalBoard.teamSettings.showPhotos') || 'Mostrar fotos'}
                  </Text>
                  <Switch
                    value={showPhotos}
                    onValueChange={(val) => {
                      setShowPhotos(val);
                      // Si se activan fotos, desactivar mostrar posici�n
                      if (val) {
                        setShowPosition(false);
                      }
                    }}
                    trackColor={{ false: "#ddd", true: "#81b0ff" }}
                    thumbColor={showPhotos ? "#2176ff" : "#f4f3f4"}
                  />
                </View>
                {showPhotos && (
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 2, marginLeft: 4, fontStyle: 'italic' }}>
                    {t('tacticalBoard.teamSettings.showPhotosHint') || 'Se mostrar� la foto del jugador en lugar del n�mero y color'}
                  </Text>
                )}

                {/* Diferenciar portero con rayas */}
                <View style={[styles.proModalSwitch, { marginTop: 4 }]}>
                  <Text style={styles.proModalSwitchLabel}>
                    {t('tacticalBoard.teamSettings.differentiateGoalkeeper') || 'Diferenciar portero'}
                  </Text>
                  <Switch
                    value={differentiateGoalkeeper}
                    onValueChange={setDifferentiateGoalkeeper}
                    trackColor={{ false: "#ddd", true: "#81b0ff" }}
                    thumbColor={differentiateGoalkeeper ? "#2176ff" : "#f4f3f4"}
                    disabled={showPhotos}
                  />
                </View>

                {/* Color de las rayas del portero - solo si differentiateGoalkeeper est� activo */}
                {differentiateGoalkeeper && (
                  <View style={[styles.proModalSection, { marginTop: 8 }]}>
                    <View style={styles.proModalRow}>
                      <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                        {t('tacticalBoard.teamSettings.stripeColor') || 'Color de las rayas:'}
                      </Text>
                      <TouchableOpacity
                        style={[
                          isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                          { backgroundColor: goalkeeperStripeColor, borderWidth: 1, borderColor: goalkeeperStripeColor === '#ffffff' ? '#ccc' : '#e0e0e0' }
                        ]}
                        onPress={() => setStripeColorPickerVisible(true)}
                      />
                    </View>
                  </View>
                )}

                <MiniColorPickerModal
                  visible={stripeColorPickerVisible}
                  initialColor={goalkeeperStripeColor}
                  onClose={() => setStripeColorPickerVisible(false)}
                  onSelect={setGoalkeeperStripeColor}
                />

                <Text style={{ fontSize: 11, color: '#888', marginTop: 8, fontStyle: 'italic' }}>
                  {t('tacticalBoard.teamSettings.goalkeeperHint') || 'Los porteros tendr�n rayas horizontales'}
                </Text>
              </ScrollView>

              {/* Footer */}
              <View style={styles.proModalFooter}>
                <TouchableOpacity
                  style={[styles.proModalBtn, styles.proModalBtnSecondary]}
                  onPress={onClose}
                >
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                    {t('tacticalBoard.editPanel.close') || 'Cerrar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.proModalBtn, styles.proModalBtnPrimary]}
                  onPress={handleApply}
                >
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                    {t('tacticalBoard.editPanel.apply') || 'Aplicar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  function TeamPlayersModal({ visible, onClose, availablePlayers, onSelectPlayer, isMobile, showPhotos = false, teamPlayerStyle = {} }) {
    const iconSize = isMobile ? 28 : 32;
    const dorsalFontSize = isMobile ? 12 : 14;
    const nameFontSize = isMobile ? 10 : 11;
    const playerColor = teamPlayerStyle?.color || '#2176ff';
    const numberColor = teamPlayerStyle?.numberColor || '#ffffff';
    if (!visible) return null;

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.proModalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            <View style={[styles.proModalContainer, isMobile && { width: SCREEN_WIDTH * 0.80, maxWidth: 340, maxHeight: SCREEN_HEIGHT * 0.80 }]}>
              {/* Header */}
              <View style={styles.proModalHeader}>
                <View style={styles.proModalHeaderIcon}>
                  <Text style={{ fontSize: 12 }}>👥</Text>
                </View>
                <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                  {t('tacticalBoard.teamPlayersModal.title')}
                </Text>
                <TouchableOpacity style={styles.proModalCloseBtn} onPress={onClose}>
                  <Text style={{ fontSize: 14, color: '#666' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.proModalBody} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                {availablePlayers.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>{t('tacticalBoard.teamPlayersModal.noPlayers')}</Text>
                  </View>
                ) : (
                  <View style={styles.playersGrid}>
                    {availablePlayers.map((player, index) => (
                      <TouchableOpacity
                        key={player.uniqueId}
                        style={[styles.playerGridItem, {
                          backgroundColor: '#f8f9fa',
                          borderRadius: 8,
                          padding: 8,
                          borderWidth: 1,
                          borderColor: '#e8e8e8'
                        }]}
                        onPress={() => onSelectPlayer(player)}
                        activeOpacity={0.7}
                      >
                        <View style={{
                          width: iconSize,
                          height: iconSize,
                          borderRadius: iconSize / 2,
                          backgroundColor: showPhotos && player.foto ? 'transparent' : playerColor,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: 4,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.2,
                          shadowRadius: 2,
                          elevation: 2,
                          borderWidth: showPhotos && player.foto ? 2 : 0,
                          borderColor: playerColor,
                          overflow: 'hidden',
                        }}>
                          {showPhotos && player.foto ? (
                            <Image
                              source={{ uri: cdnUrl(player.foto) }}
                              style={{
                                width: iconSize - 4,
                                height: iconSize - 4,
                                borderRadius: (iconSize - 4) / 2,
                              }}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text style={{
                              color: numberColor,
                              fontSize: dorsalFontSize,
                              fontWeight: 'bold',
                            }}>
                              {player.dorsal || player.number || '?'}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.playerGridName, { fontSize: nameFontSize }]} numberOfLines={2} ellipsizeMode="tail">
                          {getPlayerFullName(player) || player.name || t('tacticalBoard.teamPlayersModal.noName')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={styles.proModalFooter}>
                <TouchableOpacity
                  style={[styles.proModalBtn, styles.proModalBtnSecondary, { flex: 1 }]}
                  onPress={onClose}
                >
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // A�adir antes del return principal

  function FloatingButtons({
    visible = true,
    hideBottomButtons = false, // Nueva prop para ocultar solo botones inferiores
    sandbox = false, // Modo sandbox
    onSave,
    onCancel,
    onSettings,
    onLocked,
    onChangeField,
    onTogglePalette,
    onToggleZoom,
    onVideoRecorder,
    onToggleMultiSelect,
    onFormations,
    // Props para undo/redo
    onUndo,
    onRedo,
    canUndo,
    canRedo,

    multiSelectMode,
    selectedCloneIds,
    selectionInteractionMode,
    toggleSelectionInteractionMode,
    lockedCount,
    isMobile = false
  }) {
    if (!visible) return null;

    // Tama�os m�s peque�os para m�vil
    const buttonSize = isMobile ? 36 : 56;
    const buttonRadius = isMobile ? 18 : 28;
    const iconSize = isMobile ? 16 : 24;

    return (
      <>
        {/* Botones inferiores izquierda - ocultar si hideBottomButtons es true */}
        {!hideBottomButtons && (
          <TouchableOpacity
            style={[styles.floatingButton, {
              bottom: isMobile ? 10 : 20,
              left: isMobile ? 10 : 20,
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonRadius
            }]}
            onPress={onTogglePalette}
          >
            <MaterialCommunityIcons name="shape-plus" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {!hideBottomButtons && (
          <TouchableOpacity
            style={[styles.floatingButton, {
              bottom: isMobile ? 10 : 20,
              left: isMobile ? 52 : 90,
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonRadius
            }]}
            onPress={onToggleZoom}
          >
            <MaterialCommunityIcons name="magnify-plus-outline" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Bot�n de formaciones */}
        {!hideBottomButtons && (
          <TouchableOpacity
            style={[styles.floatingButton, {
              bottom: isMobile ? 10 : 20,
              left: isMobile ? 94 : 160,
              backgroundColor: '#2176ff',
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonRadius
            }]}
            onPress={onFormations}
          >
            <MaterialCommunityIcons name="soccer-field" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Botones UNDO/REDO */}
        <TouchableOpacity
          style={[styles.floatingButton, {
            top: isMobile ? 10 : 20,
            left: isMobile ? 10 : 20,
            backgroundColor: canUndo ? '#3498db' : '#7f8c8d',
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonRadius,
            opacity: canUndo ? 1 : 0.5
          }]}
          onPress={onUndo}
          disabled={!canUndo}
        >
          <Feather name="corner-up-left" size={iconSize} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.floatingButton, {
            top: isMobile ? 10 : 20,
            left: isMobile ? 52 : 90,
            backgroundColor: canRedo ? '#3498db' : '#7f8c8d',
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonRadius,
            opacity: canRedo ? 1 : 0.5
          }]}
          onPress={onRedo}
          disabled={!canRedo}
        >
          <Feather name="corner-up-right" size={iconSize} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.floatingButton, {
            top: isMobile ? 10 : 20,
            left: isMobile ? 94 : 160,
            backgroundColor: '#9b59b6',
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonRadius,
            zIndex: 110,
          }]}
          onPress={onVideoRecorder}
        >
          <Ionicons name="videocam" size={iconSize} color="#fff" />
        </TouchableOpacity>


        {/* Bot�n central - Cambiar campo */}
        {!hideBottomButtons && (
          <TouchableOpacity
            style={[styles.floatingButton, {
              bottom: isMobile ? 10 : 20,
              left: '50%',
              marginLeft: isMobile ? -18 : -28,
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonRadius
            }]}
            onPress={onChangeField}
          >
            {/* Campo con flechas de cambio */}
            <View style={{ width: iconSize, height: iconSize, justifyContent: 'center', alignItems: 'center', position: 'relative', top: -4 }}>
              <MaterialCommunityIcons name="soccer-field" size={iconSize} color="#fff" />
              {/* Flechas de cambio superpuestas */}
              <View style={{ position: 'absolute', bottom: -10, right: 5 }}>
                <MaterialCommunityIcons name="swap-horizontal-bold" size={iconSize * 0.55} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Botones inferiores derecha */}
        {!hideBottomButtons && (
          <TouchableOpacity
            style={[styles.floatingButton, {
              bottom: isMobile ? 10 : 20,
              right: isMobile ? 48 : 90,
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonRadius
            }]}
            onPress={onSettings}
          >
            <Ionicons name="settings" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {!hideBottomButtons && (
          <TouchableOpacity
            style={[styles.floatingButton, {
              bottom: isMobile ? 10 : 20,
              right: isMobile ? 10 : 20,
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonRadius
            }]}
            onPress={onLocked}
          >
            <Feather name="lock" size={iconSize} color="#fff" />
            {lockedCount > 0 && (
              <View style={[styles.floatingButtonBadge, isMobile && { width: 16, height: 16, borderRadius: 8, top: -2, right: -2 }]}>
                <Text style={[styles.floatingButtonBadgeText, isMobile && { fontSize: 8 }]}>{lockedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Bot�n de selecci�n m�ltiple ahora centrado */}
        <TouchableOpacity
          style={[styles.floatingButton, {
            top: isMobile ? 10 : 20,
            left: '50%',
            marginLeft: isMobile ? -18 : -28,
            backgroundColor: multiSelectMode ? '#3498db' : '#2c3e50',
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonRadius
          }]}
          onPress={onToggleMultiSelect}
        >
          <Feather name="check-square" size={iconSize} color="#fff" />
        </TouchableOpacity>

        {/* Bot�n para cambiar entre modo seleccionar y modo mover (solo visible cuando hay elementos seleccionados) */}
        {multiSelectMode && selectedCloneIds.length > 0 && (
          <TouchableOpacity
            style={[styles.floatingButton, {
              top: isMobile ? 10 : 20,
              right: isMobile ? 150 : 230,
              backgroundColor: selectionInteractionMode === 'move' ? '#27ae60' : '#f39c12',
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonRadius
            }]}
            onPress={toggleSelectionInteractionMode}
          >
            <Feather
              name={selectionInteractionMode === 'move' ? 'move' : 'square'}
              size={iconSize}
              color="#fff"
            />
          </TouchableOpacity>
        )}

        {!sandbox && !isEditingVideo && (
          <TouchableOpacity
            style={[styles.floatingButton, styles.floatingButtonPrimary, {
              top: isMobile ? 10 : 20,
              right: isMobile ? 48 : 90,
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonRadius
            }]}
            onPress={onSave}
          >
            <Feather name="save" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {!sandbox && !isEditingVideo && (
          <TouchableOpacity
            style={[styles.floatingButton, styles.floatingButtonDanger, {
              top: isMobile ? 10 : 20,
              right: isMobile ? 10 : 20,
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonRadius
            }]}
            onPress={onCancel}
          >
            <MaterialIcons name="cancel" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Bot�n de volver para modo edici�n de video */}
        {isEditingVideo && (
          <TouchableOpacity
            style={[styles.floatingButton, styles.floatingButtonDanger, {
              top: isMobile ? 10 : 20,
              right: isMobile ? 10 : 20,
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonRadius
            }]}
            onPress={handleCancelar}
          >
            <Feather name="arrow-left" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Bot�n de volver para modo pizarra t�ctica (sandbox) */}
        {sandbox && !isEditingVideo && (
          <TouchableOpacity
            style={[styles.floatingButton, styles.floatingButtonDanger, {
              top: isMobile ? 10 : 20,
              right: isMobile ? 10 : 20,
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonRadius
            }]}
            onPress={handleCancelar}
          >
            <Feather name="arrow-left" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Panel de selecci�n m�ltiple (fuera del campo, a la derecha debajo de guardar/cerrar) */}
        {multiSelectMode && selectedCloneIds.length > 0 && (
          <View style={{
            position: 'absolute',
            top: isMobile ? 80 : 250,
            right: isMobile ? 35 : 20,
            zIndex: 10002,
            alignItems: 'center'
          }}>
            <View style={{
              backgroundColor: 'rgba(0,0,0,0.85)',
              padding: isMobile ? 8 : 10,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TouchableOpacity onPress={duplicateSelectedElements} style={{ alignItems: 'center', marginBottom: 8 }}>
                <Feather name="copy" size={isMobile ? 12 : 18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: isMobile ? 8 : 11, marginTop: 4 }}>Duplicar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => rotateSelectedElements(15)} style={{ alignItems: 'center', marginBottom: 8 }}>
                <Feather name="rotate-cw" size={isMobile ? 12 : 18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: isMobile ? 8 : 11, marginTop: 4 }}>Rotar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleLockSelected} style={{ alignItems: 'center', marginBottom: 8 }}>
                <Feather name={selectedCloneIds.every(id => (clones.find(c => c.id === id) || {}).locked) ? 'unlock' : 'lock'} size={isMobile ? 12 : 18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: isMobile ? 8 : 11, marginTop: 4 }}>{selectedCloneIds.every(id => (clones.find(c => c.id === id) || {}).locked) ? 'Desbloq.' : 'Bloquear'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={bringSelectedToFront} style={{ alignItems: 'center', marginBottom: 8 }}>
                <Feather name="arrow-up-circle" size={isMobile ? 12 : 18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: isMobile ? 8 : 11, marginTop: 4 }}>Traer</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={sendSelectedToBack} style={{ alignItems: 'center', marginBottom: 8 }}>
                <Feather name="arrow-down-circle" size={isMobile ? 12 : 18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: isMobile ? 8 : 11, marginTop: 4 }}>Fondo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deleteSelectedElements} style={{ alignItems: 'center', marginBottom: 6 }}>
                <Feather name="trash-2" size={isMobile ? 12 : 18} color="#ff3b30" />
                <Text style={{ color: '#fff', fontSize: isMobile ? 8 : 11, marginTop: 4 }}>Eliminar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearSelection} style={{ backgroundColor: '#95a5a6', padding: 8, borderRadius: 20, marginTop: 6 }}>
                <Feather name="x" size={isMobile ? 12 : 18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </>
    );
  }

  const SlidingPlayersPalette = React.memo(function SlidingPlayersPalette({
    visible,
    onClose,
    availablePlayers,
    onSelectPlayer,
    onLongPressPlayer,
    onOpenSettings,
    isMobile = false,
    teamPlayerColor = '#2176ff',
    numberColor = '#ffffff',
    textColor = '#000000',
    textBackgroundColor = '#ffffff',
    showPosition = false,
    differentiateGoalkeeper = true,
    goalkeeperStripeColor = '#ffffff',
    showPhotos = false
  }) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(visible ? 0 : 300)).current;
    const [isVisible, setIsVisible] = useState(visible);
    const iconSize = isMobile ? 28 : 44; // M�s peque�o en m�vil
    const nameFontSize = isMobile ? 8 : 10; // M�s peque�o en m�vil
    const dorsalFontSize = isMobile ? 12 : 16; // M�s peque�o en m�vil

    useEffect(() => {
      if (visible) {
        setIsVisible(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start();
      } else {
        Animated.spring(slideAnim, {
          toValue: 300,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start(() => setIsVisible(false));
      }
    }, [visible]);

    if (!isVisible) return null;

    // Ordenar jugadores por n�mero de dorsal
    const sortedPlayers = [...availablePlayers].sort((a, b) => {
      const dorsalA = parseInt(a.dorsal || a.number || 999);
      const dorsalB = parseInt(b.dorsal || b.number || 999);
      return dorsalA - dorsalB;
    });

    // Funci�n para verificar si es portero
    const isGoalkeeper = (player) => {
      const pos = (player.posicion || '').toLowerCase();
      return pos === 'portero' || pos === 'goalkeeper' || pos === 'gk' || pos === 'pt';
    };

    // Funci�n para obtener la etiqueta de posici�n
    const getPositionLabel = (player) => {
      const pos = (player.posicion || '').toLowerCase();
      const posMap = {
        'portero': 'PT',
        'goalkeeper': 'PT',
        'gk': 'PT',
        'central': 'DC',
        'lateral': 'LT',
        'centrocampista': 'MC',
        'extremo': 'EX',
        'delantero': 'DC'
      };
      return posMap[pos] || pos.substring(0, 2).toUpperCase() || '?';
    };

    return (
      <Animated.View
        style={[
          styles.slidingPalette,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: (isMobile ? 4 : 14) + insets.bottom,
            marginBottom: -insets.bottom,
            paddingRight: isMobile ? 60 : 80,
          },
          isMobile && {
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            backgroundColor: 'rgba(40, 60, 80, 0.95)',
          }
        ]}
        pointerEvents="box-none"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.slidingPaletteContent, { paddingVertical: isMobile ? 4 : 12, paddingHorizontal: isMobile ? 8 : 20 }]}
        >
          {sortedPlayers.length === 0 ? (
            <View style={{ padding: 20 }}>
              <Text style={{ color: '#fff', fontSize: 14 }}>{t('tacticalBoard.noPlayersAvailable') || 'No hay jugadores disponibles'}</Text>
            </View>
          ) : (
            sortedPlayers.map((player) => {
              const isGK = isGoalkeeper(player);
              const showStripes = differentiateGoalkeeper && isGK;

              return (
                <LongPressGestureHandler
                  key={player.uniqueId}
                  onHandlerStateChange={({ nativeEvent }) => {
                    if (nativeEvent.state === State.ACTIVE) {
                      onLongPressPlayer && onLongPressPlayer(player);
                    }
                  }}
                  minDurationMs={500}
                >
                  <Pressable
                    onPress={() => onSelectPlayer(player)}
                    style={[styles.paletteIconButton, { width: iconSize + 20, height: iconSize + 36, flexDirection: 'column' }]}
                  >
                    <View style={{
                      width: iconSize,
                      height: iconSize,
                      borderRadius: iconSize / 2,
                      backgroundColor: teamPlayerColor,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 2,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 2,
                      overflow: 'hidden',
                    }}>
                      {/* Rayas horizontales para portero */}
                      {showStripes && (
                        <>
                          <View style={{ position: 'absolute', top: iconSize * 0.1, left: 0, right: 0, height: 3, backgroundColor: goalkeeperStripeColor, opacity: 0.85 }} />
                          <View style={{ position: 'absolute', top: iconSize * 0.35, left: 0, right: 0, height: 3, backgroundColor: goalkeeperStripeColor, opacity: 0.85 }} />
                          <View style={{ position: 'absolute', top: iconSize * 0.6, left: 0, right: 0, height: 3, backgroundColor: goalkeeperStripeColor, opacity: 0.85 }} />
                          <View style={{ position: 'absolute', top: iconSize * 0.85, left: 0, right: 0, height: 3, backgroundColor: goalkeeperStripeColor, opacity: 0.85 }} />
                        </>
                      )}
                      {showPhotos && player.foto ? (
                        <Image
                          source={{ uri: cdnUrl(player.foto) }}
                          style={{
                            width: iconSize - 4,
                            height: iconSize - 4,
                            borderRadius: (iconSize - 4) / 2
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{
                          color: numberColor,
                          fontSize: dorsalFontSize,
                          fontWeight: 'bold',
                        }}>
                          {showPosition ? getPositionLabel(player) : (player.dorsal || player.number || '?')}
                        </Text>
                      )}
                    </View>
                    <View style={{
                      backgroundColor: textBackgroundColor === 'transparent' ? 'transparent' : textBackgroundColor,
                      paddingHorizontal: 3,
                      paddingVertical: 1,
                      borderRadius: 3,
                      minWidth: iconSize,
                    }}>
                      <Text
                        style={{
                          fontSize: nameFontSize,
                          color: textColor,
                          textAlign: 'center',
                          fontWeight: '500'
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {(getPlayerFullName(player) || player.name || 'Sin nombre').substring(0, 12)}
                      </Text>
                    </View>
                  </Pressable>
                </LongPressGestureHandler>
              );
            })
          )}
        </ScrollView>
        {/* Bot�n de ajustes */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 10,
            right: isMobile ? 35 : 45,
            width: isMobile ? 28 : 32,
            height: isMobile ? 28 : 32,
            borderRadius: isMobile ? 14 : 16,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={onOpenSettings}
        >
          <Feather name="settings" size={isMobile ? 16 : 18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={{ position: 'absolute', top: 10, right: 10 }} onPress={onClose}>
          <Feather name="x" size={isMobile ? 20 : 24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }, (prevProps, nextProps) => {
    if (prevProps.visible !== nextProps.visible) return false;
    if (prevProps.isMobile !== nextProps.isMobile) return false;
    if (prevProps.availablePlayers.length !== nextProps.availablePlayers.length) return false;
    if (prevProps.teamPlayerColor !== nextProps.teamPlayerColor) return false;
    if (prevProps.numberColor !== nextProps.numberColor) return false;
    if (prevProps.textColor !== nextProps.textColor) return false;
    if (prevProps.textBackgroundColor !== nextProps.textBackgroundColor) return false;
    if (prevProps.showPosition !== nextProps.showPosition) return false;
    if (prevProps.differentiateGoalkeeper !== nextProps.differentiateGoalkeeper) return false;
    if (prevProps.goalkeeperStripeColor !== nextProps.goalkeeperStripeColor) return false;
    return true;
  });

  // Paleta de materiales de entrenamiento
  const SlidingMaterialsPalette = React.memo(function SlidingMaterialsPalette({
    visible,
    onClose,
    onSelectMaterial,
    onLongPressMaterial,
    materialsConfig,
    isMobile = false
  }) {
    const slideAnim = useRef(new Animated.Value(visible ? 0 : 300)).current;
    const insets = useSafeAreaInsets();
    const [isVisible, setIsVisible] = useState(visible);
    const iconSize = isMobile ? 28 : 50;
    const labelFontSize = isMobile ? 7 : 10;
    const MATERIALS_ICONS = useMemo(() => getMaterialsIcons(), []);

    useEffect(() => {
      if (visible) {
        setIsVisible(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start();
      } else {
        Animated.spring(slideAnim, {
          toValue: 300,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start(() => setIsVisible(false));
      }
    }, [visible]);

    if (!isVisible) return null;

    return (
      <Animated.View
        style={[
          styles.slidingPalette,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: (isMobile ? 4 : 14) + insets.bottom,
            marginBottom: -insets.bottom,
            paddingRight: isMobile ? 34 : 40,
          },
          isMobile && {
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            backgroundColor: 'rgba(40, 60, 80, 0.95)',
          }
        ]}
        pointerEvents="box-none"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.slidingPaletteContent, { paddingVertical: isMobile ? 3 : 12, paddingHorizontal: isMobile ? 8 : 20 }]}
        >
          {MATERIALS_ICONS.map((material, idx) => {
            // Obtener Configuraci�n personalizada si existe
            const customConfig = materialsConfig?.[material.type] || {};
            const displayMaterial = {
              ...material,
              color: customConfig.color || material.color,
              size: customConfig.size || material.size,
            };

            return (
              <Pressable
                key={material.id}
                onPress={() => onSelectMaterial(displayMaterial)}
                onLongPress={() => {
                  if (material.editable && onLongPressMaterial) {
                    onLongPressMaterial(displayMaterial, idx);
                  }
                }}
                delayLongPress={400}
                style={[
                  styles.paletteIconButton,
                  { width: iconSize + (isMobile ? 4 : 10), height: iconSize + (isMobile ? 16 : 25), flexDirection: 'column' },
                  isMobile && {
                    borderRadius: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    marginHorizontal: 3,
                  }
                ]}
              >
                <View style={{
                  width: iconSize,
                  height: iconSize,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: isMobile ? 2 : 4,
                }}>
                  <MemoizedIcon
                    icon={displayMaterial}
                    size={iconSize * 0.8}
                    rotation={0}
                  />
                </View>
                <Text
                  style={{
                    fontSize: labelFontSize,
                    color: '#fff',
                    textAlign: 'center',
                    width: iconSize + (isMobile ? 4 : 10),
                    fontWeight: '500'
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {material.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={{ position: 'absolute', top: isMobile ? 6 : 10, right: isMobile ? 6 : 10 }} onPress={onClose}>
          <Feather name="x" size={isMobile ? 18 : 24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }, (prevProps, nextProps) => {
    if (prevProps.visible !== nextProps.visible) return false;
    if (prevProps.isMobile !== nextProps.isMobile) return false;
    if (prevProps.materialsConfig !== nextProps.materialsConfig) return false;
    return true;
  });

  // Paleta de cuerpo t�cnico
  const SlidingStaffPalette = React.memo(function SlidingStaffPalette({
    visible,
    onClose,
    onSelectStaff,
    isMobile = false,
    staffColor = '#333333',
    selectedStaffIds = [] // IDs de los staff ya en el campo
  }) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(visible ? 0 : 300)).current;
    const [isVisible, setIsVisible] = useState(visible);
    const iconSize = isMobile ? 36 : 50;
    const labelFontSize = isMobile ? 7 : 9;

    // Definir los roles del cuerpo t�cnico
    const allStaffRoles = useMemo(() => [
      { id: 'head-coach', code: t('tacticalBoard.staff.E1'), label: t('tacticalBoard.staff.headCoach') },
      { id: 'assistant-coach', code: t('tacticalBoard.staff.E2'), label: t('tacticalBoard.staff.assistantCoach') },
      { id: 'fitness-coach', code: t('tacticalBoard.staff.PF'), label: t('tacticalBoard.staff.fitnessCoach') },
      { id: 'physio', code: t('tacticalBoard.staff.F'), label: t('tacticalBoard.staff.physio') },
      { id: 'goalkeeper-coach', code: t('tacticalBoard.staff.EP'), label: t('tacticalBoard.staff.goalkeeperCoach') },
      { id: 'delegate', code: t('tacticalBoard.staff.D'), label: t('tacticalBoard.staff.delegate') },
      { id: 'kit-manager', code: t('tacticalBoard.staff.U'), label: t('tacticalBoard.staff.kitManager') },
    ], [t]);

    // Filtrar los roles que no est�n en el campo
    const availableStaffRoles = useMemo(() => {
      return allStaffRoles.filter(role => !selectedStaffIds.includes(role.id));
    }, [allStaffRoles, selectedStaffIds]);

    useEffect(() => {
      if (visible) {
        setIsVisible(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start();
      } else {
        Animated.spring(slideAnim, {
          toValue: 300,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start(() => setIsVisible(false));
      }
    }, [visible]);

    if (!isVisible) return null;

    return (
      <Animated.View
        style={[
          styles.slidingPalette,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: (isMobile ? 4 : 14) + insets.bottom,
            marginBottom: -insets.bottom,
            paddingRight: isMobile ? 34 : 40,
          },
          isMobile && {
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            backgroundColor: 'rgba(40, 60, 80, 0.95)',
          }
        ]}
        pointerEvents="box-none"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.slidingPaletteContent, { paddingVertical: isMobile ? 4 : 12, paddingHorizontal: isMobile ? 8 : 20 }]}
        >
          {availableStaffRoles.length === 0 ? (
            <View style={{ padding: 20 }}>
              <Text style={{ color: '#fff', fontSize: 14 }}>{t('tacticalBoard.staff.allStaffOnField') || 'Todo el cuerpo t�cnico est� en el campo'}</Text>
            </View>
          ) : (
            availableStaffRoles.map((role) => (
              <Pressable
                key={role.id}
                onPress={() => onSelectStaff(role)}
                style={[styles.paletteIconButton, {
                  width: iconSize + 20,
                  height: iconSize + 50,
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  paddingTop: 6,
                }]}
              >
                <View style={{
                  width: iconSize,
                  height: iconSize,
                  borderRadius: iconSize / 2,
                  backgroundColor: staffColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 4,
                  borderWidth: 2,
                  borderColor: '#666',
                }}>
                  <Text style={{
                    color: '#ffffff',
                    fontSize: isMobile ? 12 : 16,
                    fontWeight: 'bold',
                  }}>
                    {role.code}
                  </Text>
                </View>
                <View style={{ height: 28, justifyContent: 'flex-start' }}>
                  <Text
                    style={{
                      fontSize: labelFontSize,
                      color: '#fff',
                      textAlign: 'center',
                      width: iconSize + 20,
                      fontWeight: '500'
                    }}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {role.label}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
        <TouchableOpacity style={{ position: 'absolute', top: 10, right: 10 }} onPress={onClose}>
          <Feather name="x" size={isMobile ? 20 : 24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }, (prevProps, nextProps) => {
    if (prevProps.visible !== nextProps.visible) return false;
    if (prevProps.isMobile !== nextProps.isMobile) return false;
    if (prevProps.staffColor !== nextProps.staffColor) return false;
    if (prevProps.selectedStaffIds?.length !== nextProps.selectedStaffIds?.length) return false;
    return true;
  });

  const SlidingPalette = React.memo(function SlidingPalette({
    visible,
    onClose,
    paletteIcons,
    onIconPress,
    onIconLongPress,
    onAddText,
    onToggleEraser,
    drawingStates,
    isMobile = false,
    playersWithNumber = true
  }) {
    const slideAnim = useRef(new Animated.Value(visible ? 0 : 300)).current;
    const insets = useSafeAreaInsets();
    const [isVisible, setIsVisible] = useState(visible);
    const iconSize = isMobile ? 28 : 44; // M�s peque�o en m�vil

    useEffect(() => {
      if (visible) {
        setIsVisible(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start();
      } else {
        Animated.spring(slideAnim, {
          toValue: 300,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start(() => setIsVisible(false));
      }
    }, [visible]);

    if (!isVisible) return null;

    return (
      <Animated.View
        style={[
          styles.slidingPalette,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: (isMobile ? 4 : 14) + insets.bottom,
            marginBottom: -insets.bottom,
            paddingRight: isMobile ? 34 : 40,
          },
          isMobile && {
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            backgroundColor: 'rgba(40, 60, 80, 0.95)',
          }
        ]}
        pointerEvents="box-none"
      >

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.slidingPaletteContent, { paddingVertical: isMobile ? 4 : 12, paddingHorizontal: isMobile ? 8 : 20 }]}
        >
          {paletteIcons.map((icon, idx) => {
            const isSelected =
              (icon.type === 'straight-arrow' && drawingStates.drawingStraightArrow) ||
              (icon.type === 'straight-line' && drawingStates.drawingStraightLine) ||
              (icon.type === 'curve-line' && drawingStates.drawingCurveLine) ||
              (icon.type === 'curve-arrow' && drawingStates.drawingCurveArrow) ||
              (icon.type === 'circle' && drawingStates.drawingCircle) ||
              (icon.type === 'rectangle' && drawingStates.drawingRectangle) ||
              (icon.type === 'custom-shape-button' && drawingStates.drawingCustomShape);

            return (
              <PaletteIconButton
                key={icon.id}
                icon={icon}
                idx={idx}
                iconSize={iconSize}
                isSelected={isSelected}
                isMobile={isMobile}
                onPress={onIconPress}
                onLongPress={onIconLongPress}
                playersWithNumber={playersWithNumber}
              />
            );
          })}

          <Pressable
            onPress={onAddText}
            style={[
              styles.paletteIconButton,
              { width: iconSize, height: iconSize },
              isMobile && {
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }
            ]}
          >
            <Ionicons name="text" size={isMobile ? 18 : 28} color={isMobile ? '#ffffff' : '#000000ff'} />
          </Pressable>

          <Pressable
            onPress={onToggleEraser}
            style={[
              styles.paletteIconButton,
              {
                width: iconSize,
                height: iconSize,
                backgroundColor: drawingStates.eraserMode ? '#ff6b6b' : 'rgba(255, 255, 255, 0.1)',
                borderWidth: drawingStates.eraserMode ? 2 : 0,
                borderColor: drawingStates.eraserMode ? '#ff0000' : 'transparent',
              },
              isMobile && !drawingStates.eraserMode && {
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }
            ]}
          >
            <MaterialCommunityIcons name="eraser" size={isMobile ? 18 : 26} color={drawingStates.eraserMode ? '#ffffffff' : (isMobile ? '#ffffff' : 'black')} />
          </Pressable>
        </ScrollView>
        <TouchableOpacity style={{ position: 'absolute', top: isMobile ? 6 : 10, right: isMobile ? 6 : 10 }} onPress={onClose}>
          <Feather name="x" size={isMobile ? 18 : 24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }, (prevProps, nextProps) => {
    // Comparaci�n m�s granular
    if (prevProps.visible !== nextProps.visible) return false;
    if (prevProps.isMobile !== nextProps.isMobile) return false;
    if (prevProps.playersWithNumber !== nextProps.playersWithNumber) return false;
    if (prevProps.paletteIcons.length !== nextProps.paletteIcons.length) return false;

    // Comparar drawingStates individualmente
    const prevDS = prevProps.drawingStates;
    const nextDS = nextProps.drawingStates;
    if (prevDS.drawingStraightArrow !== nextDS.drawingStraightArrow ||
      prevDS.drawingStraightLine !== nextDS.drawingStraightLine ||
      prevDS.drawingCurveLine !== nextDS.drawingCurveLine ||
      prevDS.drawingCurveArrow !== nextDS.drawingCurveArrow ||
      prevDS.drawingCircle !== nextDS.drawingCircle ||
      prevDS.drawingRectangle !== nextDS.drawingRectangle ||
      prevDS.drawingCustomShape !== nextDS.drawingCustomShape ||
      prevDS.eraserMode !== nextDS.eraserMode) {
      return false;
    }

    // Comparar cada icono de la paleta
    for (let i = 0; i < prevProps.paletteIcons.length; i++) {
      const prev = prevProps.paletteIcons[i];
      const next = nextProps.paletteIcons[i];
      if (prev.id !== next.id ||
        prev.color !== next.color ||
        prev.size !== next.size ||
        prev.type !== next.type ||
        prev.lineType !== next.lineType ||
        prev.fillColor !== next.fillColor ||
        prev.thickness !== next.thickness) {
        return false;
      }
    }

    return true;
  });

  // Componente memoizado para cada bot�n de icono en la paleta
  const PaletteIconButton = React.memo(({
    icon,
    idx,
    iconSize,
    isSelected,
    isMobile,
    onPress,
    onLongPress,
    playersWithNumber = true
  }) => {
    return (
      <Pressable
        onPress={() => onPress(icon, idx)}
        onLongPress={() => onLongPress(icon, idx)}
        style={[
          styles.paletteIconButton,
          { width: iconSize, height: iconSize },
          isSelected && styles.paletteIconButtonSelected,
          isMobile && !isSelected && {
            borderRadius: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            marginHorizontal: 3,
          }
        ]}
      >
        <MemoizedIcon
          icon={icon}
          size={isMobile ? 22 : 32}
          rotation={0}
          number={icon.type === 'player' ? icon.number : undefined}
          playersWithNumber={playersWithNumber}
          displayLabel={icon.displayLabel}
          numberColor={icon.displayLabel ? (formationSettings?.numberColor || icon.numberColor) : (icon.number !== undefined ? (icon.numberColor || '#ffffff') : undefined)}
        />
      </Pressable>
    );
  }, (prevProps, nextProps) => {
    return prevProps.isSelected === nextProps.isSelected &&
      prevProps.iconSize === nextProps.iconSize &&
      prevProps.isMobile === nextProps.isMobile &&
      prevProps.playersWithNumber === nextProps.playersWithNumber &&
      prevProps.icon.color === nextProps.icon.color &&
      prevProps.icon.size === nextProps.icon.size &&
      prevProps.icon.thickness === nextProps.icon.thickness &&
      prevProps.icon.number === nextProps.icon.number &&
      prevProps.icon.type === nextProps.icon.type &&
      prevProps.icon.lineType === nextProps.icon.lineType &&
      prevProps.icon.fillColor === nextProps.icon.fillColor;
  });

  const SlidingZoomControls = React.memo(function SlidingZoomControls({
    visible,
    onClose,
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onPanLeft,
    onPanRight,
    onPanUp,
    onPanDown,
    onReset
  }) {
    const dimensions = useScreenDimensions();
    const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
    const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
    const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
    const slideAnim = useRef(new Animated.Value(visible ? 0 : -200)).current;
    const [isVisible, setIsVisible] = useState(visible);

    useEffect(() => {
      if (visible) {
        setIsVisible(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start();
      } else {
        Animated.spring(slideAnim, {
          toValue: -200,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }).start(() => setIsVisible(false));
      }
    }, [visible]);

    if (!isVisible) return null;

    return (
      <Animated.View
        style={[
          styles.slidingZoomControls,
          {
            transform: [{ translateX: slideAnim }],
          },
          isMobile && styles.slidingZoomControlsMobile
        ]}
        pointerEvents="auto"
      >
        {/* Header */}
        <View style={[styles.slidingZoomHeader, isMobile && styles.slidingZoomHeaderMobile]}>
          <Text style={[styles.slidingZoomTitle, isMobile && styles.slidingZoomTitleMobile]}>{t('tacticalBoard.zoom')}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} accessibilityLabel={t('tacticalBoard.close')}>
            <Feather name="x" size={isMobile ? 16 : 20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Contenido */}
        <View style={[styles.slidingZoomContent, isMobile && styles.slidingZoomContentMobile]}>
          <TouchableOpacity
            style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
            onPress={onZoomIn}
            activeOpacity={0.7}
            accessibilityLabel={t('tacticalBoard.zoomIn')}
          >
            <Feather name="zoom-in" size={isMobile ? 18 : 24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
            onPress={onZoomOut}
            activeOpacity={0.7}
            accessibilityLabel={t('tacticalBoard.zoomOut')}
          >
            <Feather name="zoom-out" size={isMobile ? 18 : 24} color="#fff" />
          </TouchableOpacity>

          <View style={[styles.zoomSeparator, isMobile && styles.zoomSeparatorMobile]} />

          <TouchableOpacity
            style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
            onPress={onPanUp}
            activeOpacity={0.7}
            accessibilityLabel={t('tacticalBoard.panUp')}
          >
            <Feather name="chevron-up" size={isMobile ? 18 : 24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
            onPress={onPanDown}
            activeOpacity={0.7}
            accessibilityLabel={t('tacticalBoard.panDown')}
          >
            <Feather name="chevron-down" size={isMobile ? 18 : 24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
            onPress={onPanLeft}
            activeOpacity={0.7}
            accessibilityLabel={t('tacticalBoard.panLeft')}
          >
            <Feather name="chevron-left" size={isMobile ? 18 : 24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
            onPress={onPanRight}
            activeOpacity={0.7}
            accessibilityLabel={t('tacticalBoard.panRight')}
          >
            <Feather name="chevron-right" size={isMobile ? 18 : 24} color="#fff" />
          </TouchableOpacity>

          <View style={[styles.zoomSeparator, isMobile && styles.zoomSeparatorMobile]} />

          <TouchableOpacity
            style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
            onPress={onReset}
            activeOpacity={0.7}
            accessibilityLabel={t('tacticalBoard.resetZoom')}
          >
            <Feather name="maximize" size={isMobile ? 18 : 24} color="#fff" />
          </TouchableOpacity>

          <Text style={[styles.zoomLevelText, isMobile && styles.zoomLevelTextMobile]}>{Math.round(zoomLevel * 100)}%</Text>
        </View>
      </Animated.View>
    );
  }, (prevProps, nextProps) => {
    // Solo re-renderizar si cambia visible o zoomLevel (para actualizar el porcentaje)
    return prevProps.visible === nextProps.visible &&
      prevProps.zoomLevel === nextProps.zoomLevel;
  });

  // Solo ocultar TODOS los botones cuando hay modales que realmente lo requieren
  const shouldHideFloatingButtons = settingsPanelVisible ||
    lockedElementsVisible ||
    leftPanelVisible ||
    textEditPanel.visible ||
    paletteEdit.visible ||
    carouselModalVisible ||
    lineStyleModalVisible;


  // Ocultar solo botones inferiores cuando la paleta o zoom est� visible
  const shouldHideBottomButtons = paletteVisible || zoomVisible;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#4a8c3f' }}>
      <View ref={containerRef} style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#4a8c3f', position: 'relative', touchAction: isMobile ? 'none' : 'auto', overflow: 'hidden', paddingRight: isMobile && videoRecorderVisible ? 112 : 0 }}>
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
          lockedCount: clones.filter(c => c.locked === true).length,
          isMobile,
        })}

        {/* Bot�n de deseleccionar herramienta de dibujo - siempre visible */}
        {(drawingStates.drawingStraightArrow ||
          drawingStates.drawingStraightLine ||
          drawingStates.drawingCurveLine ||
          drawingStates.drawingCurveArrow ||
          drawingStates.drawingCircle ||
          drawingStates.drawingRectangle ||
          drawingStates.drawingCustomShape) && (
            <TouchableOpacity
              onPress={handleDeselectDrawingTool}
              style={{
                position: 'absolute',
                top: isMobile ? 55 : 90,
                right: isMobile ? 10 : 20,
                width: isMobile ? 36 : 50,
                height: isMobile ? 36 : 50,
                borderRadius: isMobile ? 18 : 25,
                backgroundColor: '#ff0000',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 5,
              }}
            >
              <Ionicons name="move" size={isMobile ? 16 : 24} color="#ffffff" />
            </TouchableOpacity>
          )}

        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        }}>
          <View
            style={{
              width: '100%',
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
                },
              ]}
            >
              <View style={{ position: 'absolute', left: -10000, top: 0, width: referenceWidth, height: referenceHeight }}>
                <ViewShot
                  ref={fieldBaseRef}
                  options={FIELD_CAPTURE_OPTIONS}
                  style={{ width: referenceWidth, height: referenceHeight, backgroundColor: FIELD_CAPTURE_BACKGROUND }}
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
                    { scale: zoomLevel },
                    { translateX: panOffset.x },
                    { translateY: panOffset.y }
                  ]
                }}
              >
                <ViewShot
                  ref={(ref) => { canvasRef.current = ref; fieldRef.current = ref; }}
                  options={FIELD_CAPTURE_OPTIONS}
                  style={{ width: imageWidth, height: imageHeight, backgroundColor: FIELD_CAPTURE_BACKGROUND }}
                >
                  <View
                    style={{
                      width: imageWidth,
                      height: imageHeight,
                      overflow: 'visible',
                      backgroundColor: FIELD_CAPTURE_BACKGROUND
                    }}
                  >
                    <View
                      style={{
                        width: imageWidth,
                        height: imageHeight,
                        backgroundColor: FIELD_CAPTURE_BACKGROUND,
                        opacity: fieldImageReady ? 1 : 0,
                        userSelect: 'none',
                        touchAction: 'none',
                        zIndex: multiSelectMode ? 9999 :
                          (drawingStraightArrow || drawingStraightLine || drawingCircle || drawingRectangle ||
                            drawingCurveLine || drawingCurveArrow || drawingCustomShape || eraserMode) ? 9999 : 0
                      }}
                      onStartShouldSetResponder={() => true}
                      onMoveShouldSetResponder={() => {
                        return eraserMode || drawingStraightArrow || drawingStraightLine || drawingCircle ||
                          drawingRectangle || drawingCurveLine || drawingCurveArrow || drawingCustomShape;
                      }}
                      onResponderGrant={(e) => {
                        const { locationX, locationY } = e.nativeEvent;
                        fieldTouchStartRef.current = { x: locationX, y: locationY, timestamp: Date.now() };

                        if (eraserMode) {
                          handleEraserStart(e);
                          return;
                        }
                        if (drawingStraightArrow || drawingStraightLine || drawingCircle || drawingRectangle) {
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
                        if (eraserMode) {
                          handleEraserMove(e);
                          return;
                        }
                        if (drawingStraightArrow || drawingStraightLine || drawingCircle || drawingRectangle) {
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
                        if (eraserMode) {
                          handleEraserEnd();
                          fieldTouchStartRef.current = null;
                          return;
                        }
                        if (drawingStraightArrow || drawingStraightLine || drawingCircle || drawingRectangle) {
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
                              const timeSinceLastSelection = Date.now() - lastIconSelectionTime;
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
                      <View style={{ width: imageWidth, height: imageHeight, position: 'absolute', left: 0, top: 0, zIndex: 1 }} pointerEvents="none">
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
                          zIndex: 200
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
                        style={{ position: 'absolute', width: imageWidth, height: imageHeight, zIndex: 200 }}
                        pointerEvents={(drawingStraightArrow || drawingStraightLine || drawingCircle || drawingRectangle ||
                          drawingCurveLine || drawingCurveArrow || drawingCustomShape) ? "none" : "box-none"}
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
                          if (icon.type === 'straight-line' || icon.type === 'straight-arrow' ||
                            icon.type === 'curve-line' || icon.type === 'curve-arrow' ||
                            icon.type === 'circle' || icon.type === 'rectangle') {
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
                          />
                        ))}
                      </View>
                      {/* Fin del contenedor de �reas de detecci�n */}

                      {/* Vista previa de l�neas y flechas rectas */}
                      {(drawingStraightArrow || drawingStraightLine || drawingCircle || drawingRectangle) && temporaryLinePoints.length === 2 && (() => {
                        // Obtener el icono ACTUAL de la paleta buscando por type
                        const currentPaletteIcon = paletteIcons.find(icon => icon.type === pendingLineAction?.type);

                        // Calcular el grosor EXACTAMENTE como en el renderizado final
                        const scale = 1; // No hay redimensionamiento al dibujar
                        const baseThickness = currentPaletteIcon?.thickness || 1;
                        const previewThickness = baseThickness * scale * 0.7;
                        const previewColor = currentPaletteIcon?.color || "#000000";

                        // Convert ratio coords to display coords
                        const dp0 = ratioToDisplay(temporaryLinePoints[0].x, temporaryLinePoints[0].y, viewMode, imageWidth, imageHeight);
                        const dp1 = ratioToDisplay(temporaryLinePoints[1].x, temporaryLinePoints[1].y, viewMode, imageWidth, imageHeight);

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
                            previewThickness
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
                              zIndex: 100
                            }}
                          >
                            {/* L�nea normal */}
                            {(drawingStraightArrow || drawingStraightLine) && lineType === 'solid' && (
                              <Path
                                d={`M${dp0.x},${dp0.y} L${lineEndX},${lineEndY}`}
                                stroke={previewColor}
                                strokeWidth={previewThickness}
                                fill="none"
                                strokeLinecap="round"
                              />
                            )}

                            {/* L�nea punteada */}
                            {(drawingStraightArrow || drawingStraightLine) && lineType === 'dotted' && (
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
                              <Circle
                                cx={(dp0.x + dp1.x) / 2}
                                cy={(dp0.y + dp1.y) / 2}
                                r={Math.sqrt(
                                  Math.pow(dp1.x - dp0.x, 2) +
                                  Math.pow(dp1.y - dp0.y, 2)
                                ) / 2 - 1}
                                stroke={previewColor}
                                strokeWidth={previewThickness}
                                fill="none"
                                strokeDasharray={lineType === 'dotted' ? `${dotSize},${dotSpacing}` : undefined}
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
                                fill="none"
                                strokeDasharray={lineType === 'dotted' ? `${dotSize},${dotSpacing}` : undefined}
                                strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                              />
                            )}
                          </Svg>
                        );
                      })()}

                      {/* Vista previa de l�neas y flechas curvas */}
                      {(drawingCurveArrow || drawingCurveLine) && curvePoints.length >= 1 && (() => {
                        // Obtener el icono ACTUAL de la paleta buscando por type
                        const currentPaletteIcon = paletteIcons.find(icon => icon.type === pendingLineAction?.type);

                        // Calcular el grosor EXACTAMENTE como en el renderizado final
                        const scale = 1;
                        const baseThickness = currentPaletteIcon?.thickness || 1;
                        const previewThickness = baseThickness * scale * 0.7;
                        const previewColor = currentPaletteIcon?.color || "#000000";
                        const displayCurvePoints = curvePoints.map(pt => ratioToDisplay(pt.x, pt.y, viewMode, imageWidth, imageHeight));

                        return (
                          <Svg
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: imageWidth,
                              height: imageHeight,
                              zIndex: 100
                            }}
                          >
                            {/* L�nea s�lida */}
                            {lineType === 'solid' && (
                              <Path
                                key="curve-preview-solid"
                                d={displayCurvePoints.map((pt, i) =>
                                  i === 0
                                    ? `M${pt.x},${pt.y}`
                                    : `L${pt.x},${pt.y}`
                                ).join(' ')}
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
                                d={displayCurvePoints.map((pt, i) =>
                                  i === 0
                                    ? `M${pt.x},${pt.y}`
                                    : `L${pt.x},${pt.y}`
                                ).join(' ')}
                                stroke={previewColor}
                                strokeWidth={previewThickness}
                                strokeDasharray={`${dotSize},${dotSpacing}`}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}

                            {/* Flecha curva mejorada - usar los �ltimos 2 puntos para mejor direcci�n */}
                            {drawingCurveArrow && curvePoints.length >= 2 && (() => {
                              // Buscar los dos �ltimos puntos diferentes para calcular la direcci�n correcta
                              let lastIdx = curvePoints.length - 1;
                              let secondLastIdx = lastIdx - 1;

                              // Si los �ltimos puntos est�n muy cerca, buscar uno m�s alejado
                              while (secondLastIdx >= 0) {
                                const dist = Math.sqrt(
                                  Math.pow(displayCurvePoints[lastIdx].x - displayCurvePoints[secondLastIdx].x, 2) +
                                  Math.pow(displayCurvePoints[lastIdx].y - displayCurvePoints[secondLastIdx].y, 2)
                                );
                                if (dist > 5) break; // Al menos 5 p�xeles de diferencia
                                secondLastIdx--;
                              }

                              if (secondLastIdx < 0) secondLastIdx = 0;

                              const arrowData = getArrowHeadForStraightLine(
                                displayCurvePoints[secondLastIdx],
                                displayCurvePoints[lastIdx],
                                standardSize || 24,
                                0.5,
                                previewThickness
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
                      {drawingCustomShape && (customShapePoints.length > 0 || previewPoint) && (() => {
                        // Obtener el icono ACTUAL de la paleta buscando por type
                        const currentPaletteIcon = paletteIcons.find(icon => icon.type === 'custom-shape-button');

                        // Calcular el grosor din�mico basado en el icono pendiente
                        const baseThickness = currentPaletteIcon?.thickness || 1;
                        const previewScale = (imageWidth / 500 + imageHeight / 500) / 2;
                        const previewThickness = baseThickness * previewScale * 0.7;
                        const previewColor = currentPaletteIcon?.color || "#000000";
                        const displayShapePoints = customShapePoints.map(pt => ratioToDisplay(pt.x, pt.y, viewMode, imageWidth, imageHeight));
                        const displayPreviewPt = previewPoint ? ratioToDisplay(previewPoint.x, previewPoint.y, viewMode, imageWidth, imageHeight) : null;

                        return (
                          <Svg
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: imageWidth,
                              height: imageHeight,
                              zIndex: 100
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
                                fill={pendingLineAction?.icon?.color || "#000000"}
                              />
                            ))}

                            {/* Punto de previsualizaci�n */}
                            {previewPoint && (
                              <Circle
                                cx={displayPreviewPt.x}
                                cy={displayPreviewPt.y}
                                r={4}
                                fill={pendingLineAction?.icon?.color || "#000000"}
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
                      <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: imageWidth,
                        height: imageHeight,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(178, 247, 184, 0.95)',
                        zIndex: 1000
                      }}>
                        <ActivityIndicator size="large" color="#2e7d32" />
                        <Text style={{ marginTop: 10, color: '#2e7d32', fontSize: 16, fontWeight: '600' }}>Cargando campo...</Text>
                      </View>
                    )}
                  </View>

                </ViewShot>

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
                        shadowOffset: { width: 0, height: 4 },
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
                        Suelta para eliminar
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
                    ref={(node) => { selectionOverlayRef.current = node; }}
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
            teamPlayerColor={teamPlayerStyle?.color || boardSettings?.teamPlayers?.color || '#2176ff'}
            numberColor={teamPlayerStyle?.numberColor || '#ffffff'}
            textColor={teamPlayerStyle?.textColor || '#000000'}
            textBackgroundColor={teamPlayerStyle?.textBackgroundColor || '#ffffff'}
            showPosition={teamPlayerStyle?.showPosition || false}
            differentiateGoalkeeper={teamPlayerStyle?.differentiateGoalkeeper !== false}
            goalkeeperStripeColor={teamPlayerStyle?.goalkeeperStripeColor || '#ffffff'}
            showPhotos={teamPlayerStyle?.showPhotos || false}
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
          onClose={() => setPaletteEdit({ visible: false, icon: null, paletteIndex: null })}
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
          onClose={() => setTextEditPanel({ visible: false, icon: null, isNew: false })}
          onApply={handleApplyTextEdit}
          onPreviewChange={handleTextPreviewChange}
          onDelete={(id) => {
            setClones(prev => prev.filter(c => c.id !== id));
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
          shapeType={pendingLineAction?.type === 'custom-shape-button' ? 'custom-shape' : pendingLineAction?.type}
        />

        {/* Modal de jugadores del equipo */}
        <TeamPlayersModal
          visible={playersModalVisible}
          onClose={() => setPlayersModalVisible(false)}
          availablePlayers={availablePlayers}
          onSelectPlayer={handleSelectPlayer}
          isMobile={isMobile}
          showPhotos={teamPlayerStyle.showPhotos}
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
          onClose={() => setOptionsMenu({ ...optionsMenu, visible: false })}
          onDelete={() => handleDeleteClone(optionsMenu.iconId)}
          onDuplicate={() => handleDuplicateClone(optionsMenu.iconId)}
          onRotate={optionsMenu.canRotate ? () => handleRotateIcon(optionsMenu.iconId) : null}
          onIncreaseSize={() => handleIncreaseSize(optionsMenu.iconId)}
          onDecreaseSize={() => handleDecreaseSize(optionsMenu.iconId)}
          onLock={() => handleToggleLock(optionsMenu.iconId)}
          onBringToFront={() => handleBringToFront(optionsMenu.iconId)}
          onSendToBack={() => handleSendToBack(optionsMenu.iconId)}
          isLocked={clones.find(c => c.id === optionsMenu.iconId)?.locked || false}
          isMobile={isMobile}
          onEdit={() => {
            // Buscar el elemento por id y establecerlo como elemento de edici�n
            const elementToEdit = clones.find(clone => clone.id === optionsMenu.iconId);
            if (elementToEdit) {
              if (elementToEdit.type === 'free-text') {
                // Para elementos de texto, usar el panel de edici�n de texto (no es nuevo)
                setTextEditPanel({ visible: true, icon: elementToEdit, isNew: false });
              } else {
                // Para otros elementos, usar el panel izquierdo
                setEditingIcon(elementToEdit);
                setLeftPanelVisible(true);
              }
            }
            // Cerrar el men� de opciones
            setOptionsMenu({ ...optionsMenu, visible: false });
          }}
          hideEdit={optionsMenu.hideEdit}
          scale={renderScale}
        />

        {/* Panel de elementos bloqueados */}
        <LockedElementsPanel
          visible={lockedElementsVisible}
          onClose={() => setLockedElementsVisible(false)}
          lockedElements={clones.filter(c => c.locked === true)}
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
                <Text style={styles.instructionText}>
                  {instructionMessage.text}
                </Text>
                {instructionMessage.subtext && (
                  <Text style={styles.instructionSubtext}>
                    {instructionMessage.subtext}
                  </Text>
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
            style={styles.eraserModeIndicator}
            activeOpacity={0.7}
          >
            <MaterialIcons name="cleaning-services" size={16} color="#fff" />
            <Text style={styles.eraserModeText}>{t('field.eraserMode')}</Text>
            <Feather name="x" size={14} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}

        {/* Grabador de video */}
        {videoRecorderVisible && (
          <VideoRecorder
            elements={clones}
            connectors={connectors}
            fieldImage={fieldImageForVideo}
            onClose={handleCloseVideoRecorder}
            fieldWidth={referenceWidth}
            fieldHeight={referenceHeight}
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
            onEditVideoSaved={isEditingVideo ? handleEditVideoSaved : null}
          />
        )}


      </View>
    </SafeAreaView>
  );
}

// Actualiza algunos estilos espec�ficos
const styles = StyleSheet.create({
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    width: 36,
    height: 36,
  },
  canvasHolder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0, // Sin bordes redondeados para permitir ver elementos fuera
    overflow: 'visible', // Permitir ver elementos arrastr�ndose fuera
    backgroundColor: '#4a8c3f',
    marginBottom: 8, // Reducido de 18 para dar m�s espacio
    elevation: 2,
  },
  leftPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1a1a1a'
  },
  leftPanelTitleMobile: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1a1a1a'
  },
  leftPanelSubtitle: {
    fontSize: 12,
    color: '#2176ff',
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  leftPanelSubtitleMobile: {
    fontSize: 12,
    color: '#2176ff',
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  leftPanelLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 6,
    color: '#333333'
  },
  leftPanelLabelMobile: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
    color: '#333333'
  },
  leftPanelInput: {
    borderWidth: 1,
    borderColor: '#6b8e4e',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#1a3d1a',
  },
  leftPanelInputMobile: {
    borderWidth: 1,
    borderColor: '#6b8e4e',
    borderRadius: 6,
    padding: 4,
    marginTop: 2,
    marginBottom: 3,
    backgroundColor: '#fff',
    fontSize: 10,
    color: '#1a3d1a',
    width: '15%',
  },
  settingsPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 260,
    backgroundColor: '#d4e8c1',
    zIndex: 100,
    padding: 18,
    borderLeftWidth: 2,
    borderColor: '#6b8e4e',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: -2, height: 0 },
    minHeight: '100%',
    maxHeight: '100%',
  },
  configGear: {
    marginLeft: 18,
    marginRight: 8,
    alignSelf: 'center',
    padding: 2,
  },
  panelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20,50,20,0.75)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.19,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 40,
    paddingTop: 4,
    paddingBottom: 6,
  },
  panelButtonRow: {
    flexDirection: 'row',
    justifyContent: "space-around",
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  panelActionIcon: {
    alignItems: 'center',
    padding: 2,
    justifyContent: 'center',
    flex: 1,
  },
  carouselModalBackdrop: {
    display: "flex",
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselModalBox: {
    borderRadius: 10,
    padding: 16,
    minWidth: 200,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    elevation: 8,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  leftPanelModal: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 280,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  modalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#2176ff',
  },
  modalButtonSecondary: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#ffffff',
  },
  modalButtonTextSecondary: {
    color: '#666666',
  },
  textPanelModal: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    padding: 16,
  },
  textPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  textPanelTitleMobile: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1a1a1a'
  },
  textPanelLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 6,
    color: '#333333',
  },
  textPanelLabelMobile: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
    color: '#333333'
  },
  lineStyleModal: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 280,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    padding: 16,
  },
  lineStyleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  lineStyleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  lineStyleOption: {
    width: 80,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  lineStyleOptionSelected: {
    backgroundColor: '#e8f4ff',
    borderColor: '#2176ff',
  },
  lineStylePreview: {
    width: 60,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  solidLine: {
    width: 40,
    height: 2,
    backgroundColor: '#333',
  },
  lineStyleLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 6,
  },
  dotSizeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  dotSizeOption: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSizeOptionSelected: {
    backgroundColor: '#e8f4ff',
    borderColor: '#2176ff',
  },
  dotSpacingOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  dotSpacingOption: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSpacingOptionSelected: {
    backgroundColor: '#e8f4ff',
    borderColor: '#2176ff',
  },

  lockedPanelModal: {
    position: 'absolute',
    right: 10,
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 999,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  lockedPanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  noLockedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  lockedElementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 4,
  },
  lockedElementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lockedElementIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  lockedElementDetails: {
    flex: 1,
  },
  lockedElementName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  lockedElementType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  lockedElementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedBadgeText: {
    fontSize: 12,
    color: '#f39c12',
    marginLeft: 4,
    fontWeight: '500',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f0f8f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  unlockButtonText: {
    fontSize: 12,
    color: '#27ae60',
    marginLeft: 4,
    fontWeight: '500',
  },
  zoomControls: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -200 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 8,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  zoomSeparator: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 8,
  },
  zoomSeparatorMobile: {
    marginVertical: 4,
  },
  zoomLevelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
  },
  zoomLevelTextMobile: {
    fontSize: 10,
    marginTop: 4,
  },
  zoomText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    width: 10,
  },
  instructionOverlay: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    zIndex: 200,
    alignItems: 'center',
  },
  instructionContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    paddingRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#2176ff',
    maxWidth: 400,
    alignItems: 'center',
  },
  instructionIconContainer: {
    marginRight: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionTextContainer: {
    flex: 1,
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  instructionSubtext: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  instructionCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  eraserModeIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    backgroundColor: 'rgba(220, 60, 60, 0.85)',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
    zIndex: 200,
    gap: 6,
  },
  eraserModeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Nuevos estilos para controles horizontales en m�vil
  zoomControlsHorizontal: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 3,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonHorizontal: {
    width: 30,
    height: 30,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  zoomSeparatorHorizontal: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 6,
  },
  zoomTextHorizontal: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 8,
    minWidth: 40,
    textAlign: 'center',
  },
  floatingButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  floatingButtonPrimary: {
    backgroundColor: '#27ae60',
  },
  floatingButtonDanger: {
    backgroundColor: '#e74c3c',
  },
  floatingButtonGroup: {
    position: 'absolute',
    flexDirection: 'row',
    zIndex: 100,
  },
  floatingButtonBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f39c12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButtonBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  slidingPalette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#3F718C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 90,
  },
  slidingPaletteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  slidingPaletteTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  slidingPaletteContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  paletteIconButton: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  paletteIconButtonSelected: {
    backgroundColor: '#2176ff',
    borderWidth: 2,
    borderColor: '#fff',
  },
  slidingZoomControls: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -160,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  slidingZoomControlsMobile: {
    top: '50%',
    marginTop: -140,
    padding: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
  },
  slidingZoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  slidingZoomHeaderMobile: {
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  slidingZoomTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  slidingZoomTitleMobile: {
    fontSize: 11,
  },
  slidingZoomContent: {
    paddingTop: 10,
    alignItems: 'center',
  },
  slidingZoomContentMobile: {
    paddingTop: 4,
  },
  zoomControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  zoomControlBtnMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginVertical: 2,
  },
  teamPlayersModal: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 340,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    padding: 16,
  },
  teamPlayersTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
  playerGridItem: {
    width: '31%',
    marginHorizontal: '1%',
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  playerGridName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    lineHeight: 14,
    height: 28,
  },
  playerItem: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 4,
  },
  playerIcon: {
    marginBottom: 8,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textAlign: 'center',
  },
  noPlayersText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },

  // ============================================================================
  // ESTILOS DE MODALES PROFESIONALES
  // ============================================================================
  proModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  proModalContainerSide: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    width: 280,
    maxWidth: '70%',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  proModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  proModalHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#e8f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  proModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  proModalTitleMobile: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  proModalSubtitle: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  proModalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proModalBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  proModalSection: {
    marginBottom: 12,
  },
  proModalSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  proModalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  proModalLabelMobile: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  proModalInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#333',
  },
  proModalInputMobile: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#333',
  },
  proModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proModalColorBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  proModalColorBtnMobile: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  proModalSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  proModalSwitchLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  proModalFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  proModalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  proModalBtnPrimary: {
    backgroundColor: '#2176ff',
  },
  proModalBtnSuccess: {
    backgroundColor: '#28a745',
  },
  proModalBtnSecondary: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  proModalBtnDanger: {
    backgroundColor: '#dc3545',
  },
  proModalBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  proModalBtnTextPrimary: {
    color: '#ffffff',
  },
  proModalBtnTextSecondary: {
    color: '#666',
  },
  proModalPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    marginTop: 6,
  },
  proModalChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  proModalChipSelected: {
    backgroundColor: '#e8f4ff',
    borderColor: '#2176ff',
  },
  proModalChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  proModalChipTextSelected: {
    color: '#2176ff',
  },
  proModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  proModalGridItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  proModalGridItemSelected: {
    backgroundColor: '#e8f4ff',
    borderColor: '#2176ff',
  },
  proModalDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  proModalCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  proModalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  proModalCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  proModalHint: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  // Stepper (botones +/-)
  proModalStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  proModalStepperBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  proModalStepperValue: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 50,
    alignItems: 'center',
  },
  proModalStepperValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  // Estilos para conectores
  connectorElementBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    minWidth: 70,
    alignItems: 'center',
  },
  connectorElementBtnSelected: {
    backgroundColor: '#e8f4ff',
    borderColor: '#2176ff',
  },
  connectorElementText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  connectorElementTextSelected: {
    color: '#2176ff',
  },
  connectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  connectorItemText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  connectorItemSubtext: {
    fontSize: 11,
    color: '#666',
    marginLeft: 8,
  },
  connectorColorPreview: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  connectorActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },

});
