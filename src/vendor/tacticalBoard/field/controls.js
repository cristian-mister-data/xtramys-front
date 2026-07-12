import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniColorPickerModal } from '../colorPicker';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import {
  ratioToDisplay,
  deltaToRatio,
  isOutsideVisibleField,
  areAllPointsOutside,
} from '../fields';
import { TouchableOpacity, boardInteractionState } from './primitives';
import { ALLOW_MULTI_ELEMENT_DRAG, isBoardCloneOutsideForDelete } from './geometry';
import { ZINDEX_BASE_ICONS, acquireBoardDrag, isBoardDragOwner, releaseBoardDrag } from './config';
import { styles } from './styles';
export function useScreenDimensions() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    return () => sub?.remove();
  }, []);
  return dimensions;
}
export function OptionsMenu({
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
  position = {
    x: 0,
    y: 0,
  },
  hideEdit = false,
  isMobile = false,
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Detectar si es tablet
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;

  // Tamaños fijos del menú (sin escalar según la imagen)
  const menuWidth = isTablet ? 160 : isMobile ? 120 : 145;
  const menuItemHeight = isTablet ? 42 : isMobile ? 26 : 38;
  const fontSize = isTablet ? 14 : isMobile ? 9 : 13;
  const iconSize = isTablet ? 18 : isMobile ? 11 : 16;
  const horizontalPadding = isTablet ? 14 : isMobile ? 8 : 12;
  const verticalPadding = isTablet ? 10 : isMobile ? 3 : 9;
  const iconTextGap = isTablet ? 12 : isMobile ? 5 : 10;
  if (!visible) return null;

  // Calcular el número de items visibles
  const itemCount = [
    true,
    // Duplicar
    onRotate,
    onIncreaseSize,
    onDecreaseSize,
    onEdit && !hideEdit,
    onLock,
    onBringToFront,
    onSendToBack,
    true, // Eliminar
  ].filter(Boolean).length;
  const estimatedMenuHeight = itemCount * menuItemHeight;
  const smartMargin = 10;
  const smartOffsetX = 8;
  const safeLeft = smartMargin + insets.left;
  const safeRight = width - smartMargin - insets.right;
  const safeTop = smartMargin + insets.top;
  const safeBottom = height - smartMargin - insets.bottom;
  const safeHeight = Math.max(menuItemHeight, safeBottom - safeTop);
  const anchorX = Number.isFinite(position.x) ? position.x : 0;
  const anchorY = Number.isFinite(position.y) ? position.y : 0;
  const openRight = anchorX + smartOffsetX + menuWidth <= safeRight;
  const adjustedX = Math.max(
    safeLeft,
    Math.min(
      openRight ? anchorX + smartOffsetX : anchorX - menuWidth - smartOffsetX,
      safeRight - menuWidth,
    ),
  );
  const adjustedY = Math.max(
    safeTop,
    Math.min(anchorY - Math.min(24, estimatedMenuHeight / 2), safeBottom - estimatedMenuHeight),
  );

  // Estilos multiplataforma optimizados
  const menuStyle = {
    position: 'absolute',
    minWidth: menuWidth,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    zIndex: 1000,
    left: adjustedX,
    top: adjustedY,
    maxHeight: Math.min(estimatedMenuHeight, safeHeight),
    // Sombra multiplataforma
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
    // Borde para mejor definición
    borderColor: '#e0e0e0',
    borderWidth: 1,
    overflow: 'hidden',
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
    // Optimizacin multiplataforma
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
      hitSlop={{
        top: 5,
        bottom: 5,
        left: 5,
        right: 5,
      }}
    >
      <View style={iconContainerStyle}>
        <Feather name={iconName} size={iconSize} color={iconColor} />
      </View>
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          zIndex: 999,
        }}
      />

      <View style={menuStyle}>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          <MenuItem
            onPress={() => {
              onDuplicate();
              onClose();
            }}
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
              onPress={() => {
                onEdit();
                onClose();
              }}
              iconName="settings"
              iconColor="#8e44ad"
              label={t('tacticalBoard.menu.moreOptions')}
            />
          )}

          {onLock && (
            <MenuItem
              onPress={() => {
                onLock();
                onClose();
              }}
              iconName={isLocked ? 'unlock' : 'lock'}
              iconColor={isLocked ? '#f39c12' : '#3498db'}
              label={isLocked ? t('tacticalBoard.menu.unlock') : t('tacticalBoard.menu.lock')}
            />
          )}

          {onBringToFront && (
            <MenuItem
              onPress={() => {
                onBringToFront();
                onClose();
              }}
              iconName="arrow-up-circle"
              iconColor="#9b59b6"
              label={t('tacticalBoard.menu.bringToFront')}
            />
          )}

          {onSendToBack && (
            <MenuItem
              onPress={() => {
                onSendToBack();
                onClose();
              }}
              iconName="arrow-down-circle"
              iconColor="#8e44ad"
              label={t('tacticalBoard.menu.sendToBack')}
            />
          )}

          <MenuItem
            onPress={() => {
              onDelete();
              onClose();
            }}
            iconName="trash-2"
            iconColor="#ff3b30"
            label={t('tacticalBoard.menu.delete')}
            isLast={true}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

// Mantenemos el ControlButton para compatibilidad, pero no lo usaremos directamente
export // Mantenemos el ControlButton para compatibilidad, pero no lo usaremos directamente
function ControlButton({ onPress, color, position, scale = 1 }) {
  const buttonSize = 28 * scale;
  const iconSize = 16 * scale;

  // Definir posiciones para cada tipo de bot�n
  let positionStyle;
  if (position === 'delete') {
    positionStyle = {
      top: -buttonSize / 4,
      right: -buttonSize / 4,
    };
  } else if (position === 'duplicate') {
    positionStyle = {
      top: -buttonSize / 4,
      right: buttonSize,
    }; // Posicionado a la izquierda del bot�n de eliminar
  } else {
    positionStyle = {
      top: -buttonSize / 4,
      left: -buttonSize / 4,
    }; // Bot�n de rotaci�n
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          position: 'absolute',
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: '#ffffff',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.2,
          shadowRadius: 1.5,
          elevation: 3,
          borderWidth: 1,
          borderColor: '#dddddd',
          zIndex: 100,
          ...positionStyle,
        },
      ]}
    >
      {position === 'delete' ? (
        <Feather name="x" size={iconSize} color={color || '#ff3b30'} />
      ) : position === 'duplicate' ? (
        <Feather name="copy" size={iconSize} color={color || '#27ae60'} />
      ) : (
        <Feather name="rotate-cw" size={iconSize} color={color || '#007aff'} />
      )}
    </TouchableOpacity>
  );
}
export const FreeTextTool = React.memo(
  ({
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
    setTextEditPanel,
  }) => {
    // Detectar si es m�vil
    const { width, height } = Dimensions.get('window');
    const isMobile = Math.min(width, height) < 768;
    // Factor de escala aumentado para m�viles
    const baseScale = Math.min(imageWidth, imageHeight) / 500;
    const scale = isMobile ? baseScale * 1.35 : baseScale;
    const rafRef = useRef(null);
    const pendingUpdateRef = useRef(null);
    const pointerDownHandledAtRef = useRef(0);
    const dragKey = `text-${textObj.id}`;

    // Usar Set para O(1) lookup
    const isMultiSelected = selectedCloneIdsSet
      ? selectedCloneIdsSet.has(textObj.id)
      : selectedCloneIds.includes(textObj.id);

    // Indicador visual de zona de eliminaci�n (ref para evitar re-renders innecesarios durante drag)
    const isNearDeleteZoneRef = useRef(false);
    const [deleteZoneTick, setDeleteZoneTick] = useState(0);
    const isNearDeleteZone = isNearDeleteZoneRef.current;
    const setIsNearDeleteZone = useCallback((val) => {
      if (isNearDeleteZoneRef.current !== val) {
        isNearDeleteZoneRef.current = val;
        setDeleteZoneTick((t) => t + 1);
      }
    }, []);
    const scheduleTextDragUpdate = useCallback(
      (updater) => {
        pendingUpdateRef.current = updater;
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
          if (pendingUpdateRef.current) {
            setClones(pendingUpdateRef.current);
            pendingUpdateRef.current = null;
          }
          rafRef.current = null;
        });
      },
      [setClones],
    );
    const openTextEditor = useCallback(() => {
      setOptionsMenu((prev) => ({
        ...prev,
        visible: false,
      }));
      setSelectedCloneId(textObj.id);
      setTextEditPanel({
        visible: true,
        icon: textObj,
        isNew: false,
      });
    }, [setOptionsMenu, setSelectedCloneId, setTextEditPanel, textObj]);
    const registerTextPress = useCallback(() => {
      const now = Date.now();
      if (textObj.id === boardInteractionState.tapId && now - boardInteractionState.tapTime < 450) {
        boardInteractionState.tapTime = 0;
        boardInteractionState.tapId = null;
        openTextEditor();
        return true;
      }
      boardInteractionState.tapTime = now;
      boardInteractionState.tapId = textObj.id;
      if (!multiSelectMode) {
        setSelectedCloneId(textObj.id);
      }
      return false;
    }, [multiSelectMode, openTextEditor, setSelectedCloneId, textObj.id]);
    const handleTextPointerDown = useCallback(
      (e) => {
        if (eraserMode || multiSelectMode) return;
        const now = Date.now();
        if (now - pointerDownHandledAtRef.current < 24) return;
        pointerDownHandledAtRef.current = now;
        const nativeEvent = e?.nativeEvent || e;
        if (
          nativeEvent?.button !== undefined &&
          nativeEvent.button !== 0 &&
          nativeEvent.button !== -1
        ) {
          return;
        }
        if (
          textObj.id === boardInteractionState.tapId &&
          now - boardInteractionState.tapTime < 450
        ) {
          boardInteractionState.tapTime = 0;
          boardInteractionState.tapId = null;
          e?.stopPropagation?.();
          openTextEditor();
          return;
        }
        boardInteractionState.tapTime = now;
        boardInteractionState.tapId = textObj.id;
      },
      [eraserMode, multiSelectMode, openTextEditor, textObj.id],
    );

    // En multi-drag, derivar indicador de eliminaci�n de la posici�n actual del elemento
    const textDisplay = ratioToDisplay(
      textObj.xRatio ?? 0.5,
      textObj.yRatio ?? 0.5,
      viewMode,
      imageWidth,
      imageHeight,
    );
    const textDisplayX = textObj.xRatio !== undefined ? textDisplay.x : textObj.x || 0;
    const textDisplayY = textObj.yRatio !== undefined ? textDisplay.y : textObj.y || 0;
    const isOutsideInMultiDrag =
      ALLOW_MULTI_ELEMENT_DRAG &&
      multiSelectMode &&
      selectionInteractionMode === 'move' &&
      isMultiSelected &&
      (textDisplayX < 0 ||
        textDisplayX > imageWidth ||
        textDisplayY < 0 ||
        textDisplayY > imageHeight);
    const showDeleteIndicator = isNearDeleteZone || isOutsideInMultiDrag;
    const noTextSelectionStyle =
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
    return (
      <PanGestureHandler
        key={dragKey}
        enabled={
          !eraserMode &&
          !textObj.locked &&
          (!multiSelectMode ||
            (multiSelectMode && selectionInteractionMode === 'move' && isMultiSelected))
        }
        shouldCancelWhenOutside={false}
        avgTouches={Platform.OS === 'android'}
        activeOffsetX={[-1, 1]}
        activeOffsetY={[-1, 1]}
        onHandlerStateChange={(e) => {
          // Iniciar drag en BEGAN para respuesta inmediata
          if (e.nativeEvent.state === State.BEGAN && !textObj.locked) {
            setDraggingOutside?.(false);
            if (!acquireBoardDrag(dragStart, dragKey)) return;
            // Multi-drag support
            if (
              ALLOW_MULTI_ELEMENT_DRAG &&
              multiSelectMode &&
              selectionInteractionMode === 'move' &&
              isMultiSelected
            ) {
              const initialPositions = {};
              selectedCloneIds.forEach((id) => {
                const c = clones.find((cl) => cl.id === id);
                if (!c) return;
                if (c.points && Array.isArray(c.points)) {
                  initialPositions[id] = c.points.map((p) => ({
                    x: p.x,
                    y: p.y,
                  }));
                } else {
                  initialPositions[id] = {
                    xRatio: c.xRatio,
                    yRatio: c.yRatio,
                  };
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
                id: textObj.id,
              };
            }
          }
          if (
            e.nativeEvent.state === State.END ||
            e.nativeEvent.state === State.CANCELLED ||
            e.nativeEvent.state === State.FAILED
          ) {
            // Detectar doble tap para abrir edici�n de texto
            const translationX = Math.abs(e.nativeEvent.translationX || 0);
            const translationY = Math.abs(e.nativeEvent.translationY || 0);
            const pointerAlreadyHandled = Date.now() - pointerDownHandledAtRef.current < 120;
            if (
              e.nativeEvent.state === State.END &&
              translationX < 4 &&
              translationY < 4 &&
              !pointerAlreadyHandled
            ) {
              registerTextPress();
            }
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
                  const remaining = prev.filter((c) => {
                    if (!start.selectedIds.includes(c.id) || c.locked) return true;
                    let outside = false;
                    if (c.points && Array.isArray(c.points) && c.points.length >= 2) {
                      outside = areAllPointsOutside(c.points, viewMode, imageWidth, imageHeight);
                    } else if (c.xRatio !== undefined) {
                      outside = isOutsideVisibleField(
                        c.xRatio,
                        c.yRatio,
                        viewMode,
                        imageWidth,
                        imageHeight,
                      );
                    }
                    if (outside) {
                      toDelete.push(c);
                      return false;
                    }
                    return true;
                  });
                  return toDelete.length > 0 ? remaining : prev;
                });
              } else {
                // Single drag: solo eliminar este elemento
                setClones((prev) => {
                  const currentClone = prev.find((c) => c.id === textObj.id);
                  if (currentClone && !currentClone.locked) {
                    const { xRatio, yRatio } = currentClone;
                    if (isOutsideVisibleField(xRatio, yRatio, viewMode, imageWidth, imageHeight)) {
                      return prev.filter((c) => c.id !== textObj.id);
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
          if (
            e.nativeEvent.state === State.ACTIVE &&
            !textObj.locked &&
            dragStart.current[dragKey] &&
            isBoardDragOwner(dragStart, dragKey)
          ) {
            const base = dragStart.current[dragKey];
            // Dividir translaci�n por zoomLevel para compensar la escala del contenedor
            const { dxRatio: dx, dyRatio: dy } = deltaToRatio(
              e.nativeEvent.translationX / zoomLevel,
              e.nativeEvent.translationY / zoomLevel,
              viewMode,
              imageWidth,
              imageHeight,
            );
            const newX = (base.multiSelect ? textObj.xRatio || 0 : base.xRatio) + dx;
            const newY = (base.multiSelect ? textObj.yRatio || 0 : base.yRatio) + dy;

            // Multi-drag update
            if (base.multiSelect && base.selectedIds && base.initialPositions) {
              const anyOutside = base.selectedIds.some((id) => {
                const init = base.initialPositions[id];
                if (!init) return false;
                const candidate = Array.isArray(init)
                  ? {
                      points: init.map((pt) => ({
                        x: pt.x + dx,
                        y: pt.y + dy,
                      })),
                    }
                  : {
                      xRatio: (init.xRatio || 0) + dx,
                      yRatio: (init.yRatio || 0) + dy,
                    };
                return isBoardCloneOutsideForDelete(candidate, viewMode, imageWidth, imageHeight);
              });
              setDraggingOutside?.(anyOutside);
              scheduleTextDragUpdate((prev) =>
                prev.map((c) => {
                  if (!base.selectedIds.includes(c.id)) return c;
                  const init = base.initialPositions[c.id];
                  if (!init) return c;
                  if (Array.isArray(init)) {
                    return {
                      ...c,
                      // Permitir valores fuera de 0-1 para que el elemento pueda salir del campo
                      points: init.map((pt) => ({
                        x: pt.x + dx,
                        y: pt.y + dy,
                      })),
                    };
                  }
                  return {
                    ...c,
                    xRatio: (init.xRatio || 0) + dx,
                    yRatio: (init.yRatio || 0) + dy,
                  };
                }),
              );
              return;
            }

            // Actualizar indicador visual de zona de eliminaci�n
            const inDeleteZone = isOutsideVisibleField(
              newX,
              newY,
              viewMode,
              imageWidth,
              imageHeight,
            );
            setDraggingOutside?.(inDeleteZone);
            if (inDeleteZone !== isNearDeleteZone) {
              setIsNearDeleteZone(inDeleteZone);
            }
            scheduleTextDragUpdate((prev) => {
              const correctIndex = prev.findIndex((c) => c.id === textObj.id);
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
          onPointerDown={handleTextPointerDown}
          onMouseDown={handleTextPointerDown}
          onDoubleClick={(e) => {
            e.stopPropagation();
            boardInteractionState.tapTime = 0;
            boardInteractionState.tapId = null;
            openTextEditor();
          }}
          style={{
            position: 'absolute',
            left: textDisplayX,
            top: textDisplayY,
            zIndex:
              textObj.calculatedZIndex ||
              (textObj.locked === true ? 1 : textObj.zIndex || ZINDEX_BASE_ICONS),
            minWidth: 40,
            minHeight: 30,
            opacity: showDeleteIndicator ? 0.5 : 1,
            transform: showDeleteIndicator
              ? [
                  {
                    scale: 0.8,
                  },
                ]
              : [],
          }}
        >
          {/* Indicador visual de zona de eliminaci�n */}
          {showDeleteIndicator && (
            <View
              style={{
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
                zIndex: -1,
              }}
            />
          )}
          <Pressable
            onPointerDown={handleTextPointerDown}
            onMouseDown={handleTextPointerDown}
            onDoubleClick={(e) => {
              e.stopPropagation();
              boardInteractionState.tapTime = 0;
              boardInteractionState.tapId = null;
              openTextEditor();
            }}
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
              maxWidth: Math.max(40, imageWidth - textDisplayX),
              padding: 4,
              userSelect: 'none',
              backgroundColor:
                selectedCloneId === textObj.id
                  ? 'rgba(255, 255, 224, 0.7)'
                  : textObj.backgroundColor || 'transparent',
              borderRadius: 6,
              borderWidth: selectedCloneId === textObj.id ? 1 : 0,
              borderColor: '#888',
              transform: [
                {
                  rotate: `${textObj.rotation || 0}deg`,
                },
              ],
            }}
          >
            <Text
              style={{
                fontSize: textObj.size || 18,
                lineHeight: (textObj.size || 18) * 1.2,
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: textObj.color || '#000',
                fontWeight: 'bold',
                userSelect: 'none',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {textObj.value}
            </Text>
            {/* Indicador visual para selecci�n m�ltiple en textos */}
            {multiSelectMode && isMultiSelected && (
              <View
                style={{
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
                  borderColor: '#fff',
                }}
              >
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
                        x: pageX + width,
                        // Posici�n a la derecha del elemento
                        y: pageY + height / 2, // Centrado verticalmente
                      },
                      iconId: textObj.id,
                      canRotate: false,
                      hideEdit: false,
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
                  shadowOffset: {
                    width: 0,
                    height: 1,
                  },
                  shadowOpacity: 0.2,
                  shadowRadius: 1.5,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: '#dddddd',
                  zIndex: 100,
                  top: -7,
                  right: -7,
                }}
              >
                <Feather name="more-vertical" size={16} color="#444444" />
              </TouchableOpacity>
            )}
          </Pressable>
        </View>
      </PanGestureHandler>
    );
  },
  (prevProps, nextProps) => {
    const textObj = prevProps.textObj;
    const nextTextObj = nextProps.textObj;

    // Comparaci�n optimizada solo de propiedades cr�ticas
    if (
      prevProps.imageWidth !== nextProps.imageWidth ||
      prevProps.imageHeight !== nextProps.imageHeight
    ) {
      return false;
    }
    if (prevProps.viewMode !== nextProps.viewMode) return false;
    if (prevProps.eraserMode !== nextProps.eraserMode) return false;
    const wasSelected = prevProps.selectedCloneId === textObj.id;
    const isSelected = nextProps.selectedCloneId === nextTextObj.id;
    if (textObj.id !== nextTextObj.id) return false;
    if (wasSelected !== isSelected) return false;
    if (textObj.xRatio !== nextTextObj.xRatio || textObj.yRatio !== nextTextObj.yRatio)
      return false;
    if (textObj.x !== nextTextObj.x || textObj.y !== nextTextObj.y) return false;
    if (textObj.locked !== nextTextObj.locked) return false;

    // Multi-select state
    if (prevProps.multiSelectMode !== nextProps.multiSelectMode) return false;
    if (prevProps.selectionInteractionMode !== nextProps.selectionInteractionMode) return false;
    const prevSet = prevProps.selectedCloneIdsSet;
    const nextSet = nextProps.selectedCloneIdsSet;
    const wasMultiSelected = prevSet
      ? prevSet.has(textObj.id)
      : prevProps.selectedCloneIds.includes(textObj.id);
    const isMultiSelected = nextSet
      ? nextSet.has(nextTextObj.id)
      : nextProps.selectedCloneIds.includes(nextTextObj.id);
    if (wasMultiSelected !== isMultiSelected) return false;

    // Solo verificar propiedades visuales si est� seleccionado o cambi�
    if (
      isSelected ||
      wasSelected ||
      textObj.value !== nextTextObj.value ||
      textObj.color !== nextTextObj.color ||
      textObj.size !== nextTextObj.size
    ) {
      if (
        textObj.value !== nextTextObj.value ||
        textObj.color !== nextTextObj.color ||
        textObj.size !== nextTextObj.size ||
        textObj.backgroundColor !== nextTextObj.backgroundColor ||
        textObj.rotation !== nextTextObj.rotation
      )
        return false;
    }
    return true;
  },
);
export function TextEditPanel({
  visible,
  icon,
  onClose,
  onApply,
  onPreviewChange,
  onDelete,
  isNewElement,
}) {
  const { t } = useTranslation();
  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  const [color, setColor] = useState(icon?.color || '#000000');
  const [backgroundColor, setBackgroundColor] = useState(icon?.backgroundColor || 'transparent');
  const [size, setSize] = useState(icon?.size?.toString() || '18');
  const [value, setValue] = useState(icon?.value || '');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [backgroundPickerVisible, setBackgroundPickerVisible] = useState(false);

  // Guardar valores iniciales para restaurar al cancelar
  const initialValuesRef = useRef({
    color: icon?.color || '#000000',
    backgroundColor: icon?.backgroundColor || 'transparent',
    size: icon?.size?.toString() || '18',
    value: icon?.value || '',
  });
  useEffect(() => {
    setColor(icon?.color || '#000000');
    setBackgroundColor(icon?.backgroundColor || 'transparent');
    setSize(icon?.size?.toString() || '18');
    setValue(icon?.value ?? '');
    // Actualizar valores iniciales cuando cambia el icono
    initialValuesRef.current = {
      color: icon?.color || '#000000',
      backgroundColor: icon?.backgroundColor || 'transparent',
      size: icon?.size?.toString() || '18',
      value: icon?.value ?? '',
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
        value,
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
        value: initialValuesRef.current.value,
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
      <SafeAreaView
        style={{
          flex: 1,
        }}
      >
        <Pressable style={styles.proModalOverlay} onPress={handleClose}>
          <Pressable
            onPress={(e) => e?.stopPropagation?.()}
            style={[
              styles.proModalContainer,
              isMobile && {
                width: Math.min(SCREEN_WIDTH * 0.7, 320),
                maxHeight: SCREEN_HEIGHT * 0.85,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.proModalHeader}>
              <View style={styles.proModalHeaderIcon}>
                <Text
                  style={{
                    fontSize: 14,
                  }}
                >
                  📝
                </Text>
              </View>
              <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                {t('tacticalBoard.textPanel.title')}
              </Text>
              <TouchableOpacity style={styles.proModalCloseBtn} onPress={handleClose}>
                <Text
                  style={{
                    fontSize: 14,
                    color: '#666',
                  }}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {/* Body */}
            <KeyboardAwareScrollView
              contentContainerStyle={styles.proModalBody}
              showsVerticalScrollIndicator={false}
            >
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
                    },
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
                      {
                        backgroundColor: color,
                      },
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
                <View
                  style={[
                    styles.proModalRow,
                    {
                      marginTop: 8,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                      {
                        backgroundColor:
                          backgroundColor === 'transparent' ? '#fff' : backgroundColor,
                        opacity: backgroundColor === 'transparent' ? 0.4 : 1,
                      },
                    ]}
                    onPress={() => setBackgroundPickerVisible(true)}
                  />
                  <TouchableOpacity
                    onPress={() => setBackgroundColor('transparent')}
                    style={[
                      styles.proModalChip,
                      backgroundColor === 'transparent' && styles.proModalChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.proModalChipText,
                        backgroundColor === 'transparent' && styles.proModalChipTextSelected,
                      ]}
                    >
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
                <Text
                  style={{
                    fontSize: parseInt(size) || 18,
                    color: color,
                    backgroundColor: backgroundColor,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                  }}
                >
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
                  onApply({
                    ...icon,
                    color,
                    backgroundColor,
                    size: parseInt(size),
                    value,
                  });
                }}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                  {t('tacticalBoard.textPanel.apply')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

// =====================================================
// MODAL DE CONECTORES
// =====================================================
