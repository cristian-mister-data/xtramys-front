export function createFieldPalettes(dependencies) {
  const {
    Animated,
    Dimensions,
    Feather,
    Image,
    Ionicons,
    LongPressGestureHandler,
    MaterialCommunityIcons,
    MemoizedIcon,
    NEUTRAL_PLAYER_COLORS,
    Pressable,
    React,
    ScrollView,
    State,
    Text,
    TouchableOpacity,
    View,
    cdnUrl,
    formationSettings,
    getMaterialsIcons,
    getPlayerFullName,
    styles,
    t,
    useEffect,
    useMemo,
    useRef,
    useSafeAreaInsets,
    useScreenDimensions,
    useState,
    useTranslation,
  } = dependencies;
  const SlidingPlayersPalette = React.memo(
    function SlidingPlayersPalette({
      visible,
      onClose,
      availablePlayers,
      onSelectPlayer,
      onLongPressPlayer,
      onOpenSettings,
      isMobile = false,
      teamPlayerColor = '#2176ff',
      goalkeeperColor = '#ff4a4a',
      numberColor = '#ffffff',
      textColor = '#000000',
      textBackgroundColor = '#ffffff',
      showPosition = false,
      differentiateGoalkeeper = true,
      goalkeeperStripeColor = '#ffffff',
      showPhotos = false,
      playerShape = 'circle',
      hasPlayerStripes = false,
      playerStripeColor = '#ffffff',
      hasBib = false,
      bibColor = NEUTRAL_PLAYER_COLORS.bib,
    }) {
      const { t } = useTranslation();
      const insets = useSafeAreaInsets();
      const slideAnim = useRef(new Animated.Value(visible ? 0 : 300)).current;
      const [isVisible, setIsVisible] = useState(visible);
      const iconSize = isMobile ? 28 : 44; // M�s peque�o en m�vil
      const nameFontSize = isMobile ? 8 : 10; // M�s peque�o en m�vil
      const dorsalFontSize = isMobile ? 12 : 16; // M�s peque�o en m�vil

      const panelIconSize = isMobile ? 36 : iconSize;
      const panelShapeSize = playerShape === 'jersey' ? panelIconSize + 2 : panelIconSize;
      const panelNameFontSize = isMobile ? 9 : nameFontSize;
      const panelDorsalFontSize = isMobile ? 16 : dorsalFontSize;
      useEffect(() => {
        if (visible) {
          setIsVisible(true);
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        } else {
          Animated.spring(slideAnim, {
            toValue: 300,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start(() => setIsVisible(false));
        }
      }, [visible]);
      if (!isVisible) return null;

      // Ordenar jugadores por n�mero de dorsal
      const sortedPlayers = [...availablePlayers].sort((a, b) => {
        const dorsalA = parseInt(a.dorsal || a.number || 999);
        const dorsalB = parseInt(b.dorsal || b.number || 999);
        return dorsalA - dorsalB;
      });

      // Funci�n para verificar si es portero
      const isGoalkeeper = (player) => {
        const pos = (player.posicion || '').toLowerCase();
        return pos === 'portero' || pos === 'goalkeeper' || pos === 'gk' || pos === 'pt';
      };

      // Funci�n para obtener la etiqueta de posici�n
      const getPositionLabel = (player) => {
        const pos = (player.posicion || '').toLowerCase();
        const posMap = {
          portero: 'PT',
          goalkeeper: 'PT',
          gk: 'PT',
          central: 'DC',
          lateral: 'LT',
          centrocampista: 'MC',
          extremo: 'EX',
          delantero: 'DC',
        };
        return posMap[pos] || pos.substring(0, 2).toUpperCase() || '?';
      };
      return (
        <Animated.View
          style={[
            styles.slidingPalette,
            {
              transform: [
                {
                  translateY: slideAnim,
                },
              ],
              paddingBottom: (isMobile ? 4 : 14) + insets.bottom,
              marginBottom: -insets.bottom,
              paddingRight: (isMobile ? 60 : 80) + insets.right,
            },
            isMobile && {
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              backgroundColor: 'rgba(40, 60, 80, 0.95)',
            },
          ]}
          pointerEvents="box-none"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.slidingPaletteContent,
              {
                paddingVertical: isMobile ? 4 : 12,
                paddingHorizontal: isMobile ? 8 : 20,
              },
            ]}
          >
            {sortedPlayers.length === 0 ? (
              <View
                style={{
                  padding: 20,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 14,
                  }}
                >
                  {t('tacticalBoard.noPlayersAvailable') || 'No hay jugadores disponibles'}
                </Text>
              </View>
            ) : (
              sortedPlayers.map((player) => {
                const isGK = isGoalkeeper(player);
                const showStripes = differentiateGoalkeeper && isGK;
                return (
                  <LongPressGestureHandler
                    key={player.uniqueId}
                    onHandlerStateChange={({ nativeEvent }) => {
                      if (nativeEvent.state === State.ACTIVE) {
                        onLongPressPlayer && onLongPressPlayer(player);
                      }
                    }}
                    minDurationMs={500}
                  >
                    <Pressable
                      onPress={() => onSelectPlayer(player)}
                      style={[
                        styles.paletteIconButton,
                        {
                          width: panelShapeSize + 20,
                          height: panelShapeSize + 36,
                          flexDirection: 'column',
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: panelShapeSize,
                          height: panelShapeSize,
                          borderRadius: playerShape === 'jersey' ? 0 : panelShapeSize / 2,
                          clipPath:
                            playerShape === 'jersey'
                              ? 'polygon(35% 10%, 50% 20%, 65% 10%, 82% 20%, 95% 42%, 78% 54%, 70% 45%, 70% 90%, 30% 90%, 30% 45%, 22% 54%, 5% 42%, 18% 20%)'
                              : undefined,
                          backgroundColor:
                            differentiateGoalkeeper && isGK ? goalkeeperColor : teamPlayerColor,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: 2,
                          shadowColor: '#000',
                          shadowOffset: {
                            width: 0,
                            height: 1,
                          },
                          shadowOpacity: 0.2,
                          shadowRadius: 2,
                          elevation: 2,
                          overflow: 'hidden',
                        }}
                      >
                        {hasPlayerStripes && !showPhotos && (
                          <>
                            {[-0.22, 0, 0.22].map((offset) => (
                              <View
                                key={`sliding-team-player-stripe-${player.uniqueId}-${offset}`}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  bottom: 0,
                                  left: panelShapeSize / 2 + panelShapeSize * offset - 3,
                                  width: 6,
                                  backgroundColor: playerStripeColor,
                                  opacity: 0.9,
                                }}
                              />
                            ))}
                          </>
                        )}
                        {/* Rayas verticales de portero para camiseta */}
                        {showStripes &&
                          differentiateGoalkeeper &&
                          playerShape === 'jersey' &&
                          !hasPlayerStripes &&
                          !showPhotos && (
                            <>
                              {[-0.22, 0, 0.22].map((offset) => (
                                <View
                                  key={`sliding-team-player-gk-stripe-${player.uniqueId}-${offset}`}
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: panelShapeSize / 2 + panelShapeSize * offset - 3,
                                    width: 6,
                                    backgroundColor: goalkeeperStripeColor,
                                    opacity: 0.9,
                                  }}
                                />
                              ))}
                            </>
                          )}
                        {/* Rayas verticales para portero (circulo) */}
                        {showStripes && playerShape !== 'jersey' && (
                          <>
                            {[-0.22, 0, 0.22].map((offset) => (
                              <View
                                key={`sliding-team-player-gk-circle-stripe-${player.uniqueId}-${offset}`}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  bottom: 0,
                                  left: panelShapeSize / 2 + panelShapeSize * offset - 3,
                                  width: 6,
                                  backgroundColor: goalkeeperStripeColor,
                                  opacity: 0.9,
                                }}
                              />
                            ))}
                          </>
                        )}
                        {showPhotos && player.foto ? (
                          <Image
                            source={{
                              uri: cdnUrl(player.foto),
                            }}
                            style={{
                              width: panelShapeSize - 4,
                              height: panelShapeSize - 4,
                              borderRadius: (panelShapeSize - 4) / 2,
                            }}
                            resizeMode="cover"
                          />
                        ) : (
                          <>
                            {hasBib && (
                              <View
                                style={{
                                  position: 'absolute',
                                  top: panelShapeSize * 0.18,
                                  width: panelShapeSize * 0.58,
                                  height: panelShapeSize * 0.64,
                                  borderRadius: playerShape === 'jersey' ? 5 : 7,
                                  backgroundColor: bibColor,
                                  borderWidth: 1,
                                  borderColor: '#222',
                                }}
                              />
                            )}
                            <Text
                              style={{
                                color: numberColor,
                                fontSize:
                                  playerShape === 'jersey'
                                    ? panelDorsalFontSize * 0.72
                                    : panelDorsalFontSize,
                                fontWeight: 'bold',
                              }}
                            >
                              {showPosition
                                ? getPositionLabel(player)
                                : player.dorsal || player.number || '?'}
                            </Text>
                          </>
                        )}
                      </View>
                      <View
                        style={{
                          backgroundColor:
                            textBackgroundColor === 'transparent'
                              ? 'transparent'
                              : textBackgroundColor,
                          paddingHorizontal: 3,
                          paddingVertical: 1,
                          borderRadius: 3,
                          minWidth: panelIconSize,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: panelNameFontSize,
                            color: textColor,
                            textAlign: 'center',
                            fontWeight: '500',
                          }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {(getPlayerFullName(player) || player.name || 'Sin nombre').substring(
                            0,
                            12,
                          )}
                        </Text>
                      </View>
                    </Pressable>
                  </LongPressGestureHandler>
                );
              })
            )}
          </ScrollView>
          {/* Bot�n de ajustes */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 10,
              right: (isMobile ? 35 : 45) + insets.right,
              width: isMobile ? 28 : 32,
              height: isMobile ? 28 : 32,
              borderRadius: isMobile ? 14 : 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={onOpenSettings}
          >
            <Feather name="settings" size={isMobile ? 16 : 18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 10,
              right: 10 + insets.right,
            }}
            onPress={onClose}
          >
            <Feather name="x" size={isMobile ? 20 : 24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      );
    },
    (prevProps, nextProps) => {
      if (prevProps.visible !== nextProps.visible) return false;
      if (prevProps.isMobile !== nextProps.isMobile) return false;
      if (prevProps.availablePlayers.length !== nextProps.availablePlayers.length) return false;
      if (prevProps.teamPlayerColor !== nextProps.teamPlayerColor) return false;
      if (prevProps.teamPlayerColor !== nextProps.teamPlayerColor) return false;
      if (prevProps.goalkeeperColor !== nextProps.goalkeeperColor) return false;
      if (prevProps.numberColor !== nextProps.numberColor) return false;
      if (prevProps.textColor !== nextProps.textColor) return false;
      if (prevProps.textBackgroundColor !== nextProps.textBackgroundColor) return false;
      if (prevProps.showPosition !== nextProps.showPosition) return false;
      if (prevProps.differentiateGoalkeeper !== nextProps.differentiateGoalkeeper) return false;
      if (prevProps.goalkeeperStripeColor !== nextProps.goalkeeperStripeColor) return false;
      if (prevProps.showPhotos !== nextProps.showPhotos) return false;
      if (prevProps.playerShape !== nextProps.playerShape) return false;
      if (prevProps.hasPlayerStripes !== nextProps.hasPlayerStripes) return false;
      if (prevProps.playerStripeColor !== nextProps.playerStripeColor) return false;
      if (prevProps.hasBib !== nextProps.hasBib) return false;
      if (prevProps.bibColor !== nextProps.bibColor) return false;
      return true;
    },
  );

  // Paleta de materiales de entrenamiento
  // Paleta de materiales de entrenamiento
  // Paleta de materiales de entrenamiento
  // Paleta de materiales de entrenamiento
  const SlidingMaterialsPalette = React.memo(
    function SlidingMaterialsPalette({
      visible,
      onClose,
      onSelectMaterial,
      onLongPressMaterial,
      materialsConfig,
      pendingPlacementAction,
      isMobile = false,
    }) {
      const slideAnim = useRef(new Animated.Value(visible ? 0 : 300)).current;
      const insets = useSafeAreaInsets();
      const [isVisible, setIsVisible] = useState(visible);
      const iconSize = isMobile ? 28 : 50;
      const labelFontSize = isMobile ? 7 : 10;
      const MATERIALS_ICONS = useMemo(() => getMaterialsIcons(), []);
      useEffect(() => {
        if (visible) {
          setIsVisible(true);
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        } else {
          Animated.spring(slideAnim, {
            toValue: 300,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start(() => setIsVisible(false));
        }
      }, [visible]);
      if (!isVisible) return null;
      return (
        <Animated.View
          style={[
            styles.slidingPalette,
            {
              transform: [
                {
                  translateY: slideAnim,
                },
              ],
              paddingBottom: (isMobile ? 4 : 14) + insets.bottom,
              marginBottom: -insets.bottom,
              paddingRight: (isMobile ? 34 : 40) + insets.right,
            },
            isMobile && {
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              backgroundColor: 'rgba(40, 60, 80, 0.95)',
            },
          ]}
          pointerEvents="box-none"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.slidingPaletteContent,
              {
                paddingVertical: isMobile ? 3 : 12,
                paddingHorizontal: isMobile ? 8 : 20,
              },
            ]}
          >
            {MATERIALS_ICONS.map((material, idx) => {
              // Obtener Configuraci�n personalizada si existe
              const customConfig = materialsConfig?.[material.type] || {};
              const isSelected =
                pendingPlacementAction?.kind === 'material' &&
                pendingPlacementAction?.materialType === material.type;
              const displayMaterial = {
                ...material,
                color: customConfig.color || material.color,
                size: customConfig.size || material.size,
              };
              return (
                <Pressable
                  key={material.id}
                  onPress={() => onSelectMaterial(displayMaterial)}
                  onLongPress={() => {
                    if (material.editable && onLongPressMaterial) {
                      onLongPressMaterial(displayMaterial, idx);
                    }
                  }}
                  delayLongPress={400}
                  style={[
                    styles.paletteIconButton,
                    {
                      width: iconSize + (isMobile ? 4 : 10),
                      height: iconSize + (isMobile ? 16 : 25),
                      flexDirection: 'column',
                    },
                    isSelected && styles.paletteIconButtonSelected,
                    isMobile && {
                      borderRadius: 8,
                      backgroundColor: isSelected ? '#2176ff' : 'rgba(255, 255, 255, 0.15)',
                      marginHorizontal: 3,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: iconSize,
                      height: iconSize,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: isMobile ? 2 : 4,
                    }}
                  >
                    <MemoizedIcon icon={displayMaterial} size={iconSize * 0.8} rotation={0} />
                  </View>
                  <Text
                    style={{
                      fontSize: labelFontSize,
                      color: '#fff',
                      textAlign: 'center',
                      width: iconSize + (isMobile ? 4 : 10),
                      fontWeight: '500',
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {material.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: isMobile ? 6 : 10,
              right: (isMobile ? 6 : 10) + insets.right,
            }}
            onPress={onClose}
          >
            <Feather name="x" size={isMobile ? 18 : 24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      );
    },
    (prevProps, nextProps) => {
      if (prevProps.visible !== nextProps.visible) return false;
      if (prevProps.isMobile !== nextProps.isMobile) return false;
      if (prevProps.materialsConfig !== nextProps.materialsConfig) return false;
      if (
        prevProps.pendingPlacementAction?.kind !== nextProps.pendingPlacementAction?.kind ||
        prevProps.pendingPlacementAction?.materialType !==
          nextProps.pendingPlacementAction?.materialType
      ) {
        return false;
      }
      return true;
    },
  );

  // Paleta de cuerpo t�cnico
  // Paleta de cuerpo t�cnico
  // Paleta de cuerpo t�cnico
  // Paleta de cuerpo t�cnico
  const SlidingStaffPalette = React.memo(
    function SlidingStaffPalette({
      visible,
      onClose,
      onSelectStaff,
      isMobile = false,
      staffColor = '#333333',
      selectedStaffIds = [], // IDs de los staff ya en el campo
    }) {
      const { t } = useTranslation();
      const insets = useSafeAreaInsets();
      const slideAnim = useRef(new Animated.Value(visible ? 0 : 300)).current;
      const [isVisible, setIsVisible] = useState(visible);
      const iconSize = isMobile ? 36 : 50;
      const labelFontSize = isMobile ? 7 : 9;

      // Definir los roles del cuerpo t�cnico
      const allStaffRoles = useMemo(
        () => [
          {
            id: 'head-coach',
            code: t('tacticalBoard.staff.E1'),
            label: t('tacticalBoard.staff.headCoach'),
          },
          {
            id: 'assistant-coach',
            code: t('tacticalBoard.staff.E2'),
            label: t('tacticalBoard.staff.assistantCoach'),
          },
          {
            id: 'fitness-coach',
            code: t('tacticalBoard.staff.PF'),
            label: t('tacticalBoard.staff.fitnessCoach'),
          },
          {
            id: 'physio',
            code: t('tacticalBoard.staff.F'),
            label: t('tacticalBoard.staff.physio'),
          },
          {
            id: 'goalkeeper-coach',
            code: t('tacticalBoard.staff.EP'),
            label: t('tacticalBoard.staff.goalkeeperCoach'),
          },
          {
            id: 'delegate',
            code: t('tacticalBoard.staff.D'),
            label: t('tacticalBoard.staff.delegate'),
          },
          {
            id: 'kit-manager',
            code: t('tacticalBoard.staff.U'),
            label: t('tacticalBoard.staff.kitManager'),
          },
        ],
        [t],
      );

      // Filtrar los roles que no est�n en el campo
      const availableStaffRoles = useMemo(() => {
        return allStaffRoles.filter((role) => !selectedStaffIds.includes(role.id));
      }, [allStaffRoles, selectedStaffIds]);
      useEffect(() => {
        if (visible) {
          setIsVisible(true);
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        } else {
          Animated.spring(slideAnim, {
            toValue: 300,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start(() => setIsVisible(false));
        }
      }, [visible]);
      if (!isVisible) return null;
      return (
        <Animated.View
          style={[
            styles.slidingPalette,
            {
              transform: [
                {
                  translateY: slideAnim,
                },
              ],
              paddingBottom: (isMobile ? 4 : 14) + insets.bottom,
              marginBottom: -insets.bottom,
              paddingRight: (isMobile ? 34 : 40) + insets.right,
            },
            isMobile && {
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              backgroundColor: 'rgba(40, 60, 80, 0.95)',
            },
          ]}
          pointerEvents="box-none"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.slidingPaletteContent,
              {
                paddingVertical: isMobile ? 4 : 12,
                paddingHorizontal: isMobile ? 8 : 20,
              },
            ]}
          >
            {availableStaffRoles.length === 0 ? (
              <View
                style={{
                  padding: 20,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 14,
                  }}
                >
                  {t('tacticalBoard.staff.allStaffOnField') ||
                    'Todo el cuerpo t�cnico est� en el campo'}
                </Text>
              </View>
            ) : (
              availableStaffRoles.map((role) => (
                <Pressable
                  key={role.id}
                  onPress={() => onSelectStaff(role)}
                  style={[
                    styles.paletteIconButton,
                    {
                      width: iconSize + 20,
                      height: iconSize + 50,
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      paddingTop: 6,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: iconSize,
                      height: iconSize,
                      borderRadius: iconSize / 2,
                      backgroundColor: staffColor,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 4,
                      borderWidth: 2,
                      borderColor: '#666',
                    }}
                  >
                    <Text
                      style={{
                        color: '#ffffff',
                        fontSize: isMobile ? 12 : 16,
                        fontWeight: 'bold',
                      }}
                    >
                      {role.code}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 28,
                      justifyContent: 'flex-start',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: labelFontSize,
                        color: '#fff',
                        textAlign: 'center',
                        width: iconSize + 20,
                        fontWeight: '500',
                      }}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {role.label}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 10,
              right: 10 + insets.right,
            }}
            onPress={onClose}
          >
            <Feather name="x" size={isMobile ? 20 : 24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      );
    },
    (prevProps, nextProps) => {
      if (prevProps.visible !== nextProps.visible) return false;
      if (prevProps.isMobile !== nextProps.isMobile) return false;
      if (prevProps.staffColor !== nextProps.staffColor) return false;
      if (prevProps.selectedStaffIds?.length !== nextProps.selectedStaffIds?.length) return false;
      return true;
    },
  );
  const SlidingPalette = React.memo(
    function SlidingPalette({
      visible,
      onClose,
      paletteIcons,
      onIconPress,
      onIconLongPress,
      onAddText,
      onToggleEraser,
      drawingStates,
      isMobile = false,
      playersWithNumber = true,
    }) {
      const slideAnim = useRef(new Animated.Value(visible ? 0 : 300)).current;
      const insets = useSafeAreaInsets();
      const [isVisible, setIsVisible] = useState(visible);
      const iconSize = isMobile ? 28 : 44; // M�s peque�o en m�vil

      useEffect(() => {
        if (visible) {
          setIsVisible(true);
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        } else {
          Animated.spring(slideAnim, {
            toValue: 300,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start(() => setIsVisible(false));
        }
      }, [visible]);
      if (!isVisible) return null;
      return (
        <Animated.View
          style={[
            styles.slidingPalette,
            {
              transform: [
                {
                  translateY: slideAnim,
                },
              ],
              paddingBottom: (isMobile ? 4 : 14) + insets.bottom,
              marginBottom: -insets.bottom,
              paddingRight: (isMobile ? 34 : 40) + insets.right,
            },
            isMobile && {
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              backgroundColor: 'rgba(40, 60, 80, 0.95)',
            },
          ]}
          pointerEvents="box-none"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.slidingPaletteContent,
              {
                paddingVertical: isMobile ? 4 : 12,
                paddingHorizontal: isMobile ? 8 : 20,
              },
            ]}
          >
            {paletteIcons.map((icon, idx) => {
              const isSelected =
                (icon.type === 'straight-arrow' && drawingStates.drawingStraightArrow) ||
                (icon.type === 'straight-line' && drawingStates.drawingStraightLine) ||
                (icon.type === 'curve-line' && drawingStates.drawingCurveLine) ||
                (icon.type === 'curve-arrow' && drawingStates.drawingCurveArrow) ||
                (icon.type === 'circle' && drawingStates.drawingCircle) ||
                (icon.type === 'rectangle' && drawingStates.drawingRectangle) ||
                (icon.type === 'custom-shape-button' && drawingStates.drawingCustomShape) ||
                (drawingStates.pendingPlacementAction?.kind === 'palette-icon' &&
                  drawingStates.pendingPlacementAction?.paletteIndex === idx) ||
                (drawingStates.pendingPlacementAction?.kind === 'palette-player' &&
                  drawingStates.pendingPlacementAction?.paletteIndex === idx);
              return (
                <PaletteIconButton
                  key={icon.id}
                  icon={icon}
                  idx={idx}
                  iconSize={iconSize}
                  isSelected={isSelected}
                  isMobile={isMobile}
                  onPress={onIconPress}
                  onLongPress={onIconLongPress}
                  playersWithNumber={playersWithNumber}
                />
              );
            })}

            <Pressable
              onPress={onAddText}
              style={[
                styles.paletteIconButton,
                {
                  width: iconSize,
                  height: iconSize,
                },
                drawingStates.pendingPlacementAction?.kind === 'free-text' &&
                  styles.paletteIconButtonSelected,
                isMobile && {
                  borderRadius: 8,
                  backgroundColor:
                    drawingStates.pendingPlacementAction?.kind === 'free-text'
                      ? '#2176ff'
                      : 'rgba(255, 255, 255, 0.15)',
                },
              ]}
            >
              <Ionicons
                name="text"
                size={isMobile ? 18 : 28}
                color={isMobile ? '#ffffff' : '#000000ff'}
              />
            </Pressable>

            <Pressable
              onPress={onToggleEraser}
              style={[
                styles.paletteIconButton,
                {
                  width: iconSize,
                  height: iconSize,
                  backgroundColor: drawingStates.eraserMode
                    ? '#ff6b6b'
                    : 'rgba(255, 255, 255, 0.1)',
                  borderWidth: drawingStates.eraserMode ? 2 : 0,
                  borderColor: drawingStates.eraserMode ? '#ff0000' : 'transparent',
                },
                isMobile &&
                  !drawingStates.eraserMode && {
                    borderRadius: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
              ]}
            >
              <MaterialCommunityIcons
                name="eraser"
                size={isMobile ? 18 : 26}
                color={drawingStates.eraserMode ? '#ffffffff' : isMobile ? '#ffffff' : 'black'}
              />
            </Pressable>
          </ScrollView>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: isMobile ? 6 : 10,
              right: (isMobile ? 6 : 10) + insets.right,
            }}
            onPress={onClose}
          >
            <Feather name="x" size={isMobile ? 18 : 24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      );
    },
    (prevProps, nextProps) => {
      // Comparaci�n m�s granular
      if (prevProps.visible !== nextProps.visible) return false;
      if (prevProps.isMobile !== nextProps.isMobile) return false;
      if (prevProps.playersWithNumber !== nextProps.playersWithNumber) return false;
      if (prevProps.paletteIcons.length !== nextProps.paletteIcons.length) return false;

      // Comparar drawingStates individualmente
      const prevDS = prevProps.drawingStates;
      const nextDS = nextProps.drawingStates;
      if (
        prevDS.drawingStraightArrow !== nextDS.drawingStraightArrow ||
        prevDS.drawingStraightLine !== nextDS.drawingStraightLine ||
        prevDS.drawingCurveLine !== nextDS.drawingCurveLine ||
        prevDS.drawingCurveArrow !== nextDS.drawingCurveArrow ||
        prevDS.drawingCircle !== nextDS.drawingCircle ||
        prevDS.drawingRectangle !== nextDS.drawingRectangle ||
        prevDS.drawingCustomShape !== nextDS.drawingCustomShape ||
        prevDS.eraserMode !== nextDS.eraserMode ||
        prevDS.pendingPlacementAction?.kind !== nextDS.pendingPlacementAction?.kind ||
        prevDS.pendingPlacementAction?.paletteIndex !== nextDS.pendingPlacementAction?.paletteIndex
      ) {
        return false;
      }

      // Comparar cada icono de la paleta
      for (let i = 0; i < prevProps.paletteIcons.length; i++) {
        const prev = prevProps.paletteIcons[i];
        const next = nextProps.paletteIcons[i];
        if (
          prev.id !== next.id ||
          prev.color !== next.color ||
          prev.backgroundColor !== next.backgroundColor ||
          prev.numberColor !== next.numberColor ||
          prev.size !== next.size ||
          prev.type !== next.type ||
          prev.shape !== next.shape ||
          prev.hasStripes !== next.hasStripes ||
          prev.hasBib !== next.hasBib ||
          prev.bibColor !== next.bibColor ||
          prev.stripeColor !== next.stripeColor ||
          prev.isNeutral !== next.isNeutral ||
          prev.lineType !== next.lineType ||
          prev.fillColor !== next.fillColor ||
          prev.thickness !== next.thickness
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // Componente memoizado para cada bot�n de icono en la paleta
  // Componente memoizado para cada bot�n de icono en la paleta
  // Componente memoizado para cada bot�n de icono en la paleta
  // Componente memoizado para cada bot�n de icono en la paleta
  const PaletteIconButton = React.memo(
    ({
      icon,
      idx,
      iconSize,
      isSelected,
      isMobile,
      onPress,
      onLongPress,
      playersWithNumber = true,
    }) => {
      return (
        <Pressable
          onPress={() => onPress(icon, idx)}
          onLongPress={() => onLongPress(icon, idx)}
          style={[
            styles.paletteIconButton,
            {
              width: iconSize,
              height: iconSize,
            },
            isSelected && styles.paletteIconButtonSelected,
            isMobile &&
              !isSelected && {
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                marginHorizontal: 3,
              },
          ]}
        >
          <MemoizedIcon
            icon={icon}
            size={isMobile ? 22 : 32}
            rotation={0}
            number={icon.type === 'player' ? icon.number : undefined}
            playersWithNumber={playersWithNumber}
            displayLabel={icon.displayLabel}
            numberColor={
              icon.displayLabel
                ? formationSettings?.numberColor || icon.numberColor
                : icon.number !== undefined
                  ? icon.numberColor || '#ffffff'
                  : undefined
            }
          />
        </Pressable>
      );
    },
    (prevProps, nextProps) => {
      return (
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.iconSize === nextProps.iconSize &&
        prevProps.isMobile === nextProps.isMobile &&
        prevProps.playersWithNumber === nextProps.playersWithNumber &&
        prevProps.icon.color === nextProps.icon.color &&
        prevProps.icon.backgroundColor === nextProps.icon.backgroundColor &&
        prevProps.icon.numberColor === nextProps.icon.numberColor &&
        prevProps.icon.size === nextProps.icon.size &&
        prevProps.icon.thickness === nextProps.icon.thickness &&
        prevProps.icon.number === nextProps.icon.number &&
        prevProps.icon.type === nextProps.icon.type &&
        prevProps.icon.shape === nextProps.icon.shape &&
        prevProps.icon.hasStripes === nextProps.icon.hasStripes &&
        prevProps.icon.stripeColor === nextProps.icon.stripeColor &&
        prevProps.icon.isNeutral === nextProps.icon.isNeutral &&
        prevProps.icon.lineType === nextProps.icon.lineType &&
        prevProps.icon.fillColor === nextProps.icon.fillColor
      );
    },
  );
  const SlidingZoomControls = React.memo(
    function SlidingZoomControls({
      visible,
      onClose,
      zoomLevel,
      onZoomIn,
      onZoomOut,
      onPanLeft,
      onPanRight,
      onPanUp,
      onPanDown,
      onReset,
    }) {
      const dimensions = useScreenDimensions();
      const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
      const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
      const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
      const slideAnim = useRef(new Animated.Value(visible ? 0 : -200)).current;
      const [isVisible, setIsVisible] = useState(visible);
      useEffect(() => {
        if (visible) {
          setIsVisible(true);
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        } else {
          Animated.spring(slideAnim, {
            toValue: -200,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start(() => setIsVisible(false));
        }
      }, [visible]);
      if (!isVisible) return null;
      return (
        <Animated.View
          style={[
            styles.slidingZoomControls,
            {
              transform: [
                {
                  translateX: slideAnim,
                },
              ],
            },
            isMobile && styles.slidingZoomControlsMobile,
          ]}
          pointerEvents="auto"
        >
          {/* Header */}
          <View style={[styles.slidingZoomHeader, isMobile && styles.slidingZoomHeaderMobile]}>
            <Text style={[styles.slidingZoomTitle, isMobile && styles.slidingZoomTitleMobile]}>
              {t('tacticalBoard.zoom')}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel={t('tacticalBoard.close')}
            >
              <Feather name="x" size={isMobile ? 16 : 20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Contenido */}
          <View style={[styles.slidingZoomContent, isMobile && styles.slidingZoomContentMobile]}>
            <TouchableOpacity
              style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
              onPress={onZoomIn}
              activeOpacity={0.7}
              accessibilityLabel={t('tacticalBoard.zoomIn')}
            >
              <Feather name="zoom-in" size={isMobile ? 18 : 24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
              onPress={onZoomOut}
              activeOpacity={0.7}
              accessibilityLabel={t('tacticalBoard.zoomOut')}
            >
              <Feather name="zoom-out" size={isMobile ? 18 : 24} color="#fff" />
            </TouchableOpacity>

            <View style={[styles.zoomSeparator, isMobile && styles.zoomSeparatorMobile]} />

            <TouchableOpacity
              style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
              onPress={onPanUp}
              activeOpacity={0.7}
              accessibilityLabel={t('tacticalBoard.panUp')}
            >
              <Feather name="chevron-up" size={isMobile ? 18 : 24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
              onPress={onPanDown}
              activeOpacity={0.7}
              accessibilityLabel={t('tacticalBoard.panDown')}
            >
              <Feather name="chevron-down" size={isMobile ? 18 : 24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
              onPress={onPanLeft}
              activeOpacity={0.7}
              accessibilityLabel={t('tacticalBoard.panLeft')}
            >
              <Feather name="chevron-left" size={isMobile ? 18 : 24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
              onPress={onPanRight}
              activeOpacity={0.7}
              accessibilityLabel={t('tacticalBoard.panRight')}
            >
              <Feather name="chevron-right" size={isMobile ? 18 : 24} color="#fff" />
            </TouchableOpacity>

            <View style={[styles.zoomSeparator, isMobile && styles.zoomSeparatorMobile]} />

            <TouchableOpacity
              style={[styles.zoomControlBtn, isMobile && styles.zoomControlBtnMobile]}
              onPress={onReset}
              activeOpacity={0.7}
              accessibilityLabel={t('tacticalBoard.resetZoom')}
            >
              <Feather name="maximize" size={isMobile ? 18 : 24} color="#fff" />
            </TouchableOpacity>

            <Text style={[styles.zoomLevelText, isMobile && styles.zoomLevelTextMobile]}>
              {Math.round(zoomLevel * 100)}%
            </Text>
          </View>
        </Animated.View>
      );
    },
    (prevProps, nextProps) => {
      // Solo re-renderizar si cambia visible o zoomLevel (para actualizar el porcentaje)
      return prevProps.visible === nextProps.visible && prevProps.zoomLevel === nextProps.zoomLevel;
    },
  );

  // Solo ocultar TODOS los botones cuando hay modales que realmente lo requieren
  return {
    SlidingPlayersPalette,
    SlidingMaterialsPalette,
    SlidingStaffPalette,
    SlidingPalette,
    SlidingZoomControls,
  };
}
