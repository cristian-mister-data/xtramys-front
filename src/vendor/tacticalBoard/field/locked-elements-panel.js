import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useScreenDimensions } from './controls';
import { styles } from './styles';
import { TouchableOpacity } from './primitives';
export function LockedElementsPanel({ visible, onClose, lockedElements, onUnlock, scale = 1 }) {
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
      <SafeAreaView
        style={{
          flex: 1,
        }}
      >
        <View style={styles.proModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View
            style={[
              styles.proModalContainer,
              isMobile && {
                width: SCREEN_WIDTH * 0.8,
                maxWidth: 320,
                maxHeight: SCREEN_HEIGHT * 0.8,
              },
              !isMobile && {
                width: Math.min(300 * scale, 340),
                maxHeight: '75%',
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
                  🔒
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                  {t('tacticalBoard.lockedPanel.title')}
                </Text>
              </View>
              <TouchableOpacity style={styles.proModalCloseBtn} onPress={onClose}>
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

            {lockedElements.length === 0 ? (
              <View
                style={[
                  styles.proModalBody,
                  {
                    alignItems: 'center',
                    paddingVertical: 40,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: '#666',
                    fontStyle: 'italic',
                  }}
                >
                  {t('tacticalBoard.lockedPanel.noLockedElements')}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{
                  maxHeight: SCREEN_HEIGHT * 0.6,
                  width: '100%',
                  minHeight: 80,
                }}
                contentContainerStyle={styles.proModalBody}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {lockedElements.map((element) => (
                  <View
                    key={element.id}
                    style={[
                      styles.proModalCard,
                      {
                        padding: 12,
                      },
                    ]}
                  >
                    <View style={styles.lockedElementInfo}>
                      <View style={styles.lockedElementIcon}>
                        {element.type === 'player' && (
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: element.color || '#2176ff',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            {element.number && (
                              <Text
                                style={{
                                  color: '#fff',
                                  fontSize: 10,
                                  fontWeight: 'bold',
                                }}
                              >
                                {element.number}
                              </Text>
                            )}
                          </View>
                        )}
                        {element.type === 'ball' && (
                          <View
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              backgroundColor: '#fff',
                              borderWidth: 2,
                              borderColor: '#000',
                            }}
                          />
                        )}
                        {(element.type === 'cone' || element.type === 'cone-pro') && (
                          <View
                            style={{
                              width: 0,
                              height: 0,
                              borderLeftWidth: 7,
                              borderRightWidth: 7,
                              borderBottomWidth: 14,
                              borderStyle: 'solid',
                              borderLeftColor: 'transparent',
                              borderRightColor: 'transparent',
                              borderBottomColor: element.color || '#FF6B00',
                            }}
                          />
                        )}
                        {element.type === 'cone-flat' && (
                          <View
                            style={{
                              width: 16,
                              height: 6,
                              backgroundColor: element.color || '#FF6B00',
                              borderRadius: 2,
                            }}
                          />
                        )}
                        {element.type === 'ring' && (
                          <View
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              borderWidth: 3,
                              borderColor: element.color || '#FFD700',
                              backgroundColor: 'transparent',
                            }}
                          />
                        )}
                        {(element.type === 'text' || element.type === 'free-text') && (
                          <Feather name="type" size={18} color={element.color || '#000'} />
                        )}
                        {(element.type === 'straight-arrow' || element.type === 'curve-arrow') && (
                          <Feather
                            name="arrow-right"
                            size={18}
                            color={element.color || '#141414'}
                          />
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
                          <MaterialIcons
                            name="sports-soccer"
                            size={18}
                            color={element.color || '#888'}
                          />
                        )}
                        {element.type === 'barrier' && (
                          <MaterialIcons name="fence" size={18} color={element.color || '#888'} />
                        )}
                        {element.type === 'dummy' && (
                          <MaterialIcons
                            name="accessibility"
                            size={18}
                            color={element.color || '#2196F3'}
                          />
                        )}
                        {element.type === 'pole' && (
                          <View
                            style={{
                              width: 4,
                              height: 18,
                              backgroundColor: element.color || '#FFD700',
                              borderRadius: 2,
                            }}
                          />
                        )}
                        {element.type === 'ladder' && (
                          <MaterialIcons
                            name="view-headline"
                            size={18}
                            color={element.color || '#000'}
                          />
                        )}
                        {element.type === 'weights' && (
                          <MaterialCommunityIcons
                            name="dumbbell"
                            size={18}
                            color={element.color || '#333'}
                          />
                        )}
                      </View>
                      <View style={styles.lockedElementDetails}>
                        <Text style={styles.lockedElementName}>
                          {element.type === 'player' &&
                            `Jugador ${element.number ? `#${element.number}` : ''}${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'ball' && 'Bal�n'}
                          {(element.type === 'cone' || element.type === 'cone-pro') &&
                            `Cono${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'cone-flat' &&
                            `Cono plano${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'ring' &&
                            `Aro${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'text' &&
                            `Texto: "${element.value?.substring(0, 20) || 'Sin contenido'}${element.value?.length > 20 ? '...' : ''}"`}
                          {element.type === 'free-text' &&
                            `Texto libre: "${element.value?.substring(0, 15) || 'Sin contenido'}${element.value?.length > 15 ? '...' : ''}"`}
                          {element.type === 'straight-arrow' &&
                            `Flecha recta${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'curve-arrow' &&
                            `Flecha curva${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'straight-line' &&
                            `L�nea recta${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'curve-line' &&
                            `L�nea curva${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'circle' &&
                            `C�rculo${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'rectangle' &&
                            `Rect�ngulo${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'custom-shape' &&
                            `Forma personalizada${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'goal-large' && 'Porter�a grande'}
                          {element.type === 'goal-small' && 'Porter�a peque�a'}
                          {element.type === 'barrier' &&
                            `Valla${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'dummy' &&
                            `Maniqu�${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'pole' &&
                            `Pica${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'ladder' &&
                            `Escalera${element.color ? ` (${element.color})` : ''}`}
                          {element.type === 'weights' &&
                            `Pesas${element.color ? ` (${element.color})` : ''}`}
                        </Text>
                        <Text style={styles.lockedElementType}>
                          Tipo:{' '}
                          {element.type === 'player'
                            ? 'Jugador'
                            : element.type === 'ball'
                              ? 'Bal�n'
                              : element.type === 'cone' || element.type === 'cone-pro'
                                ? 'Cono'
                                : element.type === 'cone-flat'
                                  ? 'Cono plano'
                                  : element.type === 'ring'
                                    ? 'Aro'
                                    : element.type === 'text' || element.type === 'free-text'
                                      ? 'Texto'
                                      : element.type === 'straight-arrow'
                                        ? 'Flecha recta'
                                        : element.type === 'curve-arrow'
                                          ? 'Flecha curva'
                                          : element.type === 'straight-line'
                                            ? 'L�nea recta'
                                            : element.type === 'curve-line'
                                              ? 'L�nea curva'
                                              : element.type === 'circle'
                                                ? 'C�rculo'
                                                : element.type === 'rectangle'
                                                  ? 'Rect�ngulo'
                                                  : element.type === 'custom-shape'
                                                    ? 'Forma personalizada'
                                                    : element.type === 'goal-large'
                                                      ? 'Porter�a grande'
                                                      : element.type === 'goal-small'
                                                        ? 'Porter�a peque�a'
                                                        : element.type === 'barrier'
                                                          ? 'Valla'
                                                          : element.type === 'dummy'
                                                            ? 'Maniqu�'
                                                            : element.type === 'pole'
                                                              ? 'Pica'
                                                              : element.type === 'ladder'
                                                                ? 'Escalera'
                                                                : element.type === 'weights'
                                                                  ? 'Pesas'
                                                                  : 'Desconocido'}
                          {element.size && ` "� Tama�o: ${element.size}`}
                          {element.thickness && ` "� Grosor: ${element.thickness}`}
                        </Text>
                        <View style={styles.lockedElementBadge}>
                          <Feather name="lock" size={12} color="#f39c12" />
                          <Text style={styles.lockedBadgeText}>
                            {t('tacticalBoard.lockedPanel.locked')}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.unlockButton}
                      onPress={() => onUnlock(element.id)}
                    >
                      <Feather name="unlock" size={16} color="#27ae60" />
                      <Text style={styles.unlockButtonText}>
                        {t('tacticalBoard.lockedPanel.unlock')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.proModalFooter}>
              <TouchableOpacity
                style={[
                  styles.proModalBtn,
                  styles.proModalBtnSecondary,
                  {
                    flex: 1,
                  },
                ]}
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
