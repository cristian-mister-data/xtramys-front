import { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, Image, TextInput, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { Ionicons, Feather } from '@expo/vector-icons';
import RNWebPage from './_RNWebPage';
import StrengthExerciseViewer from '@/vendor/shared/StrengthExerciseViewer';
import {
  STRENGTH_CATEGORIES,
  STRENGTH_EXERCISES,
  getStrengthExerciseImage,
  getSectionForExercise,
  checkVideoAvailability,
} from '@/data/strengthExercises';

export default function StrengthExercises() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const [containerWidth, setContainerWidth] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [viewerExercise, setViewerExercise] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const currentWidth = containerWidth || windowWidth;
  const sm = currentWidth < 480;
  const md = currentWidth >= 480 && currentWidth < 768;
  const lg = currentWidth >= 768 && currentWidth < 1024;
  const xl = currentWidth >= 1024;
  
  const gap = 8;
  const pad = 12;

  const filteredExercises = useMemo(() =>
    STRENGTH_EXERCISES.filter(ex => {
      const q = search.toLowerCase();
      const ms = !search || t(ex.i18nKey).toLowerCase().includes(q) ||
        (ex.description && t(ex.description).toLowerCase().includes(q));
      const secInfo = getSectionForExercise(ex);
      const mc = !selectedCategory || secInfo?.category.id === selectedCategory;
      const ms2 = !selectedSection || secInfo?.section.id === selectedSection;
      return ms && mc && ms2;
    }),
    [search, selectedCategory, selectedSection, t]
  );

  const visibleSections = useMemo(() =>
    selectedCategory
      ? (STRENGTH_CATEGORIES.find(c => c.id === selectedCategory)?.sections || [])
      : STRENGTH_CATEGORIES.flatMap(c => c.sections),
    [selectedCategory]
  );

  const openExercise = useCallback(ex => setViewerExercise(ex), []);
  const closeExercise = useCallback(() => setViewerExercise(null), []);

  const cfg = {
    icn: sm ? 14 : md ? 13 : 15,
    lvl: sm ? 7 : md ? 8 : 9,
    vBadge: sm ? 2 : md ? 3 : 4,
    vIcn: sm ? 6 : md ? 7 : 9,
    namF: sm ? 10 : md ? 11 : 12,
    secF: sm ? 8 : md ? 9 : 10,
    infoP: sm ? 5 : md ? 6 : 8,
  };

  const getFlexBasis = () => {
    if (sm) return '100%';
    if (md) return '30%';
    if (lg) return '22%';
    return '18%';
  };

  return (
    <RNWebPage themed
      title={t('menu.strengthExercises', 'Ejercicios de Fuerza')}
      subtitle={t('sectionHeaders.strengthExercises', 'Catálogo de ejercicios de entrenamiento coadyuvante.')}
      icon={({ size, color }) => <Ionicons name="barbell" size={size} color={color} />}
    >
      <View style={{ flex: 1 }} onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w && w !== containerWidth) setContainerWidth(w);
      }}>
        {/* Fixed Header: Filters and Search */}
        <View style={{ 
          paddingHorizontal: pad, 
          paddingTop: 10, 
          paddingBottom: 10,
          gap: 12, 
          backgroundColor: theme.colors.background,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          zIndex: 10,
          ...(Platform.OS === 'web' ? { position: 'sticky', top: 0 } : {})
        }}>
          {/* Search Bar */}
          <View style={[
            ss.srch,
            {
              borderColor: searchFocused ? theme.colors.primary : theme.colors.border,
              backgroundColor: theme.colors.surface,
              shadowColor: searchFocused ? theme.colors.primary : '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: searchFocused ? 0.15 : 0.04,
              shadowRadius: 3,
              elevation: searchFocused ? 3 : 1,
            }
          ]}>
            <Ionicons name="search" size={cfg.icn + 2} color={searchFocused ? theme.colors.primary : theme.colors.textMuted} />
            <TextInput
              style={[ss.si, { color: theme.colors.text }]}
              placeholder={t('strengthExercises.searchPlaceholder', 'Buscar ejercicio...')}
              placeholderTextColor={theme.colors.textMuted}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={6}>
                <Ionicons name="close-circle" size={cfg.icn + 2} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Categories Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={{ marginHorizontal: -pad }}
            contentContainerStyle={{ paddingHorizontal: pad, gap: 10, paddingBottom: 6 }}
          >
            {[
              { key: null, label: t('strengthExercises.allCategories', 'Todas las categorías'), color: theme.colors.primary },
              ...STRENGTH_CATEGORIES.map(c => ({ key: c.id, label: `${c.icon} ${t(c.i18nKey)}`, color: c.color })),
            ].map(item => {
              const active = selectedCategory === item.key;
              const activeColor = theme.colors.primary;
              return (
                <TouchableOpacity
                  key={item.key || '__all'}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: active ? activeColor : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: active ? activeColor : theme.colors.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                  onPress={() => {
                    setSelectedCategory(item.key);
                    setSelectedSection(null);
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: active ? '700' : '600',
                    color: active ? (theme.colors.onPrimary || '#fff') : theme.colors.textSecondary
                  }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Sections Filter */}
          {visibleSections.length > 0 && (() => {
            const selectedCategoryColor = STRENGTH_CATEGORIES.find(c => c.id === selectedCategory)?.color;
            const sectionOptions = [
              { key: null, label: t('strengthExercises.allSections', 'Todas las secciones'), color: selectedCategoryColor || theme.colors.primary },
              ...visibleSections.map(s => ({ key: s.id, label: t(s.i18nKey), color: s.color })),
            ];
            return (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={{ marginHorizontal: -pad, marginTop: -4 }}
                contentContainerStyle={{ paddingHorizontal: pad, gap: 8, paddingBottom: 6 }}
              >
                {sectionOptions.map(item => {
                  const active = selectedSection === item.key;
                  const activeColor = theme.colors.primary;
                  return (
                    <TouchableOpacity
                      key={item.key || '__all'}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: active ? activeColor : theme.colors.surface,
                        borderWidth: 1,
                        borderColor: active ? activeColor : theme.colors.border,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                      onPress={() => setSelectedSection(active ? null : item.key)}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontWeight: active ? '700' : '600',
                        color: active ? (theme.colors.onPrimary || '#fff') : theme.colors.textMuted,
                      }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            );
          })()}
        </View>

        {/* Scrollable Exercises List */}
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 12, paddingHorizontal: pad }}
          showsVerticalScrollIndicator={true}
        >
          {filteredExercises.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 }}>
              {filteredExercises.map(ex => {
                const si = getSectionForExercise(ex);
                const img = getStrengthExerciseImage(ex);
                const hv = checkVideoAvailability(ex);

                if (sm) {
                  return (
                    <View key={ex.id} style={{ width: '100%', paddingHorizontal: gap / 2, paddingVertical: gap / 2 }}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => openExercise(ex)}
                        style={{
                          flexDirection: 'row',
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          borderWidth: 1,
                          borderRadius: 10,
                          padding: 8,
                          alignItems: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 2,
                          elevation: 1,
                        }}
                      >
                        <View style={{
                          width: 80,
                          height: 54,
                          borderRadius: 8,
                          overflow: 'hidden',
                          backgroundColor: si?.section?.color || theme.colors.surfaceAlt,
                          position: 'relative'
                        }}>
                          {img ? (
                            <Image
                              source={typeof img === 'string' ? { uri: img } : img}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.border }}>
                              <Ionicons name="barbell-outline" size={20} color={theme.colors.textMuted} />
                            </View>
                          )}
                          {hv && (
                            <View style={{
                              position: 'absolute',
                              bottom: 2,
                              right: 2,
                              backgroundColor: theme.colors.primary,
                              padding: 2,
                              borderRadius: 4
                            }}>
                              <Feather name="play" size={8} color="#fff" />
                            </View>
                          )}
                        </View>

                        <View style={{ flex: 1, marginLeft: 12, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
                              {t(ex.i18nKey)}
                            </Text>
                            {si && (
                              <View style={{ backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ color: theme.colors.text, fontSize: 9, fontWeight: '800' }}>N{ex.level}</Text>
                              </View>
                            )}
                          </View>
                          {si && (
                            <Text style={{ fontSize: 11, color: theme.colors.textMuted }} numberOfLines={1}>
                              {t(si.section.i18nKey)}
                            </Text>
                          )}
                        </View>

                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  );
                }

                return (
                  <View key={ex.id} style={{ 
                    flexGrow: 1, 
                    flexBasis: getFlexBasis(),
                    paddingHorizontal: gap / 2, 
                    paddingVertical: gap / 2,
                    minWidth: 160
                  }}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => openExercise(ex)}
                      style={[ss.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    >
                      <View style={[ss.imgW, { backgroundColor: si?.section?.color || theme.colors.surfaceAlt }]}>
                        {img ? (
                          <Image
                            source={typeof img === 'string' ? { uri: img } : img}
                            style={ss.img}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[ss.emp, { backgroundColor: theme.colors.border }]}>
                            <Ionicons name="barbell-outline" size={cfg.icn + 6} color={theme.colors.textMuted} />
                          </View>
                        )}
                        {hv && (
                          <View style={[ss.vid, { backgroundColor: theme.colors.primary, padding: cfg.vBadge, borderRadius: cfg.vBadge * 2 }]}>
                            <Feather name="play" size={cfg.vIcn} color="#fff" />
                          </View>
                        )}
                        {si && (
                          <View style={[ss.lvl, { backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }]}>
                            <Text style={{ color: theme.colors.text, fontSize: cfg.lvl, fontWeight: '800' }}>N{ex.level}</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ padding: cfg.infoP, gap: 2 }}>
                        <Text style={{ fontSize: cfg.namF, fontWeight: '700', lineHeight: cfg.namF + 4, color: theme.colors.text }} numberOfLines={1}>
                          {t(ex.i18nKey)}
                        </Text>
                        {si && (
                          <Text style={{ fontSize: cfg.secF, lineHeight: cfg.secF + 3, color: theme.colors.textMuted, fontWeight: '500' }} numberOfLines={1}>
                            {t(si.section.i18nKey)}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {filteredExercises.length === 0 && (
            <View style={ss.empty}>
              <Ionicons name="search-outline" size={40} color={theme.colors.textMuted} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.textMuted }}>
                {t('strengthExercises.noResults', 'No se encontraron ejercicios')}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <StrengthExerciseViewer
        visible={!!viewerExercise}
        onClose={closeExercise}
        exercise={viewerExercise}
      />
    </RNWebPage>
  );
}

const ss = StyleSheet.create({
  srch: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  si: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    outlineStyle: 'none',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  imgW: {
    position: 'relative',
    aspectRatio: 3 / 2,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  emp: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vid: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  lvl: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
});
