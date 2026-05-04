/**
 * OnboardingTutorial — Interactive Spotlight Tutorial
 *
 * Overlay-based step-by-step tutorial that highlights specific UI areas
 * with a spotlight cutout effect. Uses measureInWindow for pixel-perfect
 * spotlight alignment with the simulated drawer items.
 *
 * Responsive: mobile < 430 | tablet 430–768 | desktop > 768
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config';

// ─────────────────────────────────────────────
// THEME (mirrors mainDrawer)
// ─────────────────────────────────────────────
const THEME = {
  primary: '#1a237e',
  primaryLight: '#3949ab',
  secondary: '#00bcd4',
  accent: '#ff6b35',
  gradient: ['#1a237e', '#3949ab', '#5c6bc0'],
};

// ─────────────────────────────────────────────
// RESPONSIVE HOOK
// ─────────────────────────────────────────────
function useLayout() {
  const [dim, setDim] = useState(() => Dimensions.get('window'));
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDim(window));
    return () => sub?.remove();
  }, []);
  return { ...dim, isMobile: dim.width < 430, isTablet: dim.width >= 430 && dim.width < 768 };
}

// ─────────────────────────────────────────────
// PERSISTENCE HOOK
// ─────────────────────────────────────────────
function useTutorialPersistence() {
  return useCallback(async () => {
    try {
      const str = await AsyncStorage.getItem('usuario');
      if (!str) return;
      const user = JSON.parse(str);
      if (!user?._id) return;
      const token = await AsyncStorage.getItem('token');
      fetch(`${API_URL}/user/${user._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tutorialCompleto: true }),
      }).catch(() => {});
      await AsyncStorage.setItem('usuario', JSON.stringify({ ...user, tutorialCompleto: true }));
    } catch {
      // never block app
    }
  }, []);
}

// ─────────────────────────────────────────────
// TUTORIAL STEPS — ALL sections
// ─────────────────────────────────────────────
function useTutorialSteps() {
  const { t } = useTranslation();

  return useMemo(() => [
    // 0 — Welcome (fullscreen)
    {
      id: 'welcome', type: 'fullscreen',
      icon: 'rocket-launch', iconLib: MaterialIcons, color: '#6366f1',
      gradient: ['#4f46e5', '#6366f1', '#818cf8'],
      title: t('tutorial.steps.welcome.title'),
      description: t('tutorial.steps.welcome.description'),
      bullets: [t('tutorial.steps.welcome.b1'), t('tutorial.steps.welcome.b2'), t('tutorial.steps.welcome.b3'), t('tutorial.steps.welcome.b4')],
      tip: t('tutorial.steps.welcome.tip'),
    },
    // 1 — Drawer overview
    {
      id: 'drawer', type: 'spotlight',
      icon: 'menu', iconLib: MaterialIcons, color: THEME.primary,
      title: t('tutorial.drawer.title'),
      description: t('tutorial.drawer.description'),
      spotlightArea: 'drawer',
    },
    // 2 — Home
    {
      id: 'home', type: 'spotlight',
      icon: 'home', iconLib: MaterialIcons, color: '#1a237e',
      title: t('tutorial.steps.home.title'),
      description: t('tutorial.steps.home.description'),
      tip: t('tutorial.steps.home.tip'),
      spotlightArea: 'menuItem', menuIndex: 0,
    },
    // 3 — Season
    {
      id: 'season', type: 'spotlight',
      icon: 'calendar-month', iconLib: MaterialCommunityIcons, color: '#f97316',
      title: t('tutorial.steps.season.title'),
      description: t('tutorial.steps.season.description'),
      tip: t('tutorial.steps.season.tip'),
      spotlightArea: 'menuItem', menuIndex: 1,
    },
    // 4 — Tournaments
    {
      id: 'tournaments', type: 'spotlight',
      icon: 'emoji-events', iconLib: MaterialIcons, color: '#f59e0b',
      title: t('tutorial.steps.tournaments.title'),
      description: t('tutorial.steps.tournaments.description'),
      tip: t('tutorial.steps.tournaments.tip'),
      spotlightArea: 'menuItem', menuIndex: 2,
    },
    // 5 — Players
    {
      id: 'players', type: 'spotlight',
      icon: 'people', iconLib: MaterialIcons, color: '#10b981',
      title: t('tutorial.steps.players.title'),
      description: t('tutorial.steps.players.description'),
      tip: t('tutorial.steps.players.tip'),
      spotlightArea: 'menuItem', menuIndex: 3,
    },
    // 6 — Tactical Board
    {
      id: 'tacticalBoard', type: 'spotlight',
      icon: 'clipboard-outline', iconLib: Ionicons, color: '#8b5cf6',
      title: t('tutorial.steps.tacticalBoard.title'),
      description: t('tutorial.steps.tacticalBoard.description'),
      tip: t('tutorial.steps.tacticalBoard.tip'),
      spotlightArea: 'menuItem', menuIndex: 4,
    },
    // 7 — Exercises
    {
      id: 'exercises', type: 'spotlight',
      icon: 'fitness-center', iconLib: MaterialIcons, color: '#3b82f6',
      title: t('tutorial.steps.exercises.title'),
      description: t('tutorial.steps.exercises.description'),
      tip: t('tutorial.steps.exercises.tip'),
      spotlightArea: 'menuItem', menuIndex: 5,
    },
    // 8 — Strategies
    {
      id: 'strategies', type: 'spotlight',
      icon: 'strategy', iconLib: MaterialCommunityIcons, color: '#a855f7',
      title: t('tutorial.steps.strategies.title'),
      description: t('tutorial.steps.strategies.description'),
      tip: t('tutorial.steps.strategies.tip'),
      spotlightArea: 'menuItem', menuIndex: 6,
    },
    // 9 — My Videos
    {
      id: 'videos', type: 'spotlight',
      icon: 'videocam', iconLib: Ionicons, color: '#ef4444',
      title: t('tutorial.steps.videos.title'),
      description: t('tutorial.steps.videos.description'),
      tip: t('tutorial.steps.videos.tip'),
      spotlightArea: 'menuItem', menuIndex: 7,
    },
    // 10 — Methodology
    {
      id: 'methodology', type: 'spotlight',
      icon: 'library-books', iconLib: MaterialIcons, color: '#06b6d4',
      title: t('tutorial.steps.methodology.title'),
      description: t('tutorial.steps.methodology.description'),
      tip: t('tutorial.steps.methodology.tip'),
      spotlightArea: 'menuItem', menuIndex: 8,
    },
    // 11 — Goalkeeper Methodology
    {
      id: 'goalkeeperMethodology', type: 'spotlight',
      icon: 'sports-handball', iconLib: MaterialIcons, color: '#0ea5e9',
      title: t('tutorial.steps.goalkeeperMethodology.title'),
      description: t('tutorial.steps.goalkeeperMethodology.description'),
      tip: t('tutorial.steps.goalkeeperMethodology.tip'),
      spotlightArea: 'menuItem', menuIndex: 9,
    },
    // 12 — Training
    {
      id: 'training', type: 'spotlight',
      icon: 'timer', iconLib: MaterialIcons, color: '#f97316',
      title: t('tutorial.steps.training.title'),
      description: t('tutorial.steps.training.description'),
      tip: t('tutorial.steps.training.tip'),
      spotlightArea: 'menuItem', menuIndex: 10,
    },
    // 13 — Wellness
    {
      id: 'wellness', type: 'spotlight',
      icon: 'favorite', iconLib: MaterialIcons, color: '#ec4899',
      title: t('tutorial.steps.wellness.title'),
      description: t('tutorial.steps.wellness.description'),
      tip: t('tutorial.steps.wellness.tip'),
      spotlightArea: 'menuItem', menuIndex: 11,
    },
    // 14 — Rivals
    {
      id: 'rivals', type: 'spotlight',
      icon: 'shield', iconLib: Ionicons, color: '#14b8a6',
      title: t('tutorial.steps.rivals.title'),
      description: t('tutorial.steps.rivals.description'),
      tip: t('tutorial.steps.rivals.tip'),
      spotlightArea: 'menuItem', menuIndex: 12,
    },
    // 15 — Match Sheets
    {
      id: 'matchSheets', type: 'spotlight',
      icon: 'description', iconLib: MaterialIcons, color: '#64748b',
      title: t('tutorial.steps.matchSheets.title'),
      description: t('tutorial.steps.matchSheets.description'),
      tip: t('tutorial.steps.matchSheets.tip'),
      spotlightArea: 'menuItem', menuIndex: 13,
    },
    // 16 — Injuries
    {
      id: 'injuries', type: 'spotlight',
      icon: 'medical-services', iconLib: MaterialIcons, color: '#ef4444',
      title: t('tutorial.steps.injuries.title'),
      description: t('tutorial.steps.injuries.description'),
      tip: t('tutorial.steps.injuries.tip'),
      spotlightArea: 'menuItem', menuIndex: 14,
    },
    // 17 — Rival Analysis
    {
      id: 'rivalAnalysis', type: 'spotlight',
      icon: 'analytics', iconLib: Ionicons, color: '#8b5cf6',
      title: t('tutorial.steps.rivalAnalysis.title'),
      description: t('tutorial.steps.rivalAnalysis.description'),
      tip: t('tutorial.steps.rivalAnalysis.tip'),
      spotlightArea: 'menuItem', menuIndex: 15,
    },
    // 18 — Anthropometry
    {
      id: 'anthropometry', type: 'spotlight',
      icon: 'body', iconLib: Ionicons, color: '#f59e0b',
      title: t('tutorial.steps.anthropometry.title'),
      description: t('tutorial.steps.anthropometry.description'),
      tip: t('tutorial.steps.anthropometry.tip'),
      spotlightArea: 'menuItem', menuIndex: 16,
    },
    // 19 — Statistics
    {
      id: 'statistics', type: 'spotlight',
      icon: 'bar-chart', iconLib: Ionicons, color: '#3b82f6',
      title: t('tutorial.steps.statistics.title'),
      description: t('tutorial.steps.statistics.description'),
      tip: t('tutorial.steps.statistics.tip'),
      spotlightArea: 'menuItem', menuIndex: 17,
    },
    // 20 — Nutrition
    {
      id: 'nutrition', type: 'spotlight',
      icon: 'nutrition', iconLib: Ionicons, color: '#10b981',
      title: t('tutorial.steps.nutrition.title'),
      description: t('tutorial.steps.nutrition.description'),
      tip: t('tutorial.steps.nutrition.tip'),
      spotlightArea: 'menuItem', menuIndex: 18,
    },
    // 21 — Injury Prevention
    {
      id: 'injuryPrevention', type: 'spotlight',
      icon: 'shield-checkmark', iconLib: Ionicons, color: '#ef4444',
      title: t('tutorial.steps.injuryPrevention.title'),
      description: t('tutorial.steps.injuryPrevention.description'),
      tip: t('tutorial.steps.injuryPrevention.tip'),
      spotlightArea: 'menuItem', menuIndex: 19,
    },
    // 22 — All Set (fullscreen)
    {
      id: 'ready', type: 'fullscreen',
      icon: 'check-circle', iconLib: MaterialIcons, color: '#10b981',
      gradient: ['#047857', '#059669', '#10b981'],
      title: t('tutorial.steps.ready.title'),
      description: t('tutorial.steps.ready.description'),
    },
  ], [t]);
}

// ─────────────────────────────────────────────
// SPOTLIGHT OVERLAY — 4-rect mask approach
// ─────────────────────────────────────────────
const SpotlightOverlay = React.memo(({ spotRect, opacity }) => {
  if (!spotRect) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.75)', opacity }]} />
      </View>
    );
  }

  const { x, y, w, h } = spotRect;
  const c = 'rgba(0,0,0,0.75)';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: y, backgroundColor: c, opacity }} />
      <Animated.View style={{ position: 'absolute', top: y + h, left: 0, right: 0, bottom: 0, backgroundColor: c, opacity }} />
      <Animated.View style={{ position: 'absolute', top: y, left: 0, width: x, height: h, backgroundColor: c, opacity }} />
      <Animated.View style={{ position: 'absolute', top: y, left: x + w, right: 0, height: h, backgroundColor: c, opacity }} />
      {/* Glow border */}
      <View style={{
        position: 'absolute', top: y - 3, left: x - 3, width: w + 6, height: h + 6,
        borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
      }} />
    </View>
  );
});

// ─────────────────────────────────────────────
// TOOLTIP CARD — floating card near spotlight
// ─────────────────────────────────────────────
const TooltipCard = React.memo(({ step, spotRect, screenWidth, screenHeight, insets, isMobile, onNext, onBack, onSkip, isFirst, isLast, currentIndex, totalSteps, t }) => {
  const IconLib = step.iconLib;

  // Card position logic
  let cardStyle;
  const cardWidth = isMobile ? screenWidth - 32 : Math.min(380, screenWidth - 48);

  if (spotRect) {
    const spaceRight = screenWidth - (spotRect.x + spotRect.w);
    const spaceBelow = screenHeight - (spotRect.y + spotRect.h);
    const spaceAbove = spotRect.y;

    if (spaceRight > cardWidth + 24) {
      cardStyle = {
        position: 'absolute',
        left: spotRect.x + spotRect.w + 16,
        top: Math.max(insets.top + 10, Math.min(spotRect.y - 20, screenHeight - 380)),
        width: cardWidth,
      };
    } else if (spaceBelow > 240) {
      cardStyle = {
        position: 'absolute',
        left: isMobile ? 16 : Math.max(16, spotRect.x),
        top: spotRect.y + spotRect.h + 16,
        width: cardWidth,
      };
    } else if (spaceAbove > 240) {
      cardStyle = {
        position: 'absolute',
        left: isMobile ? 16 : Math.max(16, spotRect.x),
        bottom: screenHeight - spotRect.y + 16,
        width: cardWidth,
      };
    } else {
      cardStyle = {
        position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 20,
      };
    }
  } else {
    cardStyle = {
      position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 20,
    };
  }

  return (
    <View style={[styles.tooltipCard, cardStyle]} pointerEvents="box-none">
      <View style={styles.tooltipInner}>
        {/* Header */}
        <View style={styles.tooltipHeader}>
          <View style={[styles.tooltipIconCircle, { backgroundColor: step.color || THEME.primary }]}>
            <IconLib name={step.icon} size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.tooltipTitle} numberOfLines={2}>{step.title}</Text>
          </View>
          <View style={styles.tooltipCounter}>
            <Text style={styles.tooltipCounterText}>{currentIndex + 1}/{totalSteps}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.tooltipDescription}>{step.description}</Text>

        {/* Tip */}
        {step.tip && (
          <View style={styles.tooltipTip}>
            <MaterialIcons name="lightbulb-outline" size={14} color="#fbbf24" style={{ marginRight: 6 }} />
            <Text style={styles.tooltipTipText}>{step.tip}</Text>
          </View>
        )}

        {/* Navigation */}
        <View style={styles.tooltipNav}>
          {!isFirst ? (
            <TouchableOpacity style={styles.tooltipBackBtn} onPress={onBack} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={18} color={THEME.primary} />
              <Text style={styles.tooltipBackText}>{t('tutorial.back')}</Text>
            </TouchableOpacity>
          ) : <View />}

          <View style={styles.tooltipNavRight}>
            {!isLast && (
              <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={styles.tooltipSkipBtn}>
                <Text style={styles.tooltipSkipText}>{t('tutorial.skip')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.tooltipNextBtn, { backgroundColor: isLast ? '#10b981' : THEME.primary }]}
              onPress={onNext}
              activeOpacity={0.7}
            >
              <Text style={styles.tooltipNextText}>
                {isLast ? t('tutorial.start') : t('tutorial.next')}
              </Text>
              <MaterialIcons name={isLast ? 'check' : 'arrow-forward'} size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, {
            width: `${((currentIndex + 1) / totalSteps) * 100}%`,
            backgroundColor: step.color || THEME.secondary,
          }]} />
        </View>
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────
// FULLSCREEN STEP — Welcome & Ready
// ─────────────────────────────────────────────
const FullscreenStep = React.memo(({ step, onNext, onBack, onSkip, isFirst, isLast, currentIndex, totalSteps, insets, isMobile, t }) => {
  const IconLib = step.iconLib;
  const iconSize = isMobile ? 90 : 120;

  return (
    <LinearGradient
      colors={step.gradient || THEME.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.fsContainer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
    >
      <ScrollView contentContainerStyle={styles.fsContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.fsIconCircle, { width: iconSize, height: iconSize, borderRadius: iconSize / 2 }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
            style={[styles.fsIconGradient, { borderRadius: iconSize / 2 }]}
          >
            <IconLib name={step.icon} size={iconSize * 0.44} color="#fff" />
          </LinearGradient>
        </View>

        <Text style={[styles.fsTitle, isMobile && styles.fsTitleMobile]}>{step.title}</Text>
        <Text style={[styles.fsDesc, isMobile && styles.fsDescMobile]}>{step.description}</Text>

        {step.bullets?.length > 0 && (
          <View style={styles.fsBullets}>
            {step.bullets.map((b, i) => (
              <View key={i} style={styles.fsBulletRow}>
                <MaterialIcons name="check-circle" size={18} color="rgba(255,255,255,0.85)" />
                <Text style={[styles.fsBulletText, isMobile && { fontSize: 14 }]}>{b}</Text>
              </View>
            ))}
          </View>
        )}

        {step.tip && (
          <View style={styles.fsTipBox}>
            <MaterialIcons name="lightbulb-outline" size={16} color="#fde68a" />
            <Text style={styles.fsTipText}>{step.tip}</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.fsFooter, isMobile && { paddingHorizontal: 20 }]}>
        <View style={styles.fsProgressRow}>
          <View style={styles.fsProgressBg}>
            <View style={[styles.fsProgressFill, { width: `${((currentIndex + 1) / totalSteps) * 100}%` }]} />
          </View>
          <Text style={styles.fsProgressText}>{currentIndex + 1}/{totalSteps}</Text>
        </View>

        <View style={styles.fsButtonsRow}>
          {!isFirst ? (
            <TouchableOpacity style={styles.fsBackBtn} onPress={onBack} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          ) : <View style={{ width: 48 }} />}

          {!isLast && (
            <TouchableOpacity onPress={onSkip} activeOpacity={0.7}>
              <Text style={styles.fsSkipText}>{t('tutorial.skip')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.fsNextBtn, isLast && styles.fsFinishBtn]}
            onPress={onNext}
            activeOpacity={0.7}
          >
            <Text style={[styles.fsNextText, isLast && { color: '#10b981' }]}>
              {isLast ? t('tutorial.start') : t('tutorial.next')}
            </Text>
            <MaterialIcons name={isLast ? 'check' : 'arrow-forward'} size={20} color={isLast ? '#10b981' : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
});

// ─────────────────────────────────────────────
// SIMULATED DRAWER — replica with all 20 menu items
// ─────────────────────────────────────────────
const MENU_ITEMS = [
  { icon: 'home', type: 'material', key: 'menu.home' },
  { icon: 'calendar-month', type: 'community', key: 'menu.season' },
  { icon: 'emoji-events', type: 'material', key: 'menu.tournaments' },
  { icon: 'people', type: 'material', key: 'menu.players' },
  { icon: 'clipboard-outline', type: 'ionicons', key: 'menu.tacticalBoard' },
  { icon: 'fitness-center', type: 'material', key: 'menu.exercises' },
  { icon: 'strategy', type: 'community', key: 'menu.strategies' },
  { icon: 'videocam', type: 'ionicons', key: 'menu.myVideos' },
  { icon: 'library-books', type: 'material', key: 'menu.methodology' },
  { icon: 'sports-handball', type: 'material', key: 'menu.goalkeeperMethodology' },
  { icon: 'timer', type: 'material', key: 'menu.training' },
  { icon: 'favorite', type: 'material', key: 'menu.wellness' },
  { icon: 'shield', type: 'ionicons', key: 'menu.rivals' },
  { icon: 'description', type: 'material', key: 'menu.matchSheets' },
  { icon: 'medical-services', type: 'material', key: 'menu.injuries' },
  { icon: 'analytics', type: 'ionicons', key: 'menu.rivalAnalysis' },
  { icon: 'body', type: 'ionicons', key: 'menu.anthropometry' },
  { icon: 'bar-chart', type: 'ionicons', key: 'menu.statistics' },
  { icon: 'nutrition', type: 'ionicons', key: 'menu.nutrition' },
  { icon: 'shield-checkmark', type: 'ionicons', key: 'menu.injuryPrevention' },
];

const SECTION_DIVIDERS = { 4: 'menu.tools', 8: 'menu.management', 14: 'menu.analysis' };
const MENU_ITEM_HEIGHT = 46;
const DIVIDER_HEIGHT = 36;

const SimulatedDrawer = React.memo(({ highlightIndex, isMobile, screenWidth, insetTop, scrollRef, onSpotlightRect }) => {
  const { t } = useTranslation();
  const drawerWidth = isMobile ? Math.min(screenWidth * 0.82, 300) : 300;
  const itemRefs = useRef({});

  // Auto-scroll and measure highlighted item
  useEffect(() => {
    if (highlightIndex < 0) return;

    // Calculate scroll position for the item
    let itemContentY = 0;
    for (let i = 0; i < highlightIndex; i++) {
      if (SECTION_DIVIDERS[i] !== undefined) itemContentY += DIVIDER_HEIGHT;
      itemContentY += MENU_ITEM_HEIGHT;
    }
    if (SECTION_DIVIDERS[highlightIndex] !== undefined) itemContentY += DIVIDER_HEIGHT;

    // Scroll to show the item centered
    const scrollTarget = Math.max(0, itemContentY - 120);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: scrollTarget, animated: false });
    }

    // Measure the exact screen position of the highlighted item
    const timer = setTimeout(() => {
      const ref = itemRefs.current[highlightIndex];
      if (ref) {
        ref.measureInWindow((x, y, w, h) => {
          if (typeof x === 'number' && typeof y === 'number' && w > 0 && h > 0) {
            onSpotlightRect({ x, y, w, h });
          }
        });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [highlightIndex, drawerWidth, insetTop, onSpotlightRect]);

  return (
    <View style={[styles.simDrawer, { width: drawerWidth }]}>
      {/* Drawer header */}
      <LinearGradient
        colors={THEME.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.simDrawerHeader, { paddingTop: Math.max(insetTop, 10) + 10 }]}
      >
        <View style={styles.simAvatarCircle}>
          <Ionicons name="person" size={24} color={THEME.primary} />
        </View>
        <Text style={styles.simDrawerUserText}>{t('tutorial.drawer.yourAccount')}</Text>
      </LinearGradient>

      {/* Menu items */}
      <ScrollView
        ref={scrollRef}
        style={styles.simDrawerScroll}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {MENU_ITEMS.map((item, idx) => {
          const isHl = idx === highlightIndex;
          const Icon = item.type === 'ionicons' ? Ionicons :
            item.type === 'community' ? MaterialCommunityIcons : MaterialIcons;
          const dividerKey = SECTION_DIVIDERS[idx];

          return (
            <React.Fragment key={idx}>
              {dividerKey && (
                <View style={styles.simDivider}>
                  <View style={styles.simDividerLine} />
                  <Text style={styles.simDividerText}>{t(dividerKey)}</Text>
                  <View style={styles.simDividerLine} />
                </View>
              )}
              <View
                ref={el => { itemRefs.current[idx] = el; }}
                style={[styles.simMenuItem, isHl && styles.simMenuItemHl]}
              >
                <View style={[styles.simMenuIconBox, isHl && styles.simMenuIconBoxHl]}>
                  <Icon name={item.icon} size={20} color={isHl ? '#fff' : '#64748b'} />
                </View>
                <Text style={[styles.simMenuLabel, isHl && styles.simMenuLabelHl]} numberOfLines={1}>
                  {t(item.key)}
                </Text>
                {isHl && (
                  <View style={styles.simMenuPulse}>
                    <MaterialIcons name="touch-app" size={18} color={THEME.accent} />
                  </View>
                )}
              </View>
            </React.Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function OnboardingTutorial({ visible, onComplete }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height, isMobile } = useLayout();
  const steps = useTutorialSteps();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const markComplete = useTutorialPersistence();
  const drawerScrollRef = useRef(null);
  const [measuredRect, setMeasuredRect] = useState(null);
  const pendingFadeIn = useRef(false);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setMeasuredRect(null);
    }
  }, [visible]);

  const currentStep = steps[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  const handleSpotlightRect = useCallback((rect) => {
    setMeasuredRect(rect);
  }, []);

  // When measurement arrives and we have a pending fade-in, trigger it
  useEffect(() => {
    if (pendingFadeIn.current && measuredRect) {
      pendingFadeIn.current = false;
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }
  }, [measuredRect, fadeAnim]);

  const animateTransition = useCallback((toIndex) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setMeasuredRect(null);
      setCurrentIndex(toIndex);
      const nextStep = steps[toIndex];
      if (nextStep.type === 'fullscreen' || nextStep.spotlightArea === 'drawer') {
        // No measurement needed, fade in immediately
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      } else {
        // Wait for measurement before fading in
        pendingFadeIn.current = true;
      }
    });
  }, [fadeAnim, steps]);

  const handleNext = useCallback(() => {
    if (isLast) {
      markComplete().then(onComplete);
    } else {
      animateTransition(currentIndex + 1);
    }
  }, [currentIndex, isLast, animateTransition, markComplete, onComplete]);

  const handleBack = useCallback(() => {
    if (!isFirst) animateTransition(currentIndex - 1);
  }, [currentIndex, isFirst, animateTransition]);

  const handleSkip = useCallback(() => {
    markComplete().then(onComplete);
  }, [markComplete, onComplete]);

  if (!visible) return null;

  // Compute spotlight rect using measured position
  const getSpotlightRect = () => {
    if (currentStep.type !== 'spotlight') return null;
    const drawerWidth = isMobile ? Math.min(width * 0.82, 300) : 300;

    if (currentStep.spotlightArea === 'drawer') {
      return { x: 0, y: 0, w: drawerWidth, h: height };
    }

    if (currentStep.spotlightArea === 'menuItem' && measuredRect) {
      return { x: measuredRect.x, y: measuredRect.y, w: measuredRect.w, h: measuredRect.h };
    }
    return null;
  };

  // Fullscreen steps (welcome + ready)
  if (currentStep.type === 'fullscreen') {
    return (
      <Modal visible={visible} animationType="fade" statusBarTranslucent transparent={false}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FullscreenStep
            step={currentStep}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            isFirst={isFirst}
            isLast={isLast}
            currentIndex={currentIndex}
            totalSteps={steps.length}
            insets={insets}
            isMobile={isMobile}
            t={t}
          />
        </Animated.View>
      </Modal>
    );
  }

  // Spotlight steps
  const spotRect = getSpotlightRect();

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent transparent>
      <View style={styles.spotContainer}>
        {/* Simulated drawer + page behind overlay */}
        <Animated.View style={[styles.spotDrawerLayer, { opacity: fadeAnim }]}>
          <SimulatedDrawer
            highlightIndex={currentStep.spotlightArea === 'menuItem' ? currentStep.menuIndex : -1}
            isMobile={isMobile}
            screenWidth={width}
            insetTop={insets.top}
            scrollRef={drawerScrollRef}
            onSpotlightRect={handleSpotlightRect}
          />
          {/* Fake page area */}
          <View style={styles.spotPageArea}>
            <View style={[styles.spotFakeHeader, { paddingTop: insets.top }]}>
              <LinearGradient colors={THEME.gradient} style={StyleSheet.absoluteFill} />
              <View style={styles.spotFakeHeaderRow}>
                <View style={styles.spotFakeMenuBtn}>
                  <MaterialIcons name="menu" size={22} color="#fff" />
                </View>
                <Text style={styles.spotFakeTitle}>MisterData</Text>
                <View style={styles.spotFakeProfileBtn}>
                  <Ionicons name="person" size={16} color={THEME.primary} />
                </View>
              </View>
            </View>
            {/* Fake content placeholders */}
            <View style={styles.spotFakeContent}>
              <View style={styles.spotFakeLine1} />
              <View style={styles.spotFakeLine2} />
              <View style={styles.spotFakeLine3} />
              <View style={styles.spotFakeCard} />
              <View style={styles.spotFakeCard2} />
            </View>
          </View>
        </Animated.View>

        {/* Dark overlay with cutout */}
        <SpotlightOverlay spotRect={spotRect} opacity={fadeAnim} />

        {/* Tooltip */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]} pointerEvents="box-none">
          <TooltipCard
            step={currentStep}
            spotRect={spotRect}
            screenWidth={width}
            screenHeight={height}
            insets={insets}
            isMobile={isMobile}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            isFirst={isFirst}
            isLast={isLast}
            currentIndex={currentIndex}
            totalSteps={steps.length}
            t={t}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Spotlight layout ──
  spotContainer: { flex: 1, backgroundColor: '#f0f2f5' },
  spotDrawerLayer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  spotPageArea: { flex: 1, backgroundColor: '#f8fafc' },
  spotFakeHeader: { overflow: 'hidden' },
  spotFakeHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  spotFakeMenuBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  spotFakeTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  spotFakeProfileBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  spotFakeContent: { padding: 20 },
  spotFakeLine1: { width: '60%', height: 18, borderRadius: 9, backgroundColor: '#e2e8f0', marginBottom: 12 },
  spotFakeLine2: { width: '80%', height: 12, borderRadius: 6, backgroundColor: '#f1f5f9', marginBottom: 8 },
  spotFakeLine3: { width: '45%', height: 12, borderRadius: 6, backgroundColor: '#f1f5f9', marginBottom: 20 },
  spotFakeCard: {
    height: 100, borderRadius: 12, backgroundColor: '#fff', marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  spotFakeCard2: {
    height: 80, borderRadius: 12, backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },

  // ── Tooltip card ──
  tooltipCard: { zIndex: 100 },
  tooltipInner: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20 },
      android: { elevation: 16 },
    }),
  },
  tooltipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tooltipIconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  tooltipTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', lineHeight: 22 },
  tooltipCounter: {
    backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8,
  },
  tooltipCounterText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tooltipDescription: { fontSize: 14, color: '#475569', lineHeight: 21, marginBottom: 8 },
  tooltipTip: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fffbeb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#fbbf24',
  },
  tooltipTipText: { flex: 1, fontSize: 12, color: '#92400e', fontStyle: 'italic', lineHeight: 18 },
  tooltipNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  tooltipNavRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tooltipBackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f1f5f9',
  },
  tooltipBackText: { fontSize: 13, fontWeight: '600', color: THEME.primary },
  tooltipSkipBtn: { paddingVertical: 8, paddingHorizontal: 10 },
  tooltipSkipText: { fontSize: 13, color: '#ffffff', fontWeight: '600' },
  tooltipNextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10,
  },
  tooltipNextText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  progressBarBg: { height: 3, backgroundColor: '#e2e8f0', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  progressBarFill: { height: 3, borderRadius: 2 },

  // ── Simulated drawer ──
  simDrawer: { backgroundColor: '#f8fafc', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  simDrawerHeader: { paddingHorizontal: 20, paddingBottom: 16 },
  simAvatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  simDrawerUserText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  simDrawerScroll: { flex: 1 },
  simDivider: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: DIVIDER_HEIGHT },
  simDividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  simDividerText: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: 10,
  },
  simMenuItem: {
    flexDirection: 'row', alignItems: 'center', height: MENU_ITEM_HEIGHT,
    paddingHorizontal: 14, marginHorizontal: 8, borderRadius: 10,
  },
  simMenuItemHl: {
    backgroundColor: `${THEME.primary}15`, borderWidth: 1.5, borderColor: THEME.primary,
  },
  simMenuIconBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  simMenuIconBoxHl: { backgroundColor: THEME.primary },
  simMenuLabel: { flex: 1, fontSize: 14, color: '#64748b', fontWeight: '500' },
  simMenuLabelHl: { color: THEME.primary, fontWeight: '700' },
  simMenuPulse: { marginLeft: 4 },

  // ── Fullscreen step ──
  fsContainer: { flex: 1 },
  fsContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, maxWidth: 520, alignSelf: 'center', width: '100%',
  },
  fsIconCircle: {
    marginBottom: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  fsIconGradient: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  fsTitle: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 14, letterSpacing: 0.3 },
  fsTitleMobile: { fontSize: 23 },
  fsDesc: { fontSize: 16, color: 'rgba(255,255,255,0.92)', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  fsDescMobile: { fontSize: 14, lineHeight: 21 },
  fsBullets: {
    width: '100%', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 14, padding: 16, marginBottom: 14,
  },
  fsBulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  fsBulletText: { flex: 1, fontSize: 15, color: 'rgba(255,255,255,0.92)', lineHeight: 22 },
  fsTipBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderLeftWidth: 3, borderLeftColor: '#fde68a', gap: 8,
  },
  fsTipText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', lineHeight: 19 },
  fsFooter: { paddingHorizontal: 28, paddingBottom: 8 },
  fsProgressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  fsProgressBg: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  fsProgressFill: { height: 4, backgroundColor: '#fff', borderRadius: 2 },
  fsProgressText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  fsButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fsBackBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  fsSkipText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  fsNextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  fsFinishBtn: { backgroundColor: '#fff', borderColor: '#fff' },
  fsNextText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
