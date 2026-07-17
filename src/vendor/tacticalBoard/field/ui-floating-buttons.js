export function createFloatingButtons(dependencies) {
  const {
    Feather,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons,
    Text,
    TouchableOpacity,
    View,
    bringSelectedToFront,
    clearSelection,
    clones,
    deleteSelectedElements,
    duplicateSelectedElements,
    handleCancelar,
    isEditingVideo,
    rotateSelectedElements,
    safeArea,
    sendSelectedToBack,
    styles,
    t,
    toggleLockSelected,
  } = dependencies;
  // A�adir antes del return principal

  // A�adir antes del return principal

  function FloatingButtons({
    visible = true,
    hideBottomButtons = false,
    // Nueva prop para ocultar solo botones inferiores
    sandbox = false,
    // Modo sandbox
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
    isMobile = false,
    isSetPieceOrStrategy = false,
  }) {
    if (!visible) return null;

    // Tama�os m�s peque�os para m�vil
    const buttonSize = isMobile ? 36 : 56;
    const buttonRadius = isMobile ? 18 : 28;
    const iconSize = isMobile ? 16 : 24;
    const topBtnSize = isMobile ? 28 : 56;
    const topBtnRadius = isMobile ? 14 : 28;
    const topIconSize = isMobile ? 14 : 24;
    const topOffset = (isMobile ? 10 : 20) + safeArea.top;
    const bottomOffset = (isMobile ? 10 : 20) + safeArea.bottom;
    const leftOffset = (isMobile ? 10 : 20) + safeArea.left;
    const rightOffset = (isMobile ? 10 : 20) + safeArea.right;
    return (
      <>
        {/* Botones inferiores izquierda - ocultar si hideBottomButtons es true */}
        {!hideBottomButtons && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              {
                bottom: bottomOffset,
                left: leftOffset,
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={onTogglePalette}
          >
            <MaterialCommunityIcons name="shape-plus" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {!hideBottomButtons && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              {
                bottom: bottomOffset,
                left: (isMobile ? 52 : 90) + safeArea.left,
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={onToggleZoom}
          >
            <MaterialCommunityIcons name="magnify-plus-outline" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Bot�n de formaciones */}
        {!hideBottomButtons && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              {
                bottom: bottomOffset,
                left: (isMobile ? 94 : 160) + safeArea.left,
                backgroundColor: '#2176ff',
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={onFormations}
          >
            <MaterialCommunityIcons name="soccer-field" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Botones UNDO/REDO */}
        <TouchableOpacity
          style={[
            styles.floatingButton,
            {
              top: topOffset,
              left: leftOffset,
              backgroundColor: canUndo ? '#3498db' : '#7f8c8d',
              width: topBtnSize,
              height: topBtnSize,
              borderRadius: topBtnRadius,
              opacity: canUndo ? 1 : 0.5,
            },
          ]}
          onPress={onUndo}
          disabled={!canUndo}
        >
          <Feather name="corner-up-left" size={topIconSize} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.floatingButton,
            {
              top: topOffset,
              left: (isMobile ? 44 : 90) + safeArea.left,
              backgroundColor: canRedo ? '#3498db' : '#7f8c8d',
              width: topBtnSize,
              height: topBtnSize,
              borderRadius: topBtnRadius,
              opacity: canRedo ? 1 : 0.5,
            },
          ]}
          onPress={onRedo}
          disabled={!canRedo}
        >
          <Feather name="corner-up-right" size={topIconSize} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.floatingButton,
            {
              top: topOffset,
              left: (isMobile ? 78 : 160) + safeArea.left,
              backgroundColor: '#9b59b6',
              width: topBtnSize,
              height: topBtnSize,
              borderRadius: topBtnRadius,
              zIndex: 110,
            },
          ]}
          onPress={onVideoRecorder}
        >
          <Ionicons name="videocam" size={topIconSize} color="#fff" />
        </TouchableOpacity>

        {/* Bot�n central - Cambiar campo */}
        {!hideBottomButtons && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              {
                bottom: bottomOffset,
                left: '50%',
                marginLeft: isMobile ? -18 : -28,
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={onChangeField}
          >
            {/* Campo con flechas de cambio */}
            <View
              style={{
                width: iconSize,
                height: iconSize,
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                top: -4,
              }}
            >
              <MaterialCommunityIcons name="soccer-field" size={iconSize} color="#fff" />
              {/* Flechas de cambio superpuestas */}
              <View
                style={{
                  position: 'absolute',
                  bottom: -10,
                  right: 5,
                }}
              >
                <MaterialCommunityIcons
                  name="swap-horizontal-bold"
                  size={iconSize * 0.55}
                  color="#fff"
                />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Botones inferiores derecha */}
        {!hideBottomButtons && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              {
                bottom: bottomOffset,
                right: (isMobile ? 48 : 90) + safeArea.right,
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={onSettings}
          >
            <Ionicons name="settings" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {!hideBottomButtons && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              {
                bottom: bottomOffset,
                right: rightOffset,
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={onLocked}
          >
            <Feather name="lock" size={iconSize} color="#fff" />
            {lockedCount > 0 && (
              <View
                style={[
                  styles.floatingButtonBadge,
                  isMobile && {
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    top: -2,
                    right: -2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.floatingButtonBadgeText,
                    isMobile && {
                      fontSize: 8,
                    },
                  ]}
                >
                  {lockedCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Bot�n de selecci�n m�ltiple ahora centrado */}
        {/* Botón de selección múltiple ahora centrado */}
        {(!isMobile || !hideBottomButtons) && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              {
                ...(isMobile
                  ? {
                      top: topOffset,
                      left: 112 + safeArea.left,
                    }
                  : {
                      top: topOffset,
                      left: '50%',
                      marginLeft: -28,
                    }),
                backgroundColor: multiSelectMode ? '#3498db' : '#2c3e50',
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={onToggleMultiSelect}
          >
            <Feather name="check-square" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Botn para cambiar entre modo seleccionar y modo mover (solo visible cuando hay elementos seleccionados) */}
        {multiSelectMode && selectedCloneIds.length > 0 && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              {
                top: topOffset,
                right: (isMobile ? 150 : 230) + safeArea.right,
                backgroundColor: selectionInteractionMode === 'move' ? '#27ae60' : '#f39c12',
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={toggleSelectionInteractionMode}
          >
            <Feather
              name={selectionInteractionMode === 'move' ? 'move' : 'square'}
              size={iconSize}
              color="#fff"
            />
          </TouchableOpacity>
        )}

        {!sandbox && (!isEditingVideo || isSetPieceOrStrategy) && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              styles.floatingButtonPrimary,
              {
                top: topOffset,
                right: (isMobile ? 48 : 90) + safeArea.right,
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={onSave}
          >
            <Feather name="save" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {!sandbox && (!isEditingVideo || isSetPieceOrStrategy) && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              styles.floatingButtonDanger,
              {
                top: topOffset,
                right: rightOffset,
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={onCancel}
          >
            <MaterialIcons name="cancel" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Bot�n de volver para modo edici�n de video */}
        {isEditingVideo && !isSetPieceOrStrategy && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              styles.floatingButtonDanger,
              {
                top: topOffset,
                right: rightOffset,
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={handleCancelar}
          >
            <Feather name="arrow-left" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Bot�n de volver para modo pizarra t�ctica (sandbox) */}
        {sandbox && !isEditingVideo && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              styles.floatingButtonDanger,
              {
                top: topOffset,
                right: rightOffset,
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonRadius,
              },
            ]}
            onPress={handleCancelar}
          >
            <Feather name="arrow-left" size={iconSize} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Panel de selección múltiple (fuera del campo, centrado en movil) */}
        {multiSelectMode && selectedCloneIds.length > 0 && (
          <View
            style={{
              position: 'absolute',
              right: rightOffset,
              ...(isMobile
                ? {
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                  }
                : {
                    top: 250,
                  }),
              zIndex: 10002,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.85)',
                padding: isMobile ? 6 : 10,
                borderRadius: isMobile ? 10 : 8,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <TouchableOpacity
                onPress={duplicateSelectedElements}
                style={{
                  alignItems: 'center',
                  marginBottom: isMobile ? 6 : 8,
                }}
              >
                <Feather name="copy" size={isMobile ? 14 : 18} color="#fff" />
                {!isMobile && (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    {t('tacticalBoard.multiSelect.duplicate', 'Duplicar')}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => rotateSelectedElements(15)}
                style={{
                  alignItems: 'center',
                  marginBottom: isMobile ? 6 : 8,
                }}
              >
                <Feather name="rotate-cw" size={isMobile ? 14 : 18} color="#fff" />
                {!isMobile && (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    {t('tacticalBoard.multiSelect.rotate', 'Rotar')}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleLockSelected}
                style={{
                  alignItems: 'center',
                  marginBottom: isMobile ? 6 : 8,
                }}
              >
                <Feather
                  name={
                    selectedCloneIds.every((id) => (clones.find((c) => c.id === id) || {}).locked)
                      ? 'unlock'
                      : 'lock'
                  }
                  size={isMobile ? 14 : 18}
                  color="#fff"
                />
                {!isMobile && (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    {selectedCloneIds.every((id) => (clones.find((c) => c.id === id) || {}).locked)
                      ? t('tacticalBoard.multiSelect.unlock', 'Desbloq.')
                      : t('tacticalBoard.multiSelect.lock', 'Bloquear')}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={bringSelectedToFront}
                style={{
                  alignItems: 'center',
                  marginBottom: isMobile ? 6 : 8,
                }}
              >
                <Feather name="arrow-up-circle" size={isMobile ? 14 : 18} color="#fff" />
                {!isMobile && (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    {t('tacticalBoard.multiSelect.bringToFront', 'Traer')}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={sendSelectedToBack}
                style={{
                  alignItems: 'center',
                  marginBottom: isMobile ? 6 : 8,
                }}
              >
                <Feather name="arrow-down-circle" size={isMobile ? 14 : 18} color="#fff" />
                {!isMobile && (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    {t('tacticalBoard.multiSelect.sendToBack', 'Fondo')}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={deleteSelectedElements}
                style={{
                  alignItems: 'center',
                  marginBottom: isMobile ? 4 : 6,
                }}
              >
                <Feather name="trash-2" size={isMobile ? 14 : 18} color="#ff3b30" />
                {!isMobile && (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    {t('tacticalBoard.multiSelect.delete', 'Eliminar')}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={clearSelection}
                style={{
                  backgroundColor: '#95a5a6',
                  padding: isMobile ? 4 : 8,
                  borderRadius: 20,
                  marginTop: isMobile ? 4 : 6,
                }}
              >
                <Feather name="x" size={isMobile ? 12 : 18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </>
    );
  }
  return {
    FloatingButtons,
  };
}
