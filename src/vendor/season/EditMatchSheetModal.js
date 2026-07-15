// components/pages/season/EditMatchSheetModal.js
// Modal para editar fichas de partido desde temporadas
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Detectar si es móvil
const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import { createRival, fetchRivalsByTeam } from '@/store/slices/rival/rivalThunks';
import { fetchTournamentSanctions, fetchTournamentsByTeam } from '@/store/slices/tournament/tournamentThunks';
import { clearSanctions } from '@/store/slices/tournament/tournamentSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from '@/ui/toast';
import { showMissingFieldsToast } from '@/utils/validationToast';
import { api } from '@/api/client';
import * as ImagePicker from 'expo-image-picker';
import LineupEditor from '@/vendor/matchSheet/LineupEditor';
import SetPiecePreview from '@/vendor/matchSheet/SetPiecePreview';
import Field from '@/vendor/tacticalBoard/field';
import { ALINEACIONES_BY_PLAYER_COUNT, ALINEACIONES, getDefaultFormation } from '@/vendor/matchSheet/useMatchSheetForm';
import { getPlayerFullName, getPlayerInitials } from '@/utils/playerHelpers';
import { getPositionColor } from '@/components/player/playerHelpers';
import RivalSelector from '@/vendor/shared/RivalSelector';
import { applySetPieceKitsToElements, kitToBoardStyle, normalizeKits, normalizeRivalKits } from '@/utils/kits';
import { PlayerSelectionModal } from '@/vendor/shared/training';
import {
  getSetPieceVideoCandidates,
  getSetPieceVideoId,
  resolveMatchSheetSetPieceVideo,
  revokeVideoObjectUrl,
  downloadResolvedVideo,
} from '@/utils/videoPlayback';
import { cdnUrl } from '@/config';
import { duplicateVideoForEdit, getTacticalVideo, getVideoById, getVideoForEdit } from '@/utils/api';
import { getMatchSheet, updateMatchSheet } from '@/api/matchSheet';
import LoadingSpinner from '@/vendor/shared/LoadingSpinner';

// Componente PlayerSelectionModal importado desde ../../shared/training

// Modal para eventos (goles, tarjetas, cambios)
function EventModal({ visible, onClose, title, eventType, players, titulares = [], suplentes = [], tiempoPorParte = 45, descuentoPT = 0, descuentoST = 0, jugadoresEnCampo = [], jugadoresExpulsados = [], cambiosRealizados = [], onAdd, editingEvent = null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const modalStyles = useMemo(() => makeModalStyles(theme), [theme]);
  const [minuto, setMinuto] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [asistente, setAsistente] = useState(null); // Jugador que da la asistencia
  const [tipoTarjeta, setTipoTarjeta] = useState('amarilla');
  const [motivo, setMotivo] = useState('');
  const [partidosSancionRoja, setPartidosSancionRoja] = useState('1');
  const [jugadorSale, setJugadorSale] = useState(null);
  const [jugadorEntra, setJugadorEntra] = useState(null);
  const [showMinuteModal, setShowMinuteModal] = useState(false);

  const isEditing = !!editingEvent;

  const getPosColor = (pos) => {
    const colors = getPositionColor(pos);
    return colors[0];
  };

  const getPosColors = (pos) => {
    const colors = getPositionColor(pos);
    return colors;
  };

  // Generar opciones de minutos basadas en tiempo por parte y descuentos
  const generateMinuteOptions = () => {
    const options = [];
    const tpp = tiempoPorParte || 45;
    const dPT = Number(descuentoPT) || 0;
    const dST = Number(descuentoST) || 0;
    
    // Primera parte: 1 hasta tiempoPorParte
    for (let i = 1; i <= tpp; i++) {
      options.push({ label: `${i}'`, value: String(i), half: 1 });
    }
    
    // Tiempo de descuento primera parte
    if (dPT > 0) {
      for (let i = 1; i <= dPT; i++) {
        options.push({ label: `${tpp}+${i}'`, value: `${tpp}+${i}`, half: 1, isAddedTime: true });
      }
    }
    
    // Segunda parte: tiempoPorParte+1 hasta tiempoPorParte*2
    for (let i = tpp + 1; i <= tpp * 2; i++) {
      options.push({ label: `${i}'`, value: String(i), half: 2 });
    }
    
    // Tiempo de descuento segunda parte
    if (dST > 0) {
      for (let i = 1; i <= dST; i++) {
        options.push({ label: `${tpp * 2}+${i}'`, value: `${tpp * 2}+${i}`, half: 2, isAddedTime: true });
      }
    }
    
    return options;
  };

  const minuteOptions = generateMinuteOptions();

  // Obtener jugadores disponibles para "sale" (jugadores en campo menos expulsados)
  const getJugadoresQuePuedenSalir = () => {
    const enCampo = jugadoresEnCampo.length > 0 ? jugadoresEnCampo : titulares;
    return enCampo
      .filter(playerId => !jugadoresExpulsados.includes(playerId))
      .map(playerId => players.find(p => p._id === playerId))
      .filter(p => p);
  };

  // Obtener jugadores disponibles para "entra" (suplentes que no han entrado, o que salieron del campo después de entrar)
  const getJugadoresQuePuedenEntrar = () => {
    const yaEntraron = cambiosRealizados.map(c => typeof c.entra === 'object' ? c.entra._id : c.entra).filter(Boolean);
    const yaSalieron = cambiosRealizados.map(c => typeof c.sale === 'object' ? c.sale._id : c.sale).filter(Boolean);
    // Suplentes que nunca entraron
    const suplentesDisponibles = suplentes
      .filter(playerId => !yaEntraron.includes(playerId));
    // Jugadores que entraron como suplentes pero luego fueron sustituidos
    const reEntrantesPosibles = yaEntraron.filter(id => 
      yaSalieron.includes(id) && !(jugadoresEnCampo.length > 0 ? jugadoresEnCampo : titulares).includes(id) && !jugadoresExpulsados.includes(id)
    );
    return [...suplentesDisponibles, ...reEntrantesPosibles]
      .map(playerId => players.find(p => p._id === playerId))
      .filter(p => p);
  };

  useEffect(() => {
    if (visible) {
      if (editingEvent) {
        // Pre-fill with existing event data
        setMinuto(editingEvent.minuto || '');
        const jugadorId = typeof editingEvent.jugador === 'object' ? editingEvent.jugador._id : editingEvent.jugador;
        setSelectedPlayer(jugadorId || null);
        if (eventType === 'gol') {
          const asistenteId = editingEvent.asistente ? (typeof editingEvent.asistente === 'object' ? editingEvent.asistente._id : editingEvent.asistente) : null;
          setAsistente(asistenteId);
        }
        if (eventType === 'tarjeta') {
          setTipoTarjeta(editingEvent.tipo || 'amarilla');
          setMotivo(editingEvent.motivo || '');
          setPartidosSancionRoja(String(editingEvent.partidosSancion || 1));
        }
        if (eventType === 'cambio') {
          setJugadorSale(typeof editingEvent.sale === 'object' ? editingEvent.sale._id : editingEvent.sale);
          setJugadorEntra(typeof editingEvent.entra === 'object' ? editingEvent.entra._id : editingEvent.entra);
        }
      } else {
        setMinuto('');
        setSelectedPlayer(null);
        setAsistente(null);
        setTipoTarjeta('amarilla');
        setMotivo('');
        setPartidosSancionRoja('1');
        setJugadorSale(null);
        setJugadorEntra(null);
      }
      setShowMinuteModal(false);
    }
  }, [visible, editingEvent]);

  const handleAdd = () => {
    if (!minuto) {
      Alert.alert(t('common.error'), t('matchSheet.minuteRequired'));
      return;
    }
    if (eventType === 'gol' && !selectedPlayer) {
      Alert.alert(t('common.error'), t('matchSheet.selectScorerError'));
      return;
    }
    if (eventType === 'tarjeta' && !selectedPlayer) {
      Alert.alert(t('common.error'), t('matchSheet.selectPlayerError'));
      return;
    }
    if (eventType === 'cambio' && (!jugadorSale || !jugadorEntra)) {
      Alert.alert(t('common.error'), t('matchSheet.selectSubstitutionError'));
      return;
    }

    let event;
    if (eventType === 'gol') {
      event = { jugador: selectedPlayer, minuto, asistente: asistente || undefined };
    } else if (eventType === 'tarjeta') {
      event = { jugador: selectedPlayer, minuto, tipo: tipoTarjeta, motivo: motivo || undefined };
      if (tipoTarjeta === 'roja') {
        event.partidosSancion = parseInt(partidosSancionRoja) || 1;
      }
    } else if (eventType === 'cambio') {
      event = { sale: jugadorSale, entra: jugadorEntra, minuto };
    } else if (eventType === 'golRival') {
      event = { minuto };
    }

    onAdd(event);
  };

  // Obtener el label del minuto seleccionado
  const getMinuteLabel = () => {
    if (!minuto) return t('schedule.selectMinute');
    const option = minuteOptions.find(opt => opt.value === minuto);
    return option ? option.label : `${minuto}'`;
  };

  if (!visible) return null;

  const tpp = tiempoPorParte || 45;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView style={modalStyles.list}>
            {/* Minuto - Selector visual */}
            <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.minuteRequired')}</Text>
            <TouchableOpacity
              style={modalStyles.minuteSelector}
              onPress={() => setShowMinuteModal(true)}
            >
              <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
              <Text style={[modalStyles.minuteSelectorText, minuto && { color: theme.colors.text, fontWeight: '600' }]}>
                {getMinuteLabel()}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {eventType === 'gol' && (
              <>
                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.playerRequired')}</Text>
                {players.length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={32} color={theme.colors.textMuted} />
                    <Text style={{ fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginTop: 8 }}>
                      {t('matchSheet.noCallupPlayers', 'Selecciona convocados antes de añadir goles')}
                    </Text>
                  </View>
                ) : (
                <ScrollView style={modalStyles.playerGridScroll} showsVerticalScrollIndicator>
                  <View style={modalStyles.playerGrid}>
                    {players.map(p => {
                      const pos = p.posicion || '';
                      const posColors = getPosColors(pos);
                      const sel = selectedPlayer === p._id;
                      return (
                      <TouchableOpacity
                        key={p._id}
                        style={[
                          modalStyles.playerGridItem,
                          sel && { ...modalStyles.playerGridItemSelected, borderColor: posColors[0] },
                        ]}
                        onPress={() => setSelectedPlayer(p._id)}
                      >
                        {p.foto ? (
                          <Image source={{ uri: p.foto }} style={modalStyles.playerGridAvatar} />
                        ) : (
                          <View style={[modalStyles.playerGridAvatar, { backgroundColor: posColors[0] }]}>
                            <Text style={modalStyles.playerGridAvatarText}>
                              {getPlayerInitials(p)}
                            </Text>
                          </View>
                        )}
                        <View style={modalStyles.playerGridInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {p.dorsal != null && (
                              <Text style={modalStyles.playerGridDorsal}>#{p.dorsal}</Text>
                            )}
                            <Text style={[
                              modalStyles.playerGridName,
                              sel && modalStyles.playerGridNameSelected
                            ]} numberOfLines={1}>
                              {getPlayerFullName(p)}
                            </Text>
                          </View>
                        </View>
                        {sel && (
                          <View style={modalStyles.checkOverlay}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
                )}

                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.assistOptional')}</Text>
                <ScrollView style={modalStyles.playerGridScroll} showsVerticalScrollIndicator>
                  <View style={modalStyles.playerGrid}>
                    <TouchableOpacity
                      style={[
                        modalStyles.playerGridItem,
                        !asistente && { ...modalStyles.playerGridItemSelected, borderColor: theme.colors.purple }
                      ]}
                      onPress={() => setAsistente(null)}
                    >
                      <View style={[modalStyles.playerGridAvatar, { backgroundColor: theme.colors.border }]}>
                        <Ionicons name="remove-circle" size={22} color={theme.colors.textMuted} />
                      </View>
                      <View style={modalStyles.playerGridInfo}>
                        <Text style={[
                          modalStyles.playerGridName,
                          !asistente && { color: theme.colors.purple, fontWeight: '700' }
                        ]} numberOfLines={1}>
                          {t('matchSheet.modals.noAssist')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {players.filter(p => p._id !== selectedPlayer).map(p => {
                      const pos = p.posicion || '';
                      const posColors = getPosColors(pos);
                      const sel = asistente === p._id;
                      return (
                      <TouchableOpacity
                        key={p._id}
                        style={[
                          modalStyles.playerGridItem,
                          sel && { borderColor: theme.colors.purple, backgroundColor: theme.colors.purple + '15' }
                        ]}
                        onPress={() => setAsistente(p._id)}
                      >
                        {p.foto ? (
                          <Image source={{ uri: p.foto }} style={modalStyles.playerGridAvatar} />
                        ) : (
                          <View style={[modalStyles.playerGridAvatar, { backgroundColor: posColors[0] }]}>
                            <Text style={modalStyles.playerGridAvatarText}>
                              {getPlayerInitials(p)}
                            </Text>
                          </View>
                        )}
                        <View style={modalStyles.playerGridInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {p.dorsal != null && (
                              <Text style={modalStyles.playerGridDorsal}>#{p.dorsal}</Text>
                            )}
                            <Text style={[
                              modalStyles.playerGridName,
                              sel && { color: theme.colors.purple, fontWeight: '700' }
                            ]} numberOfLines={1}>
                              {getPlayerFullName(p)}
                            </Text>
                          </View>
                        </View>
                        {sel && (
                          <View style={[modalStyles.checkOverlay, { backgroundColor: theme.colors.purple }]}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            {eventType === 'tarjeta' && (
              <>
                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.playerRequired')}</Text>
                {players.length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={32} color={theme.colors.textMuted} />
                    <Text style={{ fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginTop: 8 }}>
                      {t('matchSheet.noCallupPlayers', 'Selecciona convocados antes de añadir tarjetas')}
                    </Text>
                  </View>
                ) : (
                <ScrollView style={modalStyles.playerGridScroll} showsVerticalScrollIndicator>
                  <View style={modalStyles.playerGrid}>
                    {players.map(p => {
                      const pos = p.posicion || '';
                      const posColors = getPosColors(pos);
                      const sel = selectedPlayer === p._id;
                      return (
                      <TouchableOpacity
                        key={p._id}
                        style={[
                          modalStyles.playerGridItem,
                          sel && { ...modalStyles.playerGridItemSelected, borderColor: posColors[0] },
                        ]}
                        onPress={() => setSelectedPlayer(p._id)}
                      >
                        {p.foto ? (
                          <Image source={{ uri: p.foto }} style={modalStyles.playerGridAvatar} />
                        ) : (
                          <View style={[modalStyles.playerGridAvatar, { backgroundColor: posColors[0] }]}>
                            <Text style={modalStyles.playerGridAvatarText}>
                              {getPlayerInitials(p)}
                            </Text>
                          </View>
                        )}
                        <View style={modalStyles.playerGridInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {p.dorsal != null && (
                              <Text style={modalStyles.playerGridDorsal}>#{p.dorsal}</Text>
                            )}
                            <Text style={[
                              modalStyles.playerGridName,
                              sel && modalStyles.playerGridNameSelected
                            ]} numberOfLines={1}>
                              {getPlayerFullName(p)}
                            </Text>
                          </View>
                        </View>
                        {sel && (
                          <View style={modalStyles.checkOverlay}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
                )}

                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.cardTypeLabel')}</Text>
                <View style={modalStyles.cardTypeRow}>
                  <TouchableOpacity
                    style={[
                      modalStyles.cardTypeBtn,
                      tipoTarjeta === 'amarilla' && { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning }
                    ]}
                    onPress={() => setTipoTarjeta('amarilla')}
                  >
                    <View style={[modalStyles.cardIcon, { backgroundColor: "#fffd8a" }]} />
                    <Text style={modalStyles.cardTypeText}>{t('matchSheet.cardTypes.yellow')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      modalStyles.cardTypeBtn,
                      tipoTarjeta === 'roja' && { backgroundColor: theme.colors.errorSoft, borderColor: theme.colors.error }
                    ]}
                    onPress={() => setTipoTarjeta('roja')}
                  >
                    <View style={[modalStyles.cardIcon, { backgroundColor: theme.colors.error }]} />
                    <Text style={modalStyles.cardTypeText}>{t('matchSheet.cardTypes.red')}</Text>
                  </TouchableOpacity>
                </View>

                {tipoTarjeta === 'roja' && (
                  <>
                    <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.banMatches')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <TouchableOpacity
                        onPress={() => setPartidosSancionRoja(prev => String(Math.max(1, (parseInt(prev) || 1) - 1)))}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.errorSoft, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="remove" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.error, minWidth: 30, textAlign: 'center' }}>{partidosSancionRoja}</Text>
                      <TouchableOpacity
                        onPress={() => setPartidosSancionRoja(prev => String(Math.min(20, (parseInt(prev) || 1) + 1)))}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.errorSoft, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="add" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{t('matchSheet.modals.banMatchesHint')}</Text>
                    </View>
                  </>
                )}

                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.reasonOptional')}</Text>
                <TextInput
                  style={modalStyles.input}
                  value={motivo}
                  onChangeText={setMotivo}
                  placeholder={t('matchSheet.modals.reasonPlaceholder')}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </>
            )}

            {eventType === 'cambio' && (
              <>
                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.playerLeaving')} * ({getJugadoresQuePuedenSalir().length} {t('matchSheet.modals.available')})</Text>
                <ScrollView style={modalStyles.playerGridScroll} showsVerticalScrollIndicator>
                  <View style={modalStyles.playerGrid}>
                    {getJugadoresQuePuedenSalir().map(p => {
                      const pos = p.posicion || '';
                      const posColors = getPosColors(pos);
                      const sel = jugadorSale === p._id;
                      return (
                      <TouchableOpacity
                        key={p._id}
                        style={[
                          modalStyles.playerGridItem,
                          sel && { backgroundColor: theme.colors.errorSoft, borderColor: theme.colors.error }
                        ]}
                        onPress={() => setJugadorSale(p._id)}
                      >
                        {p.foto ? (
                          <Image source={{ uri: p.foto }} style={modalStyles.playerGridAvatar} />
                        ) : (
                          <View style={[modalStyles.playerGridAvatar, { backgroundColor: sel ? theme.colors.error : posColors[0] }]}>
                            {sel ? (
                              <Ionicons name="arrow-down" size={18} color="#fff" />
                            ) : (
                              <Text style={modalStyles.playerGridAvatarText}>{getPlayerInitials(p)}</Text>
                            )}
                          </View>
                        )}
                        <View style={modalStyles.playerGridInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {p.dorsal != null && (
                              <Text style={modalStyles.playerGridDorsal}>#{p.dorsal}</Text>
                            )}
                            <Text style={[
                              modalStyles.playerGridName,
                              sel && { color: theme.colors.error, fontWeight: '700' }
                            ]} numberOfLines={1}>
                              {getPlayerFullName(p)}
                            </Text>
                          </View>
                        </View>
                        {sel && (
                          <View style={[modalStyles.checkOverlay, { backgroundColor: theme.colors.error }]}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.playerEntering')} * ({getJugadoresQuePuedenEntrar().length} {t('matchSheet.modals.available')})</Text>
                <ScrollView style={modalStyles.playerGridScroll} showsVerticalScrollIndicator>
                  <View style={modalStyles.playerGrid}>
                    {getJugadoresQuePuedenEntrar().map(p => {
                      const pos = p.posicion || '';
                      const posColors = getPosColors(pos);
                      const sel = jugadorEntra === p._id;
                      return (
                      <TouchableOpacity
                        key={p._id}
                        style={[
                          modalStyles.playerGridItem,
                          sel && { backgroundColor: theme.colors.successSoft, borderColor: theme.colors.success }
                        ]}
                        onPress={() => setJugadorEntra(p._id)}
                      >
                        {p.foto ? (
                          <Image source={{ uri: p.foto }} style={modalStyles.playerGridAvatar} />
                        ) : (
                          <View style={[modalStyles.playerGridAvatar, { backgroundColor: sel ? theme.colors.success : posColors[0] }]}>
                            {sel ? (
                              <Ionicons name="arrow-up" size={18} color="#fff" />
                            ) : (
                              <Text style={modalStyles.playerGridAvatarText}>{getPlayerInitials(p)}</Text>
                            )}
                          </View>
                        )}
                        <View style={modalStyles.playerGridInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {p.dorsal != null && (
                              <Text style={modalStyles.playerGridDorsal}>#{p.dorsal}</Text>
                            )}
                            <Text style={[
                              modalStyles.playerGridName,
                              sel && { color: theme.colors.success, fontWeight: '700' }
                            ]} numberOfLines={1}>
                              {getPlayerFullName(p)}
                            </Text>
                          </View>
                        </View>
                        {sel && (
                          <View style={[modalStyles.checkOverlay, { backgroundColor: theme.colors.success }]}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}
          </KeyboardAwareScrollView>

          <TouchableOpacity style={modalStyles.confirmBtn} onPress={handleAdd}>
            <Text style={modalStyles.confirmBtnText}>{isEditing ? t('common.save') : t('matchSheet.actions.add')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de selección de minuto */}
      <Modal visible={showMinuteModal} transparent animationType="fade" onRequestClose={() => setShowMinuteModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { maxHeight: '70%' }]}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>{t('matchSheet.modals.selectMinute')}</Text>
              <TouchableOpacity onPress={() => setShowMinuteModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={modalStyles.list}>
              {/* Primera parte */}
              <Text style={modalStyles.minuteSectionTitle}>{t('matchSheet.modals.firstHalfRange', { max: tpp })}</Text>
              <View style={modalStyles.minuteGrid}>
                {minuteOptions.filter(opt => opt.half === 1).map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      modalStyles.minuteOption,
                      minuto === opt.value && modalStyles.minuteOptionSelected,
                      opt.isAddedTime && modalStyles.minuteOptionAddedTime
                    ]}
                    onPress={() => {
                      setMinuto(opt.value);
                      setShowMinuteModal(false);
                    }}
                  >
                    <Text style={[
                      modalStyles.minuteOptionText,
                      minuto === opt.value && modalStyles.minuteOptionTextSelected,
                      opt.isAddedTime && modalStyles.minuteOptionTextAddedTime
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Segunda parte */}
              <Text style={modalStyles.minuteSectionTitle}>{t('matchSheet.modals.secondHalfRange', { min: tpp + 1, max: tpp * 2 })}</Text>
              <View style={modalStyles.minuteGrid}>
                {minuteOptions.filter(opt => opt.half === 2).map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      modalStyles.minuteOption,
                      minuto === opt.value && modalStyles.minuteOptionSelected,
                      opt.isAddedTime && modalStyles.minuteOptionAddedTime
                    ]}
                    onPress={() => {
                      setMinuto(opt.value);
                      setShowMinuteModal(false);
                    }}
                  >
                    <Text style={[
                      modalStyles.minuteOptionText,
                      minuto === opt.value && modalStyles.minuteOptionTextSelected,
                      opt.isAddedTime && modalStyles.minuteOptionTextAddedTime
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// Estilos para modales auxiliares
const makeModalStyles = (theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 6 : 12,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 14 : 16,
    width: isMobileDevice() ? '98%' : '95%',
    maxWidth: isMobileDevice() ? '100%' : 500,
    maxHeight: isMobileDevice() ? '88%' : '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isMobileDevice() ? 14 : 16,
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  selectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary + '15',
    borderRadius: 8,
  },
  selectAllText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  countText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 'auto',
  },
  list: {
    padding: 12,
    maxHeight: 400,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  playerName: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  playerDorsal: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    padding: 20,
  },
  confirmBtn: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  playerChipsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  playerGridScroll: {
    maxHeight: 220,
    marginBottom: 12,
    overflow: 'hidden',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  playerGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    flexBasis: isMobileDevice() ? '100%' : '48%',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: isMobileDevice() ? 0 : 140,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  playerGridItemSelected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  playerGridAvatar: {
    width: 36,
    height: 36,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  playerGridAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  playerGridName: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
    flexShrink: 1,
  },
  playerGridNameSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  playerGridInfo: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  playerGridDorsal: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    flexShrink: 0,
  },
  checkOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  playerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.inputBg,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playerChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  playerChipText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  playerChipTextSelected: {
    color: '#fff',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.inputBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionChipText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  optionChipTextSelected: {
    color: '#fff',
  },
  cardTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  cardIcon: {
    width: 20,
    height: 28,
    borderRadius: 3,
  },
  cardTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  // Estilos para selector de minuto
  minuteSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  minuteSelectorText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textMuted,
  },
  minuteSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 10,
  },
  minuteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  minuteOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 50,
    alignItems: 'center',
  },
  minuteOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  minuteOptionAddedTime: {
    backgroundColor: theme.colors.warningSoft,
    borderColor: theme.colors.warning,
  },
  minuteOptionText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  minuteOptionTextSelected: {
    color: '#fff',
  },
  minuteOptionTextAddedTime: {
    color: theme.colors.warningSoftText,
  },
});

export default function EditMatchSheetModal({
  visible,
  matchSheet,
  rivals = [],
  players = [],
  injuries = [],
  team,
  onClose,
  onSave,
  onCreate,           // callback para crear (modo crear)
  matchSheets = [],   // para validación de duplicados
  trainingSessions = [], // para validación de fechas
  selectedDate = null,   // fecha preseleccionada al crear
  sanctionedPlayerIds = [], // IDs de jugadores sancionados en torneo actual
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width: windowWidth } = useWindowDimensions();
  const isCreateMode = !matchSheet?._id;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('data');
  const [availableSetPieces, setAvailableSetPieces] = useState([]);
  const [loadingSetPieces, setLoadingSetPieces] = useState(false);
  const [selectedSetPieces, setSelectedSetPieces] = useState([]);
  const [activeSetPieceSlot, setActiveSetPieceSlot] = useState(null);
  const [boardParams, setBoardParams] = useState(null);
  const [openingSetPieceBoardIndex, setOpeningSetPieceBoardIndex] = useState(null);
  const initializedMatchSheetRef = useRef(null);
  const boardOpenRequestRef = useRef(0);
  const boardOpeningRef = useRef(false);
  const boardModalGuardUntilRef = useRef(0);
  const [setPieceVideoUrl, setSetPieceVideoUrl] = useState(null);
  const [setPieceVideoTitle, setSetPieceVideoTitle] = useState('');
  const [loadingSetPieceVideo, setLoadingSetPieceVideo] = useState(false);
  const [videoGenerationProgress, setVideoGenerationProgress] = useState(0);
  const [videoGenerationPhase, setVideoGenerationPhase] = useState('');
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [loadingSetPieceVideoIndex, setLoadingSetPieceVideoIndex] = useState(null);
  const [downloadingSetPieceVideoIndex, setDownloadingSetPieceVideoIndex] = useState(null);
  const setPieceVideoPlayer = useVideoPlayer(setPieceVideoUrl || '', (player) => {
    if (setPieceVideoUrl) player.play();
  });
  const isMobile = windowWidth < 430;
  
  // Estados del formulario básico
  const [rival, setRival] = useState('');
  const [rivalId, setRivalId] = useState(null);
  const [rivalEscudo, setRivalEscudo] = useState(null);
  const [equipacionPropiaKey, setEquipacionPropiaKey] = useState('first');
  const [equipacionRivalKey, setEquipacionRivalKey] = useState('first');
  const [fechaHora, setFechaHora] = useState(new Date());
  const [jornada, setJornada] = useState('');
  const [ubicacion, setUbicacion] = useState('local');
  const [competicion, setCompeticion] = useState('torneo');
  const [torneoId, setTorneoId] = useState(null);
  const [selectedCompetitionOption, setSelectedCompetitionOption] = useState(null); // 'amistoso' | tournamentId
  // Campos adaptativos según formato de torneo
  const [fase, setFase] = useState(null); // 'liga' | 'grupos' | 'eliminatoria'
  const [ronda, setRonda] = useState(null); // 'final' | 'semifinal' | 'cuartos' | etc.
  const [grupo, setGrupo] = useState(null); // '1'-'32' (string for selector)
  const [pierna, setPierna] = useState(null); // 'unico' | 'ida' | 'vuelta'
  const [golesFavor, setGolesFavor] = useState('');
  const [golesContra, setGolesContra] = useState('');
  const [notasEntrenador, setNotasEntrenador] = useState('');
  const [partidoUrl, setPartidoUrl] = useState('');
  const [alineacion, setAlineacion] = useState(() => getDefaultFormation(team?.jugadoresPorEquipo || 11));
  const [alineacionRival, setAlineacionRival] = useState('');
  const ownKits = useMemo(() => normalizeKits(team?.equipaciones), [team?.equipaciones]);
  const selectedRival = useMemo(() => rivals.find(item => String(item._id) === String(rivalId)) || null, [rivals, rivalId]);
  const rivalEquipment = selectedRival?.equipaciones || (
    rivalId && String(matchSheet?.rivalId?._id || '') === String(rivalId)
      ? matchSheet.rivalId.equipaciones
      : null
  );
  const rivalKits = useMemo(() => normalizeRivalKits(rivalEquipment), [rivalEquipment]);
  const getMatchSetPieceKitContext = (setPiece) => {
    const original = setPiece?.pizarraConfig?.kitContext || {};
    return {
      ...original,
      teamId: team?._id || null,
      rivalId: rivalId || null,
      rivalName: rival.trim(),
      ownKitKey: equipacionPropiaKey,
      rivalKitKey: equipacionRivalKey,
      own: ownKits[equipacionPropiaKey],
      ownGoalkeeper: ownKits[equipacionPropiaKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'],
      // Un rival escrito a mano no tiene equipaciones: se conserva la original de cada ABP.
      rival: rivalEquipment ? rivalKits[equipacionRivalKey] : original.rival,
      rivalGoalkeeper: rivalEquipment
        ? rivalKits[equipacionRivalKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst']
        : original.rivalGoalkeeper,
    };
  };
  
  // Estados para jugadores
  const [convocados, setConvocados] = useState([]);
  const convocadosPlayers = useMemo(() => {
    if (!convocados || convocados.length === 0) return players;
    return convocados.map(id => {
      const pId = typeof id === 'object' ? (id._id || id.id) : id;
      return players.find(p => String(p._id || p.id) === String(pId));
    }).filter(Boolean);
  }, [convocados, players]);
  const [noConvocados, setNoConvocados] = useState([]);
  const [alineacionTitulares, setAlineacionTitulares] = useState([]);
  const [alineacionSuplentes, setAlineacionSuplentes] = useState([]);
  const [posicionesVisuales, setPosicionesVisuales] = useState([]);
  
  // Estados para eventos
  const [goles, setGoles] = useState([]);
  const [tarjetasAmarillas, setTarjetasAmarillas] = useState([]);
  const [tarjetasRojas, setTarjetasRojas] = useState([]);
  const [cambios, setCambios] = useState([]);
  const [golesRival, setGolesRival] = useState([]);
  
  // Estados para tracking de jugadores en campo
  const [jugadoresEnCampo, setJugadoresEnCampo] = useState([]);
  const [jugadoresExpulsados, setJugadoresExpulsados] = useState([]);
  
  // Estados para descuento (tiempo añadido)
  const [descuentoPrimerTiempo, setDescuentoPrimerTiempo] = useState('0');
  const [descuentoSegundoTiempo, setDescuentoSegundoTiempo] = useState('0');

  // Estados para edición de eventos  
  const [editingGoalIndex, setEditingGoalIndex] = useState(null);
  const [editingCardIndex, setEditingCardIndex] = useState(null);
  const [editingCardType, setEditingCardType] = useState(null); // 'amarilla' | 'roja'
  
  // Pickers y modales
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showRivalSelector, setShowRivalSelector] = useState(false);
  const [showConvocadosModal, setShowConvocadosModal] = useState(false);
  const [showNoConvocadosModal, setShowNoConvocadosModal] = useState(false);
  const [showTitularesModal, setShowTitularesModal] = useState(false);
  const [showSuplentesModal, setShowSuplentesModal] = useState(false);
  const [showGolesModal, setShowGolesModal] = useState(false);
  const [showTarjetasModal, setShowTarjetasModal] = useState(false);
  const [showCambiosModal, setShowCambiosModal] = useState(false);
  const [showGolesRivalModal, setShowGolesRivalModal] = useState(false);
  const [showAlineacionModal, setShowAlineacionModal] = useState(false);
  const [showAlineacionRivalModal, setShowAlineacionRivalModal] = useState(false);
  const [showJornadaModal, setShowJornadaModal] = useState(false);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [showCompeticionModal, setShowCompeticionModal] = useState(false);
  const [showTorneoModal, setShowTorneoModal] = useState(false);
  const [showFaseModal, setShowFaseModal] = useState(false);
  const [showRondaModal, setShowRondaModal] = useState(false);
  const [showGrupoModal, setShowGrupoModal] = useState(false);
  const [showPiernaModal, setShowPiernaModal] = useState(false);

  // Estados para crear nuevo rival
  const [showCreateRivalModal, setShowCreateRivalModal] = useState(false);
  const [newRivalName, setNewRivalName] = useState('');
  const [newRivalEscudo, setNewRivalEscudo] = useState('');
  const [savingRival, setSavingRival] = useState(false);
  const [searchRivalText, setSearchRivalText] = useState('');
  const tournaments = useSelector(state => state.tournament?.tournaments) || [];
  const sanctions = useSelector(state => state.tournament?.sanctions) || [];
  const dispatch = useDispatch();

  useEffect(() => {
    if (torneoId && competicion !== 'amistoso') {
      dispatch(fetchTournamentSanctions(torneoId));
    } else {
      dispatch(clearSanctions());
    }
  }, [torneoId, competicion, dispatch]);

  useEffect(() => {
    if (visible && team?._id) {
      dispatch(fetchTournamentsByTeam(team._id));
    }
  }, [visible, team, dispatch]);

  const localSanctionedPlayerIds = useMemo(() => 
    sanctions.filter(s => s.sancionado).map(s => s.playerId),
    [sanctions]
  );

  // ─── Torneo seleccionado y lógica de formato ───
  const selectedTournament = useMemo(() => tournaments.find(t => t._id === torneoId), [tournaments, torneoId]);
  const torneoFormato = competicion === 'amistoso' ? null : (selectedTournament?.formato || null);

  // Orden de rondas de mayor a menor
  const ROUND_ORDER = ['treintaydosavos', 'dieciseisavos', 'octavos', 'cuartos', 'semifinal', 'final'];
  const ROUND_KEYS = {
    final: 'tournaments.roundFinal',
    semifinal: 'tournaments.roundSemifinal',
    cuartos: 'tournaments.roundQuarters',
    octavos: 'tournaments.roundRound16',
    dieciseisavos: 'tournaments.roundRound32',
    treintaydosavos: 'tournaments.roundRound64',
  };

  // Rondas disponibles basadas en el torneo seleccionado
  const availableRounds = useMemo(() => {
    if (!selectedTournament?.rondasEliminatorias) return [];
    const maxRoundIdx = ROUND_ORDER.indexOf(selectedTournament.rondasEliminatorias);
    if (maxRoundIdx === -1) return [];
    return ROUND_ORDER.slice(maxRoundIdx).reverse(); // de final a la ronda más lejana del torneo
  }, [selectedTournament]);

  // Determinar si la ronda seleccionada usa ida y vuelta
  const roundUsesLegs = useMemo(() => {
    if (!selectedTournament || !ronda) return false;
    const formatoPartido = selectedTournament.formatoPartido || 'unico';
    if (formatoPartido === 'unico') return false;
    // formatoPartido === 'idayvuelta'
    if (ronda === 'final') {
      return (selectedTournament.formatoFinal || 'unico') === 'idayvuelta';
    }
    const idaYvueltaDesde = selectedTournament.idaYvueltaDesde || 'todas';
    if (idaYvueltaDesde === 'todas') return true;
    const roundIdx = ROUND_ORDER.indexOf(ronda);
    const desdeIdx = ROUND_ORDER.indexOf(idaYvueltaDesde);
    return roundIdx >= desdeIdx;
  }, [selectedTournament, ronda]);

  const groupUsesLegs = useMemo(() => {
    return torneoFormato === 'grupos+eliminatoria'
      && fase === 'grupos'
      && (selectedTournament?.formatoGrupos || 'unico') === 'idayvuelta';
  }, [torneoFormato, fase, selectedTournament]);

  // Opciones de grupo basadas en el torneo
  const grupoOptions = useMemo(() => {
    if (!selectedTournament?.numGrupos) return [];
    return Array.from({ length: selectedTournament.numGrupos }, (_, i) => String(i + 1));
  }, [selectedTournament]);

  // Opciones de jornada: dinámicas para fase de grupos, 1-100 para liga
  const jornadaOptions = useMemo(() => {
    if (torneoFormato === 'grupos+eliminatoria' && fase === 'grupos' && selectedTournament?.equiposPorGrupo) {
      const maxJornada = Math.max(1, selectedTournament.equiposPorGrupo - 1) * (groupUsesLegs ? 2 : 1);
      return Array.from({ length: maxJornada }, (_, i) => String(i + 1));
    }
    return Array.from({ length: 100 }, (_, i) => String(i + 1));
  }, [torneoFormato, fase, selectedTournament, groupUsesLegs]);

  // Auto-set fase cuando cambia el torneo
  useEffect(() => {
    if (!torneoFormato) {
      setFase(null);
      setRonda(null);
      setGrupo(null);
      setPierna(null);
      return;
    }
    if (torneoFormato === 'liga') {
      setFase('liga');
      setRonda(null);
      setGrupo(null);
      setPierna(null);
    } else if (torneoFormato === 'eliminatoria') {
      setFase('eliminatoria');
      setGrupo(null);
    } else if (torneoFormato === 'grupos+eliminatoria') {
      // Keep user's current choice if valid, otherwise default to grupos
      if (fase !== 'grupos' && fase !== 'eliminatoria') {
        setFase('grupos');
      }
    }
  }, [torneoFormato]);

  // Auto-set pierna cuando cambia fase, ronda o formato
  useEffect(() => {
    if (fase === 'eliminatoria') {
      if (roundUsesLegs) {
        if (!pierna || pierna === 'unico') setPierna('ida');
      } else {
        if (pierna !== 'unico') setPierna('unico');
      }
    } else if (fase === 'grupos') {
      if (groupUsesLegs) {
        if (!pierna || pierna === 'unico') setPierna('ida');
      } else {
        if (pierna !== 'unico') setPierna('unico');
      }
    }
  }, [ronda, roundUsesLegs, groupUsesLegs, fase, pierna]);

  // Alineaciones disponibles según cantidad de jugadores del equipo
  const jugadoresPorEquipo = team?.jugadoresPorEquipo || 11;
  const alineacionesDisponibles = ALINEACIONES_BY_PLAYER_COUNT[jugadoresPorEquipo] || ALINEACIONES;

  // Calcular resultado automático (mantener valores internos en español para BD)
  const isMatchPast = useMemo(() => {
    if (!fechaHora) return false;
    const matchDate = new Date(fechaHora);
    const now = new Date();
    return matchDate < now;
  }, [fechaHora]);

  const resultado = useMemo(() => {
    const gf = parseInt(golesFavor) || 0;
    const gc = parseInt(golesContra) || 0;
    // Si la fecha es pasada, siempre calculamos resultado (0-0 = Empate)
    if (isMatchPast) {
      if (gf > gc) return 'Victoria';
      if (gf < gc) return 'Derrota';
      return 'Empate';
    }
    // Si la fecha es futura, solo calculamos si hay goles ingresados
    if (golesFavor === '' && golesContra === '') return '';
    if (gf > gc) return 'Victoria';
    if (gf < gc) return 'Derrota';
    return 'Empate';
  }, [golesFavor, golesContra, isMatchPast]);

  // Traducir resultado para mostrar en UI
  const translateResult = (result) => {
    if (!result) return '';
    switch(result) {
      case 'Victoria': return t('matchSheet.fields.win');
      case 'Empate': return t('matchSheet.fields.draw');
      case 'Derrota': return t('matchSheet.fields.loss');
      default: return result;
    }
  };

  // Cargar datos al abrir
  useEffect(() => {
    if (!visible) {
      initializedMatchSheetRef.current = null;
      boardOpenRequestRef.current += 1;
      boardOpeningRef.current = false;
      boardModalGuardUntilRef.current = 0;
      setOpeningSetPieceBoardIndex(null);
      setBoardParams(null);
      return;
    }
    const sheetKey = String(matchSheet?._id || 'new');
    if (initializedMatchSheetRef.current === sheetKey) return;
    initializedMatchSheetRef.current = sheetKey;

    if (matchSheet) {
      // Datos básicos
      setRival(matchSheet.rival || '');
      setRivalId(matchSheet.rivalId?._id || matchSheet.rivalId || null);
      setRivalEscudo(matchSheet.rivalId?.escudo || matchSheet.rivalEscudo || null);
      setEquipacionPropiaKey(matchSheet.equipacionPropiaKey || 'first');
      setEquipacionRivalKey(matchSheet.equipacionRivalKey || 'first');
      const matchDate = matchSheet.fechaHora ? new Date(matchSheet.fechaHora) : new Date();
      setFechaHora(matchDate);
      setJornada(matchSheet.jornada ? String(matchSheet.jornada) : '');
      setUbicacion(matchSheet.ubicacion || 'local');
      // Campos adaptativos de fase/ronda/grupo/pierna
      setRonda(matchSheet.ronda || null);
      setGrupo(matchSheet.grupo ? String(matchSheet.grupo) : null);
      setPierna(matchSheet.pierna || null);
      const mTorneoId = matchSheet.torneoId?._id || matchSheet.torneoId || null;
      if (matchSheet.competicion === 'amistoso' || !mTorneoId) {
        setCompeticion('amistoso');
        setTorneoId(null);
        setSelectedCompetitionOption('amistoso');
        setFase(matchSheet.fase || null);
      } else {
        setCompeticion('torneo');
        setTorneoId(mTorneoId);
        setSelectedCompetitionOption(mTorneoId);
        // Set fase based on tournament format to avoid stale auto-set effect
        const foundTournament = tournaments.find(t => t._id === mTorneoId);
        const format = foundTournament?.formato;
        if (matchSheet.fase) {
          setFase(matchSheet.fase);
        } else if (format === 'eliminatoria') {
          setFase('eliminatoria');
        } else if (format === 'liga') {
          setFase('liga');
        } else if (format === 'grupos+eliminatoria') {
          setFase('grupos');
        } else {
          setFase(null);
        }
      }
      
      // Si la fecha es pasada y no hay goles, inicializar en 0
      const isPast = matchDate < new Date();
      setGolesFavor(matchSheet.golesFavor != null ? String(matchSheet.golesFavor) : (isPast ? '0' : ''));
      setGolesContra(matchSheet.golesContra != null ? String(matchSheet.golesContra) : (isPast ? '0' : ''));
      setNotasEntrenador(matchSheet.notasEntrenador || '');
      setPartidoUrl(matchSheet.partidoUrl || '');
      setAlineacion(matchSheet.alineacion || getDefaultFormation(team?.jugadoresPorEquipo || 11));
      setAlineacionRival(matchSheet.alineacionRival || '');
      
      // Jugadores - extraer IDs
      const getIds = (arr) => (arr || []).map(j => typeof j === 'object' ? j._id : j);
      setConvocados(getIds(matchSheet.convocados));
      setNoConvocados(getIds(matchSheet.noConvocados));
      setAlineacionTitulares(getIds(matchSheet.alineacionTitulares));
      setAlineacionSuplentes(getIds(matchSheet.alineacionSuplentes));
      setPosicionesVisuales(matchSheet.posicionesVisuales || []);
      
      // Eventos
      setGoles(matchSheet.goles || []);
      setTarjetasAmarillas(matchSheet.tarjetasAmarillas || []);
      setTarjetasRojas(matchSheet.tarjetasRojas || []);
      setCambios(matchSheet.cambios || []);
      setGolesRival(matchSheet.golesRival || []);
      setSelectedSetPieces(matchSheet.setPieces || []);
      
      // Descuento (tiempo añadido)
      setDescuentoPrimerTiempo(matchSheet.descuentoPrimerTiempo !== undefined ? String(matchSheet.descuentoPrimerTiempo) : '0');
      setDescuentoSegundoTiempo(matchSheet.descuentoSegundoTiempo !== undefined ? String(matchSheet.descuentoSegundoTiempo) : '0');
    } else {
      // Modo crear: resetear todo
      setRival('');
      setRivalId(null);
      setRivalEscudo(null);
      setEquipacionPropiaKey('first');
      setEquipacionRivalKey('first');
      const date = selectedDate ? new Date(selectedDate) : new Date();
      setFechaHora(date);
      setJornada('');
      setUbicacion('local');
      // Reset campos adaptativos
      setFase(null);
      setRonda(null);
      setGrupo(null);
      setPierna(null);
      const defaultTournament = tournaments.find(tt => tt.estado === 'activo' && tt.porDefecto);
      if (defaultTournament) {
        setCompeticion('torneo');
        setTorneoId(defaultTournament._id);
        setSelectedCompetitionOption(defaultTournament._id);
      } else {
        setCompeticion('amistoso');
        setTorneoId(null);
        setSelectedCompetitionOption('amistoso');
      }
      const isPast = date < new Date();
      setGolesFavor(isPast ? '0' : '');
      setGolesContra(isPast ? '0' : '');
      setNotasEntrenador('');
      setPartidoUrl('');
      setAlineacion(getDefaultFormation(team?.jugadoresPorEquipo || 11));
      setAlineacionRival('');
      setConvocados([]);
      setNoConvocados([]);
      setAlineacionTitulares([]);
      setAlineacionSuplentes([]);
      setPosicionesVisuales([]);
      setGoles([]);
      setTarjetasAmarillas([]);
      setTarjetasRojas([]);
      setCambios([]);
      setGolesRival([]);
      setSelectedSetPieces([]);
      setJugadoresEnCampo([]);
      setJugadoresExpulsados([]);
      setDescuentoPrimerTiempo('0');
      setDescuentoSegundoTiempo('0');
    }
  }, [visible, matchSheet]);

  useEffect(() => {
    if (!visible || !matchSheet?._id) return;
    let mounted = true;
    getMatchSheet(matchSheet._id)
      .then((response) => {
        if (mounted && Array.isArray(response.data?.setPieces)) {
          setSelectedSetPieces(response.data.setPieces);
        }
      })
      .catch((error) => console.warn('No se pudieron actualizar las ABP de la ficha:', error));
    return () => {
      mounted = false;
    };
  }, [visible, matchSheet?._id]);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    const loadSetPieces = async () => {
      setLoadingSetPieces(true);
      try {
        const res = await api.get(`/strategy/all?kind=setPiece&lang=${i18n.language || 'es'}`);
        if (mounted) setAvailableSetPieces(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error('Error loading set pieces for match sheet:', error);
        if (mounted) setAvailableSetPieces([]);
      } finally {
        if (mounted) setLoadingSetPieces(false);
      }
    };
    loadSetPieces();
    return () => {
      mounted = false;
    };
  }, [visible, i18n.language]);

  // Recalcular jugadores en campo siempre que cambien titulares, cambios o tarjetas rojas
  useEffect(() => {
    let enCampo = [...alineacionTitulares];
    (cambios || []).forEach(cambio => {
      const saleId = typeof cambio.sale === 'object' ? cambio.sale._id : cambio.sale;
      const entraId = typeof cambio.entra === 'object' ? cambio.entra._id : cambio.entra;
      enCampo = enCampo.filter(id => id !== saleId);
      if (entraId) enCampo.push(entraId);
    });
    setJugadoresEnCampo(enCampo);
    const rojasIds = (tarjetasRojas || []).map(t => typeof t.jugador === 'object' ? t.jugador._id : t.jugador).filter(Boolean);
    setJugadoresExpulsados(rojasIds);
  }, [alineacionTitulares, cambios, tarjetasRojas]);

  // Helper para obtener nombre de jugador
  const getPlayerName = (playerId) => {
    const player = players.find(p => String(p._id || p.id) === String(playerId));
    // fallback text should also be localizable
    return player ? getPlayerFullName(player) : t('common.player');
  };

  const getAssignedPlayer = (assignment) => {
    if (assignment?.player && typeof assignment.player === 'object') return assignment.player;
    return players.find(p => String(p._id) === String(assignment?.player));
  };

  const buildSetPiecePlayerOverlays = (setPiece) => {
    const showPhotos = setPiece?.pizarraConfig?.teamPlayers?.showPhotos ?? setPiece?.pizarraConfig?.showPhotos ?? false;
    const source = setPiece?.customElements?.length ? setPiece.customElements : (setPiece?.elementosCampo || []);
    const styledPlayers = applySetPieceKitsToElements(source, getMatchSetPieceKitContext(setPiece), showPhotos)
      .filter((element) => element?.type === 'player');
    const mergeVisuals = (overlays) => styledPlayers.map((element, index) => {
      const matchOverlay = overlays.find((overlay) => String(overlay.slotId) === String(element.id || element._id || `slot-${index}`));
      return {
        slotId: String(element.id || element._id || `slot-${index}`),
        number: String(matchOverlay?.number || element.number || element.playerNumber || ''),
        xRatio: element.xRatio,
        yRatio: element.yRatio,
        x: element.x,
        y: element.y,
        color: element.color,
        numberColor: element.numberColor,
        shape: element.shape,
        hasStripes: element.hasStripes,
        stripeColor: element.stripeColor,
        kitPattern: element.kitPattern,
        kitSecondaryColor: element.kitSecondaryColor,
        isGoalkeeper: element.isGoalkeeper,
        differentiateGoalkeeper: element.differentiateGoalkeeper,
        goalkeeperStripeColor: element.goalkeeperStripeColor,
        preserveVisualStyle: true,
        showPhotos,
        hasBib: false,
        playerData: matchOverlay?.playerData,
        photoUrl: matchOverlay?.photoUrl,
      };
    });
    const bySlot = new Map((setPiece?.assignments || []).map((assignment) => [String(assignment.slotId), assignment]));
    const boardPlayers = (setPiece?.customElements || [])
      .filter((element) => element?.type === 'player' && bySlot.has(String(element.id || element._id || '')))
      .map((element, index) => {
        const assignment = bySlot.get(String(element.id || element._id || ''));
        const assignedPlayer = getAssignedPlayer(assignment);
        const player = assignedPlayer || element.playerData || (assignment?.playerName ? { nombre: assignment.playerName, foto: assignment.foto || '' } : null);
        if (!player) return null;
        const name = getPlayerFullName(player);
        const photoUrl = assignment?.photoUrl || element.photoUrl || (player.foto ? cdnUrl(player.foto) : '');
        return {
          slotId: String(element.id || element._id || `slot-${index}`),
          number: String(assignment?.number || element.number || element.playerNumber || element.numero || element.text || element.label || ''),
          exactSlot: false,
          xRatio: element.xRatio,
          yRatio: element.yRatio,
          x: element.x,
          y: element.y,
          playerData: {
            _id: player._id || player.id || '',
            nombre: name,
            name,
            demarcacion: player.demarcacion || player.posicion || player.position || '',
            posicion: player.posicion || player.position || '',
            foto: player.foto || '',
          },
          photoUrl,
          showPhotos: setPiece?.pizarraConfig?.teamPlayers?.showPhotos ?? setPiece?.pizarraConfig?.showPhotos ?? element.showPhotos === true,
        };
      })
      .filter(Boolean);
    if (boardPlayers.length) return mergeVisuals(boardPlayers);

    const assignedPlayers = (setPiece?.assignments || []).map((assignment) => {
      const player = getAssignedPlayer(assignment) || (assignment.playerName ? { nombre: assignment.playerName, foto: assignment.foto || '' } : null);
      if (!player) return null;
      const name = getPlayerFullName(player);
      const photoUrl = assignment.photoUrl || (player.foto ? cdnUrl(player.foto) : '');
      return {
        slotId: assignment.slotId,
        number: assignment.number,
        xRatio: assignment.xRatio,
        yRatio: assignment.yRatio,
        x: assignment.x,
        y: assignment.y,
        playerData: {
          _id: player._id,
          nombre: name,
          name,
          demarcacion: player.demarcacion || player.posicion || player.position || '',
          posicion: player.posicion || player.position || '',
          foto: player.foto || '',
        },
        photoUrl,
        showPhotos: setPiece?.pizarraConfig?.teamPlayers?.showPhotos ?? setPiece?.pizarraConfig?.showPhotos ?? assignment.showPhotos === true,
      };
    })
    .filter(Boolean);
    return mergeVisuals(assignedPlayers);
  };

  // Jugadores de la convocatoria para eventos (goles, tarjetas)
  const callupPlayerIds = useMemo(() => {
    const titularesIds = Array.isArray(alineacionTitulares) ? alineacionTitulares : Object.values(alineacionTitulares || {}).filter(Boolean);
    const suplentesIds = Array.isArray(alineacionSuplentes) ? alineacionSuplentes : Object.values(alineacionSuplentes || {}).filter(Boolean);
    return [...new Set([...convocados, ...titularesIds, ...suplentesIds])];
  }, [convocados, alineacionTitulares, alineacionSuplentes]);

  const callupPlayers = useMemo(
    () => players.filter(p => callupPlayerIds.includes(p._id)),
    [players, callupPlayerIds]
  );

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return '';
    const locale = i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Formatear hora
  const formatTime = (date) => {
    if (!date) return '';
    const locale = i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US';
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Cancelar y resetear todos los cambios
  const handleCancel = () => {
    if (boardOpeningRef.current || boardParams) return;

    if (matchSheet) {
      // Modo edición: restaurar datos originales
      const getIds = (arr) => (arr || []).map(j => typeof j === 'object' ? j._id : j);
      setRival(matchSheet.rival || '');
      setRivalId(matchSheet.rivalId?._id || matchSheet.rivalId || null);
      setRivalEscudo(matchSheet.rivalId?.escudo || matchSheet.rivalEscudo || null);
      setFechaHora(matchSheet.fechaHora ? new Date(matchSheet.fechaHora) : new Date());
      setJornada(matchSheet.jornada ? String(matchSheet.jornada) : '');
      setUbicacion(matchSheet.ubicacion || 'local');
      setFase(matchSheet.fase || null);
      setRonda(matchSheet.ronda || null);
      setGrupo(matchSheet.grupo ? String(matchSheet.grupo) : null);
      setPierna(matchSheet.pierna || null);
      const mTorneoId = matchSheet.torneoId?._id || matchSheet.torneoId || null;
      if (matchSheet.competicion === 'amistoso' || !mTorneoId) {
        setCompeticion('amistoso');
        setTorneoId(null);
        setSelectedCompetitionOption('amistoso');
      } else {
        setCompeticion('torneo');
        setTorneoId(mTorneoId);
        setSelectedCompetitionOption(mTorneoId);
      }
      const matchDate = matchSheet.fechaHora ? new Date(matchSheet.fechaHora) : new Date();
      const isPast = matchDate < new Date();
      setGolesFavor(matchSheet.golesFavor != null ? String(matchSheet.golesFavor) : (isPast ? '0' : ''));
      setGolesContra(matchSheet.golesContra != null ? String(matchSheet.golesContra) : (isPast ? '0' : ''));
      setNotasEntrenador(matchSheet.notasEntrenador || '');
      setPartidoUrl(matchSheet.partidoUrl || '');
      setAlineacion(matchSheet.alineacion || getDefaultFormation(team?.jugadoresPorEquipo || 11));
      setAlineacionRival(matchSheet.alineacionRival || '');
      setConvocados(getIds(matchSheet.convocados));
      setNoConvocados(getIds(matchSheet.noConvocados));
      setAlineacionTitulares(getIds(matchSheet.alineacionTitulares));
      setAlineacionSuplentes(getIds(matchSheet.alineacionSuplentes));
      setPosicionesVisuales(matchSheet.posicionesVisuales || []);
      setGoles(matchSheet.goles || []);
      setTarjetasAmarillas(matchSheet.tarjetasAmarillas || []);
      setTarjetasRojas(matchSheet.tarjetasRojas || []);
      setCambios(matchSheet.cambios || []);
      setGolesRival(matchSheet.golesRival || []);
      setDescuentoPrimerTiempo(matchSheet.descuentoPrimerTiempo !== undefined ? String(matchSheet.descuentoPrimerTiempo) : '0');
      setDescuentoSegundoTiempo(matchSheet.descuentoSegundoTiempo !== undefined ? String(matchSheet.descuentoSegundoTiempo) : '0');
    } else {
      // Modo crear: limpiar todo
      setRival('');
      setRivalId(null);
      setRivalEscudo(null);
      setEquipacionPropiaKey('first');
      setEquipacionRivalKey('first');
      setFechaHora(selectedDate ? new Date(selectedDate) : new Date());
      setJornada('');
      setUbicacion('local');
      setFase(null);
      setRonda(null);
      setGrupo(null);
      setPierna(null);
      const defaultTournament = tournaments.find(tt => tt.estado === 'activo' && tt.porDefecto);
      if (defaultTournament) {
        setCompeticion('torneo');
        setTorneoId(defaultTournament._id);
        setSelectedCompetitionOption(defaultTournament._id);
      } else {
        setCompeticion('amistoso');
        setTorneoId(null);
        setSelectedCompetitionOption('amistoso');
      }
      setGolesFavor('');
      setGolesContra('');
      setNotasEntrenador('');
      setPartidoUrl('');
      setAlineacion(getDefaultFormation(team?.jugadoresPorEquipo || 11));
      setAlineacionRival('');
      setConvocados([]);
      setNoConvocados([]);
      setAlineacionTitulares([]);
      setAlineacionSuplentes([]);
      setPosicionesVisuales([]);
      setGoles([]);
      setTarjetasAmarillas([]);
      setTarjetasRojas([]);
      setCambios([]);
      setGolesRival([]);
      setJugadoresEnCampo([]);
      setJugadoresExpulsados([]);
      setDescuentoPrimerTiempo('0');
      setDescuentoSegundoTiempo('0');
    }
    onClose();
  };

  // Handler para fecha
  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android' || Platform.OS === 'web') {
      setShowDatePicker(false);
    }
    if (date) {
      const newDate = new Date(date);
      newDate.setHours(fechaHora.getHours(), fechaHora.getMinutes());
      setFechaHora(newDate);
    }
  };

  // Handler para hora
  const handleTimeChange = (event, date) => {
    if (Platform.OS === 'android' || Platform.OS === 'web') {
      setShowTimePicker(false);
    }
    if (date) {
      const newDate = new Date(fechaHora);
      newDate.setHours(date.getHours(), date.getMinutes());
      setFechaHora(newDate);
    }
  };

  // Filtrar rivales por búsqueda
  const filteredRivals = useMemo(() => {
    if (!searchRivalText.trim()) return rivals;
    const search = searchRivalText.toLowerCase().trim();
    return rivals.filter(r => 
      r.nombre?.toLowerCase().includes(search)
    );
  }, [rivals, searchRivalText]);

  // Seleccionar imagen del escudo para nuevo rival
  const pickRivalImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t('common.error'), t('rivals.permissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setNewRivalEscudo(base64Image);
    }
  };

  // Crear nuevo rival
  const handleCreateRival = async () => {
    if (!newRivalName.trim()) {
      showMissingFieldsToast(t, [t('rivals.name')]);
      return;
    }

    if (!team?._id) {
      toast.error(t('rivals.noTeamSelected'));
      return;
    }

    // Obtener userId del AsyncStorage
    let userId = '';
    try {
      const storedUser = await AsyncStorage.getItem('usuario');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        userId = user._id;
      }
    } catch (e) {
      console.error('Error getting user:', e);
    }

    if (!userId) {
      toast.error(t('message.noUserIdentified'));
      return;
    }

    setSavingRival(true);
    try {
      const rivalData = {
        nombre: newRivalName.trim(),
        escudo: newRivalEscudo || '',
        equipo: team._id,
        usuario: userId,
      };

      const result = await dispatch(createRival(rivalData)).unwrap();
      
      // Refrescar la lista de rivales
      await dispatch(fetchRivalsByTeam({ teamId: team._id })).unwrap();
      
      // Seleccionar el rival recién creado
      setRival(result.nombre);
      setRivalId(result._id);
      setRivalEscudo(result.escudo || null);
      
      // Cerrar modales y limpiar estados
      setShowCreateRivalModal(false);
      setShowRivalSelector(false);
      setNewRivalName('');
      setNewRivalEscudo('');
      setSearchRivalText('');
      
      toast.success(t('rivals.createSuccess'));
    } catch (error) {
      console.error('Error creating rival:', error);
      toast.error(error.message || t('rivals.saveError'));
    } finally {
      setSavingRival(false);
    }
  };

  // Abrir modal de crear rival
  const openCreateRivalModal = () => {
    setNewRivalName(searchRivalText.trim());
    setNewRivalEscudo('');
    setShowRivalSelector(false);
    setTimeout(() => {
      setShowCreateRivalModal(true);
    }, 100);
  };

  const normalizeSetPiecesForSave = (setPieces) => setPieces.map((sp) => ({
    strategyId: sp.strategyId || sp._id || sp.id,
    nombre: sp.nombre,
    descripcion: sp.descripcion || '',
    imagen: sp.imagen || '',
    customImage: sp.customImage || '',
    elementosCampo: applySetPieceKitsToElements(
      sp.elementosCampo || [],
      getMatchSetPieceKitContext(sp),
      sp.pizarraConfig?.teamPlayers?.showPhotos ?? sp.pizarraConfig?.showPhotos ?? false,
    ),
    customElements: applySetPieceKitsToElements(
      sp.customElements || [],
      getMatchSetPieceKitContext(sp),
      sp.pizarraConfig?.teamPlayers?.showPhotos ?? sp.pizarraConfig?.showPhotos ?? false,
    ),
    customFieldType: sp.customFieldType || '',
    pizarraConfig: {
      ...(sp.pizarraConfig || {}),
      setPieceMode: true,
      kitContext: getMatchSetPieceKitContext(sp),
      teamPlayers: {
        ...((sp.pizarraConfig || {}).teamPlayers || {}),
        ...kitToBoardStyle(
          ownKits[equipacionPropiaKey],
          ownKits[equipacionPropiaKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'],
        ),
      },
    },
    videoId: getSetPieceVideoId(sp),
    videoUrl: sp.videoUrl || '',
    assignments: (sp.assignments || []).map((assignment) => {
      const playerId = typeof assignment.player === 'object' ? assignment.player?._id : assignment.player;
      const player = players.find((item) => String(item._id) === String(playerId)) || assignment.player;
      return {
        slotId: assignment.slotId,
        number: String(assignment.number || ''),
        player: playerId || undefined,
        playerName: player ? getPlayerFullName(player) : (assignment.playerName || ''),
      };
    }),
  }));

  // Guardar cambios
  const handleSave = async () => {
    if (!rival.trim()) {
      showMissingFieldsToast(t, [t('matchSheet.fields.rival', 'Rival')]);
      return;
    }

    if (competicion !== 'amistoso' && !torneoId) {
      showMissingFieldsToast(t, [t('matchSheet.fields.tournament', 'Torneo')]);
      return;
    }

    if ((Number(golesFavor) || 0) !== (goles || []).length || (Number(golesContra) || 0) !== (golesRival || []).length) {
      Alert.alert(t('common.error'), t('matchSheet.validation.goalsMismatch'));
      return;
    }

    // Validación de jornada + torneo duplicados
    if (matchSheets.length > 0 && jornada && torneoId) {
      const jornadaNum = Number(jornada);
      if (isNaN(jornadaNum)) {
        Alert.alert(t('common.error'), t('matchSheet.validation.matchdayOnlyNumbers'));
        return;
      }
      const partidoConMismaJornada = matchSheets.find(ms => {
        if (matchSheet && ms._id === matchSheet._id) return false;
        const msTorneoId = ms.torneoId && typeof ms.torneoId === 'object' ? ms.torneoId._id : ms.torneoId;
        if (msTorneoId !== torneoId) return false;
        if (fase === 'grupos') {
          const selectedPierna = pierna || 'unico';
          return ms.fase === 'grupos'
            && Number(ms.grupo) === Number(grupo)
            && Number(ms.jornada) === jornadaNum
            && ((ms.pierna || 'unico') === selectedPierna);
        }
        if (fase === 'eliminatoria') {
          return ms.fase === 'eliminatoria'
            && ms.ronda === ronda
            && ((ms.pierna || 'unico') === (pierna || 'unico'));
        }
        return (ms.fase === 'liga' || !ms.fase) && ms.jornada && Number(ms.jornada) === jornadaNum;
      });
      if (partidoConMismaJornada) {
        Alert.alert(
          t('matchSheet.validation.duplicateMatchday'),
          t('matchSheet.validation.duplicateMatchdayMessage', {
            matchday: jornada,
            rival: partidoConMismaJornada.rival || '',
          }),
        );
        return;
      }
    }

    setLoading(true);
    try {
      // Normalizar cambios: extraer IDs de objetos populados
      const cambiosNormalizados = cambios.map(c => ({
        minuto: c.minuto,
        sale: typeof c.sale === 'object' ? c.sale._id : c.sale,
        entra: typeof c.entra === 'object' ? c.entra._id : c.entra,
      }));

      // Normalizar goles: extraer IDs de objetos populados
      const golesNormalizados = goles.map(g => ({
        minuto: g.minuto,
        jugador: typeof g.jugador === 'object' ? g.jugador._id : g.jugador,
        asistente: g.asistente ? (typeof g.asistente === 'object' ? g.asistente._id : g.asistente) : undefined,
        tipo: g.tipo,
      }));

      // Normalizar tarjetas: extraer IDs de objetos populados
      const tarjetasAmarillasNorm = tarjetasAmarillas.map(t => ({
        minuto: t.minuto,
        jugador: typeof t.jugador === 'object' ? t.jugador._id : t.jugador,
        motivo: t.motivo,
      }));
      const tarjetasRojasNorm = tarjetasRojas.map(t => ({
        minuto: t.minuto,
        jugador: typeof t.jugador === 'object' ? t.jugador._id : t.jugador,
        motivo: t.motivo,
        partidosSancion: (t.motivo === 'Doble amarilla') ? (t.partidosSancion || 1) : Math.max(1, t.partidosSancion || 1),
      }));
      const setPiecesNorm = normalizeSetPiecesForSave(selectedSetPieces);

      const matchData = {
        rival: rival.trim(),
        rivalId: rivalId,
        rivalEscudo: rivalEscudo,
        equipacionPropiaKey,
        equipacionRivalKey,
        equipacionPropia: ownKits[equipacionPropiaKey],
        equipacionPorteroPropia: ownKits[equipacionPropiaKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'],
        equipacionRival: rivalEquipment ? rivalKits[equipacionRivalKey] : null,
        equipacionPorteroRival: rivalEquipment ? rivalKits[equipacionRivalKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'] : null,
        fechaHora: fechaHora.toISOString(),
        jornada: jornada ? Number(jornada) : null,
        ubicacion,
        competicion: competicion,
        torneoId: competicion === 'amistoso' ? null : torneoId,
        // Campos adaptativos de torneo
        fase: competicion === 'amistoso' ? null : fase,
        ronda: fase === 'eliminatoria' ? ronda : null,
        grupo: fase === 'grupos' ? (grupo ? Number(grupo) : null) : null,
        pierna: fase === 'eliminatoria' || fase === 'grupos' ? pierna : null,
        golesFavor: isMatchPast ? Number(golesFavor || 0) : (golesFavor !== '' && golesFavor !== null && golesFavor !== undefined ? Number(golesFavor) : null),
        golesContra: isMatchPast ? Number(golesContra || 0) : (golesContra !== '' && golesContra !== null && golesContra !== undefined ? Number(golesContra) : null),
        resultado,
        alineacion,
        alineacionRival,
        notasEntrenador,
        partidoUrl: String(partidoUrl || '').trim(),
        convocados,
        noConvocados,
        alineacionTitulares,
        alineacionSuplentes,
        posicionesVisuales,
        goles: golesNormalizados,
        tarjetasAmarillas: tarjetasAmarillasNorm,
        tarjetasRojas: tarjetasRojasNorm,
        cambios: cambiosNormalizados,
        golesRival: golesRival,
        descuentoPrimerTiempo: parseInt(descuentoPrimerTiempo) || 0,
        descuentoSegundoTiempo: parseInt(descuentoSegundoTiempo) || 0,
        setPieces: setPiecesNorm,
      };

      if (isCreateMode && onCreate) {
        // Modo crear
        await onCreate(matchData);
      } else {
        // Modo editar
        await onSave({
          _id: matchSheet._id,
          equipo: typeof matchSheet.equipo === 'object' ? matchSheet.equipo._id : matchSheet.equipo,
          ...matchData,
        });
      }
      onClose();
    } catch (error) {
      if (error?.code === 'DUPLICATE_TOURNAMENT_MATCHDAY') {
        Alert.alert(
          t('matchSheet.validation.duplicateMatchday'),
          t('matchSheet.validation.duplicateMatchdayMessage', {
            matchday: jornada,
            rival: error?.rival || '',
          }),
        );
      } else {
        Alert.alert(t('common.error'), t('matchSheet.saveChangesError'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Solo número
  const filterNumeric = (text) => text.replace(/[^0-9]/g, '');

  const getSetPieceSlots = (setPiece) => {
    const elements = Array.isArray(setPiece?.elementosCampo) ? setPiece.elementosCampo : [];
    return elements
      .filter((element) => element?.type === 'player')
      .map((element, index) => ({
        slotId: String(element.id || element._id || `slot-${index}`),
        number: String(element.number || element.numero || element.text || element.label || element.dorsal || index + 1),
      }));
  };

  const addSetPieceToMatch = (setPiece) => {
    const id = setPiece._id || setPiece.id;
    if (!id || selectedSetPieces.some((sp) => String(sp.strategyId || sp._id || sp.id) === String(id))) return;
    const slots = getSetPieceSlots(setPiece);
    setSelectedSetPieces((prev) => [
      ...prev,
      {
        strategyId: id,
        nombre: setPiece.nombre,
        descripcion: setPiece.descripcion || '',
        imagen: setPiece.imagen || '',
        customImage: setPiece.customImage || '',
        elementosCampo: setPiece.elementosCampo || [],
        customElements: setPiece.customElements || [],
        customFieldType: setPiece.customFieldType || setPiece.tipoCampo || 'full',
        pizarraConfig: setPiece.pizarraConfig || null,
        videoId: setPiece.videoId || (Array.isArray(setPiece.videos) && setPiece.videos.length > 0 ? setPiece.videos[0] : undefined),
        videoUrl: setPiece.videoUrl || '',
        assignments: slots.map((slot) => ({ ...slot, player: null, playerName: '' })),
      },
    ]);
  };

  const assignSetPiecePlayer = (setPieceIndex, slotId, playerId) => {
    setSelectedSetPieces((prev) => prev.map((sp, index) => {
      if (index !== setPieceIndex) return sp;
      return {
        ...sp,
        assignments: (sp.assignments || []).map((assignment) => (
          assignment.slotId === slotId
            ? { ...assignment, player: playerId || null, playerName: playerId ? getPlayerName(playerId) : '' }
            : assignment
        )),
      };
    }));
    setActiveSetPieceSlot({ setPieceIndex, slotId });
  };

  const withAssignedPlayers = (setPiece) => {
    const bySlot = new Map((setPiece.assignments || []).map((a) => [String(a.slotId), a]));
    const source = Array.isArray(setPiece.customElements) && setPiece.customElements.length
      ? setPiece.customElements
      : (setPiece.elementosCampo || []);
    return source.map((element) => {
      if (element?.type !== 'player') return element;
      const assignment = bySlot.get(String(element.id || element._id || ''));
      const playerId = typeof assignment?.player === 'object' ? assignment.player?._id : assignment?.player;
      const player = players.find((p) => String(p._id) === String(playerId)) || assignment?.player || (assignment ? element.playerData : null);
      if (!player || typeof player !== 'object') {
        return { ...element, playerData: undefined, photoUrl: undefined };
      }
      return {
        ...element,
        number: element.number || assignment?.number || player.dorsal || '',
        photoUrl: assignment?.photoUrl || (player.foto ? cdnUrl(player.foto) : element.photoUrl),
        showPhotos: setPiece?.pizarraConfig?.teamPlayers?.showPhotos ?? setPiece?.pizarraConfig?.showPhotos ?? false,
        playerData: {
          ...player,
          nombre: getPlayerFullName(player),
          fullName: getPlayerFullName(player),
          foto: player.foto || assignment?.foto || '',
        },
      };
    });
  };

  const findAvailableSetPieceVideo = async (setPiece) => {
    const requestedId = getSetPieceVideoId(setPiece);
    for (const candidateId of getSetPieceVideoCandidates(setPiece, availableSetPieces)) {
      const metadata = await getVideoById(candidateId, { optional: true }).catch(() => null);
      if (metadata?.video) {
        return {
          videoId: candidateId,
          metadata,
          recovered: String(candidateId) !== String(requestedId || ''),
        };
      }
    }
    return null;
  };

  const openSetPieceBoard = async (setPieceIndex) => {
    if (boardParams || boardOpeningRef.current) return;
    const setPiece = selectedSetPieces[setPieceIndex];
    if (!setPiece) return;
    boardOpeningRef.current = true;
    boardModalGuardUntilRef.current = Date.now() + 2000;
    const requestId = boardOpenRequestRef.current + 1;
    boardOpenRequestRef.current = requestId;
    setOpeningSetPieceBoardIndex(setPieceIndex);
    try {
    const availableVideo = await findAvailableSetPieceVideo(setPiece).catch((error) => {
      console.warn('No se pudo preparar la pizarra de la ABP:', error);
      return null;
    });
    if (requestId !== boardOpenRequestRef.current) return;
    let boardSetPiece = availableVideo?.recovered ? {
      ...setPiece,
      videoId: availableVideo.videoId,
      pizarraConfig: {
        ...(setPiece.pizarraConfig || {}),
        matchVideoCopy: false,
        matchVideoSourceId: undefined,
        matchVideoSourceUpdatedAt: undefined,
        matchVideoR2Key: undefined,
        matchVideoUrl: undefined,
      },
    } : setPiece;
    let editVideoData = null;
    let editableVideoId = availableVideo?.videoId || null;
    let didDuplicateVideo = false;
    let videoMetadata = availableVideo?.metadata || null;

    if (!availableVideo && getSetPieceVideoId(setPiece)) {
      boardSetPiece = {
        ...setPiece,
        videoId: null,
        pizarraConfig: {
          ...(setPiece.pizarraConfig || {}),
          matchVideoCopy: false,
          matchVideoSourceId: undefined,
          matchVideoSourceUpdatedAt: undefined,
          matchVideoR2Key: undefined,
          matchVideoUrl: undefined,
        },
      };
      setSelectedSetPieces((prev) => prev.map((sp, index) => index === setPieceIndex ? boardSetPiece : sp));
    }

    if (editableVideoId) {
      try {
        if (!boardSetPiece.pizarraConfig?.matchVideoCopy || videoMetadata?.video?.type === 'tactical') {
          videoMetadata = videoMetadata || await getVideoById(editableVideoId).catch(() => null);
          if (requestId !== boardOpenRequestRef.current) return;
          if (videoMetadata?.video) {
            try {
              const duplicated = await duplicateVideoForEdit(editableVideoId, {
                nombre: `${setPiece.nombre || t('setPieces.title')}_ficha`,
                isMatchSheetVideo: true,
              });
              if (requestId !== boardOpenRequestRef.current) return;
              editableVideoId = duplicated?.video?._id || duplicated?.video?.id || duplicated?.videoId || editableVideoId;
              didDuplicateVideo = true;
            } catch (duplicateError) {
              console.warn('No se pudo duplicar el video de ABP; se abrirá el original:', duplicateError);
            }
          }
          if (editableVideoId && didDuplicateVideo) {
            boardSetPiece = {
              ...boardSetPiece,
              videoId: editableVideoId,
              pizarraConfig: {
                ...(boardSetPiece.pizarraConfig || {}),
                matchVideoCopy: true,
                matchVideoSourceId: undefined,
                matchVideoSourceUpdatedAt: undefined,
                matchVideoR2Key: undefined,
                matchVideoUrl: undefined,
              },
            };
            setSelectedSetPieces((prev) => prev.map((sp, index) => index === setPieceIndex ? boardSetPiece : sp));
          }
        }

        if (editableVideoId) {
          const isTacticalVideo = !didDuplicateVideo && videoMetadata?.video?.type === 'tactical';
          const result = isTacticalVideo
            ? await getTacticalVideo(editableVideoId).catch(() => null)
            : await getVideoForEdit(editableVideoId);
          if (requestId !== boardOpenRequestRef.current) return;
          const video = isTacticalVideo
            ? (result?.data?.video || result?.video)
            : result?.video;
          if ((isTacticalVideo ? video : result?.success && video)) {
            editVideoData = {
              videoId: video.id || video._id || editableVideoId,
              nombre: video.nombre || video.title || boardSetPiece.nombre || '',
              descripcion: video.descripcion || '',
              fieldType: video.fieldType || 'full',
              keyframes: video.keyframes || (video.frames || []).map((frame) => ({
                timestamp: frame.timestamp,
                elements: frame.elements || [],
                connectors: frame.connectors || [],
                ballTrajectoryType: frame.ballTrajectoryType || 'ground',
                ballTrajectoryById: frame.ballTrajectoryById || {},
              })),
              config: video.config || { speedMultiplier: video.speed || 1 },
              estrategiaId: null,
              folderId: video.folder?._id || video.folder || null,
            };
          }
        }
      } catch (error) {
        console.warn('Error preparando video de ABP de ficha:', error);
      }
    }

    if (requestId !== boardOpenRequestRef.current) return;
    const boardCallbacks = {
      onSave: (updatedElements, updatedFieldType, imageBase64, updatedConfig) => {
        const playerElements = (updatedElements || []).filter(el => el.type === 'player' && el.playerData);
        const newAssignments = playerElements.map((el, idx) => ({
          slotId: String(el.id || el._id || `slot-${idx}`),
          number: String(el.number || el.playerNumber || el.numero || el.text || el.label || ''),
          xRatio: el.xRatio,
          yRatio: el.yRatio,
          x: el.x,
          y: el.y,
          player: el.playerData?._id || el.playerData?.id || null,
          playerName: getPlayerFullName(el.playerData),
          foto: el.playerData?.foto || '',
          photoUrl: el.photoUrl || (el.playerData?.foto ? cdnUrl(el.playerData.foto) : ''),
          showPhotos: el.showPhotos === true,
        }));
        const showPhotos = newAssignments.some((assignment) => assignment.showPhotos && assignment.photoUrl);

        setSelectedSetPieces((prev) => prev.map((sp, index) => index === setPieceIndex ? {
          ...sp,
          customImage: imageBase64,
          customElements: updatedElements,
          customFieldType: updatedFieldType,
          pizarraConfig: {
            ...(updatedConfig || sp.pizarraConfig || {}),
            teamPlayers: {
              ...((updatedConfig || sp.pizarraConfig || {})?.teamPlayers || {}),
              showPhotos,
            },
            showPhotos,
            setPieceMode: true,
            matchVideoCopy: false,
            matchVideoCopyId: undefined,
            matchVideoCopySignature: undefined,
            matchVideoSourceId: undefined,
            matchVideoSourceUpdatedAt: undefined,
            matchVideoR2Key: undefined,
            matchVideoUrl: undefined,
          },
          assignments: newAssignments,
        } : sp));
        boardModalGuardUntilRef.current = Date.now() + 500;
        setBoardParams(null);
      },
      onVideoSaved: (savedVideoId) => {
        if (!savedVideoId) return;
        setSelectedSetPieces((prev) => prev.map((sp, index) => index === setPieceIndex ? {
          ...sp,
          videoId: savedVideoId,
          pizarraConfig: {
            ...(sp.pizarraConfig || {}),
            setPieceMode: true,
            matchVideoCopy: true,
            matchVideoCopyId: undefined,
            matchVideoCopySignature: undefined,
            matchVideoSourceId: undefined,
            matchVideoSourceUpdatedAt: undefined,
            matchVideoR2Key: undefined,
            matchVideoUrl: undefined,
          },
        } : sp));
      },
      onCancel: () => {
        boardModalGuardUntilRef.current = Date.now() + 500;
        setBoardParams(null);
      },
    };
    setBoardParams({
      boardKey: `${setPieceIndex}-${boardSetPiece.strategyId || boardSetPiece._id || 'new'}-${editableVideoId || 'board'}`,
      initialElements: withAssignedPlayers(boardSetPiece),
      initialFieldType: boardSetPiece.customFieldType || boardSetPiece.tipoCampo || 'full',
      initialConfig: {
        ...(boardSetPiece.pizarraConfig || {}),
        kitContext: getMatchSetPieceKitContext(boardSetPiece),
        teamPlayers: {
          ...(boardSetPiece.pizarraConfig?.teamPlayers || {}),
          ...kitToBoardStyle(ownKits[equipacionPropiaKey], ownKits[equipacionPropiaKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst']),
          showPhotos: boardSetPiece.pizarraConfig?.teamPlayers?.showPhotos ?? boardSetPiece.pizarraConfig?.showPhotos ?? false,
        },
        playersWithNumber: boardSetPiece.pizarraConfig?.playersWithNumber ?? true,
        setPieceMode: true,
      },
      isStrategyMode: true,
      setPieceMode: true,
      embeddedBoard: true,
      isMatchSheetVideo: true,
      estrategiaId: null,
      presetVideoName: boardSetPiece.nombre || t('setPieces.title'),
      matchSheetPlayers: convocadosPlayers,
      editVideoData,
      deferEditVideoOpen: true,
      ...boardCallbacks,
    });
    } catch (error) {
      console.error('Error abriendo la pizarra de la ABP:', error);
      Alert.alert(t('message.error'), t('strategy.loadError', 'No se pudo abrir la pizarra. Inténtalo de nuevo.'));
    } finally {
      if (requestId === boardOpenRequestRef.current) {
        boardOpeningRef.current = false;
        setOpeningSetPieceBoardIndex(null);
      }
    }
  };

  const removeSetPieceFromMatch = (setPieceIndex) => {
    setSelectedSetPieces((prev) => prev.filter((_, index) => index !== setPieceIndex));
  };

  const persistGeneratedSetPieceVideo = async (artifact, setPieceIndex) => {
    const nextSetPieces = selectedSetPieces.map((sp, index) => index === setPieceIndex ? {
      ...sp,
      videoId: artifact.sourceVideoId,
      pizarraConfig: {
        ...(sp.pizarraConfig || {}),
        setPieceMode: true,
        matchVideoCopy: true,
        matchVideoCopyId: undefined,
        matchVideoCopySignature: artifact.signature,
        matchVideoSourceId: artifact.sourceVideoId,
        matchVideoSourceUpdatedAt: artifact.sourceUpdatedAt,
        matchVideoR2Key: artifact.r2Key,
        matchVideoUrl: artifact.videoUrl,
      },
    } : sp);

    setSelectedSetPieces(nextSetPieces);
    if (!isCreateMode && matchSheet?._id) {
      await updateMatchSheet(matchSheet._id, { setPieces: normalizeSetPiecesForSave(nextSetPieces) });
    }
  };

  const playSetPieceVideo = async (setPiece, setPieceIndex) => {
    if (isVideoGenerating) return;
    setSetPieceVideoTitle(setPiece.nombre || t('setPieces.title'));
    setVideoGenerationProgress(0);
    setVideoGenerationPhase('generationPreparing');
    setIsVideoGenerating(true);
    setLoadingSetPieceVideoIndex(setPieceIndex);
    try {
      const playerOverlays = buildSetPiecePlayerOverlays(setPiece);
      const result = await resolveMatchSheetSetPieceVideo({
        setPiece,
        availableSetPieces,
        playerOverlays,
        onSaved: (artifact) => persistGeneratedSetPieceVideo(artifact, setPieceIndex),
        onProgress: (progress, phase) => {
          setVideoGenerationProgress(progress);
          setVideoGenerationPhase(phase);
        },
      });
      setSetPieceVideoUrl(result.url);
    } catch (error) {
      console.error('Error loading set piece video:', error);
      Alert.alert(t('message.error'), t('strategy.videoPlayError'));
    } finally {
      setIsVideoGenerating(false);
      setLoadingSetPieceVideoIndex(null);
    }
  };

  const getMatchSetPieceDownloadName = (setPiece) => {
    const baseName = String(setPiece?.nombre || t('setPieces.title') || 'ABP').trim();
    const rivalName = String(rival || matchSheet?.rival || '').trim();
    return rivalName ? `${baseName} - ${rivalName}` : baseName;
  };

  const downloadSetPieceVideo = async (setPiece, setPieceIndex) => {
    if (isVideoGenerating || downloadingSetPieceVideoIndex !== null) return;
    setVideoGenerationProgress(0);
    setVideoGenerationPhase('generationPreparing');
    setDownloadingSetPieceVideoIndex(setPieceIndex);
    try {
      const playerOverlays = buildSetPiecePlayerOverlays(setPiece);
      const result = await resolveMatchSheetSetPieceVideo({
        setPiece,
        availableSetPieces,
        playerOverlays,
        onSaved: (artifact) => persistGeneratedSetPieceVideo(artifact, setPieceIndex),
        onProgress: (progress, phase) => {
          setVideoGenerationProgress(progress);
          setVideoGenerationPhase(phase);
        },
      });
      await downloadResolvedVideo(result.url, getMatchSetPieceDownloadName(setPiece));
    } catch (error) {
      console.error('Error downloading set piece video:', error);
      Alert.alert(t('message.error'), t('strategy.videoPlayError'));
    } finally {
      setDownloadingSetPieceVideoIndex(null);
    }
  };

  const closeSetPieceVideo = () => {
    if (setPieceVideoUrl) revokeVideoObjectUrl(setPieceVideoUrl);
    setSetPieceVideoUrl(null);
    setSetPieceVideoTitle('');
  };

  const renderSetPiecesTab = () => {
    const selectedIds = new Set(selectedSetPieces.map((sp) => String(sp.strategyId || sp._id || sp.id)));
    const selectableSetPieces = availableSetPieces.filter((sp) => !selectedIds.has(String(sp._id || sp.id)));
    return (
      <View style={styles.setPiecesPanel}>
        <View style={styles.resultSection}>
          <Text style={styles.sectionTitle}>{t('setPieces.matchTab')}</Text>
          <Text style={styles.setPiecesHint}>{t('setPieces.matchTabDescription')}</Text>
          {loadingSetPieces ? (
            <View style={styles.setPiecesLoading}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.setPiecesHint}>{t('setPieces.loading')}</Text>
            </View>
          ) : selectableSetPieces.length === 0 ? (
            <Text style={styles.setPiecesHint}>{t('setPieces.noResults')}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.setPiecesPicker}>
              {selectableSetPieces.map((sp) => (
                <TouchableOpacity key={sp._id || sp.id} style={styles.setPiecePickerCard} onPress={() => addSetPieceToMatch(sp)}>
                  {sp.imagen ? (
                    <Image source={{ uri: sp.imagen }} style={styles.setPiecePickerImage} />
                  ) : (
                    <View style={styles.setPiecePickerImage}>
                      <Ionicons name="football-outline" size={26} color={theme.colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.setPiecePickerTitle} numberOfLines={2}>{sp.nombre}</Text>
                  <View style={styles.setPieceAddBadge}>
                    <Ionicons name="add" size={14} color={theme.colors.onPrimary} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {selectedSetPieces.map((sp, setPieceIndex) => (
          <View key={`${sp.strategyId || sp._id || setPieceIndex}`} style={styles.setPieceAssignmentCard}>
            <View style={styles.setPieceAssignmentHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.setPieceAssignmentTitle} numberOfLines={1}>{sp.nombre}</Text>
                {!!sp.descripcion && <Text style={styles.setPieceAssignmentDesc} numberOfLines={2}>{sp.descripcion}</Text>}
              </View>
              <TouchableOpacity style={styles.setPieceRemoveBtn} onPress={() => removeSetPieceFromMatch(setPieceIndex)}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.setPiecePreviewWrap}>
              <SetPiecePreview
                setPiece={sp}
                players={players}
                height={isMobile ? 180 : 260}
                kitContext={getMatchSetPieceKitContext(sp)}
              />
              {loadingSetPieceVideoIndex === setPieceIndex && (
                <View style={styles.setPiecePreviewLoadingOverlay}>
                  <View style={styles.setPiecePreviewLoadingCard}>
                    <LoadingSpinner theme={theme} text={t('common.loading', 'Cargando...')} />
                  </View>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.setPieceBoardBtn,
                openingSetPieceBoardIndex === setPieceIndex && { opacity: 0.75 },
              ]}
              onPress={() => openSetPieceBoard(setPieceIndex)}
              disabled={openingSetPieceBoardIndex !== null}
            >
              {openingSetPieceBoardIndex === setPieceIndex ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons name="expand-outline" size={17} color={theme.colors.primary} />
              )}
              <Text style={styles.setPieceBoardBtnText}>
                {openingSetPieceBoardIndex === setPieceIndex
                  ? t('common.loading', 'Cargando...')
                  : t('setPieces.openBoard')}
              </Text>
            </TouchableOpacity>
            {!!sp.videoId && (
              <View style={styles.setPieceActionRow}>
                <TouchableOpacity
                  style={[
                    styles.setPieceDownloadBtn,
                    downloadingSetPieceVideoIndex !== null && styles.setPieceVideoBtnDisabled,
                  ]}
                  onPress={() => downloadSetPieceVideo(sp, setPieceIndex)}
                  disabled={isVideoGenerating || downloadingSetPieceVideoIndex !== null}
                >
                  {downloadingSetPieceVideoIndex === setPieceIndex ? (
                    <LoadingSpinner
                      theme={theme}
                      text={t('common.loading', 'Cargando...')}
                      size={16}
                      strokeWidth={3}
                      hideText
                      gap={0}
                    />
                  ) : (
                    <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
                  )}
                  <Text style={styles.setPieceDownloadBtnText}>MP4</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.setPieceVideoBtn, isVideoGenerating && styles.setPieceVideoBtnDisabled]}
                  onPress={() => playSetPieceVideo(sp, setPieceIndex)}
                  disabled={isVideoGenerating || downloadingSetPieceVideoIndex !== null}
                >
                  {loadingSetPieceVideoIndex === setPieceIndex ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="play-circle-outline" size={18} color="#fff" />
                  )}
                  <Text style={styles.setPieceVideoBtnText}>{loadingSetPieceVideoIndex === setPieceIndex ? t('common.loading', 'Cargando...') : (t('strategy.play') || 'Ver vídeo')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };
  const handleMatchSheetRequestClose = () => {
    if (
      boardOpeningRef.current ||
      boardParams ||
      Date.now() < boardModalGuardUntilRef.current
    ) return;
    onClose();
  };
  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={handleMatchSheetRequestClose}
      >
      <View style={styles.modalBg}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{matchSheet?._id ? t('matchSheet.editMatch') : t('matchSheet.fields.createMatchSheet')}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleMatchSheetRequestClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.matchSheetTabs}>
            {[
              { key: 'data', label: t('matchSheet.sections.data', 'Datos'), icon: 'document-text-outline' },
              { key: 'setPieces', label: t('setPieces.matchTab'), icon: 'football-outline' },
            ].map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.matchSheetTab, selected && styles.matchSheetTabActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons name={tab.icon} size={16} color={selected ? '#fff' : theme.colors.textSecondary} />
                  <Text style={[styles.matchSheetTabText, selected && styles.matchSheetTabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <KeyboardAwareScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'data' ? (
            <>
            {/* Fila de escudos - orden según ubicación */}
            <View style={styles.escudosRow}>
              {/* Primer escudo - mi equipo si local, rival si visitante */}
              <View style={styles.escudoContainer}>
                <Text style={styles.escudoLabel}>
                  {ubicacion === 'visitante' 
                    ? t('matchSheet.fields.rivalShield') 
                    : t('matchSheet.fields.myTeamShield')}
                </Text>
                <View style={styles.escudoButton}>
                  {ubicacion === 'visitante' ? (
                    // Mostrar rival si visitante
                    rivalEscudo ? (
                      <Image source={{ uri: rivalEscudo }} style={styles.escudoImage} />
                    ) : (
                      <View style={styles.escudoPlaceholder}>
                        <Ionicons name="shield-outline" size={28} color={theme.colors.textMuted} />
                        <Text style={styles.escudoPlaceholderText} numberOfLines={2}>{rival || t('matchSheet.fields.selectRival')}</Text>
                      </View>
                    )
                  ) : (
                    // Mostrar mi equipo si local o neutral
                    team?.escudo ? (
                      <Image source={{ uri: team.escudo }} style={styles.escudoImage} />
                    ) : (
                      <View style={styles.escudoPlaceholder}>
                        <Ionicons name="shield-outline" size={28} color={theme.colors.primary} />
                        <Text style={styles.escudoPlaceholderText} numberOfLines={2}>{team?.nombre || ''}</Text>
                      </View>
                    )
                  )}
                </View>
              </View>

              <View style={styles.vsContainer}>
                <Text style={styles.vsText}>{t('matchSheet.fields.vs')}</Text>
              </View>

              {/* Segundo escudo - rival si local, mi equipo si visitante */}
              <View style={styles.escudoContainer}>
                <Text style={styles.escudoLabel}>
                  {ubicacion === 'visitante' 
                    ? t('matchSheet.fields.myTeamShield') 
                    : t('matchSheet.fields.rivalShield')}
                </Text>
                <View style={styles.escudoButton}>
                  {ubicacion === 'visitante' ? (
                    // Mostrar mi equipo si visitante
                    team?.escudo ? (
                      <Image source={{ uri: team.escudo }} style={styles.escudoImage} />
                    ) : (
                      <View style={styles.escudoPlaceholder}>
                        <Ionicons name="shield-outline" size={28} color={theme.colors.primary} />
                        <Text style={styles.escudoPlaceholderText} numberOfLines={2}>{team?.nombre || ''}</Text>
                      </View>
                    )
                  ) : (
                    // Mostrar rival si local o neutral
                    rivalEscudo ? (
                      <Image source={{ uri: rivalEscudo }} style={styles.escudoImage} />
                    ) : (
                      <View style={styles.escudoPlaceholder}>
                        <Ionicons name="shield-outline" size={28} color={theme.colors.textMuted} />
                        <Text style={styles.escudoPlaceholderText} numberOfLines={2}>{rival || t('matchSheet.fields.selectRival')}</Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            </View>

            {/* Rival - Usando componente reutilizable */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('matchSheet.fields.rival')}</Text>
              <RivalSelector
                selectedRivalId={rivalId}
                selectedRivalName={rival}
                onSelectRival={(id, nombre, escudo) => {
                  setRivalId(id);
                  setRival(nombre);
                  setRivalEscudo(escudo);
                }}
                teamId={team?._id}
                placeholder={t('schedule.selectRival')}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('matchSheet.fields.ownKit', 'Equipación propia')}</Text>
              <View style={styles.kitRow}>
                {['first', 'second'].map((key) => (
                  <TouchableOpacity key={key} style={[styles.kitOption, equipacionPropiaKey === key && styles.kitOptionActive]} onPress={() => setEquipacionPropiaKey(key)}>
                    <View style={[styles.kitSwatch, { borderRadius: ownKits[key].shape === 'circle' ? 12 : 4, backgroundColor: ownKits[key].primaryColor, borderColor: ownKits[key].secondaryColor }]} />
                    <Text style={styles.kitOptionText}>{t(`kits.${key}`, key === 'first' ? 'Primera' : 'Segunda')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('matchSheet.fields.rivalKit', 'Equipación rival')}</Text>
              <View style={styles.kitRow}>
                {['first', 'second'].map((key) => (
                  <TouchableOpacity key={key} style={[styles.kitOption, equipacionRivalKey === key && styles.kitOptionActive]} onPress={() => setEquipacionRivalKey(key)}>
                    <View style={[styles.kitSwatch, { borderRadius: rivalKits[key].shape === 'circle' ? 12 : 4, backgroundColor: rivalKits[key].primaryColor, borderColor: rivalKits[key].secondaryColor }]} />
                    <Text style={styles.kitOptionText}>{t(`kits.${key}`, key === 'first' ? 'Primera' : 'Segunda')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Fecha */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('schedule.date')}</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.selectText}>{formatDate(fechaHora)}</Text>
              </TouchableOpacity>
            </View>

            {/* Hora */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('schedule.time')}</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.selectText}>{formatTime(fechaHora)}</Text>
              </TouchableOpacity>
            </View>

            {/* ─── Campos adaptativos según formato de torneo ─── */}
            {competicion !== 'amistoso' && torneoFormato && (
              <>
                {/* Fase selector: solo para grupos+eliminatoria */}
                {torneoFormato === 'grupos+eliminatoria' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('matchSheet.fields.phase')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.selectInput, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                          fase === 'grupos' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}
                        onPress={() => { setFase('grupos'); setRonda(null); setPierna(null); }}
                      >
                        <Text style={[styles.selectText, fase === 'grupos' && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                          {t('matchSheet.fields.groupPhase')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.selectInput, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                          fase === 'eliminatoria' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}
                        onPress={() => { setFase('eliminatoria'); setGrupo(null); setJornada(''); }}
                      >
                        <Text style={[styles.selectText, fase === 'eliminatoria' && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                          {t('matchSheet.fields.knockoutPhase')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Grupo selector: solo en fase de grupos */}
                {fase === 'grupos' && torneoFormato === 'grupos+eliminatoria' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('matchSheet.fields.group')}</Text>
                    <TouchableOpacity
                      style={styles.selectInput}
                      onPress={() => setShowGrupoModal(true)}
                    >
                      <Text style={grupo ? styles.selectText : styles.selectPlaceholder}>
                        {grupo ? t('matchSheet.fields.groupN', { n: grupo }) : t('matchSheet.fields.selectGroup')}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Jornada: para liga o fase de grupos */}
                {(torneoFormato === 'liga' || (torneoFormato === 'grupos+eliminatoria' && fase === 'grupos')) && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      {torneoFormato === 'liga' ? t('schedule.matchday') : t('matchSheet.fields.matchdayInGroup')}
                    </Text>
                    <TouchableOpacity
                      style={styles.selectInput}
                      onPress={() => setShowJornadaModal(true)}
                    >
                      <Text style={jornada ? styles.selectText : styles.selectPlaceholder}>
                        {jornada ? `${t('matchSheet.fields.matchday')} ${jornada}` : t('matchSheet.fields.selectMatchday')}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}

                {fase === 'grupos' && torneoFormato === 'grupos+eliminatoria' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('matchSheet.fields.leg')}</Text>
                    {groupUsesLegs ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.selectInput, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                            pierna === 'ida' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}
                          onPress={() => setPierna('ida')}
                        >
                          <Text style={[styles.selectText, pierna === 'ida' && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                            {t('matchSheet.fields.legFirst')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.selectInput, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                            pierna === 'vuelta' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}
                          onPress={() => setPierna('vuelta')}
                        >
                          <Text style={[styles.selectText, pierna === 'vuelta' && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                            {t('matchSheet.fields.legSecond')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={[styles.selectInput, { backgroundColor: theme.colors.background }]}>
                        <Text style={styles.selectText}>{t('matchSheet.fields.legSingle')}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Ronda: para eliminatoria (pura o fase eliminatoria de grupos+eliminatoria) */}
                {fase === 'eliminatoria' && (torneoFormato === 'eliminatoria' || torneoFormato === 'grupos+eliminatoria') && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('matchSheet.fields.round')}</Text>
                    <TouchableOpacity
                      style={styles.selectInput}
                      onPress={() => setShowRondaModal(true)}
                    >
                      <Text style={ronda ? styles.selectText : styles.selectPlaceholder}>
                        {ronda ? t(ROUND_KEYS[ronda] || ronda) : t('matchSheet.fields.selectRound')}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Pierna (ida/vuelta): para eliminatoria cuando la ronda lo requiere */}
                {fase === 'eliminatoria' && ronda && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('matchSheet.fields.leg')}</Text>
                    {roundUsesLegs ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.selectInput, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                            pierna === 'ida' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}
                          onPress={() => setPierna('ida')}
                        >
                          <Text style={[styles.selectText, pierna === 'ida' && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                            {t('matchSheet.fields.legFirst')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.selectInput, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                            pierna === 'vuelta' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}
                          onPress={() => setPierna('vuelta')}
                        >
                          <Text style={[styles.selectText, pierna === 'vuelta' && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                            {t('matchSheet.fields.legSecond')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={[styles.selectInput, { backgroundColor: theme.colors.background }]}>
                        <Text style={styles.selectText}>{t('matchSheet.fields.legSingle')}</Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Ubicación */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('schedule.location')}</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowUbicacionModal(true)}
              >
                <Text style={styles.selectText}>
                  {ubicacion === 'local' ? t('matchSheet.modals.home') : 
                   ubicacion === 'visitante' ? t('matchSheet.modals.away') : 
                   ubicacion === 'neutral' ? t('matchSheet.modals.neutral') : 
                   t('matchSheet.modals.selectLocation')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Competición / Torneo */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('matchSheet.competition')} *</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowTorneoModal(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name={competicion === 'amistoso' ? 'sports-soccer' : 'emoji-events'} size={20} color={competicion === 'amistoso' ? theme.colors.success : theme.colors.purple} />
                  <Text style={styles.selectText}>
                    {competicion === 'amistoso'
                      ? (t('matchSheet.friendly') || 'Amistoso')
                      : (tournaments.find(tr => tr._id === torneoId)?.nombre || t('tournaments.selectTournament'))}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Resultado */}
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>{t('schedule.result')}</Text>
              
              <View style={styles.scoreRow}>
                {/* Primer marcador - según ubicación */}
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>
                    {ubicacion === 'visitante' ? t('matchSheet.fields.goalsAgainst') : t('matchSheet.fields.goalsFor')}
                  </Text>
                  <View style={styles.descuentoSelector}>
                    <TouchableOpacity
                      style={styles.descuentoButton}
                      onPress={() => {
                        if (ubicacion === 'visitante') {
                          setGolesContra(String(Math.max(0, Number(golesContra || 0) - 1)));
                        } else {
                          setGolesFavor(String(Math.max(0, Number(golesFavor || 0) - 1)));
                        }
                      }}
                    >
                      <Ionicons name="remove" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.descuentoValue}>
                      {ubicacion === 'visitante' ? (golesContra || '0') : (golesFavor || '0')}
                    </Text>
                    <TouchableOpacity
                      style={styles.descuentoButton}
                      onPress={() => {
                        if (ubicacion === 'visitante') {
                          setGolesContra(String(Math.min(99, Number(golesContra || 0) + 1)));
                        } else {
                          setGolesFavor(String(Math.min(99, Number(golesFavor || 0) + 1)));
                        }
                      }}
                    >
                      <Ionicons name="add" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.scoreDivider}>
                  <Text style={styles.scoreDividerText}>-</Text>
                </View>
                
                {/* Segundo marcador - según ubicación */}
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>
                    {ubicacion === 'visitante' ? t('matchSheet.fields.goalsFor') : t('matchSheet.fields.goalsAgainst')}
                  </Text>
                  <View style={styles.descuentoSelector}>
                    <TouchableOpacity
                      style={styles.descuentoButton}
                      onPress={() => {
                        if (ubicacion === 'visitante') {
                          setGolesFavor(String(Math.max(0, Number(golesFavor || 0) - 1)));
                        } else {
                          setGolesContra(String(Math.max(0, Number(golesContra || 0) - 1)));
                        }
                      }}
                    >
                      <Ionicons name="remove" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.descuentoValue}>
                      {ubicacion === 'visitante' ? (golesFavor || '0') : (golesContra || '0')}
                    </Text>
                    <TouchableOpacity
                      style={styles.descuentoButton}
                      onPress={() => {
                        if (ubicacion === 'visitante') {
                          setGolesFavor(String(Math.min(99, Number(golesFavor || 0) + 1)));
                        } else {
                          setGolesContra(String(Math.min(99, Number(golesContra || 0) + 1)));
                        }
                      }}
                    >
                      <Ionicons name="add" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {resultado && (
                <View style={[
                  styles.resultBadge,
                  resultado === 'Victoria' && { backgroundColor: theme.colors.success + '20', borderColor: theme.colors.success },
                  resultado === 'Empate' && { backgroundColor: theme.colors.warning + '20', borderColor: theme.colors.warning },
                  resultado === 'Derrota' && { backgroundColor: theme.colors.error + '20', borderColor: theme.colors.error },
                ]}>
                  <Text style={[
                    styles.resultBadgeText,
                    resultado === 'Victoria' && { color: theme.colors.success },
                    resultado === 'Empate' && { color: theme.colors.warning },
                    resultado === 'Derrota' && { color: theme.colors.error },
                  ]}>
                    {translateResult(resultado)}
                  </Text>
                </View>
              )}
            </View>

            {/* Descuento (Tiempo añadido) */}
            <View style={styles.resultSection}>
              <Text style={styles.descuentoTitle}>{t('matchSheet.addedTime.titleAlt')}</Text>
              <View style={styles.descuentoRow}>
                <View style={styles.descuentoItem}>
                  <Text style={styles.scoreLabel}>{t('matchSheet.addedTime.firstHalf')}</Text>
                  <View style={styles.descuentoSelector}>
                    <TouchableOpacity
                      style={styles.descuentoButton}
                      onPress={() => setDescuentoPrimerTiempo(String(Math.max(0, parseInt(descuentoPrimerTiempo || '0') - 1)))}
                    >
                      <Ionicons name="remove" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.descuentoValue}>{descuentoPrimerTiempo || '0'}'</Text>
                    <TouchableOpacity
                      style={styles.descuentoButton}
                      onPress={() => setDescuentoPrimerTiempo(String(parseInt(descuentoPrimerTiempo || '0') + 1))}
                    >
                      <Ionicons name="add" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.descuentoItem}>
                  <Text style={styles.scoreLabel}>{t('matchSheet.addedTime.secondHalf')}</Text>
                  <View style={styles.descuentoSelector}>
                    <TouchableOpacity
                      style={styles.descuentoButton}
                      onPress={() => setDescuentoSegundoTiempo(String(Math.max(0, parseInt(descuentoSegundoTiempo || '0') - 1)))}
                    >
                      <Ionicons name="remove" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.descuentoValue}>{descuentoSegundoTiempo || '0'}'</Text>
                    <TouchableOpacity
                      style={styles.descuentoButton}
                      onPress={() => setDescuentoSegundoTiempo(String(parseInt(descuentoSegundoTiempo || '0') + 1))}
                    >
                      <Ionicons name="add" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <Text style={styles.descuentoHint}>{t('matchSheet.addedTime.hint')}</Text>
            </View>

            {/* Sección Alineación */}
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>{t('matchSheet.fields.formation')}</Text>
              
              {/* Alineación del equipo */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('matchSheet.fields.teamFormation')}</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowAlineacionModal(true)}
                >
                  <Ionicons name="grid" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.selectText}>{alineacion}</Text>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
              
              {/* Alineación del rival */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('matchSheet.fields.rivalFormation')}</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowAlineacionRivalModal(true)}
                >
                  <Ionicons name="grid" size={20} color={theme.colors.error} style={{ marginRight: 8 }} />
                  <Text style={alineacionRival ? styles.selectText : styles.selectPlaceholder}>
                    {alineacionRival || t('matchSheet.fields.selectRivalFormation')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sección Convocatoria */}
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>{t('schedule.callupAndLineup')}</Text>
              
              {/* Convocados */}
              <TouchableOpacity
                style={styles.playerSelectorBtn}
                onPress={() => setShowConvocadosModal(true)}
              >
                <View style={styles.playerSelectorLeft}>
                  <Ionicons name="people" size={20} color={theme.colors.success} />
                  <Text style={styles.playerSelectorText}>{t('schedule.called')} ({convocados.length})</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {/* No Convocados */}
              <TouchableOpacity
                style={styles.playerSelectorBtn}
                onPress={() => setShowNoConvocadosModal(true)}
              >
                <View style={styles.playerSelectorLeft}>
                  <Ionicons name="person-remove" size={20} color={theme.colors.error} />
                  <Text style={styles.playerSelectorText}>{t('schedule.notCalled')} ({noConvocados.length})</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {/* Editor visual de alineación */}
              {convocados.length > 0 && (
                <View style={styles.lineupEditorContainer}>
                  <View style={styles.lineupEditorHeader}>
                    <Ionicons name="football" size={20} color={theme.colors.success} />
                    <Text style={styles.lineupEditorTitle}>{t('schedule.visualLineup')} ({alineacion})</Text>
                  </View>
                  <LineupEditor
                    players={players}
                    convocados={convocados}
                    titulares={alineacionTitulares}
                    suplentes={alineacionSuplentes}
                    formation={alineacion}
                    onTitularesChange={setAlineacionTitulares}
                    onSuplentesChange={setAlineacionSuplentes}
                    posicionesVisuales={posicionesVisuales}
                    onPosicionesVisualesChange={setPosicionesVisuales}
                    jugadoresPorEquipo={jugadoresPorEquipo}
                    containerWidth={isMobileDevice() ? Math.min(windowWidth - 32, 380) : windowWidth - 56}
                  />
                </View>
              )}

              {/* Listado de Titulares */}
              {alineacionTitulares && Object.values(alineacionTitulares).filter(Boolean).length > 0 && (
                <View style={styles.startersSubsContainer}>
                  <View style={styles.startersSubsHeader}>
                    <Ionicons name="football" size={18} color={theme.colors.success} />
                    <Text style={styles.startersSubsTitle}>
                      {t('matchSheet.fields.starters')} ({Object.values(alineacionTitulares).filter(Boolean).length})
                    </Text>
                  </View>
                  <View style={styles.startersSubsList}>
                    {Object.values(alineacionTitulares).filter(Boolean).map((playerId) => {
                      const player = players.find(p => p._id === playerId);
                      if (!player) return null;
                      return (
                        <View key={playerId} style={styles.starterSubChip}>
                          <View style={[styles.starterSubDorsal, { backgroundColor: theme.colors.success }]}> 
                            <Text style={styles.starterSubDorsalText}>{player.dorsal || '-'}</Text>
                          </View>
                          <Text style={styles.starterSubName}>{getPlayerFullName(player)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Listado de Suplentes */}
              {alineacionSuplentes && alineacionSuplentes.length > 0 && (
                <View style={styles.startersSubsContainer}>
                  <View style={styles.startersSubsHeader}>
                    <Ionicons name="swap-horizontal" size={18} color={theme.colors.purple} />
                    <Text style={styles.startersSubsTitle}>
                      {t('matchSheet.fields.substitutes')} ({alineacionSuplentes.length})
                    </Text>
                  </View>
                  <View style={styles.startersSubsList}>
                    {alineacionSuplentes.map((playerId) => {
                      const player = players.find(p => p._id === playerId);
                      if (!player) return null;
                      return (
                        <View key={playerId} style={[styles.starterSubChip, { borderLeftColor: theme.colors.purple }]}> 
                          <View style={[styles.starterSubDorsal, { backgroundColor: theme.colors.purple }]}> 
                            <Text style={styles.starterSubDorsalText}>{player.dorsal || '-'}</Text>
                          </View>
                          <Text style={styles.starterSubName}>{getPlayerFullName(player)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {convocados.length === 0 && (
                <View style={styles.emptyLineupMessage}>
                  <Ionicons name="information-circle-outline" size={24} color={theme.colors.textMuted} />
                  <Text style={styles.emptyLineupText}>
                    {t('schedule.emptyLineupHint')}
                  </Text>
                </View>
              )}
            </View>

            {/* Sección Eventos */}
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>{t('schedule.matchEvents')}</Text>
              
              {/* Goles */}
              <TouchableOpacity 
                style={styles.eventSelector} 
                onPress={() => setShowGolesModal(true)}
              >
                <View style={styles.eventSelectorHeader}>
                  <Ionicons name="football" size={20} color={theme.colors.success} />
                  <Text style={styles.eventSelectorTitle}>{t('schedule.goals')} ({goles.length})</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {goles.length > 0 && (
                <View style={styles.eventsList}>
                  {[...goles].sort((a, b) => {
                    const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                    const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                    return minA - minB;
                  }).map((gol) => {
                    const originalIndex = goles.indexOf(gol);
                    return (
                    <View key={originalIndex} style={styles.eventChip}>
                      <Text style={styles.eventMinute}>{gol.minuto}'</Text>
                      <TouchableOpacity style={{ flex: 1, flexShrink: 1, minWidth: 0 }} onPress={() => {
                        setEditingGoalIndex(originalIndex);
                        setShowGolesModal(true);
                      }}>
                        <Text style={styles.eventChipText} numberOfLines={1}>
                          {getPlayerName(gol.jugador)}
                          {gol.asistente ? ` \u2022 ${t('matchSheet.events.assist')}: ${getPlayerName(gol.asistente)}` : ''}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setGoles(goles.filter((_, i) => i !== originalIndex))}>
                        <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                    );
                  })}
                </View>
              )}

              {/* Tarjetas */}
              <TouchableOpacity 
                style={styles.eventSelector} 
                onPress={() => setShowTarjetasModal(true)}
              >
                <View style={styles.eventSelectorHeader}>
                  <Ionicons name="square" size={20} color={theme.colors.warning} />
                  <Text style={styles.eventSelectorTitle}>{t('matchSheet.fields.cards')} ({tarjetasAmarillas.length + tarjetasRojas.length})</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {(tarjetasAmarillas.length > 0 || tarjetasRojas.length > 0) && (
                <View style={styles.eventsList}>
                  {[...tarjetasAmarillas].sort((a, b) => {
                    const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                    const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                    return minA - minB;
                  }).map((tarjeta) => {
                    const originalIdx = tarjetasAmarillas.indexOf(tarjeta);
                    return (
                    <View key={`a-${originalIdx}`} style={styles.eventChip}>
                      <View style={[styles.cardIndicator, { backgroundColor: '#fbbf24' }]} />
                      <Text style={styles.eventMinute}>{tarjeta.minuto}'</Text>
                      <TouchableOpacity style={{ flex: 1, flexShrink: 1, minWidth: 0 }} onPress={() => {
                        setEditingCardIndex(originalIdx);
                        setEditingCardType('amarilla');
                        setShowTarjetasModal(true);
                      }}>
                        <Text style={styles.eventChipText} numberOfLines={1}>
                          {getPlayerName(tarjeta.jugador)}{tarjeta.motivo ? ` \u2022 ${tarjeta.motivo}` : ''}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        const removedCard = tarjetasAmarillas[originalIdx];
                        const removedJugadorId = typeof removedCard.jugador === 'object' ? removedCard.jugador._id : removedCard.jugador;
                        const newAmarillas = tarjetasAmarillas.filter((_, i) => i !== originalIdx);
                        setTarjetasAmarillas(newAmarillas);
                        // Auto-remove red if player drops below 2 yellows
                        const remainingYellows = newAmarillas.filter(t => {
                          const tJugador = typeof t.jugador === 'object' ? t.jugador._id : t.jugador;
                          return tJugador === removedJugadorId;
                        });
                        if (remainingYellows.length < 2) {
                          setTarjetasRojas(tarjetasRojas.filter(t => {
                            const tJugador = typeof t.jugador === 'object' ? t.jugador._id : t.jugador;
                            return !(tJugador === removedJugadorId && t.motivo === 'Doble amarilla');
                          }));
                        }
                      }}>
                        <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                    );
                  })}
                  {[...tarjetasRojas].sort((a, b) => {
                    const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                    const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                    return minA - minB;
                  }).map((tarjeta) => {
                    const originalIdx = tarjetasRojas.indexOf(tarjeta);
                    const isAutoDobleAmarilla = tarjeta.motivo === 'Doble amarilla';
                    return (
                    <View key={`r-${originalIdx}`} style={styles.eventChip}>
                      <View style={[styles.cardIndicator, { backgroundColor: theme.colors.error }]} />
                      <Text style={[styles.eventMinute, { color: theme.colors.error }]}>{tarjeta.minuto}'</Text>
                      <TouchableOpacity style={{ flex: 1, flexShrink: 1, minWidth: 0 }} onPress={() => {
                        if (!isAutoDobleAmarilla) {
                          setEditingCardIndex(originalIdx);
                          setEditingCardType('roja');
                          setShowTarjetasModal(true);
                        }
                      }}>
                        <Text style={styles.eventChipText} numberOfLines={1}>
                          {getPlayerName(tarjeta.jugador)}{isAutoDobleAmarilla ? ` \u2022 ${t('matchSheet.cardTypes.doubleYellow') || 'Doble amarilla'}` : ''}{tarjeta.partidosSancion > 0 ? ` [${tarjeta.partidosSancion} ${t('matchSheet.modals.banMatchesShort')}]` : ''}
                        </Text>
                      </TouchableOpacity>
                      {!isAutoDobleAmarilla && (
                      <TouchableOpacity onPress={() => setTarjetasRojas(tarjetasRojas.filter((_, i) => i !== originalIdx))}>
                        <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                      )}
                    </View>
                    );
                  })}
                </View>
              )}

              {/* Cambios */}
              <TouchableOpacity 
                style={styles.eventSelector} 
                onPress={() => setShowCambiosModal(true)}
              >
                <View style={styles.eventSelectorHeader}>
                  <Ionicons name="swap-horizontal" size={20} color={theme.colors.purple} />
                  <Text style={styles.eventSelectorTitle}>{t('matchSheet.fields.changes')} ({cambios.length})</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {cambios.length > 0 && (
                <View style={styles.eventsList}>
                  {[...cambios].sort((a, b) => {
                    const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                    const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                    return minA - minB;
                  }).map((cambio) => {
                    const originalIndex = cambios.indexOf(cambio);
                    return (
                      <View key={originalIndex} style={styles.eventChip}>
                        <Text style={styles.eventMinute}>{cambio.minuto}'</Text>
                        <Text style={[styles.eventChipText, { flex: 1, flexShrink: 1 }]} numberOfLines={1}>
                          {getPlayerName(typeof cambio.sale === 'object' ? cambio.sale._id : cambio.sale)} → {getPlayerName(typeof cambio.entra === 'object' ? cambio.entra._id : cambio.entra)}
                        </Text>
                        <TouchableOpacity onPress={() => setCambios(cambios.filter((_, i) => i !== originalIndex))}>
                          <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Goles del Rival */}
            <View style={styles.resultSection}>
              <TouchableOpacity 
                style={[styles.eventSelector, { borderLeftWidth: 3, borderLeftColor: theme.colors.error }]} 
                onPress={() => setShowGolesRivalModal(true)}
              >
                <View style={styles.eventSelectorHeader}>
                  <View style={{ backgroundColor: theme.colors.errorSoft, borderRadius: 16, padding: 4 }}>
                    <Ionicons name="football" size={20} color={theme.colors.error} />
                  </View>
                  <Text style={[styles.eventSelectorTitle, { color: theme.colors.errorSoftText }]}>{t('matchSheet.rivalGoals.title')} ({golesRival.length})</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {golesRival.length > 0 && (
                <View style={styles.eventsList}>
                  {[...golesRival].sort((a, b) => {
                    const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                    const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                    return minA - minB;
                  }).map((gol) => {
                    const originalIndex = golesRival.indexOf(gol);
                    return (
                      <View key={originalIndex} style={[styles.eventChip, { backgroundColor: theme.colors.errorSoft, borderColor: theme.colors.error }]}>
                        <Text style={[styles.eventMinute, { color: theme.colors.errorSoftText }]}>{gol.minuto}'</Text>
                        <Text style={[styles.eventChipText, { color: theme.colors.errorSoftText }]} numberOfLines={1}>
                          {rival || t('matchSheet.rivalGoals.title')}
                        </Text>
                        <TouchableOpacity onPress={() => setGolesRival(golesRival.filter((_, i) => i !== originalIndex))}>
                          <Ionicons name="close-circle" size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Notas del Entrenador */}
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>{t('schedule.coachNotes')}</Text>
              <TextInput
                style={styles.notasInput}
                value={notasEntrenador}
                onChangeText={setNotasEntrenador}
                placeholder={t('schedule.notesPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                rows={4}
              />
              <Text style={styles.label}>{t('matchSheet.fields.matchLink', 'Enlace del partido')}</Text>
              <TextInput
                style={styles.textInput}
                value={partidoUrl}
                onChangeText={setPartidoUrl}
                placeholder="https://..."
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            {/* Botones */}
            </>
            ) : (
              renderSetPiecesTab()
            )}
          </KeyboardAwareScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
              >
                <Text style={styles.cancelBtnText}>{t('schedule.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={() => {
                  if (loading) return;
                  handleSave();
                }}
                activeOpacity={loading ? 1 : 0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>{t('message.save')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          <Modal
            visible={openingSetPieceBoardIndex !== null}
            transparent={true}
            animationType="fade"
          >
            <View style={styles.progressOverlay}>
              <View style={styles.progressModal}>
                <LoadingSpinner theme={theme} text={t('common.loading', 'Cargando...')} />
              </View>
            </View>
          </Modal>

          <Modal
            visible={!!setPieceVideoUrl}
            transparent
            animationType="fade"
            onRequestClose={closeSetPieceVideo}
          >
            <View style={styles.videoModalBg}>
              <View style={styles.videoModalContent}>
                <View style={styles.videoModalHeader}>
                  <Text style={styles.videoModalTitle} numberOfLines={1}>{setPieceVideoTitle}</Text>
                  <TouchableOpacity onPress={closeSetPieceVideo} style={styles.videoModalCloseBtn}>
                    <Ionicons name="close" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.videoPlayerContainer}>
                  <VideoView player={setPieceVideoPlayer} style={styles.videoPlayer} allowsFullscreen allowsPictureInPicture />
                </View>
              </View>
            </View>
          </Modal>

          {/* Date/Time Pickers */}
          {Platform.OS === 'ios' ? (
            <>
              {/* iOS: Modal para Date Picker */}
              <Modal
                visible={showDatePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.datePickerModalBg}>
                  <View style={styles.datePickerModalContent}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.datePickerCancel}>{t('schedule.cancel')}</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>{t('schedule.selectDate')}</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.datePickerDone}>{t('schedule.done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={fechaHora}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      style={{ height: 200 }}
                      textColor="#000000"
                    />
                  </View>
                </View>
              </Modal>

              {/* iOS: Modal para Time Picker */}
              <Modal
                visible={showTimePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTimePicker(false)}
              >
                <View style={styles.datePickerModalBg}>
                  <View style={styles.datePickerModalContent}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.datePickerCancel}>{t('schedule.cancel')}</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>{t('schedule.selectTime')}</Text>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.datePickerDone}>{t('schedule.done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={fechaHora}
                      mode="time"
                      is24Hour={true}
                      display="spinner"
                      onChange={handleTimeChange}
                      style={{ height: 200 }}
                      textColor="#000000"
                    />
                  </View>
                </View>
              </Modal>
            </>
          ) : (
            <>
              {/* Android: DateTimePicker nativo */}
              {showDatePicker && (
                <DateTimePicker
                  value={fechaHora}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={fechaHora}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
            </>
          )}

          {/* Modal selector de rival */}
          <Modal
            visible={showRivalSelector}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setShowRivalSelector(false);
              setSearchRivalText('');
            }}
          >
            <View style={styles.selectorModalBg}>
              <View style={styles.selectorModalContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>{t('schedule.selectRivalTitle')}</Text>
                  <TouchableOpacity onPress={() => {
                    setShowRivalSelector(false);
                    setSearchRivalText('');
                  }}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                {/* Barra de búsqueda */}
                <View style={styles.rivalSearchContainer}>
                  <Ionicons name="search" size={20} color={theme.colors.textMuted} />
                  <TextInput
                    style={styles.rivalSearchInput}
                    placeholder={t('common.search') + '...'}
                    placeholderTextColor={theme.colors.textMuted}
                    value={searchRivalText}
                    onChangeText={setSearchRivalText}
                    autoCapitalize="words"
                  />
                  {searchRivalText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchRivalText('')}>
                      <MaterialIcons name="clear" size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                
                <ScrollView style={styles.selectorList}>
                  {filteredRivals.length === 0 ? (
                    <View style={styles.emptyRivals}>
                      <Ionicons name="alert-circle" size={48} color={theme.colors.textMuted} />
                      <Text style={styles.emptyRivalsText}>
                        {searchRivalText ? t('common.noResults') : t('schedule.noRivals')}
                      </Text>
                    </View>
                  ) : (
                    filteredRivals.map((r, index) => (
                      <TouchableOpacity
                        key={r._id || index}
                        style={[
                          styles.selectorItem,
                          rival === r.nombre && styles.selectorItemActive,
                        ]}
                        onPress={() => {
                          setRival(r.nombre);
                          setRivalId(r._id);
                          setRivalEscudo(r.escudo || null);
                          setShowRivalSelector(false);
                          setSearchRivalText('');
                        }}
                      >
                        {r.escudo ? (
                          <Image 
                            source={{ uri: r.escudo }} 
                            style={{ width: 28, height: 28, marginRight: 10, borderRadius: 14 }} 
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.rivalEscudoPlaceholder}>
                            <Ionicons name="shield-outline" size={18} color={theme.colors.textMuted} />
                          </View>
                        )}
                        <Text style={[
                          styles.selectorItemText,
                          rival === r.nombre && styles.selectorItemTextActive,
                          { flex: 1 }
                        ]}>
                          {r.nombre}
                        </Text>
                        {rival === r.nombre && (
                          <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                
                {/* Footer con botón de crear nuevo rival */}
                <View style={styles.rivalSelectorFooter}>
                  {searchRivalText.trim() && !filteredRivals.some(r => r.nombre?.toLowerCase() === searchRivalText.toLowerCase()) && (
                    <TouchableOpacity 
                      style={styles.useTextButton} 
                      onPress={() => {
                        setRival(searchRivalText.trim());
                        setRivalId(null);
                        setRivalEscudo(null);
                        setShowRivalSelector(false);
                        setSearchRivalText('');
                      }}
                    >
                      <MaterialIcons name="edit" size={18} color={theme.colors.primary} />
                      <Text style={styles.useTextButtonText}>
                        {t('common.use')} "{searchRivalText.trim()}"
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.createRivalButton} onPress={openCreateRivalModal}>
                    <MaterialIcons name="add" size={20} color={theme.colors.onPrimary} />
                    <Text style={styles.createRivalButtonText}>{t('rivals.createNew')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal para crear nuevo rival */}
          <Modal
            visible={showCreateRivalModal}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setShowCreateRivalModal(false);
              setTimeout(() => setShowRivalSelector(true), 100);
            }}
          >
            <View style={styles.selectorModalBg}>
              <View style={styles.createRivalModalContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>{t('rivals.createRival')}</Text>
                  <TouchableOpacity onPress={() => {
                    setShowCreateRivalModal(false);
                    setTimeout(() => setShowRivalSelector(true), 100);
                  }}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.createRivalBody}>
                  {/* Selector de escudo */}
                  <TouchableOpacity style={styles.escudoPicker} onPress={pickRivalImage}>
                    {newRivalEscudo ? (
                      <Image source={{ uri: newRivalEscudo }} style={styles.escudoPreview} />
                    ) : (
                      <View style={styles.escudoPlaceholder}>
                        <Ionicons name="camera" size={32} color={theme.colors.textMuted} />
                        <Text style={styles.escudoPickerPlaceholderText}>{t('rivals.addShield')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Campo de nombre */}
                  <Text style={styles.createRivalLabel}>{t('rivals.name')}</Text>
                  <TextInput
                    style={styles.createRivalInput}
                    value={newRivalName}
                    onChangeText={setNewRivalName}
                    placeholder={t('rivals.namePlaceholder')}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.createRivalFooter}>
                  <TouchableOpacity
                    style={styles.createRivalCancelButton}
                    onPress={() => {
                      setShowCreateRivalModal(false);
                      setTimeout(() => setShowRivalSelector(true), 100);
                    }}
                  >
                    <Text style={styles.createRivalCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createRivalSaveButton, savingRival && styles.createRivalSaveButtonDisabled]}
                    onPress={() => {
                      if (savingRival) return;
                      handleCreateRival();
                    }}
                    activeOpacity={savingRival ? 1 : 0.8}
                  >
                    {savingRival ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.createRivalSaveText}>{t('common.create')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal de Alineación */}
          <Modal
            visible={showAlineacionModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAlineacionModal(false)}
          >
            <View style={styles.selectorModalBg}>
              <View style={styles.selectorModalContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>{t('schedule.selectLineup')}</Text>
                  <TouchableOpacity onPress={() => setShowAlineacionModal(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorList}>
                  {alineacionesDisponibles.map((alin) => (
                    <TouchableOpacity
                      key={alin}
                      style={[
                        styles.selectorItem,
                        alineacion === alin && styles.selectorItemActive,
                      ]}
                      onPress={() => {
                        setAlineacion(alin);
                        setShowAlineacionModal(false);
                      }}
                    >
                      <Text style={[
                        styles.selectorItemText,
                        alineacion === alin && styles.selectorItemTextActive,
                      ]}>
                        {alin}
                      </Text>
                      {alineacion === alin && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal de Alineación Rival */}
          <Modal
            visible={showAlineacionRivalModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAlineacionRivalModal(false)}
          >
            <View style={styles.selectorModalBg}>
              <View style={styles.selectorModalContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>{t('matchSheet.fields.selectRivalFormation')}</Text>
                  <TouchableOpacity onPress={() => setShowAlineacionRivalModal(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorList}>
                  {alineacionesDisponibles.map((alin) => (
                    <TouchableOpacity
                      key={alin}
                      style={[
                        styles.selectorItem,
                        alineacionRival === alin && styles.selectorItemActive,
                      ]}
                      onPress={() => {
                        setAlineacionRival(alin);
                        setShowAlineacionRivalModal(false);
                      }}
                    >
                      <Text style={[
                        styles.selectorItemText,
                        alineacionRival === alin && styles.selectorItemTextActive,
                      ]}>
                        {alin}
                      </Text>
                      {alineacionRival === alin && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal de Jornada */}
          <Modal
            visible={showJornadaModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowJornadaModal(false)}
          >
            <View style={styles.selectorModalBg}>
              <View style={styles.selectorModalContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>{t('matchSheet.fields.selectMatchday')}</Text>
                  <TouchableOpacity onPress={() => setShowJornadaModal(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorList}>
                  {jornadaOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.selectorItem,
                        jornada === option && styles.selectorItemActive,
                      ]}
                      onPress={() => {
                        setJornada(option);
                        setShowJornadaModal(false);
                      }}
                    >
                      <Text style={[
                        styles.selectorItemText,
                        jornada === option && styles.selectorItemTextActive,
                      ]}>
                        {t('matchSheet.fields.matchday')} {option}
                      </Text>
                      {jornada === option && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal de Ronda (eliminatoria) */}
          <Modal
            visible={showRondaModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowRondaModal(false)}
          >
            <View style={styles.selectorModalBg}>
              <View style={styles.selectorModalContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>{t('matchSheet.fields.selectRound')}</Text>
                  <TouchableOpacity onPress={() => setShowRondaModal(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorList}>
                  {availableRounds.map((roundOption) => (
                    <TouchableOpacity
                      key={roundOption}
                      style={[
                        styles.selectorItem,
                        ronda === roundOption && styles.selectorItemActive,
                      ]}
                      onPress={() => {
                        setRonda(roundOption);
                        setShowRondaModal(false);
                      }}
                    >
                      <Text style={[
                        styles.selectorItemText,
                        ronda === roundOption && styles.selectorItemTextActive,
                      ]}>
                        {t(ROUND_KEYS[roundOption] || roundOption)}
                      </Text>
                      {ronda === roundOption && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal de Grupo */}
          <Modal
            visible={showGrupoModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowGrupoModal(false)}
          >
            <View style={styles.selectorModalBg}>
              <View style={styles.selectorModalContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>{t('matchSheet.fields.selectGroup')}</Text>
                  <TouchableOpacity onPress={() => setShowGrupoModal(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorList}>
                  {grupoOptions.map((groupOption) => (
                    <TouchableOpacity
                      key={groupOption}
                      style={[
                        styles.selectorItem,
                        grupo === groupOption && styles.selectorItemActive,
                      ]}
                      onPress={() => {
                        setGrupo(groupOption);
                        setShowGrupoModal(false);
                      }}
                    >
                      <Text style={[
                        styles.selectorItemText,
                        grupo === groupOption && styles.selectorItemTextActive,
                      ]}>
                        {t('matchSheet.fields.groupN', { n: groupOption })}
                      </Text>
                      {grupo === groupOption && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal de Convocados */}
          <PlayerSelectionModal
            visible={showConvocadosModal}
            onClose={() => setShowConvocadosModal(false)}
            title={t('schedule.selectCalled')}
            players={players.filter(p => p.activo !== false || convocados.includes(p._id))}
            selectedIds={convocados}
            excludeIds={[]}
            injuries={injuries}
            sanctionedPlayerIds={localSanctionedPlayerIds}
            onConfirm={(ids) => {
              setConvocados(ids);
              const allPlayerIds = players.map(p => p._id);
              const leftover = allPlayerIds.filter(id => !ids.includes(id));
              setNoConvocados(leftover);
              // Limpiar titulares y suplentes que ya no están convocados
              setAlineacionTitulares(prev => prev.filter(id => ids.includes(id)));
              setAlineacionSuplentes(prev => prev.filter(id => ids.includes(id)));
              setShowConvocadosModal(false);
            }}
          />

          {/* Modal de No Convocados */}
          <PlayerSelectionModal
            visible={showNoConvocadosModal}
            onClose={() => setShowNoConvocadosModal(false)}
            title={t('schedule.selectNotCalled')}
            players={players.filter(p => p.activo !== false || noConvocados.includes(p._id))}
            selectedIds={noConvocados}
            excludeIds={[]}
            injuries={injuries}
            sanctionedPlayerIds={localSanctionedPlayerIds}
            onConfirm={(ids) => {
              setNoConvocados(ids);
              const allPlayerIds = players.map(p => p._id);
              const leftover = allPlayerIds.filter(id => !ids.includes(id));
              setConvocados(leftover);
              setAlineacionTitulares(prev => prev.filter(id => leftover.includes(id)));
              setAlineacionSuplentes(prev => prev.filter(id => leftover.includes(id)));
              setShowNoConvocadosModal(false);
            }}
          />

          {/* Modal de Titulares */}
          <PlayerSelectionModal
            visible={showTitularesModal}
            onClose={() => setShowTitularesModal(false)}
            title={t('schedule.selectStarters')}
            players={players.filter(p => convocados.includes(p._id))}
            selectedIds={alineacionTitulares}
            excludeIds={alineacionSuplentes}
            injuries={injuries}
            onConfirm={(ids) => {
              setAlineacionTitulares(ids);
              setShowTitularesModal(false);
            }}
          />

          {/* Modal de Suplentes */}
          <PlayerSelectionModal
            visible={showSuplentesModal}
            onClose={() => setShowSuplentesModal(false)}
            title={t('schedule.selectSubstitutes')}
            players={players.filter(p => convocados.includes(p._id))}
            selectedIds={alineacionSuplentes}
            excludeIds={alineacionTitulares}
            injuries={injuries}
            onConfirm={(ids) => {
              setAlineacionSuplentes(ids);
              setShowSuplentesModal(false);
            }}
          />

          {/* Modal de Goles */}
          <EventModal
            visible={showGolesModal}
            onClose={() => { setShowGolesModal(false); setEditingGoalIndex(null); }}
            title={editingGoalIndex !== null ? t('matchSheet.modals.editGoal') : t('matchSheet.modals.addGoal')}
            eventType="gol"
            players={callupPlayers}
            titulares={alineacionTitulares}
            suplentes={alineacionSuplentes}
            tiempoPorParte={team?.tiempoPorParte || 45}
            descuentoPT={Number(descuentoPrimerTiempo) || 0}
            descuentoST={Number(descuentoSegundoTiempo) || 0}
            jugadoresEnCampo={jugadoresEnCampo}
            jugadoresExpulsados={jugadoresExpulsados}
            cambiosRealizados={cambios}
            editingEvent={editingGoalIndex !== null ? goles[editingGoalIndex] : null}
            onAdd={(gol) => {
              if (editingGoalIndex !== null) {
                const updated = [...goles];
                updated[editingGoalIndex] = gol;
                setGoles(updated);
                setEditingGoalIndex(null);
              } else {
                setGoles([...goles, gol]);
              }
              setShowGolesModal(false);
            }}
          />

          {/* Modal de Tarjetas */}
          <EventModal
            visible={showTarjetasModal}
            onClose={() => { setShowTarjetasModal(false); setEditingCardIndex(null); setEditingCardType(null); }}
            title={editingCardIndex !== null ? t('matchSheet.modals.editCard') : t('matchSheet.modals.addCard')}
            eventType="tarjeta"
            players={callupPlayers}
            titulares={alineacionTitulares}
            suplentes={alineacionSuplentes}
            tiempoPorParte={team?.tiempoPorParte || 45}
            descuentoPT={Number(descuentoPrimerTiempo) || 0}
            descuentoST={Number(descuentoSegundoTiempo) || 0}
            jugadoresEnCampo={jugadoresEnCampo}
            jugadoresExpulsados={jugadoresExpulsados}
            cambiosRealizados={cambios}
            editingEvent={editingCardIndex !== null ? (editingCardType === 'amarilla' ? { ...tarjetasAmarillas[editingCardIndex], tipo: 'amarilla' } : { ...tarjetasRojas[editingCardIndex], tipo: 'roja' }) : null}
            onAdd={(tarjeta) => {
              if (editingCardIndex !== null) {
                // Editing existing card
                if (editingCardType === 'amarilla') {
                  if (tarjeta.tipo === 'amarilla') {
                    // Still yellow - update in place
                    const updated = [...tarjetasAmarillas];
                    updated[editingCardIndex] = tarjeta;
                    setTarjetasAmarillas(updated);
                  } else {
                    // Changed to red - remove from yellows, add to reds
                    setTarjetasAmarillas(tarjetasAmarillas.filter((_, i) => i !== editingCardIndex));
                    setTarjetasRojas([...tarjetasRojas, tarjeta]);
                  }
                } else {
                  if (tarjeta.tipo === 'roja') {
                    // Still red - update in place
                    const updated = [...tarjetasRojas];
                    updated[editingCardIndex] = tarjeta;
                    setTarjetasRojas(updated);
                  } else {
                    // Changed to yellow - remove from reds, add to yellows
                    setTarjetasRojas(tarjetasRojas.filter((_, i) => i !== editingCardIndex));
                    setTarjetasAmarillas([...tarjetasAmarillas, tarjeta]);
                  }
                }
                setEditingCardIndex(null);
                setEditingCardType(null);
              } else {
                // Adding new card
                if (tarjeta.tipo === 'amarilla') {
                  const newAmarillas = [...tarjetasAmarillas, tarjeta];
                  setTarjetasAmarillas(newAmarillas);
                  // Auto-add red card on double yellow
                  const tarjetaJugadorId = typeof tarjeta.jugador === 'object' ? tarjeta.jugador._id : tarjeta.jugador;
                  const playerYellows = newAmarillas.filter(t => {
                    const tJugador = typeof t.jugador === 'object' ? t.jugador._id : t.jugador;
                    return tJugador === tarjetaJugadorId;
                  });
                  if (playerYellows.length >= 2) {
                    const alreadyHasAutoRed = tarjetasRojas.some(t => {
                      const tJugador = typeof t.jugador === 'object' ? t.jugador._id : t.jugador;
                      return tJugador === tarjetaJugadorId && t.motivo === 'Doble amarilla';
                    });
                    if (!alreadyHasAutoRed) {
                      setTarjetasRojas([...tarjetasRojas, { jugador: tarjeta.jugador, minuto: tarjeta.minuto, motivo: 'Doble amarilla' }]);
                    }
                  }
                } else {
                  setTarjetasRojas([...tarjetasRojas, tarjeta]);
                }
              }
              setShowTarjetasModal(false);
            }}
          />

          {/* Modal de Cambios */}
          <EventModal
            visible={showCambiosModal}
            onClose={() => setShowCambiosModal(false)}
            title={t('matchSheet.modals.addChange')}
            eventType="cambio"
            players={players}
            titulares={alineacionTitulares}
            suplentes={alineacionSuplentes}
            tiempoPorParte={team?.tiempoPorParte || 45}
            descuentoPT={Number(descuentoPrimerTiempo) || 0}
            descuentoST={Number(descuentoSegundoTiempo) || 0}
            jugadoresEnCampo={jugadoresEnCampo}
            jugadoresExpulsados={jugadoresExpulsados}
            cambiosRealizados={cambios}
            onAdd={(cambio) => {
              setCambios([...cambios, cambio]);
              setShowCambiosModal(false);
            }}
          />

          {/* Modal de Goles del Rival */}
          <EventModal
            visible={showGolesRivalModal}
            onClose={() => setShowGolesRivalModal(false)}
            title={t('matchSheet.rivalGoals.addRivalGoal')}
            eventType="golRival"
            players={[]}
            tiempoPorParte={team?.tiempoPorParte || 45}
            descuentoPT={Number(descuentoPrimerTiempo) || 0}
            descuentoST={Number(descuentoSegundoTiempo) || 0}
            onAdd={(gol) => {
              setGolesRival([...golesRival, gol]);
              setShowGolesRivalModal(false);
            }}
          />

          {/* Modal de Ubicación */}
          <Modal
            visible={showUbicacionModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowUbicacionModal(false)}
          >
            <View style={styles.selectorModalBg}>
              <View style={styles.selectorModalContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>{t('matchSheet.modals.selectLocation')}</Text>
                  <TouchableOpacity onPress={() => setShowUbicacionModal(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorList}>
                  {[
                    { value: 'local', label: t('matchSheet.modals.home'), icon: 'home' },
                    { value: 'visitante', label: t('matchSheet.modals.away'), icon: 'airplane' },
                    { value: 'neutral', label: t('matchSheet.modals.neutral'), icon: 'location' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.selectorItem,
                        ubicacion === option.value && styles.selectorItemActive,
                      ]}
                      onPress={() => {
                        setUbicacion(option.value);
                        setShowUbicacionModal(false);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons 
                          name={option.icon} 
                          size={20} 
                          color={ubicacion === option.value ? theme.colors.primary : theme.colors.text} 
                        />
                        <Text style={[
                          styles.selectorItemText,
                          ubicacion === option.value && styles.selectorItemTextActive,
                        ]}>
                          {option.label}
                        </Text>
                      </View>
                      {ubicacion === option.value && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal de Torneo */}
          <Modal
            visible={showTorneoModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTorneoModal(false)}
          >
            <View style={styles.selectorModalBg}>
              <View style={styles.selectorModalContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>{t('matchSheet.competition')}</Text>
                  <TouchableOpacity onPress={() => setShowTorneoModal(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorList}>
                  {/* Opción Amistoso */}
                  <TouchableOpacity
                    style={[
                      styles.selectorItem,
                      competicion === 'amistoso' && styles.selectorItemActive,
                    ]}
                    onPress={() => {
                      setCompeticion('amistoso');
                      setTorneoId(null);
                      setSelectedCompetitionOption('amistoso');
                      setShowTorneoModal(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: theme.colors.success,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <MaterialIcons name="sports-soccer" size={14} color="#fff" />
                      </View>
                      <Text style={[
                        styles.selectorItemText,
                        competicion === 'amistoso' && styles.selectorItemTextActive,
                      ]}>
                        {t('matchSheet.friendly') || 'Amistoso'}
                      </Text>
                    </View>
                    {competicion === 'amistoso' && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>

                  {/* Torneos activos */}
                  {tournaments.filter(tr => tr.estado === 'activo').map((torneo) => (
                    <TouchableOpacity
                      key={torneo._id}
                      style={[
                        styles.selectorItem,
                        torneoId === torneo._id && competicion === 'torneo' && styles.selectorItemActive,
                      ]}
                      onPress={() => {
                        setCompeticion('torneo');
                        setTorneoId(torneo._id);
                        setSelectedCompetitionOption(torneo._id);
                        setShowTorneoModal(false);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{
                          width: 24, height: 24, borderRadius: 12,
                          backgroundColor: torneo.color || theme.colors.purple,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <MaterialIcons name="emoji-events" size={14} color="#fff" />
                        </View>
                        <Text style={[
                          styles.selectorItemText,
                          torneoId === torneo._id && competicion === 'torneo' && styles.selectorItemTextActive,
                        ]}>
                          {torneo.nombre}
                        </Text>
                        {torneo.porDefecto && (
                          <View style={{ backgroundColor: theme.colors.infoSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: theme.colors.infoSoftText, fontWeight: '600' }}>{t('tournaments.default')}</Text>
                          </View>
                        )}
                      </View>
                      {torneoId === torneo._id && competicion === 'torneo' && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                  {tournaments.filter(tr => tr.estado === 'activo').length === 0 && (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                        {t('tournaments.noActiveTournaments')}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </View>
      </Modal>

      <Modal
        visible={!!boardParams}
        animationType="fade"
        onRequestClose={() => boardParams?.onCancel?.()}
      >
        <SafeAreaProvider style={{ flex: 1 }}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            {boardParams ? (
              <Field
                key={`match-set-piece-${boardParams.boardKey || 'new'}`}
                {...boardParams}
                navigation={{ goBack: () => {}, navigate: () => {}, addListener: () => () => {} }}
              />
            ) : null}
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 10 : 16,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: isMobileDevice() ? '98%' : '96%',
    maxWidth: 980,
    maxHeight: isMobileDevice() ? '94%' : '92%',
    minHeight: isMobileDevice() ? '60%' : '62%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobileDevice() ? 14 : 20,
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    flexShrink: 1,
    paddingRight: 8,
  },
  closeBtn: {
    padding: 4,
  },
  matchSheetTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: isMobileDevice() ? 12 : 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  matchSheetTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  matchSheetTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  matchSheetTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  matchSheetTabTextActive: {
    color: '#fff',
  },
  modalBody: {
    flex: 1,
    padding: isMobileDevice() ? 10 : 16,
  },
  modalBodyContent: {
    paddingBottom: isMobileDevice() ? 100 : 24,
  },
  
  // Form
  formGroup: {
    marginBottom: 20,
  },
  kitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kitOption: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBg,
  },
  kitOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  kitSwatch: {
    width: 24,
    height: 24,
    borderWidth: 3,
  },
  kitOptionText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.text,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  selectPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textMuted,
  },
  
  // Escudos Row
  escudosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
  },
  escudoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  escudoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  escudoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  escudoImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  escudoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    width: '100%',
    height: '100%',
  },
  escudoPlaceholderText: {
    fontSize: 8,
    color: theme.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 10,
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  
  // Location
  locationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 14,
  },
  locationBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  locationBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  locationBtnTextActive: {
    color: '#fff',
  },
  
  // Result Section
  resultSection: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: isMobileDevice() ? 10 : 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  scoreInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    minWidth: 80,
  },
  scoreDivider: {
    paddingHorizontal: 8,
  },
  scoreDividerText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  resultBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
  },
  resultBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  setPiecesPanel: {
    gap: 14,
  },
  setPiecesHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  setPiecesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  setPiecesPicker: {
    gap: 12,
    paddingTop: 14,
    paddingBottom: 4,
  },
  setPiecePickerCard: {
    width: 154,
    minHeight: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 10,
    position: 'relative',
  },
  setPiecePickerImage: {
    width: '100%',
    height: 84,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPiecePickerTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  setPieceAddBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPieceAssignmentCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: isMobileDevice() ? 10 : 14,
    gap: 12,
  },
  setPiecePreviewWrap: {
    position: 'relative',
  },
  setPiecePreviewLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  setPiecePreviewLoadingCard: {
    width: '60%',
    minWidth: 220,
    maxWidth: 320,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  setPieceAssignmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  setPieceAssignmentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  setPieceAssignmentDesc: {
    marginTop: 3,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  setPieceRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.errorSoft,
  },
  setPieceAssignmentImage: {
    width: '100%',
    height: isMobileDevice() ? 180 : 260,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
  },
  setPieceVideoBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  setPieceActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  setPieceDownloadBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    minWidth: 58,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  setPieceDownloadBtnText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  setPieceVideoBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  setPieceBoardBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  setPieceBoardBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  playerPickerPanel: {
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playerPickerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.text,
  },
  assignmentRow: {
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  assignmentNumber: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  assignmentNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  assignmentPlayers: {
    gap: 8,
    paddingRight: 12,
  },
  assignmentChip: {
    maxWidth: 190,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  assignmentChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  assignmentChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  assignmentChipTextSelected: {
    color: '#fff',
  },
  videoModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  videoModalContent: {
    width: '100%',
    maxWidth: 900,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  videoModalTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  videoModalCloseBtn: {
    padding: 4,
  },
  videoGeneratingContainer: {
    height: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  videoGeneratingText: {
    color: '#fff',
    fontWeight: '700',
  },
  videoPlayerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  
  // Descuento styles
  descuentoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  descuentoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  descuentoItem: {
    alignItems: 'center',
    flex: 1,
  },
  descuentoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  descuentoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descuentoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
  descuentoHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  
  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: isMobileDevice() ? 8 : 12,
    paddingHorizontal: isMobileDevice() ? 14 : 20,
    paddingVertical: isMobileDevice() ? 12 : 14,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: isMobileDevice() ? 14 : 16,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: isMobileDevice() ? 14 : 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.error,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Selector Modal
  selectorModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 12 : 20,
  },
  selectorModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 14 : 16,
    width: '100%',
    maxWidth: isMobileDevice() ? '100%' : 400,
    maxHeight: isMobileDevice() ? '85%' : '70%',
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobileDevice() ? 14 : 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectorTitle: {
    fontSize: isMobileDevice() ? 15 : 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  customRivalInput: {
    padding: 16,
    paddingBottom: 8,
  },
  selectorList: {
    maxHeight: 300,
    padding: 8,
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 2,
  },
  selectorItemActive: {
    backgroundColor: theme.colors.primary + '15',
  },
  selectorItemText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  selectorItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  selectorConfirmBtn: {
    margin: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  selectorConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    padding: 20,
  },
  
  // Estilos para búsqueda y creación de rival
  rivalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rivalSearchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
  rivalEscudoPlaceholder: {
    width: 28,
    height: 28,
    marginRight: 10,
    borderRadius: 14,
    backgroundColor: theme.colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyRivals: {
    padding: 24,
    alignItems: 'center',
  },
  emptyRivalsText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  rivalSelectorFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 8,
  },
  useTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: theme.colors.inputBg,
    borderRadius: 12,
    gap: 8,
  },
  useTextButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  createRivalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createRivalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  createRivalModalContent: {
    width: isMobileDevice() ? '95%' : '90%',
    maxWidth: isMobileDevice() ? '100%' : 400,
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 16 : 20,
    overflow: 'hidden',
  },
  createRivalBody: {
    padding: isMobileDevice() ? 16 : 20,
  },
  escudoPicker: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  escudoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  escudoPickerPlaceholderText: {
    alignItems: 'center',
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  createRivalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  createRivalInput: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createRivalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  createRivalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
  },
  createRivalCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 16,
  },
  createRivalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  createRivalSaveButtonDisabled: {
    opacity: 0.7,
  },
  createRivalSaveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Estilos para selectores de jugadores
  playerSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.inputBg,
    borderRadius: 12,
    paddingVertical: isMobileDevice() ? 12 : 14,
    paddingHorizontal: isMobileDevice() ? 12 : 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playerSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerSelectorText: {
    fontSize: isMobileDevice() ? 14 : 15,
    color: theme.colors.text,
  },
  
  // Estilos para eventos (unificado con matchSheetList)
  eventSelector: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventSelectorTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  eventsList: {
    marginBottom: 12,
    gap: 6,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundAlt,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    overflow: 'hidden',
  },
  eventChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
    flexShrink: 1,
  },
  eventMinute: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    minWidth: 30,
    textAlign: 'right',
    flexShrink: 0,
  },
  cardIndicator: {
    width: 12,
    height: 16,
    borderRadius: 2,
  },
  
  // Notas
  notasInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    minHeight: 100,
  },
  
  // Estilos para LineupEditor visual
  lineupEditorContainer: {
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  lineupEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: theme.colors.success + '15',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  lineupEditorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
  emptyLineupMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  emptyLineupText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  startersSubsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  startersSubsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  startersSubsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  startersSubsList: {
    gap: 5,
  },
  starterSubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
    minWidth: 0,
  },
  starterSubDorsal: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterSubDorsalText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  starterSubName: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
  },
  
  // Estilos para modal de DateTimePicker en iOS
  datePickerModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  datePickerCancel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  progressModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 20,
    width: '80%',
    maxWidth: 320,
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
  },
  progressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  setPieceVideoBtnDisabled: {
    opacity: 0.7,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressPhase: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    paddingRight: 12,
  },
  progressBarOuter: {
    width: '100%',
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 999,
  },
  progressPercent: {
    minWidth: 48,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  progressCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 6,
  },
  progressCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});

