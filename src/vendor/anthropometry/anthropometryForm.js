import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import {
  createAnthropometry,
  updateAnthropometry,
  fetchAnthropometryById,
} from '@/store/slices/anthropometry/anthropometryThunks';
import { clearCurrentAnthropometry } from '@/store/slices/anthropometry/anthropometrySlice';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { toast } from '@/ui/toast';
import { showMissingFieldsToast } from '@/utils/validationToast';

// ---- Paletas (light / dark) -----------------------------------------------
const LIGHT = {
  background: '#f1f5f9',
  backgroundAlt: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  text: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#3578e5',
  primaryHover: '#2a63c2',
  onPrimary: '#ffffff',
  primarySoft: '#eaf2ff',
  inputBg: '#ffffff',
  inputBorder: '#e2e8f0',
  inputPlaceholder: '#94a3b8',
  overlay: 'rgba(15, 23, 42, 0.55)',
  danger: '#dc2626',
};

const DARK = {
  background: '#0b1220',
  backgroundAlt: '#1c2742',
  surface: '#162038',
  surfaceAlt: '#1c2742',
  border: '#293555',
  borderStrong: '#3b4970',
  text: '#f1f5fb',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  primary: '#60a5fa',
  primaryHover: '#3b82f6',
  onPrimary: '#0b1220',
  primarySoft: 'rgba(96,165,250,0.15)',
  inputBg: '#1c2742',
  inputBorder: '#3b4970',
  inputPlaceholder: '#64748b',
  overlay: 'rgba(0,0,0,0.65)',
  danger: '#f87171',
};

// Definición de pliegues (clave de estado, etiqueta i18n)
const PLIEGUES = [
  { key: 'tricipital',     i18n: 'anthropometry.tricipital' },
  { key: 'subescapular',   i18n: 'anthropometry.subescapular' },
  { key: 'bicipital',      i18n: 'anthropometry.bicipital' },
  { key: 'cresta_iliaca',  i18n: 'anthropometry.crestaIliaca' },
  { key: 'supraespinal',   i18n: 'anthropometry.supraespinal' },
  { key: 'abdominal',      i18n: 'anthropometry.abdominal' },
  { key: 'muslo_frontal',  i18n: 'anthropometry.musloFrontal' },
  { key: 'pierna_medial',  i18n: 'anthropometry.piernaMedial' },
];

const AnthropometryForm = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const getLocale = () => (i18n && i18n.language === 'en' ? 'en-US' : 'es-ES');
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const { width } = useWindowDimensions();
  const IS_NARROW = width < 480;

  const styles = useMemo(() => makeStyles(c, IS_NARROW), [c, IS_NARROW]);

  const { anthropometryId, mode } = route?.params || {};
  const isEditMode = mode === 'edit';

  const { currentAnthropometry, loading } = useSelector((state) => state.anthropometry);
  const { players } = useSelector((state) => state.player);
  const equipos = useSelector((state) => state.team.teams);
  const selectedTeam = equipos?.find(e => e.seleccionado === true);

  const [formData, setFormData] = useState({
    jugador: '',
    equipo: '',
    fecha: new Date(),
    peso: '',
    pliegues: PLIEGUES.reduce((acc, p) => ({ ...acc, [p.key]: '' }), {}),
    notas: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  useEffect(() => {
    if (selectedTeam?._id && !formData.equipo) {
      setFormData(prev => ({ ...prev, equipo: selectedTeam._id }));
    }
  }, [selectedTeam?._id]);

  useEffect(() => {
    if (isEditMode && anthropometryId) {
      dispatch(fetchAnthropometryById({ id: anthropometryId }));
    }
    return () => {
      dispatch(clearCurrentAnthropometry());
    };
  }, [anthropometryId, isEditMode]);

  useEffect(() => {
    if (isEditMode && currentAnthropometry) {
      setFormData({
        jugador: typeof currentAnthropometry.jugador === 'object'
          ? currentAnthropometry.jugador._id
          : currentAnthropometry.jugador,
        equipo: typeof currentAnthropometry.equipo === 'object'
          ? currentAnthropometry.equipo._id
          : currentAnthropometry.equipo,
        fecha: new Date(currentAnthropometry.fecha),
        peso: currentAnthropometry.peso?.toString() || '',
        pliegues: PLIEGUES.reduce((acc, p) => ({
          ...acc,
          [p.key]: currentAnthropometry.pliegues?.[p.key]?.toString() || '',
        }), {}),
        notas: currentAnthropometry.notas || '',
      });
    }
  }, [currentAnthropometry, isEditMode]);

  const updatePliegue = (key, value) => {
    setFormData(prev => ({
      ...prev,
      pliegues: { ...prev.pliegues, [key]: value },
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setFormData(prev => ({ ...prev, fecha: selectedDate }));
  };

  const handleSubmit = async () => {
    if (!formData.jugador) {
      showMissingFieldsToast(t, [t('player.player', 'Jugador')]);
      return;
    }
    if (!formData.equipo || !selectedTeam?._id) {
      toast.error(t('anthropometry.noTeamSelected', 'Por favor selecciona un equipo'));
      return;
    }

    const plieguesLimpios = {};
    Object.keys(formData.pliegues).forEach(k => {
      const v = formData.pliegues[k];
      if (v !== '' && !isNaN(parseFloat(v))) plieguesLimpios[k] = parseFloat(v);
    });

    const dataToSend = {
      jugador: formData.jugador,
      equipo: selectedTeam._id,
      fecha: formData.fecha.toISOString(),
      notas: formData.notas,
    };
    if (formData.peso !== '' && !isNaN(parseFloat(formData.peso))) {
      dataToSend.peso = parseFloat(formData.peso);
    }
    if (Object.keys(plieguesLimpios).length > 0) {
      dataToSend.pliegues = plieguesLimpios;
    }

    try {
      if (isEditMode) {
        await dispatch(updateAnthropometry({ id: anthropometryId, data: dataToSend })).unwrap();
        toast.success(t('anthropometry.updateSuccess'));
      } else {
        await dispatch(createAnthropometry(dataToSend)).unwrap();
        toast.success(t('anthropometry.createSuccess'));
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting anthropometry:', error);
      toast.error(isEditMode ? t('anthropometry.updateError') : t('anthropometry.createError'));
    }
  };

  if (loading && isEditMode) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const selectedPlayer = players?.find(p => p._id === formData.jugador);

  // Render helper para un input de pliegue
  const renderPliegueInput = ({ key, i18n }) => (
    <View key={key} style={styles.fieldHalf}>
      <Text style={styles.label}>{t(i18n)}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={formData.pliegues[key]}
          onChangeText={(v) => updatePliegue(key, v)}
          keyboardType="decimal-pad"
          placeholder="0.0"
          placeholderTextColor={c.inputPlaceholder}
        />
        <Text style={styles.inputUnit}>mm</Text>
      </View>
    </View>
  );

  // Agrupar pliegues en filas de 2
  const plieguesRows = [];
  for (let i = 0; i < PLIEGUES.length; i += 2) {
    plieguesRows.push(PLIEGUES.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerIconBox}>
            <Ionicons name="body" size={20} color={c.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isEditMode ? t('anthropometry.edit') : t('anthropometry.new')}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {t('anthropometry.modal.createSubtitle')}
            </Text>
          </View>
        </View>
      </View>

      {/* Body */}
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card: DATOS GENERALES */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle-outline" size={20} color={c.primary} />
            <Text style={styles.cardTitle}>{t('anthropometry.modal.generalData') || 'Datos generales'}</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardBody}>
            {/* Jugador */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('player.player')} *</Text>
              <TouchableOpacity
                style={[styles.selector, isEditMode && styles.selectorDisabled]}
                onPress={() => !isEditMode && setShowPlayerModal(true)}
                disabled={isEditMode}
              >
                <Text style={[
                  styles.selectorText,
                  selectedPlayer ? styles.selectorTextActive : null,
                ]} numberOfLines={1}>
                  {selectedPlayer ? getPlayerFullName(selectedPlayer) : t('anthropometry.selectPlayer')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Fecha + Peso en grid responsive */}
            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>{t('anthropometry.date')} *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="calendar-outline" size={16} color={c.textMuted} />
                    <Text style={styles.selectorText}>
                      {formData.fecha.toLocaleDateString(getLocale())}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={c.textMuted} />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={formData.fecha}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    locale={getLocale()}
                  />
                )}
              </View>

              <View style={styles.fieldHalf}>
                <Text style={styles.label}>{t('anthropometry.weight')}</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={formData.peso}
                    onChangeText={(v) => setFormData(prev => ({ ...prev, peso: v }))}
                    keyboardType="decimal-pad"
                    placeholder="75.5"
                    placeholderTextColor={c.inputPlaceholder}
                  />
                  <Text style={styles.inputUnit}>kg</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Card: PLIEGUES CUTÁNEOS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="analytics-outline" size={20} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('anthropometry.skinfolds') || 'Pliegues cutáneos'}</Text>
              <Text style={styles.cardHint}>{t('anthropometry.skinfoldsUnit') || 'mm'}</Text>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardBody}>
            {plieguesRows.map((pair, idx) => (
              <View key={idx} style={styles.row}>
                {pair.map(renderPliegueInput)}
                {pair.length === 1 && <View style={styles.fieldHalf} />}
              </View>
            ))}
          </View>
        </View>

        {/* Card: NOTAS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={20} color={c.primary} />
            <Text style={styles.cardTitle}>{t('anthropometry.notes') || 'Notas'}</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardBody}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notas}
              onChangeText={(v) => setFormData(prev => ({ ...prev, notas: v }))}
              multiline
              numberOfLines={4}
              placeholder={t('anthropometry.notesPlaceholder')}
              placeholderTextColor={c.inputPlaceholder}
              textAlignVertical="top"
            />
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Footer fijo */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSubmit}
        >
          <Ionicons name="save-outline" size={18} color={c.onPrimary} />
          <Text style={styles.saveButtonText}>
            {isEditMode ? t('common.save') : t('common.create')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal selector de jugador */}
      <Modal
        visible={showPlayerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlayerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPlayerModal(false)}
        >
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{t('anthropometry.modal.selectPlayerTitle') || t('anthropometry.selectPlayer')}</Text>
              <TouchableOpacity onPress={() => setShowPlayerModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {(players || []).map(player => (
                <TouchableOpacity
                  key={player._id}
                  style={styles.pickerModalItem}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, jugador: player._id }));
                    setShowPlayerModal(false);
                  }}
                >
                  <Text style={styles.pickerModalItemText}>{getPlayerFullName(player)}</Text>
                  {formData.jugador === player._id && (
                    <Ionicons name="checkmark" size={20} color={c.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const makeStyles = (c, IS_NARROW) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    maxHeight: Platform.OS === 'web' ? '90vh' : undefined,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingHorizontal: IS_NARROW ? 12 : 20,
    paddingTop: Platform.OS === 'web' ? 14 : 12,
    paddingBottom: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  headerIconBox: {
    width: IS_NARROW ? 36 : 40,
    height: IS_NARROW ? 36 : 40,
    borderRadius: 12,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: IS_NARROW ? 16 : 18,
    fontWeight: '700',
    color: c.text,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: IS_NARROW ? 12 : 20,
    paddingBottom: 24,
  },
  // Cards
  card: {
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: c.border,
    marginHorizontal: 16,
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
    letterSpacing: 0.2,
  },
  cardHint: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  // Fields
  fieldGroup: {
    gap: 6,
  },
  row: {
    flexDirection: IS_NARROW ? 'column' : 'row',
    gap: IS_NARROW ? 14 : 12,
  },
  fieldHalf: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 10,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: c.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
    // overrides on textArea variant
  },
  inputUnit: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '600',
    marginLeft: 4,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 10,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    minHeight: 44,
    gap: 8,
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    color: c.inputPlaceholder,
  },
  selectorTextActive: {
    color: c.text,
    fontWeight: '500',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: IS_NARROW ? 12 : 20,
    paddingVertical: 12,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  cancelButtonText: {
    color: c.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1.4,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary,
    gap: 8,
  },
  saveButtonText: {
    color: c.onPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Player picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickerModal: {
    backgroundColor: c.surface,
    borderRadius: 14,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.text,
  },
  pickerModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  pickerModalItemText: {
    fontSize: 14,
    color: c.text,
  },
});

export default AnthropometryForm;
