// components/StrengthExerciseSelectorModal.js
// Modal para seleccionar ejercicios de fuerza para sesiones de entrenamiento
// Similar a ExerciseSelectorModal pero para ejercicios de fuerza predefinidos
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Image,
  TextInput,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import {
  STRENGTH_CATEGORIES,
  STRENGTH_EXERCISES,
  getStrengthExerciseImage,
  getExercisesBySection,
  getSectionForExercise,
  checkVideoAvailability,
} from '@/data/strengthExercises';
import StrengthExerciseViewer from './StrengthExerciseViewer';

const THEME_DEFAULT = {
  primary: '#3b82f6',
  primaryDark: '#1d4ed8',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  border: '#e2e8f0',
  primarySoft: '#eff6ff',
  primarySoftBorder: '#bfdbfe',
  errorSoft: '#fee2e2',
  errorSoftText: '#dc2626',
  onPrimary: '#ffffff',
};

const buildTheme = (sc) => {
  const c = sc?.colors || {};
  return {
    primary: c.primary || THEME_DEFAULT.primary,
    primaryDark: c.primaryActive || c.primary || THEME_DEFAULT.primaryDark,
    success: c.success || THEME_DEFAULT.success,
    danger: c.error || THEME_DEFAULT.danger,
    warning: c.warning || THEME_DEFAULT.warning,
    textPrimary: c.text || THEME_DEFAULT.textPrimary,
    textSecondary: c.textSecondary || THEME_DEFAULT.textSecondary,
    textMuted: c.textMuted || THEME_DEFAULT.textMuted,
    background: c.background || THEME_DEFAULT.background,
    surface: c.surface || THEME_DEFAULT.surface,
    surfaceAlt: c.surfaceAlt || c.backgroundAlt || THEME_DEFAULT.surfaceAlt,
    border: c.border || THEME_DEFAULT.border,
    primarySoft: c.primarySoft || THEME_DEFAULT.primarySoft,
    primarySoftBorder: c.primarySoft || THEME_DEFAULT.primarySoftBorder,
    errorSoft: c.errorSoft || THEME_DEFAULT.errorSoft,
    errorSoftText: c.errorSoftText || c.error || THEME_DEFAULT.errorSoftText,
    onPrimary: c.onPrimary || THEME_DEFAULT.onPrimary,
  };
};

// Componente tarjeta de ejercicio con verificación de video
const ExerciseCard = ({ exercise, isSelected, onToggle, onView, t, cardWidth, styles, THEME }) => {
  const imageSource = getStrengthExerciseImage(exercise);
  const sectionInfo = getSectionForExercise(exercise);
  const name = t(exercise.i18nKey, exercise.id);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkVideoAvailability(exercise).then(available => {
      if (!cancelled) setHasVideo(available);
    });
    return () => { cancelled = true; };
  }, [exercise.id]);

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }, isSelected && styles.cardSelected]}
      onPress={() => onToggle(exercise.id)}
      onLongPress={() => onView(exercise)}
      activeOpacity={0.7}
    >
      {/* Imagen */}
      <View style={styles.cardImageContainer}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="fitness-outline" size={32} color={THEME.textMuted} />
          </View>
        )}
        {/* Badge de selección */}
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={24} color={THEME.primary} />
          </View>
        )}
        {/* Badge de nivel */}
        <View style={[styles.levelBadge, { backgroundColor: sectionInfo?.section?.color || THEME.primary }]}>
          <Text style={styles.levelBadgeText}>{exercise.level}</Text>
        </View>
        {/* Botón de video - solo si hay video disponible */}
        {hasVideo && (
          <TouchableOpacity
            style={styles.videoBtn}
            onPress={() => onView(exercise)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="play-circle" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{name}</Text>
        {sectionInfo && (
          <Text style={styles.cardSection} numberOfLines={1}>
            {t(sectionInfo.section.i18nKey)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function StrengthExerciseSelectorModal({
  visible,
  onClose,
  selectedIds = [],
  setSelectedIds,
  multiSelect = true,
  onSelectSingle,
}) {
  const { t } = useTranslation();
  const themeSC = useTheme();
  const THEME = useMemo(() => buildTheme(themeSC), [themeSC]);
  const styles = useMemo(() => makeStyles(THEME), [THEME]);
  const { width: screenWidth } = useWindowDimensions();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [viewingExercise, setViewingExercise] = useState(null);
  const flatListRef = useRef(null);

  // Layout responsive: calcular número de columnas y ancho de tarjeta
  const isMobile = screenWidth < 768;
  const numColumns = isMobile ? 2 : screenWidth < 1280 ? 3 : 4;
  const gridPadding = 12;
  const cardGap = 10;
  const cardWidth = (screenWidth - gridPadding * 2 - cardGap * (numColumns - 1)) / numColumns;

  // Secciones disponibles dependiendo de la categoría seleccionada
  const availableSections = useMemo(() => {
    if (!selectedCategory) {
      return STRENGTH_CATEGORIES.flatMap(cat => cat.sections);
    }
    const category = STRENGTH_CATEGORIES.find(c => c.id === selectedCategory);
    return category ? category.sections : [];
  }, [selectedCategory]);

  // Filtrado de ejercicios
  const filteredExercises = useMemo(() => {
    let exercises = [...STRENGTH_EXERCISES];

    // Filtrar por categoría
    if (selectedCategory) {
      const category = STRENGTH_CATEGORIES.find(c => c.id === selectedCategory);
      if (category) {
        const sectionIds = category.sections.map(s => s.id);
        exercises = exercises.filter(ex => sectionIds.includes(ex.section));
      }
    }

    // Filtrar por sección
    if (selectedSection) {
      exercises = exercises.filter(ex => ex.section === selectedSection);
    }

    // Filtrar por búsqueda de texto
    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim();
      exercises = exercises.filter(ex => {
        const name = t(ex.i18nKey, ex.id).toLowerCase();
        const id = ex.id.toLowerCase();
        return name.includes(search) || id.includes(search);
      });
    }

    // Filtrar solo seleccionados
    if (showSelectedOnly) {
      exercises = exercises.filter(ex => selectedIds.includes(ex.id));
    }

    return exercises.sort((a, b) => a.level - b.level);
  }, [selectedCategory, selectedSection, searchText, showSelectedOnly, selectedIds, t]);

  const handleToggle = useCallback(
    (exerciseId) => {
      if (multiSelect) {
        if (typeof setSelectedIds === 'function') {
          setSelectedIds(prev => {
            if (typeof prev === 'function') return prev;
            const newIds = prev.includes(exerciseId)
              ? prev.filter(id => id !== exerciseId)
              : [...prev, exerciseId];
            return newIds;
          });
        }
      } else {
        onSelectSingle?.(exerciseId);
        onClose();
      }
    },
    [multiSelect, setSelectedIds, onSelectSingle, onClose]
  );

  const handleView = useCallback((exercise) => {
    setViewingExercise(exercise);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setSelectedCategory(null);
    setSelectedSection(null);
    setShowSelectedOnly(false);
  }, []);

  const selectedCount = selectedIds.length;

  const renderExercise = useCallback(
    ({ item }) => (
      <ExerciseCard
        exercise={item}
        isSelected={selectedIds.includes(item.id)}
        onToggle={handleToggle}
        onView={handleView}
        t={t}
        cardWidth={cardWidth}
        styles={styles}
        THEME={THEME}
      />
    ),
    [selectedIds, handleToggle, handleView, t, cardWidth, styles, THEME]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerCloseBtn}>
            <Ionicons name="close" size={26} color={THEME.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleArea}>
            <Text style={styles.headerTitle}>{t('strengthExercises.selectExercises')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('strengthExercises.exercisesCount', { count: filteredExercises.length })}
              {selectedCount > 0 && ` • ${selectedCount} ${t('strengthExercises.selected')}`}
            </Text>
          </View>
          {multiSelect && selectedCount > 0 && (
            <TouchableOpacity onPress={onClose} style={styles.confirmBtn}>
              <Ionicons name="checkmark" size={22} color={THEME.onPrimary} />
              <Text style={styles.confirmBtnText}>{selectedCount}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={THEME.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('strengthExercises.searchPlaceholder')}
            placeholderTextColor={THEME.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            enterKeyHint="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={THEME.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros de categoría */}
        <View style={styles.filterSection}>
          <FlatList
            data={[{ id: null, label: t('strengthExercises.allCategories'), icon: '📋' }, ...STRENGTH_CATEGORIES.map(c => ({
              id: c.id,
              label: t(c.i18nKey),
              icon: c.icon,
              color: c.color,
            }))]}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterList}
            contentContainerStyle={styles.filterListContent}
            keyExtractor={(item) => item.id || 'all'}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedCategory === item.id && {
                    backgroundColor: THEME.primary,
                    borderColor: THEME.primary,
                  },
                ]}
                onPress={() => {
                  setSelectedCategory(item.id === selectedCategory ? null : item.id);
                  setSelectedSection(null);
                }}
              >
                <Text style={styles.filterChipIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === item.id && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Filtros de sección */}
        {selectedCategory && (
          <View style={styles.filterSection}>
            <FlatList
              data={[{ id: null, i18nKey: null, label: t('strengthExercises.allSections') }, ...availableSections.map(s => ({
                id: s.id,
                i18nKey: s.i18nKey,
                label: t(s.i18nKey),
                color: s.color,
              }))]}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterList}
              contentContainerStyle={styles.filterListContent}
              keyExtractor={(item) => item.id || 'all-sections'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sectionChip,
                    selectedSection === item.id && {
                      backgroundColor: THEME.primary,
                      borderColor: THEME.primary,
                    },
                  ]}
                  onPress={() => setSelectedSection(item.id === selectedSection ? null : item.id)}
                >
                  <Text
                    style={[
                      styles.sectionChipText,
                      selectedSection === item.id && styles.filterChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Filtro de seleccionados */}
        {multiSelect && selectedCount > 0 && (
          <View style={styles.selectedFilterRow}>
            <TouchableOpacity
              style={[
                styles.selectedFilterChip,
                showSelectedOnly && styles.selectedFilterChipActive,
              ]}
              onPress={() => setShowSelectedOnly(prev => !prev)}
            >
              <Ionicons
                name={showSelectedOnly ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={16}
                color={showSelectedOnly ? THEME.onPrimary : THEME.primary}
              />
              <Text
                style={[
                  styles.selectedFilterChipText,
                  showSelectedOnly && styles.selectedFilterChipTextActive,
                ]}
              >
                {t('strengthExercises.selected')} ({selectedCount})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Grid de ejercicios */}
        <FlatList
          ref={flatListRef}
          data={filteredExercises}
          renderItem={renderExercise}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          key={`grid-${numColumns}`}
          contentContainerStyle={{ paddingHorizontal: gridPadding, paddingTop: 14, paddingBottom: gridPadding }}
          columnWrapperStyle={{ gap: cardGap, marginBottom: cardGap }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={48} color={THEME.textMuted} />
              <Text style={styles.emptyStateText}>{t('strengthExercises.noResults')}</Text>
              <TouchableOpacity style={styles.clearFiltersBtn} onPress={handleClearFilters}>
                <Text style={styles.clearFiltersBtnText}>{t('exercise.clearFiltersText')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* Viewer modal */}
      <StrengthExerciseViewer
        visible={!!viewingExercise}
        onClose={() => setViewingExercise(null)}
        exercise={viewingExercise}
      />
    </Modal>
  );
}

const makeStyles = (THEME) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  headerTitleArea: {
    flex: 1,
  },
  headerTitle: {
    color: THEME.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: THEME.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  confirmBtnText: {
    color: THEME.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: THEME.textPrimary,
  },
  filterSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  selectedFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
  },
  selectedFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: THEME.surface,
    borderWidth: 1.5,
    borderColor: THEME.primary,
    gap: 6,
  },
  selectedFilterChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  selectedFilterChipText: {
    fontSize: 13,
    color: THEME.primary,
    fontWeight: '600',
  },
  selectedFilterChipTextActive: {
    color: '#ffffff',
  },
  filterList: {
    flexGrow: 0,
  },
  filterListContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 4,
  },
  filterChipIcon: {
    fontSize: 15,
  },
  filterChipText: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  sectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionChipText: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  gridContent: {
    padding: 12,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardSelected: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primarySoft,
  },
  cardImageContainer: {
    position: 'relative',
    aspectRatio: 4 / 3,
    backgroundColor: THEME.surfaceAlt,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.border,
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: THEME.surface,
    borderRadius: 12,
  },
  levelBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  levelBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  videoBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: THEME.primary,
    borderRadius: 14,
    padding: 4,
  },
  cardInfo: {
    padding: 8,
    gap: 2,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textPrimary,
    lineHeight: 16,
  },
  cardSection: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  clearFiltersBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: THEME.primary + '15',
  },
  clearFiltersBtnText: {
    color: THEME.primary,
    fontWeight: '600',
  },
});
