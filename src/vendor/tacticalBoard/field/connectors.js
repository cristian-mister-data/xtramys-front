import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniColorPickerModal } from '../colorPicker';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, G } from 'react-native-svg';
import { ratioToDisplay } from '../fields';
import { useScreenDimensions } from './controls';
import { styles } from './styles';
import { TouchableOpacity } from './primitives';
export // =====================================================
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
    return clones.filter(
      (clone) =>
        clone.type === 'player' ||
        clone.playerData ||
        // Jugadores del equipo
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
        clone.type === 'weights',
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
    setConnectors((prev) => [...prev, newConnector]);
    setSelectedIcon1(null);
    setSelectedIcon2(null);
  };
  const handleUpdateConnector = () => {
    if (!editingConnector) return;
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === editingConnector.id
          ? {
              ...c,
              color: lineColor,
              thickness: parseInt(lineThickness) || 2,
            }
          : c,
      ),
    );
    setEditingConnector(null);
  };
  const handleDeleteConnector = (connectorId) => {
    setConnectors((prev) => prev.filter((c) => c.id !== connectorId));
  };
  const handleEditConnector = (connector) => {
    setEditingConnector(connector);
    setLineColor(connector.color);
    setLineThickness(connector.thickness.toString());
  };
  const getElementLabel = (id) => {
    const element = clones.find((c) => c.id === id);
    if (!element) return t('tacticalBoard.connectors.unknown');
    if (element.playerData) {
      return (
        element.playerData.nombre ||
        element.playerData.name ||
        t('tacticalBoard.connectors.teamPlayer')
      );
    }
    if (element.type === 'player') {
      if (element.value) return element.value;
      return `${t('tacticalBoard.connectors.player')} ${element.number || ''}`.trim();
    }
    if (element.type === 'ball') return t('tacticalBoard.elements.ball');
    if (element.type === 'cone' || element.type === 'cone-pro')
      return t('tacticalBoard.elements.cone');
    if (element.type === 'cone-flat') return t('tacticalBoard.elements.coneFlat');
    if (element.type === 'ring') return t('tacticalBoard.elements.ring');
    if (element.type === 'dummy') return t('tacticalBoard.elements.dummy');
    if (element.type === 'barrier' || element.type === 'goal')
      return t('tacticalBoard.elements.barrier');
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
      <View
        style={{
          flex: 1,
        }}
      >
        <View style={styles.proModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View
            style={[
              styles.proModalContainerSide,
              {
                top: 0,
                bottom: 0,
                paddingTop: insets.top,
                paddingRight: insets.right,
                paddingBottom:
                  Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom,
              },
              isMobile && {
                width: SCREEN_WIDTH * 0.8,
                maxWidth: 340,
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
                  🔗
                </Text>
              </View>
              <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                {t('tacticalBoard.connectors.title')}
              </Text>
              <TouchableOpacity style={styles.proModalCloseBtn} onPress={onClose}>
                <Text
                  style={{
                    fontSize: 18,
                    color: '#666',
                  }}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
              contentContainerStyle={styles.proModalBody}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {/* Crear nuevo conector */}
              <View style={styles.proModalSection}>
                <Text style={styles.proModalSectionTitle}>
                  {editingConnector
                    ? t('tacticalBoard.connectors.editConnector')
                    : t('tacticalBoard.connectors.createConnector')}
                </Text>

                {!editingConnector && (
                  <>
                    {/* Selector de primer elemento */}
                    <Text style={styles.proModalLabel}>
                      {t('tacticalBoard.connectors.fromElement')}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 8,
                        }}
                      >
                        {connectableElements.map((element) => (
                          <TouchableOpacity
                            key={element.id}
                            style={[
                              styles.connectorElementBtn,
                              selectedIcon1 === element.id && styles.connectorElementBtnSelected,
                            ]}
                            onPress={() => setSelectedIcon1(element.id)}
                          >
                            <Text
                              style={[
                                styles.connectorElementText,
                                selectedIcon1 === element.id && styles.connectorElementTextSelected,
                              ]}
                              numberOfLines={1}
                            >
                              {getElementLabel(element.id)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>

                    {/* Selector de segundo elemento */}
                    <Text style={styles.proModalLabel}>
                      {t('tacticalBoard.connectors.toElement')}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 8,
                        }}
                      >
                        {connectableElements
                          .filter((e) => e.id !== selectedIcon1)
                          .map((element) => (
                            <TouchableOpacity
                              key={element.id}
                              style={[
                                styles.connectorElementBtn,
                                selectedIcon2 === element.id && styles.connectorElementBtnSelected,
                              ]}
                              onPress={() => setSelectedIcon2(element.id)}
                            >
                              <Text
                                style={[
                                  styles.connectorElementText,
                                  selectedIcon2 === element.id &&
                                    styles.connectorElementTextSelected,
                                ]}
                                numberOfLines={1}
                              >
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
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text style={styles.proModalLabel}>
                      {t('tacticalBoard.connectors.lineColor')}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor: lineColor,
                          width: '100%',
                          height: 40,
                        },
                      ]}
                      onPress={() => setColorPickerVisible(true)}
                    />
                  </View>
                  <View
                    style={{
                      flex: 1,
                      marginLeft: 12,
                    }}
                  >
                    <Text style={styles.proModalLabel}>
                      {t('tacticalBoard.connectors.lineThickness')}
                    </Text>
                    <TextInput
                      style={[
                        styles.proModalInputMobile,
                        {
                          height: 40,
                        },
                      ]}
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
                    {
                      marginTop: 12,
                    },
                    !editingConnector &&
                      (!selectedIcon1 || !selectedIcon2) && {
                        opacity: 0.5,
                      },
                  ]}
                  onPress={editingConnector ? handleUpdateConnector : handleAddConnector}
                  disabled={!editingConnector && (!selectedIcon1 || !selectedIcon2)}
                >
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                    {editingConnector
                      ? t('tacticalBoard.connectors.update')
                      : t('tacticalBoard.connectors.add')}
                  </Text>
                </TouchableOpacity>

                {editingConnector && (
                  <TouchableOpacity
                    style={[
                      styles.proModalBtn,
                      styles.proModalBtnSecondary,
                      {
                        marginTop: 8,
                      },
                    ]}
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
                  connectors.map((connector) => (
                    <View key={connector.id} style={styles.connectorItem}>
                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text style={styles.connectorItemText} numberOfLines={1}>
                          {getElementLabel(connector.fromId)} → {getElementLabel(connector.toId)}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 4,
                          }}
                        >
                          <View
                            style={[
                              styles.connectorColorPreview,
                              {
                                backgroundColor: connector.color,
                              },
                            ]}
                          />
                          <Text style={styles.connectorItemSubtext}>
                            {t('tacticalBoard.connectors.thickness')}: {connector.thickness}px
                          </Text>
                        </View>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 8,
                        }}
                      >
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
export // =====================================================
// COMPONENTE PARA RENDERIZAR LAS LÍNEAS DE CONECTORES
// =====================================================
const ConnectorsRenderer = React.memo(
  ({ connectors, clones, imageWidth, imageHeight, viewMode }) => {
    // Calcular las posiciones de las l�neas bas�ndose en las posiciones de los elementos
    const lines = useMemo(() => {
      const clonesById = new Map(clones.map((clone) => [clone.id, clone]));
      return connectors
        .map((connector) => {
          const fromElement = clonesById.get(connector.fromId);
          const toElement = clonesById.get(connector.toId);
          if (!fromElement || !toElement) return null;

          // Obtener coordenadas del centro de cada elemento
          const from = ratioToDisplay(
            fromElement.xRatio || 0,
            fromElement.yRatio || 0,
            viewMode,
            imageWidth,
            imageHeight,
          );
          const to = ratioToDisplay(
            toElement.xRatio || 0,
            toElement.yRatio || 0,
            viewMode,
            imageWidth,
            imageHeight,
          );
          return {
            id: connector.id,
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            color: connector.color,
            thickness: connector.thickness,
          };
        })
        .filter(Boolean);
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
          {lines.map((line) => (
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
  },
  (prevProps, nextProps) => {
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
    if (prevProps.clones === nextProps.clones) return true;

    const relevantIds = new Set(prevProps.connectors.flatMap((c) => [c.fromId, c.toId]));
    const previousClonesById = new Map(prevProps.clones.map((clone) => [clone.id, clone]));
    const nextClonesById = new Map(nextProps.clones.map((clone) => [clone.id, clone]));
    for (const id of relevantIds) {
      const prevClone = previousClonesById.get(id);
      const nextClone = nextClonesById.get(id);
      if (!prevClone || !nextClone) return false;
      if (prevClone.xRatio !== nextClone.xRatio || prevClone.yRatio !== nextClone.yRatio) {
        return false;
      }
    }
    return true;
  },
);
