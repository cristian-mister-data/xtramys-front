import { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Image,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { createTemporadaEquipo } from '@/store/slices/season/seasonThunks';
import { useTranslation } from 'react-i18next';
import { RESET_STORE } from '@/store/rootReducer';
import AppLayout from '@/vendor/shared/appLayout';
import CustomAlertModal from '@/vendor/shared/customAlert';

// Función para detectar si es móvil
const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

export default function CreateSeasonAndTeam({ setToken, navigation }) {
  const [año, setAño] = useState(new Date().getFullYear().toString());
  const [teamName, setTeamName] = useState('');
  const [idUsuario, setIdUsuario] = useState(null);
  const [yearSelectVisible, setYearSelectVisible] = useState(false);

  // Team creation specific fields
  const [categoriaKey, setCategoriaKey] = useState('');
  const [categoriaCustom, setCategoriaCustom] = useState('');
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [tiempoPorParte, setTiempoPorParte] = useState(45);
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [jugadoresPorEquipo, setJugadoresPorEquipo] = useState(11);
  const [showPlayersPerTeamOptions, setShowPlayersPerTeamOptions] = useState(false);
  const [escudo, setEscudo] = useState(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const dispatch = useDispatch();
  const { t } = useTranslation();

  // Función helper para formatear el año como "2025-2026"
  const formatSeasonYear = (year) => {
    const currentYear = parseInt(year);
    const nextYear = currentYear + 1;
    return `${currentYear}-${nextYear}`;
  };

  // Opciones de categoría (coinciden con las de season.js)
  const categoryOptions = [
    { label: t('team.categories.prebenjamin'), value: 'prebenjamin' },
    { label: t('team.categories.benjamin'), value: 'benjamin' },
    { label: t('team.categories.alevin'), value: 'alevin' },
    { label: t('team.categories.infantil'), value: 'infantil' },
    { label: t('team.categories.cadete'), value: 'cadete' },
    { label: t('team.categories.juvenil'), value: 'juvenil' },
    { label: t('team.categories.senior'), value: 'senior' },
    { label: t('team.categories.otro'), value: 'otro' }
  ];

  // Opciones de tiempo por parte
  const timePerHalfOptions = [10, 15, 20, 25, 30, 35, 40, 45];

  // Opciones de jugadores por equipo
  const playersPerTeamOptions = [7, 8, 11];

  // Generar opciones de años para el select (desde 2000 hasta año actual)
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let year = 2000; year <= currentYear; year++) {
    yearOptions.push({
      label: formatSeasonYear(year.toString()),
      value: year.toString()
    });
  }

  const { loading: loadingSeason } = useSelector(state => state.season);
  const { loading: loadingTeam } = useSelector(state => state.team);

  useEffect(() => {
    AsyncStorage.getItem('usuario').then(str => {
      const u = JSON.parse(str);
      setIdUsuario(u?._id);
    });
  }, []);

  const [loading, setLoading] = useState(false);

  // Pick escudo image
  const pickBadgeImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('message.error'), t('season.galleryPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? [ImagePicker.MediaType.Images] : ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setEscudo(base64Image);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('message.error'), t('season.imageSelectError'));
    }
  };

  const handleCrear = async () => {
    if (!año || !teamName) return;

    // Validaciones adicionales para categoría
    if (!categoriaKey) {
      Alert.alert(t('message.error'), t('message.missingFields', { fields: t('team.category') }));
      return;
    }

    if (categoriaKey === 'otro' && !categoriaCustom?.trim()) {
      Alert.alert(t('message.error'), t('message.missingFields', { fields: t('team.customCategory') }));
      return;
    }

    setLoading(true);
    try {
      const categoriaLegacy = categoriaKey === 'otro' ? categoriaCustom : categoriaKey;

      await dispatch(
        createTemporadaEquipo({
          año,
          usuario: idUsuario,
          nombre: teamName,
          categoriaKey,
          categoriaCustom: categoriaCustom || '',
          categoria: categoriaLegacy,
          tiempoPorParte,
          jugadoresPorEquipo,
          escudo,
          user: idUsuario,
        })
      );

      // Optionally you might want to navigate or update UI

      Alert.alert(t('message.success'), t('season.createSeasonSuccess'));
    } catch (err) {
      console.warn('Error en creación encadenada:', err);
      Alert.alert(t('message.error'), t('season.createSeasonError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('usuario');
    dispatch({ type: RESET_STORE });
    setToken(null);
  };

  if (loadingSeason || loadingTeam || loading) {
    return (
      <AppLayout backgroundColor={TOP_GREEN}>
        <View style={[styles.fullBg, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#23292F" />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout backgroundColor={TOP_GREEN}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.fullBg}>
          <View style={styles.contentContainer}>
            <View style={styles.card}>
              <Text style={styles.formTitle}>{t("season.createSeason")}</Text>

              <Text style={styles.inputLabel}>{t("season.season")}</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setYearSelectVisible(true)}
              >
                <Text style={año ? styles.inputText : styles.inputPlaceholder}>
                  {año ? formatSeasonYear(año) : t("season.season")}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>{t("team.teamName")}</Text>
              <TextInput
                placeholder={t("team.teamName")}
                placeholderTextColor="#A0AEC0"
                value={teamName}
                onChangeText={setTeamName}
                style={styles.input}
              />

              <Text style={styles.inputLabel}>{t("team.category")}</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowCategoryOptions(true)}>
                <Text style={categoriaKey ? styles.inputText : styles.inputPlaceholder}>
                  {categoriaKey ? (categoriaKey === 'otro' ? (categoriaCustom || t('team.customCategory')) : t(`team.categories.${categoriaKey}`) ) : t('team.category')}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>

              {categoriaKey === 'otro' && (
                <TextInput
                  placeholder={t('team.customCategoryPlaceholder')}
                  placeholderTextColor="#A0AEC0"
                  value={categoriaCustom}
                  onChangeText={setCategoriaCustom}
                  style={styles.input}
                />
              )}

              <Text style={styles.inputLabel}>{t('team.timePerHalf')}</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowTimeOptions(true)}>
                <Text style={styles.inputText}>{t('team.timePerHalfMinutes', { minutes: tiempoPorParte })}</Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>{t('team.playersPerTeam')}</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowPlayersPerTeamOptions(true)}>
                <Text style={styles.inputText}>{t('team.playersPerTeamCount', { count: jugadoresPorEquipo })}</Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>{t('team.badge')}</Text>
              <View style={[styles.input, { justifyContent: 'flex-start', alignItems: 'center' }]}>
                {escudo ? (
                  <Image source={{ uri: escudo }} style={{ width: 44, height: 44, borderRadius: 8, marginRight: 10 }} />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#eef2ff', marginRight: 10 }} />
                )}
                <TouchableOpacity onPress={pickBadgeImage} style={{ paddingHorizontal: 8 }}>
                  <Text style={{ color: '#2563eb' }}>{escudo ? t('team.changeBadge') : t('team.uploadBadge')}</Text>
                </TouchableOpacity>
                {escudo && (
                  <TouchableOpacity onPress={() => setEscudo(null)} style={{ paddingHorizontal: 8 }}>
                    <Text style={{ color: '#ef4444' }}>{t('team.removeBadge')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && { backgroundColor: '#444' }]}
                onPress={handleCrear}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t("season.create")}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setLogoutConfirm(true)}>
                <Text style={[styles.link, { color: "red" }]}>{t("menu.logout")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Year Select Modal */}
        <Modal
          visible={yearSelectVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setYearSelectVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.selectModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("season.selectYear")}</Text>
                <TouchableOpacity
                  onPress={() => setYearSelectVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.selectModalBody} showsVerticalScrollIndicator={false}>
                {yearOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.selectOption,
                      año === option.value && styles.selectOptionSelected
                    ]}
                    onPress={() => {
                      setAño(option.value);
                      setYearSelectVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.selectOptionText,
                      año === option.value && styles.selectOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                    {año === option.value && (
                      <Ionicons name="checkmark" size={20} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Category Select Modal */}
        <Modal
          visible={showCategoryOptions}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCategoryOptions(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.selectModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('team.category')}</Text>
                <TouchableOpacity
                  onPress={() => setShowCategoryOptions(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.selectModalBody} showsVerticalScrollIndicator={false}>
                {categoryOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.selectOption, categoriaKey === opt.value && styles.selectOptionSelected]}
                    onPress={() => { setCategoriaKey(opt.value); setShowCategoryOptions(false); }}
                  >
                    <Text style={[styles.selectOptionText, categoriaKey === opt.value && styles.selectOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {categoriaKey === opt.value && (
                      <Ionicons name="checkmark" size={20} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Time per half Modal */}
        <Modal
          visible={showTimeOptions}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTimeOptions(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.selectModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('team.timePerHalf')}</Text>
                <TouchableOpacity
                  onPress={() => setShowTimeOptions(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.selectModalBody} showsVerticalScrollIndicator={false}>
                {timePerHalfOptions.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.selectOption, tiempoPorParte === time && styles.selectOptionSelected]}
                    onPress={() => { setTiempoPorParte(time); setShowTimeOptions(false); }}
                  >
                    <Text style={[styles.selectOptionText, tiempoPorParte === time && styles.selectOptionTextSelected]}>
                      {t('team.timePerHalfMinutes', { minutes: time })}
                    </Text>
                    {tiempoPorParte === time && (
                      <Ionicons name="checkmark" size={20} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Players per team Modal */}
        <Modal
          visible={showPlayersPerTeamOptions}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPlayersPerTeamOptions(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.selectModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('team.playersPerTeam')}</Text>
                <TouchableOpacity
                  onPress={() => setShowPlayersPerTeamOptions(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.selectModalBody} showsVerticalScrollIndicator={false}>
                {playersPerTeamOptions.map(count => (
                  <TouchableOpacity
                    key={count}
                    style={[styles.selectOption, jugadoresPorEquipo === count && styles.selectOptionSelected]}
                    onPress={() => { setJugadoresPorEquipo(count); setShowPlayersPerTeamOptions(false); }}
                  >
                    <Text style={[styles.selectOptionText, jugadoresPorEquipo === count && styles.selectOptionTextSelected]}>
                      {t('team.playersPerTeamCount', { count })}
                    </Text>
                    {jugadoresPorEquipo === count && (
                      <Ionicons name="checkmark" size={20} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Logout Confirmation Modal */}
        <CustomAlertModal
          visible={logoutConfirm}
          title={t('menu.logout')}
          message={t('profile.logoutConfirm')}
          type="warning"
          confirmText="OK"
          cancelText={t('edition.cancel')}
          onCancel={() => setLogoutConfirm(false)}
          onClose={() => {
            setLogoutConfirm(false);
            handleLogout();
          }}
        />
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const BORDER = "#E5E7EB";
const CARD_BG = "#fff";
const TOP_GREEN = "#c0e2e7";

const styles = StyleSheet.create({
  fullBg: {
    flex: 1,
    backgroundColor: TOP_GREEN,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: CARD_BG,
    width: isMobileDevice() ? '95%' : '92%',
    maxWidth: isMobileDevice() ? 380 : 400,
    borderRadius: isMobileDevice() ? 20 : 26,
    padding: isMobileDevice() ? 24 : 32,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    alignItems: 'stretch',
    marginBottom: isMobileDevice() ? 16 : 20
  },
  formTitle: {
    fontSize: isMobileDevice() ? 20 : 22,
    fontWeight: 'bold',
    color: "#222",
    marginBottom: 4,
    textAlign: 'left',
  },
  inputLabel: {
    fontSize: isMobileDevice() ? 12 : 13,
    color: '#777',
    fontWeight: '700',
    marginBottom: 3,
    marginTop: isMobileDevice() ? 10 : 12,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: isMobileDevice() ? 12 : 13,
    fontSize: isMobileDevice() ? 15 : 16,
    marginBottom: 2,
    backgroundColor: '#F7F7FA',
    color: '#23292F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: isMobileDevice() ? 15 : 16,
    color: '#23292F',
    flex: 1,
  },
  inputPlaceholder: {
    fontSize: isMobileDevice() ? 15 : 16,
    color: '#A0AEC0',
    flex: 1,
  },
  button: {
    backgroundColor: "#23292F",
    paddingVertical: isMobileDevice() ? 14 : 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: isMobileDevice() ? 18 : 22,
    marginBottom: 8,
    elevation: 1,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: isMobileDevice() ? 16 : 17,
    letterSpacing: 0.5,
  },
  link: {
    color: "#444",
    textAlign: 'center',
    fontSize: isMobileDevice() ? 14 : 15,
    marginTop: 10,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 12 : 20,
  },
  selectModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: isMobileDevice() ? 14 : 16,
    maxHeight: isMobileDevice() ? '80%' : '70%',
    width: '100%',
    maxWidth: isMobileDevice() ? 380 : 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobileDevice() ? 16 : 20,
    paddingVertical: isMobileDevice() ? 14 : 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  selectModalBody: {
    padding: isMobileDevice() ? 12 : 16,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: isMobileDevice() ? 14 : 16,
    paddingHorizontal: isMobileDevice() ? 16 : 20,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  selectOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    borderWidth: 1,
  },
  selectOptionText: {
    fontSize: isMobileDevice() ? 14 : 16,
    color: '#374151',
    fontWeight: '500',
  },
  selectOptionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
});