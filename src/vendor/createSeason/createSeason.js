import { useEffect, useMemo, useState } from 'react';
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
import { useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { createTemporadaEquipo } from '@/store/slices/season/seasonThunks';
import { useTranslation } from 'react-i18next';
import { logoutThunk, fetchMe } from '@/store/slices/user/userThunks';
import AppLayout from '@/vendor/shared/appLayout';
import CustomAlertModal from '@/vendor/shared/customAlert';

const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

const INPUT_HEIGHT = 52;

export default function CreateSeasonAndTeam({ setToken, navigation }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigate = useNavigate();

  const getDefaultSeasonString = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 5 = June
    if (currentMonth >= 5) {
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  };

  const [año, setAño] = useState(getDefaultSeasonString());
  const [teamName, setTeamName] = useState('');
  const [idUsuario, setIdUsuario] = useState(null);

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

  const formatSeasonYear = (year) => {
    if (!year) return '';
    const yearStr = year.toString();
    if (yearStr.includes('-') || yearStr.includes('/') || isNaN(yearStr)) {
      return yearStr;
    }
    const currentYear = parseInt(yearStr);
    const nextYear = currentYear + 1;
    return `${currentYear}-${nextYear}`;
  };

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

  const timePerHalfOptions = [10, 15, 20, 25, 30, 35, 40, 45];
  const playersPerTeamOptions = [7, 8, 11];

  const { loading: loadingSeason } = useSelector(state => state.season);
  const { loading: loadingTeam } = useSelector(state => state.team);
  const user = useSelector(state => state.usuario.user);

  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    if (user?._id) {
      setRoleReady(true);
      return;
    }
    dispatch(fetchMe()).unwrap().then(() => {
      setRoleReady(true);
    }).catch(() => {
      setRoleReady(true);
    });
  }, [dispatch, user?._id]);

  useEffect(() => {
    if (user?._id) {
      setIdUsuario(user._id);
      return;
    }
    AsyncStorage.getItem('usuario').then(str => {
      const u = JSON.parse(str);
      setIdUsuario(u?._id);
    });
  }, [user]);

  const isClubAdmin = user?.role === 'club_admin';

  const [loading, setLoading] = useState(false);

  const pickBadgeImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('message.error'), t('season.galleryPermissionRequired'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? [ImagePicker.MediaType.Images] : ['images'],
        allowsEditing: true,
        aspect: [1, 1],
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
    if (!idUsuario) {
      Alert.alert(t('message.error'), t('login.sessionExpired', 'La sesión ha caducado. Vuelve a iniciar sesión.'));
      return;
    }
    if (!isClubAdmin) {
      if (!categoriaKey) {
        Alert.alert(t('message.error'), t('message.missingFields', { fields: t('team.category') }));
        return;
      }
      if (categoriaKey === 'otro' && !categoriaCustom?.trim()) {
        Alert.alert(t('message.error'), t('message.missingFields', { fields: t('team.customCategory') }));
        return;
      }
    }

    setLoading(true);
    try {
      const categoriaLegacy = categoriaKey === 'otro' ? categoriaCustom : (categoriaKey || '');
      await dispatch(
        createTemporadaEquipo({
          año,
          usuario: idUsuario,
          nombre: teamName,
          categoriaKey: categoriaKey || '',
          categoriaCustom: categoriaCustom || '',
          categoria: categoriaLegacy,
          tiempoPorParte,
          jugadoresPorEquipo,
          escudo,
          user: idUsuario,
        })
      ).unwrap();
      Alert.alert(t('message.success'), t('season.createSeasonSuccess'));
      // club_admin goes to the club dashboard to invite users and supervise coaches
      if (isClubAdmin) {
        navigate('/club/dashboard', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err) {
      console.warn('Error en creación encadenada:', err);
      Alert.alert(t('message.error'), t('season.createSeasonError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutThunk()).unwrap();
    setToken(null);
  };

  if (loadingSeason || loadingTeam || loading || !user || !roleReady) {
    return (
      <AppLayout backgroundColor={theme.colors.background}>
        <View style={[styles.fullBg, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </AppLayout>
    );
  }

  const fieldIcon = (name, color) => (
    <View style={[styles.fieldIcon, { backgroundColor: color + '18' }]}>
      <Ionicons name={name} size={18} color={color} />
    </View>
  );

  const chevronColor = theme.colors.textSecondary || '#94a3b8';
  const primaryColor = theme.colors.primary || '#2176ff';

  const isCoach = user?.role === 'user' && !!user?.clubId;

  if (isCoach) {
    return (
      <AppLayout backgroundColor={theme.colors.background}>
        <ScrollView style={styles.fullBg} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={[styles.headerIconWrap, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="lock-closed-outline" size={28} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>{t("season.coachPlaceholderTitle")}</Text>
            <Text style={[styles.headerSubtitle, { marginTop: 12 }]}>
              {t("season.coachPlaceholderMessage")}
            </Text>
          </View>

          {/* Logout */}
          <TouchableOpacity onPress={() => setLogoutConfirm(true)} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutText}>{t("menu.logout")}</Text>
          </TouchableOpacity>
        </ScrollView>

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
      </AppLayout>
    );
  }

  return (
    <AppLayout backgroundColor={theme.colors.background}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.fullBg} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="calendar-outline" size={28} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>{t("season.createSeason")}</Text>
            <Text style={styles.headerSubtitle}>
              {t('season.createSeasonDescription', 'Configura tu temporada y equipo en segundos')}
            </Text>
          </View>

          {/* Season & Team form card */}
          <View style={styles.card}>
            {/* Step label */}
            <View style={styles.stepBadge}>
              <View style={styles.stepDot} />
              <Text style={styles.stepText}>{t('season.seasonInfo', 'Información de temporada')}</Text>
            </View>

            {/* Season year */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>
                {t("season.season")}
              </Text>
              <View style={styles.input}>
                {fieldIcon('calendar', primaryColor)}
                <TextInput
                  placeholder={t("season.season")}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  value={año}
                  onChangeText={setAño}
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Step label */}
            <View style={styles.stepBadge}>
              <View style={[styles.stepDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.stepText}>{t('team.teamInfo', 'Información del equipo')}</Text>
            </View>

            {/* Team name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>
                {t("team.teamName")}
              </Text>
              <View style={styles.input}>
                {fieldIcon('football', '#10B981')}
                <TextInput
                  placeholder={t("team.teamName")}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  value={teamName}
                  onChangeText={setTeamName}
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Category - hidden for club_admin */}
            {!isClubAdmin && (
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>
                {t("team.category")}
              </Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowCategoryOptions(true)} activeOpacity={0.7}>
                {fieldIcon('layers', '#8B5CF6')}
                <Text style={[styles.inputText, !categoriaKey && styles.inputPlaceholder]}>
                  {categoriaKey ? (categoriaKey === 'otro' ? (categoriaCustom || t('team.customCategory')) : t(`team.categories.${categoriaKey}`) ) : t('team.category')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={chevronColor} />
              </TouchableOpacity>
              {categoriaKey === 'otro' && (
                <View style={[styles.input, { marginTop: 8 }]}>
                  {fieldIcon('create', '#8B5CF6')}
                  <TextInput
                    placeholder={t('team.customCategoryPlaceholder')}
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    value={categoriaCustom}
                    onChangeText={setCategoriaCustom}
                    style={styles.textInput}
                  />
                </View>
              )}
            </View>
            )}

            {/* Divider - only for non-admin */}
            {!isClubAdmin && <View style={styles.divider} />}

            {/* Game config - hidden for club_admin */}
            {!isClubAdmin && (
            <>
            {/* Step label */}
            <View style={styles.stepBadge}>
              <View style={[styles.stepDot, { backgroundColor: '#FF6B00' }]} />
              <Text style={styles.stepText}>{t('team.gameConfig', 'Configuración de juego')}</Text>
            </View>

            {/* Time per half + Players per team row */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>
                  {t('team.timePerHalf')}
                </Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowTimeOptions(true)} activeOpacity={0.7}>
                  {fieldIcon('time', '#FF6B00')}
                  <Text style={styles.inputText}>{t('team.timePerHalfMinutes', { minutes: tiempoPorParte })}</Text>
                  <Ionicons name="chevron-down" size={18} color={chevronColor} />
                </TouchableOpacity>
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>
                  {t('team.playersPerTeam')}
                </Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowPlayersPerTeamOptions(true)} activeOpacity={0.7}>
                  {fieldIcon('people', '#FF6B00')}
                  <Text style={styles.inputText}>{t('team.playersPerTeamCount', { count: jugadoresPorEquipo })}</Text>
                  <Ionicons name="chevron-down" size={18} color={chevronColor} />
                </TouchableOpacity>
              </View>
            </View>
            </>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Step label */}
            <View style={styles.stepBadge}>
              <View style={[styles.stepDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.stepText}>{t('team.badge', 'Escudo')}</Text>
            </View>

            {/* Badge */}
            <View style={styles.fieldGroup}>
              <TouchableOpacity style={styles.badgePicker} onPress={pickBadgeImage} activeOpacity={0.7}>
                {escudo ? (
                  <Image source={{ uri: escudo }} style={styles.badgePreview} />
                ) : (
                  <View style={styles.badgePlaceholder}>
                    <Ionicons name="image-outline" size={24} color={chevronColor} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.badgeLabel}>
                    {escudo ? t('team.changeBadge') : t('team.uploadBadge')}
                  </Text>
                  <Text style={styles.badgeHint}>
                    {t('team.badgeHint', 'PNG o JPG · 1:1')}
                  </Text>
                </View>
                {escudo && (
                  <TouchableOpacity onPress={() => setEscudo(null)} style={styles.badgeRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                )}
                <Ionicons name="chevron-forward" size={18} color={chevronColor} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Create button */}
          <TouchableOpacity
            style={[styles.createButton, loading && { opacity: 0.7 }]}
            onPress={handleCrear}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.createButtonText}>{t("season.create")}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity onPress={() => setLogoutConfirm(true)} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutText}>{t("menu.logout")}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Year Select Modal removed - now using direct text input */}

        {/* Category Select Modal */}
        <Modal visible={showCategoryOptions} transparent animationType="fade" onRequestClose={() => setShowCategoryOptions(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.selectModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('team.category')}</Text>
                <TouchableOpacity onPress={() => setShowCategoryOptions(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={22} color={chevronColor} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.selectModalBody} showsVerticalScrollIndicator={false}>
                {categoryOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.selectOption, categoriaKey === opt.value && styles.selectOptionSelected]}
                    onPress={() => { setCategoriaKey(opt.value); setShowCategoryOptions(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.selectOptionText, categoriaKey === opt.value && styles.selectOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {categoriaKey === opt.value && (
                      <Ionicons name="checkmark-circle" size={20} color={primaryColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Time per half Modal */}
        <Modal visible={showTimeOptions} transparent animationType="fade" onRequestClose={() => setShowTimeOptions(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.selectModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('team.timePerHalf')}</Text>
                <TouchableOpacity onPress={() => setShowTimeOptions(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={22} color={chevronColor} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.selectModalBody} showsVerticalScrollIndicator={false}>
                {timePerHalfOptions.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.selectOption, tiempoPorParte === time && styles.selectOptionSelected]}
                    onPress={() => { setTiempoPorParte(time); setShowTimeOptions(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.selectOptionText, tiempoPorParte === time && styles.selectOptionTextSelected]}>
                      {t('team.timePerHalfMinutes', { minutes: time })}
                    </Text>
                    {tiempoPorParte === time && (
                      <Ionicons name="checkmark-circle" size={20} color={primaryColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Players per team Modal */}
        <Modal visible={showPlayersPerTeamOptions} transparent animationType="fade" onRequestClose={() => setShowPlayersPerTeamOptions(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.selectModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('team.playersPerTeam')}</Text>
                <TouchableOpacity onPress={() => setShowPlayersPerTeamOptions(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={22} color={chevronColor} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.selectModalBody} showsVerticalScrollIndicator={false}>
                {playersPerTeamOptions.map(count => (
                  <TouchableOpacity
                    key={count}
                    style={[styles.selectOption, jugadoresPorEquipo === count && styles.selectOptionSelected]}
                    onPress={() => { setJugadoresPorEquipo(count); setShowPlayersPerTeamOptions(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.selectOptionText, jugadoresPorEquipo === count && styles.selectOptionTextSelected]}>
                      {t('team.playersPerTeamCount', { count })}
                    </Text>
                    {jugadoresPorEquipo === count && (
                      <Ionicons name="checkmark-circle" size={20} color={primaryColor} />
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

const makeStyles = (theme) => StyleSheet.create({
  fullBg: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingVertical: isMobileDevice() ? 12 : 24,
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: isMobileDevice() ? 8 : 16,
    paddingBottom: isMobileDevice() ? 16 : 24,
    paddingHorizontal: 16,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.primary || '#2176ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: theme.colors.primary || '#2176ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontSize: isMobileDevice() ? 22 : 26,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: isMobileDevice() ? 13 : 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    width: '100%',
    maxWidth: isMobileDevice() ? 380 : 440,
    borderRadius: isMobileDevice() ? 20 : 24,
    padding: isMobileDevice() ? 20 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 16,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    marginTop: 4,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary || '#2176ff',
  },
  stepText: {
    fontSize: isMobileDevice() ? 12 : 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: isMobileDevice() ? 12 : 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.inputBorder || '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: INPUT_HEIGHT,
    backgroundColor: theme.colors.inputBg || '#f8fafc',
  },
  textInput: {
    flex: 1,
    fontSize: isMobileDevice() ? 15 : 16,
    color: theme.colors.text,
    paddingVertical: 0,
    height: '100%',
  },
  inputText: {
    flex: 1,
    fontSize: isMobileDevice() ? 15 : 16,
    color: theme.colors.text,
  },
  inputPlaceholder: {
    flex: 1,
    fontSize: isMobileDevice() ? 15 : 16,
    color: theme.colors.inputPlaceholder || '#94a3b8',
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border || '#e2e8f0',
    marginVertical: 16,
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badgePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.inputBorder || '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 60,
    backgroundColor: theme.colors.inputBg || '#f8fafc',
    gap: 12,
  },
  badgePreview: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  badgePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt || '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: isMobileDevice() ? 14 : 15,
    color: theme.colors.text,
    fontWeight: '500',
  },
  badgeHint: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  badgeRemove: {
    padding: 4,
  },
  createButton: {
    width: '100%',
    maxWidth: isMobileDevice() ? 380 : 440,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 12,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: isMobileDevice() ? 16 : 17,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginBottom: 24,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 12 : 20,
  },
  selectModalContent: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: isMobileDevice() ? 16 : 20,
    maxHeight: isMobileDevice() ? '80%' : '70%',
    width: '100%',
    maxWidth: isMobileDevice() ? 380 : 420,
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
    borderBottomColor: theme.colors.border || '#e2e8f0',
  },
  modalTitle: {
    fontSize: isMobileDevice() ? 17 : 19,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt || '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceAlt || '#f8fafc',
  },
  selectOptionSelected: {
    backgroundColor: (theme.colors.primary || '#2176ff') + '12',
    borderColor: theme.colors.primary || '#2176ff',
    borderWidth: 1,
  },
  selectOptionText: {
    fontSize: isMobileDevice() ? 14 : 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  selectOptionTextSelected: {
    color: theme.colors.primary || '#2176ff',
    fontWeight: '700',
  },
});
