// components/pages/season/AddEventModal.js
// Modal para añadir nuevos eventos (fichas de partido o sesiones de entrenamiento)
import { useState, useEffect, useMemo, useCallback } from 'react';
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
  useWindowDimensions,
  Pressable,
} from 'react-native';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import { createRival, fetchRivalsByTeam } from '@/store/slices/rival/rivalThunks';
import { fetchTournamentSanctions } from '@/store/slices/tournament/tournamentThunks';
import { clearSanctions } from '@/store/slices/tournament/tournamentSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import LineupEditor from '@/vendor/matchSheet/LineupEditor';
import { ALINEACIONES_BY_PLAYER_COUNT, ALINEACIONES } from '@/vendor/matchSheet/useMatchSheetForm';
import { VideoView, useVideoPlayer } from 'expo-video';
import { getVideosByExercise, getVideoStreamUrl, regenerateVideoWithField } from '@/utils/api';
import { resolvePlayableVideoUrl } from '@/utils/videoPlayback';
import { getFieldById } from '@/utils/fieldTypes';
import ExerciseSelectorModal from '@/vendor/shared/ExerciseSelectorModal';
import StrengthExerciseSelectorModal from '@/vendor/shared/StrengthExerciseSelectorModal';
import { STRENGTH_EXERCISES, getStrengthExerciseImage, getSectionForExercise } from '@/data/strengthExercises';
import { getPlayerFullName, getPlayerInitials } from '@/utils/playerHelpers';
import RivalSelector from '@/vendor/shared/RivalSelector';
import { PlayerSelectionModal, getPlayerInjuryStatus } from '@/vendor/shared/training';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components';

// Componente modal para selección de opciones (jornada, etc.)
const OptionModal = ({ visible, onClose, options, selectedOption, setSelectedOption, title, renderLabel }) => {
  const theme = useTheme();
  const optionModalStyles = useMemo(() => makeOptionModalStyles(theme), [theme]);
  return (
  <Modal
    visible={visible}
    animationType="fade"
    transparent={true}
    onRequestClose={onClose}
 >
    <View style={optionModalStyles.modalOverlay}>
      <View style={optionModalStyles.modalContainer}>
        <View style={optionModalStyles.modalHeader}>
          <Text style={optionModalStyles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={optionModalStyles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={optionModalStyles.modalContent}>
          {options.map(option => (
            <TouchableOpacity
              key={option}
              style={optionModalStyles.optionItem}
              onPress={() => {
                setSelectedOption(option);
                onClose();
              }}
            >
              <Text style={[
                optionModalStyles.optionItemText,
                selectedOption === option && optionModalStyles.optionItemTextSelected
              ]}>
                {renderLabel ? renderLabel(option) : option}
              </Text>
              {selectedOption === option && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
  );
};

const makeOptionModalStyles = (theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 380,
    maxHeight: '75%',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 2,
  },
  optionItemText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  optionItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});


// Componente para selección de opción única
function OptionSelectorModal({ visible, onClose, title, options, selectedOption, onSelect }) {
  const theme = useTheme();
  const modalStyles = useMemo(() => makeModalStyles(theme), [theme]);
  if (!visible) return null;

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

          <ScrollView style={modalStyles.list}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  modalStyles.optionItem,
                  selectedOption === option && modalStyles.optionItemActive
                ]}
                onPress={() => onSelect(option)}
              >
                <Text style={[
                  modalStyles.optionText,
                  selectedOption === option && modalStyles.optionTextActive
                ]}>
                  {option}
                </Text>
                {selectedOption === option && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Componente para añadir eventos (goles, tarjetas, cambios)
function EventModal({ visible, onClose, title, eventType, players, titulares = [], suplentes = [], tiempoPorParte = 45, descuentoPT = 0, descuentoST = 0, jugadoresEnCampo = [], jugadoresExpulsados = [], cambiosRealizados = [], onAdd, editingEvent = null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const modalStyles = useMemo(() => makeModalStyles(theme), [theme]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [asistente, setAsistente] = useState(''); // Jugador que da la asistencia
  const [minuto, setMinuto] = useState('');
  const [tipoTarjeta, setTipoTarjeta] = useState('amarilla');
  const [motivo, setMotivo] = useState('');
  const [partidosSancionRoja, setPartidosSancionRoja] = useState('1');
  const [jugadorSale, setJugadorSale] = useState('');
  const [jugadorEntra, setJugadorEntra] = useState('');
  const [showMinuteModal, setShowMinuteModal] = useState(false);

  const isEditing = !!editingEvent;
  
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
        setMinuto(editingEvent.minuto || '');
        const jugadorId = typeof editingEvent.jugador === 'object' ? editingEvent.jugador._id : editingEvent.jugador;
        setSelectedPlayer(jugadorId || '');
        if (eventType === 'gol') {
          const asistenteId = editingEvent.asistente ? (typeof editingEvent.asistente === 'object' ? editingEvent.asistente._id : editingEvent.asistente) : '';
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
        setSelectedPlayer('');
        setAsistente('');
        setMinuto('');
        setTipoTarjeta('amarilla');
        setMotivo('');
        setPartidosSancionRoja('1');
        setJugadorSale('');
        setJugadorEntra('');
      }
      setShowMinuteModal(false);
    }
  }, [visible, editingEvent]);

  const handleAdd = () => {
    if (!minuto) {
      Alert.alert(t('message.error'), t('matchSheet.modals.minuteRequired'));
      return;
    }

    if (eventType === 'gol' && !selectedPlayer) {
      Alert.alert(t('message.error'), t('matchSheet.modals.playerRequired'));
      return;
    }

    if (eventType === 'tarjeta' && !selectedPlayer) {
      Alert.alert(t('message.error'), t('matchSheet.modals.playerRequired'));
      return;
    }

    if (eventType === 'cambio' && (!jugadorSale || !jugadorEntra)) {
      Alert.alert(t('message.error'), t('matchSheet.modals.playerRequired'));
      return;
    }

    let event;
    if (eventType === 'gol') {
      event = { jugador: selectedPlayer, minuto, asistente: asistente || undefined };
    } else if (eventType === 'tarjeta') {
      event = { jugador: selectedPlayer, minuto, tipo: tipoTarjeta, motivo: motivo || undefined };
      if (tipoTarjeta === 'roja') {
        event.partidosSancion = parseInt(partidosSancionRoja) || 1;
        console.log('[EventModal CONFIRM] partidosSancionRoja state:', partidosSancionRoja, '→ event.partidosSancion:', event.partidosSancion);
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
    if (!minuto) return t('matchSheet.modals.selectMinute');
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.playerChipsRow}>
                  {players.map(p => (
                    <TouchableOpacity
                      key={p._id}
                      style={[
                        modalStyles.playerChip,
                        selectedPlayer === p._id && modalStyles.playerChipSelected
                      ]}
                      onPress={() => setSelectedPlayer(p._id)}
                    >
                      <Text style={[
                        modalStyles.playerChipText,
                        selectedPlayer === p._id && modalStyles.playerChipTextSelected
                      ]}>
                        {getPlayerFullName(p)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.assistOptional')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.playerChipsRow}>
                  <TouchableOpacity
                    style={[
                      modalStyles.playerChip,
                      !asistente && modalStyles.playerChipSelected
                    ]}
                    onPress={() => setAsistente('')}
                  >
                    <Text style={[
                      modalStyles.playerChipText,
                      !asistente && modalStyles.playerChipTextSelected
                    ]}>
                      {t('matchSheet.modals.noAssist')}
                    </Text>
                  </TouchableOpacity>
                  {players.filter(p => p._id !== selectedPlayer).map(p => (
                    <TouchableOpacity
                      key={p._id}
                      style={[
                        modalStyles.playerChip,
                        asistente === p._id && modalStyles.playerChipSelected,
                        { borderColor: asistente === p._id ? theme.colors.purple : theme.colors.border, backgroundColor: asistente === p._id ? theme.colors.purple : theme.colors.surface }
                      ]}
                      onPress={() => setAsistente(p._id)}
                    >
                      <Text style={[
                        modalStyles.playerChipText,
                        asistente === p._id && modalStyles.playerChipTextSelected
                      ]}>
                        {getPlayerFullName(p)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {eventType === 'tarjeta' && (
              <>
                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.playerRequired')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.playerChipsRow}>
                  {players.map(p => (
                    <TouchableOpacity
                      key={p._id}
                      style={[
                        modalStyles.playerChip,
                        selectedPlayer === p._id && modalStyles.playerChipSelected
                      ]}
                      onPress={() => setSelectedPlayer(p._id)}
                    >
                      <Text style={[
                        modalStyles.playerChipText,
                        selectedPlayer === p._id && modalStyles.playerChipTextSelected
                      ]}>
                        {getPlayerFullName(p)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.cardTypeLabel')}</Text>
                <View style={modalStyles.cardTypeRow}>
                  <TouchableOpacity
                    style={[
                      modalStyles.cardTypeBtn,
                      tipoTarjeta === 'amarilla' && { backgroundColor: theme.colors.warningSoft, borderColor: '#f59e0b' }
                    ]}
                    onPress={() => setTipoTarjeta('amarilla')}
                  >
                    <View style={[modalStyles.cardIcon, { backgroundColor: '#fffc3f' }]} />
                    <Text style={modalStyles.cardTypeText}>{t('matchSheet.cardTypes.yellow')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      modalStyles.cardTypeBtn,
                      tipoTarjeta === 'roja' && { backgroundColor: theme.colors.errorSoft, borderColor: '#ef4444' }
                    ]}
                    onPress={() => setTipoTarjeta('roja')}
                  >
                    <View style={[modalStyles.cardIcon, { backgroundColor: '#ef4444' }]} />
                    <Text style={modalStyles.cardTypeText}>{t('matchSheet.cardTypes.red')}</Text>
                  </TouchableOpacity>
                </View>

                {tipoTarjeta === 'roja' && (
                  <>
                    <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.banMatches')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <TouchableOpacity
                        onPress={() => setPartidosSancionRoja(prev => String(Math.max(1, (parseInt(prev) || 1) - 1)))}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="remove" size={20} color="#ef4444" />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: '#ef4444', minWidth: 30, textAlign: 'center' }}>{partidosSancionRoja}</Text>
                      <TouchableOpacity
                        onPress={() => setPartidosSancionRoja(prev => String(Math.min(20, (parseInt(prev) || 1) + 1)))}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="add" size={20} color="#ef4444" />
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
                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.playerLeaving')} ({getJugadoresQuePuedenSalir().length} {t('matchSheet.modals.available')})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.playerChipsRow}>
                  {getJugadoresQuePuedenSalir().map(p => (
                    <TouchableOpacity
                      key={p._id}
                      style={[
                        modalStyles.playerChip,
                        jugadorSale === p._id && modalStyles.playerChipSelected,
                        { borderColor: '#ef4444' }
                      ]}
                      onPress={() => setJugadorSale(p._id)}
                    >
                      <Ionicons name="arrow-down" size={12} color={jugadorSale === p._id ? '#fff' : '#ef4444'} />
                      <Text style={[
                        modalStyles.playerChipText,
                        jugadorSale === p._id && modalStyles.playerChipTextSelected
                      ]}>
                        {getPlayerFullName(p)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={modalStyles.inputLabel}>{t('matchSheet.modals.playerEntering')} ({getJugadoresQuePuedenEntrar().length} {t('matchSheet.modals.available')})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.playerChipsRow}>
                  {getJugadoresQuePuedenEntrar().map(p => (
                    <TouchableOpacity
                      key={p._id}
                      style={[
                        modalStyles.playerChip,
                        jugadorEntra === p._id && modalStyles.playerChipSelected,
                        { borderColor: '#10b981' }
                      ]}
                      onPress={() => setJugadorEntra(p._id)}
                    >
                      <Ionicons name="arrow-up" size={12} color={jugadorEntra === p._id ? '#fff' : '#10b981'} />
                      <Text style={[
                        modalStyles.playerChipText,
                        jugadorEntra === p._id && modalStyles.playerChipTextSelected
                      ]}>
                        {getPlayerFullName(p)}
                      </Text>
                    </TouchableOpacity>
                  ))}
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
              <Text style={modalStyles.title}>{t('matchSheet.modals.selectMinuteTitle')}</Text>
              <TouchableOpacity onPress={() => setShowMinuteModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={modalStyles.list}>
              {/* Primera parte */}
              <Text style={modalStyles.minuteSectionTitle}>{t('matchSheet.modals.firstHalfRange')} (1' - {tpp}')</Text>
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
              <Text style={modalStyles.minuteSectionTitle}>{t('matchSheet.modals.secondHalfRange')} ({tpp + 1}' - {tpp * 2}')</Text>
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

// Estilos para los modales auxiliares
const makeModalStyles = (theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    width: '100%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
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
    backgroundColor: theme.colors.primarySoft,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  playerName: {
    fontSize: 15,
    color: theme.colors.text,
    flex: 1,
  },
  playerDorsal: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    padding: 20,
  },
  confirmBtn: {
    backgroundColor: theme.colors.primary,
    margin: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  optionItemActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  optionText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  optionTextActive: {
    color: theme.colors.primary,
    fontWeight: '500',
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
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.inputBg,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
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
    color: theme.colors.onPrimary,
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
    color: theme.colors.onPrimary,
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
    color: theme.colors.onPrimary,
  },
  minuteOptionTextAddedTime: {
    color: theme.colors.warningSoftText,
  },
});

export default function AddEventModal({
  visible,
  onClose,
  onCreateMatchSheet,
  onCreateTrainingSession,
  rivals = [],
  selectedDate = null,
  players = [],
  exercises = [],
  exerciseTypes = [],
  team = null,
  matchSheets = [],
  injuries = [],
  defaultEventType = null, // 'match', 'session' o null para mostrar selector
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const currentLang = i18n.language || 'es';
  const [eventType, setEventType] = useState(null); // 'match' or 'session'
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  // Detectar dispositivo móvil
  const { width } = useWindowDimensions();
  const isMobile = width < 500;
  
  // Separar jugadores de plantilla y extras
  const rosterPlayers = useMemo(() => players.filter(p => !p.extra), [players]);
  const extraPlayersAvailable = useMemo(() => players.filter(p => p.extra), [players]);
  
  // Estados para ficha de partido
  const [matchData, setMatchData] = useState({
    rival: '',
    rivalId: null,
    rivalEscudo: null,
    fechaHora: new Date(),
    jornada: '',
    ubicacion: 'local',
    golesFavor: '',
    golesContra: '',
    alineacion: '1-4-4-2',
    alineacionRival: '',
    notasEntrenador: '',
    descuentoPrimerTiempo: '0',
    descuentoSegundoTiempo: '0',
    competicion: 'amistoso',
    torneoId: null,
    // Campos adaptativos según formato de torneo
    fase: null,
    ronda: null,
    grupo: null,
    pierna: null,
  });
  
  // Estados para jugadores en ficha de partido
  const [convocados, setConvocados] = useState([]);
  const [noConvocados, setNoConvocados] = useState([]);
  const [alineacionTitulares, setAlineacionTitulares] = useState([]);
  const [alineacionSuplentes, setAlineacionSuplentes] = useState([]);
  
  // Estados para eventos del partido
  const [goles, setGoles] = useState([]);
  const [tarjetasAmarillas, setTarjetasAmarillas] = useState([]);
  const [tarjetasRojas, setTarjetasRojas] = useState([]);
  const [cambios, setCambios] = useState([]);
  const [golesRival, setGolesRival] = useState([]);
  
  // Estados para tracking de jugadores en campo
  const [jugadoresEnCampo, setJugadoresEnCampo] = useState([]);
  const [jugadoresExpulsados, setJugadoresExpulsados] = useState([]);
  
  // Estados para modales de selección de partido
  const [showMatchDatePicker, setShowMatchDatePicker] = useState(false);
  const [showMatchTimePicker, setShowMatchTimePicker] = useState(false);
  const [showRivalSelector, setShowRivalSelector] = useState(false);
  
  // Estados para crear nuevo rival
  const [showCreateRivalModal, setShowCreateRivalModal] = useState(false);
  const [newRivalName, setNewRivalName] = useState('');
  const [newRivalEscudo, setNewRivalEscudo] = useState('');
  const [savingRival, setSavingRival] = useState(false);
  const [searchRivalText, setSearchRivalText] = useState('');
  const dispatch = useDispatch();
  const tournaments = useSelector(state => state.tournament?.tournaments) || [];
  const sanctions = useSelector(state => state.tournament?.sanctions) || [];

  // Fetch sanctions when tournament is selected
  useEffect(() => {
    if (matchData.torneoId && matchData.competicion !== 'amistoso') {
      dispatch(fetchTournamentSanctions(matchData.torneoId));
    } else {
      dispatch(clearSanctions());
    }
  }, [matchData.torneoId, matchData.competicion, dispatch]);

  const sanctionedPlayerIds = useMemo(() => 
    sanctions.filter(s => s.sancionado).map(s => s.playerId),
    [sanctions]
  );

  // ─── Torneo seleccionado y lógica de formato ───
  const selectedTournament = useMemo(() => tournaments.find(t => t._id === matchData.torneoId), [tournaments, matchData.torneoId]);
  const torneoFormato = matchData.competicion === 'amistoso' ? null : (selectedTournament?.formato || null);

  const ROUND_ORDER = ['treintaydosavos', 'dieciseisavos', 'octavos', 'cuartos', 'semifinal', 'final'];
  const ROUND_KEYS = {
    final: 'tournaments.roundFinal',
    semifinal: 'tournaments.roundSemifinal',
    cuartos: 'tournaments.roundQuarters',
    octavos: 'tournaments.roundRound16',
    dieciseisavos: 'tournaments.roundRound32',
    treintaydosavos: 'tournaments.roundRound64',
  };

  const availableRounds = useMemo(() => {
    if (!selectedTournament?.rondasEliminatorias) return [];
    const maxRoundIdx = ROUND_ORDER.indexOf(selectedTournament.rondasEliminatorias);
    if (maxRoundIdx === -1) return [];
    return ROUND_ORDER.slice(maxRoundIdx).reverse(); // de final a la ronda más lejana del torneo
  }, [selectedTournament]);

  const roundUsesLegs = useMemo(() => {
    if (!selectedTournament || !matchData.ronda) return false;
    const formatoPartido = selectedTournament.formatoPartido || 'unico';
    if (formatoPartido === 'unico') return false;
    if (matchData.ronda === 'final') {
      return (selectedTournament.formatoFinal || 'unico') === 'idayvuelta';
    }
    const idaYvueltaDesde = selectedTournament.idaYvueltaDesde || 'todas';
    if (idaYvueltaDesde === 'todas') return true;
    const roundIdx = ROUND_ORDER.indexOf(matchData.ronda);
    const desdeIdx = ROUND_ORDER.indexOf(idaYvueltaDesde);
    return roundIdx >= desdeIdx;
  }, [selectedTournament, matchData.ronda]);

  const groupUsesLegs = useMemo(() => {
    return torneoFormato === 'grupos+eliminatoria'
      && matchData.fase === 'grupos'
      && (selectedTournament?.formatoGrupos || 'unico') === 'idayvuelta';
  }, [torneoFormato, matchData.fase, selectedTournament]);

  const grupoOptions = useMemo(() => {
    if (!selectedTournament?.numGrupos) return [];
    return Array.from({ length: selectedTournament.numGrupos }, (_, i) => String(i + 1));
  }, [selectedTournament]);

  const jornadaOptions = useMemo(() => {
    if (torneoFormato === 'grupos+eliminatoria' && matchData.fase === 'grupos' && selectedTournament?.equiposPorGrupo) {
      const maxJornada = Math.max(1, selectedTournament.equiposPorGrupo - 1) * (groupUsesLegs ? 2 : 1);
      return Array.from({ length: maxJornada }, (_, i) => String(i + 1));
    }
    return Array.from({ length: 100 }, (_, i) => String(i + 1));
  }, [torneoFormato, matchData.fase, selectedTournament, groupUsesLegs]);

  // Auto-set fase cuando cambia el torneo
  useEffect(() => {
    if (!torneoFormato) return;
    if (torneoFormato === 'liga') {
      setMatchData(prev => ({ ...prev, fase: 'liga', ronda: null, grupo: null, pierna: null }));
    } else if (torneoFormato === 'eliminatoria') {
      setMatchData(prev => ({ ...prev, fase: 'eliminatoria', grupo: null }));
    } else if (torneoFormato === 'grupos+eliminatoria') {
      setMatchData(prev => prev.fase !== 'grupos' && prev.fase !== 'eliminatoria'
        ? { ...prev, fase: 'grupos' } : prev);
    }
  }, [torneoFormato]);

  // Auto-set pierna cuando cambia fase, ronda o formato
  useEffect(() => {
    if (matchData.fase === 'eliminatoria' && matchData.ronda) {
      if (roundUsesLegs) {
        if (!matchData.pierna || matchData.pierna === 'unico') {
          setMatchData(prev => ({ ...prev, pierna: 'ida' }));
        }
      } else if (matchData.pierna !== 'unico') {
        setMatchData(prev => ({ ...prev, pierna: 'unico' }));
      }
    } else if (matchData.fase === 'grupos') {
      if (groupUsesLegs) {
        if (!matchData.pierna || matchData.pierna === 'unico') {
          setMatchData(prev => ({ ...prev, pierna: 'ida' }));
        }
      } else if (matchData.pierna !== 'unico') {
        setMatchData(prev => ({ ...prev, pierna: 'unico' }));
      }
    }
  }, [matchData.ronda, roundUsesLegs, groupUsesLegs, matchData.fase, matchData.pierna]);
  const [showConvocadosModal, setShowConvocadosModal] = useState(false);
  const [showNoConvocadosModal, setShowNoConvocadosModal] = useState(false);
  const [showAlineacionModal, setShowAlineacionModal] = useState(false);
  const [showAlineacionRivalModal, setShowAlineacionRivalModal] = useState(false);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [showGolesModal, setShowGolesModal] = useState(false);
  const [showTarjetasModal, setShowTarjetasModal] = useState(false);
  const [showCambiosModal, setShowCambiosModal] = useState(false);
  const [showGolesRivalModal, setShowGolesRivalModal] = useState(false);

  // Estados para edición de eventos
  const [editingGoalIndex, setEditingGoalIndex] = useState(null);
  const [editingCardIndex, setEditingCardIndex] = useState(null);
  const [editingCardType, setEditingCardType] = useState(null); // 'amarilla' | 'roja'

  const [showTitularesModal, setShowTitularesModal] = useState(false);
  const [showSuplentesModal, setShowSuplentesModal] = useState(false);
  const [showJornadaModal, setShowJornadaModal] = useState(false);
  const [showCompeticionModal, setShowCompeticionModal] = useState(false);
  const [showTorneoModal, setShowTorneoModal] = useState(false);
  const [showRondaModal, setShowRondaModal] = useState(false);
  const [showGrupoModal, setShowGrupoModal] = useState(false);
  
  // Estados para sesión de entrenamiento
  const [sessionData, setSessionData] = useState({
    fecha: new Date(),
    horaInicio: '17:00',
    horaFin: '18:30',
    observaciones: '',
    expectedWellness: null,
  });
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [exerciseObservations, setExerciseObservations] = useState({});
  const [exerciseRestTimes, setExerciseRestTimes] = useState({});
  const [exerciseTeamAssignments, setExerciseTeamAssignments] = useState({});
  const [showTeamAssignmentModal, setShowTeamAssignmentModal] = useState(false);
  const [currentExerciseForTeams, setCurrentExerciseForTeams] = useState(null);
  
  // Estados para ejercicios de fuerza
  const [selectedStrengthExercises, setSelectedStrengthExercises] = useState([]);
  const [strengthExerciseObservations, setStrengthExerciseObservations] = useState({});
  const [strengthExerciseRestTimes, setStrengthExerciseRestTimes] = useState({});
  const [showStrengthExerciseSelectorModal, setShowStrengthExerciseSelectorModal] = useState(false);
  
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [extraPlayers, setExtraPlayers] = useState([]);
  const [extraPlayerText, setExtraPlayerText] = useState('');
  
  const [showSessionDatePicker, setShowSessionDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showExerciseSelectorModal, setShowExerciseSelectorModal] = useState(false);
  const [showPlayerSelectorModal, setShowPlayerSelectorModal] = useState(false);
  
  // Estados para video de ejercicio
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [exerciseForVideo, setExerciseForVideo] = useState(null);
  const [exerciseVideoAvailability, setExerciseVideoAvailability] = useState({});

  // Alineaciones disponibles según cantidad de jugadores del equipo
  const jugadoresPorEquipo = team?.jugadoresPorEquipo || 11;
  const alineacionesDisponibles = ALINEACIONES_BY_PLAYER_COUNT[jugadoresPorEquipo] || ALINEACIONES;

  // Ubicaciones
  const ubicaciones = ['Casa', 'Fuera', 'Neutral'];

  // Verificar si la fecha del partido es pasada
  const isMatchPast = useMemo(() => {
    if (!matchData.fechaHora) return false;
    const matchDate = new Date(matchData.fechaHora);
    const now = new Date();
    return matchDate < now;
  }, [matchData.fechaHora]);

  // Calcular resultado automático (valores internos en español para BD)
  const resultado = useMemo(() => {
    const favor = parseInt(matchData.golesFavor) || 0;
    const contra = parseInt(matchData.golesContra) || 0;
    // Si la fecha es pasada, siempre calculamos resultado (0-0 = Empate)
    if (isMatchPast) {
      if (favor > contra) return 'Victoria';
      if (favor < contra) return 'Derrota';
      return 'Empate';
    }
    // Si la fecha es futura, solo calculamos si hay goles ingresados
    if (matchData.golesFavor === '' && matchData.golesContra === '') return '';
    if (favor > contra) return 'Victoria';
    if (favor < contra) return 'Derrota';
    return 'Empate';
  }, [matchData.golesFavor, matchData.golesContra, isMatchPast]);

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
  
  // Función para ver videos del ejercicio
  const handlePlayExerciseVideo = async (exercise) => {
    setExerciseForVideo(exercise);
    setShowVideoModal(true);
    setIsGeneratingVideo(true);
    
    try {
      const videos = await getVideosByExercise(exercise._id);
      
      if (videos && videos.length > 0) {
        const video = videos[0];
        setSelectedVideo(video);
        const url = await resolvePlayableVideoUrl(video);
        if (url) setVideoUrl(url);
        else { Alert.alert(t('message.info'), t('exercise.noVideos')); setShowVideoModal(false); }
      } else {
        Alert.alert(t('message.info'), t('exercise.noVideos'));
        setShowVideoModal(false);
      }
    } catch (error) {
      console.error('Error cargando videos:', error);
      Alert.alert(t('message.error'), t('exercise.videoPlayError'));
      setShowVideoModal(false);
    } finally {
      setIsGeneratingVideo(false);
    }
  };
  
  const closeVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
    setVideoUrl(null);
    setExerciseForVideo(null);
  };

  // Verificar si ya hay partido en una fecha específica
  const checkMatchOnDate = useCallback((dateToCheck) => {
    if (!dateToCheck) return false;
    const checkDate = new Date(dateToCheck);
    // Usar fecha local en vez de UTC para evitar problemas de zona horaria
    const checkDateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    return matchSheets.some(match => {
      if (!match.fechaHora) return false;
      const matchDate = new Date(match.fechaHora);
      // Usar fecha local en vez de UTC para evitar problemas de zona horaria
      const matchDateStr = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, '0')}-${String(matchDate.getDate()).padStart(2, '0')}`;
      return matchDateStr === checkDateStr;
    });
  }, [matchSheets]);

  // Verificar si ya hay partido en la fecha seleccionada (para el selector inicial)
  const hasMatchOnSelectedDate = useMemo(() => {
    return checkMatchOnDate(selectedDate);
  }, [selectedDate, checkMatchOnDate]);

  // Resetear al abrir
  useEffect(() => {
    if (visible) {
      setEventType(defaultEventType); // Usar defaultEventType si se proporciona
      const date = selectedDate || new Date();
      // Verificar si la fecha es pasada para inicializar goles
      const isPast = date < new Date();
      // Determinar competición por defecto (torneo por defecto o amistoso)
      const defaultTournament = tournaments.find(tt => tt.estado === 'activo' && tt.porDefecto);
      setMatchData({
        rival: '',
        rivalId: null,
        rivalEscudo: null,
        fechaHora: date,
        jornada: '',
        ubicacion: 'local',
        golesFavor: isPast ? '0' : '',
        golesContra: isPast ? '0' : '',
        alineacion: '1-4-4-2',
        alineacionRival: '',
        notasEntrenador: '',
        descuentoPrimerTiempo: '0',
        descuentoSegundoTiempo: '0',
        competicion: defaultTournament ? 'torneo' : 'amistoso',
        torneoId: defaultTournament ? defaultTournament._id : null,
        fase: null,
        ronda: null,
        grupo: null,
        pierna: null,
      });
      setConvocados([]);
      setNoConvocados([]);
      setAlineacionTitulares([]);
      setAlineacionSuplentes([]);
      setGoles([]);
      setTarjetasAmarillas([]);
      setTarjetasRojas([]);
      setCambios([]);
      setJugadoresEnCampo([]);
      setJugadoresExpulsados([]);
      setSessionData({
        fecha: date,
        horaInicio: '17:00',
        horaFin: '18:30',
        observaciones: '',
      });
      setSelectedExercises([]);
      setExerciseObservations({});
      setExerciseRestTimes({});
      setExerciseTeamAssignments({});
      setSelectedPlayers([]);
      setExtraPlayers([]);
      setExtraPlayerText('');
      setExerciseVideoAvailability({});
    }
  }, [visible, selectedDate]);

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

  // Cargar disponibilidad de videos cuando cambian los ejercicios seleccionados
  useEffect(() => {
    const loadVideoAvailability = async () => {
      if (!selectedExercises || selectedExercises.length === 0) return;
      
      const availability = {};
      await Promise.all(
        selectedExercises.map(async (exerciseId) => {
          try {
            const videos = await getVideosByExercise(exerciseId);
            availability[exerciseId] = videos && videos.length > 0;
          } catch (error) {
            availability[exerciseId] = false;
          }
        })
      );
      setExerciseVideoAvailability(prev => ({ ...prev, ...availability }));
    };
    
    if (selectedExercises.length > 0) {
      loadVideoAvailability();
    }
  }, [selectedExercises]);

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return '';
    const locale = currentLang === 'en' ? 'en-US' : 'es-ES';
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
    const locale = currentLang === 'en' ? 'en-US' : 'es-ES';
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper para obtener nombre de jugador
  const getPlayerName = (playerIdOrObj) => {
    const playerId = typeof playerIdOrObj === 'object' && playerIdOrObj ? playerIdOrObj._id : playerIdOrObj;
    const player = players.find(p => p._id === playerId);
    return player ? getPlayerFullName(player) : 'Jugador';
  };

  // Helper para filtrar solo números
  const filterNumeric = (text) => text.replace(/[^0-9]/g, '');

  // Filtrar rivales por búsqueda
  const filteredRivals = useMemo(() => {
    if (!searchRivalText.trim()) return rivals;
    const search = searchRivalText.toLowerCase().trim();
    return rivals.filter(rival => 
      rival.nombre?.toLowerCase().includes(search)
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
      Alert.alert(t('common.error'), t('rivals.nameRequired'));
      return;
    }

    if (!team?._id) {
      Alert.alert(t('common.error'), t('rivals.noTeamSelected'));
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
      Alert.alert(t('common.error'), t('message.noUserIdentified'));
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
      setMatchData(prev => ({
        ...prev,
        rival: result.nombre,
        rivalId: result._id,
        rivalEscudo: result.escudo || null,
      }));
      
      // Cerrar modales y limpiar estados
      setShowCreateRivalModal(false);
      setShowRivalSelector(false);
      setNewRivalName('');
      setNewRivalEscudo('');
      setSearchRivalText('');
      
      Alert.alert(t('common.success'), t('rivals.createSuccess'));
    } catch (error) {
      console.error('Error creating rival:', error);
      Alert.alert(t('common.error'), error.message || t('rivals.saveError'));
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

  // Crear ficha de partido
  const handleCreateMatch = async () => {
    if (!matchData.rival.trim()) {
      Alert.alert(t('message.error'), t('schedule.selectRivalError'));
      return;
    }

    if (matchData.competicion !== 'amistoso' && !matchData.torneoId) {
      Alert.alert(t('message.error'), t('tournaments.tournamentRequired'));
      return;
    }

    setLoading(true);
    try {
      await onCreateMatchSheet({
        rival: matchData.rival,
        rivalId: matchData.rivalId || undefined,
        rivalEscudo: matchData.rivalEscudo || undefined,
        fechaHora: matchData.fechaHora.toISOString(),
        jornada: matchData.jornada ? Number(matchData.jornada) : undefined,
        ubicacion: matchData.ubicacion,
        competicion: matchData.competicion,
        torneoId: matchData.competicion === 'amistoso' ? null : (matchData.torneoId || undefined),
        // Campos adaptativos de torneo
        fase: matchData.competicion === 'amistoso' ? null : matchData.fase,
        ronda: matchData.fase === 'eliminatoria' ? matchData.ronda : null,
        grupo: matchData.fase === 'grupos' ? (matchData.grupo ? Number(matchData.grupo) : null) : null,
        pierna: matchData.fase === 'eliminatoria' || matchData.fase === 'grupos' ? matchData.pierna : null,
        golesFavor: isMatchPast ? Number(matchData.golesFavor || 0) : (matchData.golesFavor !== '' && matchData.golesFavor !== null && matchData.golesFavor !== undefined ? Number(matchData.golesFavor) : null),
        golesContra: isMatchPast ? Number(matchData.golesContra || 0) : (matchData.golesContra !== '' && matchData.golesContra !== null && matchData.golesContra !== undefined ? Number(matchData.golesContra) : null),
        resultado: resultado || undefined,
        alineacion: matchData.alineacion || undefined,
        alineacionRival: matchData.alineacionRival || undefined,
        notasEntrenador: matchData.notasEntrenador || undefined,
        descuentoPrimerTiempo: Number(matchData.descuentoPrimerTiempo) || 0,
        descuentoSegundoTiempo: Number(matchData.descuentoSegundoTiempo) || 0,
        convocados: convocados.length > 0 ? convocados : undefined,
        noConvocados: noConvocados.length > 0 ? noConvocados : undefined,
        alineacionTitulares: alineacionTitulares.length > 0 ? alineacionTitulares : undefined,
        alineacionSuplentes: alineacionSuplentes.length > 0 ? alineacionSuplentes : undefined,
        goles: goles.length > 0 ? goles.map(g => ({
          jugador: typeof g.jugador === 'object' ? g.jugador._id : g.jugador,
          asistente: g.asistente ? (typeof g.asistente === 'object' ? g.asistente._id : g.asistente) : undefined,
          minuto: g.minuto,
          tipo: g.tipo,
        })) : undefined,
        tarjetasAmarillas: tarjetasAmarillas.length > 0 ? tarjetasAmarillas.map(t => ({
          jugador: typeof t.jugador === 'object' ? t.jugador._id : t.jugador,
          minuto: t.minuto,
          motivo: t.motivo,
        })) : undefined,
        tarjetasRojas: tarjetasRojas.length > 0 ? tarjetasRojas.map(t => ({
          jugador: typeof t.jugador === 'object' ? t.jugador._id : t.jugador,
          minuto: t.minuto,
          motivo: t.motivo,
          partidosSancion: (t.motivo === 'Doble amarilla') ? (t.partidosSancion || 1) : Math.max(1, t.partidosSancion || 1),
        })) : undefined,
        cambios: cambios.length > 0 ? cambios : undefined,
        golesRival: golesRival.length > 0 ? golesRival : undefined,
      });
      if (tarjetasRojas.length > 0) {
        console.log('[AddEventModal SAVE] tarjetasRojas:', JSON.stringify(tarjetasRojas.map(t => ({ jugador: t.jugador?._id || t.jugador, partidosSancion: t.partidosSancion }))));
      }
      onClose();
    } catch (error) {
      if (error?.code === 'DUPLICATE_TOURNAMENT_MATCHDAY') {
        Alert.alert(
          t('matchSheet.validation.duplicateMatchday'),
          t('matchSheet.validation.duplicateMatchdayMessage', {
            matchday: matchData.jornada || '',
            rival: error?.rival || '',
          }),
        );
      } else {
        Alert.alert(t('message.error'), t('schedule.createMatchError'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Crear sesión de entrenamiento
  const handleCreateSession = async () => {
    // Validar que la hora de fin no sea anterior a la hora de inicio
    const [startHours, startMinutes] = sessionData.horaInicio.split(':').map(Number);
    const [endHours, endMinutes] = sessionData.horaFin.split(':').map(Number);
    const startTimeInMinutes = startHours * 60 + startMinutes;
    const endTimeInMinutes = endHours * 60 + endMinutes;

    if (endTimeInMinutes < startTimeInMinutes) {
      Alert.alert(t('message.error'), t('schedule.endTimeBeforeStartTime'));
      return;
    }

    setLoading(true);
    try {
      // Preparar ejercicios con observaciones, tiempos de descanso y asignaciones de equipos
      const ejerciciosConDatos = selectedExercises.map(exId => ({
        ejercicio: exId,
        observacion: exerciseObservations[exId] || '',
        tiempoDescanso: exerciseRestTimes[exId] || 0,
        teamAssignments: exerciseTeamAssignments[exId] || [],
      }));

      // Preparar ejercicios de fuerza
      const ejerciciosFuerzaConDatos = selectedStrengthExercises.map((seId, index) => ({
        id: seId,
        orden: index,
        observacion: strengthExerciseObservations[seId] || '',
        tiempoDescanso: strengthExerciseRestTimes[seId] || 0,
      }));

      await onCreateTrainingSession({
        fecha: sessionData.fecha.toISOString(),
        horaInicio: sessionData.horaInicio,
        horaFin: sessionData.horaFin,
        observaciones: sessionData.observaciones || undefined,
        ejercicios: ejerciciosConDatos.length > 0 ? ejerciciosConDatos : [],
        ejerciciosFuerza: ejerciciosFuerzaConDatos.length > 0 ? ejerciciosFuerzaConDatos : [],
        jugadores: selectedPlayers.length > 0 ? selectedPlayers : [],
        jugadoresExtras: extraPlayers.length > 0 ? extraPlayers : [],
        expectedWellness: sessionData.expectedWellness,
      });
      onClose();
    } catch (error) {
      Alert.alert(t('message.error'), t('session.createError'));
    } finally {
      setLoading(false);
    }
  };

  // Handler para cambio de fecha del partido
  const handleMatchDateChange = (event, date) => {
    if (Platform.OS === 'android' || Platform.OS === 'web') {
      setShowMatchDatePicker(false);
    }
    if (date) {
      // Verificar si ya hay partido en la nueva fecha
      if (checkMatchOnDate(date)) {
        Alert.alert(
          t('schedule.dateNotAvailable'),
          t('schedule.matchExistsOnDate'),
          [{ text: t('message.understood'), style: 'default' }]
        );
        return;
      }
      // Usar directamente la fecha seleccionada (ya incluye hora en modo datetime)
      const newDate = new Date(date);
      
      // Verificar si la nueva fecha es pasada para inicializar goles si están vacíos
      const isPast = newDate < new Date();
      setMatchData(prev => ({
        ...prev,
        fechaHora: newDate,
        // Si la fecha es pasada y los goles están vacíos, inicializarlos a '0'
        golesFavor: isPast && prev.golesFavor === '' ? '0' : prev.golesFavor,
        golesContra: isPast && prev.golesContra === '' ? '0' : prev.golesContra,
      }));
    }
  };

  // Handler para cambio de hora del partido
  const handleMatchTimeChange = (event, date) => {
    if (Platform.OS === 'android' || Platform.OS === 'web') {
      setShowMatchTimePicker(false);
    }
    if (date) {
      const newDate = new Date(matchData.fechaHora);
      newDate.setHours(date.getHours(), date.getMinutes());
      
      // Verificar si la nueva fecha/hora es pasada para inicializar goles si están vacíos
      const isPast = newDate < new Date();
      setMatchData(prev => ({
        ...prev,
        fechaHora: newDate,
        // Si la fecha es pasada y los goles están vacíos, inicializarlos a '0'
        golesFavor: isPast && prev.golesFavor === '' ? '0' : prev.golesFavor,
        golesContra: isPast && prev.golesContra === '' ? '0' : prev.golesContra,
      }));
    }
  };

  // Handler para cambio de fecha de sesión
  const handleSessionDateChange = (event, date) => {
    if (Platform.OS === 'android' || Platform.OS === 'web') {
      setShowSessionDatePicker(false);
    }
    if (date) {
      // Verificar si ya hay partido en la nueva fecha
      if (checkMatchOnDate(date)) {
        Alert.alert(
          t('schedule.dateNotAvailable'),
          t('schedule.noTrainingOnMatchDay'),
          [{ text: t('message.understood'), style: 'default' }]
        );
        return;
      }
      setSessionData(prev => ({ ...prev, fecha: date }));
    }
  };

  // Handler para hora de inicio de sesión
  const handleStartTimeChange = (event, date) => {
    if (Platform.OS === 'android' || Platform.OS === 'web') {
      setShowStartTimePicker(false);
    }
    if (date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setSessionData(prev => ({ ...prev, horaInicio: `${hours}:${minutes}` }));
    }
  };

  // Handler para hora de fin de sesión
  const handleEndTimeChange = (event, date) => {
    if (Platform.OS === 'android' || Platform.OS === 'web') {
      setShowEndTimePicker(false);
    }
    if (date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setSessionData(prev => ({ ...prev, horaFin: `${hours}:${minutes}` }));
    }
  };

  // Parsear hora string a Date
  const parseTimeString = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  };

  // Renderizar selector de tipo de evento
  const renderTypeSelector = () => (
    <View style={styles.typeSelector}>
      <Text style={styles.typeSelectorTitle}>{t('schedule.whatToAdd')}</Text>
      
      {/* Advertencia si ya hay partido en la fecha */}
      {hasMatchOnSelectedDate && (
        <View style={styles.matchWarning}>
          <Ionicons name="warning" size={24} color={theme.colors.warning} />
          <Text style={styles.matchWarningText}>
            {t('schedule.matchExistsOnDate')}
          </Text>
        </View>
      )}
      
      <TouchableOpacity
        style={[
          styles.typeOption,
          hasMatchOnSelectedDate && styles.typeOptionDisabled
        ]}
        onPress={() => {
          if (hasMatchOnSelectedDate) {
            Alert.alert(
              t('schedule.notAvailable'),
              t('schedule.matchExistsOnDate'),
              [{ text: t('message.understood'), style: 'default' }]
            );
            return;
          }
          setEventType('match');
        }}
        activeOpacity={hasMatchOnSelectedDate ? 1 : 0.7}
      >
        <View style={[styles.typeOptionIcon, { backgroundColor: theme.colors.primary + '15' }]}>
          <Ionicons name="football" size={32} color={hasMatchOnSelectedDate ? theme.colors.textMuted : theme.colors.primary} />
        </View>
        <View style={styles.typeOptionContent}>
          <Text style={[styles.typeOptionTitle, hasMatchOnSelectedDate && styles.typeOptionTitleDisabled]}>
            {t('schedule.matchSheet')}
          </Text>
          <Text style={styles.typeOptionDescription}>
            {hasMatchOnSelectedDate 
              ? t('schedule.notAvailableMatchDay')
              : t('schedule.matchSheetDesc')}
          </Text>
        </View>
        {hasMatchOnSelectedDate ? (
          <Ionicons name="close-circle" size={24} color={theme.colors.error} />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.typeOption,
          hasMatchOnSelectedDate && styles.typeOptionDisabled
        ]}
        onPress={() => {
          if (hasMatchOnSelectedDate) {
            Alert.alert(
              t('schedule.notAvailable'),
              t('schedule.noTrainingOnMatchDay'),
              [{ text: t('message.understood'), style: 'default' }]
            );
            return;
          }
          setEventType('session');
        }}
        activeOpacity={hasMatchOnSelectedDate ? 1 : 0.7}
      >
        <View style={[styles.typeOptionIcon, { backgroundColor: theme.colors.success + '15' }]}>
          <Ionicons name="fitness" size={32} color={hasMatchOnSelectedDate ? theme.colors.textMuted : theme.colors.success} />
        </View>
        <View style={styles.typeOptionContent}>
          <Text style={[styles.typeOptionTitle, hasMatchOnSelectedDate && styles.typeOptionTitleDisabled]}>
            {t('schedule.trainingSession')}
          </Text>
          <Text style={styles.typeOptionDescription}>
            {hasMatchOnSelectedDate 
              ? t('schedule.notAvailableMatchDay')
              : t('schedule.trainingSessionDesc')}
          </Text>
        </View>
        {hasMatchOnSelectedDate ? (
          <Ionicons name="close-circle" size={24} color={theme.colors.error} />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
        )}
      </TouchableOpacity>
    </View>
  );

  // Renderizar formulario de partido - Estructura idéntica a matchSheetList
  const renderMatchForm = () => (
    <>
    <KeyboardAwareScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.formHeader}>
        {!defaultEventType && (
          <TouchableOpacity onPress={() => setEventType(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.formTitle}>{t('schedule.newMatchSheet')}</Text>
      </View>

      {/* Card de Datos del Partido */}
      <View style={styles.createCard}>
        <View style={styles.createCardHeader}>
          <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
          <Text style={styles.createCardTitle}>{t('matchSheet.sections.matchData')}</Text>
        </View>

        <View style={styles.createCardContent}>
          {/* Fila de escudos - orden según ubicación */}
          <View style={styles.escudosRow}>
            {/* Primer escudo - mi equipo si local, rival si visitante */}
            <View style={styles.escudoContainer}>
              <Text style={styles.escudoLabel}>
                {matchData.ubicacion === 'visitante' 
                  ? t('matchSheet.fields.rivalShield') 
                  : t('matchSheet.fields.myTeamShield')}
              </Text>
              <View style={styles.escudoButton}>
                {matchData.ubicacion === 'visitante' ? (
                  matchData.rivalEscudo ? (
                    <Image source={{ uri: matchData.rivalEscudo }} style={styles.escudoImage} />
                  ) : (
                    <View style={styles.escudoPlaceholder}>
                      <Ionicons name="shield-outline" size={32} color={theme.colors.textMuted} />
                      <Text style={styles.escudoPlaceholderText}>{matchData.rival || t('matchSheet.fields.selectRival')}</Text>
                    </View>
                  )
                ) : (
                  team?.escudo ? (
                    <Image source={{ uri: team.escudo }} style={styles.escudoImage} />
                  ) : (
                    <View style={styles.escudoPlaceholder}>
                      <Ionicons name="shield-outline" size={32} color={theme.colors.textMuted} />
                      <Text style={styles.escudoPlaceholderText}>{team?.nombre || ''}</Text>
                    </View>
                  )
                )}
              </View>
            </View>

            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            {/* Segundo escudo - rival si local, mi equipo si visitante */}
            <View style={styles.escudoContainer}>
              <Text style={styles.escudoLabel}>
                {matchData.ubicacion === 'visitante' 
                  ? t('matchSheet.fields.myTeamShield') 
                  : t('matchSheet.fields.rivalShield')}
              </Text>
              <View style={styles.escudoButton}>
                {matchData.ubicacion === 'visitante' ? (
                  team?.escudo ? (
                    <Image source={{ uri: team.escudo }} style={styles.escudoImage} />
                  ) : (
                    <View style={styles.escudoPlaceholder}>
                      <Ionicons name="shield-outline" size={32} color={theme.colors.textMuted} />
                      <Text style={styles.escudoPlaceholderText}>{team?.nombre || ''}</Text>
                    </View>
                  )
                ) : (
                  matchData.rivalEscudo ? (
                    <Image source={{ uri: matchData.rivalEscudo }} style={styles.escudoImage} />
                  ) : (
                    <View style={styles.escudoPlaceholder}>
                      <Ionicons name="shield-outline" size={32} color={theme.colors.textMuted} />
                      <Text style={styles.escudoPlaceholderText}>{matchData.rival || t('matchSheet.fields.selectRival')}</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          </View>

          {/* Selector de rival */}
          <RivalSelector
            selectedRivalId={matchData.rivalId}
            selectedRivalName={matchData.rival}
            onSelectRival={(id, nombre, escudo) => {
              setMatchData(prev => ({
                ...prev,
                rivalId: id,
                rival: nombre,
                rivalEscudo: escudo,
              }));
            }}
            teamId={team?._id}
            placeholder={t('matchSheet.fields.rivalRequired')}
          />

          {/* Ubicación - dropdown */}
          <TouchableOpacity 
            style={styles.selector} 
            onPress={() => setShowUbicacionModal(true)}
          >
            <Text style={[styles.selectorText, matchData.ubicacion && styles.selectorTextSelected]}>
              {matchData.ubicacion === 'local' ? t('matchSheet.modals.home') : 
               matchData.ubicacion === 'visitante' ? t('matchSheet.modals.away') : 
               matchData.ubicacion === 'neutral' ? t('matchSheet.modals.neutral') : 
               t('matchSheet.modals.selectLocation')}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Competición */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6 }}>{t('matchSheet.competition')} *</Text>
            <TouchableOpacity 
              style={styles.selector} 
              onPress={() => setShowTorneoModal(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons 
                  name={matchData.competicion === 'amistoso' ? 'sports-soccer' : 'emoji-events'} 
                  size={20} 
                  color={matchData.competicion === 'amistoso' ? '#10b981' : '#8B5CF6'} 
                />
                <Text style={[styles.selectorText, styles.selectorTextSelected]}>
                  {matchData.competicion === 'amistoso'
                    ? (t('matchSheet.friendly') || 'Amistoso')
                    : (tournaments.find(tr => tr._id === matchData.torneoId)?.nombre || t('tournaments.selectTournament'))}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Alineaciones en fila */}
          <View style={styles.row}>
            <TouchableOpacity 
              style={[styles.selector, styles.inputHalf]} 
              onPress={() => setShowAlineacionModal(true)}
            >
              <Text style={[styles.selectorText, matchData.alineacion && styles.selectorTextSelected]}>
                {matchData.alineacion || t('matchSheet.modals.selectFormation')}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.selector, styles.inputHalf]} 
              onPress={() => setShowAlineacionRivalModal(true)}
            >
              <Text style={[styles.selectorText, matchData.alineacionRival && styles.selectorTextSelected]}>
                {matchData.alineacionRival || t('matchSheet.modals.selectRivalFormation')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* ─── Campos adaptativos según formato de torneo ─── */}
          {matchData.competicion !== 'amistoso' && torneoFormato && (
            <>
              {/* Fase selector: solo para grupos+eliminatoria */}
              {torneoFormato === 'grupos+eliminatoria' && (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TouchableOpacity
                    style={[styles.selector, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                      matchData.fase === 'grupos' && { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }]}
                    onPress={() => setMatchData(prev => ({ ...prev, fase: 'grupos', ronda: null, pierna: null }))}
                  >
                    <Text style={[styles.selectorTextSelected, matchData.fase === 'grupos' && { color: '#8B5CF6', fontWeight: 'bold' }]}>
                      {t('matchSheet.fields.groupPhase')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.selector, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                      matchData.fase === 'eliminatoria' && { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }]}
                    onPress={() => setMatchData(prev => ({ ...prev, fase: 'eliminatoria', grupo: null, jornada: '' }))}
                  >
                    <Text style={[styles.selectorTextSelected, matchData.fase === 'eliminatoria' && { color: '#8B5CF6', fontWeight: 'bold' }]}>
                      {t('matchSheet.fields.knockoutPhase')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Grupo selector: solo en fase de grupos */}
              {matchData.fase === 'grupos' && torneoFormato === 'grupos+eliminatoria' && (
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowGrupoModal(true)}
                >
                  <Text style={[styles.selectorText, matchData.grupo && styles.selectorTextSelected]}>
                    {matchData.grupo ? t('matchSheet.fields.groupN', { n: matchData.grupo }) : t('matchSheet.fields.selectGroup')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              )}

              {/* Jornada: para liga o fase de grupos */}
              {(torneoFormato === 'liga' || (torneoFormato === 'grupos+eliminatoria' && matchData.fase === 'grupos')) && (
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowJornadaModal(true)}
                >
                  <Text style={[styles.selectorText, matchData.jornada && styles.selectorTextSelected]}>
                    {matchData.jornada
                      ? `${torneoFormato === 'liga' ? t('matchSheet.fields.matchday') : t('matchSheet.fields.matchdayInGroup')} ${matchData.jornada}`
                      : t('matchSheet.fields.selectMatchday')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              )}

              {matchData.fase === 'grupos' && torneoFormato === 'grupos+eliminatoria' && (
                <>
                  {groupUsesLegs ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      <TouchableOpacity
                        style={[styles.selector, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                          matchData.pierna === 'ida' && { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }]}
                        onPress={() => setMatchData(prev => ({ ...prev, pierna: 'ida' }))}
                      >
                        <Text style={[styles.selectorTextSelected, matchData.pierna === 'ida' && { color: '#8B5CF6', fontWeight: 'bold' }]}>
                          {t('matchSheet.fields.legFirst')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.selector, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                          matchData.pierna === 'vuelta' && { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }]}
                        onPress={() => setMatchData(prev => ({ ...prev, pierna: 'vuelta' }))}
                      >
                        <Text style={[styles.selectorTextSelected, matchData.pierna === 'vuelta' && { color: '#8B5CF6', fontWeight: 'bold' }]}>
                          {t('matchSheet.fields.legSecond')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.selector, { backgroundColor: theme.colors.backgroundAlt }]}>
                      <Text style={styles.selectorTextSelected}>{t('matchSheet.fields.legSingle')}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Ronda: para eliminatoria */}
              {matchData.fase === 'eliminatoria' && (torneoFormato === 'eliminatoria' || torneoFormato === 'grupos+eliminatoria') && (
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowRondaModal(true)}
                >
                  <Text style={[styles.selectorText, matchData.ronda && styles.selectorTextSelected]}>
                    {matchData.ronda ? t(ROUND_KEYS[matchData.ronda] || matchData.ronda) : t('matchSheet.fields.selectRound')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              )}

              {/* Pierna (ida/vuelta): para eliminatoria cuando la ronda lo requiere */}
              {matchData.fase === 'eliminatoria' && matchData.ronda && (
                <>
                  {roundUsesLegs ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      <TouchableOpacity
                        style={[styles.selector, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                          matchData.pierna === 'ida' && { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }]}
                        onPress={() => setMatchData(prev => ({ ...prev, pierna: 'ida' }))}
                      >
                        <Text style={[styles.selectorTextSelected, matchData.pierna === 'ida' && { color: '#8B5CF6', fontWeight: 'bold' }]}>
                          {t('matchSheet.fields.legFirst')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.selector, { flex: 1, justifyContent: 'center', alignItems: 'center' },
                          matchData.pierna === 'vuelta' && { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }]}
                        onPress={() => setMatchData(prev => ({ ...prev, pierna: 'vuelta' }))}
                      >
                        <Text style={[styles.selectorTextSelected, matchData.pierna === 'vuelta' && { color: '#8B5CF6', fontWeight: 'bold' }]}>
                          {t('matchSheet.fields.legSecond')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.selector, { backgroundColor: theme.colors.backgroundAlt }]}>
                      <Text style={styles.selectorTextSelected}>{t('matchSheet.fields.legSingle')}</Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {/* Fecha y hora combinados */}
          <TouchableOpacity 
            style={styles.selector} 
            onPress={() => setShowMatchDatePicker(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={[styles.selectorText, styles.selectorTextSelected]}>
                {matchData.fechaHora.toLocaleDateString('es-ES', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          <Text style={styles.subTitle}>{t('matchSheet.fields.result')}</Text>

          {/* Goles - según ubicación */}
          <View style={styles.row}>
            <View style={[styles.inputHalf]}>
              <Text style={styles.inputLabel}>
                {matchData.ubicacion === 'visitante' ? t('matchSheet.fields.goalsAgainst') : t('matchSheet.fields.goalsFor')}
              </Text>
              <View style={styles.descuentoSelector}>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => {
                    if (matchData.ubicacion === 'visitante') {
                      setMatchData(prev => ({ ...prev, golesContra: String(Math.max(0, Number(prev.golesContra) - 1)) }));
                    } else {
                      setMatchData(prev => ({ ...prev, golesFavor: String(Math.max(0, Number(prev.golesFavor) - 1)) }));
                    }
                  }}
                >
                  <Ionicons name="remove" size={20} color="#666" />
                </TouchableOpacity>
                <Text style={styles.descuentoValue}>
                  {matchData.ubicacion === 'visitante' ? (matchData.golesContra || '0') : (matchData.golesFavor || '0')}
                </Text>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => {
                    if (matchData.ubicacion === 'visitante') {
                      setMatchData(prev => ({ ...prev, golesContra: String(Math.min(99, Number(prev.golesContra || 0) + 1)) }));
                    } else {
                      setMatchData(prev => ({ ...prev, golesFavor: String(Math.min(99, Number(prev.golesFavor || 0) + 1)) }));
                    }
                  }}
                >
                  <Ionicons name="add" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.inputHalf]}>
              <Text style={styles.inputLabel}>
                {matchData.ubicacion === 'visitante' ? t('matchSheet.fields.goalsFor') : t('matchSheet.fields.goalsAgainst')}
              </Text>
              <View style={styles.descuentoSelector}>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => {
                    if (matchData.ubicacion === 'visitante') {
                      setMatchData(prev => ({ ...prev, golesFavor: String(Math.max(0, Number(prev.golesFavor) - 1)) }));
                    } else {
                      setMatchData(prev => ({ ...prev, golesContra: String(Math.max(0, Number(prev.golesContra) - 1)) }));
                    }
                  }}
                >
                  <Ionicons name="remove" size={20} color="#666" />
                </TouchableOpacity>
                <Text style={styles.descuentoValue}>
                  {matchData.ubicacion === 'visitante' ? (matchData.golesFavor || '0') : (matchData.golesContra || '0')}
                </Text>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => {
                    if (matchData.ubicacion === 'visitante') {
                      setMatchData(prev => ({ ...prev, golesFavor: String(Math.min(99, Number(prev.golesFavor || 0) + 1)) }));
                    } else {
                      setMatchData(prev => ({ ...prev, golesContra: String(Math.min(99, Number(prev.golesContra || 0) + 1)) }));
                    }
                  }}
                >
                  <Ionicons name="add" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {resultado && (
            <View style={styles.resultadoDisplay}>
              <Text style={styles.resultadoLabel}>{t('matchSheet.fields.result')}:</Text>
              <View style={[
                styles.resultadoBadge, 
                resultado === 'Victoria' && { backgroundColor: '#4CAF50' },
                resultado === 'Empate' && { backgroundColor: '#FF9800' },
                resultado === 'Derrota' && { backgroundColor: '#F44336' },
              ]}>
                <Text style={styles.resultadoText}>{translateResult(resultado)}</Text>
              </View>
            </View>
          )}

          <Text style={styles.subTitle}>{t('matchSheet.addedTime.title')}</Text>

          <View style={styles.row}>
            <View style={[styles.inputHalf]}>
              <Text style={styles.inputLabel}>{t('matchSheet.addedTime.firstHalfMin')}</Text>
              <View style={styles.descuentoSelector}>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => setMatchData(prev => ({ 
                    ...prev, 
                    descuentoPrimerTiempo: String(Math.max(0, Number(prev.descuentoPrimerTiempo) - 1))
                  }))}
                >
                  <Ionicons name="remove" size={20} color="#666" />
                </TouchableOpacity>
                <Text style={styles.descuentoValue}>{matchData.descuentoPrimerTiempo}</Text>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => setMatchData(prev => ({ 
                    ...prev, 
                    descuentoPrimerTiempo: String(Math.min(15, Number(prev.descuentoPrimerTiempo) + 1))
                  }))}
                >
                  <Ionicons name="add" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.inputHalf]}>
              <Text style={styles.inputLabel}>{t('matchSheet.addedTime.secondHalfMin')}</Text>
              <View style={styles.descuentoSelector}>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => setMatchData(prev => ({ 
                    ...prev, 
                    descuentoSegundoTiempo: String(Math.max(0, Number(prev.descuentoSegundoTiempo) - 1))
                  }))}
                >
                  <Ionicons name="remove" size={20} color="#666" />
                </TouchableOpacity>
                <Text style={styles.descuentoValue}>{matchData.descuentoSegundoTiempo}</Text>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => setMatchData(prev => ({ 
                    ...prev, 
                    descuentoSegundoTiempo: String(Math.min(15, Number(prev.descuentoSegundoTiempo) + 1))
                  }))}
                >
                  <Ionicons name="add" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={styles.descuentoHint}>
            {t('matchSheet.addedTime.totalDuration', { minutes: (team?.tiempoPorParte || 45) * 2 + Number(matchData.descuentoPrimerTiempo || 0) + Number(matchData.descuentoSegundoTiempo || 0) })}
          </Text>
        </View>
      </View>

      {/* Card de Convocatoria y Alineación */}
      <View style={styles.createCard}>
        <View style={styles.createCardHeader}>
          <Ionicons name="people" size={24} color={theme.colors.primary} />
          <Text style={styles.createCardTitle}>{t('matchSheet.sections.callupAndLineup')}</Text>
        </View>

        <View style={styles.createCardContent}>
          {/* Convocados */}
          <TouchableOpacity 
            style={styles.playerSelector} 
            onPress={() => setShowConvocadosModal(true)}
          >
            <View style={styles.playerSelectorLeft}>
              <Ionicons name="people" size={20} color="#4CAF50" />
              <Text style={styles.playerSelectorText}>{t('matchSheet.fields.called')} ({convocados.length})</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          {convocados.length > 0 && (
            <View style={styles.selectedChips}>
              {convocados.map(id => (
                <View key={id} style={styles.calledChip}>
                  <Text style={styles.calledChipText}>{getPlayerName(id)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* No Convocados */}
          <TouchableOpacity 
            style={styles.playerSelector} 
            onPress={() => setShowNoConvocadosModal(true)}
          >
            <View style={styles.playerSelectorLeft}>
              <Ionicons name="close-circle" size={20} color="#F44336" />
              <Text style={styles.playerSelectorText}>{t('matchSheet.fields.notCalled')} ({noConvocados.length})</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          {noConvocados.length > 0 && (
            <View style={styles.selectedChips}>
              {noConvocados.map(id => (
                <View key={id} style={styles.notCalledChip}>
                  <Text style={styles.notCalledChipText}>{getPlayerName(id)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Editor visual de alineación */}
          {convocados.length > 0 && (
            <LineupEditor
              players={players}
              convocados={convocados}
              titulares={alineacionTitulares}
              suplentes={alineacionSuplentes}
              formation={matchData.alineacion || '1-4-4-2'}
              onTitularesChange={setAlineacionTitulares}
              onSuplentesChange={setAlineacionSuplentes}
              jugadoresPorEquipo={jugadoresPorEquipo}
              containerWidth={width - 112}
            />
          )}

          {/* Listado de Titulares */}
          {alineacionTitulares && Object.values(alineacionTitulares).filter(Boolean).length > 0 && (
            <View style={styles.startersSubsContainer}>
              <View style={styles.startersSubsHeader}>
                <Ionicons name="football" size={18} color="#4CAF50" />
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
                      <View style={[styles.starterSubDorsal, { backgroundColor: '#4CAF50' }]}> 
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
                <Ionicons name="swap-horizontal" size={18} color="#9C27B0" />
                <Text style={styles.startersSubsTitle}>
                  {t('matchSheet.fields.substitutes')} ({alineacionSuplentes.length})
                </Text>
              </View>
              <View style={styles.startersSubsList}>
                {alineacionSuplentes.map((playerId) => {
                  const player = players.find(p => p._id === playerId);
                  if (!player) return null;
                  return (
                    <View key={playerId} style={[styles.starterSubChip, { borderLeftColor: '#9C27B0' }]}> 
                      <View style={[styles.starterSubDorsal, { backgroundColor: '#9C27B0' }]}> 
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
              <Ionicons name="information-circle-outline" size={24} color="#999" />
              <Text style={styles.emptyLineupText}>
                {t('matchSheet.emptyLineupHint')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Card de Notas del Entrenador */}
      <View style={styles.createCard}>
        <View style={styles.createCardHeader}>
          <Ionicons name="document-text" size={24} color={theme.colors.primary} />
          <Text style={styles.createCardTitle}>{t('matchSheet.sections.coachNotes')}</Text>
        </View>

        <View style={styles.createCardContent}>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={matchData.notasEntrenador}
            onChangeText={(text) => setMatchData(prev => ({ ...prev, notasEntrenador: text }))}
            placeholder={t('matchSheet.fields.notesPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Card de Eventos del Partido */}
      <View style={styles.createCard}>
        <View style={styles.createCardHeader}>
          <Ionicons name="flash" size={24} color={theme.colors.primary} />
          <Text style={styles.createCardTitle}>{t('matchSheet.sections.matchEvents')}</Text>
        </View>

        <View style={styles.createCardContent}>
          {/* Goles */}
          <TouchableOpacity 
            style={styles.eventSelector} 
            onPress={() => setShowGolesModal(true)}
          >
            <View style={styles.eventSelectorHeader}>
              <Ionicons name="football" size={20} color="#4CAF50" />
              <Text style={styles.eventSelectorTitle}>{t('matchSheet.fields.goals')} ({goles.length})</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {goles.length > 0 && (
            <View style={styles.eventsList}>
              {[...goles].sort((a, b) => {
                const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                return minA - minB;
              }).map((gol) => {
                const originalIdx = goles.indexOf(gol);
                return (
                <View key={originalIdx} style={styles.eventChip}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                    setEditingGoalIndex(originalIdx);
                    setShowGolesModal(true);
                  }}>
                    <Text style={styles.eventChipText}>
                      {gol.minuto}' - {getPlayerName(gol.jugador)} {gol.tipo ? `(${gol.tipo})` : ''}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setGoles(goles.filter((_, i) => i !== originalIdx))}>
                    <Ionicons name="close-circle" size={16} color="#666" />
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
              <Ionicons name="square" size={20} color="#FFC107" />
              <Text style={styles.eventSelectorTitle}>{t('matchSheet.fields.cards')} ({tarjetasAmarillas.length + tarjetasRojas.length})</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
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
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                    setEditingCardIndex(originalIdx);
                    setEditingCardType('amarilla');
                    setShowTarjetasModal(true);
                  }}>
                    <Text style={styles.eventChipText}>
                      {tarjeta.minuto}' - {getPlayerName(tarjeta.jugador)}{tarjeta.motivo ? ` (${tarjeta.motivo})` : ''}
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
                    <Ionicons name="close-circle" size={16} color="#666" />
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
                  <View style={[styles.cardIndicator, { backgroundColor: '#F44336' }]} />
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                    if (!isAutoDobleAmarilla) {
                      setEditingCardIndex(originalIdx);
                      setEditingCardType('roja');
                      setShowTarjetasModal(true);
                    }
                  }}>
                    <Text style={styles.eventChipText}>
                      {tarjeta.minuto}' - {getPlayerName(tarjeta.jugador)}{isAutoDobleAmarilla ? ` (${t('matchSheet.cardTypes.doubleYellow') || 'Doble amarilla'})` : ''}{tarjeta.partidosSancion > 0 ? ` [${tarjeta.partidosSancion}${t('matchSheet.modals.banMatchesShort')}]` : ''}
                    </Text>
                  </TouchableOpacity>
                  {!isAutoDobleAmarilla && (
                  <TouchableOpacity onPress={() => setTarjetasRojas(tarjetasRojas.filter((_, i) => i !== originalIdx))}>
                    <Ionicons name="close-circle" size={16} color="#666" />
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
              <Ionicons name="swap-horizontal" size={20} color="#9C27B0" />
              <Text style={styles.eventSelectorTitle}>{t('matchSheet.fields.changes')} ({cambios.length})</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
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
                    <Text style={styles.eventChipText}>
                      {cambio.minuto}' - {getPlayerName(cambio.sale)} → {getPlayerName(cambio.entra)}
                    </Text>
                    <TouchableOpacity onPress={() => setCambios(cambios.filter((_, i) => i !== originalIndex))}>
                      <Ionicons name="close-circle" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Goles del Rival */}
          <TouchableOpacity 
            style={[styles.eventSelector, { borderLeftWidth: 3, borderLeftColor: '#F44336' }]} 
            onPress={() => setShowGolesRivalModal(true)}
          >
            <View style={styles.eventSelectorHeader}>
              <View style={{ backgroundColor: '#fee2e2', borderRadius: 16, padding: 4 }}>
                <Ionicons name="football" size={20} color="#F44336" />
              </View>
              <Text style={[styles.eventSelectorTitle, { color: '#dc2626' }]}>{t('matchSheet.rivalGoals.title')} ({golesRival.length})</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
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
                  <View key={originalIndex} style={[styles.eventChip, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                    <Text style={[styles.eventChipText, { color: '#dc2626' }]}>
                      {gol.minuto}' - {matchData.rival || t('matchSheet.rivalGoals.title')}
                    </Text>
                    <TouchableOpacity onPress={() => setGolesRival(golesRival.filter((_, i) => i !== originalIndex))}>
                      <Ionicons name="close-circle" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

    </KeyboardAwareScrollView>
      {/* Botones */}
      <View style={styles.footerButtonRow}>
        <TouchableOpacity
          style={styles.footerCancelBtn}
          onPress={onClose}
        >
          <Text style={styles.footerCancelBtnText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerSaveBtn, loading && styles.footerSaveBtnDisabled]}
          onPress={handleCreateMatch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.footerSaveBtnText}>{t('schedule.createMatchSheet')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Pickers */}
      {Platform.OS === 'ios' ? (
        <>
          {/* iOS: Modal para Date Picker */}
          <Modal
            visible={showMatchDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowMatchDatePicker(false)}
          >
            <View style={styles.datePickerModalBg}>
              <View style={[styles.datePickerModalContent, { paddingBottom: Math.max(insets.bottom, 30) }]}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowMatchDatePicker(false)}>
                    <Text style={styles.datePickerCancel}>{t('schedule.cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>{t('schedule.selectDateTime')}</Text>
                  <TouchableOpacity onPress={() => setShowMatchDatePicker(false)}>
                    <Text style={styles.datePickerDone}>{t('schedule.done')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={matchData.fechaHora}
                  mode="datetime"
                  display="spinner"
                  onChange={handleMatchDateChange}
                  style={{ height: 200 }}
                  textColor="#000000"
                />
              </View>
            </View>
          </Modal>

          {/* iOS: Modal para Time Picker */}
          <Modal
            visible={showMatchTimePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowMatchTimePicker(false)}
          >
            <View style={styles.datePickerModalBg}>
              <View style={[styles.datePickerModalContent, { paddingBottom: Math.max(insets.bottom, 30) }]}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowMatchTimePicker(false)}>
                    <Text style={styles.datePickerCancel}>{t('schedule.cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>{t('schedule.selectTime')}</Text>
                  <TouchableOpacity onPress={() => setShowMatchTimePicker(false)}>
                    <Text style={styles.datePickerDone}>{t('schedule.done')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={matchData.fechaHora}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={handleMatchTimeChange}
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
          {showMatchDatePicker && (
            <DateTimePicker
              value={matchData.fechaHora}
              mode="datetime"
              display="default"
              onChange={handleMatchDateChange}
            />
          )}
          {showMatchTimePicker && (
            <DateTimePicker
              value={matchData.fechaHora}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleMatchTimeChange}
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
            <View style={styles.selectorModalHeader}>
              <Text style={styles.selectorModalTitle}>{t('schedule.selectRivalTitle')}</Text>
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
                  {!searchRivalText && (
                    <Text style={styles.emptyRivalsSubtext}>
                      {t('schedule.addRivalsHint')}
                    </Text>
                  )}
                </View>
              ) : (
                filteredRivals.map((rival, index) => (
                  <TouchableOpacity
                    key={rival._id || index}
                    style={[
                      styles.selectorItem,
                      matchData.rival === rival.nombre && styles.selectorItemActive,
                    ]}
                    onPress={() => {
                      setMatchData(prev => ({ 
                        ...prev, 
                        rival: rival.nombre,
                        rivalId: rival._id,
                        rivalEscudo: rival.escudo || null,
                      }));
                      setShowRivalSelector(false);
                      setSearchRivalText('');
                    }}
                  >
                    {rival.escudo ? (
                      <Image 
                        source={{ uri: rival.escudo }} 
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
                      matchData.rival === rival.nombre && styles.selectorItemTextActive,
                      { flex: 1 }
                    ]}>
                      {rival.nombre}
                    </Text>
                    {matchData.rival === rival.nombre && (
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
                    setMatchData(prev => ({
                      ...prev,
                      rival: searchRivalText.trim(),
                      rivalId: null,
                      rivalEscudo: null,
                    }));
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
                <MaterialIcons name="add" size={20} color="#fff" />
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
            <View style={styles.selectorModalHeader}>
              <Text style={styles.selectorModalTitle}>{t('rivals.createRival')}</Text>
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
                    <Text style={styles.escudoPlaceholderText}>{t('rivals.addShield')}</Text>
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
                onPress={handleCreateRival}
                disabled={savingRival}
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

      {/* Modal de Convocados */}
      <PlayerSelectionModal
        visible={showConvocadosModal}
        onClose={() => setShowConvocadosModal(false)}
        title={t('schedule.selectCalled')}
        players={players}
        selectedIds={convocados}
        excludeIds={noConvocados}
        injuries={injuries}
        sanctionedPlayerIds={sanctionedPlayerIds}
        onConfirm={(ids) => {
          setConvocados(ids);
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
        players={players}
        selectedIds={noConvocados}
        excludeIds={convocados}
        injuries={injuries}
        sanctionedPlayerIds={sanctionedPlayerIds}
        onConfirm={(ids) => {
          setNoConvocados(ids);
          setShowNoConvocadosModal(false);
        }}
      />

      {/* Modal de Titulares */}
      <PlayerSelectionModal
        visible={showTitularesModal}
        onClose={() => setShowTitularesModal(false)}
        title={t('schedule.selectStarters')}
        players={players.filter(p => convocados.includes(p._id) && !alineacionSuplentes.includes(p._id))}
        selectedIds={alineacionTitulares}
        injuries={injuries}
        maxSelection={jugadoresPorEquipo}
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
        players={players.filter(p => convocados.includes(p._id) && !alineacionTitulares.includes(p._id))}
        selectedIds={alineacionSuplentes}
        injuries={injuries}
        onConfirm={(ids) => {
          setAlineacionSuplentes(ids);
          setShowSuplentesModal(false);
        }}
      />

      {/* Modal de Ubicación */}
      <OptionSelectorModal
        visible={showUbicacionModal}
        onClose={() => setShowUbicacionModal(false)}
        title={t('matchSheet.modals.selectLocation')}
        options={[
          { value: 'local', label: t('matchSheet.modals.home') },
          { value: 'visitante', label: t('matchSheet.modals.away') },
          { value: 'neutral', label: t('matchSheet.modals.neutral') },
        ].map(o => o.label)}
        selectedOption={
          matchData.ubicacion === 'local' ? t('matchSheet.modals.home') : 
          matchData.ubicacion === 'visitante' ? t('matchSheet.modals.away') : 
          matchData.ubicacion === 'neutral' ? t('matchSheet.modals.neutral') : ''
        }
        onSelect={(option) => {
          const ubicacionMap = {
            [t('matchSheet.modals.home')]: 'local',
            [t('matchSheet.modals.away')]: 'visitante',
            [t('matchSheet.modals.neutral')]: 'neutral',
          };
          setMatchData(prev => ({ ...prev, ubicacion: ubicacionMap[option] || 'local' }));
          setShowUbicacionModal(false);
        }}
      />

      {/* Modal de Competición / Torneo */}
      <Modal
        visible={showTorneoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTorneoModal(false)}
      >
        <Pressable style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowTorneoModal(false)}>
          <Pressable style={{ backgroundColor: theme.colors.surface, borderRadius: 16, width: '85%', maxWidth: 400, maxHeight: '60%', overflow: 'hidden' }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>{t('matchSheet.competition')}</Text>
              <TouchableOpacity onPress={() => setShowTorneoModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 8 }}>
              {/* Opción Amistoso */}
              <TouchableOpacity
                style={[{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  padding: 14, borderRadius: 10, marginBottom: 4,
                }, matchData.competicion === 'amistoso' && { backgroundColor: theme.colors.success + '15' }]}
                onPress={() => {
                  setMatchData(prev => ({ ...prev, competicion: 'amistoso', torneoId: null }));
                  setShowTorneoModal(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.success, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="sports-soccer" size={14} color="#fff" />
                  </View>
                  <Text style={[{ fontSize: 15, color: theme.colors.textSecondary }, matchData.competicion === 'amistoso' && { color: theme.colors.text, fontWeight: '600' }]}>
                    {t('matchSheet.friendly') || 'Amistoso'}
                  </Text>
                </View>
                {matchData.competicion === 'amistoso' && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.success} />
                )}
              </TouchableOpacity>

              {/* Torneos activos */}
              {tournaments.filter(tr => tr.estado === 'activo').map((torneo) => (
                <TouchableOpacity
                  key={torneo._id}
                  style={[{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    padding: 14, borderRadius: 10, marginBottom: 4,
                  }, matchData.torneoId === torneo._id && matchData.competicion !== 'amistoso' && { backgroundColor: '#8B5CF615' }]}
                  onPress={() => {
                    setMatchData(prev => ({ ...prev, competicion: 'torneo', torneoId: torneo._id }));
                    setShowTorneoModal(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: torneo.color || '#8B5CF6', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="emoji-events" size={14} color="#fff" />
                    </View>
                    <Text style={[{ fontSize: 15, color: theme.colors.textSecondary }, matchData.torneoId === torneo._id && matchData.competicion !== 'amistoso' && { color: theme.colors.text, fontWeight: '600' }]}>
                      {torneo.nombre}
                    </Text>
                    {torneo.porDefecto && (
                      <View style={{ backgroundColor: theme.colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: '600' }}>{t('tournaments.defaultBadge') || 'Por defecto'}</Text>
                      </View>
                    )}
                  </View>
                  {matchData.torneoId === torneo._id && matchData.competicion !== 'amistoso' && (
                    <Ionicons name="checkmark" size={20} color="#8B5CF6" />
                  )}
                </TouchableOpacity>
              ))}
              {tournaments.filter(tr => tr.estado === 'activo').length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
                    {t('tournaments.noActiveTournaments')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de Jornada */}
      <OptionModal
        visible={showJornadaModal}
        onClose={() => setShowJornadaModal(false)}
        options={jornadaOptions}
        selectedOption={matchData.jornada}
        setSelectedOption={(option) => setMatchData(prev => ({ ...prev, jornada: option }))}
        title={t('matchSheet.fields.selectMatchday')}
      />

      {/* Modal de Ronda (eliminatoria) */}
      <OptionModal
        visible={showRondaModal}
        onClose={() => setShowRondaModal(false)}
        options={availableRounds}
        selectedOption={matchData.ronda}
        setSelectedOption={(option) => setMatchData(prev => ({ ...prev, ronda: option }))}
        title={t('matchSheet.fields.selectRound')}
        renderLabel={(option) => t(ROUND_KEYS[option] || option)}
      />

      {/* Modal de Grupo */}
      <OptionModal
        visible={showGrupoModal}
        onClose={() => setShowGrupoModal(false)}
        options={grupoOptions}
        selectedOption={matchData.grupo}
        setSelectedOption={(option) => setMatchData(prev => ({ ...prev, grupo: option }))}
        title={t('matchSheet.fields.selectGroup')}
        renderLabel={(option) => t('matchSheet.fields.groupN', { n: option })}
      />

      {/* Modal de Alineación */}
      <OptionSelectorModal
        visible={showAlineacionModal}
        onClose={() => setShowAlineacionModal(false)}
        title={t('schedule.selectLineup')}
        options={alineacionesDisponibles}
        selectedOption={matchData.alineacion}
        onSelect={(option) => {
          setMatchData(prev => ({ ...prev, alineacion: option }));
          setShowAlineacionModal(false);
        }}
      />

      {/* Modal de Alineación Rival */}
      <OptionSelectorModal
        visible={showAlineacionRivalModal}
        onClose={() => setShowAlineacionRivalModal(false)}
        title={t('matchSheet.fields.selectRivalFormation')}
        options={alineacionesDisponibles}
        selectedOption={matchData.alineacionRival}
        onSelect={(option) => {
          setMatchData(prev => ({ ...prev, alineacionRival: option }));
          setShowAlineacionRivalModal(false);
        }}
      />

      {/* Modal de Goles */}
      <EventModal
        visible={showGolesModal}
        onClose={() => { setShowGolesModal(false); setEditingGoalIndex(null); }}
        title={editingGoalIndex !== null ? (t('matchSheet.modals.editGoal') || 'Editar gol') : t('matchSheet.modals.addGoal')}
        eventType="gol"
        editingEvent={editingGoalIndex !== null ? goles[editingGoalIndex] : null}
        players={players.filter(p => convocados.includes(p._id))}
        tiempoPorParte={team?.tiempoPorParte || 45}
        descuentoPT={Number(matchData.descuentoPrimerTiempo) || 0}
        descuentoST={Number(matchData.descuentoSegundoTiempo) || 0}
        onAdd={(event) => {
          if (editingGoalIndex !== null) {
            const newGoles = [...goles];
            newGoles[editingGoalIndex] = event;
            setGoles(newGoles);
            setEditingGoalIndex(null);
          } else {
            setGoles([...goles, event]);
          }
          setShowGolesModal(false);
        }}
      />

      {/* Modal de Tarjetas */}
      <EventModal
        visible={showTarjetasModal}
        onClose={() => { setShowTarjetasModal(false); setEditingCardIndex(null); setEditingCardType(null); }}
        title={editingCardIndex !== null ? (t('matchSheet.modals.editCard') || 'Editar tarjeta') : t('matchSheet.modals.addCard')}
        eventType="tarjeta"
        editingEvent={editingCardIndex !== null ? (() => {
          const card = editingCardType === 'amarilla' ? tarjetasAmarillas[editingCardIndex] : tarjetasRojas[editingCardIndex];
          return card ? { ...card, tipo: editingCardType } : null;
        })() : null}
        players={players.filter(p => convocados.includes(p._id))}
        tiempoPorParte={team?.tiempoPorParte || 45}
        descuentoPT={Number(matchData.descuentoPrimerTiempo) || 0}
        descuentoST={Number(matchData.descuentoSegundoTiempo) || 0}
        onAdd={(event) => {
          if (editingCardIndex !== null) {
            // Editing existing card
            if (editingCardType === 'amarilla') {
              if (event.tipo === 'amarilla') {
                const newAmarillas = [...tarjetasAmarillas];
                newAmarillas[editingCardIndex] = event;
                setTarjetasAmarillas(newAmarillas);
              } else {
                // Changed from yellow to red
                setTarjetasAmarillas(tarjetasAmarillas.filter((_, i) => i !== editingCardIndex));
                setTarjetasRojas([...tarjetasRojas, event]);
              }
            } else {
              if (event.tipo === 'roja' || !event.tipo) {
                const newRojas = [...tarjetasRojas];
                newRojas[editingCardIndex] = event;
                setTarjetasRojas(newRojas);
              } else {
                // Changed from red to yellow
                setTarjetasRojas(tarjetasRojas.filter((_, i) => i !== editingCardIndex));
                setTarjetasAmarillas([...tarjetasAmarillas, event]);
              }
            }
            setEditingCardIndex(null);
            setEditingCardType(null);
          } else {
            if (event.tipo === 'amarilla') {
              const newAmarillas = [...tarjetasAmarillas, event];
              setTarjetasAmarillas(newAmarillas);
              // Auto-add red card on double yellow
              const eventJugadorId = typeof event.jugador === 'object' ? event.jugador._id : event.jugador;
              const playerYellows = newAmarillas.filter(t => {
                const tJugador = typeof t.jugador === 'object' ? t.jugador._id : t.jugador;
                return tJugador === eventJugadorId;
              });
              if (playerYellows.length >= 2) {
                const alreadyHasAutoRed = tarjetasRojas.some(t => {
                  const tJugador = typeof t.jugador === 'object' ? t.jugador._id : t.jugador;
                  return tJugador === eventJugadorId && t.motivo === 'Doble amarilla';
                });
                if (!alreadyHasAutoRed) {
                  setTarjetasRojas([...tarjetasRojas, { jugador: event.jugador, minuto: event.minuto, motivo: 'Doble amarilla' }]);
                }
              }
            } else {
              setTarjetasRojas([...tarjetasRojas, event]);
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
        players={players.filter(p => convocados.includes(p._id))}
        titulares={alineacionTitulares}
        suplentes={alineacionSuplentes}
        tiempoPorParte={team?.tiempoPorParte || 45}
        descuentoPT={Number(matchData.descuentoPrimerTiempo) || 0}
        descuentoST={Number(matchData.descuentoSegundoTiempo) || 0}
        jugadoresEnCampo={jugadoresEnCampo}
        jugadoresExpulsados={jugadoresExpulsados}
        cambiosRealizados={cambios}
        onAdd={(event) => {
          setCambios([...cambios, event]);
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
        descuentoPT={Number(matchData.descuentoPrimerTiempo) || 0}
        descuentoST={Number(matchData.descuentoSegundoTiempo) || 0}
        onAdd={(gol) => {
          setGolesRival([...golesRival, gol]);
          setShowGolesRivalModal(false);
        }}
      />
    </>
  );

  // Renderizar formulario de sesión
  // Helper para obtener nombre de ejercicio
  const getExerciseName = (exId) => {
    const ex = exercises.find(e => e._id === exId);
    return ex ? ex.nombre : 'Ejercicio';
  };

  // Helper para obtener tipo de ejercicio
  const getExerciseTypeName = (typeId) => {
    const type = exerciseTypes.find(t => t._id === typeId);
    return type ? type.nombre : '';
  };

  // Añadir ejercicio seleccionado
  const handleAddExercise = (exerciseId) => {
    if (!selectedExercises.includes(exerciseId)) {
      setSelectedExercises([...selectedExercises, exerciseId]);
      setExerciseObservations(prev => ({ ...prev, [exerciseId]: '' }));
      setExerciseRestTimes(prev => ({ ...prev, [exerciseId]: 0 }));
    }
  };

  // Eliminar ejercicio
  const handleRemoveExercise = (exerciseId) => {
    setSelectedExercises(selectedExercises.filter(id => id !== exerciseId));
    const newObs = { ...exerciseObservations };
    const newRest = { ...exerciseRestTimes };
    delete newObs[exerciseId];
    delete newRest[exerciseId];
    setExerciseObservations(newObs);
    setExerciseRestTimes(newRest);
  };

  const renderSessionForm = () => (
    <>
    <KeyboardAwareScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.formHeader}>
        {!defaultEventType && (
          <TouchableOpacity onPress={() => setEventType(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.formTitle}>{t('schedule.newTrainingSession')}</Text>
      </View>

      {/* Fecha de la sesión */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>{t('schedule.date')}</Text>
        <TouchableOpacity
          style={styles.selectInput}
          onPress={() => setShowSessionDatePicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar" size={20} color={theme.colors.success} style={{ marginRight: 8 }} />
          <Text style={styles.selectInputText}>{formatDate(sessionData.fecha)}</Text>
        </TouchableOpacity>
      </View>

      {/* Hora de inicio */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>{t('schedule.startTime')}</Text>
        <TouchableOpacity
          style={styles.selectInput}
          onPress={() => setShowStartTimePicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="time" size={20} color={theme.colors.success} style={{ marginRight: 8 }} />
          <Text style={styles.selectInputText}>{sessionData.horaInicio}</Text>
        </TouchableOpacity>
      </View>

      {/* Hora de fin */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>{t('schedule.endTime')}</Text>
        <TouchableOpacity
          style={styles.selectInput}
          onPress={() => setShowEndTimePicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={20} color={theme.colors.success} style={{ marginRight: 8 }} />
          <Text style={styles.selectInputText}>{sessionData.horaFin}</Text>
        </TouchableOpacity>
      </View>

      {/* Sección de Jugadores */}
      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>{t('schedule.players')}</Text>
        
        <TouchableOpacity
          style={styles.playerSelectorBtn}
          onPress={() => setShowPlayerSelectorModal(true)}
        >
          <View style={styles.playerSelectorLeft}>
            <Ionicons name="people" size={20} color={theme.colors.success} />
            <Text style={styles.playerSelectorText}>
              {t('schedule.selectPlayersCount', { count: selectedPlayers.length })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
        
        {/* Chips de jugadores seleccionados */}
        {selectedPlayers.length > 0 && (
          <View style={styles.selectedPlayersChips}>
            {selectedPlayers.slice(0, 8).map(playerId => {
              const player = players.find(p => p._id === playerId);
              if (!player) return null;
              return (
                <View key={playerId} style={styles.playerChipSmall}>
                  <Text style={styles.playerChipSmallText}>{getPlayerFullName(player)}</Text>
                </View>
              );
            })}
            {selectedPlayers.length > 8 && (
              <View style={styles.playerChipMore}>
                <Text style={styles.playerChipMoreText}>+{selectedPlayers.length - 8}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Sección de Jugadores Extras */}
      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>{t('schedule.extraPlayersTitle')}</Text>
        <Text style={styles.formSectionSubtitle}>{t('schedule.extraPlayersSubtitleNew')}</Text>
        
        {extraPlayersAvailable.length === 0 ? (
          <View style={styles.noExtraPlayersInfo}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.textMuted} />
            <Text style={styles.noExtraPlayersText}>
              {t('schedule.noExtraPlayersAvailable')}
            </Text>
          </View>
        ) : (
          <View style={styles.extraPlayersGrid}>
            {extraPlayersAvailable.map(player => {
              const isSelected = extraPlayers.includes(player._id);
              return (
                <TouchableOpacity
                  key={player._id}
                  style={[
                    styles.extraPlayerChip,
                    isSelected && styles.extraPlayerChipSelected
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setExtraPlayers(prev => prev.filter(id => id !== player._id));
                    } else {
                      setExtraPlayers(prev => [...prev, player._id]);
                    }
                  }}
                >
                  {player.foto ? (
                    <Image source={{ uri: player.foto }} style={styles.extraPlayerChipPhoto} />
                  ) : (
<View style={[styles.extraPlayerChipAvatar, isSelected && styles.extraPlayerChipAvatarSelected]}>
                      <Text style={styles.extraPlayerChipInitials}>
                        {getPlayerInitials(player)}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.extraPlayerChipText, isSelected && styles.extraPlayerChipTextSelected]} numberOfLines={1}>
                    {player.dorsal ? `${player.dorsal}. ` : ''}{getPlayerFullName(player)}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Sección de Ejercicios */}
      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>{t('schedule.exercises')}</Text>
        
        {/* Botón añadir ejercicio */}
        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => setShowExerciseSelectorModal(true)}
        >
          <Ionicons name="add-circle" size={22} color={theme.colors.success} />
          <Text style={styles.addExerciseBtnText}>{t('schedule.addExerciseBtn')}</Text>
        </TouchableOpacity>

        {/* Lista de ejercicios seleccionados */}
        {selectedExercises.length > 0 ? (
          <View style={styles.exercisesList}>
            {selectedExercises.map((exId, index) => {
              const exercise = exercises.find(e => e._id === exId);
              if (!exercise) return null;
              
              const handleMoveUp = () => {
                if (index === 0) return;
                const newOrder = [...selectedExercises];
                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                setSelectedExercises(newOrder);
              };

              const handleMoveDown = () => {
                if (index === selectedExercises.length - 1) return;
                const newOrder = [...selectedExercises];
                [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                setSelectedExercises(newOrder);
              };
              
              return (
                <View key={exId} style={styles.exerciseItem}>
                  {/* Layout móvil: todo apilado verticalmente */}
                  {isMobile ? (
                    <>
                      {/* Fila superior: Número + Nombre + Eliminar */}
                      <View style={styles.exerciseItemHeaderMobile}>
                        <View style={styles.exerciseNumber}>
                          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.exerciseItemNameMobile} numberOfLines={2}>{exercise.nombre}</Text>
                        <TouchableOpacity
                          style={styles.removeExerciseBtnMobile}
                          onPress={() => handleRemoveExercise(exId)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Imagen y tipo */}
                      <View style={styles.exerciseImageRowMobile}>
                        {exercise.imagen ? (
                          <Image
                            source={{ uri: exercise.imagen }}
                            style={styles.exerciseItemImageMobile}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.exerciseItemImagePlaceholderMobile}>
                            <Ionicons name="fitness" size={24} color={theme.colors.textMuted} />
                          </View>
                        )}
                        <View style={styles.exerciseMetaMobile}>
                          {exercise.tipo && (
                            <Text style={styles.exerciseItemType}>
                              {getExerciseTypeName(exercise.tipo)}
                            </Text>
                          )}
                          {/* Controles de orden y video en móvil */}
                          <View style={styles.exerciseOrderControlsMobile}>
                            {exerciseVideoAvailability[exId] && (
                              <TouchableOpacity
                                style={[styles.orderBtnMobile, { backgroundColor: '#E91E63' }]}
                                onPress={() => handlePlayExerciseVideo(exercise)}
                              >
                                <Feather name="play-circle" size={16} color="#fff" />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={[styles.orderBtnMobile, index === 0 && styles.orderBtnDisabled]}
                              onPress={handleMoveUp}
                              disabled={index === 0}
                            >
                              <Ionicons name="arrow-up" size={16} color={index === 0 ? theme.colors.textMuted : theme.colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.orderBtnMobile, index === selectedExercises.length - 1 && styles.orderBtnDisabled]}
                              onPress={handleMoveDown}
                              disabled={index === selectedExercises.length - 1}
                            >
                              <Ionicons name="arrow-down" size={16} color={index === selectedExercises.length - 1 ? theme.colors.textMuted : theme.colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </>
                  ) : (
                    /* Layout tablet/desktop: original */
                    <View style={styles.exerciseItemHeader}>
                      <View style={styles.exerciseItemLeft}>
                        {/* Imagen del ejercicio */}
                        {exercise.imagen ? (
                          <Image
                            source={{ uri: exercise.imagen }}
                            style={styles.exerciseItemImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.exerciseItemImagePlaceholder}>
                            <Ionicons name="fitness" size={20} color={theme.colors.textMuted} />
                          </View>
                        )}
                        <View style={styles.exerciseInfo}>
                          <View style={styles.exerciseNameRow}>
                            <View style={styles.exerciseNumber}>
                              <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.exerciseItemName}>{exercise.nombre}</Text>
                          </View>
                          {exercise.tipo && (
                            <Text style={styles.exerciseItemType}>
                              {getExerciseTypeName(exercise.tipo)}
                            </Text>
                          )}
                        </View>
                      </View>
                      
                      {/* Controles de orden y video */}
                      <View style={styles.exerciseOrderControls}>
                        {/* Botón de video */}
                        {exerciseVideoAvailability[exId] && (
                          <TouchableOpacity
                            style={[styles.orderBtn, { backgroundColor: '#E91E63' }]}
                            onPress={() => handlePlayExerciseVideo(exercise)}
                          >
                            <Feather name="play-circle" size={18} color="#fff" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.orderBtn, index === 0 && styles.orderBtnDisabled]}
                          onPress={handleMoveUp}
                          disabled={index === 0}
                        >
                          <Ionicons name="arrow-up" size={18} color={index === 0 ? theme.colors.textMuted : theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.orderBtn, index === selectedExercises.length - 1 && styles.orderBtnDisabled]}
                          onPress={handleMoveDown}
                          disabled={index === selectedExercises.length - 1}
                        >
                          <Ionicons name="arrow-down" size={18} color={index === selectedExercises.length - 1 ? theme.colors.textMuted : theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeExerciseBtn}
                          onPress={() => handleRemoveExercise(exId)}
                        >
                          <Ionicons name="close-circle" size={22} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  
                  {/* Tiempo de descanso - solo si no es el último ejercicio */}
                  {index < selectedExercises.length - 1 && (
                    <View style={styles.exerciseField}>
                      <Text style={styles.exerciseFieldLabel}>{t('schedule.restMinutes')}:</Text>
                      <TextInput
                        style={styles.exerciseFieldInput}
                        value={exerciseRestTimes[exId] !== undefined ? String(exerciseRestTimes[exId]) : ''}
                        onChangeText={(text) => {
                          const val = text.replace(/[^0-9]/g, '');
                          setExerciseRestTimes(prev => ({ ...prev, [exId]: val === '' ? 0 : parseInt(val) }));
                        }}
                        keyboardType="number-pad"
                        autoComplete="off"
                        placeholder="0"
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                  )}
                  
                  {/* Observaciones del ejercicio */}
                  <View style={styles.exerciseObsField}>
                    <Text style={styles.exerciseFieldLabel}>{t('schedule.exerciseObservations')}:</Text>
                    <TextInput
                      style={styles.exerciseObsInput}
                      value={exerciseObservations[exId] || ''}
                      onChangeText={(text) => {
                        setExerciseObservations(prev => ({ ...prev, [exId]: text }));
                      }}
                      placeholder={t('schedule.notesAboutExercise')}
                      placeholderTextColor={theme.colors.textMuted}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                  
                  {/* Botón de asignación de equipos */}
                  {exercise.equipos > 0 && (
                    <TouchableOpacity
                      style={styles.teamAssignmentButton}
                      onPress={() => {
                        setCurrentExerciseForTeams(exercise);
                        setShowTeamAssignmentModal(true);
                      }}
                    >
                      <Ionicons name="people" size={18} color={theme.colors.primary} />
                      <Text style={styles.teamAssignmentButtonText}>
                        {t('schedule.assignTeams')} ({exercise.equipos})
                      </Text>
                      {exerciseTeamAssignments[exId]?.length > 0 && (
                        <View style={styles.teamAssignmentBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyExercises}>
            <Ionicons name="fitness-outline" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyExercisesText}>{t('schedule.noExercisesAdded')}</Text>
          </View>
        )}
      </View>

      {/* Sección de Ejercicios de Fuerza */}
      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>{t('schedule.strengthExercisesSection')}</Text>
        
        {/* Botón añadir ejercicio de fuerza */}
        <TouchableOpacity
          style={[styles.addExerciseBtn, { borderColor: theme.colors.purple }]}
          onPress={() => setShowStrengthExerciseSelectorModal(true)}
        >
          <Ionicons name="barbell" size={22} color="#8b5cf6" />
          <Text style={[styles.addExerciseBtnText, { color: theme.colors.purple }]}>{t('schedule.addStrengthExerciseBtn')}</Text>
        </TouchableOpacity>

        {/* Lista de ejercicios de fuerza seleccionados */}
        {selectedStrengthExercises.length > 0 ? (
          <View style={styles.exercisesList}>
            {selectedStrengthExercises.map((seId, index) => {
              const exercise = STRENGTH_EXERCISES.find(e => e.id === seId);
              if (!exercise) return null;
              const sectionInfo = getSectionForExercise(seId);
              
              const handleMoveUpStrength = () => {
                if (index === 0) return;
                const newOrder = [...selectedStrengthExercises];
                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                setSelectedStrengthExercises(newOrder);
              };

              const handleMoveDownStrength = () => {
                if (index === selectedStrengthExercises.length - 1) return;
                const newOrder = [...selectedStrengthExercises];
                [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                setSelectedStrengthExercises(newOrder);
              };
              
              const handleRemoveStrengthExercise = (id) => {
                setSelectedStrengthExercises(prev => prev.filter(x => x !== id));
                const newObs = { ...strengthExerciseObservations };
                const newRest = { ...strengthExerciseRestTimes };
                delete newObs[id];
                delete newRest[id];
                setStrengthExerciseObservations(newObs);
                setStrengthExerciseRestTimes(newRest);
              };
              
              return (
                <View key={seId} style={styles.exerciseItem}>
                  {isMobile ? (
                    <>
                      <View style={styles.exerciseItemHeaderMobile}>
                        <View style={styles.exerciseNumber}>
                          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.exerciseItemNameMobile} numberOfLines={2}>{t(exercise.i18nKey)}</Text>
                        <TouchableOpacity
                          style={styles.removeExerciseBtnMobile}
                          onPress={() => handleRemoveStrengthExercise(seId)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.exerciseImageRowMobile}>
                        <Image
                          source={getStrengthExerciseImage(exercise.image)}
                          style={styles.exerciseItemImageMobile}
                          resizeMode="cover"
                        />
                        <View style={styles.exerciseMetaMobile}>
                          {sectionInfo && (
                            <Text style={styles.exerciseItemType}>{t(sectionInfo.section.i18nKey)}</Text>
                          )}
                          <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>{t('schedule.strengthExerciseLevel')}: {exercise.level}</Text>
                          <View style={styles.exerciseOrderControlsMobile}>
                            <TouchableOpacity
                              style={[styles.orderBtnMobile, index === 0 && styles.orderBtnDisabled]}
                              onPress={handleMoveUpStrength}
                              disabled={index === 0}
                            >
                              <Ionicons name="arrow-up" size={16} color={index === 0 ? theme.colors.textMuted : theme.colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.orderBtnMobile, index === selectedStrengthExercises.length - 1 && styles.orderBtnDisabled]}
                              onPress={handleMoveDownStrength}
                              disabled={index === selectedStrengthExercises.length - 1}
                            >
                              <Ionicons name="arrow-down" size={16} color={index === selectedStrengthExercises.length - 1 ? theme.colors.textMuted : theme.colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.exerciseItemHeader}>
                      <View style={styles.exerciseItemLeft}>
                        <Image
                          source={getStrengthExerciseImage(exercise.image)}
                          style={styles.exerciseItemImage}
                          resizeMode="cover"
                        />
                        <View style={styles.exerciseInfo}>
                          <View style={styles.exerciseNameRow}>
                            <View style={styles.exerciseNumber}>
                              <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.exerciseItemName}>{t(exercise.i18nKey)}</Text>
                          </View>
                          {sectionInfo && (
                            <Text style={styles.exerciseItemType}>{t(sectionInfo.section.i18nKey)} — {t('schedule.strengthExerciseLevel')} {exercise.level}</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.exerciseOrderControls}>
                        <TouchableOpacity
                          style={[styles.orderBtn, index === 0 && styles.orderBtnDisabled]}
                          onPress={handleMoveUpStrength}
                          disabled={index === 0}
                        >
                          <Ionicons name="arrow-up" size={18} color={index === 0 ? theme.colors.textMuted : theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.orderBtn, index === selectedStrengthExercises.length - 1 && styles.orderBtnDisabled]}
                          onPress={handleMoveDownStrength}
                          disabled={index === selectedStrengthExercises.length - 1}
                        >
                          <Ionicons name="arrow-down" size={18} color={index === selectedStrengthExercises.length - 1 ? theme.colors.textMuted : theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeExerciseBtn}
                          onPress={() => handleRemoveStrengthExercise(seId)}
                        >
                          <Ionicons name="close-circle" size={22} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  
                  {/* Tiempo de descanso */}
                  {index < selectedStrengthExercises.length - 1 && (
                    <View style={styles.exerciseField}>
                      <Text style={styles.exerciseFieldLabel}>{t('schedule.restMinutes')}:</Text>
                      <TextInput
                        style={styles.exerciseFieldInput}
                        value={strengthExerciseRestTimes[seId] !== undefined ? String(strengthExerciseRestTimes[seId]) : ''}
                        onChangeText={(text) => {
                          const val = text.replace(/[^0-9]/g, '');
                          setStrengthExerciseRestTimes(prev => ({ ...prev, [seId]: val === '' ? 0 : parseInt(val) }));
                        }}
                        keyboardType="number-pad"
                        autoComplete="off"
                        placeholder="0"
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                  )}
                  
                  {/* Observaciones */}
                  <View style={styles.exerciseObsField}>
                    <Text style={styles.exerciseFieldLabel}>{t('schedule.exerciseObservations')}:</Text>
                    <TextInput
                      style={styles.exerciseObsInput}
                      value={strengthExerciseObservations[seId] || ''}
                      onChangeText={(text) => {
                        setStrengthExerciseObservations(prev => ({ ...prev, [seId]: text }));
                      }}
                      placeholder={t('schedule.notesAboutExercise')}
                      placeholderTextColor={theme.colors.textMuted}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyExercises}>
            <Ionicons name="barbell-outline" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyExercisesText}>{t('schedule.noStrengthExercisesAdded')}</Text>
          </View>
        )}
      </View>

      {/* Observaciones generales */}
      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>{t('schedule.generalObservations')}</Text>
        <TextInput
          style={styles.observationsInput}
          value={sessionData.observaciones}
          onChangeText={(text) => setSessionData(prev => ({ ...prev, observaciones: text }))}
          placeholder={t('schedule.sessionNotesPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Wellness Esperado */}
      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>{t('session.expectedWellness')}</Text>
        <Text style={styles.wellnessSubtitle}>{t('session.wellnessSubtitle')}</Text>
        <View style={styles.wellnessSelector}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
            <TouchableOpacity
              key={num}
              style={[
                styles.wellnessOption,
                sessionData.expectedWellness === num && styles.wellnessOptionSelected,
                num <= 3 && sessionData.expectedWellness === num && { backgroundColor: '#ef4444', borderColor: '#ef4444' },
                num > 3 && num <= 5 && sessionData.expectedWellness === num && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
                num > 5 && num <= 7 && sessionData.expectedWellness === num && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
                num > 7 && sessionData.expectedWellness === num && { backgroundColor: '#10b981', borderColor: '#10b981' },
              ]}
              onPress={() => setSessionData(prev => ({ 
                ...prev, 
                expectedWellness: prev.expectedWellness === num ? null : num 
              }))}
            >
              <Text style={[
                styles.wellnessOptionText,
                sessionData.expectedWellness === num && styles.wellnessOptionTextSelected
              ]}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

    </KeyboardAwareScrollView>
      {/* Botones */}
      <View style={styles.footerButtonRow}>
        <TouchableOpacity
          style={styles.footerCancelBtn}
          onPress={onClose}
        >
          <Text style={styles.footerCancelBtnText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerSaveBtn, { backgroundColor: theme.colors.success }, loading && styles.footerSaveBtnDisabled]}
          onPress={handleCreateSession}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.footerSaveBtnText}>{t('schedule.createSessionBtn')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date/Time Pickers */}
      {Platform.OS === 'ios' ? (
        <>
          {/* iOS: Modal para Session Date Picker */}
          <Modal
            visible={showSessionDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowSessionDatePicker(false)}
          >
            <View style={styles.datePickerModalBg}>
              <View style={[styles.datePickerModalContent, { paddingBottom: Math.max(insets.bottom, 30) }]}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowSessionDatePicker(false)}>
                    <Text style={styles.datePickerCancel}>{t('schedule.cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>{t('schedule.selectDate')}</Text>
                  <TouchableOpacity onPress={() => setShowSessionDatePicker(false)}>
                    <Text style={styles.datePickerDone}>{t('schedule.done')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={sessionData.fecha}
                  mode="date"
                  display="spinner"
                  onChange={handleSessionDateChange}
                  style={{ height: 200 }}
                  textColor="#000000"
                />
              </View>
            </View>
          </Modal>

          {/* iOS: Modal para Start Time Picker */}
          <Modal
            visible={showStartTimePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowStartTimePicker(false)}
          >
            <View style={styles.datePickerModalBg}>
              <View style={[styles.datePickerModalContent, { paddingBottom: Math.max(insets.bottom, 30) }]}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                    <Text style={styles.datePickerCancel}>{t('schedule.cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>{t('schedule.startTimeTitle')}</Text>
                  <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                    <Text style={styles.datePickerDone}>{t('schedule.done')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={parseTimeString(sessionData.horaInicio)}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={handleStartTimeChange}
                  style={{ height: 200 }}
                  textColor="#000000"
                />
              </View>
            </View>
          </Modal>

          {/* iOS: Modal para End Time Picker */}
          <Modal
            visible={showEndTimePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowEndTimePicker(false)}
          >
            <View style={styles.datePickerModalBg}>
              <View style={[styles.datePickerModalContent, { paddingBottom: Math.max(insets.bottom, 30) }]}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                    <Text style={styles.datePickerCancel}>{t('schedule.cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>{t('schedule.endTimeTitle')}</Text>
                  <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                    <Text style={styles.datePickerDone}>{t('schedule.done')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={parseTimeString(sessionData.horaFin)}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={handleEndTimeChange}
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
          {showSessionDatePicker && (
            <DateTimePicker
              value={sessionData.fecha}
              mode="date"
              display="default"
              onChange={handleSessionDateChange}
            />
          )}
          {showStartTimePicker && (
            <DateTimePicker
              value={parseTimeString(sessionData.horaInicio)}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleStartTimeChange}
            />
          )}
          {showEndTimePicker && (
            <DateTimePicker
              value={parseTimeString(sessionData.horaFin)}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleEndTimeChange}
            />
          )}
        </>
      )}

      {/* Modal selector de ejercicios profesional */}
      <ExerciseSelectorModal
        visible={showExerciseSelectorModal}
        onClose={() => setShowExerciseSelectorModal(false)}
        ejercicios={exercises}
        selectedIds={selectedExercises}
        setSelectedIds={(newIds) => {
          // Actualizar los ejercicios seleccionados
          if (typeof newIds === 'function') {
            setSelectedExercises(prev => {
              const updated = newIds(prev);
              // Inicializar observaciones y tiempos para nuevos ejercicios
              updated.forEach(id => {
                if (!exerciseObservations[id]) {
                  setExerciseObservations(prevObs => ({ ...prevObs, [id]: '' }));
                }
                if (exerciseRestTimes[id] === undefined) {
                  setExerciseRestTimes(prevRest => ({ ...prevRest, [id]: 0 }));
                }
              });
              return updated;
            });
          } else {
            setSelectedExercises(newIds);
            // Inicializar observaciones y tiempos para nuevos ejercicios
            newIds.forEach(id => {
              if (!exerciseObservations[id]) {
                setExerciseObservations(prev => ({ ...prev, [id]: '' }));
              }
              if (exerciseRestTimes[id] === undefined) {
                setExerciseRestTimes(prev => ({ ...prev, [id]: 0 }));
              }
            });
          }
        }}
        exerciseTypes={exerciseTypes}
        multiSelect={true}
      />

      {/* Modal selector de ejercicios de fuerza */}
      <StrengthExerciseSelectorModal
        visible={showStrengthExerciseSelectorModal}
        onClose={() => setShowStrengthExerciseSelectorModal(false)}
        selectedIds={selectedStrengthExercises}
        setSelectedIds={(newIds) => {
          if (typeof newIds === 'function') {
            setSelectedStrengthExercises(prev => {
              const updated = newIds(prev);
              updated.forEach(id => {
                if (!strengthExerciseObservations[id]) {
                  setStrengthExerciseObservations(prevObs => ({ ...prevObs, [id]: '' }));
                }
                if (strengthExerciseRestTimes[id] === undefined) {
                  setStrengthExerciseRestTimes(prevRest => ({ ...prevRest, [id]: 0 }));
                }
              });
              return updated;
            });
          } else {
            setSelectedStrengthExercises(newIds);
            newIds.forEach(id => {
              if (!strengthExerciseObservations[id]) {
                setStrengthExerciseObservations(prev => ({ ...prev, [id]: '' }));
              }
              if (strengthExerciseRestTimes[id] === undefined) {
                setStrengthExerciseRestTimes(prev => ({ ...prev, [id]: 0 }));
              }
            });
          }
        }}
        multiSelect={true}
      />

      {/* Modal selector de jugadores para sesión */}
      <PlayerSelectionModal
        visible={showPlayerSelectorModal}
        onClose={() => setShowPlayerSelectorModal(false)}
        title={t('schedule.selectPlayers')}
        players={rosterPlayers}
        selectedIds={selectedPlayers}
        excludeIds={[]}
        onConfirm={(ids) => {
          setSelectedPlayers(ids);
          setShowPlayerSelectorModal(false);
        }}
        injuries={injuries}
      />
    </>
  );

  return (
    <>
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
   >
      <View style={styles.modalBg}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {eventType === null ? t('schedule.addNewEvent') : 
               eventType === 'match' ? t('schedule.newMatch') : t('schedule.newSession')}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Contenido dinámico */}
          {eventType === null && renderTypeSelector()}
          {eventType === 'match' && renderMatchForm()}
          {eventType === 'session' && renderSessionForm()}
        </View>
        
        {/* Modal de asignación de equipos */}
        {showTeamAssignmentModal && currentExerciseForTeams && (
          <View style={styles.teamAssignmentOverlay}>
            <View style={[styles.teamAssignmentModalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.teamAssignmentModalHeader}>
                <Text style={styles.teamAssignmentModalTitle}>
                  {t('schedule.assignTeams')} - {currentExerciseForTeams?.nombre}
                </Text>
                <TouchableOpacity
                  style={styles.teamAssignmentModalCloseBtn}
                  onPress={() => setShowTeamAssignmentModal(false)}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            
            <ScrollView style={styles.teamAssignmentModalScroll}>
              {Array.from({ length: currentExerciseForTeams.equipos }, (_, i) => i + 1).map(teamNum => {
              const currentAssignments = exerciseTeamAssignments[currentExerciseForTeams._id] || [];
              const teamAssignment = currentAssignments.find(t => t.teamNumber === teamNum) || { players: [], extraPlayers: [] };
              
              const teamColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
              const teamColor = teamColors[(teamNum - 1) % teamColors.length];
              
              return (
                <View key={teamNum} style={[styles.teamSection, { borderLeftColor: teamColor }]}>
                  <View style={styles.teamHeader}>
                    <View style={[styles.teamBadge, { backgroundColor: teamColor }]}>
                      <Text style={styles.teamBadgeText}>{t('schedule.team')} {teamNum}</Text>
                    </View>
                    <Text style={styles.teamPlayerCount}>
                      {teamAssignment.players.length + teamAssignment.extraPlayers.length} {t('schedule.playersCount')}
                    </Text>
                  </View>
                  
                  {/* Jugadores de plantilla */}
                  <Text style={styles.teamSubtitle}>{t('schedule.rosterPlayers')}:</Text>
                  <View style={styles.playersGrid}>
                    {selectedPlayers.length === 0 ? (
                      <Text style={styles.noPlayersText}>{t('schedule.noPlayersSelected')}</Text>
                    ) : (
                      selectedPlayers.map(playerId => {
                        const player = players.find(p => p._id === playerId);
                        if (!player) return null;
                        
                        const isSelected = teamAssignment.players.includes(playerId);
                        const isInOtherTeam = currentAssignments.some(t => t.teamNumber !== teamNum && t.players.includes(playerId));
                        
                        return (
                          <TouchableOpacity
                            key={playerId}
                            style={[
                              styles.playerChip,
                              isSelected && { backgroundColor: teamColor, borderColor: teamColor },
                              isInOtherTeam && styles.playerChipDisabled
                            ]}
                            onPress={() => {
                              if (isInOtherTeam) return;
                              
                              const exId = currentExerciseForTeams._id;
                              setExerciseTeamAssignments(prev => {
                                const currentTeams = prev[exId] || [];
                                const existingTeam = currentTeams.find(t => t.teamNumber === teamNum);
                                
                                if (existingTeam) {
                                  const updatedPlayers = isSelected
                                    ? existingTeam.players.filter(p => p !== playerId)
                                    : [...existingTeam.players, playerId];
                                  
                                  return {
                                    ...prev,
                                    [exId]: currentTeams.map(t =>
                                      t.teamNumber === teamNum
                                        ? { ...t, players: updatedPlayers }
                                        : t
                                    )
                                  };
                                } else {
                                  return {
                                    ...prev,
                                    [exId]: [...currentTeams, { teamNumber: teamNum, players: [playerId], extraPlayers: [] }]
                                  };
                                }
                              });
                            }}
                            disabled={isInOtherTeam}
                          >
                            <Text style={[
                              styles.playerChipText,
                              isSelected && styles.playerChipTextSelected,
                              isInOtherTeam && styles.playerChipTextDisabled
                            ]}>
                              {player.dorsal ? `${player.dorsal}. ` : ''}{getPlayerFullName(player)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                  
                  {/* Jugadores extra */}
                  {extraPlayers.length > 0 && (
                    <>
                      <Text style={styles.teamSubtitle}>{t('schedule.extraPlayersLabel')}:</Text>
                      <View style={styles.playersGrid}>
                        {extraPlayers.map((extraPlayerId, idx) => {
                          // Buscar el jugador extra por su ID para mostrar su nombre
                          const extraPlayerObj = extraPlayersAvailable.find(p => p._id === extraPlayerId);
                          const extraPlayerName = extraPlayerObj ? (extraPlayerObj.dorsal ? `${extraPlayerObj.dorsal}. ` : '') + getPlayerFullName(extraPlayerObj) : extraPlayerId;
                          
                          const isSelected = teamAssignment.extraPlayers.includes(extraPlayerId);
                          const isInOtherTeam = currentAssignments.some(t => t.teamNumber !== teamNum && t.extraPlayers.includes(extraPlayerId));
                          
                          return (
                            <TouchableOpacity
                              key={`extra-${idx}`}
                              style={[
                                styles.playerChip,
                                isSelected && { backgroundColor: teamColor, borderColor: teamColor },
                                isInOtherTeam && styles.playerChipDisabled
                              ]}
                              onPress={() => {
                                if (isInOtherTeam) return;
                                
                                const exId = currentExerciseForTeams._id;
                                setExerciseTeamAssignments(prev => {
                                  const currentTeams = prev[exId] || [];
                                  const existingTeam = currentTeams.find(t => t.teamNumber === teamNum);
                                  
                                  if (existingTeam) {
                                    const updatedExtraPlayers = isSelected
                                      ? existingTeam.extraPlayers.filter(p => p !== extraPlayerId)
                                      : [...existingTeam.extraPlayers, extraPlayerId];
                                    
                                    return {
                                      ...prev,
                                      [exId]: currentTeams.map(t =>
                                        t.teamNumber === teamNum
                                          ? { ...t, extraPlayers: updatedExtraPlayers }
                                          : t
                                      )
                                    };
                                  } else {
                                    return {
                                      ...prev,
                                      [exId]: [...currentTeams, { teamNumber: teamNum, players: [], extraPlayers: [extraPlayerId] }]
                                    };
                                  }
                                });
                              }}
                              disabled={isInOtherTeam}
                            >
                              <Text style={[
                                styles.playerChipText,
                                isSelected && styles.playerChipTextSelected,
                                isInOtherTeam && styles.playerChipTextDisabled
                              ]}>
                                {extraPlayerName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.teamAssignmentDoneBtn}
            onPress={() => setShowTeamAssignmentModal(false)}
          >
            <Text style={styles.teamAssignmentDoneBtnText}>{t('common.done')}</Text>
          </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
    
    {/* Modal de Video */}
    <Modal
      visible={showVideoModal}
      transparent={false}
      animationType="slide"
      onRequestClose={closeVideoModal}
   >
      <View style={styles.videoModalBg}>
        <View style={styles.videoModalContent}>
          <View style={styles.videoModalHeader}>
            <Text style={styles.videoModalTitle} numberOfLines={1}>
              {exerciseForVideo?.nombre || t('exercise.video')}
            </Text>
            <TouchableOpacity onPress={closeVideoModal} style={styles.videoModalCloseBtn}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {isGeneratingVideo ? (
            <View style={styles.videoGeneratingContainer}>
              <ActivityIndicator size="large" color="#E91E63" />
              <Text style={styles.videoGeneratingText}>{t('exercise.generatingVideo')}</Text>
            </View>
          ) : videoUrl ? (
            <View style={styles.videoPlayerContainer}>
              <VideoPlayerView url={videoUrl} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  </>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 980,
    maxHeight: '94%',
    minHeight: '56%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  modalContentMobile: {
    width: '100%',
    maxHeight: '96%',
    minHeight: '72%',
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  typeSelector: {
    padding: 20,
  },
  typeSelectorTitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  matchWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '15',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.warning + '40',
  },
  matchWarningText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.warning,
    marginLeft: 10,
    lineHeight: 18,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeOptionDisabled: {
    opacity: 0.5,
    backgroundColor: theme.colors.border + '30',
  },
  typeOptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  typeOptionContent: {
    flex: 1,
  },
  typeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  typeOptionTitleDisabled: {
    color: theme.colors.textMuted,
  },
  typeOptionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  
  // Form
  formContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    marginLeft: -8,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
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
  selectInputText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  selectInputPlaceholder: {
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
    padding: 8,
  },
  escudoPlaceholderText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  
  // Location Buttons
  locationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  locationButton: {
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
  locationButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  locationButtonTextActive: {
    color: theme.colors.onPrimary,
  },
  
  // Form Section (Resultado, Convocatoria, etc)
  formSection: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  
  // Score Row (Resultado)
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scoreInput: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  scoreTextInput: {
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
    width: '100%',
  },
  scoreSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textMuted,
    paddingHorizontal: 8,
  },
  resultadoBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  resultadoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff', // text on semantic resultado badge (green/orange/red bg)
  },
  
  // Descuento (Added Time)
  descuentoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  descuentoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  descuentoItem: {
    flex: 1,
  },
  descuentoLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  descuentoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  descuentoButton: {
    padding: 12,
  },
  descuentoValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  descuentoHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  
  // Player Selector Button
  playerSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.inputBg,
    borderRadius: 12,
    padding: 14,
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
    fontSize: 15,
    color: theme.colors.text,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  calledChip: {
    backgroundColor: theme.colors.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  calledChipText: {
    fontSize: 12,
    color: theme.colors.successSoftText,
    fontWeight: '500',
  },
  notCalledChip: {
    backgroundColor: theme.colors.errorSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  notCalledChipText: {
    fontSize: 12,
    color: theme.colors.errorSoftText,
    fontWeight: '500',
  },
  
  // Footer Buttons (same pattern as EditSessionModal)
  footerButtonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  footerCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  footerSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  footerSaveBtnDisabled: {
    opacity: 0.6,
  },
  footerSaveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
  
  // Info Note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  
  // Selector Modal
  selectorModalBg: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  selectorModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  selectorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectorModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  selectorList: {
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
  emptyRivals: {
    alignItems: 'center',
    padding: 30,
  },
  emptyRivalsText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: 12,
  },
  emptyRivalsSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
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
    color: theme.colors.onPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  createRivalModalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  createRivalBody: {
    padding: 20,
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
  escudoPlaceholder: {
    alignItems: 'center',
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
    color: theme.colors.onPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Estilos para sesión de entrenamiento
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: theme.colors.success + '15',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.success + '40',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  addExerciseBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.success,
  },
  exercisesList: {
    gap: 12,
  },
  exerciseItem: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  exerciseItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  exerciseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  exerciseItemType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  removeExerciseBtn: {
    padding: 4,
  },
  exerciseField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  exerciseFieldLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    minWidth: 100,
  },
  exerciseFieldInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  exerciseObsField: {
    gap: 6,
  },
  exerciseObsInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 60,
  },
  emptyExercises: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.inputBg,
    borderRadius: 12,
  },
  emptyExercisesText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  selectedPlayersChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  playerChipSmall: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  playerChipSmallText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '500',
  },
  playerChipMore: {
    backgroundColor: theme.colors.textMuted + '30',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  playerChipMoreText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  
  // Estilos para Jugadores Extras
  formSectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 12,
    marginTop: -4,
  },
  extraPlayerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  extraPlayerInput: {
    flex: 1,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  extraPlayerAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  extraPlayersList: {
    gap: 8,
  },
  extraPlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  extraPlayerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  extraPlayerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraPlayerName: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    flex: 1,
  },
  extraPlayerRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  observationsInput: {
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
  exerciseTypeGroup: {
    marginBottom: 8,
  },
  exerciseTypeHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.inputBg,
    borderRadius: 8,
    marginBottom: 4,
  },
  exerciseSelectorItemLeft: {
    flex: 1,
  },
  exerciseSelectorDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
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
    backgroundColor: theme.colors.successSoft,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  lineupEditorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.successSoftText,
  },
  emptyLineupMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  emptyLineupText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  startersSubsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 12,
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
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  startersSubsList: {
    gap: 6,
  },
  starterSubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50', // semantic: starter (green)
  },
  starterSubDorsal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterSubDorsalText: {
    color: '#fff', // text on semantic dorsal bg (#4CAF50/#9C27B0)
    fontSize: 12,
    fontWeight: '700',
  },
  starterSubName: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
  },
  
  // Estilos para lista de eventos (goles, tarjetas, cambios) - ver estilos unificados abajo
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 4,
  },
  eventItemText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 8,
  },
  
  // Estilos para modal de DateTimePicker en iOS
  datePickerModalBg: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  
  // Estilos para imagen de ejercicio
  exerciseImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: theme.colors.inputBg,
  },
  exerciseImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseSelectorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  
  // Badge de video en ejercicio
  exerciseVideoBadge: {
    backgroundColor: '#E91E63',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  exerciseVideoBadgeInactive: {
    backgroundColor: theme.colors.textDisabled,
    shadowColor: theme.colors.textDisabled,
  },
  
  // Modal de video
  videoModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContent: {
    width: '95%',
    maxWidth: 800,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
  },
  videoModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  videoModalCloseBtn: {
    padding: 4,
  },
  videoGeneratingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoGeneratingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 14,
  },
  videoPlayerContainer: {
    aspectRatio: 16 / 9,
    width: '100%',
  },
  videoPlayer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  
  // Estilos para ejercicio en lista de seleccionados
  exerciseItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: theme.colors.inputBg,
  },
  exerciseItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseOrderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnDisabled: {
    opacity: 0.5,
  },
  
  // ============ ESTILOS MÓVIL PARA TARJETAS DE EJERCICIOS ============
  exerciseItemHeaderMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  exerciseItemNameMobile: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  removeExerciseBtnMobile: {
    padding: 6,
    backgroundColor: theme.colors.errorSoft,
    borderRadius: 8,
  },
  exerciseImageRowMobile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  exerciseItemImageMobile: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: theme.colors.inputBg,
  },
  exerciseItemImagePlaceholderMobile: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseMetaMobile: {
    flex: 1,
    justifyContent: 'space-between',
  },
  exerciseOrderControlsMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  orderBtnMobile: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // ============ FIN ESTILOS MÓVIL ============
  
  // Estilos para Wellness
  wellnessSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  wellnessSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wellnessOption: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellnessOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  wellnessOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  wellnessOptionTextSelected: {
    color: theme.colors.onPrimary,
  },
  // Estilos para asignación de equipos
  teamAssignmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  teamAssignmentButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
    flex: 1,
  },
  teamAssignmentBadge: {
    marginLeft: 'auto',
  },
  teamAssignmentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  teamAssignmentModalBg: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  teamAssignmentModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
  },
  teamAssignmentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  teamAssignmentModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  teamAssignmentModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAssignmentModalScroll: {
    flex: 1,
    padding: 16,
  },
  teamSection: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  teamBadgeText: {
    color: '#fff', // text on semantic team color bg (from teamColors palette)
    fontWeight: '700',
    fontSize: 14,
  },
  teamPlayerCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  teamSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  playerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  playerChipDisabled: {
    opacity: 0.4,
  },
  playerChipText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  playerChipTextSelected: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  playerChipTextDisabled: {
    color: theme.colors.textMuted,
  },
  teamAssignmentDoneBtn: {
    backgroundColor: theme.colors.primary,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  teamAssignmentDoneBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  noPlayersText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    padding: 8,
  },
  // Estilos para selector de jugadores extras
  noExtraPlayersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  noExtraPlayersText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  extraPlayersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  extraPlayerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  extraPlayerChipSelected: {
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.success,
  },
  extraPlayerChipPhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  extraPlayerChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraPlayerChipAvatarSelected: {
    backgroundColor: theme.colors.successSoft,
  },
  extraPlayerChipInitials: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  extraPlayerChipText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    maxWidth: 150,
  },
  extraPlayerChipTextSelected: {
    color: theme.colors.successSoftText,
  },
  
  // Estilos para cards (igual que matchSheetList)
  createCard: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  createCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  createCardContent: {
    gap: 16,
  },
  selector: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  selectorTextSelected: {
    color: theme.colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  resultadoDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  resultadoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  playerSelector: {
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
  playerChip: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  playerChipText: {
    fontSize: 12,
    color: theme.colors.primarySoftText,
    fontWeight: '500',
  },
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
    gap: 8,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  eventChipText: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },
  cardIndicator: {
    width: 12,
    height: 16,
    borderRadius: 2,
  },
  emptyLineupMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 8,
    gap: 8,
  },
  emptyLineupText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    flex: 1,
  },
});

function VideoPlayerView({ url }) {
  const player = useVideoPlayer(url || '', p => {
    if (url) { p.loop = false; p.play(); }
  });
  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />;
}
