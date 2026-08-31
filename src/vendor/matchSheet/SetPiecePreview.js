import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg from 'react-native-svg';
import { useTheme } from 'styled-components';
import { cdnUrl } from '@/config';
import { getPlayerFullName, getPlayerInitials } from '@/utils/playerHelpers';
import { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';
import { applySetPieceKitsToElements } from '@/utils/kits';
import { getPlayerRenderMetrics } from '@/utils/playerRenderMetrics';
import { decomposeFieldId, getAspectForView, isVisibleInView, ratioToDisplay } from '@/vendor/tacticalBoard/fields';
import { renderIconCanvas, renderPlayerNameLabel } from '@/vendor/tacticalBoard/field/icon-renderers';
import FieldSVGRenderer from '@/vendor/tacticalBoard/fields/FieldSVGRenderer';
import { BatchLinesRenderer } from '@/vendor/tacticalBoard/field/line-renderers';
import { BatchShapesRenderer } from '@/vendor/tacticalBoard/field/shape-renderers';
import { ConnectorsRenderer } from '@/vendor/tacticalBoard/field/connectors';
import { getContentImage, usesImportedImage } from '@/utils/contentVisual';

const getId = (value) => (typeof value === 'object' ? value?._id : value);
const isPlayerObject = (value) => value !== null && typeof value === 'object';

export default function SetPiecePreview({ setPiece, players = [], height = 240, kitContext, onSlotPress, selectedSlotId, showAssignments = false }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme, height), [theme, height]);
  const [boardWidth, setBoardWidth] = useState(0);
  const importedSelected = usesImportedImage(setPiece);
  const sourceElements = !importedSelected && Array.isArray(setPiece?.customElements) && setPiece.customElements.length
    ? setPiece.customElements
    : (!importedSelected && Array.isArray(setPiece?.elementosCampo) ? setPiece.elementosCampo : []);
  const assignments = Array.isArray(setPiece?.assignments) ? setPiece.assignments : [];
  const image = normalizeImageSource(importedSelected ? getContentImage(setPiece) : (setPiece?.customImage || getContentImage(setPiece)));
  const field = decomposeFieldId(setPiece?.customFieldType || setPiece?.tipoCampo || 'full');
  const fieldAspect = getAspectForView(field.viewMode);
  const configuredShowPhotos = setPiece?.pizarraConfig?.teamPlayers?.showPhotos
    ?? setPiece?.pizarraConfig?.showPhotos;
  const showPhotos = configuredShowPhotos === true;
  const assignmentBySlot = new Map(assignments.map((assignment) => [String(assignment.slotId), assignment]));
  const elements = applySetPieceKitsToElements(sourceElements.map((element) => {
    if (element?.type !== 'player') return element;
    const assignment = assignmentBySlot.get(String(element.id || element._id || ''));
    const playerId = getId(assignment?.player);
    const player = players.find((item) => String(item._id || item.id) === String(playerId)) || assignment?.player || element.playerData;
    const playerName = isPlayerObject(player)
      ? (getPlayerFullName(player) || player.fullName || player.name || assignment?.playerName)
      : assignment?.playerName;
    if (!(assignment?.player || assignment?.playerName || element.playerData) || !playerName) {
      return { ...element, playerData: undefined, photoUrl: undefined, matchSheetAssigned: false };
    }
    const playerData = isPlayerObject(player)
      ? { ...player, fullName: playerName }
      : { nombre: playerName, fullName: playerName };
    return {
      ...element,
      number: playerData.dorsal || playerData.number || assignment?.number || element.number,
      playerData,
      photoUrl: playerData.foto ? cdnUrl(playerData.foto) : undefined,
      showPhotos: Boolean(playerData.foto) && (assignment?.showPhotos ?? element.showPhotos ?? showPhotos),
      matchSheetAssigned: true,
    };
  }), kitContext, showPhotos).map((element) => ({
    ...element,
    xRatio: element.xRatio ?? (typeof element.x === 'number' ? element.x / 1280 : undefined),
    yRatio: element.yRatio ?? (typeof element.y === 'number' ? element.y / (1280 * fieldAspect) : undefined),
  }));
  const fieldLayout = useMemo(() => {
    const width = boardWidth || 1;
    const naturalHeight = width * fieldAspect;
    const fieldWidth = naturalHeight <= height ? width : height / fieldAspect;
    const fieldHeight = fieldWidth * fieldAspect;
    return {
      width: fieldWidth,
      height: fieldHeight,
      left: (width - fieldWidth) / 2,
      top: (height - fieldHeight) / 2,
    };
  }, [boardWidth, fieldAspect, height]);
  // En ficha de partido, kitContext adapta solo la copia visual de la ABP a las equipaciones elegidas.
  const liveBoard = elements.length > 0;
  const straightLines = elements.filter((element) => element.type === 'straight-line' || element.type === 'straight-arrow');
  const curveLines = elements.filter((element) => element.type === 'curve-line' || element.type === 'curve-arrow');
  const circles = elements.filter((element) => element.type === 'circle');
  const rectangles = elements.filter((element) => element.type === 'rectangle');
  const customShapes = elements.filter((element) => element.type === 'custom-shape' && element.isCustomShapeComplete);
  const freeTexts = elements.filter((element) => element.type === 'free-text');
  const pointElements = elements.filter((element) =>
    element.xRatio !== undefined &&
    element.yRatio !== undefined &&
    isVisibleInView(element.xRatio, element.yRatio, field.viewMode, 0.03) &&
    !['straight-line', 'straight-arrow', 'curve-line', 'curve-arrow', 'circle', 'rectangle', 'custom-shape', 'free-text'].includes(element.type)
  ).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const emptySelection = new Set();

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
  }).filter((item) => item.element) : [];
  const positioned = markers.filter((item) => item.x !== undefined && item.y !== undefined);
  const fallback = markers.filter((item) => item.x === undefined || item.y === undefined);
  const MarkerRoot = onSlotPress ? TouchableOpacity : View;

  return (
    <View>
      <View style={styles.board} onLayout={(event) => setBoardWidth(event.nativeEvent.layout.width)}>
        {boardWidth > 0 && liveBoard ? (
          <View style={{ position: 'absolute', left: fieldLayout.left, top: fieldLayout.top, width: fieldLayout.width, height: fieldLayout.height, overflow: 'hidden' }}>
            <FieldSVGRenderer
              lineType={field.lineType}
              viewMode={field.viewMode}
              width={fieldLayout.width}
              height={fieldLayout.height}
            />
            <Svg
              pointerEvents="none"
              style={{ position: 'absolute', inset: 0, width: fieldLayout.width, height: fieldLayout.height }}
            >
              <BatchShapesRenderer
                circles={circles}
                rectangles={rectangles}
                customShapes={customShapes}
                imageWidth={fieldLayout.width}
                imageHeight={fieldLayout.height}
                selectedCloneIdsSet={emptySelection}
                selectedCloneId={null}
                multiSelectMode={false}
                viewMode={field.viewMode}
              />
              <BatchLinesRenderer
                straightLines={straightLines}
                curveLines={curveLines}
                imageWidth={fieldLayout.width}
                imageHeight={fieldLayout.height}
                selectedCloneIdsSet={emptySelection}
                multiSelectMode={false}
                viewMode={field.viewMode}
              />
            </Svg>
            <ConnectorsRenderer
              connectors={setPiece?.pizarraConfig?.connectors || []}
              clones={elements}
              imageWidth={fieldLayout.width}
              imageHeight={fieldLayout.height}
              viewMode={field.viewMode}
            />
            {pointElements.map((sourceElement) => {
              const point = ratioToDisplay(sourceElement.xRatio, sourceElement.yRatio, field.viewMode, fieldLayout.width, fieldLayout.height);
              const scale = Math.min(fieldLayout.width, fieldLayout.height) / 500;
              const element = { ...sourceElement, nameLabelScale: scale };
              const { size } = getPlayerRenderMetrics(element, scale);
              return (
                <View
                  key={`element-${element.id || element._id}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: point.x - size / 2,
                    top: point.y - size / 2,
                    width: size,
                    height: size,
                    overflow: 'visible',
                    zIndex: element.zIndex || 300,
                  }}
                >
                  {renderIconCanvas(
                    element,
                    size,
                    element.rotation || 0,
                    element.number,
                    setPiece?.pizarraConfig?.playersWithNumber ?? true,
                    // En la ficha previa el nombre va siempre en la etiqueta
                    // inferior, igual que en la vista ampliada; no usar el
                    // displayLabel de la ABP (se pinta como caja grande).
                    undefined,
                    element.numberColor,
                    element.isGoalkeeper === true,
                    element.differentiateGoalkeeper !== false,
                    element.goalkeeperStripeColor,
                    element.showPhotos === true,
                    element.photoUrl || cdnUrl(element.playerData?.foto || ''),
                  )}
                  {element.matchSheetAssigned && renderPlayerNameLabel(element, true)}
                </View>
              );
            })}
            {freeTexts.map((element) => {
              const point = ratioToDisplay(element.xRatio, element.yRatio, field.viewMode, fieldLayout.width, fieldLayout.height);
              const scale = Math.min(fieldLayout.width, fieldLayout.height) / 500;
              return (
                <View
                  key={`text-${element.id || element._id}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: point.x,
                    top: point.y,
                    backgroundColor: element.backgroundColor || 'transparent',
                    minWidth: 40 * scale,
                    maxWidth: Math.max(40 * scale, fieldLayout.width - point.x),
                    padding: 4 * scale,
                    transform: [{ rotate: `${element.rotation || 0}deg` }],
                  }}
                >
                  <Text
                    style={{
                      color: element.color || '#000',
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: (element.size || element.fontSize || 18) * scale * 0.72,
                      lineHeight: (element.size || element.fontSize || 18) * scale * 0.86,
                      fontWeight: 'bold',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {element.value ?? element.text ?? ''}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.emptyImage}>
            <Text style={styles.emptyText}>{setPiece?.nombre || 'ABP'}</Text>
          </View>
        )}
        {positioned.map((item) => {
          const hasPlayer = isPlayerObject(item.player);
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
            {hasPlayer && (item.showPhotos ?? item.element?.showPhotos ?? showPhotos) && item.player?.foto ? (
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
