import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  Modal,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniColorPickerModal } from '../colorPicker';
import { Feather } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { getPlayerFullName } from '@/components/player/playerHelpers';
import { cdnUrl } from '@/config';
import { useScreenDimensions } from './controls';
import {
  FORMATIONS,
  FORMATIONS_BY_PLAYER_COUNT,
  POSITION_TYPES,
  getDefaultPositionLabels,
} from './config';
import { styles } from './styles';
import { TouchableOpacity } from './primitives';
export // Componente modal para seleccionar formaciones
function FormationModal({
  visible,
  onClose,
  onSelectFormation,
  initialColor = '#2176ff',
  initialSize = 24,
  onDeleteFormation,
  formationSettings,
  setFormationSettings,
  onSaveFormationSettings,
  teamPlayerStyle,
  setTeamPlayerStyle,
}) {
  const { t } = useTranslation();
  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  const insets = useSafeAreaInsets();

  // Obtener jugadores del equipo actual
  const players = useSelector((state) => state.player.players || []);
  const equipos = useSelector((state) => state.team.teams || []);
  const selectedTeam = equipos.find((e) => e.seleccionado === true);
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
  const customLabels = formationSettings?.customLabels || {
    ...getDefaultPositionLabels(),
  };
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
        top: 0,
        bottom: 0,
        paddingTop: insets.top,
        paddingRight: insets.right,
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
      portero: ['GK'],
      central: ['CB'],
      lateral: ['LB', 'RB'],
      centrocampista: ['CM', 'CDM', 'CAM', 'LM', 'RM'],
      extremo: ['LW', 'RW'],
      delantero: ['ST'],
    };

    // Primero asignar jugadores a sus posiciones naturales
    positions.forEach((pos, idx) => {
      const posType = pos.position;

      // Buscar jugador con posici�n compatible
      const compatiblePlayer = selectedPlayersList.find((player) => {
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
    const remainingPlayers = selectedPlayersList.filter((p) => !usedPlayers.has(p._id));
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
      setFormationSettings &&
        setFormationSettings((prev) => ({
          ...prev,
          displayMode,
          customLabels,
          numberColor,
          textColor,
          textBackgroundColor,
        }));
      onSelectFormation(key, {
        color: selectedColor,
        size: sizeNum,
        opponent: isOpponent,
        displayMode,
        customLabels,
        numberColor,
        textColor,
        textBackgroundColor,
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
    const usedDorsals = new Set(assignedPlayers.filter((p) => p).map((p) => p.dorsal));
    let nextNumber = 1;
    const getNextNumber = () => {
      while (usedDorsals.has(nextNumber) || usedDorsals.has(String(nextNumber))) {
        nextNumber++;
      }
      usedDorsals.add(nextNumber);
      return nextNumber;
    };
    setFormationSettings &&
      setFormationSettings((prev) => ({
        ...prev,
        displayMode,
        customLabels,
        numberColor,
        textColor,
        textBackgroundColor,
      }));
    onSelectFormation(pendingFormationKey, {
      color: selectedColor,
      size: sizeNum,
      opponent: false,
      displayMode: 'name',
      // Modo especial para mostrar nombres
      customLabels,
      numberColor,
      textColor,
      textBackgroundColor,
      realPlayers: assignedPlayers.map((player, idx) => {
        if (player) {
          return {
            name:
              getPlayerFullName(player)?.substring(0, 3).toUpperCase() ||
              player.apellido?.substring(0, 3).toUpperCase() ||
              `J${idx + 1}`,
            fullName: getPlayerFullName(player),
            dorsal: player.dorsal,
            posicion: player.posicion,
            playerId: player._id,
            foto: player.foto, // Incluir foto del jugador
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
            foto: null,
          };
        }
      }),
    });
    setPlayerSelectorVisible(false);
    setPendingFormationKey(null);
    setSelectedPlayers([]);
    onClose();
  };
  const togglePlayerSelection = (player) => {
    setSelectedPlayers((prev) => {
      const isSelected = prev.some((p) => p._id === player._id);
      if (isSelected) {
        return prev.filter((p) => p._id !== player._id);
      } else if (prev.length < selectedPlayerCount) {
        return [...prev, player];
      }
      return prev;
    });
  };

  // Ordenar jugadores por posici�n
  const sortedPlayers = [...players].sort((a, b) => {
    const posOrder = {
      portero: 1,
      central: 2,
      lateral: 3,
      centrocampista: 4,
      extremo: 5,
      delantero: 6,
    };
    return (posOrder[a.posicion] || 99) - (posOrder[b.posicion] || 99);
  });
  const handleLabelChange = (posKey, value) => {
    // M�ximo 2 caracteres
    const newValue = value.slice(0, 2).toUpperCase();
    setFormationSettings &&
      setFormationSettings((prev) => ({
        ...prev,
        customLabels: {
          ...(prev.customLabels || {}),
          [posKey]: newValue,
        },
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
      <View
        style={{
          flex: 1,
        }}
      >
        <View
          style={[
            styles.proModalOverlay,
            isMobile
              ? {
                  padding: mobileModalMargin,
                }
              : {
                  alignItems: 'flex-end',
                },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View
            style={[
              isMobile ? styles.proModalContainer : styles.proModalContainerSide,
              formationModalPanelStyle,
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
                  ⚽
                </Text>
              </View>
              <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                {t('formations.title')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowSettings(!showSettings)}
                style={[
                  styles.proModalCloseBtn,
                  {
                    backgroundColor: showSettings ? '#2176ff' : '#f5f5f5',
                    marginRight: 6,
                  },
                ]}
              >
                <Feather name="settings" size={14} color={showSettings ? '#fff' : '#666'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.proModalCloseBtn} onPress={onClose}>
                <Text
                  style={{
                    fontSize: 16,
                    color: '#666',
                  }}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {/* Contenido con scroll */}
            <ScrollView
              style={{
                flex: 1,
              }}
              contentContainerStyle={{
                paddingHorizontal: isMobile ? 12 : 0,
                paddingBottom: isMobile ? 8 : 0,
              }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {/* Selector de cantidad de jugadores (7, 8, 11) */}
              <View
                style={{
                  flexDirection: 'row',
                  marginHorizontal: isMobile ? 0 : 12,
                  marginTop: 10,
                  marginBottom: 4,
                  borderRadius: 8,
                  backgroundColor: '#f0f0f0',
                  overflow: 'hidden',
                }}
              >
                {[7, 8, 11].map((count) => (
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
                    <Text
                      style={{
                        fontSize: isMobile ? 12 : 14,
                        fontWeight: '700',
                        color: selectedPlayerCount === count ? '#fff' : '#666',
                      }}
                    >
                      {isMobile
                        ? count
                        : t('formations.playerCountLabel', {
                            count,
                          })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Panel de Configuraci�n */}
              {showSettings && (
                <View
                  style={[
                    styles.proModalCard,
                    {
                      margin: isMobile ? 0 : 12,
                      marginTop: isMobile ? 10 : 12,
                      marginBottom: 8,
                    },
                  ]}
                >
                  <Text style={styles.proModalSectionTitle}>{t('formations.displaySettings')}</Text>

                  {/* Selector de modo: N�mero o Posici�n */}
                  <View
                    style={[
                      styles.proModalGrid,
                      {
                        marginBottom: 12,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        setFormationSettings &&
                        setFormationSettings((prev) => ({
                          ...prev,
                          displayMode: 'number',
                        }))
                      }
                      style={[
                        styles.proModalGridItem,
                        {
                          flex: 1,
                        },
                        displayMode === 'number' && styles.proModalGridItemSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.proModalChipText,
                          displayMode === 'number' && styles.proModalChipTextSelected,
                        ]}
                      >
                        {t('formations.byNumber')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setFormationSettings &&
                        setFormationSettings((prev) => ({
                          ...prev,
                          displayMode: 'position',
                        }))
                      }
                      style={[
                        styles.proModalGridItem,
                        {
                          flex: 1,
                        },
                        displayMode === 'position' && styles.proModalGridItemSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.proModalChipText,
                          displayMode === 'position' && styles.proModalChipTextSelected,
                        ]}
                      >
                        {t('formations.byPosition')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Color del n�mero/texto */}
                  <View
                    style={[
                      styles.proModalRow,
                      {
                        marginBottom: 10,
                      },
                    ]}
                  >
                    <Text style={styles.proModalHint}>{t('formations.textColor')}:</Text>
                    <TouchableOpacity
                      onPress={() => setNumberColorPickerVisible(true)}
                      style={[
                        styles.proModalColorBtnMobile,
                        {
                          backgroundColor: numberColor,
                          borderColor: '#000000',
                        },
                      ]}
                    />
                  </View>

                  {/* Color del texto del nombre (debajo del icono) */}
                  <View
                    style={[
                      styles.proModalRow,
                      {
                        marginBottom: 10,
                      },
                    ]}
                  >
                    <Text style={styles.proModalHint}>{t('formations.nameTextColor')}:</Text>
                    <TouchableOpacity
                      onPress={() => setTextColorPickerVisible(true)}
                      style={[
                        styles.proModalColorBtnMobile,
                        {
                          backgroundColor: textColor,
                          borderColor: textColor === '#ffffff' ? '#ccc' : '#e0e0e0',
                        },
                      ]}
                    />
                  </View>

                  {/* Color del fondo del texto del nombre */}
                  <View style={styles.proModalRow}>
                    <Text style={styles.proModalHint}>{t('formations.nameBgColor')}:</Text>
                    <TouchableOpacity
                      onPress={() => setTextBgColorPickerVisible(true)}
                      style={[
                        styles.proModalColorBtnMobile,
                        {
                          backgroundColor:
                            textBackgroundColor === 'transparent' ? '#fff' : textBackgroundColor,
                          opacity: textBackgroundColor === 'transparent' ? 0.5 : 1,
                        },
                      ]}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setTeamPlayerStyle &&
                        setTeamPlayerStyle((prev) => ({
                          ...prev,
                          textBackgroundColor: 'transparent',
                        }))
                      }
                      style={[
                        styles.proModalChip,
                        textBackgroundColor === 'transparent' && styles.proModalChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.proModalChipText,
                          {
                            fontSize: 10,
                          },
                          textBackgroundColor === 'transparent' && styles.proModalChipTextSelected,
                        ]}
                      >
                        {t('common.transparent') || 'Transparente'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Configuraci�n de etiquetas de posiciones (solo si est� en modo posici�n) */}
                  {displayMode === 'position' && (
                    <View>
                      <Text
                        style={{
                          fontSize: isMobile ? 11 : 12,
                          color: '#666',
                          marginBottom: 6,
                        }}
                      >
                        {t('formations.customLabels')} ({t('formations.max2chars')}):
                      </Text>
                      <ScrollView
                        style={{
                          maxHeight: 150,
                        }}
                        nestedScrollEnabled
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                          }}
                        >
                          {POSITION_TYPES.map((pos) => (
                            <View
                              key={pos}
                              style={{
                                width: '33%',
                                paddingHorizontal: 2,
                                marginBottom: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: isMobile ? 9 : 10,
                                  color: '#888',
                                }}
                              >
                                {t(`formations.positions.${pos}`)}
                              </Text>
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
                                  borderColor: '#ddd',
                                }}
                              />
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Bot�n para guardar la Configuraci�n en la base de datos */}
                  <View
                    style={{
                      marginTop: 10,
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                    }}
                  >
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
                        alignItems: 'center',
                      }}
                      disabled={savingSettings}
                    >
                      <Text
                        style={{
                          color: '#fff',
                          fontWeight: '600',
                        }}
                      >
                        {savingSettings ? t('formations.saving') : t('formations.saveSettings')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Target (Team / Opponent) - Mejorado */}
              <View
                style={[
                  styles.proModalCard,
                  {
                    flexDirection: 'row',
                    padding: 4,
                    marginHorizontal: 0,
                    marginTop: 8,
                    marginBottom: 10,
                  },
                ]}
              >
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
                  <Feather
                    name="users"
                    size={isMobile ? 14 : 16}
                    color={!isOpponent ? '#fff' : '#666'}
                    style={{
                      marginRight: 6,
                    }}
                  />
                  <Text
                    style={{
                      color: !isOpponent ? '#fff' : '#666',
                      fontWeight: '600',
                      fontSize: isMobile ? 13 : 15,
                    }}
                  >
                    {t('formations.team')}
                  </Text>
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
                  <Feather
                    name="shield"
                    size={isMobile ? 14 : 16}
                    color={isOpponent ? '#fff' : '#666'}
                    style={{
                      marginRight: 6,
                    }}
                  />
                  <Text
                    style={{
                      color: isOpponent ? '#fff' : '#666',
                      fontWeight: '600',
                      fontSize: isMobile ? 13 : 15,
                    }}
                  >
                    {t('formations.opponent')}
                  </Text>
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
                    borderColor: useRealPlayers ? '#4caf50' : 'transparent',
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: useRealPlayers ? '#4caf50' : '#ccc',
                      backgroundColor: useRealPlayers ? '#4caf50' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    {useRealPlayers && <Feather name="check" size={16} color="#fff" />}
                  </View>
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: isMobile ? 13 : 14,
                        color: useRealPlayers ? '#2e7d32' : '#333',
                        fontWeight: '600',
                      }}
                    >
                      {t('formations.realPlayers')}
                    </Text>
                    <Text
                      style={{
                        fontSize: isMobile ? 10 : 11,
                        color: '#999',
                        marginTop: 2,
                      }}
                    >
                      {t('formations.realPlayersHint')}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={useRealPlayers ? '#4caf50' : '#ccc'}
                  />
                </TouchableOpacity>
              )}

              {/* Compact Color & Size controls */}
              <View
                style={[
                  styles.proModalCard,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: isMobile ? 10 : 12,
                    marginHorizontal: 0,
                    marginTop: 8,
                    marginBottom: 10,
                  },
                ]}
              >
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
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    marginLeft: 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize: isMobile ? 11 : 12,
                      color: '#888',
                      marginBottom: 4,
                      fontWeight: '500',
                    }}
                  >
                    {t('formations.playerSize')}
                  </Text>
                  <View style={styles.proModalStepperRow}>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        setSelectedSize((s) => {
                          const newSize = String(Math.max(8, parseInt(s) - 1 || 23));
                          setTeamPlayerStyle &&
                            setTeamPlayerStyle((prev) => ({
                              ...prev,
                              size: parseInt(newSize),
                            }));
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
                        setSelectedSize((s) => {
                          const newSize = String(Math.min(96, parseInt(s) + 1 || 25));
                          setTeamPlayerStyle &&
                            setTeamPlayerStyle((prev) => ({
                              ...prev,
                              size: parseInt(newSize),
                            }));
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
              <View
                style={{
                  flex: 1,
                  marginTop: 4,
                  minHeight: isMobile ? 160 : 200,
                }}
              >
                <Text
                  style={{
                    fontSize: isMobile ? 11 : 12,
                    color: '#888',
                    fontWeight: '600',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {t('formations.selectFormation')}
                </Text>
                <ScrollView
                  style={{
                    flex: 1,
                  }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                    }}
                  >
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
                          shadowOffset: {
                            width: 0,
                            height: 2,
                          },
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
                        <View
                          style={{
                            width: isMobile ? 44 : 50,
                            height: isMobile ? 30 : 32,
                            backgroundColor: isOpponent
                              ? 'rgba(255,59,48,0.1)'
                              : 'rgba(33,118,255,0.1)',
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: isMobile ? 11 : 12,
                              color: isOpponent ? '#ff3b30' : '#2176ff',
                            }}
                          >
                            ⚽
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: isMobile ? 15 : 20,
                            fontWeight: '700',
                            color: isOpponent ? '#ff3b30' : '#2176ff',
                            letterSpacing: 0.5,
                          }}
                        >
                          {currentFormations[key].name}
                        </Text>
                        <Text
                          style={{
                            fontSize: isMobile ? 10 : 11,
                            color: '#999',
                            marginTop: 2,
                          }}
                        >
                          {currentFormations[key].positions.length}{' '}
                          {t('formations.players').toLowerCase()}
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
                    t('formations.deleteConfirm', {
                      side: isOpponent ? t('formations.opponent') : t('formations.team'),
                    }),
                    [
                      {
                        text: t('common.cancel'),
                        style: 'cancel',
                      },
                      {
                        text: t('formations.delete'),
                        style: 'destructive',
                        onPress: () => {
                          onDeleteFormation && onDeleteFormation(isOpponent ? 'opponent' : 'team');
                          onClose();
                        },
                      },
                    ],
                  );
                }}
                style={[
                  styles.proModalBtn,
                  {
                    backgroundColor: '#dc3545',
                    flex: 1,
                    marginRight: 8,
                  },
                ]}
              >
                <Feather
                  name="trash-2"
                  size={14}
                  color="#fff"
                  style={{
                    marginRight: 6,
                  }}
                />
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                  {t('formations.delete')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.proModalBtn,
                  styles.proModalBtnSecondary,
                  {
                    flex: 1,
                  },
                ]}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                  {t('common.close')}
                </Text>
              </TouchableOpacity>
            </View>

            <MiniColorPickerModal
              visible={colorPickerVisible}
              initialColor={selectedColor}
              onClose={() => setColorPickerVisible(false)}
              onSelect={(c) => {
                setSelectedColor(c);
                if (!isOpponent) {
                  setTeamPlayerStyle &&
                    setTeamPlayerStyle((prev) => ({
                      ...prev,
                      color: c,
                    }));
                }
              }}
            />

            <MiniColorPickerModal
              visible={numberColorPickerVisible}
              initialColor={numberColor}
              onClose={() => setNumberColorPickerVisible(false)}
              onSelect={(c) =>
                setTeamPlayerStyle &&
                setTeamPlayerStyle((prev) => ({
                  ...prev,
                  numberColor: c,
                }))
              }
            />

            <MiniColorPickerModal
              visible={textColorPickerVisible}
              initialColor={textColor}
              onClose={() => setTextColorPickerVisible(false)}
              onSelect={(c) =>
                setTeamPlayerStyle &&
                setTeamPlayerStyle((prev) => ({
                  ...prev,
                  textColor: c,
                }))
              }
            />

            <MiniColorPickerModal
              visible={textBgColorPickerVisible}
              initialColor={textBackgroundColor === 'transparent' ? '#ffffff' : textBackgroundColor}
              onClose={() => setTextBgColorPickerVisible(false)}
              onSelect={(c) =>
                setTeamPlayerStyle &&
                setTeamPlayerStyle((prev) => ({
                  ...prev,
                  textBackgroundColor: c,
                }))
              }
            />

            {/* Modal de selecci�n de jugadores */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={playerSelectorVisible}
              onRequestClose={() => setPlayerSelectorVisible(false)}
              statusBarTranslucent={true}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingTop: insets.top,
                  paddingRight: insets.right,
                  paddingBottom: insets.bottom,
                  paddingLeft: insets.left,
                }}
              >
                <View
                  style={{
                    width: isMobile ? SCREEN_WIDTH * 0.9 : 450,
                    maxHeight: SCREEN_HEIGHT * 0.8,
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <View
                    style={{
                      backgroundColor: '#2176ff',
                      padding: 16,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 18,
                          fontWeight: '700',
                        }}
                      >
                        {t('formations.selectPlayers')}
                      </Text>
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {t('formations.selectedCount', {
                          count: selectedPlayers.length,
                        })}
                        /{selectedPlayerCount}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setPlayerSelectorVisible(false)}>
                      <Feather name="x" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Toggle mostrar fotos */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      backgroundColor: '#f8f9fa',
                      borderBottomWidth: 1,
                      borderBottomColor: '#eee',
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flex: 1,
                      }}
                    >
                      <Feather
                        name="camera"
                        size={18}
                        color="#666"
                        style={{
                          marginRight: 10,
                        }}
                      />
                      <View>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: '#333',
                          }}
                        >
                          {t('tacticalBoard.teamSettings.showPhotos') || 'Mostrar fotos'}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: '#888',
                            marginTop: 2,
                          }}
                        >
                          {t('formations.showPhotosInFormation') ||
                            'Mostrar foto en lugar de n�mero'}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={teamPlayerStyle?.showPhotos || false}
                      onValueChange={(val) => {
                        setTeamPlayerStyle &&
                          setTeamPlayerStyle((prev) => ({
                            ...prev,
                            showPhotos: val,
                            // Si se activan fotos, desactivar mostrar posici�n
                            showPosition: val ? false : prev.showPosition,
                          }));
                      }}
                      trackColor={{
                        false: '#ddd',
                        true: '#81b0ff',
                      }}
                      thumbColor={teamPlayerStyle?.showPhotos ? '#2176ff' : '#f4f3f4'}
                    />
                  </View>

                  {/* Lista de jugadores */}
                  <ScrollView
                    style={{
                      maxHeight: SCREEN_HEIGHT * 0.5,
                      padding: 12,
                    }}
                  >
                    {sortedPlayers.length === 0 ? (
                      <View
                        style={{
                          padding: 20,
                          alignItems: 'center',
                        }}
                      >
                        <Feather name="users" size={48} color="#ccc" />
                        <Text
                          style={{
                            color: '#999',
                            marginTop: 12,
                            textAlign: 'center',
                          }}
                        >
                          {t('formations.noPlayersAvailable')}
                        </Text>
                      </View>
                    ) : (
                      sortedPlayers.map((player) => {
                        const isSelected = selectedPlayers.some((p) => p._id === player._id);
                        const positionLabels = {
                          portero: 'POR',
                          central: 'DEF',
                          lateral: 'LAT',
                          centrocampista: 'MED',
                          extremo: 'EXT',
                          delantero: 'DEL',
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
                              borderColor: isSelected ? '#2176ff' : 'transparent',
                            }}
                          >
                            {/* Checkbox */}
                            <View
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                borderWidth: 2,
                                borderColor: isSelected ? '#2176ff' : '#ccc',
                                backgroundColor: isSelected ? '#2176ff' : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                              }}
                            >
                              {isSelected && <Feather name="check" size={14} color="#fff" />}
                            </View>

                            {/* Dorsal o Foto */}
                            <View
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor:
                                  teamPlayerStyle?.showPhotos && player.foto
                                    ? 'transparent'
                                    : selectedColor,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                                borderWidth: teamPlayerStyle?.showPhotos && player.foto ? 2 : 0,
                                borderColor: selectedColor,
                                overflow: 'hidden',
                              }}
                            >
                              {teamPlayerStyle?.showPhotos && player.foto ? (
                                <Image
                                  source={{
                                    uri: cdnUrl(player.foto),
                                  }}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                  }}
                                  resizeMode="cover"
                                />
                              ) : (
                                <Text
                                  style={{
                                    color: numberColor,
                                    fontWeight: 'bold',
                                    fontSize: 14,
                                  }}
                                >
                                  {player.dorsal || '?'}
                                </Text>
                              )}
                            </View>

                            {/* Info del jugador */}
                            <View
                              style={{
                                flex: 1,
                              }}
                            >
                              <Text
                                style={{
                                  fontWeight: '600',
                                  fontSize: 14,
                                  color: '#333',
                                }}
                              >
                                {getPlayerFullName(player)}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: '#666',
                                  marginTop: 2,
                                }}
                              >
                                {positionLabels[player.posicion] || player.posicion || '-'}
                              </Text>
                            </View>

                            {/* Badge de posici�n */}
                            <View
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 4,
                                backgroundColor:
                                  player.posicion === 'portero'
                                    ? '#ff9800'
                                    : player.posicion === 'central' || player.posicion === 'lateral'
                                      ? '#4caf50'
                                      : player.posicion === 'centrocampista'
                                        ? '#2196f3'
                                        : player.posicion === 'extremo' ||
                                            player.posicion === 'delantero'
                                          ? '#f44336'
                                          : '#9e9e9e',
                              }}
                            >
                              <Text
                                style={{
                                  color: '#fff',
                                  fontSize: 10,
                                  fontWeight: 'bold',
                                }}
                              >
                                {positionLabels[player.posicion] || '?'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>

                  {/* Footer con botones */}
                  <View
                    style={{
                      flexDirection: 'row',
                      padding: 12,
                      borderTopWidth: 1,
                      borderTopColor: '#eee',
                    }}
                  >
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
                        marginRight: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: '#666',
                          fontWeight: '600',
                        }}
                      >
                        {t('common.cancel')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleConfirmPlayers}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 8,
                        backgroundColor: selectedPlayers.length > 0 ? '#2176ff' : '#ccc',
                        alignItems: 'center',
                      }}
                      disabled={selectedPlayers.length === 0}
                    >
                      <Text
                        style={{
                          color: '#fff',
                          fontWeight: '600',
                        }}
                      >
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
