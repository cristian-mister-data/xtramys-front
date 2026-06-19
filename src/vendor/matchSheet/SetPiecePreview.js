import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components';
import { cdnUrl } from '@/config';
import { getPlayerFullName, getPlayerInitials } from '@/utils/playerHelpers';
import { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';

const getId = (value) => (typeof value === 'object' ? value?._id : value);

export default function SetPiecePreview({ setPiece, players = [], height = 240, onSlotPress, selectedSlotId, showAssignments = false }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme, height), [theme, height]);
  const elements = Array.isArray(setPiece?.customElements) && setPiece.customElements.length
    ? setPiece.customElements
    : (Array.isArray(setPiece?.elementosCampo) ? setPiece.elementosCampo : []);
  const assignments = Array.isArray(setPiece?.assignments) ? setPiece.assignments : [];
  const image = normalizeImageSource(setPiece?.customImage || setPiece?.imagen || '');

  const markers = showAssignments ? assignments.map((assignment) => {
    const element = elements.find((item) => String(item.id || item._id || '') === String(assignment.slotId));
    const playerId = getId(assignment.player);
    const player = players.find((p) => String(p._id) === String(playerId)) || assignment.player;
    return {
      ...assignment,
      element,
      player,
      x: element?.xRatio ?? (typeof element?.x === 'number' ? element.x / 1280 : undefined),
      y: element?.yRatio ?? (typeof element?.y === 'number' ? element.y / 832 : undefined),
    };
  }) : [];
  const positioned = markers.filter((item) => item.x !== undefined && item.y !== undefined);
  const fallback = markers.filter((item) => item.x === undefined || item.y === undefined);
  const MarkerRoot = onSlotPress ? TouchableOpacity : View;

  return (
    <View>
      <View style={styles.board}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.emptyImage}>
            <Text style={styles.emptyText}>{setPiece?.nombre || 'ABP'}</Text>
          </View>
        )}
        {positioned.map((item) => {
          const hasPlayer = item.player && typeof item.player === 'object';
          const selected = String(selectedSlotId || '') === String(item.slotId);
          const pressProps = onSlotPress ? { onPress: () => onSlotPress(item.slotId), activeOpacity: 0.85 } : {};
          return (
          <MarkerRoot
            key={item.slotId}
            {...pressProps}
            style={[
              styles.marker,
              { left: `${Math.max(0, Math.min(1, item.x)) * 100}%`, top: `${Math.max(0, Math.min(1, item.y)) * 100}%` },
              selected && styles.markerSelected,
            ]}
          >
            {hasPlayer && item.player?.foto ? (
              <Image source={{ uri: cdnUrl(item.player.foto) }} style={styles.photo} />
            ) : hasPlayer ? (
              <View style={styles.initials}>
                <Text style={styles.initialsText}>{getPlayerInitials(item.player)}</Text>
              </View>
            ) : (
              <View style={styles.numberBubble}>
                <Text style={styles.numberBubbleText}>#{item.number}</Text>
              </View>
            )}
            {hasPlayer && (
              <Text style={styles.markerName} numberOfLines={1}>
                {getPlayerFullName(item.player)}
              </Text>
            )}
          </MarkerRoot>
        );})}
      </View>
      {positioned.length === 0 && fallback.length > 0 && (
        <View style={styles.fallbackList}>
          {fallback.map((item) => (
            <View key={item.slotId} style={styles.fallbackChip}>
              <Text style={styles.fallbackNumber}>#{item.number}</Text>
              <Text style={styles.fallbackName} numberOfLines={1}>{item.playerName || getPlayerFullName(item.player)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme, height) => StyleSheet.create({
  board: {
    height,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  marker: {
    position: 'absolute',
    width: 76,
    alignItems: 'center',
    marginLeft: -38,
    marginTop: -28,
  },
  markerSelected: {
    transform: [{ scale: 1.06 }],
  },
  photo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: theme.colors.surface,
  },
  initials: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: theme.colors.primary,
  },
  initialsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  numberBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#111827',
  },
  numberBubbleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  markerName: {
    marginTop: 3,
    maxWidth: 76,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.72)',
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  fallbackList: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fallbackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fallbackNumber: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  fallbackName: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 12,
    maxWidth: 160,
  },
});
