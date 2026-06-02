import { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, Image, TextInput } from 'react-native';
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
  const { width } = useWindowDimensions();

  const sm = width < 480;
  const md = width >= 480 && width < 768;
  const lg = width >= 768 && width < 1024;
  const xl = width >= 1024;
  const cols = sm ? 2 : md ? 3 : lg ? 4 : xl ? 5 : 4;
  const gap = 8;
  const pad = 12;

  const cardWidth = Math.floor((width - pad * 2 - (cols - 1) * gap) / cols);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [viewerExercise, setViewerExercise] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const filteredExercises = useMemo(() =>
    STRENGTH_EXERCISES.filter(ex => {
      const q = search.toLowerCase();
      const ms = !search || t(ex.i18nKey).toLowerCase().includes(q) ||
        (ex.description && t(ex.description).toLowerCase().includes(q));
      const mc = !selectedCategory || ex.category === selectedCategory;
      const ms2 = !selectedSection || getSectionForExercise(ex)?.section.id === selectedSection;
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
    cPH: sm ? 6 : md ? 8 : 12,
    cPV: sm ? 3 : md ? 4 : 6,
    cR: sm ? 10 : md ? 12 : 16,
    cFS: sm ? 9 : md ? 10 : 12,
    sPH: sm ? 5 : md ? 7 : 10,
    sPV: sm ? 2 : md ? 3 : 4,
    sFS: sm ? 8 : md ? 9 : 11,
    icn: sm ? 12 : md ? 13 : 15,
    lvl: sm ? 7 : md ? 8 : 9,
    vBadge: sm ? 2 : md ? 3 : 4,
    vIcn: sm ? 6 : md ? 7 : 9,
    namF: sm ? 10 : md ? 11 : 12,
    secF: sm ? 8 : md ? 9 : 10,
    infoP: sm ? 5 : md ? 6 : 8,
  };

  return (
    <RNWebPage themed
      title={t('menu.strengthExercises', 'Ejercicios de Fuerza')}
      subtitle={t('sectionHeaders.strengthExercises', 'Catálogo de ejercicios de entrenamiento coadyuvante.')}
      icon={({ size, color }) => <Ionicons name="barbell" size={size} color={color} />}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: pad, paddingTop: 10, gap: 8 }}>
          <View style={[ss.srch, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Ionicons name="search" size={cfg.icn} color={theme.colors.textMuted} />
            <TextInput
              style={[ss.si, { color: theme.colors.text }]}
              placeholder={t('strengthExercises.searchPlaceholder', 'Buscar...')}
              placeholderTextColor={theme.colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={6}>
                <Ionicons name="close-circle" size={cfg.icn + 2} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[
              { key: null, label: t('strengthExercises.allCategories', 'Todas') },
              ...STRENGTH_CATEGORIES.map(c => ({ key: c.id, label: `${c.icon} ${t(c.i18nKey)}` })),
            ].map(item => {
              const active = selectedCategory === item.key;
              return (
                <TouchableOpacity
                  key={item.key || '__all'}
                  style={{
                    paddingHorizontal: cfg.cPH,
                    paddingVertical: cfg.cPV,
                    borderRadius: cfg.cR,
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                  onPress={() => {
                    setSelectedCategory(item.key);
                    if (!item.key) setSelectedSection(null);
                  }}
                >
                  <Text style={{ fontSize: cfg.cFS, fontWeight: '600', color: active ? '#fff' : theme.colors.textSecondary }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {visibleSections.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {[
                { key: null, label: t('strengthExercises.allSections', 'Todas') },
                ...visibleSections.map(s => ({ key: s.id, label: t(s.i18nKey) })),
              ].map(item => {
                const active = selectedSection === item.key;
                return (
                  <TouchableOpacity
                    key={item.key || '__all'}
                    style={{
                      paddingHorizontal: cfg.sPH,
                      paddingVertical: cfg.sPV,
                      borderRadius: 6,
                      backgroundColor: active ? `${theme.colors.primary}18` : 'transparent',
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                    onPress={() => setSelectedSection(active ? null : item.key)}
                  >
                    <Text style={{
                      fontSize: cfg.sFS,
                      fontWeight: '600',
                      color: active ? theme.colors.primary : theme.colors.textMuted,
                    }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {filteredExercises.length > 0 && (
          <View style={{ paddingHorizontal: pad, paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {filteredExercises.map(ex => {
                const si = getSectionForExercise(ex);
                const img = getStrengthExerciseImage(ex);
                const hv = checkVideoAvailability(ex);

                return (
                  <View key={ex.id} style={{ width: cardWidth, padding: gap / 2 }}>
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
                          <View style={[ss.lvl, { backgroundColor: si.section.color, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }]}>
                            <Text style={{ color: '#fff', fontSize: cfg.lvl, fontWeight: '800' }}>N{ex.level}</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ padding: cfg.infoP, gap: 1 }}>
                        <Text style={{ fontSize: cfg.namF, fontWeight: '600', lineHeight: cfg.namF + 4, color: theme.colors.text }} numberOfLines={1}>
                          {t(ex.i18nKey)}
                        </Text>
                        {si && (
                          <Text style={{ fontSize: cfg.secF, lineHeight: cfg.secF + 3, color: theme.colors.textMuted }} numberOfLines={1}>
                            {t(si.section.i18nKey)}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {filteredExercises.length === 0 && (
          <View style={ss.empty}>
            <Ionicons name="search-outline" size={32} color={theme.colors.textMuted} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textMuted }}>
              {t('strengthExercises.noResults', 'No se encontraron ejercicios')}
            </Text>
          </View>
        )}
      </ScrollView>

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
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 6,
  },
  si: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
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
    bottom: 4,
    right: 4,
  },
  lvl: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
});