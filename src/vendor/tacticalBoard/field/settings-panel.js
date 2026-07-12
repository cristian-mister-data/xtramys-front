import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  Modal,
  Platform,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniColorPickerModal } from '../colorPicker';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { useScreenDimensions } from './controls';
import {
  DEFAULT_GOALKEEPER_ICON_1_SETTINGS,
  DEFAULT_GOALKEEPER_ICON_2_SETTINGS,
  DEFAULT_PLAYER_ICON_SIZE,
  NEUTRAL_PLAYER_COLORS,
  getDefaultNeutralPlayerSettings,
  normalizeBoardSettings,
} from './config';
import { styles } from './styles';
import { TouchableOpacity } from './primitives';
export function SettingsPanel({
  visible,
  onClose,
  standardSize,
  setStandardSize,
  playersWithNumber,
  setPlayersWithNumber,
  boardSettings,
  setBoardSettings,
  onApplyBoardSettings,
  onSaveBoardSettings,
  onOpenConnectors,
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  const [size, setSize] = useState(standardSize.toString());
  const MIN_SIZE = 16; // Tama�o m�nimo para que quepa el n�mero
  const [savingSettings, setSavingSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState(boardSettings);
  const [draftPlayersWithNumber, setDraftPlayersWithNumber] = useState(playersWithNumber);

  // Estados para color pickers
  const [colorPicker1Visible, setColorPicker1Visible] = useState(false);
  const [colorPicker2Visible, setColorPicker2Visible] = useState(false);
  const [colorPickerNeutralVisible, setColorPickerNeutralVisible] = useState(false);
  const [neutralBgPickerVisible, setNeutralBgPickerVisible] = useState(false);
  const [neutralLetterPickerVisible, setNeutralLetterPickerVisible] = useState(false);
  const [colorPickerTeamVisible, setColorPickerTeamVisible] = useState(false);
  const [colorPickerGoalkeeperVisible, setColorPickerGoalkeeperVisible] = useState(false);
  const [stripePickerTarget, setStripePickerTarget] = useState(null);
  const [bibPickerTarget, setBibPickerTarget] = useState(null);
  const [numberColorPickerTarget, setNumberColorPickerTarget] = useState(null);
  const isGoalkeeperStripeTarget = stripePickerTarget === 'teamPlayersGoalkeeperStripe';
  const isPaletteGoalkeeperStripeTarget =
    stripePickerTarget === 'goalkeeperIcon1' || stripePickerTarget === 'goalkeeperIcon2';
  useEffect(() => {
    setSize(standardSize.toString());
  }, [standardSize]);

  // Sincronizar estados locales solo al abrir el panel (no cuando boardSettings cambia por cambio de color)
  useEffect(() => {
    if (visible && boardSettings) {
      const defaultVal = DEFAULT_PLAYER_ICON_SIZE;
      setDraftSettings(boardSettings);
      setDraftPlayersWithNumber(playersWithNumber);
      const syncedSize =
        boardSettings.playerIcon1?.size ||
        boardSettings.playerIcon2?.size ||
        boardSettings.playerIcon4?.size ||
        boardSettings.teamPlayers?.size ||
        defaultVal;
      setSize(syncedSize.toString());
    }
  }, [visible]);
  if (!visible) return null;
  const buildSettingsFromInputs = () => {
    const parsedSize = parseInt(size);
    const validSize = Math.max(MIN_SIZE, isNaN(parsedSize) ? DEFAULT_PLAYER_ICON_SIZE : parsedSize);
    setStandardSize(validSize);
    setSize(validSize.toString());
    const newSettings = normalizeBoardSettings({
      ...draftSettings,
      playerIcon1: {
        ...draftSettings.playerIcon1,
        size: validSize,
      },
      playerIcon2: {
        ...draftSettings.playerIcon2,
        size: validSize,
      },
      playerIcon3: {
        ...draftSettings.playerIcon3,
        size: validSize,
      },
      goalkeeperIcon1: {
        ...draftSettings.goalkeeperIcon1,
        size: validSize,
      },
      goalkeeperIcon2: {
        ...draftSettings.goalkeeperIcon2,
        size: validSize,
      },
      playerIcon4: {
        ...draftSettings.playerIcon4,
        size: validSize,
        hasBib: true,
      },
      teamPlayers: {
        ...draftSettings.teamPlayers,
        size: validSize,
      },
    });
    setDraftSettings(newSettings);
    return newSettings;
  };
  const handleApply = () => {
    const newSettings = buildSettingsFromInputs();
    setBoardSettings(newSettings);
    setPlayersWithNumber(draftPlayersWithNumber);
    if (onApplyBoardSettings) onApplyBoardSettings(newSettings);
    onClose();
  };
  const handleSave = async () => {
    const newSettings = buildSettingsFromInputs();
    setBoardSettings(newSettings);
    setPlayersWithNumber(draftPlayersWithNumber);
    if (onApplyBoardSettings) onApplyBoardSettings(newSettings);
    if (onSaveBoardSettings) {
      setSavingSettings(true);
      try {
        await onSaveBoardSettings(newSettings);
      } finally {
        setSavingSettings(false);
      }
    }
  };
  const updateBoardIcon = (key, patch) => {
    setDraftSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  };
  const getNumberColor = (key) => {
    if (key === 'playerIcon4')
      return draftSettings?.playerIcon4?.numberColor || NEUTRAL_PLAYER_COLORS.letter;
    return draftSettings?.[key]?.numberColor || '#ffffff';
  };
  const renderNumberColorControl = (key) => (
    <>
      <Text style={styles.proModalHint}>{t('tacticalBoard.teamSettings.numberColor')}</Text>
      <TouchableOpacity
        style={[
          styles.proModalColorBtn,
          {
            backgroundColor: getNumberColor(key),
            borderColor: getNumberColor(key) === '#ffffff' ? '#ccc' : '#e0e0e0',
          },
        ]}
        onPress={() => setNumberColorPickerTarget(key)}
      />
    </>
  );
  const renderIconShapeControls = (key, showExtras = true) => {
    const settings = draftSettings?.[key] || {};
    const isNeutralKey = key === 'playerIcon4';
    const resolvedHasBib = isNeutralKey
      ? true
      : settings.hasBib !== undefined
        ? settings.hasBib
        : false;
    return (
      <>
        <View
          style={[
            styles.proModalGrid,
            {
              marginTop: 8,
            },
          ]}
        >
          {[
            {
              value: 'circle',
              label: t('tacticalBoard.editPanel.circle'),
            },
            {
              value: 'jersey',
              label: t('tacticalBoard.editPanel.jersey'),
            },
          ].map((shapeOption) => (
            <TouchableOpacity
              key={shapeOption.value}
              style={[
                styles.proModalGridItem,
                (settings.shape || 'circle') === shapeOption.value &&
                  styles.proModalGridItemSelected,
              ]}
              onPress={() =>
                updateBoardIcon(key, {
                  shape: shapeOption.value,
                })
              }
            >
              <Text
                style={[
                  styles.proModalChipText,
                  (settings.shape || 'circle') === shapeOption.value &&
                    styles.proModalChipTextSelected,
                ]}
              >
                {shapeOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {showExtras && (
          <>
            {!isNeutralKey && (
              <View
                style={[
                  styles.proModalSwitch,
                  {
                    marginTop: 8,
                  },
                ]}
              >
                <Text style={styles.proModalSwitchLabel}>{t('tacticalBoard.editPanel.bib')}</Text>
                <Switch
                  value={resolvedHasBib}
                  onValueChange={(value) =>
                    updateBoardIcon(key, {
                      hasBib: value,
                    })
                  }
                  trackColor={{
                    false: '#ddd',
                    true: '#81b0ff',
                  }}
                  thumbColor={resolvedHasBib ? '#2176ff' : '#f4f3f4'}
                />
              </View>
            )}
            {resolvedHasBib && !isNeutralKey && (
              <View style={styles.proModalRow}>
                <TouchableOpacity
                  style={[
                    styles.proModalColorBtn,
                    {
                      backgroundColor:
                        settings.bibColor ||
                        (key === 'playerIcon4' ? settings.color : NEUTRAL_PLAYER_COLORS.bib),
                      borderColor:
                        (settings.bibColor || NEUTRAL_PLAYER_COLORS.bib) === '#ffffff'
                          ? '#ccc'
                          : '#e0e0e0',
                    },
                  ]}
                  onPress={() => setBibPickerTarget(key)}
                />
                <Text style={styles.proModalHint}>{t('tacticalBoard.editPanel.bibColor')}</Text>
              </View>
            )}
            <View
              style={[
                styles.proModalSwitch,
                {
                  marginTop: 8,
                },
              ]}
            >
              <Text style={styles.proModalSwitchLabel}>{t('tacticalBoard.editPanel.stripes')}</Text>
              <Switch
                value={settings.hasStripes === true}
                onValueChange={(value) =>
                  updateBoardIcon(key, {
                    hasStripes: value,
                  })
                }
                trackColor={{
                  false: '#ddd',
                  true: '#81b0ff',
                }}
                thumbColor={settings.hasStripes ? '#2176ff' : '#f4f3f4'}
              />
            </View>
            {settings.hasStripes === true && (
              <View style={styles.proModalRow}>
                <TouchableOpacity
                  style={[
                    styles.proModalColorBtn,
                    {
                      backgroundColor: settings.stripeColor || '#ffffff',
                      borderColor: settings.stripeColor === '#ffffff' ? '#ccc' : '#e0e0e0',
                    },
                  ]}
                  onPress={() => setStripePickerTarget(key)}
                />
                <Text style={styles.proModalHint}>{t('tacticalBoard.editPanel.stripeColor')}</Text>
              </View>
            )}
          </>
        )}
      </>
    );
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
                width: SCREEN_WIDTH * 0.75,
                maxWidth: 320,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.proModalHeader}>
              <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                {t('tacticalBoard.settings.title')}
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
              {/* Tamaño de íconos */}
              <View style={styles.proModalSection}>
                <Text style={styles.proModalSectionTitle}>
                  {t('tacticalBoard.settings.iconSizeLabel')}
                </Text>
                <TextInput
                  style={isMobile ? styles.proModalInputMobile : styles.proModalInput}
                  keyboardType="number-pad"
                  autoComplete="off"
                  value={size}
                  onChangeText={setSize}
                  placeholder={t('tacticalBoard.settings.minSizeHint', {
                    min: MIN_SIZE,
                  })}
                  placeholderTextColor="#999"
                />
                <Text style={styles.proModalHint}>
                  {t('tacticalBoard.settings.minSizeHint', {
                    min: MIN_SIZE,
                  })}
                </Text>
              </View>
              {/* Switch n�meros */}
              <View style={styles.proModalSwitch}>
                <Text style={styles.proModalSwitchLabel}>
                  {t('tacticalBoard.settings.showPlayerNumbers')}
                </Text>
                <Switch
                  value={draftPlayersWithNumber}
                  onValueChange={setDraftPlayersWithNumber}
                  trackColor={{
                    false: '#ddd',
                    true: '#81b0ff',
                  }}
                  thumbColor={draftPlayersWithNumber ? '#2176ff' : '#f4f3f4'}
                />
              </View>

              {/* Bot�n de Conectores */}
              <TouchableOpacity
                style={[
                  styles.proModalBtn,
                  styles.proModalBtnPrimary,
                  {
                    marginTop: 12,
                    marginBottom: 12,
                  },
                ]}
                onPress={() => {
                  onClose();
                  if (onOpenConnectors) onOpenConnectors();
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      marginRight: 8,
                    }}
                  >
                    🔗
                  </Text>
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
                    <View
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor: draftSettings?.playerIcon1?.color || '#2176ff',
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                        },
                      ]}
                    />
                    <Text style={styles.proModalCardTitle}>
                      {t('tacticalBoard.settings.unnamedPlayer1')}
                    </Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor: draftSettings?.playerIcon1?.color || '#2176ff',
                        },
                      ]}
                      onPress={() => setColorPicker1Visible(true)}
                    />
                    <Text style={styles.proModalHint}>
                      {t('tacticalBoard.editPanel.colorLabel')}
                    </Text>
                  </View>
                  <View style={styles.proModalRow}>{renderNumberColorControl('playerIcon1')}</View>
                  {renderIconShapeControls('playerIcon1')}
                </View>

                {/* Jugador 2 */}
                <View style={styles.proModalCard}>
                  <View style={styles.proModalCardHeader}>
                    <View
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor: draftSettings?.playerIcon2?.color || '#ff3838',
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                        },
                      ]}
                    />
                    <Text style={styles.proModalCardTitle}>
                      {t('tacticalBoard.settings.unnamedPlayer2')}
                    </Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor: draftSettings?.playerIcon2?.color || '#ff3838',
                        },
                      ]}
                      onPress={() => setColorPicker2Visible(true)}
                    />
                    <Text style={styles.proModalHint}>
                      {t('tacticalBoard.editPanel.colorLabel')}
                    </Text>
                  </View>
                  <View style={styles.proModalRow}>{renderNumberColorControl('playerIcon2')}</View>
                  {renderIconShapeControls('playerIcon2')}
                </View>

                <View style={styles.proModalCard}>
                  <View style={styles.proModalCardHeader}>
                    <View
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor:
                            draftSettings?.goalkeeperIcon1?.color ||
                            DEFAULT_GOALKEEPER_ICON_1_SETTINGS.color,
                          borderColor: '#d1d5db',
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                        },
                      ]}
                    />
                    <Text style={styles.proModalCardTitle}>
                      {t('tacticalBoard.settings.goalkeeper1')}
                    </Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <Text style={styles.proModalHint}>
                      {t('tacticalBoard.settings.goalkeeperStripeColor')}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor:
                            draftSettings?.goalkeeperIcon1?.goalkeeperStripeColor ||
                            draftSettings?.goalkeeperIcon1?.stripeColor ||
                            DEFAULT_GOALKEEPER_ICON_1_SETTINGS.goalkeeperStripeColor,
                        },
                      ]}
                      onPress={() => setStripePickerTarget('goalkeeperIcon1')}
                    />
                  </View>
                  <View style={styles.proModalRow}>
                    {renderNumberColorControl('goalkeeperIcon1')}
                  </View>
                  {renderIconShapeControls('goalkeeperIcon1', false)}
                </View>

                <View style={styles.proModalCard}>
                  <View style={styles.proModalCardHeader}>
                    <View
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor:
                            draftSettings?.goalkeeperIcon2?.color ||
                            DEFAULT_GOALKEEPER_ICON_2_SETTINGS.color,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                        },
                      ]}
                    />
                    <Text style={styles.proModalCardTitle}>
                      {t('tacticalBoard.settings.goalkeeper2')}
                    </Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <Text style={styles.proModalHint}>
                      {t('tacticalBoard.settings.goalkeeperStripeColor')}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor:
                            draftSettings?.goalkeeperIcon2?.goalkeeperStripeColor ||
                            draftSettings?.goalkeeperIcon2?.stripeColor ||
                            DEFAULT_GOALKEEPER_ICON_2_SETTINGS.goalkeeperStripeColor,
                        },
                      ]}
                      onPress={() => setStripePickerTarget('goalkeeperIcon2')}
                    />
                  </View>
                  <View style={styles.proModalRow}>
                    {renderNumberColorControl('goalkeeperIcon2')}
                  </View>
                  {renderIconShapeControls('goalkeeperIcon2', false)}
                </View>

                {/* Jugador 3 eliminado de la configuración
                 <View style={styles.proModalCard}>
                  <View style={styles.proModalCardHeader}>
                    <View
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor: draftSettings?.playerIcon3?.color || '#ffa600',
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                        },
                      ]}
                    />
                    <Text style={styles.proModalCardTitle}>
                      {t('tacticalBoard.settings.unnamedPlayer3')}
                    </Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        { backgroundColor: draftSettings?.playerIcon3?.color || '#ffa600' },
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
                  {renderIconShapeControls('playerIcon3')}
                 </View>
                 */}

                {/* Comodin */}
                <View style={styles.proModalCard}>
                  <View style={styles.proModalCardHeader}>
                    <View
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor:
                            draftSettings?.playerIcon4?.backgroundColor ||
                            NEUTRAL_PLAYER_COLORS.background,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 18,
                          borderRadius: 4,
                          backgroundColor:
                            draftSettings?.playerIcon4?.color || NEUTRAL_PLAYER_COLORS.bib,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color:
                              draftSettings?.playerIcon4?.numberColor ||
                              NEUTRAL_PLAYER_COLORS.letter,
                            fontWeight: '800',
                            fontSize: 12,
                          }}
                        >
                          N
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.proModalCardTitle}>
                      {t('tacticalBoard.settings.neutralPlayer')}
                    </Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor:
                            draftSettings?.playerIcon4?.color || NEUTRAL_PLAYER_COLORS.bib,
                        },
                      ]}
                      onPress={() => setColorPickerNeutralVisible(true)}
                    />
                    <Text style={styles.proModalHint}>{t('tacticalBoard.editPanel.bib')}</Text>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor:
                            draftSettings?.playerIcon4?.backgroundColor ||
                            NEUTRAL_PLAYER_COLORS.background,
                        },
                      ]}
                      onPress={() => setNeutralBgPickerVisible(true)}
                    />
                    <Text style={styles.proModalHint}>
                      {t('tacticalBoard.settings.background')}
                    </Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor:
                            draftSettings?.playerIcon4?.numberColor || NEUTRAL_PLAYER_COLORS.letter,
                        },
                      ]}
                      onPress={() => setNeutralLetterPickerVisible(true)}
                    />
                    <Text style={styles.proModalHint}>{t('tacticalBoard.settings.letter')}</Text>
                  </View>
                  {renderIconShapeControls('playerIcon4')}
                </View>

                {/* Jugadores del equipo */}
                <View style={styles.proModalCard}>
                  <View style={styles.proModalCardHeader}>
                    <View
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor: draftSettings?.teamPlayers?.color || '#2176ff',
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                        },
                      ]}
                    />
                    <Text style={styles.proModalCardTitle}>
                      {t('tacticalBoard.settings.teamPlayers')}
                    </Text>
                  </View>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor: draftSettings?.teamPlayers?.color || '#2176ff',
                        },
                      ]}
                      onPress={() => setColorPickerTeamVisible(true)}
                    />
                    <Text style={styles.proModalHint}>
                      {t('tacticalBoard.editPanel.colorLabel')}
                    </Text>
                  </View>
                  <View style={styles.proModalRow}>{renderNumberColorControl('teamPlayers')}</View>
                  <View
                    style={[
                      styles.proModalSwitch,
                      {
                        marginTop: 8,
                      },
                    ]}
                  >
                    <Text style={styles.proModalSwitchLabel}>
                      {t('tacticalBoard.teamSettings.differentiateGoalkeeper')}
                    </Text>
                    <Switch
                      value={draftSettings?.teamPlayers?.differentiateGoalkeeper !== false}
                      onValueChange={(value) =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          teamPlayers: {
                            ...prev.teamPlayers,
                            differentiateGoalkeeper: value,
                          },
                        }))
                      }
                      trackColor={{
                        false: '#ddd',
                        true: '#81b0ff',
                      }}
                      thumbColor={
                        draftSettings?.teamPlayers?.differentiateGoalkeeper !== false
                          ? '#2176ff'
                          : '#f4f3f4'
                      }
                    />
                  </View>
                  <View style={styles.proModalRow}>
                    <Text style={styles.proModalHint}>
                      {t('tacticalBoard.settings.goalkeepers')}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor: draftSettings?.teamPlayers?.goalkeeperColor || '#ff4a4a',
                          borderColor:
                            (draftSettings?.teamPlayers?.goalkeeperColor || '#ff4a4a') === '#ffffff'
                              ? '#ccc'
                              : '#e0e0e0',
                        },
                      ]}
                      onPress={() => setColorPickerGoalkeeperVisible(true)}
                    />
                    <Text style={styles.proModalHint}>
                      {t('tacticalBoard.settings.goalkeeperStripeColor')}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor:
                            draftSettings?.teamPlayers?.goalkeeperStripeColor || '#ffffff',
                          borderColor:
                            (draftSettings?.teamPlayers?.goalkeeperStripeColor || '#ffffff') ===
                            '#ffffff'
                              ? '#ccc'
                              : '#e0e0e0',
                        },
                      ]}
                      onPress={() => setStripePickerTarget('teamPlayersGoalkeeperStripe')}
                    />
                  </View>
                  {renderIconShapeControls('teamPlayers')}
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
                  savingSettings && {
                    opacity: 0.6,
                  },
                ]}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                  {savingSettings
                    ? t('tacticalBoard.settings.saving')
                    : t('tacticalBoard.settings.save')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Color Pickers */}
            <MiniColorPickerModal
              visible={colorPicker1Visible}
              initialColor={draftSettings?.playerIcon1?.color || '#2176ff'}
              onClose={() => setColorPicker1Visible(false)}
              onSelect={(c) =>
                setDraftSettings((prev) => ({
                  ...prev,
                  playerIcon1: {
                    ...prev.playerIcon1,
                    color: c,
                  },
                }))
              }
            />
            <MiniColorPickerModal
              visible={colorPicker2Visible}
              initialColor={draftSettings?.playerIcon2?.color || '#ff3838'}
              onClose={() => setColorPicker2Visible(false)}
              onSelect={(c) =>
                setDraftSettings((prev) => ({
                  ...prev,
                  playerIcon2: {
                    ...prev.playerIcon2,
                    color: c,
                  },
                }))
              }
            />
            <MiniColorPickerModal
              visible={colorPickerNeutralVisible}
              initialColor={draftSettings?.playerIcon4?.color || NEUTRAL_PLAYER_COLORS.bib}
              onClose={() => setColorPickerNeutralVisible(false)}
              onSelect={(c) =>
                setDraftSettings((prev) => ({
                  ...prev,
                  playerIcon4: {
                    ...getDefaultNeutralPlayerSettings(),
                    ...prev.playerIcon4,
                    color: c,
                  },
                }))
              }
            />
            <MiniColorPickerModal
              visible={neutralBgPickerVisible}
              initialColor={
                draftSettings?.playerIcon4?.backgroundColor || NEUTRAL_PLAYER_COLORS.background
              }
              onClose={() => setNeutralBgPickerVisible(false)}
              onSelect={(c) =>
                setDraftSettings((prev) => ({
                  ...prev,
                  playerIcon4: {
                    ...getDefaultNeutralPlayerSettings(),
                    ...prev.playerIcon4,
                    backgroundColor: c,
                  },
                }))
              }
            />
            <MiniColorPickerModal
              visible={neutralLetterPickerVisible}
              initialColor={draftSettings?.playerIcon4?.numberColor || NEUTRAL_PLAYER_COLORS.letter}
              onClose={() => setNeutralLetterPickerVisible(false)}
              onSelect={(c) =>
                setDraftSettings((prev) => ({
                  ...prev,
                  playerIcon4: {
                    ...getDefaultNeutralPlayerSettings(),
                    ...prev.playerIcon4,
                    numberColor: c,
                  },
                }))
              }
            />
            <MiniColorPickerModal
              visible={colorPickerTeamVisible}
              initialColor={draftSettings?.teamPlayers?.color || '#2176ff'}
              onClose={() => setColorPickerTeamVisible(false)}
              onSelect={(c) =>
                setDraftSettings((prev) => ({
                  ...prev,
                  teamPlayers: {
                    ...prev.teamPlayers,
                    color: c,
                  },
                }))
              }
            />
            <MiniColorPickerModal
              visible={colorPickerGoalkeeperVisible}
              initialColor={draftSettings?.teamPlayers?.goalkeeperColor || '#ff4a4a'}
              onClose={() => setColorPickerGoalkeeperVisible(false)}
              onSelect={(c) =>
                setDraftSettings((prev) => ({
                  ...prev,
                  teamPlayers: {
                    ...prev.teamPlayers,
                    goalkeeperColor: c,
                  },
                }))
              }
            />
            <MiniColorPickerModal
              visible={!!stripePickerTarget}
              initialColor={
                isGoalkeeperStripeTarget
                  ? draftSettings?.teamPlayers?.goalkeeperStripeColor || '#ffffff'
                  : isPaletteGoalkeeperStripeTarget
                    ? draftSettings?.[stripePickerTarget]?.goalkeeperStripeColor ||
                      draftSettings?.[stripePickerTarget]?.stripeColor ||
                      '#ffffff'
                    : draftSettings?.[stripePickerTarget]?.stripeColor || '#ffffff'
              }
              onClose={() => setStripePickerTarget(null)}
              onSelect={(c) => {
                if (isGoalkeeperStripeTarget) {
                  setDraftSettings((prev) => ({
                    ...prev,
                    teamPlayers: {
                      ...prev.teamPlayers,
                      goalkeeperStripeColor: c,
                    },
                  }));
                  return;
                }
                if (isPaletteGoalkeeperStripeTarget) {
                  updateBoardIcon(stripePickerTarget, {
                    stripeColor: c,
                    goalkeeperStripeColor: c,
                    hasStripes: true,
                    isGoalkeeper: true,
                  });
                  return;
                }
                if (stripePickerTarget)
                  updateBoardIcon(stripePickerTarget, {
                    stripeColor: c,
                  });
              }}
            />
            <MiniColorPickerModal
              visible={!!numberColorPickerTarget}
              initialColor={
                numberColorPickerTarget ? getNumberColor(numberColorPickerTarget) : '#ffffff'
              }
              onClose={() => setNumberColorPickerTarget(null)}
              onSelect={(c) =>
                numberColorPickerTarget &&
                updateBoardIcon(numberColorPickerTarget, {
                  numberColor: c,
                })
              }
            />
            <MiniColorPickerModal
              visible={!!bibPickerTarget}
              initialColor={
                draftSettings?.[bibPickerTarget]?.bibColor ||
                (bibPickerTarget === 'playerIcon4'
                  ? draftSettings?.[bibPickerTarget]?.color
                  : NEUTRAL_PLAYER_COLORS.bib)
              }
              onClose={() => setBibPickerTarget(null)}
              onSelect={(c) =>
                bibPickerTarget &&
                updateBoardIcon(bibPickerTarget, {
                  bibColor: c,
                })
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
