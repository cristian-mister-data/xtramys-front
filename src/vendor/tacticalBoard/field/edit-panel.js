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
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useScreenDimensions } from './controls';
import { NEUTRAL_PLAYER_COLORS, isNeutralPlayerIcon, isValidHexColor } from './config';
import { styles } from './styles';
import { TouchableOpacity } from './primitives';
export function LeftEditPanel({
  visible,
  icon,
  onClose,
  onApply,
  standardSize,
  playersWithNumber,
  onPaletteUpdate,
  paletteIcons = [],
  teamPlayerStyle,
  setTeamPlayerStyle,
  hideApplyToPalette = false,
  onMaterialsConfigUpdate,
}) {
  const dimensions = useScreenDimensions();
  const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
  const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  const isArrowType = icon?.type === 'straight-arrow' || icon?.type === 'straight-line';
  const isCurveType = icon?.type === 'curve-arrow' || icon?.type === 'curve-line';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Determinar si el elemento puede tener color
  const canHaveColor =
    icon?.type === 'player' ||
    icon?.type === 'cone' ||
    icon?.type === 'cone-pro' ||
    icon?.type === 'cone-flat' ||
    icon?.type === 'ring' ||
    icon?.type === 'dummy' ||
    icon?.type === 'barrier' ||
    icon?.type === 'pole' ||
    icon?.type === 'ladder' ||
    isArrowType ||
    isCurveType ||
    icon?.type === 'circle' ||
    icon?.type === 'rectangle' ||
    icon?.type === 'custom-shape' ||
    icon?.type === 'custom-shape-button' ||
    icon?.type === 'goal';
  const [size, setSize] = useState(
    isNaN(Number(icon?.size)) ? standardSize?.toString() || '24' : icon.size?.toString(),
  );
  const [color, setColor] = useState(isValidHexColor(icon?.color) ? icon.color : '#000000');
  const [number, setNumber] = useState(
    icon?.type === 'player' ? icon.number?.toString() || '' : '',
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [applyToPalette, setApplyToPalette] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const [thickness, setThickness] = useState(
    icon?.thickness !== undefined ? icon.thickness.toString() : '2',
  );
  const [textColor, setTextColor] = useState(icon?.textColor || '#000000');
  const [textBackgroundColor, setTextBackgroundColor] = useState(
    icon?.textBackgroundColor || '#ffffff',
  );
  const [textPickerVisible, setTextPickerVisible] = useState(false);
  const [textBackgroundPickerVisible, setTextBackgroundPickerVisible] = useState(false);
  // Nuevos estados para tipo de l�nea y relleno
  const [localLineType, setLocalLineType] = useState(icon?.lineType || 'solid');
  const [fillColor, setFillColor] = useState(icon?.fillColor || 'transparent');
  const [fillPickerVisible, setFillPickerVisible] = useState(false);
  // Estado para el color del n�mero
  const [numberColor, setNumberColor] = useState(icon?.numberColor || '#ffffff');
  const [numberColorPickerVisible, setNumberColorPickerVisible] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState(
    icon?.backgroundColor || NEUTRAL_PLAYER_COLORS.background,
  );
  const [backgroundColorPickerVisible, setBackgroundColorPickerVisible] = useState(false);
  // Estados para el tama�o y espaciado de los puntos
  const [localDotSize, setLocalDotSize] = useState(icon?.dotSize ?? 2);
  const [localDotSpacing, setLocalDotSpacing] = useState(icon?.dotSpacing ?? 4);

  // Detectar si el jugador es portero (definido antes para usar en valores por defecto)
  const isGoalkeeper =
    icon?.type === 'player' &&
    (icon?.isGoalkeeper ||
      icon?.playerData?.posicion === 'portero' ||
      icon?.playerData?.position === 'goalkeeper' ||
      icon?.playerData?.demarcacion === 'POR');

  // Estados para portero
  const [goalkeeperStripeColor, setGoalkeeperStripeColor] = useState(
    icon?.goalkeeperStripeColor || teamPlayerStyle?.goalkeeperStripeColor || '#ffffff',
  );
  const [goalkeeperStripePickerVisible, setGoalkeeperStripePickerVisible] = useState(false);
  const [playerShape, setPlayerShape] = useState(icon?.shape || 'circle');
  const [hasStripes, setHasStripes] = useState(icon?.hasStripes === true);
  const [hasBib, setHasBib] = useState(
    icon?.hasBib !== undefined ? icon.hasBib : isNeutralPlayerIcon(icon),
  );
  const [bibColor, setBibColor] = useState(
    icon?.bibColor || (isNeutralPlayerIcon(icon) ? icon.color : NEUTRAL_PLAYER_COLORS.bib),
  );
  const [playerBibPickerVisible, setPlayerBibPickerVisible] = useState(false);
  const [stripeColor, setStripeColor] = useState(icon?.stripeColor || '#ffffff');
  const [playerStripePickerVisible, setPlayerStripePickerVisible] = useState(false);
  const [localDiameter, setLocalDiameter] = useState('');
  const [localWidth, setLocalWidth] = useState('');
  const [localHeight, setLocalHeight] = useState('');

  // Tipos que pueden tener lineType (tipo de trazado)
  const canHaveLineType =
    isArrowType ||
    isCurveType ||
    icon?.type === 'circle' ||
    icon?.type === 'rectangle' ||
    icon?.type === 'custom-shape' ||
    icon?.type === 'custom-shape-button';

  // Tipos que pueden tener relleno
  const canHaveFill =
    icon?.type === 'circle' ||
    icon?.type === 'rectangle' ||
    icon?.type === 'custom-shape' ||
    icon?.type === 'custom-shape-button';
  useEffect(() => {
    setSize(isNaN(Number(icon?.size)) ? standardSize?.toString() || '24' : icon?.size?.toString());
    setColor(isValidHexColor(icon?.color) ? icon.color : '#000000');
    setNumber(icon?.type === 'player' ? icon.number?.toString() || '' : '');
    setApplyToPalette(false);
    setApplyToAll(false);
    setThickness(icon?.thickness !== undefined ? icon.thickness.toString() : '2');
    setTextColor(icon?.textColor || '#000000');
    setTextBackgroundColor(icon?.textBackgroundColor || '#ffffff');
    setLocalLineType(icon?.lineType || 'solid');
    setFillColor(icon?.fillColor || 'transparent');
    setNumberColor(icon?.numberColor || '#ffffff');
    setBackgroundColor(icon?.backgroundColor || NEUTRAL_PLAYER_COLORS.background);
    setLocalDotSize(icon?.dotSize ?? 2);
    setLocalDotSpacing(icon?.dotSpacing ?? 4);
    setGoalkeeperStripeColor(
      icon?.goalkeeperStripeColor || teamPlayerStyle?.goalkeeperStripeColor || '#ffffff',
    );
    setPlayerShape(icon?.shape || 'circle');
    setHasStripes(icon?.hasStripes === true);
    setHasBib(icon?.hasBib !== undefined ? icon.hasBib : isNeutralPlayerIcon(icon));
    setBibColor(
      icon?.bibColor || (isNeutralPlayerIcon(icon) ? icon.color : NEUTRAL_PLAYER_COLORS.bib),
    );
    setStripeColor(icon?.stripeColor || '#ffffff');
    if (
      icon &&
      (icon.type === 'circle' || icon.type === 'rectangle') &&
      icon.points &&
      icon.points.length === 2
    ) {
      const w_ratio = Math.abs(icon.points[1].x - icon.points[0].x);
      const h_ratio = Math.abs(icon.points[1].y - icon.points[0].y);
      setLocalWidth((w_ratio * 105).toFixed(1));
      setLocalHeight((h_ratio * 68).toFixed(1));
    } else {
      setLocalWidth('');
      setLocalHeight('');
    }
  }, [icon, standardSize, teamPlayerStyle]);
  if (!visible || !icon) return null;
  const isPaletteIcon = typeof icon.paletteIndex === 'number';
  const isPalettePlayer = icon.isPalettePlayer === true; // Jugador de la paleta de jugadores con nombre
  const isNeutralPlayer = isNeutralPlayerIcon(icon);

  // Tipos de materiales que se pueden aplicar a la paleta
  const materialTypes = [
    'ball',
    'cone-pro',
    'cone-flat',
    'ring',
    'goal-large',
    'goal-small',
    'barrier',
    'dummy',
    'pole',
    'ladder',
    'weights',
  ];
  const isMaterialType = materialTypes.includes(icon.type);

  // Tipos que pueden aplicarse a la paleta
  // Para jugadores del equipo solo si es de la paleta (isPalettePlayer)
  // Para otros elementos, si ya tienen paletteIndex o son del tipo correcto
  const canApplyToPalette =
    isPalettePlayer ||
    isPaletteIcon ||
    isMaterialType ||
    ((icon.type === 'straight-arrow' ||
      icon.type === 'straight-line' ||
      icon.type === 'curve-arrow' ||
      icon.type === 'curve-line' ||
      icon.type === 'circle' ||
      icon.type === 'rectangle' ||
      icon.type === 'custom-shape') &&
      (!icon.playerData || isPalettePlayer)); // No mostrar para jugadores ya pintados en el campo, excepto si son de la paleta

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
                width: Math.min(240, SCREEN_WIDTH * 0.5),
              },
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.proModalHeader,
                {
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                },
              ]}
            >
              <Text
                style={[
                  isMobile ? styles.proModalTitleMobile : styles.proModalTitle,
                  {
                    fontSize: isMobile ? 12 : 14,
                  },
                ]}
              >
                {t('tacticalBoard.editPanel.editTitle')}{' '}
                {icon.type === 'straight-arrow'
                  ? t('tacticalBoard.elements.straightArrow')
                  : icon.type === 'straight-line'
                    ? t('tacticalBoard.elements.straightLine')
                    : icon.type === 'curve-arrow'
                      ? t('tacticalBoard.elements.curveArrow')
                      : icon.type === 'curve-line'
                        ? t('tacticalBoard.elements.curveLine')
                        : icon.type === 'circle'
                          ? t('tacticalBoard.elements.circle')
                          : icon.type === 'rectangle'
                            ? t('tacticalBoard.elements.rectangle')
                            : icon.type === 'custom-shape'
                              ? t('tacticalBoard.elements.customShape')
                              : icon.type === 'goal'
                                ? t('tacticalBoard.elements.barrier')
                                : icon.type === 'goal-large'
                                  ? t('tacticalBoard.elements.goalLarge')
                                  : icon.type === 'goal-small'
                                    ? t('tacticalBoard.elements.goalSmall')
                                    : icon.type === 'barrier'
                                      ? t('tacticalBoard.elements.barrier')
                                      : icon.type === 'dummy'
                                        ? t('tacticalBoard.elements.dummy')
                                        : icon.type === 'pole'
                                          ? t('tacticalBoard.elements.pole')
                                          : icon.type === 'cone-pro'
                                            ? t('tacticalBoard.elements.cone')
                                            : icon.type === 'cone-flat'
                                              ? t('tacticalBoard.elements.coneFlat')
                                              : icon.type === 'ring'
                                                ? t('tacticalBoard.elements.ring')
                                                : icon.type === 'ladder'
                                                  ? t('tacticalBoard.elements.ladder')
                                                  : icon.type === 'weights'
                                                    ? t('tacticalBoard.elements.weights')
                                                    : icon.type === 'ball'
                                                      ? t('tacticalBoard.elements.ball')
                                                      : icon.type}
              </Text>
              <TouchableOpacity
                style={[
                  styles.proModalCloseBtn,
                  {
                    width: 28,
                    height: 28,
                  },
                ]}
                onPress={onClose}
              >
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

            {(hideApplyToPalette || icon?.isMaterialPalette) && (
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingBottom: 8,
                }}
              >
                <Text
                  style={[
                    styles.proModalHint,
                    {
                      color: '#2176ff',
                      fontStyle: 'normal',
                      fontWeight: '500',
                    },
                  ]}
                >
                  {t('tacticalBoard.editPanel.editingPalette')}
                </Text>
              </View>
            )}

            <KeyboardAwareScrollView
              style={{
                flex: 1,
              }}
              contentContainerStyle={{
                paddingBottom: 20,
                paddingHorizontal: 14,
              }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {/* Color para todos los tipos que lo soporten */}
              {canHaveColor && (
                <>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.editPanel.colorLabel')}
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
                  <MiniColorPickerModal
                    visible={pickerVisible}
                    initialColor={color}
                    onClose={() => setPickerVisible(false)}
                    onSelect={(c) => setColor(c)}
                  />
                </>
              )}

              {/* N�mero para jugadores */}
              {isNeutralPlayer && (
                <>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.settings.background')}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor,
                        },
                      ]}
                      onPress={() => setBackgroundColorPickerVisible(true)}
                    />
                  </View>
                  <MiniColorPickerModal
                    visible={backgroundColorPickerVisible}
                    initialColor={backgroundColor}
                    onClose={() => setBackgroundColorPickerVisible(false)}
                    onSelect={setBackgroundColor}
                  />
                </>
              )}

              {icon.type === 'player' && playersWithNumber && (
                <>
                  <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                    {t('tacticalBoard.editPanel.numberLabel')}
                  </Text>
                  <TextInput
                    style={isMobile ? styles.proModalInputMobile : styles.proModalInput}
                    keyboardType={isNeutralPlayer ? 'default' : 'number-pad'}
                    autoComplete="off"
                    editable={!isNeutralPlayer}
                    value={isNeutralPlayer ? 'N' : number}
                    onChangeText={isNeutralPlayer ? undefined : setNumber}
                    placeholder="N�mero"
                    placeholderTextColor="#888"
                  />

                  {/* Color del n�mero */}
                  <View
                    style={[
                      styles.proModalRow,
                      {
                        marginTop: 10,
                      },
                    ]}
                  >
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.editPanel.textColorLabel')}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor: numberColor,
                          borderColor: '#000000',
                        },
                      ]}
                      onPress={() => setNumberColorPickerVisible(true)}
                    />
                  </View>
                  <MiniColorPickerModal
                    visible={numberColorPickerVisible}
                    initialColor={numberColor}
                    onClose={() => setNumberColorPickerVisible(false)}
                    onSelect={setNumberColor}
                  />
                </>
              )}

              {/* Color del texto para jugadores con nombre o de paleta */}
              {icon.type === 'player' && (icon.playerData || isPalettePlayer) && (
                <>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.editPanel.textColorLabel')}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor: textColor,
                        },
                      ]}
                      onPress={() => setTextPickerVisible(true)}
                    />
                  </View>
                  <MiniColorPickerModal
                    visible={textPickerVisible}
                    initialColor={textColor}
                    onClose={() => setTextPickerVisible(false)}
                    onSelect={setTextColor}
                  />
                </>
              )}

              {/* Color de fondo del texto para jugadores con nombre o de paleta */}
              {icon.type === 'player' && (icon.playerData || isPalettePlayer) && (
                <>
                  <Text
                    style={[
                      isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                      {
                        marginTop: 10,
                      },
                    ]}
                  >
                    {t('tacticalBoard.editPanel.textBackgroundLabel')}
                  </Text>
                  <View
                    style={[
                      styles.proModalRow,
                      {
                        marginTop: 6,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor:
                            textBackgroundColor === 'transparent' ? '#fff' : textBackgroundColor,
                          opacity: textBackgroundColor === 'transparent' ? 0.4 : 1,
                        },
                      ]}
                      onPress={() => setTextBackgroundPickerVisible(true)}
                    />
                    <TouchableOpacity
                      onPress={() => setTextBackgroundColor('transparent')}
                      style={[
                        styles.proModalChip,
                        textBackgroundColor === 'transparent' && styles.proModalChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.proModalChipText,
                          textBackgroundColor === 'transparent' && styles.proModalChipTextSelected,
                        ]}
                      >
                        {t('tacticalBoard.editPanel.noBackground')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <MiniColorPickerModal
                    visible={textBackgroundPickerVisible}
                    initialColor={
                      textBackgroundColor === 'transparent' ? '#ffffff' : textBackgroundColor
                    }
                    onClose={() => setTextBackgroundPickerVisible(false)}
                    onSelect={setTextBackgroundColor}
                  />
                </>
              )}

              {/* Opciones de portero - solo si es portero y est� activa la diferenciaci�n */}
              {icon.type === 'player' && (
                <>
                  <Text
                    style={[
                      isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                      {
                        marginTop: 12,
                      },
                    ]}
                  >
                    {t('tacticalBoard.editPanel.shapeLabel')}
                  </Text>
                  <View
                    style={[
                      styles.proModalGrid,
                      {
                        marginTop: 6,
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
                          playerShape === shapeOption.value && styles.proModalGridItemSelected,
                        ]}
                        onPress={() => setPlayerShape(shapeOption.value)}
                      >
                        <Text
                          style={[
                            styles.proModalChipText,
                            playerShape === shapeOption.value && styles.proModalChipTextSelected,
                          ]}
                        >
                          {shapeOption.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View
                    style={[
                      styles.proModalSwitch,
                      {
                        marginTop: 10,
                      },
                    ]}
                  >
                    <Text style={styles.proModalSwitchLabel}>
                      {t('tacticalBoard.editPanel.bib')}
                    </Text>
                    <Switch
                      value={hasBib}
                      onValueChange={setHasBib}
                      trackColor={{
                        false: '#ddd',
                        true: '#81b0ff',
                      }}
                      thumbColor={hasBib ? '#2176ff' : '#f4f3f4'}
                    />
                  </View>

                  {hasBib && (
                    <>
                      <View
                        style={[
                          styles.proModalRow,
                          {
                            marginTop: 8,
                          },
                        ]}
                      >
                        <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                          {t('tacticalBoard.editPanel.bibColor')}
                        </Text>
                        <TouchableOpacity
                          style={[
                            isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                            {
                              backgroundColor: bibColor,
                              borderColor: bibColor === '#ffffff' ? '#ccc' : '#e0e0e0',
                            },
                          ]}
                          onPress={() => setPlayerBibPickerVisible(true)}
                        />
                      </View>
                      <MiniColorPickerModal
                        visible={playerBibPickerVisible}
                        initialColor={bibColor}
                        onClose={() => setPlayerBibPickerVisible(false)}
                        onSelect={setBibColor}
                      />
                    </>
                  )}

                  {!isGoalkeeper && (
                    <>
                      <View
                        style={[
                          styles.proModalSwitch,
                          {
                            marginTop: 10,
                          },
                        ]}
                      >
                        <Text style={styles.proModalSwitchLabel}>
                          {t('tacticalBoard.editPanel.jerseyStripes')}
                        </Text>
                        <Switch
                          value={hasStripes}
                          onValueChange={setHasStripes}
                          trackColor={{
                            false: '#ddd',
                            true: '#81b0ff',
                          }}
                          thumbColor={hasStripes ? '#2176ff' : '#f4f3f4'}
                        />
                      </View>

                      {hasStripes && (
                        <>
                          <View
                            style={[
                              styles.proModalRow,
                              {
                                marginTop: 8,
                              },
                            ]}
                          >
                            <Text
                              style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}
                            >
                              {t('tacticalBoard.editPanel.stripeColor')}
                            </Text>
                            <TouchableOpacity
                              style={[
                                isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                                {
                                  backgroundColor: stripeColor,
                                  borderColor: stripeColor === '#ffffff' ? '#ccc' : '#e0e0e0',
                                },
                              ]}
                              onPress={() => setPlayerStripePickerVisible(true)}
                            />
                          </View>
                          <MiniColorPickerModal
                            visible={playerStripePickerVisible}
                            initialColor={stripeColor}
                            onClose={() => setPlayerStripePickerVisible(false)}
                            onSelect={setStripeColor}
                          />
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              {isGoalkeeper && teamPlayerStyle?.differentiateGoalkeeper && (
                <>
                  <View
                    style={[
                      styles.proModalRow,
                      {
                        marginTop: 12,
                        alignItems: 'center',
                        backgroundColor: '#f0f7ff',
                        padding: 8,
                        borderRadius: 8,
                      },
                    ]}
                  >
                    <Feather name="user" size={16} color="#2176ff" />
                    <Text
                      style={[
                        isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                        {
                          marginLeft: 6,
                          color: '#2176ff',
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {t('tacticalBoard.editPanel.goalkeeperLabel')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.proModalRow,
                      {
                        marginTop: 8,
                      },
                    ]}
                  >
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.editPanel.stripeColor')}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor: goalkeeperStripeColor,
                          borderColor: goalkeeperStripeColor === '#ffffff' ? '#ccc' : '#e0e0e0',
                        },
                      ]}
                      onPress={() => setGoalkeeperStripePickerVisible(true)}
                    />
                  </View>
                  <MiniColorPickerModal
                    visible={goalkeeperStripePickerVisible}
                    initialColor={goalkeeperStripeColor}
                    onClose={() => setGoalkeeperStripePickerVisible(false)}
                    onSelect={setGoalkeeperStripeColor}
                  />
                </>
              )}

              {/* Tama�o - NO mostrar para l�neas, flechas, figuras ni custom-shape */}
              {![
                'custom-shape',
                'custom-shape-button',
                'straight-arrow',
                'straight-line',
                'curve-line',
                'curve-arrow',
                'circle',
                'rectangle',
              ].includes(icon.type) && (
                <>
                  <Text
                    style={[
                      isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                      {
                        marginTop: 10,
                      },
                    ]}
                  >
                    {t('tacticalBoard.editPanel.sizeLabel')}
                  </Text>
                  <View style={styles.proModalStepperRow}>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        const current = parseInt(size) || (isMobile ? 24 : 18);
                        if (current > 1) setSize(String(current - 1));
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
                        const current = parseInt(size) || (isMobile ? 24 : 18);
                        if (current < 200) setSize(String(current + 1));
                      }}
                    >
                      <Feather name="plus" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Grosor para l�neas, flechas, c�rculos y custom-shape */}
              {(isArrowType ||
                isCurveType ||
                icon.type === 'circle' ||
                icon.type === 'rectangle' ||
                icon.type === 'custom-shape' ||
                icon.type === 'custom-shape-button') && (
                <>
                  <Text
                    style={[
                      isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                      {
                        marginTop: 10,
                      },
                    ]}
                  >
                    {t('tacticalBoard.editPanel.strokeLabel')}
                  </Text>
                  <View style={styles.proModalStepperRow}>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        const current = parseInt(thickness) || 2;
                        if (current > 1) setThickness(String(current - 1));
                      }}
                    >
                      <Feather name="minus" size={18} color="#666" />
                    </TouchableOpacity>
                    <View style={styles.proModalStepperValue}>
                      <Text style={styles.proModalStepperValueText}>{thickness}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        const current = parseInt(thickness) || 2;
                        if (current < 50) setThickness(String(current + 1));
                      }}
                    >
                      <Feather name="plus" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Tipo de trazado (s�lido/punteado) para l�neas, flechas y figuras */}
              {canHaveLineType && (
                <>
                  <Text
                    style={[
                      isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                      {
                        marginTop: 12,
                      },
                    ]}
                  >
                    {t('tacticalBoard.editPanel.strokeTypeLabel')}
                  </Text>
                  <View
                    style={[
                      styles.proModalGrid,
                      {
                        marginTop: 8,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.proModalGridItem,
                        localLineType === 'solid' && styles.proModalGridItemSelected,
                      ]}
                      onPress={() => setLocalLineType('solid')}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 2,
                          backgroundColor: '#000000',
                        }}
                      />
                      <Text
                        style={[
                          styles.proModalChipText,
                          {
                            marginTop: 4,
                            color: '#000000',
                          },
                          localLineType === 'solid' && styles.proModalChipTextSelected,
                          {
                            color: '#000000',
                          },
                        ]}
                      >
                        {t('tacticalBoard.editPanel.solid')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.proModalGridItem,
                        localLineType === 'dotted' && styles.proModalGridItemSelected,
                      ]}
                      onPress={() => setLocalLineType('dotted')}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 2,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                        }}
                      >
                        {[...Array(5)].map((_, i) => (
                          <View
                            key={i}
                            style={{
                              width: 4,
                              height: 2,
                              backgroundColor: '#000000',
                            }}
                          />
                        ))}
                      </View>
                      <Text
                        style={[
                          styles.proModalChipText,
                          {
                            marginTop: 4,
                            color: '#000000',
                          },
                          localLineType === 'dotted' && styles.proModalChipTextSelected,
                          {
                            color: '#000000',
                          },
                        ]}
                      >
                        {t('tacticalBoard.editPanel.dashed')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Opciones de espaciado cuando es punteado */}
                  {localLineType === 'dotted' && (
                    <>
                      <Text
                        style={[
                          isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                          {
                            marginTop: 12,
                            color: '#000000',
                          },
                        ]}
                      >
                        {t('tacticalBoard.editPanel.dotSize')}:
                      </Text>
                      <View
                        style={[
                          styles.proModalGrid,
                          {
                            marginTop: 6,
                          },
                        ]}
                      >
                        {[1, 2, 3, 4].map((size) => (
                          <TouchableOpacity
                            key={`dot-size-${size}`}
                            style={[
                              styles.proModalGridItem,
                              {
                                minWidth: 40,
                              },
                              localDotSize === size && styles.proModalGridItemSelected,
                            ]}
                            onPress={() => setLocalDotSize(size)}
                          >
                            <Svg width="30" height="8">
                              <Path
                                d="M2,4 L28,4"
                                stroke="#000000"
                                strokeWidth="2"
                                strokeDasharray={`${size},${localDotSpacing}`}
                                fill="none"
                                strokeLinecap="round"
                              />
                            </Svg>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text
                        style={[
                          isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                          {
                            marginTop: 10,
                            color: '#000000',
                          },
                        ]}
                      >
                        {t('tacticalBoard.editPanel.dotSpacing')}:
                      </Text>
                      <View
                        style={[
                          styles.proModalGrid,
                          {
                            marginTop: 6,
                          },
                        ]}
                      >
                        {[2, 4, 6, 8, 10].map((spacing) => (
                          <TouchableOpacity
                            key={`dot-spacing-${spacing}`}
                            style={[
                              styles.proModalGridItem,
                              {
                                minWidth: 40,
                              },
                              localDotSpacing === spacing && styles.proModalGridItemSelected,
                            ]}
                            onPress={() => setLocalDotSpacing(spacing)}
                          >
                            <Svg width="30" height="8">
                              <Path
                                d="M2,4 L28,4"
                                stroke="#000000"
                                strokeWidth="2"
                                strokeDasharray={`${localDotSize},${spacing}`}
                                fill="none"
                                strokeLinecap="round"
                              />
                            </Svg>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Vista previa del trazado */}
                  <Text
                    style={[
                      isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                      {
                        marginTop: 14,
                      },
                    ]}
                  >
                    {t('tacticalBoard.editPanel.preview')}:
                  </Text>
                  <View style={styles.proModalPreview}>
                    <Svg
                      width="180"
                      height="60"
                      key={`preview-${localLineType}-${localDotSize}-${localDotSpacing}-${color}-${thickness}-${fillColor}`}
                    >
                      {/* Vista previa seg�n el tipo de forma */}
                      {icon.type === 'straight-line' &&
                        (localLineType === 'dotted' ? (
                          <Path
                            d="M15,30 L165,30"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            strokeDasharray={`${localDotSize},${localDotSpacing}`}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ) : (
                          <Path
                            d="M15,30 L165,30"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ))}
                      {icon.type === 'straight-arrow' && (
                        <>
                          {localLineType === 'dotted' ? (
                            <Path
                              d="M15,30 L145,30"
                              stroke={color}
                              strokeWidth={parseInt(thickness) || 2}
                              strokeDasharray={`${localDotSize},${localDotSpacing}`}
                              fill="none"
                              strokeLinecap="round"
                            />
                          ) : (
                            <Path
                              d="M15,30 L145,30"
                              stroke={color}
                              strokeWidth={parseInt(thickness) || 2}
                              fill="none"
                              strokeLinecap="round"
                            />
                          )}
                          <Path
                            d="M145,30 L130,20 M145,30 L130,40"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                      {icon.type === 'curve-line' &&
                        (localLineType === 'dotted' ? (
                          <Path
                            d="M15,45 Q90,5 165,45"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            strokeDasharray={`${localDotSize},${localDotSpacing}`}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ) : (
                          <Path
                            d="M15,45 Q90,5 165,45"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ))}
                      {icon.type === 'curve-arrow' && (
                        <>
                          {localLineType === 'dotted' ? (
                            <Path
                              d="M15,45 Q90,5 145,45"
                              stroke={color}
                              strokeWidth={parseInt(thickness) || 2}
                              strokeDasharray={`${localDotSize},${localDotSpacing}`}
                              fill="none"
                              strokeLinecap="round"
                            />
                          ) : (
                            <Path
                              d="M15,45 Q90,5 145,45"
                              stroke={color}
                              strokeWidth={parseInt(thickness) || 2}
                              fill="none"
                              strokeLinecap="round"
                            />
                          )}
                          <Path
                            d="M145,45 L135,32 M145,45 L130,50"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                      {icon.type === 'circle' &&
                        (localLineType === 'dotted' ? (
                          <Circle
                            cx="90"
                            cy="30"
                            r="22"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            strokeDasharray={`${localDotSize},${localDotSpacing}`}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                          />
                        ) : (
                          <Circle
                            cx="90"
                            cy="30"
                            r="22"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                          />
                        ))}
                      {icon.type === 'rectangle' &&
                        (localLineType === 'dotted' ? (
                          <Rect
                            x="30"
                            y="10"
                            width="120"
                            height="40"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            strokeDasharray={`${localDotSize},${localDotSpacing}`}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                          />
                        ) : (
                          <Rect
                            x="30"
                            y="10"
                            width="120"
                            height="40"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                          />
                        ))}
                      {(icon.type === 'custom-shape' || icon.type === 'custom-shape-button') &&
                        (localLineType === 'dotted' ? (
                          <Path
                            d="M90,10 L130,50 L50,50 Z"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            strokeDasharray={`${localDotSize},${localDotSpacing}`}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <Path
                            d="M90,10 L130,50 L50,50 Z"
                            stroke={color}
                            strokeWidth={parseInt(thickness) || 2}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            fillOpacity={fillColor === 'transparent' ? 0 : 0.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}
                    </Svg>
                  </View>
                </>
              )}

              {/* Color de relleno para c�rculos, rect�ngulos y custom-shape */}
              {canHaveFill && (
                <>
                  <Text
                    style={[
                      isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                      {
                        marginTop: 12,
                      },
                    ]}
                  >
                    {t('tacticalBoard.editPanel.fillColorLabel')}
                  </Text>
                  <View
                    style={[
                      styles.proModalRow,
                      {
                        marginTop: 6,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor: fillColor === 'transparent' ? '#fff' : fillColor,
                          opacity: fillColor === 'transparent' ? 0.4 : 1,
                        },
                      ]}
                      onPress={() => setFillPickerVisible(true)}
                    />
                    <TouchableOpacity
                      onPress={() => setFillColor('transparent')}
                      style={[
                        styles.proModalChip,
                        fillColor === 'transparent' && styles.proModalChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.proModalChipText,
                          fillColor === 'transparent' && styles.proModalChipTextSelected,
                        ]}
                      >
                        {t('tacticalBoard.editPanel.noFill')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <MiniColorPickerModal
                    visible={fillPickerVisible}
                    initialColor={fillColor === 'transparent' ? '#ff0000' : fillColor}
                    onClose={() => setFillPickerVisible(false)}
                    onSelect={(c) => setFillColor(c)}
                  />
                </>
              )}

              {/* Controles para cambiar dimensiones en metros manualmente */}
              {(icon.type === 'circle' || icon.type === 'rectangle') && (
                <>
                  <Text
                    style={[
                      isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                      {
                        marginTop: 12,
                      },
                    ]}
                  >
                    {icon.type === 'circle'
                      ? 'Diámetro Horizontal / Ancho (m)'
                      : t('tacticalBoard.editPanel.widthLabel') || 'Ancho (m)'}
                  </Text>
                  <TextInput
                    style={isMobile ? styles.proModalInputMobile : styles.proModalInput}
                    keyboardType="numeric"
                    autoComplete="off"
                    value={localWidth}
                    onChangeText={setLocalWidth}
                    placeholder="Ancho en metros"
                    placeholderTextColor="#888"
                  />
                  <Text
                    style={[
                      isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                      {
                        marginTop: 10,
                      },
                    ]}
                  >
                    {icon.type === 'circle'
                      ? 'Diámetro Vertical / Alto (m)'
                      : t('tacticalBoard.editPanel.heightLabel') || 'Alto (m)'}
                  </Text>
                  <TextInput
                    style={isMobile ? styles.proModalInputMobile : styles.proModalInput}
                    keyboardType="numeric"
                    autoComplete="off"
                    value={localHeight}
                    onChangeText={setLocalHeight}
                    placeholder="Alto en metros"
                    placeholderTextColor="#888"
                  />
                </>
              )}

              {/* Checkbox para aplicar a la paleta */}
              {canApplyToPalette && !hideApplyToPalette && !icon?.isMaterialPalette && (
                <View
                  style={[
                    styles.proModalSwitch,
                    {
                      marginTop: 14,
                    },
                  ]}
                >
                  <Text style={styles.proModalSwitchLabel}>
                    {t('tacticalBoard.editPanel.applyToPalette')}
                  </Text>
                  <Switch
                    value={applyToPalette}
                    onValueChange={setApplyToPalette}
                    trackColor={{
                      false: '#ddd',
                      true: '#81b0ff',
                    }}
                    thumbColor={applyToPalette ? '#2176ff' : '#f4f3f4'}
                  />
                </View>
              )}

              {/* Checkbox para aplicar a todos los elementos del mismo tipo */}
              {/* Mostrar "Aplicar a todos" cuando estamos editando un elemento del campo (no de la paleta) */}
              {!hideApplyToPalette &&
                !isPalettePlayer &&
                !icon?.isMaterialPalette &&
                icon.type !== 'free-text' && (
                  <View
                    style={[
                      styles.proModalSwitch,
                      {
                        marginTop: canApplyToPalette ? 0 : 14,
                      },
                    ]}
                  >
                    <Text style={styles.proModalSwitchLabel}>
                      {t('tacticalBoard.editPanel.applyToAll')}
                    </Text>
                    <Switch
                      value={applyToAll}
                      onValueChange={setApplyToAll}
                      trackColor={{
                        false: '#ddd',
                        true: '#81b0ff',
                      }}
                      thumbColor={applyToAll ? '#2176ff' : '#f4f3f4'}
                    />
                  </View>
                )}
            </KeyboardAwareScrollView>

            {/* Footer */}
            <View style={styles.proModalFooter}>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnSecondary]}
                onPress={onClose}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                  {t('tacticalBoard.editPanel.close')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnPrimary]}
                onPress={() => {
                  let updatedPoints = icon.points;
                  if (
                    (icon.type === 'circle' || icon.type === 'rectangle') &&
                    localWidth &&
                    localHeight &&
                    icon.points &&
                    icon.points.length === 2
                  ) {
                    const newW_m = parseFloat(localWidth);
                    const newH_m = parseFloat(localHeight);
                    if (!isNaN(newW_m) && newW_m > 0 && !isNaN(newH_m) && newH_m > 0) {
                      const cx = (icon.points[0].x + icon.points[1].x) / 2;
                      const cy = (icon.points[0].y + icon.points[1].y) / 2;
                      const signX = icon.points[1].x >= icon.points[0].x ? 1 : -1;
                      const signY = icon.points[1].y >= icon.points[0].y ? 1 : -1;
                      const newWRatio = newW_m / 105;
                      const newHRatio = newH_m / 68;
                      updatedPoints = [
                        {
                          x: cx - signX * (newWRatio / 2),
                          y: cy - signY * (newHRatio / 2),
                        },
                        {
                          x: cx + signX * (newWRatio / 2),
                          y: cy + signY * (newHRatio / 2),
                        },
                      ];
                    }
                  }
                  const updatedIcon = {
                    ...icon,
                    points: updatedPoints,
                    // No actualizar size para custom-shape (su tamao viene de los puntos dibujados)
                    size:
                      icon.type === 'custom-shape' || icon.type === 'custom-shape-button'
                        ? icon.size
                        : parseInt(size),
                    color: canHaveColor && isValidHexColor(color) ? color : icon.color,
                    number: icon.type === 'player' ? (isNeutralPlayer ? 'N' : number) : undefined,
                    numberColor: icon.type === 'player' ? numberColor : icon.numberColor,
                    backgroundColor:
                      icon.type === 'player' && isNeutralPlayer
                        ? backgroundColor
                        : icon.backgroundColor,
                    thickness:
                      isArrowType ||
                      isCurveType ||
                      icon.type === 'circle' ||
                      icon.type === 'rectangle' ||
                      icon.type === 'custom-shape' ||
                      icon.type === 'custom-shape-button'
                        ? parseInt(thickness) || 5
                        : icon.thickness,
                    textColor:
                      icon.type === 'player' && (icon.playerData || isPalettePlayer)
                        ? textColor
                        : icon.textColor,
                    textBackgroundColor:
                      icon.type === 'player' && (icon.playerData || isPalettePlayer)
                        ? textBackgroundColor
                        : icon.textBackgroundColor,
                    // Propiedades de portero
                    goalkeeperStripeColor: isGoalkeeper
                      ? goalkeeperStripeColor
                      : icon.goalkeeperStripeColor,
                    shape: icon.type === 'player' ? playerShape : icon.shape,
                    hasStripes: icon.type === 'player' ? hasStripes : icon.hasStripes,
                    hasBib: icon.type === 'player' ? hasBib : icon.hasBib,
                    bibColor: icon.type === 'player' ? bibColor : icon.bibColor,
                    stripeColor:
                      icon.type === 'player'
                        ? isGoalkeeper
                          ? goalkeeperStripeColor
                          : stripeColor
                        : icon.stripeColor,
                    // Nuevas propiedades para tipo de lnea y relleno
                    lineType: canHaveLineType ? localLineType : icon.lineType,
                    fillColor: canHaveFill ? fillColor : icon.fillColor,
                    // Propiedades de espaciado para lneas punteadas
                    dotSize: canHaveLineType ? localDotSize : icon.dotSize,
                    dotSpacing: canHaveLineType ? localDotSpacing : icon.dotSpacing,
                  };

                  // Si es un material de la paleta (isMaterialPalette)
                  if (icon.isMaterialPalette) {
                    // Actualizar la Configuraci�n de materiales
                    if (onMaterialsConfigUpdate) {
                      onMaterialsConfigUpdate(icon.materialType || icon.type, {
                        color: updatedIcon.color,
                        size: updatedIcon.size,
                      });
                    }
                    onClose();
                    return;
                  }

                  // Si es un jugador de la paleta (isPalettePlayer)
                  if (isPalettePlayer) {
                    // Solo cerrar el panel, no hay nada que aplicar en el campo
                    // Si se marc� aplicar a paleta, actualizar teamPlayerStyle
                    if (setTeamPlayerStyle) {
                      setTeamPlayerStyle((prev) => ({
                        ...prev,
                        color: updatedIcon.color,
                        size: updatedIcon.size,
                        numberColor: updatedIcon.numberColor || prev.numberColor || '#ffffff',
                        textColor: updatedIcon.textColor || prev.textColor || '#000000',
                        textBackgroundColor:
                          updatedIcon.textBackgroundColor || prev.textBackgroundColor || '#ffffff',
                        shape: updatedIcon.shape || prev.shape || 'circle',
                        hasStripes:
                          updatedIcon.hasStripes !== undefined
                            ? updatedIcon.hasStripes
                            : prev.hasStripes,
                        hasBib: updatedIcon.hasBib !== undefined ? updatedIcon.hasBib : prev.hasBib,
                        bibColor:
                          updatedIcon.bibColor || prev.bibColor || NEUTRAL_PLAYER_COLORS.bib,
                        stripeColor: updatedIcon.stripeColor || prev.stripeColor || '#ffffff',
                        goalkeeperStripeColor:
                          updatedIcon.goalkeeperStripeColor ||
                          prev.goalkeeperStripeColor ||
                          '#ffffff',
                      }));
                    }
                    onClose();
                  } else {
                    // Aplicar cambios al elemento pintado
                    onApply(updatedIcon, applyToAll);

                    // Si se marc� aplicar a paleta
                    if (applyToPalette && canApplyToPalette) {
                      // Tipos de materiales
                      const materialTypes = [
                        'ball',
                        'cone-pro',
                        'cone-flat',
                        'ring',
                        'goal-large',
                        'goal-small',
                        'barrier',
                        'dummy',
                        'pole',
                        'ladder',
                        'weights',
                      ];
                      const isMaterial = materialTypes.includes(icon.type);
                      if (isMaterial) {
                        // Para materiales, usar onMaterialsConfigUpdate
                        if (onMaterialsConfigUpdate) {
                          onMaterialsConfigUpdate(icon.type, {
                            color: updatedIcon.color,
                            size: updatedIcon.size,
                          });
                        }
                      } else {
                        // Si no tiene paletteIndex, buscarlo por tipo
                        let paletteIdx = icon.paletteIndex;
                        if (typeof paletteIdx !== 'number') {
                          // Buscar el �ndice en la paleta seg�n el tipo
                          const searchType =
                            icon.type === 'custom-shape' ? 'custom-shape-button' : icon.type;
                          paletteIdx = paletteIcons.findIndex((ic) => ic.type === searchType);
                        }
                        if (typeof paletteIdx === 'number' && paletteIdx >= 0) {
                          // Para jugadores sin nombre, solo aplicar color y tama�o
                          const paletteUpdate =
                            icon.type === 'player' && !icon.playerData
                              ? {
                                  ...updatedIcon,
                                  paletteIndex: paletteIdx,
                                  color: updatedIcon.color,
                                  size: updatedIcon.size,
                                  numberColor: updatedIcon.numberColor,
                                  // incluir color del n�mero
                                  backgroundColor: updatedIcon.backgroundColor,
                                  isNeutral: updatedIcon.isNeutral,
                                  textColor: updatedIcon.textColor,
                                  // incluir color del texto
                                  textBackgroundColor: updatedIcon.textBackgroundColor,
                                  // incluir fondo del texto
                                  shape: updatedIcon.shape,
                                  hasStripes: updatedIcon.hasStripes,
                                  hasBib: updatedIcon.hasBib,
                                  bibColor: updatedIcon.bibColor,
                                  stripeColor: updatedIcon.stripeColor,
                                  goalkeeperStripeColor: updatedIcon.goalkeeperStripeColor,
                                  // No incluir number ni thickness
                                }
                              : {
                                  ...updatedIcon,
                                  paletteIndex: paletteIdx,
                                };
                          onPaletteUpdate && onPaletteUpdate(paletteUpdate);
                        }
                      }
                    }
                  }
                }}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                  {t('tacticalBoard.editPanel.apply')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
