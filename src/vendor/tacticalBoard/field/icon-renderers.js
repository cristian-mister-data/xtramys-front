import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Image, ScrollView, Modal, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import Svg, {
  Path,
  Polygon,
  Rect,
  Circle,
  G,
  Defs,
  ClipPath,
  Text as SvgText,
  Mask,
} from 'react-native-svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getPlayerFullName } from '@/components/player/playerHelpers';
import { deltaToRatio, isOutsideVisibleField, areAllPointsOutside } from '../fields';
import { cdnUrl } from '@/config';
import { styles } from './styles';
import {
  BallImage,
  BarrierImage,
  ConeFlatImage,
  ConeProImage,
  DummyImage,
  GoalImage,
  GoalLargeImage,
  GoalSmallImage,
  PoleImage,
  RingImage,
  TouchableOpacity,
  WeightsImage,
  boardInteractionState,
  noTextSelectionStyle,
} from './primitives';
import {
  NEUTRAL_PLAYER_COLORS,
  acquireBoardDrag,
  isBoardDragOwner,
  isNeutralPlayerIcon,
  isValidHexColor,
  releaseBoardDrag,
} from './config';
import { ALLOW_MULTI_ELEMENT_DRAG, isBoardCloneOutsideForDelete } from './geometry';
export function FieldCarouselModal({
  visible,
  FIELD_IMAGES,
  carouselIndex,
  setCarouselIndex,
  handleFieldChangeFromCarousel,
  closeCarouselModal,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
}) {
  const { t } = useTranslation();
  const isMobile = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) < 768;
  if (!visible) return null;
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={closeCarouselModal}
      statusBarTranslucent={true}
    >
      <SafeAreaView
        style={{
          flex: 1,
        }}
      >
        <View style={styles.proModalOverlay}>
          <View
            style={[
              styles.proModalContainer,
              {
                width: isMobile
                  ? Math.min(SCREEN_WIDTH * 0.65, 280)
                  : Math.min(SCREEN_WIDTH * 0.9, 420),
                maxHeight: SCREEN_HEIGHT * 0.8,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.proModalHeader}>
              <View style={styles.proModalHeaderIcon}>
                <Text
                  style={{
                    fontSize: 16,
                  }}
                >
                  🏟️
                </Text>
              </View>
              <Text style={isMobile ? styles.proModalTitleMobile : styles.proModalTitle}>
                {t('field.selectField')}
              </Text>
              <TouchableOpacity style={styles.proModalCloseBtn} onPress={closeCarouselModal}>
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

            <ScrollView contentContainerStyle={styles.proModalBody}>
              {FIELD_IMAGES.map((field, idx) => (
                <TouchableOpacity
                  key={field.id}
                  style={[
                    styles.proModalCard,
                    {
                      padding: 14,
                      marginBottom: 8,
                    },
                    carouselIndex === idx && {
                      backgroundColor: '#e8f4ff',
                      borderColor: '#2176ff',
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setCarouselIndex(idx)}
                >
                  <Text
                    style={[
                      {
                        fontSize: 15,
                        color: '#333',
                      },
                      carouselIndex === idx && {
                        fontWeight: '600',
                        color: '#2176ff',
                      },
                    ]}
                  >
                    {t(`field.images.${field.id}`) || field.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Footer */}
            <View style={styles.proModalFooter}>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnSecondary]}
                onPress={closeCarouselModal}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextSecondary]}>
                  {t('tacticalBoard.formationModal.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proModalBtn, styles.proModalBtnPrimary]}
                onPress={() => handleFieldChangeFromCarousel(carouselIndex)}
              >
                <Text style={[styles.proModalBtnText, styles.proModalBtnTextPrimary]}>
                  {t('tacticalBoard.formationModal.select')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
export function renderIconCanvas(
  icon,
  size = 24,
  rotation = 0,
  number = undefined,
  playersWithNumber = true,
  displayLabel = undefined,
  numberColor = '#ffffff',
  isGoalkeeper = false,
  differentiateGoalkeeper = true,
  goalkeeperStripeColor = '#ffffff',
  showPhotos = false,
  photoUrl = null,
) {
  const color = isValidHexColor(icon.color) ? icon.color : '#000000';
  const style = rotation
    ? {
        transform: [
          {
            rotate: `${rotation}deg`,
          },
        ],
      }
    : undefined;
  const halfSize = size / 2;
  const isNeutral = isNeutralPlayerIcon(icon);
  const hasBib = icon.hasBib !== undefined ? icon.hasBib : isNeutral;
  const bibColor = icon.bibColor || (isNeutral ? color : NEUTRAL_PLAYER_COLORS.bib);
  const neutralBackgroundColor = icon.backgroundColor || NEUTRAL_PLAYER_COLORS.background;
  const playerShape = icon.shape || 'circle';
  const isJersey = playerShape === 'jersey';
  const hasPlayerStripes = icon.hasStripes === true;
  const playerStripeColor = icon.stripeColor || '#ffffff';
  const jerseyPath =
    'M35,10 Q50,20 65,10 L82,20 L95,42 L78,54 L70,45 L70,90 L30,90 L30,45 L22,54 L5,42 L18,20 Z';
  const clipId = `player-shape-${String(icon.id || icon.idBase || icon.paletteIndex || 'preview').replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  // Determinar qu mostrar: displayLabel (posicin) o number
  const displayText = displayLabel !== undefined ? displayLabel : isNeutral ? 'N' : number;
  const drawGoalkeeperVerticalStripes = isGoalkeeper && differentiateGoalkeeper;
  const drawPlayerVerticalStripes = hasPlayerStripes && !drawGoalkeeperVerticalStripes;
  const drawVerticalStripes = drawPlayerVerticalStripes || drawGoalkeeperVerticalStripes;
  const verticalStripeColor = drawPlayerVerticalStripes
    ? playerStripeColor
    : goalkeeperStripeColor || '#ffffff';
  const goalkeeperStripeColorValue = goalkeeperStripeColor || '#ffffff';
  const isPositionLabel = displayLabel !== undefined;
  const textColor = icon.numberColor || numberColor;
  const baseFontSize = isPositionLabel
    ? Math.max(10, size * 0.45)
    : String(displayText).length > 2
      ? size * 0.4
      : size * 0.6;
  const fontSize = isJersey ? Math.max(8, baseFontSize * 0.72) : baseFontSize;

  // Determinar si mostrar rayas de portero
  const showGoalkeeperStripes = isGoalkeeper && differentiateGoalkeeper && !showPhotos;

  // Determinar si mostrar foto (solo si showPhotos est� activo y hay foto)
  const shouldShowPhoto = showPhotos && photoUrl;
  const nonSelectableWebStyle =
    Platform.OS === 'web'
      ? {
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          touchAction: 'none',
          cursor: 'default',
        }
      : {};
  switch (icon.type) {
    case 'player':
      if (!shouldShowPhoto) {
        const strokeColor = '#222';
        const strokeWidth = 1;
        const textValue = displayText === undefined ? '' : String(displayText);
        return (
          <View
            style={[
              {
                width: size,
                height: size,
                borderRadius: isJersey ? 0 : halfSize,
                overflow: 'hidden',
                ...nonSelectableWebStyle,
              },
              style,
            ]}
            onContextMenu={(e) => e?.preventDefault?.()}
          >
            <Svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              style={nonSelectableWebStyle}
            >
              <Defs>
                <ClipPath id={clipId}>
                  {isJersey ? (
                    <Path d={jerseyPath} transform={`scale(${size / 100})`} />
                  ) : (
                    <Circle cx={halfSize} cy={halfSize} r={Math.max(0, halfSize)} />
                  )}
                </ClipPath>
                {hasBib && !isJersey && (
                  <Mask id={`bib-mask-${clipId}`}>
                    <Circle cx={halfSize} cy={halfSize} r={halfSize} fill="white" />
                    <Circle cx={halfSize} cy={-size * 0.06} r={size * 0.18} fill="black" />
                    <Circle cx={-size * 0.06} cy={halfSize} r={size * 0.2} fill="black" />
                    <Circle cx={size * 1.06} cy={halfSize} r={size * 0.2} fill="black" />
                  </Mask>
                )}
              </Defs>
              {/* 1. Base player body */}
              {isNeutral ? (
                isJersey ? (
                  <Path
                    d={jerseyPath}
                    transform={`scale(${size / 100})`}
                    fill={neutralBackgroundColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                  />
                ) : (
                  <Circle
                    cx={halfSize}
                    cy={halfSize}
                    r={Math.max(0, halfSize - strokeWidth / 2)}
                    fill={neutralBackgroundColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                  />
                )
              ) : isJersey ? (
                <Path
                  d={jerseyPath}
                  transform={`scale(${size / 100})`}
                  fill={color}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                />
              ) : (
                <Circle
                  cx={halfSize}
                  cy={halfSize}
                  r={Math.max(0, halfSize - strokeWidth / 2)}
                  fill={color}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                />
              )}

              {/* 2. Stripes (underneath the bib) */}
              {drawVerticalStripes && (
                <>
                  {[-0.22, 0, 0.22].map((offset) => (
                    <Rect
                      key={`player-stripe-${offset}`}
                      x={halfSize + size * offset - size * 0.06}
                      y={0}
                      width={Math.max(2, size * 0.12)}
                      height={size}
                      fill={verticalStripeColor}
                      opacity={0.9}
                      clipPath={`url(#${clipId})`}
                    />
                  ))}
                </>
              )}
              {/* 3. Bib (Peto) on top of the base body and stripes */}
              {hasBib &&
                (isJersey ? (
                  <G clipPath={`url(#${clipId})`}>
                    <Path
                      d="M38,12 Q50,24 62,12 L70,16 Q66,32 66,48 L66,82 L34,82 L34,48 Q34,32 30,16 Z"
                      transform={`scale(${size / 100})`}
                      fill={bibColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      opacity={0.8}
                    />
                  </G>
                ) : (
                  <>
                    <Circle
                      cx={halfSize}
                      cy={halfSize}
                      r={Math.max(0, halfSize - strokeWidth / 2)}
                      fill={bibColor}
                      mask={`url(#bib-mask-${clipId})`}
                      opacity={0.8}
                    />
                    <G clipPath={`url(#${clipId})`}>
                      <Circle
                        cx={halfSize}
                        cy={-size * 0.06}
                        r={size * 0.18}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                      />
                      <Circle
                        cx={-size * 0.06}
                        cy={halfSize}
                        r={size * 0.2}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                      />
                      <Circle
                        cx={size * 1.06}
                        cy={halfSize}
                        r={size * 0.2}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                      />
                    </G>
                    <Circle
                      cx={halfSize}
                      cy={halfSize}
                      r={Math.max(0, halfSize - strokeWidth / 2)}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                    />
                  </>
                ))}
              {(playersWithNumber || isNeutral) && textValue !== '' && (
                <SvgText
                  x={halfSize}
                  y={(isJersey ? size * 0.56 : halfSize) + fontSize * 0.35}
                  fill={textColor}
                  fontSize={fontSize}
                  fontWeight={isPositionLabel ? '600' : '700'}
                  fontFamily="Arial, Helvetica, sans-serif"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {textValue}
                </SvgText>
              )}
            </Svg>
          </View>
        );
      }
      return (
        <View
          style={[
            {
              width: size,
              height: size,
              borderRadius: halfSize,
              backgroundColor: shouldShowPhoto ? 'transparent' : color,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: shouldShowPhoto ? 2 : 1,
              borderColor: shouldShowPhoto ? color : '#222',
              overflow: 'hidden',
              ...nonSelectableWebStyle,
            },
            style,
          ]}
          onContextMenu={(e) => e?.preventDefault?.()}
        >
          {/* Foto del jugador si est� activo */}
          {shouldShowPhoto && (
            <Image
              source={{
                uri: photoUrl,
              }}
              style={{
                width: size - 4,
                height: size - 4,
                borderRadius: (size - 4) / 2,
              }}
              resizeMode="cover"
            />
          )}
          {/* Rayas verticales para portero (solo si no hay foto) */}
          {showGoalkeeperStripes && !shouldShowPhoto && (
            <>
              {[-0.22, 0, 0.22].map((offset) => (
                <View
                  key={`goalkeeper-stripe-${offset}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: halfSize + size * offset - Math.max(2, size * 0.06) / 2,
                    width: Math.max(2, size * 0.12),
                    backgroundColor: goalkeeperStripeColorValue,
                    opacity: 0.9,
                  }}
                />
              ))}
            </>
          )}
          {/* N�mero/posici�n solo si no hay foto */}
          {!shouldShowPhoto && playersWithNumber && displayText !== undefined && (
            <Text
              selectable={false}
              style={{
                color: textColor,
                fontWeight: isPositionLabel ? '600' : 'bold',
                fontSize,
                lineHeight: fontSize,
                textAlign: 'center',
                includeFontPadding: false,
                verticalAlign: 'middle',
                ...nonSelectableWebStyle,
                ...(Platform.OS === 'web'
                  ? {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      pointerEvents: 'none',
                    }
                  : {}),
              }}
            >
              {displayText}
            </Text>
          )}
        </View>
      );
    case 'staff':
      // Icono para el cuerpo t�cnico (c�rculo con c�digo)
      const staffDisplayText = icon.displayLabel || 'CT';
      const staffFontSize = String(staffDisplayText).length > 2 ? size * 0.4 : size * 0.5;
      return (
        <View
          style={[
            {
              width: size,
              height: size,
              borderRadius: halfSize,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#666',
            },
            style,
          ]}
        >
          <Text
            style={{
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: staffFontSize,
              lineHeight: staffFontSize,
              textAlign: 'center',
              includeFontPadding: false,
              verticalAlign: 'middle',
              ...(Platform.OS === 'web'
                ? {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }
                : {}),
            }}
          >
            {staffDisplayText}
          </Text>
        </View>
      );
    case 'ball':
      return <BallImage size={size} rotation={rotation} />;
    case 'ball-shadow': {
      const shadowScale = typeof icon.shadowScale === 'number' ? icon.shadowScale : 0.8;
      const shadowOpacity = typeof icon.opacity === 'number' ? icon.opacity : 0.35;
      const baseSize = size * 0.82;
      const shadowW = baseSize * 0.92 * shadowScale;
      const shadowH = baseSize * 0.34 * shadowScale;
      const softOpacity = Math.max(0, shadowOpacity * 0.28);
      const midOpacity = Math.max(0, shadowOpacity * 0.55);
      return (
        <View
          pointerEvents="none"
          style={{
            width: baseSize,
            height: baseSize,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [
              {
                translateX: shadowW * 0.1,
              },
              {
                translateY: shadowH * 0.04,
              },
              {
                rotate: '-8deg',
              },
            ],
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: shadowW,
              height: shadowH,
              borderRadius: shadowH / 2,
              backgroundColor: '#000',
              opacity: softOpacity,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: shadowW * 0.72,
              height: shadowH * 0.7,
              borderRadius: (shadowH * 0.7) / 2,
              backgroundColor: '#000',
              opacity: midOpacity,
            }}
          />
          <View
            style={{
              width: shadowW * 0.42,
              height: shadowH * 0.48,
              borderRadius: (shadowH * 0.48) / 2,
              backgroundColor: '#000',
              opacity: shadowOpacity,
            }}
          />
        </View>
      );
    }
    case 'cone':
      // Cono de f�tbol con base negra y cuerpo naranja
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: size * 0.5,
              borderRightWidth: size * 0.5,
              borderBottomWidth: size * 0.85,
              borderStyle: 'solid',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
          <View
            style={{
              width: size * 0.6,
              height: size * 0.13,
              backgroundColor: '#222',
              borderRadius: size * 0.07,
              marginTop: -2,
            }}
          />
        </View>
      );
    case 'goal':
      return <GoalImage size={size} rotation={rotation} />;
    case 'goal-large':
      return <GoalLargeImage size={size} rotation={rotation} />;
    case 'goal-small':
      return <GoalSmallImage size={size} rotation={rotation} />;
    case 'barrier':
      return <BarrierImage size={size} rotation={rotation} color={color} />;
    case 'dummy':
      return <DummyImage size={size} rotation={rotation} color={color} />;
    case 'pole':
      return <PoleImage size={size} rotation={rotation} color={color} />;
    case 'cone-pro':
      return <ConeProImage size={size} color={color} />;
    case 'cone-flat':
      return <ConeFlatImage size={size} color={color} />;
    case 'ring':
      return <RingImage size={size} color={color} />;
    case 'ladder':
      // Escalera de agilidad - l�neas verticales y horizontales
      return (
        <Svg width={size} height={size * 0.4} style={style}>
          {/* L�nea horizontal superior */}
          <Path d={`M 0,${size * 0.05} H${size}`} stroke={color} strokeWidth={2} />
          {/* L�nea horizontal inferior */}
          <Path d={`M 0,${size * 0.35} H${size}`} stroke={color} strokeWidth={2} />
          {/* L�neas verticales (pelda�os) */}
          {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
            <Path
              key={i}
              d={`M${size * f},${size * 0.05} V${size * 0.35}`}
              stroke={color}
              strokeWidth={2}
            />
          ))}
        </Svg>
      );
    case 'weights':
      return <WeightsImage size={size} color={color} />;
    case 'materials-button':
      // Icono para el bot�n de materiales (cono + valla)
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="construct-outline" size={size * 0.8} color="#000000" />
        </View>
      );
    case 'straight-arrow':
      const arrowLineType = icon.lineType || 'solid';
      const arrowDashArray =
        arrowLineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : undefined;
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={size} height={size}>
            <Path
              d={`M${size * 0.1},${size * 0.5} L${size * 0.65},${size * 0.5}`}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={arrowDashArray}
              fill="none"
              strokeLinecap="round"
            />
            <Polygon
              points={`${size * 0.9},${size * 0.5} ${size * 0.65},${size * 0.3} ${size * 0.65},${size * 0.7}`}
              fill={color}
            />
          </Svg>
        </View>
      );
    case 'straight-line':
      const straightLineType = icon.lineType || 'solid';
      const straightDashArray =
        straightLineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : undefined;
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={size} height={size}>
            <Path
              d={`M${size * 0.1},${size * 0.5} L${size * 0.9},${size * 0.5}`}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={straightDashArray}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
        </View>
      );
    case 'curve-line':
      const curveLineType = icon.lineType || 'solid';
      const curveDashArray =
        curveLineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : undefined;
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={size} height={size}>
            <Path
              d={`M${size * 0.2},${size * 0.5} Q${size * 0.5},${size * 0.2} ${size * 0.8},${size * 0.5}`}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={curveDashArray}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
        </View>
      );
    case 'curve-arrow':
      const curveArrowLineType = icon.lineType || 'solid';
      const curveArrowDashArray =
        curveArrowLineType === 'dotted'
          ? `${icon.dotSize || 2},${icon.dotSpacing || 4}`
          : undefined;
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={size} height={size}>
            <Path
              d={`M${size * 0.2},${size * 0.5} Q${size * 0.5},${size * 0.2} ${size * 0.8},${size * 0.5}`}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={curveArrowDashArray}
              fill="none"
              strokeLinecap="round"
            />
            <Polygon
              points={`${size * 0.9},${size * 0.55} ${size * 0.7},${size * 0.25} ${size * 0.65},${size * 0.55}`}
              fill={color}
            />
          </Svg>
        </View>
      );
    case 'circle':
      const circleLineType = icon.lineType || 'solid';
      const circleDashArray =
        circleLineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : undefined;
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={size} height={size}>
            <Circle
              cx={size * 0.5}
              cy={size * 0.5}
              r={size * 0.35}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={circleDashArray}
              fill={
                icon.fillColor && icon.fillColor !== 'transparent' ? `${icon.fillColor}66` : 'none'
              }
            />
          </Svg>
        </View>
      );
    case 'rectangle':
      const rectLineType = icon.lineType || 'solid';
      const rectDashArray =
        rectLineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : undefined;
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={size} height={size}>
            <Rect
              x={size * 0.15}
              y={size * 0.2}
              width={size * 0.7}
              height={size * 0.6}
              stroke={color}
              strokeWidth={icon.thickness || 1.2}
              strokeDasharray={rectDashArray}
              fill={
                icon.fillColor && icon.fillColor !== 'transparent' ? `${icon.fillColor}66` : 'none'
              }
            />
          </Svg>
        </View>
      );
    case 'custom-shape-button':
      // IMPORTANTE: Este case solo debe usarse en la paleta, NUNCA en el canvas
      if (!icon.inPalette) {
        return null; // No renderizar si no est� expl�citamente marcado como de paleta
      }
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={size} height={size}>
            {/* Icono de l�piz/estrella para representar dibujo libre */}
            <Path
              d={`M${size * 0.5},${size * 0.1} L${size * 0.7},${size * 0.4} L${size * 0.9},${size * 0.45} L${size * 0.7},${size * 0.6} L${size * 0.8},${size * 0.9} L${size * 0.5},${size * 0.7} L${size * 0.2},${size * 0.9} L${size * 0.3},${size * 0.6} L${size * 0.1},${size * 0.45} L${size * 0.3},${size * 0.4} Z`}
              stroke={color}
              strokeWidth={1.2}
              fill="none"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      );
    case 'team-players':
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: size * 0.9,
              height: size * 0.9,
              borderRadius: size * 0.45,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="people" size={size * 0.6} color="#ffffff" />
          </View>
        </View>
      );
    case 'coaching-staff':
      // Icono de cuerpo t�cnico - persona con portapapeles
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: size * 0.9,
              height: size * 0.9,
              borderRadius: size * 0.45,
              backgroundColor: color || '#333333',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="clipboard-account" size={size * 0.55} color="#ffffff" />
          </View>
        </View>
      );
    default:
      return null;
  }
}

// Componente memoizado para renderizar iconos sin parpadeo
export // Componente memoizado para renderizar iconos sin parpadeo
const MemoizedIcon = React.memo(
  ({
    icon,
    size,
    rotation,
    number,
    playersWithNumber,
    displayLabel,
    numberColor,
    isGoalkeeper,
    differentiateGoalkeeper,
    goalkeeperStripeColor,
    showPhotos,
    photoUrl,
  }) => {
    return renderIconCanvas(
      icon,
      size,
      rotation,
      number,
      playersWithNumber,
      displayLabel,
      numberColor,
      isGoalkeeper,
      differentiateGoalkeeper,
      goalkeeperStripeColor,
      showPhotos,
      photoUrl,
    );
  },
  (prevProps, nextProps) => {
    // Solo re-renderizar si cambian las props relevantes
    return (
      prevProps.size === nextProps.size &&
      prevProps.rotation === nextProps.rotation &&
      prevProps.number === nextProps.number &&
      prevProps.icon.color === nextProps.icon.color &&
      prevProps.icon.backgroundColor === nextProps.icon.backgroundColor &&
      prevProps.icon.type === nextProps.icon.type &&
      prevProps.icon.lineType === nextProps.icon.lineType &&
      prevProps.icon.fillColor === nextProps.icon.fillColor &&
      prevProps.icon.thickness === nextProps.icon.thickness &&
      prevProps.icon.dotSize === nextProps.icon.dotSize &&
      prevProps.icon.dotSpacing === nextProps.icon.dotSpacing &&
      prevProps.icon.shape === nextProps.icon.shape &&
      prevProps.icon.hasStripes === nextProps.icon.hasStripes &&
      prevProps.icon.hasBib === nextProps.icon.hasBib &&
      prevProps.icon.bibColor === nextProps.icon.bibColor &&
      prevProps.icon.stripeColor === nextProps.icon.stripeColor &&
      prevProps.icon.isNeutral === nextProps.icon.isNeutral &&
      prevProps.icon._lastUpdate === nextProps.icon._lastUpdate &&
      prevProps.playersWithNumber === nextProps.playersWithNumber &&
      prevProps.displayLabel === nextProps.displayLabel &&
      prevProps.numberColor === nextProps.numberColor &&
      prevProps.icon.numberColor === nextProps.icon.numberColor &&
      prevProps.isGoalkeeper === nextProps.isGoalkeeper &&
      prevProps.differentiateGoalkeeper === nextProps.differentiateGoalkeeper &&
      prevProps.goalkeeperStripeColor === nextProps.goalkeeperStripeColor &&
      prevProps.showPhotos === nextProps.showPhotos &&
      prevProps.photoUrl === nextProps.photoUrl
    );
  },
);

// Componente memoizado completo para cada icono individual
export // Componente memoizado completo para cada icono individual
const DraggableIcon = React.memo(
  ({
    icon,
    idx,
    imageWidth,
    imageHeight,
    selectedCloneId,
    setSelectedCloneId,
    clones,
    setClones,
    dragStart,
    setOptionsMenu,
    saveClonesHistory,
    playersWithNumber,
    scale,
    isMobile,
    drawingStates,
    multiSelectMode,
    selectedCloneIds,
    selectedCloneIdsSet,
    // OPTIMIZACIÓN: Set para b�squeda O(1)
    setSelectedCloneIds,
    cancelSelection,
    selectionInteractionMode,
    differentiateGoalkeeper,
    goalkeeperStripeColor,
    showPhotos,
    onDeleteClone,
    viewMode,
    zoomLevel = 1,
    setDraggingOutside = null,
    setEditingIcon,
    setLeftPanelVisible,
    isSetPieceMode = false,
    onTapPlayerClone = null,
    onUnassignPlayerClone = null,
  }) => {
    const size = icon.size * scale;
    const dragKey = `icon-${icon.id}`;
    let elementW = size;
    let elementH = size;
    if (icon.type === 'goal-large' || icon.type === 'goal') {
      elementH = size * 0.25;
    } else if (icon.type === 'goal-small') {
      elementW = size * 0.75;
      elementH = size * 0.21;
    } else if (icon.type === 'barrier' || icon.type === 'ladder') {
      elementH = size * 0.4;
    } else if (icon.type === 'dummy') {
      elementW = size * 0.5;
    } else if (icon.type === 'pole') {
      elementW = size * 0.3;
    } else if (icon.type === 'weights') {
      elementH = size * 0.5;
    } else if (icon.type === 'cone-flat') {
      elementH = size * 0.5;
    }
    const rafRef = useRef(null);
    const pendingDragUpdateRef = useRef(null);
    const lastUpdateRef = useRef({
      x: 0,
      y: 0,
    });
    const isDragging = useRef(false);
    const isNearDeleteZoneRef = useRef(false);
    const [deleteZoneTick, setDeleteZoneTick] = useState(0); // Solo para forzar re-render visual
    const isNearDeleteZone = isNearDeleteZoneRef.current;
    const setIsNearDeleteZone = useCallback((val) => {
      if (isNearDeleteZoneRef.current !== val) {
        isNearDeleteZoneRef.current = val;
        setDeleteZoneTick((t) => t + 1);
      }
    }, []);
    const scheduleDragUpdate = useCallback(
      (updater) => {
        pendingDragUpdateRef.current = updater;
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
          if (pendingDragUpdateRef.current) {
            setClones(pendingDragUpdateRef.current);
            pendingDragUpdateRef.current = null;
          }
          rafRef.current = null;
        });
      },
      [setClones],
    );

    // Refs para coordinar gestos
    const panRef = useRef(null);
    const tapRef = useRef(null);
    const isDrawingMode =
      drawingStates?.drawingStraightArrow ||
      drawingStates?.drawingStraightLine ||
      drawingStates?.drawingCurveArrow ||
      drawingStates?.drawingCurveLine ||
      drawingStates?.drawingCircle ||
      drawingStates?.drawingRectangle ||
      drawingStates?.drawingCustomShape ||
      drawingStates?.eraserMode;

    // OPTIMIZACIÓN: Usar Set para b�squeda O(1) si est� disponible
    const isSelected = selectedCloneIdsSet
      ? selectedCloneIdsSet.has(icon.id)
      : selectedCloneIds.includes(icon.id);
    const canDrag =
      !icon.locked &&
      !isDrawingMode &&
      (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));

    // En multi-drag, derivar indicador de eliminaci�n de la posici�n actual del elemento
    // En multi-drag, derivar indicador de eliminacin de la posicin actual del elemento
    const isOutsideInMultiDrag =
      ALLOW_MULTI_ELEMENT_DRAG &&
      multiSelectMode &&
      selectionInteractionMode === 'move' &&
      isSelected &&
      (icon.x < 0 || icon.x > imageWidth || icon.y < 0 || icon.y > imageHeight);
    const showDeleteIndicator = isNearDeleteZone || isOutsideInMultiDrag;
    const isSetPiecePlayerPicker = icon.type === 'player' && isSetPieceMode && onTapPlayerClone;

    // Detectar si est fuera del campo visible (zona de eliminacin)
    const checkDeleteZone = useCallback(
      (xRatio, yRatio) => {
        return isOutsideVisibleField(xRatio, yRatio, viewMode, imageWidth, imageHeight);
      },
      [viewMode, imageWidth, imageHeight],
    );

    // Handler para tap - selecciona el elemento
    // Usamos solo State.END para evitar doble disparo
    const handleTap = useCallback(
      (e) => {
        if (e.nativeEvent.state === State.END) {
          // Detectar doble tap al inicio para abrir panel aunque esté bloqueado
          if (
            icon.id === boardInteractionState.tapId &&
            Date.now() - boardInteractionState.tapTime < 300
          ) {
            boardInteractionState.tapTime = 0;
            boardInteractionState.tapId = null;
            setEditingIcon(icon);
            setLeftPanelVisible(true);
            return;
          }
          // Solo seleccionar si no estamos arrastrando
          if (!isDragging.current && !isDrawingMode && !multiSelectMode && !icon.locked) {
            // Marcar el tiempo de selección para proteger contra deselección inmediata
            boardInteractionState.iconSelectionTime = Date.now();
            setSelectedCloneId(icon.id);
            boardInteractionState.tapTime = Date.now();
            boardInteractionState.tapId = icon.id;
          }
        }
      },
      [
        isDrawingMode,
        multiSelectMode,
        icon,
        setSelectedCloneId,
        setEditingIcon,
        setLeftPanelVisible,
      ],
    );

    // Cleanup RAF on unmount
    useEffect(() => {
      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, []);
    return (
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: icon.x - elementW / 2,
          top: icon.y - elementH / 2,
          width: elementW,
          height: elementH,
          zIndex: icon.calculatedZIndex || (icon.locked === true ? 1 : icon.zIndex || 200),
          ...noTextSelectionStyle,
        }}
        onContextMenu={(e) => e?.preventDefault?.()}
      >
        {/* Indicador visual de zona de eliminacion - se renderiza FUERA del wrapper
         escalado/opacado para que sea nitido y completamente visible (mismo
         comportamiento que ahora tiene el texto al sacarse de la pizarra). */}
        {showDeleteIndicator && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -12,
              left: -12,
              right: -12,
              bottom: -12,
              borderRadius: 8,
              borderWidth: 3,
              borderColor: '#e74c3c',
              borderStyle: 'dashed',
              backgroundColor: 'rgba(231, 76, 60, 0.22)',
              zIndex: 99,
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -10,
                right: -10,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: '#e74c3c',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 1,
                },
                shadowOpacity: 0.3,
                shadowRadius: 2,
                elevation: 4,
              }}
            >
              <Feather name="trash-2" size={12} color="#fff" />
            </View>
          </View>
        )}
        <View
          style={{
            flex: 1,
            opacity: showDeleteIndicator ? 0.5 : 1,
            transform: showDeleteIndicator
              ? [
                  {
                    scale: 0.8,
                  },
                ]
              : [],
            ...noTextSelectionStyle,
          }}
          pointerEvents="box-none"
        >
          <TapGestureHandler
            ref={tapRef}
            waitFor={panRef}
            enabled={!isDrawingMode && !icon.locked}
            onHandlerStateChange={handleTap}
          >
            <View
              style={{
                flex: 1,
                ...noTextSelectionStyle,
              }}
              pointerEvents="box-none"
            >
              <PanGestureHandler
                ref={panRef}
                key={dragKey}
                enabled={canDrag}
                shouldCancelWhenOutside={false}
                avgTouches={Platform.OS === 'android'}
                activeOffsetX={[-5, 5]}
                activeOffsetY={[-5, 5]}
                onHandlerStateChange={(e) => {
                  // ACTIVE: El gesto de pan fue reconocido (el dedo se movi� lo suficiente)
                  // Inicializar el arrastre aqu�
                  if (e.nativeEvent.state === State.ACTIVE && !icon.locked && !isDragging.current) {
                    setDraggingOutside?.(false);
                    if (!acquireBoardDrag(dragStart, dragKey)) return;
                    isDragging.current = true;

                    // Si estamos en modo multi-select, cancelar el rect�ngulo de selecci�n
                    if (multiSelectMode && cancelSelection) {
                      cancelSelection();
                    }

                    // Si hay selecci�n m�ltiple y este icono est� en la selecci�n
                    if (
                      ALLOW_MULTI_ELEMENT_DRAG &&
                      multiSelectMode &&
                      isSelected &&
                      clones &&
                      Array.isArray(clones)
                    ) {
                      // Guardar posiciones iniciales de TODOS los elementos seleccionados
                      // Incluyendo iconos (xRatio/yRatio) y l�neas/figuras (points)
                      const initialPositions = {};
                      selectedCloneIds.forEach((id) => {
                        const clone = clones.find((c) => c.id === id);
                        if (clone) {
                          // Para l�neas y figuras, guardar los puntos
                          if (clone.points && Array.isArray(clone.points)) {
                            initialPositions[id] = {
                              points: clone.points.map((p) => ({
                                x: p.x,
                                y: p.y,
                              })),
                            };
                          } else {
                            // Para iconos normales
                            initialPositions[id] = {
                              xRatio: clone.xRatio,
                              yRatio: clone.yRatio,
                            };
                          }
                        }
                      });
                      dragStart.current[dragKey] = {
                        xRatio: icon.xRatio,
                        yRatio: icon.yRatio,
                        id: icon.id,
                        multiSelect: true,
                        selectedIds: [...selectedCloneIds],
                        initialPositions: initialPositions,
                      };
                    } else {
                      dragStart.current[dragKey] = {
                        xRatio: icon.xRatio,
                        yRatio: icon.yRatio,
                        id: icon.id,
                      };
                    }
                    lastUpdateRef.current = {
                      x: icon.xRatio,
                      y: icon.yRatio,
                    };
                  }
                  if (
                    e.nativeEvent.state === State.END ||
                    e.nativeEvent.state === State.CANCELLED ||
                    e.nativeEvent.state === State.FAILED
                  ) {
                    isDragging.current = false;
                    setDraggingOutside?.(false);
                    setIsNearDeleteZone(false); // Resetear indicador visual
                    if (rafRef.current) {
                      cancelAnimationFrame(rafRef.current);
                      rafRef.current = null;
                    }
                    if (pendingDragUpdateRef.current) {
                      setClones(pendingDragUpdateRef.current);
                      pendingDragUpdateRef.current = null;
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
                              outside = areAllPointsOutside(
                                c.points,
                                viewMode,
                                imageWidth,
                                imageHeight,
                              );
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
                          if (toDelete.length > 0 && onDeleteClone) {
                            setTimeout(() => toDelete.forEach((c) => onDeleteClone(c)), 0);
                          }
                          return toDelete.length > 0 ? remaining : prev;
                        });
                      } else {
                        // Single drag: solo eliminar este elemento
                        setClones((prev) => {
                          const currentClone = prev.find((c) => c.id === icon.id);
                          if (currentClone && !currentClone.locked) {
                            const { xRatio, yRatio } = currentClone;
                            if (
                              isOutsideVisibleField(
                                xRatio,
                                yRatio,
                                viewMode,
                                imageWidth,
                                imageHeight,
                              )
                            ) {
                              if (onDeleteClone) {
                                setTimeout(() => onDeleteClone(currentClone), 0);
                              }
                              return prev.filter((c) => c.id !== icon.id);
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
                    !icon.locked &&
                    dragStart.current[dragKey] &&
                    isBoardDragOwner(dragStart, dragKey)
                  ) {
                    const start = dragStart.current[dragKey];
                    // Dividir translaci�n por zoomLevel para compensar la escala del contenedor
                    const { dxRatio: dx, dyRatio: dy } = deltaToRatio(
                      e.nativeEvent.translationX / zoomLevel,
                      e.nativeEvent.translationY / zoomLevel,
                      viewMode,
                      imageWidth,
                      imageHeight,
                    );

                    // Si es arrastre de m�ltiples elementos
                    if (start.multiSelect && start.selectedIds && start.initialPositions) {
                      const anyOutside = start.selectedIds.some((selectedId) => {
                        const initialPos = start.initialPositions[selectedId];
                        if (!initialPos) return false;
                        const candidate =
                          initialPos.points && Array.isArray(initialPos.points)
                            ? {
                                points: initialPos.points.map((pt) => ({
                                  x: pt.x + dx,
                                  y: pt.y + dy,
                                })),
                              }
                            : {
                                xRatio: initialPos.xRatio + dx,
                                yRatio: initialPos.yRatio + dy,
                              };
                        return isBoardCloneOutsideForDelete(
                          candidate,
                          viewMode,
                          imageWidth,
                          imageHeight,
                        );
                      });
                      setDraggingOutside?.(anyOutside);
                      // Actualizar inmediatamente para mejor respuesta
                      scheduleDragUpdate((prev) => {
                        const next = [...prev];
                        start.selectedIds.forEach((selectedId) => {
                          const cloneIndex = next.findIndex((c) => c.id === selectedId);
                          if (cloneIndex !== -1 && !next[cloneIndex].locked) {
                            const initialPos = start.initialPositions[selectedId];
                            if (initialPos) {
                              // Si tiene puntos (l�neas/figuras), mover los puntos
                              if (initialPos.points && Array.isArray(initialPos.points)) {
                                next[cloneIndex] = {
                                  ...next[cloneIndex],
                                  points: initialPos.points.map((pt) => ({
                                    x: pt.x + dx,
                                    y: pt.y + dy,
                                  })),
                                };
                              } else {
                                // Iconos normales: permitir valores fuera de 0-1 para que el elemento pueda salir del campo
                                const newXRatio = initialPos.xRatio + dx;
                                const newYRatio = initialPos.yRatio + dy;
                                next[cloneIndex] = {
                                  ...next[cloneIndex],
                                  xRatio: newXRatio,
                                  yRatio: newYRatio,
                                };
                              }
                            }
                          }
                        });
                        return next;
                      });
                    } else {
                      // Arrastre de un solo elemento - permitir valores fuera de 0-1
                      const newXRatio = start.xRatio + dx;
                      const newYRatio = start.yRatio + dy;

                      // Actualizar indicador visual de zona de eliminaci�n
                      const inDeleteZone = checkDeleteZone(newXRatio, newYRatio);
                      setDraggingOutside?.(inDeleteZone);
                      if (inDeleteZone !== isNearDeleteZone) {
                        setIsNearDeleteZone(inDeleteZone);
                      }
                      if (Platform.OS === 'android') {
                        scheduleDragUpdate((prev) => {
                          const correctIndex = idx;
                          if (correctIndex >= prev.length || prev[correctIndex].id !== icon.id) {
                            const fallbackIndex = prev.findIndex((c) => c.id === icon.id);
                            if (fallbackIndex === -1) return prev;
                            const next = [...prev];
                            next[fallbackIndex] = {
                              ...next[fallbackIndex],
                              xRatio: newXRatio,
                              yRatio: newYRatio,
                            };
                            return next;
                          }
                          const next = [...prev];
                          next[correctIndex] = {
                            ...next[correctIndex],
                            xRatio: newXRatio,
                            yRatio: newYRatio,
                          };
                          return next;
                        });
                      } else {
                        const deltaX = Math.abs(newXRatio - lastUpdateRef.current.x);
                        const deltaY = Math.abs(newYRatio - lastUpdateRef.current.y);
                        if (deltaX < 0.002 && deltaY < 0.002) {
                          return;
                        }
                        lastUpdateRef.current = {
                          x: newXRatio,
                          y: newYRatio,
                        };
                        scheduleDragUpdate((prev) => {
                          const correctIndex = idx;
                          if (correctIndex >= prev.length || prev[correctIndex].id !== icon.id) {
                            const fallbackIndex = prev.findIndex((c) => c.id === icon.id);
                            if (fallbackIndex === -1) return prev;
                            const next = [...prev];
                            next[fallbackIndex] = {
                              ...next[fallbackIndex],
                              xRatio: newXRatio,
                              yRatio: newYRatio,
                            };
                            return next;
                          }
                          const next = [...prev];
                          next[correctIndex] = {
                            ...next[correctIndex],
                            xRatio: newXRatio,
                            yRatio: newYRatio,
                          };
                          return next;
                        });
                      }
                    }
                  }
                }}
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <View
                    pointerEvents={isDrawingMode ? 'none' : 'box-none'}
                    style={{
                      width: elementW,
                      height: elementH,
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...noTextSelectionStyle,
                    }}
                  >
                    {/* Indicador visual de selecci�n m�ltiple */}
                    {/* Indicador visual de seleccin mltiple */}
                    {multiSelectMode && isSelected && (
                      <View
                        style={{
                          position: 'absolute',
                          top: -5,
                          right: -5,
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: '#3498db',
                          justifyContent: 'center',
                          alignItems: 'center',
                          zIndex: 101,
                          borderWidth: 2,
                          borderColor: '#fff',
                        }}
                      >
                        <Feather name="check" size={12} color="#fff" />
                      </View>
                    )}

                    {/* Borde para elementos seleccionados en modo multi-seleccin */}
                    {multiSelectMode && isSelected && (
                      <View
                        style={{
                          position: 'absolute',
                          top: -2,
                          left: -2,
                          right: -2,
                          bottom: -2,
                          borderRadius: size / 2,
                          borderWidth: 2,
                          borderColor: '#3498db',
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    {/* Bot�n de opciones - solo para selecci�n individual o primer elemento de multi-selecci�n */}
                    {selectedCloneId === icon.id && !multiSelectMode && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          e.target.measure((x, y, width, height, pageX, pageY) => {
                            setOptionsMenu({
                              visible: true,
                              position: {
                                x: pageX + width,
                                y: pageY + 40 + height / 2,
                              },
                              iconId: icon.id,
                              canRotate: !!icon.rotatable,
                              hideEdit: icon.type === 'goal',
                            });
                          });
                        }}
                        style={{
                          position: 'absolute',
                          width: isMobile ? 18 : 28,
                          height: isMobile ? 18 : 28,
                          borderRadius: isMobile ? 9 : 14,
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
                          top: isMobile ? -4 : -7,
                          right: isMobile ? -4 : -7,
                        }}
                      >
                        <Feather name="more-vertical" size={isMobile ? 10 : 16} color="#444444" />
                      </TouchableOpacity>
                    )}

                    {selectedCloneId === icon.id && !multiSelectMode && isSetPiecePlayerPicker && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          if (icon.playerData) {
                            onUnassignPlayerClone?.(icon.id);
                          } else {
                            onTapPlayerClone(icon.id);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          width: isMobile ? 18 : 28,
                          height: isMobile ? 18 : 28,
                          borderRadius: isMobile ? 9 : 14,
                          backgroundColor: icon.playerData ? '#fff5f5' : '#eff6ff',
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
                          borderColor: icon.playerData ? '#fecaca' : '#bfdbfe',
                          zIndex: 100,
                          top: isMobile ? -4 : -7,
                          right: isMobile ? 14 : 25,
                        }}
                      >
                        <Feather
                          name={icon.playerData ? 'user-x' : 'user-plus'}
                          size={isMobile ? 10 : 16}
                          color={icon.playerData ? '#dc2626' : '#2563eb'}
                        />
                      </TouchableOpacity>
                    )}

                    <MemoizedIcon
                      icon={icon}
                      size={size}
                      rotation={icon.rotation || 0}
                      number={icon.type === 'player' ? icon.number : undefined}
                      playersWithNumber={playersWithNumber}
                      displayLabel={icon.displayLabel}
                      numberColor={icon.numberColor}
                      isGoalkeeper={
                        icon.preserveVisualStyle
                          ? icon.isGoalkeeper === true
                          : icon.isGoalkeeper ||
                            icon.playerData?.posicion === 'portero' ||
                            icon.playerData?.posicion === 'goalkeeper' ||
                            icon.playerData?.position === 'goalkeeper' ||
                            icon.playerData?.demarcacion === 'POR'
                      }
                      differentiateGoalkeeper={
                        icon.preserveVisualStyle && icon.differentiateGoalkeeper !== undefined
                          ? icon.differentiateGoalkeeper
                          : differentiateGoalkeeper
                      }
                      goalkeeperStripeColor={
                        icon.playerData
                          ? icon.preserveVisualStyle && icon.goalkeeperStripeColor
                            ? icon.goalkeeperStripeColor
                            : goalkeeperStripeColor
                          : icon.goalkeeperStripeColor || goalkeeperStripeColor
                      }
                      showPhotos={
                        (icon.preserveVisualStyle && icon.showPhotos !== undefined
                          ? icon.showPhotos
                          : showPhotos || icon.showPhotos) && icon.playerData
                      }
                      photoUrl={icon.photoUrl || cdnUrl(icon.playerData?.foto || '')}
                    />

                    {icon.playerData && (
                      <Text
                        selectable={false}
                        style={{
                          position: 'absolute',
                          bottom: -22,
                          left: -20,
                          right: -20,
                          textAlign: 'center',
                          fontSize: isMobile ? 8 : 10,
                          color: icon.textColor || '#000',
                          backgroundColor:
                            icon.textBackgroundColor === 'transparent'
                              ? 'transparent'
                              : icon.textBackgroundColor || '#fff',
                          paddingHorizontal: icon.textBackgroundColor === 'transparent' ? 0 : 2,
                          paddingVertical: icon.textBackgroundColor === 'transparent' ? 0 : 1,
                          borderRadius: 4,
                          borderWidth: icon.textBackgroundColor === 'transparent' ? 0 : 1,
                          borderColor: '#ccc',
                          ...noTextSelectionStyle,
                        }}
                      >
                        {getPlayerFullName(icon.playerData) || icon.playerData.name}
                      </Text>
                    )}
                  </View>
                </View>
              </PanGestureHandler>
            </View>
          </TapGestureHandler>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    const icon = prevProps.icon;
    const nextIcon = nextProps.icon;

    // Quick identity check - if same reference, nothing changed
    if (prevProps === nextProps) return true;

    // Comparaci�n ultra-r�pida: solo verificar cambios relevantes
    if (
      prevProps.imageWidth !== nextProps.imageWidth ||
      prevProps.imageHeight !== nextProps.imageHeight ||
      prevProps.scale !== nextProps.scale
    ) {
      return false;
    }

    // ID check first (most common bailout)
    if (icon.id !== nextIcon.id) return false;

    // Position changes - most frequent update
    if (icon.xRatio !== nextIcon.xRatio || icon.yRatio !== nextIcon.yRatio) return false;

    // Lock state
    if (icon.locked !== nextIcon.locked) return false;

    // Selection state - only re-render if selection changed FOR THIS element
    const wasSelected = prevProps.selectedCloneId === icon.id;
    const isSelected = nextProps.selectedCloneId === nextIcon.id;
    if (wasSelected !== isSelected) return false;

    // Multi-select state
    if (prevProps.multiSelectMode !== nextProps.multiSelectMode) return false;
    if (prevProps.selectionInteractionMode !== nextProps.selectionInteractionMode) return false;

    // Multi-select inclusion - use Set lookup for O(1) instead of includes O(n)
    const prevSet = prevProps.selectedCloneIdsSet;
    const nextSet = nextProps.selectedCloneIdsSet;
    const wasMultiSelected = prevSet
      ? prevSet.has(icon.id)
      : prevProps.selectedCloneIds.includes(icon.id);
    const isMultiSelected = nextSet
      ? nextSet.has(icon.id)
      : nextProps.selectedCloneIds.includes(icon.id);
    if (wasMultiSelected !== isMultiSelected) return false;

    // Drawing mode - check if drawing state affects this element
    const prevDrawing = prevProps.drawingStates;
    const nextDrawing = nextProps.drawingStates;
    const wasDrawingMode =
      prevDrawing?.drawingStraightArrow ||
      prevDrawing?.drawingStraightLine ||
      prevDrawing?.drawingCurveArrow ||
      prevDrawing?.drawingCurveLine ||
      prevDrawing?.drawingCircle ||
      prevDrawing?.drawingRectangle ||
      prevDrawing?.drawingCustomShape ||
      prevDrawing?.eraserMode;
    const isDrawingMode =
      nextDrawing?.drawingStraightArrow ||
      nextDrawing?.drawingStraightLine ||
      nextDrawing?.drawingCurveArrow ||
      nextDrawing?.drawingCurveLine ||
      nextDrawing?.drawingCircle ||
      nextDrawing?.drawingRectangle ||
      nextDrawing?.drawingCustomShape ||
      nextDrawing?.eraserMode;
    if (wasDrawingMode !== isDrawingMode) return false;

    // Visual props - SIEMPRE verificar para detectar cambios de "Aplicar a todos"
    if (
      icon.size !== nextIcon.size ||
      icon.color !== nextIcon.color ||
      icon.rotation !== nextIcon.rotation ||
      icon.number !== nextIcon.number ||
      icon.displayLabel !== nextIcon.displayLabel ||
      icon.numberColor !== nextIcon.numberColor ||
      icon.textColor !== nextIcon.textColor ||
      icon.textBackgroundColor !== nextIcon.textBackgroundColor ||
      icon._lastUpdate !== nextIcon._lastUpdate
    )
      return false;

    // Goalkeeper differentiation setting
    if (prevProps.differentiateGoalkeeper !== nextProps.differentiateGoalkeeper) return false;
    if (prevProps.goalkeeperStripeColor !== nextProps.goalkeeperStripeColor) return false;

    // Show photos setting
    if (prevProps.showPhotos !== nextProps.showPhotos) return false;

    // Players with number setting
    if (prevProps.playersWithNumber !== nextProps.playersWithNumber) return false;
    if (
      icon.playerData?._id !== nextIcon.playerData?._id ||
      icon.playerData?.id !== nextIcon.playerData?.id ||
      icon.playerData?.uniqueId !== nextIcon.playerData?.uniqueId ||
      icon.playerData?.nombre !== nextIcon.playerData?.nombre ||
      icon.playerData?.apodo !== nextIcon.playerData?.apodo ||
      icon.playerData?.fullName !== nextIcon.playerData?.fullName ||
      icon.playerData?.name !== nextIcon.playerData?.name ||
      icon.playerData?.foto !== nextIcon.playerData?.foto
    )
      return false;

    // View mode changes affect display coordinates
    if (prevProps.viewMode !== nextProps.viewMode) return false;

    // Display coords (computed from ratioToDisplay)
    if (icon.x !== nextIcon.x || icon.y !== nextIcon.y) return false;
    return true;
  },
);
