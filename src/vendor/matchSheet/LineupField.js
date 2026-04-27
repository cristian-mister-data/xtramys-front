// components/pages/matchSheet/LineupField.js
// Componente para mostrar y editar la alineación visual en un campo de fútbol
import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Line, Circle, Ellipse } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { getPlayerFullName, getPlayerInitials, getPlayerFirstName } from '@/utils/playerHelpers';

// Imagen del campo de fútbol (usamos SVG para dibujarlo)
const FIELD_ASPECT_RATIO = 1.5; // Ancho/Alto típico de un campo

// Posiciones tácticas predefinidas para diferentes formaciones
const FORMATION_POSITIONS = {
  '1-4-4-2': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'LI', x: 15, y: 70 },
    { pos: 'DFC', x: 35, y: 75 },
    { pos: 'DFC', x: 65, y: 75 },
    { pos: 'LD', x: 85, y: 70 },
    { pos: 'MI', x: 15, y: 50 },
    { pos: 'MC', x: 35, y: 45 },
    { pos: 'MC', x: 65, y: 45 },
    { pos: 'MD', x: 85, y: 50 },
    { pos: 'DC', x: 35, y: 20 },
    { pos: 'DC', x: 65, y: 20 },
  ],
  '1-4-3-3': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'LI', x: 15, y: 70 },
    { pos: 'DFC', x: 35, y: 75 },
    { pos: 'DFC', x: 65, y: 75 },
    { pos: 'LD', x: 85, y: 70 },
    { pos: 'MC', x: 30, y: 50 },
    { pos: 'MC', x: 50, y: 45 },
    { pos: 'MC', x: 70, y: 50 },
    { pos: 'EI', x: 20, y: 20 },
    { pos: 'DC', x: 50, y: 15 },
    { pos: 'ED', x: 80, y: 20 },
  ],
  '1-4-2-3-1': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'LI', x: 15, y: 70 },
    { pos: 'DFC', x: 35, y: 75 },
    { pos: 'DFC', x: 65, y: 75 },
    { pos: 'LD', x: 85, y: 70 },
    { pos: 'MCD', x: 35, y: 55 },
    { pos: 'MCD', x: 65, y: 55 },
    { pos: 'MI', x: 20, y: 35 },
    { pos: 'MCO', x: 50, y: 30 },
    { pos: 'MD', x: 80, y: 35 },
    { pos: 'DC', x: 50, y: 12 },
  ],
  '1-3-5-2': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'DFC', x: 25, y: 75 },
    { pos: 'DFC', x: 50, y: 78 },
    { pos: 'DFC', x: 75, y: 75 },
    { pos: 'CAI', x: 10, y: 50 },
    { pos: 'MC', x: 30, y: 48 },
    { pos: 'MC', x: 50, y: 45 },
    { pos: 'MC', x: 70, y: 48 },
    { pos: 'CAD', x: 90, y: 50 },
    { pos: 'DC', x: 35, y: 18 },
    { pos: 'DC', x: 65, y: 18 },
  ],
};

// Colores por posición
const getPositionColor = (pos) => {
  const position = pos?.toUpperCase() || '';
  if (position === 'POR') return ['#10b981', '#059669']; // Verde - Portero
  if (['DFC', 'LI', 'LD', 'CAI', 'CAD'].includes(position)) return ['#3b82f6', '#2563eb']; // Azul - Defensas
  if (['MC', 'MCO', 'MCD', 'MI', 'MD'].includes(position)) return ['#f59e0b', '#d97706']; // Naranja - Centrocampistas
  if (['DC', 'EI', 'ED', 'SD'].includes(position)) return ['#ef4444', '#dc2626']; // Rojo - Delanteros
  return ['#6366f1', '#4f46e5']; // Por defecto
};

// Componente del campo de fútbol en SVG
function FootballFieldSVG({ width, height }) {
  const strokeWidth = 2;
  const strokeColor = '#ffffff';
  
  // Dimensiones proporcionales
  const penaltyAreaWidth = width * 0.44;
  const penaltyAreaHeight = height * 0.18;
  const goalAreaWidth = width * 0.20;
  const goalAreaHeight = height * 0.06;
  const centerCircleRadius = Math.min(width, height) * 0.12;
  const penaltySpotDistance = height * 0.12;
  const arcRadius = Math.min(width, height) * 0.12;
  
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      {/* Fondo verde */}
      <Rect x={0} y={0} width={width} height={height} fill="#2e7d32" />
      
      {/* Borde del campo */}
      <Rect
        x={strokeWidth}
        y={strokeWidth}
        width={width - strokeWidth * 2}
        height={height - strokeWidth * 2}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Línea central */}
      <Line
        x1={strokeWidth}
        y1={height / 2}
        x2={width - strokeWidth}
        y2={height / 2}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Círculo central */}
      <Circle
        cx={width / 2}
        cy={height / 2}
        r={centerCircleRadius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Punto central */}
      <Circle
        cx={width / 2}
        cy={height / 2}
        r={4}
        fill={strokeColor}
      />
      
      {/* Área grande superior */}
      <Rect
        x={(width - penaltyAreaWidth) / 2}
        y={strokeWidth}
        width={penaltyAreaWidth}
        height={penaltyAreaHeight}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Área pequeña superior */}
      <Rect
        x={(width - goalAreaWidth) / 2}
        y={strokeWidth}
        width={goalAreaWidth}
        height={goalAreaHeight}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Punto de penalti superior */}
      <Circle
        cx={width / 2}
        cy={penaltySpotDistance}
        r={3}
        fill={strokeColor}
      />
      
      {/* Área grande inferior */}
      <Rect
        x={(width - penaltyAreaWidth) / 2}
        y={height - penaltyAreaHeight - strokeWidth}
        width={penaltyAreaWidth}
        height={penaltyAreaHeight}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Área pequeña inferior */}
      <Rect
        x={(width - goalAreaWidth) / 2}
        y={height - goalAreaHeight - strokeWidth}
        width={goalAreaWidth}
        height={goalAreaHeight}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Punto de penalti inferior */}
      <Circle
        cx={width / 2}
        cy={height - penaltySpotDistance}
        r={3}
        fill={strokeColor}
      />
    </Svg>
  );
}

// Componente de jugador en el campo
function PlayerMarker({ 
  player, 
  position, 
  x, 
  y, 
  fieldWidth, 
  fieldHeight, 
  showPhoto, 
  showName,
  onPress,
  onDrag,
  isDraggable,
  isSelected,
  size = 40
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const colors = getPositionColor(position);
  const pixelX = (x / 100) * fieldWidth;
  const pixelY = (y / 100) * fieldHeight;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isDraggable,
      onMoveShouldSetPanResponder: () => isDraggable,
      onPanResponderMove: (_, gesture) => {
        if (onDrag && isDraggable) {
          const newX = Math.max(0, Math.min(100, x + (gesture.dx / fieldWidth) * 100));
          const newY = Math.max(0, Math.min(100, y + (gesture.dy / fieldHeight) * 100));
          onDrag(player._id, newX, newY);
        }
      },
    })
  ).current;

  return (
    <TouchableOpacity
      style={[
        styles.playerMarker,
        {
          left: pixelX - size / 2,
          top: pixelY - size / 2,
          width: size,
          height: size,
        },
        isSelected && styles.playerMarkerSelected
      ]}
      onPress={() => onPress && onPress(player)}
      {...(isDraggable ? panResponder.panHandlers : {})}
    >
      {showPhoto && player?.foto ? (
        <Image
          source={{ uri: player.foto }}
          style={[styles.playerPhoto, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <LinearGradient
          colors={colors}
          style={[styles.playerCircle, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Text style={styles.playerNumber}>{player?.dorsal || '?'}</Text>
        </LinearGradient>
      )}
      {showName && (
        <View style={styles.playerNameContainer}>
          <Text style={styles.playerName} numberOfLines={1}>
            {player ? getPlayerFirstName(player) : position}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Componente principal de LineupField
export default function LineupField({
  players = [], // Lista de jugadores disponibles
  lineup = [], // Array de { player, x, y, posicionTactica }
  formation = '1-4-4-2',
  showPhotos = true,
  showNames = true,
  onLineupChange, // Callback cuando cambia la alineación
  editable = false,
  width: propWidth,
  height: propHeight,
  style,
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  
  // Calcular dimensiones del campo
  const fieldWidth = propWidth || Math.min(screenWidth - 32, 400);
  const fieldHeight = propHeight || fieldWidth / FIELD_ASPECT_RATIO;
  
  // Obtener posiciones de la formación
  const formationPositions = useMemo(() => {
    return FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['1-4-4-2'];
  }, [formation]);
  
  // Combinar posiciones de formación con jugadores asignados
  const displayPositions = useMemo(() => {
    return formationPositions.map((pos, index) => {
      const assignedPlayer = lineup.find(l => l.posicionTactica === pos.pos && l.index === index) ||
                            lineup.find(l => l.index === index);
      return {
        ...pos,
        index,
        player: assignedPlayer?.player ? 
          players.find(p => p._id === assignedPlayer.player || p._id === assignedPlayer.player._id) : 
          null,
        x: assignedPlayer?.x ?? pos.x,
        y: assignedPlayer?.y ?? pos.y,
      };
    });
  }, [formationPositions, lineup, players]);
  
  // Manejar selección de posición para añadir jugador
  const handlePositionPress = (position) => {
    if (!editable) return;
    setSelectedPosition(position);
    setShowPlayerSelector(true);
  };
  
  // Manejar selección de jugador
  const handlePlayerSelect = (player) => {
    if (!selectedPosition || !onLineupChange) return;
    
    const newLineup = lineup.filter(l => l.index !== selectedPosition.index);
    newLineup.push({
      player: player._id,
      x: selectedPosition.x,
      y: selectedPosition.y,
      posicionTactica: selectedPosition.pos,
      index: selectedPosition.index,
    });
    
    onLineupChange(newLineup);
    setShowPlayerSelector(false);
    setSelectedPosition(null);
  };
  
  // Manejar arrastre de jugador
  const handlePlayerDrag = (playerId, newX, newY) => {
    if (!onLineupChange) return;
    
    const newLineup = lineup.map(l => {
      if (l.player === playerId || l.player?._id === playerId) {
        return { ...l, x: newX, y: newY };
      }
      return l;
    });
    
    onLineupChange(newLineup);
  };
  
  // Jugadores disponibles (no en la alineación)
  const availablePlayers = useMemo(() => {
    const assignedIds = lineup.map(l => l.player?._id || l.player).filter(Boolean);
    return players.filter(p => !assignedIds.includes(p._id));
  }, [players, lineup]);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.fieldContainer, { width: fieldWidth, height: fieldHeight }]}>
        <FootballFieldSVG width={fieldWidth} height={fieldHeight} />
        
        {/* Renderizar jugadores */}
        {displayPositions.map((pos, index) => (
          <PlayerMarker
            key={`pos-${index}`}
            player={pos.player}
            position={pos.pos}
            x={pos.x}
            y={pos.y}
            fieldWidth={fieldWidth}
            fieldHeight={fieldHeight}
            showPhoto={showPhotos}
            showName={showNames}
            onPress={() => handlePositionPress(pos)}
            onDrag={handlePlayerDrag}
            isDraggable={editable && pos.player}
            isSelected={selectedPosition?.index === index}
            size={showPhotos ? 44 : 36}
          />
        ))}
      </View>
      
      {/* Modal para seleccionar jugador */}
      <Modal
        visible={showPlayerSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlayerSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('matchSheet.selectPlayer') || 'Seleccionar jugador'}
              </Text>
              <TouchableOpacity onPress={() => setShowPlayerSelector(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.playerList}>
              {/* Opción para quitar jugador */}
              {selectedPosition?.player && (
                <TouchableOpacity
                  style={[styles.playerOption, styles.removeOption]}
                  onPress={() => {
                    const newLineup = lineup.filter(l => l.index !== selectedPosition.index);
                    onLineupChange(newLineup);
                    setShowPlayerSelector(false);
                    setSelectedPosition(null);
                  }}
                >
                  <Ionicons name="remove-circle" size={24} color={theme.colors.error} />
                  <Text style={styles.removeText}>
                    {t('matchSheet.removePlayer') || 'Quitar jugador'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {availablePlayers.map((player) => (
                <TouchableOpacity
                  key={player._id}
                  style={styles.playerOption}
                  onPress={() => handlePlayerSelect(player)}
                >
                  {player.foto ? (
                    <Image source={{ uri: player.foto }} style={styles.optionPhoto} />
                  ) : (
                    <View style={styles.optionInitials}>
                      <Text style={styles.initialsText}>
                        {getPlayerInitials(player)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionName}>
                      {getPlayerFullName(player)}
                    </Text>
                    <Text style={styles.optionDetails}>
                      #{player.dorsal} • {player.posicion}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              
              {availablePlayers.length === 0 && (
                <Text style={styles.noPlayersText}>
                  {t('matchSheet.noAvailablePlayers') || 'No hay jugadores disponibles'}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  fieldContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  playerMarker: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  playerMarkerSelected: {
    transform: [{ scale: 1.15 }],
  },
  playerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  playerPhoto: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  playerNumber: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  playerNameContainer: {
    position: 'absolute',
    bottom: -18,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 80,
  },
  playerName: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  playerList: {
    padding: 16,
  },
  playerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  removeOption: {
    backgroundColor: theme.colors.errorSoft,
    marginBottom: 16,
  },
  removeText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  optionPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  optionInitials: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  optionDetails: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  noPlayersText: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 16,
    paddingVertical: 24,
  },
});
