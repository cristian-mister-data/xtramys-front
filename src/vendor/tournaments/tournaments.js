import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  Platform,
  Pressable,
  BackHandler,
  Image,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {
  fetchTournamentsByTeam,
  createTournament,
  updateTournament,
  deleteTournament,
  fetchTournamentSanctions,
} from '@/store/slices/tournament/tournamentThunks';
import { clearSanctions } from '@/store/slices/tournament/tournamentSlice';
import AppLayout from '@/vendor/shared/appLayout';
import EditMatchSheetModal from '@/vendor/season/EditMatchSheetModal';
import MatchSheetDetailModal from '@/vendor/season/MatchSheetDetailModal';
import {
  createMatchSheet,
  updateMatchSheet,
  fetchMatchSheetsByTeam,
} from '@/store/slices/matchSheet/matchSheetThunks';

const THEME = {
  primary: '#1a237e',
  primaryLight: '#3949ab',
  secondary: '#00bcd4',
  accent: '#ff6b35',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  gradient: ['#1a237e', '#3949ab', '#5c6bc0'],
};

const TOURNAMENT_TYPES = [
  { value: 'liga', label: 'tournaments.league', icon: 'format-list-numbered', color: '#3B82F6' },
  { value: 'copa', label: 'tournaments.copa', icon: 'emoji-events', color: '#F59E0B' },
  { value: 'torneo', label: 'tournaments.tournament', icon: 'military-tech', color: '#8B5CF6' },
  { value: 'amistoso', label: 'tournaments.friendly', icon: 'handshake', color: '#10B981' },
  { value: 'otro', label: 'tournaments.other', icon: 'sports', color: '#6B7280' },
];

const FORMATO_OPTIONS = [
  { value: 'liga', label: 'tournaments.formatLeague' },
  { value: 'eliminatoria', label: 'tournaments.formatKnockout' },
  { value: 'grupos+eliminatoria', label: 'tournaments.formatGroupsKnockout' },
];

const RONDAS_OPTIONS = [
  { value: 'final', label: 'tournaments.roundFinal' },
  { value: 'semifinal', label: 'tournaments.roundSemifinal' },
  { value: 'cuartos', label: 'tournaments.roundQuarters' },
  { value: 'octavos', label: 'tournaments.roundRound16' },
  { value: 'dieciseisavos', label: 'tournaments.roundRound32' },
  { value: 'treintaydosavos', label: 'tournaments.roundRound64' },
];

const TOURNAMENT_COLORS = [
  '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#3B82F6',
  '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#84CC16',
];

const EMPTY_ARRAY = [];
const selectTeams = state => state.team.teams || EMPTY_ARRAY;
const selectTournaments = state => state.tournament.tournaments || EMPTY_ARRAY;
const selectMatchSheets = state => state.matchSheet.matchSheets || EMPTY_ARRAY;
const selectPlayers = state => state.player.players || EMPTY_ARRAY;
const selectRivals = state => state.rival?.rivals || EMPTY_ARRAY;
const selectInjuries = state => state.injury?.injuries || EMPTY_ARRAY;

/* ================== Tournament Card ================== */
function TournamentCard({ tournament, onPress, onOpenOptions, matchCount, IS_MOBILE }) {
  const { t, i18n } = useTranslation();
  const tipoInfo = TOURNAMENT_TYPES.find(tt => tt.value === tournament.tipo) || TOURNAMENT_TYPES[1];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const locale = i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US';
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Pressable
      onPress={() => onPress(tournament)}
      style={({ pressed }) => [
        styles.tournamentCard,
        IS_MOBILE && styles.tournamentCardMobile,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[styles.tournamentCardStripe, { backgroundColor: tournament.color || tipoInfo.color }]} />
      <View style={styles.tournamentCardBody}>
        <View style={styles.tournamentCardHeader}>
          <View style={[styles.tournamentTypeIcon, { backgroundColor: (tournament.color || tipoInfo.color) + '20' }]}>
            <MaterialIcons name={tipoInfo.icon} size={IS_MOBILE ? 22 : 26} color={tournament.color || tipoInfo.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tournamentCardTitle, IS_MOBILE && { fontSize: 15 }]} numberOfLines={1}>
              {tournament.nombre}
            </Text>
            <Text style={styles.tournamentCardType}>
              {t(tipoInfo.label)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={[
              styles.statusBadge,
              tournament.estado === 'activo' ? styles.statusActive : styles.statusFinished
            ]}>
              <Text style={[
                styles.statusBadgeText,
                tournament.estado === 'activo' ? styles.statusActiveText : styles.statusFinishedText
              ]}>
                {tournament.estado === 'activo' ? t('tournaments.active') : t('tournaments.finished')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); onOpenOptions(tournament); }}
              style={styles.optionsBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="more-vert" size={20} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tournamentCardMeta}>
          {(tournament.fechaInicio || tournament.fechaFin) && (
            <View style={styles.metaItem}>
              <MaterialIcons name="date-range" size={14} color={THEME.textSecondary} />
              <Text style={styles.metaText}>
                {tournament.fechaInicio ? formatDate(tournament.fechaInicio) : ''}
                {tournament.fechaInicio && tournament.fechaFin ? ' → ' : ''}
                {tournament.fechaFin ? formatDate(tournament.fechaFin) : ''}
              </Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <MaterialIcons name="sports-soccer" size={14} color={THEME.textSecondary} />
            <Text style={styles.metaText}>
              {matchCount} {matchCount === 1 ? t('tournaments.match') : t('tournaments.matches')}
            </Text>
          </View>
        </View>

        {tournament.descripcion ? (
          <Text style={styles.tournamentCardDesc} numberOfLines={2}>
            {tournament.descripcion}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/* ================== Create/Edit Tournament Modal ================== */
function TournamentFormModal({ visible, onClose, onSave, tournament, loading, IS_MOBILE }) {
  const { t, i18n } = useTranslation();
  const isEditing = !!tournament;

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('torneo');
  const [estado, setEstado] = useState('activo');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('#F59E0B');
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [porDefecto, setPorDefecto] = useState(false);

  // Advanced config
  const [formato, setFormato] = useState('eliminatoria');
  const [tieneGrupos, setTieneGrupos] = useState(false);
  const [numGrupos, setNumGrupos] = useState('2');
  const [equiposPorGrupo, setEquiposPorGrupo] = useState('4');
  const [rondasEliminatorias, setRondasEliminatorias] = useState('cuartos');
  const [formatoPartido, setFormatoPartido] = useState('unico');
  const [idaYvueltaDesde, setIdaYvueltaDesde] = useState('todas');
  const [formatoFinal, setFormatoFinal] = useState('unico');
  const [cicloAmarillas, setCicloAmarillas] = useState('5');

  useEffect(() => {
    if (tournament) {
      setNombre(tournament.nombre || '');
      setTipo(tournament.tipo || 'torneo');
      setEstado(tournament.estado || 'activo');
      setDescripcion(tournament.descripcion || '');
      setColor(tournament.color || '#F59E0B');
      setFechaInicio(tournament.fechaInicio ? new Date(tournament.fechaInicio) : null);
      setFechaFin(tournament.fechaFin ? new Date(tournament.fechaFin) : null);
      setFormato(tournament.formato || 'eliminatoria');
      setTieneGrupos(tournament.tieneGrupos || false);
      setNumGrupos(String(tournament.numGrupos || 2));
      setEquiposPorGrupo(String(tournament.equiposPorGrupo || 4));
      setRondasEliminatorias(tournament.rondasEliminatorias || 'cuartos');
      setFormatoPartido(tournament.formatoPartido || 'unico');
      setIdaYvueltaDesde(tournament.idaYvueltaDesde || 'todas');
      setFormatoFinal(tournament.formatoFinal || 'unico');
      setCicloAmarillas(String(tournament.cicloAmarillas || 5));
      setPorDefecto(tournament.porDefecto || false);
      setShowAdvanced(!!tournament.formato);
    } else {
      setNombre('');
      setTipo('torneo');
      setEstado('activo');
      setDescripcion('');
      setColor('#F59E0B');
      setFechaInicio(null);
      setFechaFin(null);
      setFormato('eliminatoria');
      setTieneGrupos(false);
      setNumGrupos('2');
      setEquiposPorGrupo('4');
      setRondasEliminatorias('cuartos');
      setFormatoPartido('unico');
      setIdaYvueltaDesde('todas');
      setFormatoFinal('unico');
      setCicloAmarillas('5');
      setPorDefecto(false);
      setShowAdvanced(false);
    }
  }, [tournament, visible]);

  const handleSave = () => {
    if (!nombre.trim()) {
      Alert.alert(t('common.error'), t('tournaments.nameRequired'));
      return;
    }
    const data = {
      nombre: nombre.trim(),
      tipo,
      estado,
      descripcion: descripcion.trim(),
      color,
      fechaInicio: fechaInicio ? fechaInicio.toISOString() : null,
      fechaFin: fechaFin ? fechaFin.toISOString() : null,
      porDefecto,
    };
    // Advanced config — only include if explicitly set
    if (tipo === 'liga') {
      data.formato = 'liga';
      data.cicloAmarillas = parseInt(cicloAmarillas) || 5;
      // Liga no tiene rondas eliminatorias — limpiar campos por si existían
      data.rondasEliminatorias = undefined;
      data.formatoPartido = undefined;
      data.idaYvueltaDesde = undefined;
      data.formatoFinal = undefined;
      data.tieneGrupos = false;
    } else if (tipo === 'copa' || tipo === 'torneo') {
      data.formato = formato;
      data.cicloAmarillas = parseInt(cicloAmarillas) || 5;
      if (formato === 'grupos+eliminatoria') {
        data.tieneGrupos = true;
        data.numGrupos = parseInt(numGrupos) || 2;
        data.equiposPorGrupo = parseInt(equiposPorGrupo) || 4;
      } else {
        data.tieneGrupos = false;
      }
      if (formato !== 'liga') {
        data.rondasEliminatorias = rondasEliminatorias;
        data.formatoPartido = formatoPartido;
        data.formatoFinal = formatoFinal;
        if (formatoPartido === 'idayvuelta') {
          data.idaYvueltaDesde = idaYvueltaDesde;
        }
      }
    }
    onSave(data);
  };

  const formatDate = (date) => {
    if (!date) return t('tournaments.selectDate');
    const locale = i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={[styles.modalContent, IS_MOBILE && styles.modalContentMobile]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialIcons name="emoji-events" size={24} color={THEME.primary} />
              <Text style={styles.modalTitle}>
                {isEditing ? t('tournaments.editTitle') : t('tournaments.createTitle')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <MaterialIcons name="close" size={24} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Nombre */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('tournaments.name')} *</Text>
              <TextInput
                style={styles.formInput}
                value={nombre}
                onChangeText={setNombre}
                placeholder={t('tournaments.namePlaceholder')}
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Tipo */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('tournaments.type')}</Text>
              <View style={styles.typeSelector}>
                {TOURNAMENT_TYPES.map(tt => (
                  <TouchableOpacity
                    key={tt.value}
                    style={[
                      styles.typeOption,
                      tipo === tt.value && { backgroundColor: tt.color + '20', borderColor: tt.color },
                    ]}
                    onPress={() => setTipo(tt.value)}
                  >
                    <MaterialIcons name={tt.icon} size={20} color={tipo === tt.value ? tt.color : THEME.textSecondary} />
                    <Text style={[
                      styles.typeOptionText,
                      tipo === tt.value && { color: tt.color, fontWeight: '600' },
                    ]}>
                      {t(tt.label)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Estado */}
            {isEditing && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('tournaments.status')}</Text>
                <View style={styles.statusSelector}>
                  <TouchableOpacity
                    style={[styles.statusOption, estado === 'activo' && styles.statusOptionActive]}
                    onPress={() => setEstado('activo')}
                  >
                    <MaterialIcons name="play-circle-filled" size={18} color={estado === 'activo' ? THEME.success : THEME.textSecondary} />
                    <Text style={[styles.statusOptionText, estado === 'activo' && { color: THEME.success, fontWeight: '600' }]}>
                      {t('tournaments.active')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusOption, estado === 'finalizado' && styles.statusOptionFinished]}
                    onPress={() => setEstado('finalizado')}
                  >
                    <MaterialIcons name="check-circle" size={18} color={estado === 'finalizado' ? THEME.textSecondary : THEME.textSecondary} />
                    <Text style={[styles.statusOptionText, estado === 'finalizado' && { color: THEME.text, fontWeight: '600' }]}>
                      {t('tournaments.finished')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Fechas */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('tournaments.dates')}</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker('inicio')}
                >
                  <MaterialIcons name="event" size={18} color={THEME.primary} />
                  <View>
                    <Text style={styles.dateLabelSmall}>{t('tournaments.startDate')}</Text>
                    <Text style={styles.dateValue}>{formatDate(fechaInicio)}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker('fin')}
                >
                  <MaterialIcons name="event" size={18} color={THEME.error} />
                  <View>
                    <Text style={styles.dateLabelSmall}>{t('tournaments.endDate')}</Text>
                    <Text style={styles.dateValue}>{formatDate(fechaFin)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Color */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('tournaments.color')}</Text>
              <View style={styles.colorSelector}>
                {TOURNAMENT_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      color === c && styles.colorDotSelected,
                    ]}
                    onPress={() => setColor(c)}
                  >
                    {color === c && <MaterialIcons name="check" size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Descripción */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('tournaments.description')}</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder={t('tournaments.descriptionPlaceholder')}
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Torneo por defecto */}
            <View style={[styles.formGroup, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <MaterialIcons name="star" size={20} color={porDefecto ? THEME.warning : THEME.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>{t('tournaments.setAsDefault') || 'Torneo por defecto'}</Text>
                  <Text style={{ color: THEME.textSecondary, fontSize: 12 }}>{t('tournaments.defaultHint') || 'Se preseleccionará al crear fichas de partido'}</Text>
                </View>
              </View>
              <Switch
                value={porDefecto}
                onValueChange={setPorDefecto}
                trackColor={{ false: THEME.border, true: THEME.warning + '80' }}
                thumbColor={porDefecto ? THEME.warning : '#f4f3f4'}
              />
            </View>

            {/* ─── Configuración avanzada ─── */}
            {(tipo === 'liga' || tipo === 'copa' || tipo === 'torneo') && (
              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={styles.advancedToggle}
                  onPress={() => setShowAdvanced(!showAdvanced)}
                >
                  <MaterialIcons name="tune" size={20} color={THEME.primary} />
                  <Text style={styles.advancedToggleText}>{t('tournaments.advancedConfig')}</Text>
                  <MaterialIcons name={showAdvanced ? 'expand-less' : 'expand-more'} size={24} color={THEME.textSecondary} />
                </TouchableOpacity>

                {showAdvanced && (
                  <View style={styles.advancedSection}>
                    {/* Formato (solo copa/torneo — liga no tiene estas opciones) */}
                    {tipo !== 'liga' && (tipo === 'copa' || tipo === 'torneo') && (
                      <View style={styles.configRow}>
                        <Text style={styles.configLabel}>{t('tournaments.format')}</Text>
                        <View style={styles.configChips}>
                          {FORMATO_OPTIONS.map(opt => (
                            <TouchableOpacity
                              key={opt.value}
                              style={[styles.configChip, formato === opt.value && styles.configChipActive]}
                              onPress={() => setFormato(opt.value)}
                            >
                              <Text style={[styles.configChipText, formato === opt.value && styles.configChipTextActive]}>
                                {t(opt.label)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Fase de grupos */}
                    {tipo !== 'liga' && formato === 'grupos+eliminatoria' && (
                      <>
                        <View style={styles.configRow}>
                          <Text style={styles.configLabel}>{t('tournaments.numberOfGroups')}</Text>
                          <View style={styles.numberInputRow}>
                            <TouchableOpacity style={styles.numberBtn} onPress={() => setNumGrupos(String(Math.max(1, parseInt(numGrupos || 1) - 1)))}>
                              <MaterialIcons name="remove" size={18} color={THEME.primary} />
                            </TouchableOpacity>
                            <Text style={styles.numberValue}>{numGrupos}</Text>
                            <TouchableOpacity style={styles.numberBtn} onPress={() => setNumGrupos(String(Math.min(32, parseInt(numGrupos || 0) + 1)))}>
                              <MaterialIcons name="add" size={18} color={THEME.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.configRow}>
                          <Text style={styles.configLabel}>{t('tournaments.teamsPerGroup')}</Text>
                          <View style={styles.numberInputRow}>
                            <TouchableOpacity style={styles.numberBtn} onPress={() => setEquiposPorGrupo(String(Math.max(2, parseInt(equiposPorGrupo || 2) - 1)))}>
                              <MaterialIcons name="remove" size={18} color={THEME.primary} />
                            </TouchableOpacity>
                            <Text style={styles.numberValue}>{equiposPorGrupo}</Text>
                            <TouchableOpacity style={styles.numberBtn} onPress={() => setEquiposPorGrupo(String(Math.min(20, parseInt(equiposPorGrupo || 0) + 1)))}>
                              <MaterialIcons name="add" size={18} color={THEME.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </>
                    )}

                    {/* Rondas eliminatorias (no para liga) */}
                    {tipo !== 'liga' && formato !== 'liga' && (
                      <View style={styles.configRow}>
                        <Text style={styles.configLabel}>{t('tournaments.knockoutRounds')}</Text>
                        <View style={styles.configChips}>
                          {RONDAS_OPTIONS.map(opt => (
                            <TouchableOpacity
                              key={opt.value}
                              style={[styles.configChip, rondasEliminatorias === opt.value && styles.configChipActive]}
                              onPress={() => setRondasEliminatorias(opt.value)}
                            >
                              <Text style={[styles.configChipText, rondasEliminatorias === opt.value && styles.configChipTextActive]}>
                                {t(opt.label)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Formato de partido (no para liga) */}
                    {tipo !== 'liga' && formato !== 'liga' && (
                      <View style={styles.configRow}>
                        <Text style={styles.configLabel}>{t('tournaments.matchFormat')}</Text>
                        <View style={styles.configChips}>
                          <TouchableOpacity
                            style={[styles.configChip, formatoPartido === 'unico' && styles.configChipActive]}
                            onPress={() => setFormatoPartido('unico')}
                          >
                            <Text style={[styles.configChipText, formatoPartido === 'unico' && styles.configChipTextActive]}>
                              {t('tournaments.singleMatch')}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.configChip, formatoPartido === 'idayvuelta' && styles.configChipActive]}
                            onPress={() => setFormatoPartido('idayvuelta')}
                          >
                            <Text style={[styles.configChipText, formatoPartido === 'idayvuelta' && styles.configChipTextActive]}>
                              {t('tournaments.twoLegged')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Ida y vuelta desde */}
                    {tipo !== 'liga' && formatoPartido === 'idayvuelta' && formato !== 'liga' && (
                      <View style={styles.configRow}>
                        <Text style={styles.configLabel}>{t('tournaments.twoLeggedFrom')}</Text>
                        <View style={styles.configChips}>
                          <TouchableOpacity
                            style={[styles.configChip, idaYvueltaDesde === 'todas' && styles.configChipActive]}
                            onPress={() => setIdaYvueltaDesde('todas')}
                          >
                            <Text style={[styles.configChipText, idaYvueltaDesde === 'todas' && styles.configChipTextActive]}>
                              {t('tournaments.allRounds')}
                            </Text>
                          </TouchableOpacity>
                          {RONDAS_OPTIONS.map(opt => (
                            <TouchableOpacity
                              key={opt.value}
                              style={[styles.configChip, idaYvueltaDesde === opt.value && styles.configChipActive]}
                              onPress={() => setIdaYvueltaDesde(opt.value)}
                            >
                              <Text style={[styles.configChipText, idaYvueltaDesde === opt.value && styles.configChipTextActive]}>
                                {t(opt.label)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Formato de la final (solo para eliminatorias) */}
                    {tipo !== 'liga' && formato !== 'liga' && (
                      <View style={styles.configRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MaterialIcons name="emoji-events" size={18} color={THEME.primary} />
                          <Text style={styles.configLabel}>{t('tournaments.finalFormat')}</Text>
                        </View>
                        <View style={styles.configChips}>
                          <TouchableOpacity
                            style={[styles.configChip, formatoFinal === 'unico' && styles.configChipActive]}
                            onPress={() => setFormatoFinal('unico')}
                          >
                            <Text style={[styles.configChipText, formatoFinal === 'unico' && styles.configChipTextActive]}>
                              {t('tournaments.finalSingleMatch')}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.configChip, formatoFinal === 'idayvuelta' && styles.configChipActive]}
                            onPress={() => setFormatoFinal('idayvuelta')}
                          >
                            <Text style={[styles.configChipText, formatoFinal === 'idayvuelta' && styles.configChipTextActive]}>
                              {t('tournaments.finalTwoLegged')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Ciclo de sanciones */}
                    <View style={[styles.configRow, { borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: 12, marginTop: 4 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="gavel" size={18} color={THEME.warning} />
                        <Text style={styles.configLabel}>{t('tournaments.sanctionCycle')}</Text>
                      </View>
                      <View style={styles.numberInputRow}>
                        <TouchableOpacity style={styles.numberBtn} onPress={() => setCicloAmarillas(String(Math.max(1, parseInt(cicloAmarillas || 1) - 1)))}>
                          <MaterialIcons name="remove" size={18} color={THEME.warning} />
                        </TouchableOpacity>
                        <Text style={[styles.numberValue, { color: THEME.warning }]}>{cicloAmarillas}</Text>
                        <TouchableOpacity style={styles.numberBtn} onPress={() => setCicloAmarillas(String(Math.min(20, parseInt(cicloAmarillas || 0) + 1)))}>
                          <MaterialIcons name="add" size={18} color={THEME.warning} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.configHint}>
                      {t('tournaments.sanctionCycleHint', { count: cicloAmarillas })}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </KeyboardAwareScrollView>

          {/* Footer buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name={isEditing ? 'save' : 'add'} size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {isEditing ? t('common.save') : t('tournaments.create')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <DateTimePickerModal
            isVisible={showDatePicker !== null}
            mode="date"
            date={showDatePicker === 'inicio' ? (fechaInicio || new Date()) : (fechaFin || new Date())}
            onConfirm={(date) => {
              if (showDatePicker === 'inicio') setFechaInicio(date);
              else setFechaFin(date);
              setShowDatePicker(null);
            }}
            onCancel={() => setShowDatePicker(null)}
          />
        </View>
      </View>
    </Modal>
  );
}

/* ================== Tournament Detail Modal ================== */
function TournamentDetailModal({ tournament, matches, onClose, onEdit, onDelete, IS_MOBILE, onViewMatch, onCreateMatch, visible, sanctions, loadingSanctions }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const currentLang = i18n.language?.split('-')[0] || 'es';
  const [detailTab, setDetailTab] = useState('matches');

  if (!tournament) return null;

  const tipoInfo = TOURNAMENT_TYPES.find(tt => tt.value === tournament.tipo) || TOURNAMENT_TYPES[1];
  const cicloAmarillas = tournament.cicloAmarillas || 5;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const locale = currentLang === 'en' ? 'en-US' : 'es-ES';
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatMatchDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const locale = currentLang === 'en' ? 'en-US' : 'es-ES';
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const dateA = a.fechaHora ? new Date(a.fechaHora) : new Date(0);
      const dateB = b.fechaHora ? new Date(b.fechaHora) : new Date(0);
      return dateA - dateB;
    });
  }, [matches]);

  // Calculate stats
  const stats = useMemo(() => {
    const played = matches.filter(m => m.resultado);
    const wins = played.filter(m => m.resultado === 'Victoria');
    const draws = played.filter(m => m.resultado === 'Empate');
    const losses = played.filter(m => m.resultado === 'Derrota');
    return { played: played.length, wins: wins.length, draws: draws.length, losses: losses.length };
  }, [matches]);

  const getResultColors = (result) => {
    if (!result) return ['#818cf8', '#6366f1'];
    switch(result) {
      case 'Victoria': return ['#10b981', '#059669'];
      case 'Empate': return ['#f59e0b', '#d97706'];
      case 'Derrota': return ['#ef4444', '#dc2626'];
      default: return ['#94a3b8', '#64748b'];
    }
  };

  const isMatchFuture = (match) => {
    if (!match.fechaHora) return true;
    return new Date(match.fechaHora) >= new Date();
  };

  // Sort sanctions: sanctioned first, then warnings, then by total yellows desc
  const sortedSanctions = useMemo(() => {
    if (!sanctions || sanctions.length === 0) return [];
    return [...sanctions].sort((a, b) => {
      if (a.sancionado && !b.sancionado) return -1;
      if (!a.sancionado && b.sancionado) return 1;
      if (a.alertaProximaSancion && !b.alertaProximaSancion) return -1;
      if (!a.alertaProximaSancion && b.alertaProximaSancion) return 1;
      return b.amarillasTotal - a.amarillasTotal;
    });
  }, [sanctions]);

  const renderMatchesTab = () => (
    <>
      {/* Matches list */}
      <View style={styles.matchesSection}>
        <Text style={styles.sectionTitle}>
          {t('tournaments.matches')} ({matches.length})
        </Text>
        {sortedMatches.length === 0 ? (
          <View style={styles.emptyMatchesCard}>
            <MaterialIcons name="sports-soccer" size={40} color={THEME.border} />
            <Text style={styles.emptyText}>{t('tournaments.noMatches')}</Text>
            <Text style={styles.emptySubtext}>{t('tournaments.noMatchesHint')}</Text>
          </View>
        ) : (
          sortedMatches.map((match, idx) => {
            const colors = getResultColors(isMatchFuture(match) && !match.resultado ? null : match.resultado);
            const isFuture = isMatchFuture(match) && !match.resultado;
            return (
              <Pressable
                key={match._id || idx}
                style={({ pressed }) => [styles.matchCard, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
                onPress={() => onViewMatch(match)}
              >
                <LinearGradient colors={colors} style={styles.matchCardIndicator} />
                {match.rivalEscudo ? (
                  <Image source={{ uri: match.rivalEscudo }} style={styles.matchCardEscudo} resizeMode="contain" />
                ) : (
                  <View style={[styles.matchCardEscudoPlaceholder, { backgroundColor: colors[0] + '15' }]}>
                    <Ionicons name="shield-outline" size={IS_MOBILE ? 18 : 20} color={colors[1]} />
                  </View>
                )}
                <View style={styles.matchCardContent}>
                  <Text style={styles.matchCardRival} numberOfLines={1}>{match.rival || '-'}</Text>
                  <View style={styles.matchCardTags}>
                    {isFuture ? (
                      <View style={[styles.matchCardTag, { backgroundColor: '#eef2ff' }]}>
                        <Ionicons name="time-outline" size={11} color="#6366f1" />
                        <Text style={[styles.matchCardTagText, { color: '#6366f1' }]}>{t('matchSheet.matchToBePlayed')}</Text>
                      </View>
                    ) : match.golesFavor != null && match.golesContra != null ? (
                      <View style={[styles.matchCardTag, { backgroundColor: colors[0] + '18' }]}>
                        <Ionicons name="football" size={11} color={colors[1]} />
                        <Text style={[styles.matchCardTagText, { color: colors[1], fontWeight: '700' }]}>
                          {match.golesFavor} - {match.golesContra}
                        </Text>
                      </View>
                    ) : null}
                    {match.fechaHora && (
                      <View style={styles.matchCardTag}>
                        <Ionicons name="calendar-outline" size={11} color={THEME.textSecondary} />
                        <Text style={styles.matchCardTagText}>{formatMatchDate(match.fechaHora)}</Text>
                      </View>
                    )}
                    {(match.jornada || match.fase === 'eliminatoria' || match.fase === 'grupos') && (
                      <View style={[styles.matchCardTag, { backgroundColor: '#fef3c7' }]}>
                        <Ionicons name="trophy-outline" size={11} color="#d97706" />
                        <Text style={[styles.matchCardTagText, { color: '#d97706' }]}>
                          {match.fase === 'eliminatoria' && match.ronda
                            ? `${t(`tournaments.round${({final:'Final',semifinal:'Semifinal',cuartos:'Quarters',octavos:'Round16',dieciseisavos:'Round32',treintaydosavos:'Round64'})[match.ronda] || 'Final'}`)}${match.pierna === 'ida' ? ` (${t('matchSheet.fields.legFirst')})` : match.pierna === 'vuelta' ? ` (${t('matchSheet.fields.legSecond')})` : match.pierna === 'unico' ? ` (${t('matchSheet.fields.legSingle')})` : ''}`
                            : match.fase === 'grupos' && match.grupo
                              ? `${t('matchSheet.fields.groupN', { n: match.grupo })}${match.jornada ? ` · ${t('matchSheet.fields.matchday')} ${match.jornada}` : ''}`
                              : `${t('matchSheet.fields.matchday')} ${match.jornada}`}
                        </Text>
                      </View>
                    )}
                    {match.ubicacion && (
                      <View style={[styles.matchCardTag, { backgroundColor: '#f3e8ff' }]}>
                        <Ionicons name={['Casa','local'].includes(match.ubicacion) ? 'home' : ['Fuera','visitante'].includes(match.ubicacion) ? 'airplane' : 'location'} size={11} color="#7c3aed" />
                        <Text style={[styles.matchCardTagText, { color: '#7c3aed' }]}>
                          {['Casa','local'].includes(match.ubicacion) ? t('matchSheet.modals.home') : ['Fuera','visitante'].includes(match.ubicacion) ? t('matchSheet.modals.away') : t('matchSheet.modals.neutral')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.matchCardArrow}>
                  <Ionicons name="chevron-forward" size={18} color={THEME.textSecondary} />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
      {/* Create match button */}
      <TouchableOpacity style={styles.createMatchBtn} onPress={() => onCreateMatch()}>
        <MaterialIcons name="add-circle" size={20} color={THEME.primary} />
        <Text style={styles.createMatchBtnText}>{t('tournaments.createMatch')}</Text>
      </TouchableOpacity>
    </>
  );

  const [expandedSanctionPlayer, setExpandedSanctionPlayer] = useState(null);

  const renderSanctionsTab = () => {
    if (loadingSanctions) {
      return (
        <View style={styles.sanctionLoadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      );
    }

    if (!sortedSanctions || sortedSanctions.length === 0) {
      return (
        <View style={styles.emptyMatchesCard}>
          <MaterialIcons name="gavel" size={40} color={THEME.border} />
          <Text style={styles.emptyText}>{t('tournaments.noSanctionData')}</Text>
          <Text style={styles.emptySubtext}>{t('tournaments.noSanctionDataHint')}</Text>
        </View>
      );
    }

    const formatSanctionDate = (fecha) => {
      if (!fecha) return '';
      const d = new Date(fecha);
      return d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' });
    };

    const getSanctionTypeLabel = (tipo) => {
      if (tipo === 'rojaDirecta') return t('tournaments.directRed');
      if (tipo === 'dobleAmarilla') return t('tournaments.doubleYellowToRed');
      if (tipo === 'cicloAmarillas') return t('tournaments.cycleCompleted');
      return tipo;
    };

    const getSanctionTypeIcon = (tipo) => {
      if (tipo === 'rojaDirecta') return { name: 'square', color: '#ef4444' };
      if (tipo === 'dobleAmarilla') return { name: 'square', color: '#f97316' };
      if (tipo === 'cicloAmarillas') return { name: 'loop', color: '#8b5cf6' };
      return { name: 'gavel', color: THEME.textSecondary };
    };

    return (
      <View style={styles.matchesSection}>
        <Text style={styles.sectionTitle}>{t('tournaments.sanctions')} ({sortedSanctions.length})</Text>
        {sortedSanctions.map((player) => {
          const isExpanded = expandedSanctionPlayer === player.playerId;
          const sancionesActivas = (player.sanciones || []).filter(s => s.estado === 'pendiente');
          const sancionesCumplidas = (player.sanciones || []).filter(s => s.estado === 'cumplida');

          return (
            <View key={player.playerId} style={styles.sanctionCard}>
              {/* Header - tappable to expand */}
              <TouchableOpacity
                style={styles.sanctionBadgesRow}
                onPress={() => setExpandedSanctionPlayer(isExpanded ? null : player.playerId)}
                activeOpacity={0.7}
              >
                <Text style={styles.sanctionPlayerName} numberOfLines={1}>{player.playerName}</Text>
                <View style={styles.sanctionBadgesRight}>
                  {player.sancionado && (
                    <View style={styles.sanctionBadge}>
                      <MaterialIcons name="block" size={11} color="#fff" />
                      <Text style={styles.sanctionBadgeText}>{t('tournaments.sanctionedBadge')}</Text>
                    </View>
                  )}
                  {player.alertaProximaSancion && !player.sancionado && (
                    <View style={styles.sanctionWarningBadge}>
                      <MaterialIcons name="warning" size={11} color="#fff" />
                      <Text style={styles.sanctionWarningBadgeText}>{t('tournaments.warningBadge')}</Text>
                    </View>
                  )}
                  <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={20} color={THEME.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Stats chips */}
              <View style={styles.sanctionStatsRow}>
                <View style={[styles.sanctionStatChip, { backgroundColor: '#fef3c7' }]}>
                  <View style={[styles.sanctionStatDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={[styles.sanctionStatText, { color: '#d97706' }]}>{player.amarillasTotal} {t('tournaments.yellowCards')}</Text>
                </View>
                <View style={[styles.sanctionStatChip, { backgroundColor: '#fee2e2' }]}>
                  <View style={[styles.sanctionStatDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={[styles.sanctionStatText, { color: '#dc2626' }]}>{player.rojasTotal} {t('tournaments.redCards')}</Text>
                </View>
                {player.dobleAmarillaTotal > 0 && (
                  <View style={[styles.sanctionStatChip, { backgroundColor: '#fff7ed' }]}>
                    <View style={[styles.sanctionStatDot, { backgroundColor: '#f97316' }]} />
                    <Text style={[styles.sanctionStatText, { color: '#ea580c' }]}>{player.dobleAmarillaTotal} {t('tournaments.doubleYellow')}</Text>
                  </View>
                )}
                {player.ciclosCompletados > 0 && (
                  <View style={[styles.sanctionStatChip, { backgroundColor: '#ede9fe' }]}>
                    <View style={[styles.sanctionStatDot, { backgroundColor: '#8b5cf6' }]} />
                    <Text style={[styles.sanctionStatText, { color: '#7c3aed' }]}>{player.ciclosCompletados} {t('tournaments.cyclesCompleted')}</Text>
                  </View>
                )}
              </View>

              {/* Cycle card indicators */}
              <View style={styles.sanctionCycleRow}>
                <Text style={styles.sanctionCycleLabel}>
                  {t('tournaments.currentCycle')}:
                </Text>
                <View style={styles.sanctionCycleCards}>
                  {Array.from({ length: cicloAmarillas }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.sanctionCycleCardDot,
                        {
                          backgroundColor: i < player.amarillasCicloActual ? '#f59e0b' : '#e5e7eb',
                          borderColor: i < player.amarillasCicloActual ? '#d97706' : '#d1d5db',
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* Active sanctions with served match details */}
              {sancionesActivas.length > 0 && sancionesActivas.map((sancion, idx) => {
                const icon = getSanctionTypeIcon(sancion.tipo);
                return (
                  <View key={`active-${idx}`} style={styles.sanctionActiveBlock}>
                    <View style={styles.sanctionActiveHeader}>
                      <MaterialIcons name="block" size={14} color="#ef4444" />
                      <Text style={styles.sanctionActiveTitle}>
                        {getSanctionTypeLabel(sancion.tipo)} — {t('tournaments.pendingBan')}: {sancion.partidosPendientes} {sancion.partidosPendientes === 1 ? t('tournaments.match') : t('tournaments.matchesPlural')}
                      </Text>
                    </View>
                    <View style={styles.sanctionOriginRow}>
                      <MaterialIcons name={icon.name} size={10} color={icon.color} />
                      <Text style={styles.sanctionOriginText}>
                        {t('tournaments.sanctionOrigin')}: vs {sancion.origen?.rival} ({formatSanctionDate(sancion.origen?.fecha)})
                      </Text>
                    </View>
                    {/* Progress: served matches */}
                    <View style={styles.sanctionProgressRow}>
                      {Array.from({ length: sancion.partidosSancion }).map((_, mi) => {
                        const served = sancion.partidosCumplidosDetalle?.[mi];
                        return (
                          <View key={mi} style={[styles.sanctionMatchSlot, served ? styles.sanctionMatchSlotServed : styles.sanctionMatchSlotPending]}>
                            <MaterialIcons name={served ? 'check-circle' : 'radio-button-unchecked'} size={12} color={served ? '#16a34a' : '#d1d5db'} />
                            <Text style={[styles.sanctionMatchSlotText, served ? { color: '#16a34a' } : { color: '#9ca3af' }]}>
                              {served ? `vs ${served.rival}` : t('tournaments.pendingMatch')}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              {/* Ban info summary if sanctioned but no sanciones array */}
              {player.sancionado && player.partidosSancion > 0 && sancionesActivas.length === 0 && (
                <View style={styles.sanctionBanInfo}>
                  <MaterialIcons name="event-busy" size={14} color={THEME.error} />
                  <Text style={styles.sanctionBanText}>
                    {t('tournaments.pendingBan')}: {player.partidosSancion} {player.partidosSancion === 1 ? t('tournaments.match') : t('tournaments.matchesPlural')}
                  </Text>
                </View>
              )}

              {/* Expanded: Sanction History */}
              {isExpanded && sancionesCumplidas.length > 0 && (
                <View style={styles.sanctionHistoryBlock}>
                  <View style={styles.sanctionHistoryHeader}>
                    <MaterialIcons name="history" size={14} color={THEME.textSecondary} />
                    <Text style={styles.sanctionHistoryTitle}>{t('tournaments.sanctionHistory')}</Text>
                  </View>
                  {sancionesCumplidas.map((sancion, idx) => {
                    const icon = getSanctionTypeIcon(sancion.tipo);
                    return (
                      <View key={`hist-${idx}`} style={styles.sanctionHistoryItem}>
                        <View style={styles.sanctionHistoryItemHeader}>
                          <View style={[styles.sanctionHistoryDot, { backgroundColor: icon.color }]} />
                          <Text style={styles.sanctionHistoryItemType}>{getSanctionTypeLabel(sancion.tipo)}</Text>
                          <View style={styles.sanctionHistoryServedBadge}>
                            <MaterialIcons name="check-circle" size={10} color="#16a34a" />
                            <Text style={styles.sanctionHistoryServedText}>{t('tournaments.served')}</Text>
                          </View>
                        </View>
                        <Text style={styles.sanctionHistoryOrigin}>
                          {t('tournaments.sanctionOrigin')}: vs {sancion.origen?.rival} ({formatSanctionDate(sancion.origen?.fecha)}) — {sancion.partidosSancion} {sancion.partidosSancion === 1 ? t('tournaments.match') : t('tournaments.matchesPlural')}
                        </Text>
                        {sancion.partidosCumplidosDetalle?.length > 0 && (
                          <View style={styles.sanctionServedList}>
                            {sancion.partidosCumplidosDetalle.map((det, di) => (
                              <View key={di} style={styles.sanctionServedItem}>
                                <MaterialIcons name="check" size={10} color="#16a34a" />
                                <Text style={styles.sanctionServedItemText}>
                                  vs {det.rival} ({formatSanctionDate(det.fecha)})
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {isExpanded && sancionesCumplidas.length === 0 && (
                <Text style={styles.sanctionNoHistory}>{t('tournaments.noSanctionHistory')}</Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: IS_MOBILE ? THEME.surface : 'rgba(0,0,0,0.15)', alignItems: 'center' }}>
        <View style={[styles.detailModalContent, IS_MOBILE && styles.detailModalContentMobile]}>
              {/* Header with tournament color */}
              <LinearGradient
                colors={[tournament.color || tipoInfo.color, (tournament.color || tipoInfo.color) + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.detailHeader, { paddingTop: Math.max(insets.top, 12) + 8 }]}
              >
                <View style={styles.detailHeaderContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailHeaderTitle}>{tournament.nombre}</Text>
                    <Text style={styles.detailHeaderSubtitle}>
                      {t(tipoInfo.label)} • {tournament.estado === 'activo' ? t('tournaments.active') : t('tournaments.finished')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.detailCloseBtn}>
                    <MaterialIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* Tab bar */}
              <View style={styles.detailTabBar}>
                <TouchableOpacity
                  style={[styles.detailTab, detailTab === 'matches' && styles.detailTabActive]}
                  onPress={() => setDetailTab('matches')}
                >
                  <MaterialIcons name="sports-soccer" size={18} color={detailTab === 'matches' ? THEME.primary : THEME.textSecondary} />
                  <Text style={[styles.detailTabText, detailTab === 'matches' && styles.detailTabTextActive]}>
                    {t('tournaments.matches')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailTab, detailTab === 'sanctions' && styles.detailTabActive]}
                  onPress={() => setDetailTab('sanctions')}
                >
                  <MaterialIcons name="gavel" size={18} color={detailTab === 'sanctions' ? THEME.primary : THEME.textSecondary} />
                  <Text style={[styles.detailTabText, detailTab === 'sanctions' && styles.detailTabTextActive]}>
                    {t('tournaments.sanctionsTab')}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={[styles.modalBody, { flex: 1 }]} showsVerticalScrollIndicator={false}>
                {/* Info */}
                {(tournament.fechaInicio || tournament.fechaFin || tournament.descripcion) && (
                  <View style={styles.detailInfoCard}>
                    {(tournament.fechaInicio || tournament.fechaFin) && (
                      <View style={styles.detailInfoRow}>
                        <MaterialIcons name="date-range" size={18} color={THEME.primary} />
                        <Text style={styles.detailInfoText}>
                          {formatDate(tournament.fechaInicio)} - {formatDate(tournament.fechaFin)}
                        </Text>
                      </View>
                    )}
                    {tournament.descripcion ? (
                      <Text style={styles.detailDescription}>{tournament.descripcion}</Text>
                    ) : null}
                  </View>
                )}

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { borderLeftColor: THEME.primary }]}>
                    <Text style={styles.statNumber}>{stats.played}</Text>
                    <Text style={styles.statLabel}>{t('tournaments.matches')}</Text>
                  </View>
                  <View style={[styles.statCard, { borderLeftColor: THEME.success }]}>
                    <Text style={styles.statNumber}>{stats.wins}</Text>
                    <Text style={styles.statLabel}>{t('tournaments.wins')}</Text>
                  </View>
                  <View style={[styles.statCard, { borderLeftColor: THEME.warning }]}>
                    <Text style={styles.statNumber}>{stats.draws}</Text>
                    <Text style={styles.statLabel}>{t('tournaments.draws')}</Text>
                  </View>
                  <View style={[styles.statCard, { borderLeftColor: THEME.error }]}>
                    <Text style={styles.statNumber}>{stats.losses}</Text>
                    <Text style={styles.statLabel}>{t('tournaments.losses')}</Text>
                  </View>
                </View>

                {/* Tab content */}
                {detailTab === 'matches' ? renderMatchesTab() : renderSanctionsTab()}

              </ScrollView>

              {/* Footer actions */}
              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 14) }]}>
                <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(tournament)}>
                  <MaterialIcons name="delete-outline" size={20} color={THEME.error} />
                  <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={() => onEdit(tournament)}>
                  <MaterialIcons name="edit" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>{t('common.edit')}</Text>
                </TouchableOpacity>
              </View>
        </View>
      </View>
    </Modal>
  );
}

/* ================== Options Modal ================== */
function OptionsModal({ visible, tournament, onClose, onEdit, onDelete, onToggleStatus }) {
  const { t } = useTranslation();
  if (!tournament) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.optionsOverlay} onPress={onClose}>
        <View style={styles.optionsCard}>
          <Text style={styles.optionsTitle} numberOfLines={1}>{tournament.nombre}</Text>
          <TouchableOpacity style={styles.optionItem} onPress={() => { onClose(); onEdit(tournament); }}>
            <MaterialIcons name="edit" size={22} color={THEME.primary} />
            <Text style={styles.optionText}>{t('common.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionItem} onPress={() => { onClose(); onToggleStatus(tournament); }}>
            <MaterialIcons
              name={tournament.estado === 'activo' ? 'check-circle' : 'play-circle-filled'}
              size={22}
              color={tournament.estado === 'activo' ? THEME.textSecondary : THEME.success}
            />
            <Text style={styles.optionText}>
              {tournament.estado === 'activo' ? t('tournaments.markFinished') : t('tournaments.markActive')}
            </Text>
          </TouchableOpacity>
          <View style={styles.optionDivider} />
          <TouchableOpacity style={styles.optionItem} onPress={() => { onClose(); onDelete(tournament); }}>
            <MaterialIcons name="delete-outline" size={22} color={THEME.error} />
            <Text style={[styles.optionText, { color: THEME.error }]}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

/* ================== Main Tournaments Component ================== */
export default function Tournaments() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;

  const teams = useSelector(selectTeams);
  const tournaments = useSelector(selectTournaments);
  const matchSheets = useSelector(selectMatchSheets);
  const players = useSelector(selectPlayers);
  const rivals = useSelector(selectRivals);
  const injuries = useSelector(selectInjuries);
  const loading = useSelector(state => state.tournament.loading);
  const sanctions = useSelector(state => state.tournament.sanctions);
  const loadingSanctions = useSelector(state => state.tournament.loadingSanctions);

  const selectedTeam = useMemo(() => teams.find(e => e.seleccionado === true), [teams]);

  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [detailTournament, setDetailTournament] = useState(null);
  const [optionsTournament, setOptionsTournament] = useState(null);
  const [filterStatus, setFilterStatus] = useState('todos'); // 'todos' | 'activo' | 'finalizado'
  const [saving, setSaving] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [creatingMatch, setCreatingMatch] = useState(false);

  // Fetch tournaments when team changes
  useEffect(() => {
    if (selectedTeam?._id) {
      dispatch(fetchTournamentsByTeam(selectedTeam._id));
    }
  }, [selectedTeam?._id, dispatch]);

  // Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detailTournament) { setDetailTournament(null); return true; }
      if (showForm) { setShowForm(false); setEditingTournament(null); return true; }
      return false;
    });
    return () => backHandler.remove();
  }, [detailTournament, showForm]);

  // Fetch sanctions when opening tournament detail
  useEffect(() => {
    if (detailTournament?._id) {
      dispatch(fetchTournamentSanctions(detailTournament._id));
    } else {
      dispatch(clearSanctions());
    }
  }, [detailTournament?._id, dispatch]);

  // Get matches for a specific tournament
  const getMatchesForTournament = useCallback((tournamentId) => {
    return matchSheets.filter(m => m.torneoId?._id === tournamentId || m.torneoId === tournamentId);
  }, [matchSheets]);

  // Filtered tournaments
  const filteredTournaments = useMemo(() => {
    if (filterStatus === 'todos') return tournaments;
    return tournaments.filter(t => t.estado === filterStatus);
  }, [tournaments, filterStatus]);

  // Handlers
  const handleCreate = () => {
    setEditingTournament(null);
    setShowForm(true);
  };

  const handleEdit = (tournament) => {
    setEditingTournament(tournament);
    setDetailTournament(null);
    setShowForm(true);
  };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editingTournament) {
        await dispatch(updateTournament({ id: editingTournament._id, data })).unwrap();
      } else {
        await dispatch(createTournament({ ...data, equipo: selectedTeam._id })).unwrap();
      }
      setShowForm(false);
      setEditingTournament(null);
    } catch (err) {
      Alert.alert(t('common.error'), err?.message || t('tournaments.saveError'));
    }
    setSaving(false);
  };

  const handleDelete = (tournament) => {
    Alert.alert(
      t('tournaments.deleteTitle'),
      t('tournaments.deleteMessage', { name: tournament.nombre }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteTournament(tournament._id)).unwrap();
              setDetailTournament(null);
            } catch (err) {
              Alert.alert(t('common.error'), err?.message || t('tournaments.deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (tournament) => {
    const newStatus = tournament.estado === 'activo' ? 'finalizado' : 'activo';
    try {
      await dispatch(updateTournament({
        id: tournament._id,
        data: { estado: newStatus },
      })).unwrap();
    } catch (err) {
      Alert.alert(t('common.error'), err?.message || t('tournaments.saveError'));
    }
  };

  const handleSaveMatchFromTournament = async (matchData) => {
    if (!selectedTeam?._id) return;
    try {
      if (matchData._id) {
        await dispatch(updateMatchSheet({ id: matchData._id, data: matchData })).unwrap();
      } else {
        await dispatch(createMatchSheet({ ...matchData, equipo: selectedTeam._id })).unwrap();
      }
      dispatch(fetchMatchSheetsByTeam(selectedTeam._id));
      // Re-fetch sanctions after saving match sheet
      if (detailTournament?._id) {
        dispatch(fetchTournamentSanctions(detailTournament._id));
      }
    } catch (err) {
      throw err;
    }
  };

  const handleSaveMatchSheet = async (data) => {
    if (!selectedTeam?._id || !detailTournament?._id) return;
    try {
      const saveData = editingMatch?._id
        ? data
        : { ...data, competicion: 'torneo', torneoId: detailTournament._id };
      await handleSaveMatchFromTournament(saveData);
      setEditingMatch(null);
      setCreatingMatch(false);
      setSelectedMatch(null);
    } catch (err) {
      throw err;
    }
  };

  // Render
  const renderTournament = ({ item }) => (
    <TournamentCard
      tournament={item}
      onPress={setDetailTournament}
      onOpenOptions={setOptionsTournament}
      matchCount={getMatchesForTournament(item._id).length}
      IS_MOBILE={IS_MOBILE}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="emoji-events" size={64} color={THEME.border} />
      <Text style={styles.emptyTitle}>{t('tournaments.emptyTitle')}</Text>
      <Text style={styles.emptySubtitle}>{t('tournaments.emptySubtitle')}</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleCreate}>
        <MaterialIcons name="add" size={20} color="#fff" />
        <Text style={styles.emptyButtonText}>{t('tournaments.createFirst')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AppLayout scrollEnabled={false}>
      <View style={styles.container}>
        {/* Header with filters */}
        <View style={styles.headerBar}>
          <View style={styles.filterRow}>
            {['todos', 'activo', 'finalizado'].map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                  {status === 'todos' ? t('tournaments.all') :
                   status === 'activo' ? t('tournaments.active') :
                   t('tournaments.finished')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
            <MaterialIcons name="add" size={22} color="#fff" />
            {!IS_MOBILE && <Text style={styles.addButtonText}>{t('tournaments.new')}</Text>}
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && tournaments.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredTournaments}
            renderItem={renderTournament}
            keyExtractor={item => item._id}
            contentContainerStyle={[
              styles.listContent,
              filteredTournaments.length === 0 && { flex: 1 },
            ]}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB for mobile */}
        {IS_MOBILE && tournaments.length > 0 && (
          <TouchableOpacity style={[styles.fab, { bottom: Math.max(insets.bottom, 20) }]} onPress={handleCreate} activeOpacity={0.8}>
            <LinearGradient colors={[THEME.primary, THEME.primaryLight]} style={styles.fabGradient}>
              <MaterialIcons name="add" size={28} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Modals */}
        <TournamentFormModal
          visible={showForm}
          onClose={() => { setShowForm(false); setEditingTournament(null); }}
          onSave={handleSave}
          tournament={editingTournament}
          loading={saving}
          IS_MOBILE={IS_MOBILE}
        />

        {detailTournament && (
          <TournamentDetailModal
            tournament={detailTournament}
            matches={getMatchesForTournament(detailTournament._id)}
            onClose={() => setDetailTournament(null)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            IS_MOBILE={IS_MOBILE}
            onViewMatch={setSelectedMatch}
            onCreateMatch={() => setCreatingMatch(true)}
            visible={!selectedMatch && !editingMatch && !creatingMatch}
            sanctions={sanctions}
            loadingSanctions={loadingSanctions}
          />
        )}

        <OptionsModal
          visible={!!optionsTournament}
          tournament={optionsTournament}
          onClose={() => setOptionsTournament(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />

        <MatchSheetDetailModal
          visible={!!selectedMatch}
          matchSheet={selectedMatch}
          team={selectedTeam}
          players={players}
          onClose={() => setSelectedMatch(null)}
          onEdit={(ms) => { setSelectedMatch(null); setEditingMatch(ms); }}
        />

        <EditMatchSheetModal
          visible={!!editingMatch || creatingMatch}
          matchSheet={editingMatch || (creatingMatch && detailTournament ? { competicion: 'torneo', torneoId: detailTournament._id, equipo: selectedTeam?._id } : null)}
          rivals={rivals}
          players={players}
          injuries={injuries}
          team={selectedTeam}
          matchSheets={matchSheets}
          sanctionedPlayerIds={(sanctions || []).filter(s => s.sancionado).map(s => s.playerId)}
          onClose={() => { setEditingMatch(null); setCreatingMatch(false); }}
          onSave={handleSaveMatchSheet}
        />
      </View>
    </AppLayout>
  );
}

/* ================== Styles ================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 12,
  },
  filterRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tournament Card
  tournamentCard: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  tournamentCardMobile: {
    borderRadius: 10,
  },
  tournamentCardStripe: {
    width: 5,
  },
  tournamentCardBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  tournamentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tournamentTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tournamentCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  tournamentCardType: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusActive: {
    backgroundColor: THEME.success + '15',
  },
  statusFinished: {
    backgroundColor: THEME.textSecondary + '15',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusActiveText: {
    color: THEME.success,
  },
  statusFinishedText: {
    color: THEME.textSecondary,
  },
  optionsBtn: {
    padding: 4,
  },
  tournamentCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  tournamentCardDesc: {
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: THEME.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  // Modal styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    width: '95%',
    maxWidth: 600,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalContentMobile: {
    width: '98%',
    maxHeight: '96%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  // Form styles
  formGroup: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: THEME.text,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: THEME.border,
    backgroundColor: THEME.background,
  },
  typeOptionText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: THEME.border,
    backgroundColor: THEME.background,
  },
  statusOptionActive: {
    borderColor: THEME.success,
    backgroundColor: THEME.success + '10',
  },
  statusOptionFinished: {
    borderColor: THEME.textSecondary,
    backgroundColor: THEME.textSecondary + '10',
  },
  statusOptionText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateLabelSmall: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
  dateValue: {
    fontSize: 13,
    color: THEME.text,
    fontWeight: '500',
  },
  colorSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  // Buttons
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cancelButtonText: {
    color: THEME.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: THEME.primary,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.error + '40',
    backgroundColor: THEME.error + '08',
  },
  deleteButtonText: {
    color: THEME.error,
    fontWeight: '600',
    fontSize: 14,
  },
  // Detail modal
  detailHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  detailHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  detailHeaderSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  detailCloseBtn: {
    padding: 4,
    marginLeft: 12,
  },
  detailInfoCard: {
    backgroundColor: THEME.background,
    borderRadius: 10,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailInfoText: {
    fontSize: 14,
    color: THEME.text,
  },
  detailDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
    lineHeight: 20,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '20%',
    backgroundColor: THEME.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderLeftWidth: 3,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  // Matches section
  matchesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 12,
  },
  emptyMatchesCard: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: THEME.background,
    borderRadius: 10,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  emptySubtext: {
    fontSize: 12,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 10,
  },
  matchDateCol: {
    alignItems: 'center',
    width: 55,
  },
  matchDateDay: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text,
  },
  matchJornada: {
    fontSize: 10,
    color: THEME.textSecondary,
  },
  matchInfoCol: {
    flex: 1,
    gap: 4,
  },
  matchRival: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  matchResultBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  matchResultText: {
    fontSize: 11,
    fontWeight: '600',
  },
  matchLocationCol: {
    padding: 4,
  },
  // =================== Match Card (list style) ===================
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  matchCardIndicator: {
    width: 4,
    height: '100%',
  },
  matchCardEscudo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginLeft: 10,
  },
  matchCardEscudoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  matchCardContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 4,
  },
  matchCardRival: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  matchCardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  matchCardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  matchCardTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  matchCardArrow: {
    paddingRight: 10,
    paddingLeft: 4,
  },
  // =================== Detail Modal (larger) ===================
  detailModalContent: {
    flex: 1,
    backgroundColor: THEME.surface,
    width: '100%',
    maxWidth: 750,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  detailModalContentMobile: {
    maxWidth: '100%',
  },
  createMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: THEME.primary + '10',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.primary + '30',
    borderStyle: 'dashed',
  },
  createMatchBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },
  // Options modal
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsCard: {
    backgroundColor: THEME.surface,
    borderRadius: 14,
    padding: 8,
    width: 260,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
  },
  optionText: {
    fontSize: 14,
    color: THEME.text,
    fontWeight: '500',
  },
  optionDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginHorizontal: 10,
  },
  // =================== Advanced Config Styles ===================
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: THEME.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  advancedToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  advancedSection: {
    gap: 16,
    marginBottom: 16,
  },
  configRow: {
    gap: 8,
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  configChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  configChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: THEME.border,
    backgroundColor: THEME.background,
  },
  configChipActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary + '12',
  },
  configChipText: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  configChipTextActive: {
    color: THEME.primary,
    fontWeight: '600',
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberValue: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    minWidth: 30,
    textAlign: 'center',
  },
  configHint: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  // =================== Detail Tab Bar ===================
  detailTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  detailTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  detailTabActive: {
    borderBottomColor: THEME.primary,
  },
  detailTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  detailTabTextActive: {
    color: THEME.primary,
  },
  // =================== Sanctions Styles ===================
  sanctionLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sanctionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  sanctionBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sanctionPlayerName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
    flex: 1,
  },
  sanctionBadgesRight: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  sanctionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sanctionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  sanctionWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sanctionWarningBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  sanctionStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sanctionStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sanctionStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sanctionStatText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sanctionCycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sanctionCycleLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.textSecondary,
  },
  sanctionCycleCards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  sanctionCycleCardDot: {
    width: 14,
    height: 18,
    borderRadius: 2,
    borderWidth: 1,
  },
  sanctionBanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sanctionBanText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.error,
  },
  // Active sanction block
  sanctionActiveBlock: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  sanctionActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sanctionActiveTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
    flex: 1,
  },
  sanctionOriginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 20,
  },
  sanctionOriginText: {
    fontSize: 11,
    color: '#6b7280',
  },
  sanctionProgressRow: {
    paddingLeft: 20,
    gap: 4,
    marginTop: 2,
  },
  sanctionMatchSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  sanctionMatchSlotServed: {
    backgroundColor: '#dcfce7',
  },
  sanctionMatchSlotPending: {
    backgroundColor: '#f3f4f6',
  },
  sanctionMatchSlotText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // History block
  sanctionHistoryBlock: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sanctionHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sanctionHistoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sanctionHistoryItem: {
    gap: 3,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sanctionHistoryItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sanctionHistoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sanctionHistoryItemType: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text,
    flex: 1,
  },
  sanctionHistoryServedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sanctionHistoryServedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#16a34a',
    textTransform: 'uppercase',
  },
  sanctionHistoryOrigin: {
    fontSize: 11,
    color: '#6b7280',
    paddingLeft: 14,
  },
  sanctionServedList: {
    paddingLeft: 14,
    gap: 2,
  },
  sanctionServedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sanctionServedItemText: {
    fontSize: 10,
    color: '#16a34a',
  },
  sanctionNoHistory: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
  },
});
