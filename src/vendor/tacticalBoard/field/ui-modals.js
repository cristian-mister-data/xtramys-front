export function createFieldModals(dependencies) {
  const {
    Alert,
    Circle,
    DEFAULT_PLAYER_ICON_SIZE,
    Dimensions,
    Feather,
    Image,
    Ionicons,
    MiniColorPickerModal,
    Modal,
    NEUTRAL_PLAYER_COLORS,
    Path,
    Pressable,
    Rect,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Svg,
    Switch,
    Text,
    TouchableOpacity,
    View,
    cdnUrl,
    getPlayerFullName,
    styles,
    t,
    useEffect,
    useScreenDimensions,
    useState,
    useTranslation,
  } = dependencies;
  // 10. A�adir el componente LineStyleModal - MEJORADO con color, grosor y relleno
  function LineStyleModal({
    visible,
    onClose,
    onSelect,
    initialLineType = 'solid',
    initialDotSize = 2,
    initialDotSpacing = 4,
    initialColor = '#000000',
    initialThickness = 2,
    initialFillColor = 'transparent',
    shapeType = 'line', // 'line', 'arrow', 'circle', 'rectangle', 'custom-shape'
  }) {
    const { t } = useTranslation();
    const dimensions = useScreenDimensions();
    const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
    const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
    const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
    const [selectedType, setSelectedType] = useState(initialLineType);
    const [selectedDotSize, setSelectedDotSize] = useState(initialDotSize);
    const [selectedDotSpacing, setSelectedDotSpacing] = useState(initialDotSpacing);
    const [selectedColor, setSelectedColor] = useState(initialColor);
    const [selectedThickness, setSelectedThickness] = useState(initialThickness.toString());
    const [selectedFillColor, setSelectedFillColor] = useState(initialFillColor);
    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const [fillColorPickerVisible, setFillColorPickerVisible] = useState(false);

    // Determinar si es una figura que puede tener relleno
    const canHaveFill =
      shapeType === 'circle' || shapeType === 'rectangle' || shapeType === 'custom-shape';
    useEffect(() => {
      setSelectedType(initialLineType);
      setSelectedDotSize(initialDotSize);
      setSelectedDotSpacing(initialDotSpacing);
      setSelectedColor(initialColor);
      setSelectedThickness(initialThickness.toString());
      setSelectedFillColor(initialFillColor);
    }, [
      initialLineType,
      initialDotSize,
      initialDotSpacing,
      initialColor,
      initialThickness,
      initialFillColor,
      visible,
    ]);
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
                  maxWidth: 340,
                  maxHeight: SCREEN_HEIGHT * 0.85,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.proModalHeader}>
                <View style={styles.proModalHeaderIcon}>
                  <Text
                    style={{
                      fontSize: 12,
                    }}
                  >
                    {canHaveFill ? '◼' : '━'}
                  </Text>
                </View>
                <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                  {canHaveFill
                    ? t('tacticalBoard.lineConfig.titleShape')
                    : t('tacticalBoard.lineConfig.titleLine')}
                </Text>
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

              <ScrollView
                contentContainerStyle={styles.proModalBody}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* Color del trazado */}
                <View style={styles.proModalSection}>
                  <Text style={styles.proModalLabel}>
                    {t('tacticalBoard.editPanel.colorLabel')}
                  </Text>
                  <View style={styles.proModalRow}>
                    <TouchableOpacity
                      onPress={() => setColorPickerVisible(true)}
                      style={[
                        styles.proModalColorBtn,
                        {
                          backgroundColor: selectedColor,
                        },
                      ]}
                    />
                    <Text style={styles.proModalHint}>{selectedColor}</Text>
                  </View>
                </View>

                {/* Grosor */}
                <View style={styles.proModalSection}>
                  <Text style={styles.proModalLabel}>
                    {t('tacticalBoard.editPanel.strokeLabel')}
                  </Text>
                  <View style={styles.proModalGrid}>
                    {[1, 2, 3, 4, 5, 6].map((thickness) => (
                      <TouchableOpacity
                        key={`thickness-${thickness}`}
                        style={[
                          styles.proModalGridItem,
                          parseInt(selectedThickness) === thickness &&
                            styles.proModalGridItemSelected,
                        ]}
                        onPress={() => setSelectedThickness(thickness.toString())}
                      >
                        <View
                          style={{
                            width: 28,
                            height: thickness * 2,
                            backgroundColor: '#000000',
                            borderRadius: thickness,
                          }}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Tipo de trazado */}
                <View style={styles.proModalSection}>
                  <Text style={styles.proModalLabel}>
                    {t('tacticalBoard.editPanel.strokeTypeLabel')}
                  </Text>
                  <View style={styles.proModalGrid}>
                    <TouchableOpacity
                      style={[
                        styles.proModalGridItem,
                        {
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                        },
                        selectedType === 'solid' && styles.proModalGridItemSelected,
                      ]}
                      onPress={() => setSelectedType('solid')}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 3,
                          backgroundColor: '#000000',
                          borderRadius: 2,
                        }}
                      />
                      <Text
                        style={[
                          styles.proModalChipText,
                          {
                            marginTop: 4,
                            color: '#000000',
                          },
                          selectedType === 'solid' && styles.proModalChipTextSelected,
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
                        {
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                        },
                        selectedType === 'dotted' && styles.proModalGridItemSelected,
                      ]}
                      onPress={() => setSelectedType('dotted')}
                    >
                      <Svg width="40" height="10">
                        <Path
                          d="M5,5 L35,5"
                          stroke="#000000"
                          strokeWidth="2"
                          strokeDasharray="2,4"
                        />
                      </Svg>
                      <Text
                        style={[
                          styles.proModalChipText,
                          {
                            marginTop: 4,
                            color: '#000000',
                          },
                          selectedType === 'dotted' && styles.proModalChipTextSelected,
                          {
                            color: '#000000',
                          },
                        ]}
                      >
                        {t('tacticalBoard.editPanel.dashed')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {selectedType === 'dotted' && (
                  <>
                    <View style={styles.proModalSection}>
                      <Text
                        style={[
                          styles.proModalLabel,
                          {
                            color: '#000000',
                          },
                        ]}
                      >
                        {t('tacticalBoard.editPanel.dotSize')}
                      </Text>
                      <View style={styles.proModalGrid}>
                        {[1, 2, 3, 4].map((size) => (
                          <TouchableOpacity
                            key={`dot-size-${size}`}
                            style={[
                              styles.proModalGridItem,
                              selectedDotSize === size && styles.proModalGridItemSelected,
                            ]}
                            onPress={() => setSelectedDotSize(size)}
                          >
                            <Svg width="36" height="10">
                              <Path
                                d="M5,5 L31,5"
                                stroke="#000000"
                                strokeWidth="2"
                                strokeDasharray={`${size},${selectedDotSpacing}`}
                                fill="none"
                                strokeLinecap="round"
                              />
                            </Svg>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.proModalSection}>
                      <Text
                        style={[
                          styles.proModalLabel,
                          {
                            color: '#000000',
                          },
                        ]}
                      >
                        {t('tacticalBoard.editPanel.dotSpacing')}
                      </Text>
                      <View style={styles.proModalGrid}>
                        {[2, 4, 6, 8].map((spacing) => (
                          <TouchableOpacity
                            key={`dot-spacing-${spacing}`}
                            style={[
                              styles.proModalGridItem,
                              selectedDotSpacing === spacing && styles.proModalGridItemSelected,
                            ]}
                            onPress={() => setSelectedDotSpacing(spacing)}
                          >
                            <Svg width="36" height="10">
                              <Path
                                d="M5,5 L31,5"
                                stroke="#000000"
                                strokeWidth="2"
                                strokeDasharray={`${selectedDotSize},${spacing}`}
                                fill="none"
                                strokeLinecap="round"
                              />
                            </Svg>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {/* Relleno - solo para figuras */}
                {canHaveFill && (
                  <View style={styles.proModalSection}>
                    <Text style={styles.proModalLabel}>
                      {t('tacticalBoard.editPanel.fillColorLabel')}
                    </Text>
                    <View style={styles.proModalRow}>
                      <TouchableOpacity
                        onPress={() => setFillColorPickerVisible(true)}
                        style={[
                          styles.proModalColorBtn,
                          {
                            backgroundColor:
                              selectedFillColor === 'transparent' ? '#fff' : selectedFillColor,
                            opacity: selectedFillColor === 'transparent' ? 0.4 : 0.7,
                          },
                        ]}
                      >
                        {selectedFillColor === 'transparent' && (
                          <Feather name="slash" size={16} color="#999" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setSelectedFillColor('transparent')}
                        style={[
                          styles.proModalChip,
                          selectedFillColor === 'transparent' && styles.proModalChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.proModalChipText,
                            selectedFillColor === 'transparent' && styles.proModalChipTextSelected,
                          ]}
                        >
                          {t('tacticalBoard.editPanel.noFill')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.proModalHint}>{t('tacticalBoard.editPanel.fillHint')}</Text>
                  </View>
                )}

                {/* Vista previa */}
                <View style={styles.proModalSection}>
                  <Text style={styles.proModalLabel}>{t('tacticalBoard.editPanel.preview')}</Text>
                  <View style={styles.proModalPreview}>
                    <Svg
                      width="200"
                      height="80"
                      key={`modal-preview-${selectedType}-${selectedDotSize}-${selectedDotSpacing}-${selectedColor}-${selectedThickness}-${selectedFillColor}`}
                    >
                      {/* Vista previa seg�n el tipo de forma */}
                      {(shapeType === 'line' || shapeType === 'straight-line') &&
                        (selectedType === 'dotted' ? (
                          <Path
                            d="M20,40 L180,40"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ) : (
                          <Path
                            d="M20,40 L180,40"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ))}
                      {(shapeType === 'arrow' || shapeType === 'straight-arrow') && (
                        <>
                          {selectedType === 'dotted' ? (
                            <Path
                              d="M20,40 L160,40"
                              stroke={selectedColor}
                              strokeWidth={parseInt(selectedThickness) || 2}
                              strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                              fill="none"
                              strokeLinecap="round"
                            />
                          ) : (
                            <Path
                              d="M20,40 L160,40"
                              stroke={selectedColor}
                              strokeWidth={parseInt(selectedThickness) || 2}
                              fill="none"
                              strokeLinecap="round"
                            />
                          )}
                          <Path
                            d="M160,40 L145,30 M160,40 L145,50"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                      {shapeType === 'curve-line' &&
                        (selectedType === 'dotted' ? (
                          <Path
                            d="M20,60 Q100,10 180,60"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ) : (
                          <Path
                            d="M20,60 Q100,10 180,60"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                          />
                        ))}
                      {shapeType === 'curve-arrow' && (
                        <>
                          {selectedType === 'dotted' ? (
                            <Path
                              d="M20,60 Q100,10 160,60"
                              stroke={selectedColor}
                              strokeWidth={parseInt(selectedThickness) || 2}
                              strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                              fill="none"
                              strokeLinecap="round"
                            />
                          ) : (
                            <Path
                              d="M20,60 Q100,10 160,60"
                              stroke={selectedColor}
                              strokeWidth={parseInt(selectedThickness) || 2}
                              fill="none"
                              strokeLinecap="round"
                            />
                          )}
                          <Path
                            d="M160,60 L150,45 M160,60 L145,65"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                      {shapeType === 'circle' &&
                        (selectedType === 'dotted' ? (
                          <Circle
                            cx="100"
                            cy="40"
                            r="30"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                          />
                        ) : (
                          <Circle
                            cx="100"
                            cy="40"
                            r="30"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                          />
                        ))}
                      {shapeType === 'rectangle' &&
                        (selectedType === 'dotted' ? (
                          <Rect
                            x="40"
                            y="15"
                            width="120"
                            height="50"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                          />
                        ) : (
                          <Rect
                            x="40"
                            y="15"
                            width="120"
                            height="50"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                          />
                        ))}
                      {shapeType === 'custom-shape' &&
                        (selectedType === 'dotted' ? (
                          <Path
                            d="M100,15 L140,65 L60,65 Z"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            strokeDasharray={`${selectedDotSize},${selectedDotSpacing}`}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <Path
                            d="M100,15 L140,65 L60,65 Z"
                            stroke={selectedColor}
                            strokeWidth={parseInt(selectedThickness) || 2}
                            fill={selectedFillColor === 'transparent' ? 'none' : selectedFillColor}
                            fillOpacity={selectedFillColor === 'transparent' ? 0 : 0.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}
                    </Svg>
                  </View>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.proModalFooter}>
                <TouchableOpacity
                  style={[styles.proModalBtn, styles.proModalBtnSecondary]}
                  onPress={onClose}
                >
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.proModalBtn, styles.proModalBtnPrimary]}
                  onPress={() => {
                    onSelect({
                      lineType: selectedType,
                      dotSize: selectedDotSize,
                      dotSpacing: selectedDotSpacing,
                      color: selectedColor,
                      thickness: parseInt(selectedThickness) || 2,
                      fillColor: selectedFillColor,
                    });
                    onClose();
                  }}
                >
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                    {t('tacticalBoard.lineConfig.draw')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Color Picker Modals */}
              <MiniColorPickerModal
                visible={colorPickerVisible}
                initialColor={selectedColor}
                onClose={() => setColorPickerVisible(false)}
                onSelect={setSelectedColor}
              />
              <MiniColorPickerModal
                visible={fillColorPickerVisible}
                initialColor={selectedFillColor === 'transparent' ? '#ffffff' : selectedFillColor}
                onClose={() => setFillColorPickerVisible(false)}
                onSelect={setSelectedFillColor}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // Modal de ajustes para jugadores del equipo
  // Modal de ajustes para jugadores del equipo
  // Modal de ajustes para jugadores del equipo
  // Modal de ajustes para jugadores del equipo
  function TeamPlayerSettingsModal({
    visible,
    onClose,
    teamPlayerStyle,
    setTeamPlayerStyle,
    isMobile,
  }) {
    const { t } = useTranslation();
    const dimensions = useScreenDimensions();
    const SCREEN_WIDTH = dimensions?.width || Dimensions.get('window').width;
    const SCREEN_HEIGHT = dimensions?.height || Dimensions.get('window').height;
    const [color, setColor] = useState(teamPlayerStyle?.color || '#2176ff');
    const [size, setSize] = useState(
      teamPlayerStyle?.size?.toString() || DEFAULT_PLAYER_ICON_SIZE.toString(),
    );
    const [numberColor, setNumberColor] = useState(teamPlayerStyle?.numberColor || '#ffffff');
    const [textColor, setTextColor] = useState(teamPlayerStyle?.textColor || '#000000');
    const [textBackgroundColor, setTextBackgroundColor] = useState(
      teamPlayerStyle?.textBackgroundColor || '#ffffff',
    );
    const [showPosition, setShowPosition] = useState(teamPlayerStyle?.showPosition || false);
    const [differentiateGoalkeeper, setDifferentiateGoalkeeper] = useState(
      teamPlayerStyle?.differentiateGoalkeeper !== false,
    );
    const [goalkeeperStripeColor, setGoalkeeperStripeColor] = useState(
      teamPlayerStyle?.goalkeeperStripeColor || '#ffffff',
    );
    const [showPhotos, setShowPhotos] = useState(teamPlayerStyle?.showPhotos || false);
    const [playerShape, setPlayerShape] = useState(teamPlayerStyle?.shape || 'circle');
    const [hasStripes, setHasStripes] = useState(teamPlayerStyle?.hasStripes === true);
    const [hasBib, setHasBib] = useState(teamPlayerStyle?.hasBib === true);
    const [bibColor, setBibColor] = useState(
      teamPlayerStyle?.bibColor || NEUTRAL_PLAYER_COLORS.bib,
    );
    const [stripeColor, setStripeColor] = useState(teamPlayerStyle?.stripeColor || '#ffffff');
    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const [numberColorPickerVisible, setNumberColorPickerVisible] = useState(false);
    const [textColorPickerVisible, setTextColorPickerVisible] = useState(false);
    const [textBgColorPickerVisible, setTextBgColorPickerVisible] = useState(false);
    const [stripeColorPickerVisible, setStripeColorPickerVisible] = useState(false);
    const [playerStripeColorPickerVisible, setPlayerStripeColorPickerVisible] = useState(false);
    const [bibColorPickerVisible, setBibColorPickerVisible] = useState(false);

    // Sincronizar con props cuando cambia teamPlayerStyle
    useEffect(() => {
      setColor(teamPlayerStyle?.color || '#2176ff');
      setSize(teamPlayerStyle?.size?.toString() || DEFAULT_PLAYER_ICON_SIZE.toString());
      setNumberColor(teamPlayerStyle?.numberColor || '#ffffff');
      setTextColor(teamPlayerStyle?.textColor || '#000000');
      setTextBackgroundColor(teamPlayerStyle?.textBackgroundColor || '#ffffff');
      setShowPosition(teamPlayerStyle?.showPosition || false);
      setDifferentiateGoalkeeper(teamPlayerStyle?.differentiateGoalkeeper !== false);
      setGoalkeeperStripeColor(teamPlayerStyle?.goalkeeperStripeColor || '#ffffff');
      setShowPhotos(teamPlayerStyle?.showPhotos || false);
      setPlayerShape(teamPlayerStyle?.shape || 'circle');
      setHasStripes(teamPlayerStyle?.hasStripes === true);
      setHasBib(teamPlayerStyle?.hasBib === true);
      setBibColor(teamPlayerStyle?.bibColor || NEUTRAL_PLAYER_COLORS.bib);
      setStripeColor(teamPlayerStyle?.stripeColor || '#ffffff');
    }, [teamPlayerStyle]);
    if (!visible) return null;
    const photosJerseyMessage =
      'Las fotos no están disponibles en modo camiseta. Se usará el modo círculo.';
    const handleApply = () => {
      const normalizedShape = showPhotos && playerShape === 'jersey' ? 'circle' : playerShape;
      if (normalizedShape !== playerShape) {
        Alert.alert('Fotos no disponibles', photosJerseyMessage);
        setPlayerShape(normalizedShape);
      }
      setTeamPlayerStyle({
        color,
        size: parseInt(size) || DEFAULT_PLAYER_ICON_SIZE,
        numberColor,
        textColor,
        textBackgroundColor,
        showPosition,
        differentiateGoalkeeper,
        goalkeeperStripeColor,
        showPhotos,
        shape: normalizedShape,
        hasStripes,
        hasBib,
        bibColor,
        stripeColor,
      });
      onClose();
    };
    const iconPreviewSize = isMobile ? 44 : 50;
    const iconPreviewShapeSize = playerShape === 'jersey' ? iconPreviewSize + 2 : iconPreviewSize;
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
                  maxWidth: 340,
                  maxHeight: SCREEN_HEIGHT * 0.88,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.proModalHeader}>
                <View style={styles.proModalHeaderIcon}>
                  <Feather name="user-plus" size={15} color="#2563eb" />
                </View>
                <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                  {t('tacticalBoard.teamSettings.title') || 'Ajustes de Jugadores'}
                </Text>
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

              <ScrollView
                contentContainerStyle={styles.proModalBody}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* Vista previa */}
                <View
                  style={[
                    styles.proModalPreview,
                    {
                      marginBottom: 12,
                      alignItems: 'center',
                    },
                  ]}
                >
                  <View
                    style={{
                      width: iconPreviewShapeSize,
                      height: iconPreviewShapeSize,
                      borderRadius: playerShape === 'jersey' ? 0 : iconPreviewShapeSize / 2,
                      clipPath:
                        playerShape === 'jersey'
                          ? 'polygon(35% 10%, 50% 20%, 65% 10%, 82% 20%, 95% 42%, 78% 54%, 70% 45%, 70% 90%, 30% 90%, 30% 45%, 22% 54%, 5% 42%, 18% 20%)'
                          : undefined,
                      backgroundColor: showPhotos ? 'transparent' : color,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: showPhotos ? 2 : 1,
                      borderColor: showPhotos ? color : '#222',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Icono de foto si est� activo */}
                    {showPhotos ? (
                      <View
                        style={{
                          width: iconPreviewShapeSize,
                          height: iconPreviewShapeSize,
                          borderRadius: iconPreviewShapeSize / 2,
                          backgroundColor: '#e0e0e0',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="person" size={iconPreviewShapeSize * 0.6} color="#888" />
                      </View>
                    ) : (
                      <>
                        {/* Rayas de portero si est� activo */}
                        {hasStripes && (
                          <>
                            {[-0.22, 0, 0.22].map((offset) => (
                              <View
                                key={`team-player-preview-stripe-${offset}`}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  bottom: 0,
                                  left:
                                    iconPreviewShapeSize / 2 + iconPreviewShapeSize * offset - 3,
                                  width: 6,
                                  backgroundColor: stripeColor,
                                  opacity: 0.9,
                                }}
                              />
                            ))}
                          </>
                        )}
                        {differentiateGoalkeeper && (
                          <>
                            {[-0.22, 0, 0.22].map((offset) => (
                              <View
                                key={`team-player-preview-gk-stripe-${offset}`}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  bottom: 0,
                                  left:
                                    iconPreviewShapeSize / 2 + iconPreviewShapeSize * offset - 3,
                                  width: 6,
                                  backgroundColor: goalkeeperStripeColor,
                                  opacity: 0.9,
                                }}
                              />
                            ))}
                          </>
                        )}
                        {hasBib && (
                          <View
                            style={{
                              position: 'absolute',
                              top: iconPreviewShapeSize * 0.18,
                              width: iconPreviewShapeSize * 0.58,
                              height: iconPreviewShapeSize * 0.64,
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
                                ? iconPreviewShapeSize * 0.36
                                : iconPreviewShapeSize * 0.5,
                            fontWeight: 'bold',
                          }}
                        >
                          {showPosition ? 'PT' : '1'}
                        </Text>
                      </>
                    )}
                  </View>
                  <View
                    style={{
                      backgroundColor:
                        textBackgroundColor === 'transparent' ? 'transparent' : textBackgroundColor,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: textColor,
                        fontSize: 11,
                        fontWeight: '500',
                      }}
                    >
                      {t('tacticalBoard.teamSettings.nameLabel')}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 10,
                      color: '#888',
                      marginTop: 4,
                    }}
                  >
                    {t('tacticalBoard.teamSettings.goalkeeperPreview') ||
                      '(Vista previa de portero)'}
                  </Text>
                </View>

                {/* Color del icono */}
                <View style={styles.proModalSection}>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.teamSettings.iconColor') || 'Color del icono:'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor: color,
                        },
                      ]}
                      onPress={() => setColorPickerVisible(true)}
                    />
                  </View>
                </View>

                <MiniColorPickerModal
                  visible={colorPickerVisible}
                  initialColor={color}
                  onClose={() => setColorPickerVisible(false)}
                  onSelect={setColor}
                />

                {/* Color del n�mero/texto */}
                <View style={styles.proModalSection}>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.teamSettings.numberColor') || 'Color del n�mero:'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor: numberColor,
                          borderColor: numberColor === '#ffffff' ? '#ccc' : '#e0e0e0',
                        },
                      ]}
                      onPress={() => setNumberColorPickerVisible(true)}
                    />
                  </View>
                </View>

                <MiniColorPickerModal
                  visible={numberColorPickerVisible}
                  initialColor={numberColor}
                  onClose={() => setNumberColorPickerVisible(false)}
                  onSelect={setNumberColor}
                />

                {/* Color del texto del nombre */}
                <View style={styles.proModalSection}>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.teamSettings.nameTextColor') || 'Color del nombre:'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor: textColor,
                        },
                      ]}
                      onPress={() => setTextColorPickerVisible(true)}
                    />
                  </View>
                </View>

                <MiniColorPickerModal
                  visible={textColorPickerVisible}
                  initialColor={textColor}
                  onClose={() => setTextColorPickerVisible(false)}
                  onSelect={setTextColor}
                />

                {/* Color de fondo del nombre */}
                <View style={styles.proModalSection}>
                  <View style={styles.proModalRow}>
                    <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                      {t('tacticalBoard.teamSettings.nameBgColor') || 'Fondo del nombre:'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                        {
                          backgroundColor:
                            textBackgroundColor === 'transparent' ? '#fff' : textBackgroundColor,
                          opacity: textBackgroundColor === 'transparent' ? 0.4 : 1,
                        },
                      ]}
                      onPress={() => setTextBgColorPickerVisible(true)}
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
                          {
                            fontSize: 10,
                          },
                          textBackgroundColor === 'transparent' && styles.proModalChipTextSelected,
                        ]}
                      >
                        {t('tacticalBoard.editPanel.noBackground') || 'Sin fondo'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <MiniColorPickerModal
                  visible={textBgColorPickerVisible}
                  initialColor={
                    textBackgroundColor === 'transparent' ? '#ffffff' : textBackgroundColor
                  }
                  onClose={() => setTextBgColorPickerVisible(false)}
                  onSelect={setTextBackgroundColor}
                />

                {/* Tama�o */}
                <View style={styles.proModalSection}>
                  <Text
                    style={[
                      isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                      {
                        marginBottom: 8,
                      },
                    ]}
                  >
                    {t('tacticalBoard.editPanel.sizeLabel') || 'Tama�o:'}
                  </Text>
                  <View style={styles.proModalStepperRow}>
                    <TouchableOpacity
                      style={styles.proModalStepperBtn}
                      onPress={() => {
                        const current = parseInt(size) || DEFAULT_PLAYER_ICON_SIZE;
                        if (current > 12) setSize(String(current - 2));
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
                        const current = parseInt(size) || DEFAULT_PLAYER_ICON_SIZE;
                        if (current < 80) setSize(String(current + 2));
                      }}
                    >
                      <Feather name="plus" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Mostrar posici�n en lugar de n�mero */}
                <View style={styles.proModalSection}>
                  <Text
                    style={[
                      isMobile ? styles.proModalLabelMobile : styles.proModalLabel,
                      {
                        marginBottom: 8,
                      },
                    ]}
                  >
                    Forma
                  </Text>
                  <View
                    style={[
                      styles.proModalGrid,
                      {
                        marginTop: 0,
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
                        disabled={showPhotos}
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
                </View>

                <View
                  style={[
                    styles.proModalSwitch,
                    {
                      marginTop: 4,
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
                    disabled={showPhotos}
                  />
                </View>

                {hasStripes && !showPhotos && (
                  <View
                    style={[
                      styles.proModalSection,
                      {
                        marginTop: 8,
                      },
                    ]}
                  >
                    <View style={styles.proModalRow}>
                      <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                        {t('tacticalBoard.teamSettings.playerStripeColor')}
                      </Text>
                      <TouchableOpacity
                        style={[
                          isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                          {
                            backgroundColor: stripeColor,
                            borderWidth: 1,
                            borderColor: stripeColor === '#ffffff' ? '#ccc' : '#e0e0e0',
                          },
                        ]}
                        onPress={() => setPlayerStripeColorPickerVisible(true)}
                      />
                    </View>
                  </View>
                )}

                <MiniColorPickerModal
                  visible={playerStripeColorPickerVisible}
                  initialColor={stripeColor}
                  onClose={() => setPlayerStripeColorPickerVisible(false)}
                  onSelect={setStripeColor}
                />

                <View
                  style={[
                    styles.proModalSwitch,
                    {
                      marginTop: 4,
                    },
                  ]}
                >
                  <Text style={styles.proModalSwitchLabel}>{t('tacticalBoard.editPanel.bib')}</Text>
                  <Switch
                    value={hasBib}
                    onValueChange={setHasBib}
                    trackColor={{
                      false: '#ddd',
                      true: '#81b0ff',
                    }}
                    thumbColor={hasBib ? '#2176ff' : '#f4f3f4'}
                    disabled={showPhotos}
                  />
                </View>

                {hasBib && !showPhotos && (
                  <View
                    style={[
                      styles.proModalSection,
                      {
                        marginTop: 8,
                      },
                    ]}
                  >
                    <View style={styles.proModalRow}>
                      <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                        {t('tacticalBoard.editPanel.bibColor')}
                      </Text>
                      <TouchableOpacity
                        style={[
                          isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                          {
                            backgroundColor: bibColor,
                            borderWidth: 1,
                            borderColor: bibColor === '#ffffff' ? '#ccc' : '#e0e0e0',
                          },
                        ]}
                        onPress={() => setBibColorPickerVisible(true)}
                      />
                    </View>
                  </View>
                )}

                <MiniColorPickerModal
                  visible={bibColorPickerVisible}
                  initialColor={bibColor}
                  onClose={() => setBibColorPickerVisible(false)}
                  onSelect={setBibColor}
                />

                <View
                  style={[
                    styles.proModalSwitch,
                    {
                      marginTop: 12,
                    },
                  ]}
                >
                  <Text style={styles.proModalSwitchLabel}>
                    {t('tacticalBoard.teamSettings.showPosition') || 'Mostrar posici�n'}
                  </Text>
                  <Switch
                    value={showPosition}
                    onValueChange={setShowPosition}
                    trackColor={{
                      false: '#ddd',
                      true: '#81b0ff',
                    }}
                    thumbColor={showPosition ? '#2176ff' : '#f4f3f4'}
                    disabled={showPhotos}
                  />
                </View>

                {/* Mostrar fotos de los jugadores */}
                <View
                  style={[
                    styles.proModalSwitch,
                    {
                      marginTop: 4,
                    },
                  ]}
                >
                  <Text style={styles.proModalSwitchLabel}>
                    {t('tacticalBoard.teamSettings.showPhotos') || 'Mostrar fotos'}
                  </Text>
                  <Switch
                    value={showPhotos}
                    onValueChange={(val) => {
                      setShowPhotos(val);
                      // Si se activan fotos, desactivar mostrar posici�n
                      if (val) {
                        setShowPosition(false);
                        if (playerShape === 'jersey') {
                          setPlayerShape('circle');
                          Alert.alert('Fotos no disponibles', photosJerseyMessage);
                        }
                      }
                    }}
                    trackColor={{
                      false: '#ddd',
                      true: '#81b0ff',
                    }}
                    thumbColor={showPhotos ? '#2176ff' : '#f4f3f4'}
                  />
                </View>
                {showPhotos && (
                  <Text
                    style={{
                      fontSize: 10,
                      color: '#888',
                      marginTop: 2,
                      marginLeft: 4,
                      fontStyle: 'italic',
                    }}
                  >
                    {t('tacticalBoard.teamSettings.showPhotosHint') ||
                      'Se mostrar� la foto del jugador en lugar del n�mero y color'}
                  </Text>
                )}

                {/* Diferenciar portero con rayas */}
                <View
                  style={[
                    styles.proModalSwitch,
                    {
                      marginTop: 4,
                    },
                  ]}
                >
                  <Text style={styles.proModalSwitchLabel}>
                    {t('tacticalBoard.teamSettings.differentiateGoalkeeper') ||
                      'Diferenciar portero'}
                  </Text>
                  <Switch
                    value={differentiateGoalkeeper}
                    onValueChange={setDifferentiateGoalkeeper}
                    trackColor={{
                      false: '#ddd',
                      true: '#81b0ff',
                    }}
                    thumbColor={differentiateGoalkeeper ? '#2176ff' : '#f4f3f4'}
                    disabled={showPhotos}
                  />
                </View>

                {/* Color de las rayas del portero - solo si differentiateGoalkeeper está activo */}
                {differentiateGoalkeeper && (
                  <View
                    style={[
                      styles.proModalSection,
                      {
                        marginTop: 8,
                      },
                    ]}
                  >
                    <View style={styles.proModalRow}>
                      <Text style={isMobile ? styles.proModalLabelMobile : styles.proModalLabel}>
                        {t('tacticalBoard.teamSettings.goalkeeperStripeColor')}
                      </Text>
                      <TouchableOpacity
                        style={[
                          isMobile ? styles.proModalColorBtnMobile : styles.proModalColorBtn,
                          {
                            backgroundColor: goalkeeperStripeColor,
                            borderWidth: 1,
                            borderColor: goalkeeperStripeColor === '#ffffff' ? '#ccc' : '#e0e0e0',
                          },
                        ]}
                        onPress={() => setStripeColorPickerVisible(true)}
                      />
                    </View>
                  </View>
                )}

                <MiniColorPickerModal
                  visible={stripeColorPickerVisible}
                  initialColor={goalkeeperStripeColor}
                  onClose={() => setStripeColorPickerVisible(false)}
                  onSelect={setGoalkeeperStripeColor}
                />
              </ScrollView>

              {/* Footer */}
              <View style={styles.proModalFooter}>
                <TouchableOpacity
                  style={[styles.proModalBtn, styles.proModalBtnSecondary]}
                  onPress={onClose}
                >
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                    {t('tacticalBoard.editPanel.close') || 'Cerrar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.proModalBtn, styles.proModalBtnPrimary]}
                  onPress={handleApply}
                >
                  <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                    {t('tacticalBoard.editPanel.apply') || 'Aplicar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }
  function TeamPlayersModal({
    visible,
    onClose,
    availablePlayers,
    onSelectPlayer,
    isMobile,
    showPhotos = false,
    setTeamPlayerStyle,
    teamPlayerStyle = {},
  }) {
    const iconSize = isMobile ? 28 : 32;
    const dorsalFontSize = isMobile ? 12 : 14;
    const nameFontSize = isMobile ? 10 : 11;
    const playerColor = teamPlayerStyle?.color || '#2176ff';
    const numberColor = teamPlayerStyle?.numberColor || '#ffffff';
    const hasBib = teamPlayerStyle?.hasBib === true;
    const bibColor = teamPlayerStyle?.bibColor || NEUTRAL_PLAYER_COLORS.bib;
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
                  maxWidth: 340,
                  maxHeight: SCREEN_HEIGHT * 0.8,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.proModalHeader}>
                <View style={styles.proModalHeaderIcon}>
                  <Feather name="user-plus" size={15} color="#2563eb" />
                </View>
                <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                  {t('tacticalBoard.teamPlayersModal.title')}
                </Text>
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

              <View style={styles.teamPlayersPhotoToggle}>
                <Text style={styles.teamPlayersPhotoToggleText}>
                  {t('tacticalBoard.teamSettings.showPhotos') || 'Mostrar fotos'}
                </Text>
                <Switch
                  value={showPhotos}
                  onValueChange={(value) =>
                    setTeamPlayerStyle?.((prev) => ({
                      ...prev,
                      showPhotos: value,
                      showPosition: value ? false : prev.showPosition,
                    }))
                  }
                  trackColor={{
                    false: '#ddd',
                    true: '#81b0ff',
                  }}
                  thumbColor={showPhotos ? '#2176ff' : '#f4f3f4'}
                />
              </View>

              <ScrollView
                contentContainerStyle={styles.proModalBody}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {availablePlayers.length === 0 ? (
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: 20,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#666',
                        fontStyle: 'italic',
                      }}
                    >
                      {t('tacticalBoard.teamPlayersModal.noPlayers')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.playersGrid}>
                    {availablePlayers.map((player, index) => (
                      <TouchableOpacity
                        key={player.uniqueId}
                        style={[
                          styles.playerGridItem,
                          {
                            backgroundColor: '#f8f9fa',
                            borderRadius: 8,
                            padding: 8,
                            borderWidth: 1,
                            borderColor: '#e8e8e8',
                          },
                        ]}
                        onPress={() => onSelectPlayer(player)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={{
                            width: iconSize,
                            height: iconSize,
                            borderRadius: iconSize / 2,
                            backgroundColor:
                              showPhotos && player.foto ? 'transparent' : playerColor,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 4,
                            shadowColor: '#000',
                            shadowOffset: {
                              width: 0,
                              height: 1,
                            },
                            shadowOpacity: 0.2,
                            shadowRadius: 2,
                            elevation: 2,
                            borderWidth: showPhotos && player.foto ? 2 : 0,
                            borderColor: playerColor,
                            overflow: 'hidden',
                          }}
                        >
                          {showPhotos && player.foto ? (
                            <Image
                              source={{
                                uri: cdnUrl(player.foto),
                              }}
                              style={{
                                width: iconSize - 4,
                                height: iconSize - 4,
                                borderRadius: (iconSize - 4) / 2,
                              }}
                              resizeMode="cover"
                            />
                          ) : (
                            <>
                              {hasBib && (
                                <View
                                  style={{
                                    position: 'absolute',
                                    top: iconSize * 0.18,
                                    width: iconSize * 0.58,
                                    height: iconSize * 0.64,
                                    borderRadius: 5,
                                    backgroundColor: bibColor,
                                    borderWidth: 1,
                                    borderColor: '#222',
                                  }}
                                />
                              )}
                              <Text
                                style={{
                                  color: numberColor,
                                  fontSize: dorsalFontSize,
                                  fontWeight: 'bold',
                                }}
                              >
                                {player.dorsal || player.number || '?'}
                              </Text>
                            </>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.playerGridName,
                            {
                              fontSize: nameFontSize,
                            },
                          ]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {getPlayerFullName(player) ||
                            player.name ||
                            t('tacticalBoard.teamPlayersModal.noName')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>

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
                    {t('common.close')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // A�adir antes del return principal

  // A�adir antes del return principal
  return {
    LineStyleModal,
    TeamPlayerSettingsModal,
    TeamPlayersModal,
  };
}
