// components/pages/matchSheet/LineupEditor.js
// Componente para editar la alineación visualmente con campo de fútbol profesional
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import Svg, { Rect, Line, Circle, Path, G, Defs, ClipPath, Ellipse } from 'react-native-svg';
import { getPlayerFullName, getPlayerFirstName } from '@/utils/playerHelpers';

// Posiciones tácticas predefinidas para diferentes formaciones
const FORMATION_POSITIONS = {
  // === Formaciones de 11 jugadores ===
  '1-4-4-2': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'LI', x: 10, y: 70, label: 'Lateral Izq' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'LD', x: 90, y: 70, label: 'Lateral Der' },
    { pos: 'MI', x: 10, y: 46, label: 'Medio Izq' },
    { pos: 'MC', x: 35, y: 50, label: 'Medio Centro' },
    { pos: 'MC', x: 65, y: 50, label: 'Medio Centro' },
    { pos: 'MD', x: 90, y: 46, label: 'Medio Der' },
    { pos: 'DC', x: 35, y: 22, label: 'Delantero' },
    { pos: 'DC', x: 65, y: 22, label: 'Delantero' },
  ],
  '1-4-3-3': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'LI', x: 10, y: 70, label: 'Lateral Izq' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'LD', x: 90, y: 70, label: 'Lateral Der' },
    { pos: 'MC', x: 25, y: 50, label: 'Medio Centro' },
    { pos: 'MC', x: 50, y: 46, label: 'Medio Centro' },
    { pos: 'MC', x: 75, y: 50, label: 'Medio Centro' },
    { pos: 'EI', x: 15, y: 22, label: 'Extremo Izq' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
    { pos: 'ED', x: 85, y: 22, label: 'Extremo Der' },
  ],
  '1-4-2-3-1': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'LI', x: 10, y: 70, label: 'Lateral Izq' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'LD', x: 90, y: 70, label: 'Lateral Der' },
    { pos: 'MCD', x: 35, y: 56, label: 'Pivote' },
    { pos: 'MCD', x: 65, y: 56, label: 'Pivote' },
    { pos: 'MI', x: 15, y: 36, label: 'Interior Izq' },
    { pos: 'MCO', x: 50, y: 32, label: 'Media Punta' },
    { pos: 'MD', x: 85, y: 36, label: 'Interior Der' },
    { pos: 'DC', x: 50, y: 14, label: 'Delantero' },
  ],
  '1-3-5-2': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 25, y: 76, label: 'Central' },
    { pos: 'DFC', x: 50, y: 80, label: 'Central' },
    { pos: 'DFC', x: 75, y: 76, label: 'Central' },
    { pos: 'CAI', x: 6, y: 50, label: 'Carrilero Izq' },
    { pos: 'MC', x: 28, y: 50, label: 'Medio Centro' },
    { pos: 'MC', x: 50, y: 46, label: 'Medio Centro' },
    { pos: 'MC', x: 72, y: 50, label: 'Medio Centro' },
    { pos: 'CAD', x: 94, y: 50, label: 'Carrilero Der' },
    { pos: 'DC', x: 35, y: 20, label: 'Delantero' },
    { pos: 'DC', x: 65, y: 20, label: 'Delantero' },
  ],
  '1-3-4-3': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 25, y: 76, label: 'Central' },
    { pos: 'DFC', x: 50, y: 80, label: 'Central' },
    { pos: 'DFC', x: 75, y: 76, label: 'Central' },
    { pos: 'MI', x: 12, y: 50, label: 'Medio Izq' },
    { pos: 'MC', x: 38, y: 48, label: 'Medio Centro' },
    { pos: 'MC', x: 62, y: 48, label: 'Medio Centro' },
    { pos: 'MD', x: 88, y: 50, label: 'Medio Der' },
    { pos: 'EI', x: 18, y: 22, label: 'Extremo Izq' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
    { pos: 'ED', x: 82, y: 22, label: 'Extremo Der' },
  ],
  '1-4-5-1': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'LI', x: 10, y: 70, label: 'Lateral Izq' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'LD', x: 90, y: 70, label: 'Lateral Der' },
    { pos: 'MI', x: 10, y: 46, label: 'Medio Izq' },
    { pos: 'MC', x: 30, y: 50, label: 'Medio Centro' },
    { pos: 'MC', x: 50, y: 46, label: 'Medio Centro' },
    { pos: 'MC', x: 70, y: 50, label: 'Medio Centro' },
    { pos: 'MD', x: 90, y: 46, label: 'Medio Der' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
  ],
  '1-5-3-2': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'CAI', x: 6, y: 68, label: 'Carrilero Izq' },
    { pos: 'DFC', x: 28, y: 76, label: 'Central' },
    { pos: 'DFC', x: 50, y: 80, label: 'Central' },
    { pos: 'DFC', x: 72, y: 76, label: 'Central' },
    { pos: 'CAD', x: 94, y: 68, label: 'Carrilero Der' },
    { pos: 'MC', x: 28, y: 48, label: 'Medio Centro' },
    { pos: 'MC', x: 50, y: 44, label: 'Medio Centro' },
    { pos: 'MC', x: 72, y: 48, label: 'Medio Centro' },
    { pos: 'DC', x: 35, y: 20, label: 'Delantero' },
    { pos: 'DC', x: 65, y: 20, label: 'Delantero' },
  ],
  '1-5-4-1': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'CAI', x: 6, y: 68, label: 'Carrilero Izq' },
    { pos: 'DFC', x: 28, y: 76, label: 'Central' },
    { pos: 'DFC', x: 50, y: 80, label: 'Central' },
    { pos: 'DFC', x: 72, y: 76, label: 'Central' },
    { pos: 'CAD', x: 94, y: 68, label: 'Carrilero Der' },
    { pos: 'MI', x: 15, y: 46, label: 'Medio Izq' },
    { pos: 'MC', x: 38, y: 48, label: 'Medio Centro' },
    { pos: 'MC', x: 62, y: 48, label: 'Medio Centro' },
    { pos: 'MD', x: 85, y: 46, label: 'Medio Der' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
  ],
  '1-4-1-4-1': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'LI', x: 10, y: 70, label: 'Lateral Izq' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'LD', x: 90, y: 70, label: 'Lateral Der' },
    { pos: 'MCD', x: 50, y: 58, label: 'Pivote' },
    { pos: 'MI', x: 10, y: 40, label: 'Medio Izq' },
    { pos: 'MC', x: 35, y: 42, label: 'Medio Centro' },
    { pos: 'MC', x: 65, y: 42, label: 'Medio Centro' },
    { pos: 'MD', x: 90, y: 40, label: 'Medio Der' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
  ],
  '1-3-4-1-2': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 25, y: 76, label: 'Central' },
    { pos: 'DFC', x: 50, y: 80, label: 'Central' },
    { pos: 'DFC', x: 75, y: 76, label: 'Central' },
    { pos: 'MI', x: 12, y: 54, label: 'Medio Izq' },
    { pos: 'MC', x: 38, y: 52, label: 'Medio Centro' },
    { pos: 'MC', x: 62, y: 52, label: 'Medio Centro' },
    { pos: 'MD', x: 88, y: 54, label: 'Medio Der' },
    { pos: 'MCO', x: 50, y: 34, label: 'Media Punta' },
    { pos: 'DC', x: 35, y: 18, label: 'Delantero' },
    { pos: 'DC', x: 65, y: 18, label: 'Delantero' },
  ],
  '1-4-3-2-1': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'LI', x: 10, y: 70, label: 'Lateral Izq' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'LD', x: 90, y: 70, label: 'Lateral Der' },
    { pos: 'MC', x: 25, y: 54, label: 'Medio Centro' },
    { pos: 'MC', x: 50, y: 50, label: 'Medio Centro' },
    { pos: 'MC', x: 75, y: 54, label: 'Medio Centro' },
    { pos: 'MI', x: 25, y: 34, label: 'Interior Izq' },
    { pos: 'MD', x: 75, y: 34, label: 'Interior Der' },
    { pos: 'DC', x: 50, y: 16, label: 'Delantero' },
  ],
  '1-4-1-2-1-2': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'LI', x: 10, y: 70, label: 'Lateral Izq' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'LD', x: 90, y: 70, label: 'Lateral Der' },
    { pos: 'MCD', x: 50, y: 58, label: 'Pivote' },
    { pos: 'MC', x: 30, y: 46, label: 'Medio Centro' },
    { pos: 'MC', x: 70, y: 46, label: 'Medio Centro' },
    { pos: 'MCO', x: 50, y: 34, label: 'Media Punta' },
    { pos: 'DC', x: 35, y: 18, label: 'Delantero' },
    { pos: 'DC', x: 65, y: 18, label: 'Delantero' },
  ],

  // === Formaciones de 8 jugadores ===
  '1-3-3-1': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 20, y: 72, label: 'Central' },
    { pos: 'DFC', x: 50, y: 76, label: 'Central' },
    { pos: 'DFC', x: 80, y: 72, label: 'Central' },
    { pos: 'MI', x: 15, y: 46, label: 'Medio Izq' },
    { pos: 'MC', x: 50, y: 42, label: 'Medio Centro' },
    { pos: 'MD', x: 85, y: 46, label: 'Medio Der' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
  ],
  '1-2-3-2': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'MI', x: 15, y: 48, label: 'Medio Izq' },
    { pos: 'MC', x: 50, y: 44, label: 'Medio Centro' },
    { pos: 'MD', x: 85, y: 48, label: 'Medio Der' },
    { pos: 'DC', x: 32, y: 20, label: 'Delantero' },
    { pos: 'DC', x: 68, y: 20, label: 'Delantero' },
  ],
  '1-3-2-2': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 20, y: 72, label: 'Central' },
    { pos: 'DFC', x: 50, y: 76, label: 'Central' },
    { pos: 'DFC', x: 80, y: 72, label: 'Central' },
    { pos: 'MC', x: 32, y: 48, label: 'Medio Centro' },
    { pos: 'MC', x: 68, y: 48, label: 'Medio Centro' },
    { pos: 'DC', x: 32, y: 20, label: 'Delantero' },
    { pos: 'DC', x: 68, y: 20, label: 'Delantero' },
  ],
  '1-2-4-1': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'MI', x: 10, y: 46, label: 'Medio Izq' },
    { pos: 'MC', x: 35, y: 50, label: 'Medio Centro' },
    { pos: 'MC', x: 65, y: 50, label: 'Medio Centro' },
    { pos: 'MD', x: 90, y: 46, label: 'Medio Der' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
  ],
  '1-3-1-3': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 20, y: 72, label: 'Central' },
    { pos: 'DFC', x: 50, y: 76, label: 'Central' },
    { pos: 'DFC', x: 80, y: 72, label: 'Central' },
    { pos: 'MC', x: 50, y: 48, label: 'Medio Centro' },
    { pos: 'EI', x: 15, y: 22, label: 'Extremo Izq' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
    { pos: 'ED', x: 85, y: 22, label: 'Extremo Der' },
  ],
  '1-4-2-1': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'LI', x: 10, y: 68, label: 'Lateral Izq' },
    { pos: 'DFC', x: 35, y: 74, label: 'Central' },
    { pos: 'DFC', x: 65, y: 74, label: 'Central' },
    { pos: 'LD', x: 90, y: 68, label: 'Lateral Der' },
    { pos: 'MC', x: 35, y: 46, label: 'Medio Centro' },
    { pos: 'MC', x: 65, y: 46, label: 'Medio Centro' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
  ],

  // === Formaciones de 7 jugadores ===
  '1-3-2-1': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 20, y: 72, label: 'Central' },
    { pos: 'DFC', x: 50, y: 76, label: 'Central' },
    { pos: 'DFC', x: 80, y: 72, label: 'Central' },
    { pos: 'MC', x: 32, y: 46, label: 'Medio Centro' },
    { pos: 'MC', x: 68, y: 46, label: 'Medio Centro' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
  ],
  '1-2-3-1': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'MI', x: 15, y: 46, label: 'Medio Izq' },
    { pos: 'MC', x: 50, y: 42, label: 'Medio Centro' },
    { pos: 'MD', x: 85, y: 46, label: 'Medio Der' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
  ],
  '1-2-2-2': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'MC', x: 32, y: 48, label: 'Medio Centro' },
    { pos: 'MC', x: 68, y: 48, label: 'Medio Centro' },
    { pos: 'DC', x: 32, y: 20, label: 'Delantero' },
    { pos: 'DC', x: 68, y: 20, label: 'Delantero' },
  ],
  '1-3-1-2': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 20, y: 72, label: 'Central' },
    { pos: 'DFC', x: 50, y: 76, label: 'Central' },
    { pos: 'DFC', x: 80, y: 72, label: 'Central' },
    { pos: 'MC', x: 50, y: 46, label: 'Medio Centro' },
    { pos: 'DC', x: 32, y: 20, label: 'Delantero' },
    { pos: 'DC', x: 68, y: 20, label: 'Delantero' },
  ],
  '1-1-3-2': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 50, y: 76, label: 'Central' },
    { pos: 'MI', x: 15, y: 48, label: 'Medio Izq' },
    { pos: 'MC', x: 50, y: 44, label: 'Medio Centro' },
    { pos: 'MD', x: 85, y: 48, label: 'Medio Der' },
    { pos: 'DC', x: 32, y: 20, label: 'Delantero' },
    { pos: 'DC', x: 68, y: 20, label: 'Delantero' },
  ],
  '1-2-1-3': [
    { pos: 'POR', x: 50, y: 90, label: 'Portero' },
    { pos: 'DFC', x: 32, y: 74, label: 'Central' },
    { pos: 'DFC', x: 68, y: 74, label: 'Central' },
    { pos: 'MC', x: 50, y: 46, label: 'Medio Centro' },
    { pos: 'EI', x: 15, y: 22, label: 'Extremo Izq' },
    { pos: 'DC', x: 50, y: 18, label: 'Delantero' },
    { pos: 'ED', x: 85, y: 22, label: 'Extremo Der' },
  ],
};

// Colores por posición
const getPositionColor = (pos) => {
  const position = pos?.toUpperCase() || '';
  if (position === 'POR' || position === 'PORTERO') return ['#10b981', '#059669'];
  if (['DFC', 'LI', 'LD', 'CAI', 'CAD', 'CENTRAL', 'LATERAL'].some((p) => position.includes(p)))
    return ['#3b82f6', '#2563eb'];
  if (['MC', 'MCO', 'MCD', 'MI', 'MD', 'MEDIO', 'CENTROCAMPISTA'].some((p) => position.includes(p)))
    return ['#f59e0b', '#d97706'];
  if (['DC', 'EI', 'ED', 'SD', 'DELANTERO', 'EXTREMO'].some((p) => position.includes(p)))
    return ['#ef4444', '#dc2626'];
  return ['#6366f1', '#4f46e5'];
};

// Icono por posición
const getPositionIcon = (pos) => {
  const position = pos?.toUpperCase() || '';
  if (position === 'POR' || position === 'PORTERO') return 'shield';
  if (['DFC', 'LI', 'LD', 'CAI', 'CAD', 'CENTRAL', 'LATERAL'].some((p) => position.includes(p)))
    return 'shield-checkmark';
  if (['MC', 'MCO', 'MCD', 'MI', 'MD', 'MEDIO', 'CENTROCAMPISTA'].some((p) => position.includes(p)))
    return 'ellipse';
  if (['DC', 'EI', 'ED', 'SD', 'DELANTERO', 'EXTREMO'].some((p) => position.includes(p)))
    return 'flag';
  return 'football';
};

// Componente del campo de fútbol profesional en SVG
function ProfessionalFootballField({ width, height }) {
  const strokeWidth = 2;
  const strokeColor = 'rgba(255,255,255,0.92)';
  const fieldColor = '#1d8f3e';
  const fieldColorAlt = '#178a35';

  // Medidas proporcionales (campo real: 105m x 68m)
  const margin = 6;
  const fieldW = width - margin * 2;
  const fieldH = height - margin * 2;

  // Áreas y elementos
  const penaltyAreaW = fieldW * 0.55;
  const penaltyAreaH = fieldH * 0.155;
  const goalAreaW = fieldW * 0.24;
  const goalAreaH = fieldH * 0.055;
  const centerCircleR = fieldW * 0.135;
  const penaltySpotDist = fieldH * 0.095;
  const penaltyArcR = fieldW * 0.13;
  const goalW = fieldW * 0.14;
  const goalH = fieldH * 0.022;
  const cornerR = fieldW * 0.022;

  // Franjas de césped
  const stripes = 14;
  const stripeH = height / stripes;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <ClipPath id="fieldClip">
          <Rect x={0} y={0} width={width} height={height} rx={10} ry={10} />
        </ClipPath>
      </Defs>

      <G clipPath="url(#fieldClip)">
        {/* Franjas de césped */}
        {Array.from({ length: stripes }).map((_, i) => (
          <Rect
            key={i}
            x={0}
            y={i * stripeH}
            width={width}
            height={stripeH}
            fill={i % 2 === 0 ? fieldColor : fieldColorAlt}
          />
        ))}

        {/* Borde exterior del campo */}
        <Rect
          x={margin}
          y={margin}
          width={fieldW}
          height={fieldH}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* === LÍNEA CENTRAL === */}
        <Line
          x1={margin}
          y1={height / 2}
          x2={width - margin}
          y2={height / 2}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* === CÍRCULO CENTRAL === */}
        <Circle
          cx={width / 2}
          cy={height / 2}
          r={centerCircleR}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
        <Circle cx={width / 2} cy={height / 2} r={4} fill={strokeColor} />

        {/* ===== ÁREA SUPERIOR ===== */}

        {/* Área grande */}
        <Rect
          x={(width - penaltyAreaW) / 2}
          y={margin}
          width={penaltyAreaW}
          height={penaltyAreaH}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Área pequeña */}
        <Rect
          x={(width - goalAreaW) / 2}
          y={margin}
          width={goalAreaW}
          height={goalAreaH}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Punto penal superior */}
        <Circle cx={width / 2} cy={margin + penaltySpotDist} r={3} fill={strokeColor} />

        {/* Semicírculo del área superior */}
        <Path
          d={`M ${(width - penaltyAreaW) / 2 + penaltyAreaW * 0.22} ${margin + penaltyAreaH}
              A ${penaltyArcR} ${penaltyArcR} 0 0 0 ${(width + penaltyAreaW) / 2 - penaltyAreaW * 0.22} ${margin + penaltyAreaH}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Portería superior */}
        <Rect
          x={(width - goalW) / 2}
          y={margin - goalH}
          width={goalW}
          height={goalH}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 0.5}
        />

        {/* Arcos de córner superiores */}
        <Path
          d={`M ${margin} ${margin + cornerR} A ${cornerR} ${cornerR} 0 0 1 ${margin + cornerR} ${margin}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
        <Path
          d={`M ${width - margin - cornerR} ${margin} A ${cornerR} ${cornerR} 0 0 1 ${width - margin} ${margin + cornerR}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* ===== ÁREA INFERIOR ===== */}

        {/* Área grande */}
        <Rect
          x={(width - penaltyAreaW) / 2}
          y={height - margin - penaltyAreaH}
          width={penaltyAreaW}
          height={penaltyAreaH}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Área pequeña */}
        <Rect
          x={(width - goalAreaW) / 2}
          y={height - margin - goalAreaH}
          width={goalAreaW}
          height={goalAreaH}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Punto penal inferior */}
        <Circle cx={width / 2} cy={height - margin - penaltySpotDist} r={3} fill={strokeColor} />

        {/* Semicírculo del área inferior */}
        <Path
          d={`M ${(width - penaltyAreaW) / 2 + penaltyAreaW * 0.22} ${height - margin - penaltyAreaH}
              A ${penaltyArcR} ${penaltyArcR} 0 0 1 ${(width + penaltyAreaW) / 2 - penaltyAreaW * 0.22} ${height - margin - penaltyAreaH}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Portería inferior */}
        <Rect
          x={(width - goalW) / 2}
          y={height - margin}
          width={goalW}
          height={goalH}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 0.5}
        />

        {/* Arcos de córner inferiores */}
        <Path
          d={`M ${margin} ${height - margin - cornerR} A ${cornerR} ${cornerR} 0 0 0 ${margin + cornerR} ${height - margin}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
        <Path
          d={`M ${width - margin - cornerR} ${height - margin} A ${cornerR} ${cornerR} 0 0 0 ${width - margin} ${height - margin - cornerR}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      </G>
    </Svg>
  );
}

// Componente de posición en el campo
function PositionSlot({
  position,
  x,
  y,
  fieldWidth,
  fieldHeight,
  onDrop,
  hasPlayer,
  player,
  onRemove,
  isSelecting,
  readOnly = false,
  showPhotos = true,
  showNames = true,
  translatePosition,
  isMobile = false,
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const colors = getPositionColor(position.pos);
  const pixelX = (x / 100) * fieldWidth;
  const pixelY = (y / 100) * fieldHeight;
  const size = Math.max(28, Math.min(isMobile ? 40 : 54, Math.round(fieldWidth * 0.12)));

  return (
    <View
      style={[
        styles.positionSlot,
        {
          left: pixelX - size / 2,
          top: pixelY - size / 2,
          width: size,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.slotCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: hasPlayer ? colors[0] : 'rgba(255,255,255,0.5)',
            backgroundColor: hasPlayer ? 'transparent' : 'rgba(0,0,0,0.3)',
          },
          isSelecting && !hasPlayer && !readOnly && styles.slotHighlight,
        ]}
        onPress={() => (readOnly ? null : hasPlayer ? onRemove(position.index) : onDrop(position))}
        activeOpacity={readOnly ? 1 : 0.8}
        disabled={readOnly}
      >
        {hasPlayer && player ? (
          showPhotos && player.foto ? (
            <Image
              source={{ uri: player.foto }}
              style={[styles.slotPhoto, { borderRadius: size / 2 }]}
            />
          ) : (
            <LinearGradient
              colors={colors}
              style={[styles.slotGradient, { borderRadius: size / 2 }]}
            >
              <Text
                style={[styles.slotNumber, { fontSize: Math.max(10, Math.round(size * 0.32)) }]}
              >
                {player.dorsal || '?'}
              </Text>
            </LinearGradient>
          )
        ) : (
          <View style={styles.slotEmpty}>
            <Ionicons name="add" size={24} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </TouchableOpacity>
      {showNames && (
        <View style={[styles.slotLabelContainer, { maxWidth: size * 1.8 }]}>
          <Text style={styles.slotLabel} numberOfLines={1}>
            {hasPlayer && player
              ? getPlayerFirstName(player)
              : translatePosition
                ? translatePosition(position.pos)
                : position.pos}
          </Text>
        </View>
      )}
    </View>
  );
}

// Componente de jugador en la lista
function PlayerItem({ player, onPress, isSelected, isAssigned }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const colors = getPositionColor(player.posicion);

  return (
    <TouchableOpacity
      style={[
        styles.playerItem,
        isSelected && styles.playerItemSelected,
        isAssigned && styles.playerItemAssigned,
      ]}
      onPress={() => !isAssigned && onPress(player)}
      disabled={isAssigned}
      activeOpacity={0.7}
    >
      {player.foto ? (
        <Image source={{ uri: player.foto }} style={styles.playerItemPhoto} />
      ) : (
        <LinearGradient
          colors={isAssigned ? ['#9ca3af', '#6b7280'] : colors}
          style={styles.playerItemCircle}
        >
          <Text style={styles.playerItemNumber}>{player.dorsal || '?'}</Text>
        </LinearGradient>
      )}
      <View style={styles.playerItemInfo}>
        <Text
          style={[styles.playerItemName, isAssigned && styles.playerItemNameAssigned]}
          numberOfLines={1}
        >
          {getPlayerFullName(player)}
        </Text>
        <Text style={styles.playerItemPos}>{player.posicion}</Text>
      </View>
      {isSelected && !isAssigned && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="radio-button-on" size={18} color={theme.colors.primary} />
        </View>
      )}
      {isAssigned && (
        <View style={styles.assignedBadge}>
          <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// Componente principal
export default function LineupEditor({
  players = [],
  convocados = [],
  titulares = [],
  formation = '1-4-4-2',
  onTitularesChange,
  onSuplentesChange,
  suplentes = [],
  readOnly = false, // Modo solo lectura para ver detalles y PDF
  showPhotos = true,
  showNames = true,
  jugadoresPorEquipo = 11, // Número de jugadores por equipo (7, 8 u 11)
  containerWidth = null, // Ancho disponible del contenedor padre (para evitar overflow en modales)
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [lineupAssignments, setLineupAssignments] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterPosition, setFilterPosition] = useState('');

  // Función para traducir posiciones tácticas
  const translatePosition = (posCode) => {
    return t(`matchSheet.positions.${posCode}`, { defaultValue: posCode });
  };

  // Calcular dimensiones del campo
  const maxFieldHeightTablet = isMobile ? Infinity : screenHeight * 0.58;
  const rawMaxWidth =
    containerWidth != null
      ? containerWidth
      : isMobile
        ? Math.min(screenWidth - 24, 380)
        : Math.min(screenWidth - 220, 480);
  const widthFromHeightLimit = maxFieldHeightTablet / 1.42;
  const fieldWidth = Math.max(
    isMobile ? rawMaxWidth : Math.min(rawMaxWidth, widthFromHeightLimit),
    200,
  );
  const fieldHeight = fieldWidth * 1.42;

  // Formación por defecto según número de jugadores
  const defaultFormation = useMemo(() => {
    if (jugadoresPorEquipo === 7) return '1-3-2-1';
    if (jugadoresPorEquipo === 8) return '1-3-3-1';
    return '1-4-4-2';
  }, [jugadoresPorEquipo]);

  // Obtener posiciones de la formación
  const formationPositions = useMemo(() => {
    const positions = FORMATION_POSITIONS[formation] || FORMATION_POSITIONS[defaultFormation];
    return positions.map((pos, index) => ({ ...pos, index }));
  }, [formation, defaultFormation]);

  // Jugadores convocados con sus datos completos (ordenados por dorsal)
  const convocadosPlayers = useMemo(() => {
    return convocados
      .map((id) => players.find((p) => p._id === id))
      .filter(Boolean)
      .sort((a, b) => {
        const ad = Number.isFinite(parseInt(a.dorsal))
          ? parseInt(a.dorsal)
          : Number.POSITIVE_INFINITY;
        const bd = Number.isFinite(parseInt(b.dorsal))
          ? parseInt(b.dorsal)
          : Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
        return (a.nombre || '').localeCompare(b.nombre || '');
      });
  }, [convocados, players]);

  // Posiciones disponibles (dinámicas según los convocados)
  const availablePositions = useMemo(() => {
    const posSet = new Set();
    convocadosPlayers.forEach((p) => {
      if (p.posicion) posSet.add(p.posicion);
    });
    return Array.from(posSet).sort();
  }, [convocadosPlayers]);

  // Jugadores filtrados por búsqueda y posición
  const filteredPlayers = useMemo(() => {
    let result = convocadosPlayers;
    if (filterPosition) {
      result = result.filter((p) => p.posicion === filterPosition);
    }
    if (filterSearch.trim()) {
      const lower = filterSearch.trim().toLowerCase();
      result = result.filter(
        (p) =>
          getPlayerFullName(p).toLowerCase().includes(lower) ||
          String(p.dorsal || '').includes(lower),
      );
    }
    return result;
  }, [convocadosPlayers, filterPosition, filterSearch]);

  // IDs de jugadores ya asignados a titulares
  const assignedPlayerIds = useMemo(() => {
    return Object.values(lineupAssignments).filter(Boolean);
  }, [lineupAssignments]);

  // Inicializar asignaciones desde titulares existentes
  React.useEffect(() => {
    if (titulares.length > 0 && Object.keys(lineupAssignments).length === 0) {
      const initialAssignments = {};
      titulares.forEach((playerId, index) => {
        if (index < formationPositions.length) {
          initialAssignments[index] = playerId;
        }
      });
      setLineupAssignments(initialAssignments);
    }
  }, [titulares, formationPositions.length]);

  // Manejar selección de jugador
  const handlePlayerSelect = (player) => {
    setSelectedPlayer(selectedPlayer?._id === player._id ? null : player);
  };

  // Manejar asignación a posición
  const handlePositionDrop = (position) => {
    if (!selectedPlayer) return;

    const existingPositionIndex = Object.entries(lineupAssignments).find(
      ([_, playerId]) => playerId === selectedPlayer._id,
    )?.[0];

    const newAssignments = { ...lineupAssignments };

    if (existingPositionIndex !== undefined) {
      delete newAssignments[existingPositionIndex];
    }

    newAssignments[position.index] = selectedPlayer._id;

    setLineupAssignments(newAssignments);
    setSelectedPlayer(null);

    const newTitulares = formationPositions.map((_, idx) => newAssignments[idx]).filter(Boolean);
    onTitularesChange?.(newTitulares);

    // Quitar el jugador de suplentes si estaba ahí (consistencia)
    if (suplentes.includes(selectedPlayer._id)) {
      const newSuplentes = suplentes.filter((id) => id !== selectedPlayer._id);
      onSuplentesChange?.(newSuplentes);
    }

    // Auto-fill suplentes cuando se completan los 11 titulares
    if (newTitulares.length === formationPositions.length) {
      const autoSuplentes = convocadosPlayers
        .filter((p) => !newTitulares.includes(p._id))
        .map((p) => p._id);
      onSuplentesChange?.(autoSuplentes);
    }
  };

  // Manejar remoción de jugador de posición
  const handleRemoveFromPosition = (positionIndex) => {
    const newAssignments = { ...lineupAssignments };
    delete newAssignments[positionIndex];
    setLineupAssignments(newAssignments);

    const newTitulares = formationPositions.map((_, idx) => newAssignments[idx]).filter(Boolean);
    onTitularesChange?.(newTitulares);
  };

  // Añadir todos los no asignados como suplentes
  const handleSetSuplentes = () => {
    const suplentesIds = convocadosPlayers
      .filter((p) => !assignedPlayerIds.includes(p._id))
      .map((p) => p._id);
    onSuplentesChange?.(suplentesIds);
  };

  // Limpiar toda la alineación
  const handleClearLineup = () => {
    setLineupAssignments({});
    setSelectedPlayer(null);
    onTitularesChange?.([]);
    onSuplentesChange?.([]);
  };

  const remainingPlayers = convocadosPlayers.length - assignedPlayerIds.length;

  // En modo readOnly, mostrar vista simplificada
  if (readOnly) {
    return (
      <View style={styles.containerReadOnly}>
        {/* Campo de fútbol */}
        <View style={styles.fieldContainerReadOnly}>
          <View style={[styles.fieldWrapper, { width: fieldWidth, height: fieldHeight }]}>
            <ProfessionalFootballField width={fieldWidth} height={fieldHeight} />

            {/* Posiciones */}
            {formationPositions.map((position) => {
              const playerId = lineupAssignments[position.index];
              const player = playerId ? players.find((p) => p._id === playerId) : null;

              return (
                <PositionSlot
                  key={position.index}
                  position={position}
                  x={position.x}
                  y={position.y}
                  fieldWidth={fieldWidth}
                  fieldHeight={fieldHeight}
                  onDrop={() => {}}
                  onRemove={() => {}}
                  hasPlayer={!!player}
                  player={player}
                  isSelecting={false}
                  readOnly={true}
                  showPhotos={showPhotos}
                  showNames={showNames}
                  translatePosition={translatePosition}
                  isMobile={isMobile}
                />
              );
            })}
          </View>
        </View>

        {/* Suplentes visuales debajo del campo */}
        {suplentes.length > 0 && (
          <View style={styles.suplentesReadOnlyCard}>
            <View style={styles.suplentesReadOnlyHeader}>
              <View style={styles.suplentesReadOnlyIndicator} />
              <Text style={styles.suplentesReadOnlyTitle}>
                {t('matchSheet.lineup.substitutes')} ({suplentes.length})
              </Text>
            </View>
            <View style={styles.suplentesReadOnlyList}>
              {suplentes.map((supId, idx) => {
                const suplente = players.find((p) => p._id === supId);
                if (!suplente) return null;
                const colors = getPositionColor(suplente.posicion);
                return (
                  <View key={idx} style={styles.suplenteReadOnlyItem}>
                    {showPhotos && suplente.foto ? (
                      <Image
                        source={{ uri: suplente.foto }}
                        style={[styles.suplenteReadOnlyPhoto, { borderColor: colors[1] }]}
                      />
                    ) : (
                      <LinearGradient colors={colors} style={styles.suplenteReadOnlyCircle}>
                        <Text style={styles.suplenteReadOnlyDorsal}>{suplente.dorsal || '?'}</Text>
                      </LinearGradient>
                    )}
                    {showNames && (
                      <Text style={styles.suplenteReadOnlyName}>{getPlayerFullName(suplente)}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="football" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.title}>{t('matchSheet.lineup.visualLineup')}</Text>
            <Text style={styles.formationText}>{formation}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearLineup}>
          <Ionicons name="refresh" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Barra de instrucciones */}
      <View style={[styles.instructionBar, selectedPlayer && styles.instructionBarActive]}>
        <Ionicons
          name={selectedPlayer ? 'hand-left' : 'information-circle'}
          size={18}
          color={selectedPlayer ? theme.colors.primary : theme.colors.textMuted}
        />
        <Text style={[styles.instructionText, selectedPlayer && styles.instructionTextActive]}>
          {selectedPlayer
            ? t('matchSheet.lineup.tapPositionToPlace', { name: getPlayerFullName(selectedPlayer) })
            : t('matchSheet.lineup.selectPlayerThenPosition')}
        </Text>
      </View>

      {/* Contenedor principal */}
      <View style={[styles.editorContainer, isMobile && styles.editorContainerMobile]}>
        {isMobile ? (
          <>
            {/* En móvil: Campo arriba */}
            <View style={styles.fieldContainerMobile}>
              <View style={[styles.fieldWrapper, { width: fieldWidth, height: fieldHeight }]}>
                <ProfessionalFootballField width={fieldWidth} height={fieldHeight} />

                {/* Posiciones */}
                {formationPositions.map((position) => {
                  const playerId = lineupAssignments[position.index];
                  const player = playerId ? players.find((p) => p._id === playerId) : null;

                  return (
                    <PositionSlot
                      key={position.index}
                      position={position}
                      x={position.x}
                      y={position.y}
                      fieldWidth={fieldWidth}
                      fieldHeight={fieldHeight}
                      onDrop={handlePositionDrop}
                      onRemove={handleRemoveFromPosition}
                      hasPlayer={!!player}
                      player={player}
                      isSelecting={selectedPlayer !== null}
                      translatePosition={translatePosition}
                      isMobile={isMobile}
                    />
                  );
                })}
              </View>
            </View>

            {/* En móvil: Panel de jugadores abajo */}
            <View style={styles.playersPanelMobile}>
              <View style={styles.panelHeaderMobile}>
                <View style={styles.panelHeaderLeft}>
                  <Ionicons name="people" size={16} color={theme.colors.primary} />
                  <View>
                    <Text style={styles.panelTitleMobile}>{t('matchSheet.lineup.called')}</Text>
                    <Text
                      style={styles.panelSubtitleMobile}
                    >{`${filteredPlayers.length}/${convocadosPlayers.length} ${t('matchSheet.lineup.called')}`}</Text>
                  </View>
                </View>
                <View style={styles.panelHeaderActions}>
                  {convocadosPlayers.length > 4 && (
                    <TouchableOpacity
                      style={[
                        styles.filterToggleButton,
                        showFilters && styles.filterToggleButtonActive,
                      ]}
                      onPress={() => setShowFilters(!showFilters)}
                    >
                      <Ionicons
                        name={showFilters ? 'chevron-up' : 'options'}
                        size={16}
                        color={showFilters ? '#fff' : theme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.filterToggleText,
                          showFilters && styles.filterToggleTextActive,
                        ]}
                      >
                        {t('matchSheet.lineup.filters', 'Filtros')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {remainingPlayers > 0 && (
                    <TouchableOpacity
                      style={styles.suplentesButtonMobile}
                      onPress={handleSetSuplentes}
                    >
                      <Ionicons name="arrow-forward-circle" size={14} color="#fff" />
                      <Text style={styles.suplentesButtonTextMobile}>
                        {t('matchSheet.lineup.substitutes')} ({remainingPlayers})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Panel de filtros colapsable */}
              {showFilters && convocadosPlayers.length > 4 && (
                <View style={styles.filterPanel}>
                  <View style={styles.searchRow}>
                    <Ionicons name="search" size={16} color={theme.colors.inputPlaceholder} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('matchSheet.lineup.searchPlayer', 'Buscar jugador...')}
                      placeholderTextColor={theme.colors.inputPlaceholder}
                      value={filterSearch}
                      onChangeText={setFilterSearch}
                    />
                    {filterSearch ? (
                      <TouchableOpacity onPress={() => setFilterSearch('')}>
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color={theme.colors.inputPlaceholder}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {availablePositions.length > 1 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.filterScroll}
                    >
                      <TouchableOpacity
                        style={[styles.filterChip, !filterPosition && styles.filterChipActive]}
                        onPress={() => setFilterPosition('')}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            !filterPosition && styles.filterChipTextActive,
                          ]}
                        >
                          {t('matchSheet.lineup.allPositions', 'Todas')}
                        </Text>
                      </TouchableOpacity>
                      {availablePositions.map((pos) => {
                        const colors = getPositionColor(pos);
                        return (
                          <TouchableOpacity
                            key={pos}
                            style={[
                              styles.filterChip,
                              filterPosition === pos && [
                                styles.filterChipActive,
                                { backgroundColor: colors[0] },
                              ],
                            ]}
                            onPress={() => setFilterPosition(filterPosition === pos ? '' : pos)}
                          >
                            <Ionicons
                              name={getPositionIcon(pos)}
                              size={12}
                              color={filterPosition === pos ? '#fff' : colors[1]}
                            />
                            <Text
                              style={[
                                styles.filterChipText,
                                filterPosition === pos && styles.filterChipTextActive,
                              ]}
                            >
                              {translatePosition(pos)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                  {(filterSearch || filterPosition) && (
                    <TouchableOpacity
                      style={styles.clearFiltersButton}
                      onPress={() => {
                        setFilterSearch('');
                        setFilterPosition('');
                      }}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={14}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.clearFiltersText}>
                        {t('matchSheet.lineup.clearFilters', 'Limpiar')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.playersListMobileGrid}
              >
                {filteredPlayers.map((player) => (
                  <TouchableOpacity
                    key={player._id}
                    style={[
                      styles.playerItemMobile,
                      selectedPlayer?._id === player._id && styles.playerItemMobileSelected,
                      assignedPlayerIds.includes(player._id) && styles.playerItemMobileAssigned,
                    ]}
                    onPress={() =>
                      !assignedPlayerIds.includes(player._id) && handlePlayerSelect(player)
                    }
                    disabled={assignedPlayerIds.includes(player._id)}
                    activeOpacity={0.7}
                  >
                    {player.foto ? (
                      <Image source={{ uri: player.foto }} style={styles.playerItemMobilePhoto} />
                    ) : (
                      <LinearGradient
                        colors={
                          assignedPlayerIds.includes(player._id)
                            ? ['#9ca3af', '#6b7280']
                            : getPositionColor(player.posicion)
                        }
                        style={styles.playerItemMobileCircle}
                      >
                        <Text style={styles.playerItemMobileNumber}>{player.dorsal || '?'}</Text>
                      </LinearGradient>
                    )}
                    <Text
                      style={[
                        styles.playerItemMobileName,
                        assignedPlayerIds.includes(player._id) &&
                          styles.playerItemMobileNameAssigned,
                      ]}
                      numberOfLines={1}
                    >
                      {getPlayerFirstName(player)}
                    </Text>
                    <Text style={styles.playerItemMobilePos} numberOfLines={1}>
                      {player.posicion ? translatePosition(player.posicion) : ''}
                    </Text>
                    {selectedPlayer?._id === player._id && (
                      <View style={styles.selectedIndicatorMobile}>
                        <Ionicons name="radio-button-on" size={12} color={theme.colors.primary} />
                      </View>
                    )}
                    {assignedPlayerIds.includes(player._id) && (
                      <View style={styles.assignedBadgeMobile}>
                        <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
                {convocadosPlayers.length === 0 && (
                  <View style={styles.emptyContainerMobile}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={24}
                      color={theme.colors.textDisabled}
                    />
                    <Text style={styles.emptyTextMobile}>
                      {t('matchSheet.lineup.selectCalledFirst')}
                    </Text>
                  </View>
                )}
                {filteredPlayers.length === 0 && convocadosPlayers.length > 0 && (
                  <View style={styles.emptyContainerMobile}>
                    <Ionicons name="search-outline" size={24} color={theme.colors.textDisabled} />
                    <Text style={styles.emptyTextMobile}>
                      {t('matchSheet.lineup.noResults', 'Sin resultados')}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </>
        ) : (
          <>
            {/* En tablet/desktop: Panel de jugadores a la izquierda */}
            <View style={styles.playersPanel}>
              <View style={styles.panelHeader}>
                <View style={styles.panelHeaderLeft}>
                  <Ionicons name="people" size={16} color={theme.colors.primary} />
                  <Text style={styles.panelTitle}>{t('matchSheet.lineup.called')}</Text>
                </View>
                <View style={styles.panelBadge}>
                  <Text style={styles.panelBadgeText}>{convocadosPlayers.length}</Text>
                </View>
              </View>

              <ScrollView
                style={styles.playersList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {convocadosPlayers.map((player) => (
                  <PlayerItem
                    key={player._id}
                    player={player}
                    onPress={handlePlayerSelect}
                    isSelected={selectedPlayer?._id === player._id}
                    isAssigned={assignedPlayerIds.includes(player._id)}
                  />
                ))}
                {convocadosPlayers.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={36}
                      color={theme.colors.textDisabled}
                    />
                    <Text style={styles.emptyText}>{t('matchSheet.lineup.selectCalledFirst')}</Text>
                  </View>
                )}
              </ScrollView>

              {/* Botón suplentes */}
              {remainingPlayers > 0 && (
                <TouchableOpacity style={styles.suplentesButton} onPress={handleSetSuplentes}>
                  <Ionicons name="arrow-forward-circle" size={18} color="#fff" />
                  <Text style={styles.suplentesButtonText}>
                    {t('matchSheet.lineup.autoSubstitutes')} ({remainingPlayers})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* En tablet/desktop: Campo a la derecha */}
            <View style={styles.fieldContainer}>
              <View style={[styles.fieldWrapper, { width: fieldWidth, height: fieldHeight }]}>
                <ProfessionalFootballField width={fieldWidth} height={fieldHeight} />

                {/* Posiciones */}
                {formationPositions.map((position) => {
                  const playerId = lineupAssignments[position.index];
                  const player = playerId ? players.find((p) => p._id === playerId) : null;

                  return (
                    <PositionSlot
                      key={position.index}
                      position={position}
                      x={position.x}
                      y={position.y}
                      fieldWidth={fieldWidth}
                      fieldHeight={fieldHeight}
                      onDrop={handlePositionDrop}
                      onRemove={handleRemoveFromPosition}
                      hasPlayer={!!player}
                      player={player}
                      isSelecting={selectedPlayer !== null}
                      translatePosition={translatePosition}
                      isMobile={isMobile}
                    />
                  );
                })}
              </View>
            </View>
          </>
        )}
      </View>

      {/* Footer con contadores */}
      <View style={styles.footer}>
        <View style={[styles.counterBadge, styles.titularesBadge]}>
          <Ionicons name="star" size={16} color="#f59e0b" />
          <Text style={styles.counterLabel}>{t('matchSheet.lineup.starters')}</Text>
          <Text style={styles.counterValue}>
            {assignedPlayerIds.length}/{jugadoresPorEquipo}
          </Text>
        </View>
        <View style={[styles.counterBadge, styles.suplentesBadge]}>
          <Ionicons name="swap-horizontal" size={16} color={theme.colors.purple} />
          <Text style={styles.counterLabel}>{t('matchSheet.lineup.substitutes')}</Text>
          <Text style={styles.counterValue}>{suplentes.length}</Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    formationText: {
      fontSize: 13,
      color: theme.colors.textMuted,
      fontWeight: '500',
    },
    clearButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.colors.backgroundAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    instructionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.surfaceAlt,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    instructionBarActive: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primaryLight,
    },
    instructionText: {
      fontSize: 13,
      color: theme.colors.textMuted,
      flex: 1,
    },
    instructionTextActive: {
      color: theme.colors.primary,
      fontWeight: '500',
    },
    editorContainer: {
      flexDirection: 'row',
      gap: 16,
      alignItems: 'flex-start',
    },
    editorContainerMobile: {
      flexDirection: 'column',
      gap: 16,
      alignItems: 'stretch',
    },
    // Estilos para layout móvil vertical
    fieldContainerMobile: {
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 8,
    },
    playersPanelMobile: {
      width: '100%',
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    panelHeaderMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 10,
    },
    panelTitleMobile: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    panelSubtitleMobile: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    panelHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    filterToggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primarySoft,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      gap: 4,
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
    },
    filterToggleButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterToggleText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    filterToggleTextActive: {
      color: '#fff',
    },
    filterPanel: {
      marginBottom: 12,
      gap: 10,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.text,
      padding: 0,
    },
    filterScroll: {
      flexGrow: 0,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 4,
    },
    filterChipActive: {
      borderWidth: 0,
    },
    filterChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    filterChipTextActive: {
      color: '#fff',
    },
    clearFiltersButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      gap: 4,
    },
    clearFiltersText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.primary,
    },
    suplentesButtonMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.purple,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      gap: 6,
    },
    suplentesButtonTextMobile: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
    playersListMobileGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 4,
    },
    playerItemMobile: {
      width: '48%',
      alignItems: 'center',
      padding: 12,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    playerItemMobileSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
    },
    playerItemMobileAssigned: {
      opacity: 0.9,
      backgroundColor: theme.colors.backgroundAlt,
      borderColor: theme.colors.border,
    },
    playerItemMobilePhoto: {
      width: 42,
      height: 42,
      borderRadius: 21,
    },
    playerItemMobileCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playerItemMobileNumber: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },
    playerItemMobileName: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 8,
      textAlign: 'center',
    },
    playerItemMobileNameAssigned: {
      color: theme.colors.textDisabled,
    },
    playerItemMobilePos: {
      fontSize: 10,
      color: theme.colors.textMuted,
      marginTop: 4,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    selectedIndicatorMobile: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    assignedBadgeMobile: {
      position: 'absolute',
      top: 2,
      right: 2,
    },
    emptyContainerMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      gap: 8,
    },
    emptyTextMobile: {
      fontSize: 11,
      color: theme.colors.textDisabled,
    },
    playersPanel: {
      width: 160,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      maxHeight: 560,
    },

    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    panelHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    panelTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    panelBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
    },
    panelBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
    },
    playersList: {
      flex: 1,
    },
    playerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    playerItemSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
    },
    playerItemAssigned: {
      opacity: 0.55,
      backgroundColor: theme.colors.backgroundAlt,
      borderColor: theme.colors.border,
    },
    playerItemPhoto: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    playerItemCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playerItemNumber: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },
    playerItemInfo: {
      flex: 1,
      marginLeft: 10,
    },
    playerItemName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    playerItemNameAssigned: {
      color: theme.colors.textDisabled,
    },
    playerItemPos: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    selectedIndicator: {
      marginLeft: 4,
    },
    assignedBadge: {
      marginLeft: 4,
    },
    suplentesButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.purple,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      marginTop: 12,
      gap: 8,
    },
    suplentesButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 12,
      color: theme.colors.textDisabled,
      textAlign: 'center',
      marginTop: 10,
    },
    fieldContainer: {
      flex: 1,
      alignItems: 'center',
    },
    fieldWrapper: {
      borderRadius: 12,
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 10,
    },
    positionSlot: {
      position: 'absolute',
      alignItems: 'center',
    },
    slotCircle: {
      borderWidth: 3,
      borderStyle: 'dashed',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotHighlight: {
      borderColor: '#fbbf24',
      borderStyle: 'solid',
      backgroundColor: 'rgba(251, 191, 36, 0.3)',
    },
    slotEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotPhoto: {
      width: '100%',
      height: '100%',
    },
    slotGradient: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotNumber: {
      fontSize: 17,
      fontWeight: '700',
      color: '#fff',
    },
    slotLabelContainer: {
      marginTop: 4,
      backgroundColor: 'rgba(0,0,0,0.8)',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
      maxWidth: 80,
    },
    slotLabel: {
      fontSize: 10,
      color: '#fff',
      textAlign: 'center',
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    counterBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 24,
      gap: 8,
    },
    titularesBadge: {
      backgroundColor: theme.colors.warningSoft,
      borderWidth: 1,
      borderColor: theme.colors.warning,
    },
    suplentesBadge: {
      backgroundColor: theme.colors.purpleSoft,
      borderWidth: 1,
      borderColor: theme.colors.purple,
    },
    counterLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    counterValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    // Estilos para modo readOnly
    containerReadOnly: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginTop: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    fieldContainerReadOnly: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    suplentesReadOnlyCard: {
      backgroundColor: theme.colors.purpleSoft,
      borderRadius: 12,
      padding: 14,
      marginTop: 16,
      borderWidth: 1,
      borderColor: theme.colors.purple,
    },
    suplentesReadOnlyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    suplentesReadOnlyIndicator: {
      width: 5,
      height: 18,
      backgroundColor: theme.colors.purple,
      borderRadius: 3,
    },
    suplentesReadOnlyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.purpleSoftText,
    },
    suplentesReadOnlyList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
    },
    suplenteReadOnlyItem: {
      alignItems: 'center',
      width: 80,
      marginBottom: 8,
    },
    suplenteReadOnlyPhoto: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 3,
    },
    suplenteReadOnlyCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#fff',
    },
    suplenteReadOnlyDorsal: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
    suplenteReadOnlyName: {
      fontSize: 11,
      color: theme.colors.purpleSoftText,
      fontWeight: '600',
      marginTop: 4,
      textAlign: 'center',
    },
  });
