/**
 * MatchSheetFormContent.js
 * Componente reutilizable para el contenido del formulario de creación/edición de fichas de partido.
 * Este componente se usa tanto en "Fichas de Partido" como en "Calendario".
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import RivalSelector from '@/vendor/shared/RivalSelector';
import LineupEditor from './LineupEditor';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const IS_MOBILE = WINDOW_WIDTH < 768;

/**
 * Componente de contenido del formulario
 * @param {Object} props
 */
const MatchSheetFormContent = ({
  // Datos del equipo
  selectedTeam,
  players = [],
  
  // Datos del formulario - campos básicos
  rival,
  setRival,
  rivalId,
  setRivalId,
  rivalEscudo,
  setRivalEscudo,
  ubicacion,
  setUbicacion,
  alineacion,
  setAlineacion,
  alineacionRival,
  setAlineacionRival,
  jornada,
  setJornada,
  fechaHora,
  setFechaHora,
  golesFavor,
  setGolesFavor,
  golesContra,
  setGolesContra,
  resultado,
  descuentoPrimerTiempo,
  setDescuentoPrimerTiempo,
  descuentoSegundoTiempo,
  setDescuentoSegundoTiempo,
  notasEntrenador,
  setNotasEntrenador,
  
  // Convocatoria y alineación
  convocados = [],
  setConvocados,
  noConvocados = [],
  setNoConvocados,
  alineacionTitulares = {},
  setAlineacionTitulares,
  alineacionSuplentes = [],
  setAlineacionSuplentes,
  
  // Eventos del partido
  goles = [],
  setGoles,
  tarjetasAmarillas = [],
  setTarjetasAmarillas,
  tarjetasRojas = [],
  setTarjetasRojas,
  cambios = [],
  setCambios,
  golesRival = [],
  setGolesRival,
  
  // Funciones para abrir modales
  onShowUbicacionModal,
  onShowAlineacionModal,
  onShowAlineacionRivalModal,
  onShowJornadaModal,
  onShowDateTimePicker,
  onShowConvocadosModal,
  onShowNoConvocadosModal,
  onShowGolesModal,
  onShowTarjetasModal,
  onShowCambiosModal,
  onShowGolesRivalModal,
  
  // Competición/Torneo
  competicion,
  setCompeticion,
  torneoId,
  setTorneoId,
  tournaments = [],
  onShowCompeticionModal,
  onShowTorneoModal,
  
  // Funciones auxiliares
  getPlayerName,
  getPlayerFullName,
  translateResult,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Mapeo de ubicación para display
  const getUbicacionDisplay = (ubicacionValue) => {
    if (!ubicacionValue) return t('matchSheet.modals.selectLocation');
    
    const ubicacionMap = {
      'Casa': t('matchSheet.modals.home'),
      'Fuera': t('matchSheet.modals.away'),
      'Neutral': t('matchSheet.modals.neutral'),
      'local': t('matchSheet.modals.home'),
      'visitante': t('matchSheet.modals.away'),
      'neutral': t('matchSheet.modals.neutral'),
    };
    return ubicacionMap[ubicacionValue] || ubicacionValue;
  };

  // Normalizar ubicación para mostrar escudos
  const getUbicacionForShields = () => {
    const normalized = ubicacion?.toLowerCase();
    if (normalized === 'fuera' || normalized === 'visitante') return 'away';
    return 'home'; // Casa, local, neutral
  };

  const isAwayLocation = getUbicacionForShields() === 'away';

  return (
    <KeyboardAwareScrollView
      style={styles.formBody}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={IS_MOBILE ? styles.formContentMobile : styles.formContent}
    >
      {/* Card de Datos del Partido */}
      <View style={IS_MOBILE ? styles.cardMobile : styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>{t('matchSheet.sections.matchData')}</Text>
        </View>

        <View style={styles.cardContent}>
          {/* Escudos Row - orden según ubicación */}
          <View style={styles.escudosRow}>
            {/* Primer escudo - mi equipo si local, rival si visitante */}
            <View style={styles.escudoContainer}>
              <Text style={styles.escudoLabel}>
                {isAwayLocation ? t('matchSheet.fields.rivalShield') : t('matchSheet.fields.myTeamShield')}
              </Text>
              <View style={styles.escudoButton}>
                {isAwayLocation ? (
                  // Mostrar rival si visitante
                  rivalEscudo ? (
                    <Image source={{ uri: rivalEscudo }} style={styles.escudoImage} />
                  ) : (
                    <View style={styles.escudoPlaceholder}>
                      <Ionicons name="shield-outline" size={32} color={theme.colors.textMuted} />
                      <Text style={styles.escudoPlaceholderText}>{rival || t('matchSheet.fields.selectRival')}</Text>
                    </View>
                  )
                ) : (
                  // Mostrar mi equipo si local
                  selectedTeam?.escudo ? (
                    <Image source={{ uri: selectedTeam.escudo }} style={styles.escudoImage} />
                  ) : (
                    <View style={styles.escudoPlaceholder}>
                      <Ionicons name="shield-outline" size={32} color={theme.colors.textMuted} />
                      <Text style={styles.escudoPlaceholderText}>{selectedTeam?.nombre || ''}</Text>
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
                {isAwayLocation ? t('matchSheet.fields.myTeamShield') : t('matchSheet.fields.rivalShield')}
              </Text>
              <View style={styles.escudoButton}>
                {isAwayLocation ? (
                  // Mostrar mi equipo si visitante
                  selectedTeam?.escudo ? (
                    <Image source={{ uri: selectedTeam.escudo }} style={styles.escudoImage} />
                  ) : (
                    <View style={styles.escudoPlaceholder}>
                      <Ionicons name="shield-outline" size={32} color={theme.colors.textMuted} />
                      <Text style={styles.escudoPlaceholderText}>{selectedTeam?.nombre || ''}</Text>
                    </View>
                  )
                ) : (
                  // Mostrar rival si local
                  rivalEscudo ? (
                    <Image source={{ uri: rivalEscudo }} style={styles.escudoImage} />
                  ) : (
                    <View style={styles.escudoPlaceholder}>
                      <Ionicons name="shield-outline" size={32} color={theme.colors.textMuted} />
                      <Text style={styles.escudoPlaceholderText}>{rival || t('matchSheet.fields.selectRival')}</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          </View>

          {/* Selector de Rival */}
          <RivalSelector
            selectedRivalId={rivalId}
            selectedRivalName={rival}
            onSelectRival={(id, nombre, escudo) => {
              setRivalId(id);
              setRival(nombre);
              setRivalEscudo(escudo);
            }}
            teamId={selectedTeam?._id}
            placeholder={t('matchSheet.fields.rivalRequired')}
          />
          
          {/* Ubicación */}
          <TouchableOpacity 
            style={styles.selector} 
            onPress={onShowUbicacionModal}
          >
            <Text style={[styles.selectorText, ubicacion && styles.selectorTextSelected]}>
              {getUbicacionDisplay(ubicacion)}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Competición */}
          {competicion !== undefined && (
            <View style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { value: 'liga', label: t('tournaments.league'), icon: 'emoji-events', color: theme.colors.primary },
                  { value: 'torneo', label: t('tournaments.tournament'), icon: 'military-tech', color: '#7C3AED' },
                  { value: 'amistoso', label: t('tournaments.friendly'), icon: 'handshake', color: theme.colors.success },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setCompeticion(opt.value);
                      if (opt.value !== 'torneo') setTorneoId(null);
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: competicion === opt.value ? opt.color : theme.colors.border,
                      backgroundColor: competicion === opt.value ? opt.color + '12' : theme.colors.background,
                    }}
                  >
                    <Ionicons name={opt.icon === 'emoji-events' ? 'trophy' : opt.icon === 'military-tech' ? 'ribbon' : 'people'} size={16} color={competicion === opt.value ? opt.color : theme.colors.textSecondary} />
                    <Text style={{ fontSize: 12, fontWeight: competicion === opt.value ? '700' : '500', color: competicion === opt.value ? opt.color : theme.colors.textSecondary }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {competicion === 'torneo' && (
                <TouchableOpacity
                  style={[styles.selector, { marginTop: 8 }]}
                  onPress={onShowTorneoModal}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="ribbon" size={18} color="#7C3AED" />
                    <Text style={[styles.selectorText, torneoId && styles.selectorTextSelected]}>
                      {torneoId
                        ? (tournaments.find(tt => tt._id === torneoId)?.nombre || t('tournaments.selectTournament'))
                        : t('tournaments.selectTournament')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Alineaciones */}
          <View style={styles.row}>
            <TouchableOpacity 
              style={[styles.selector, styles.inputHalf]} 
              onPress={onShowAlineacionModal}
            >
              <Text style={[styles.selectorText, alineacion && styles.selectorTextSelected]}>
                {alineacion || t('matchSheet.modals.selectFormation')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.selector, styles.inputHalf]} 
              onPress={onShowAlineacionRivalModal}
            >
              <Text style={[styles.selectorText, alineacionRival && styles.selectorTextSelected]}>
                {alineacionRival || t('matchSheet.modals.selectRivalFormation')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          
          {/* Selector de Jornada */}
          <TouchableOpacity 
            style={styles.selector} 
            onPress={onShowJornadaModal}
          >
            <Text style={[styles.selectorText, jornada && styles.selectorTextSelected]}>
              {jornada ? `${t('matchSheet.fields.matchday')} ${jornada}` : t('matchSheet.fields.selectMatchday')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          
          {/* Fecha y Hora */}
          <TouchableOpacity 
            style={styles.selector} 
            onPress={onShowDateTimePicker}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textMuted} />
              <Text style={[styles.selectorText, styles.selectorTextSelected]}>
                {fechaHora.toLocaleDateString('es-ES', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          
          <Text style={styles.subTitle}>{t('matchSheet.fields.result')}</Text>
          
          {/* Goles - según ubicación */}
          <View style={styles.row}>
            <View style={[styles.inputHalf]}>
              <Text style={styles.inputLabel}>
                {isAwayLocation ? t('matchSheet.fields.goalsAgainst') : t('matchSheet.fields.goalsFor')}
              </Text>
              <View style={styles.descuentoSelector}>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => {
                    if (isAwayLocation) {
                      setGolesContra(prev => String(Math.max(0, Number(prev) - 1)));
                    } else {
                      setGolesFavor(prev => String(Math.max(0, Number(prev) - 1)));
                    }
                  }}
                >
                  <Ionicons name="remove" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
                <Text style={styles.descuentoValue}>
                  {isAwayLocation ? golesContra : golesFavor}
                </Text>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => {
                    if (isAwayLocation) {
                      setGolesContra(prev => String(Math.min(99, Number(prev) + 1)));
                    } else {
                      setGolesFavor(prev => String(Math.min(99, Number(prev) + 1)));
                    }
                  }}
                >
                  <Ionicons name="add" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.inputHalf]}>
              <Text style={styles.inputLabel}>
                {isAwayLocation ? t('matchSheet.fields.goalsFor') : t('matchSheet.fields.goalsAgainst')}
              </Text>
              <View style={styles.descuentoSelector}>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => {
                    if (isAwayLocation) {
                      setGolesFavor(prev => String(Math.max(0, Number(prev) - 1)));
                    } else {
                      setGolesContra(prev => String(Math.max(0, Number(prev) - 1)));
                    }
                  }}
                >
                  <Ionicons name="remove" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
                <Text style={styles.descuentoValue}>
                  {isAwayLocation ? golesFavor : golesContra}
                </Text>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => {
                    if (isAwayLocation) {
                      setGolesFavor(prev => String(Math.min(99, Number(prev) + 1)));
                    } else {
                      setGolesContra(prev => String(Math.min(99, Number(prev) + 1)));
                    }
                  }}
                >
                  <Ionicons name="add" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {/* Badge de resultado */}
          {resultado && (
            <View style={styles.resultadoDisplay}>
              <Text style={styles.resultadoLabel}>{t('matchSheet.fields.result')}:</Text>
              <View style={[
                styles.resultadoBadge,
                resultado === 'Victoria' && { backgroundColor: theme.colors.success },
                resultado === 'Empate' && { backgroundColor: theme.colors.warning },
                resultado === 'Derrota' && { backgroundColor: theme.colors.error },
              ]}>
                <Text style={styles.resultadoText}>
                  {translateResult ? translateResult(resultado) : resultado}
                </Text>
              </View>
            </View>
          )}
          
          <Text style={styles.subTitle}>{t('matchSheet.addedTime.title')}</Text>
          
          {/* Tiempo de descuento */}
          <View style={styles.row}>
            <View style={[styles.inputHalf]}>
              <Text style={styles.inputLabel}>{t('matchSheet.addedTime.firstHalfMin')}</Text>
              <View style={styles.descuentoSelector}>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => setDescuentoPrimerTiempo(prev => String(Math.max(0, Number(prev) - 1)))}
                >
                  <Ionicons name="remove" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
                <Text style={styles.descuentoValue}>{descuentoPrimerTiempo}</Text>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => setDescuentoPrimerTiempo(prev => String(Math.min(15, Number(prev) + 1)))}
                >
                  <Ionicons name="add" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.inputHalf]}>
              <Text style={styles.inputLabel}>{t('matchSheet.addedTime.secondHalfMin')}</Text>
              <View style={styles.descuentoSelector}>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => setDescuentoSegundoTiempo(prev => String(Math.max(0, Number(prev) - 1)))}
                >
                  <Ionicons name="remove" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
                <Text style={styles.descuentoValue}>{descuentoSegundoTiempo}</Text>
                <TouchableOpacity
                  style={styles.descuentoButton}
                  onPress={() => setDescuentoSegundoTiempo(prev => String(Math.min(15, Number(prev) + 1)))}
                >
                  <Ionicons name="add" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <Text style={styles.descuentoHint}>
            {t('matchSheet.addedTime.totalDuration', { 
              minutes: (selectedTeam?.tiempoPorParte || 45) * 2 + Number(descuentoPrimerTiempo || 0) + Number(descuentoSegundoTiempo || 0) 
            })}
          </Text>
        </View>
      </View>

      {/* Card de Convocatoria y Alineación */}
      <View style={IS_MOBILE ? styles.cardMobile : styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="people" size={24} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>{t('matchSheet.sections.callupAndLineup')}</Text>
        </View>

        <View style={styles.cardContent}>
          {/* Convocados */}
          <TouchableOpacity 
            style={styles.playerSelector} 
            onPress={onShowConvocadosModal}
          >
            <View style={styles.playerSelectorHeader}>
              <Ionicons name="people" size={20} color={theme.colors.success} />
              <Text style={styles.playerSelectorTitle}>{t('matchSheet.fields.called')} ({convocados.length})</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          
          {convocados.length > 0 && (
            <View style={styles.selectedPlayersContainer}>
              {convocados.map(playerId => (
                <View key={playerId} style={styles.playerChip}>
                  <Text style={styles.playerChipText}>{getPlayerName ? getPlayerName(playerId) : playerId}</Text>
                </View>
              ))}
            </View>
          )}

          {/* No Convocados */}
          <TouchableOpacity 
            style={styles.playerSelector} 
            onPress={onShowNoConvocadosModal}
          >
            <View style={styles.playerSelectorHeader}>
              <Ionicons name="close-circle" size={20} color={theme.colors.error} />
              <Text style={styles.playerSelectorTitle}>{t('matchSheet.fields.notCalled')} ({noConvocados.length})</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          
          {noConvocados.length > 0 && (
            <View style={styles.selectedPlayersContainer}>
              {noConvocados.map(playerId => (
                <View key={playerId} style={styles.playerChip}>
                  <Text style={styles.playerChipText}>{getPlayerName ? getPlayerName(playerId) : playerId}</Text>
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
              formation={alineacion || '1-4-4-2'}
              onTitularesChange={setAlineacionTitulares}
              onSuplentesChange={setAlineacionSuplentes}
              jugadoresPorEquipo={selectedTeam?.jugadoresPorEquipo || 11}
            />
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
                {Object.values(alineacionTitulares).filter(Boolean).map((playerId, idx) => {
                  const player = players.find(p => p._id === playerId);
                  if (!player) return null;
                  return (
                    <View key={playerId} style={styles.starterSubChip}>
                      <View style={[styles.starterSubDorsal, { backgroundColor: theme.colors.success }]}>
                        <Text style={styles.starterSubDorsalText}>{player.dorsal || '-'}</Text>
                      </View>
                      <Text style={styles.starterSubName}>
                        {getPlayerFullName ? getPlayerFullName(player) : (getPlayerName ? getPlayerName(playerId) : player.nombre)}
                      </Text>
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
                      <Text style={styles.starterSubName}>
                        {getPlayerFullName ? getPlayerFullName(player) : (getPlayerName ? getPlayerName(playerId) : player.nombre)}
                      </Text>
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
                {t('matchSheet.emptyLineupHint')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Card de Notas del Entrenador */}
      <View style={IS_MOBILE ? styles.cardMobile : styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text" size={24} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>{t('matchSheet.sections.coachNotes')}</Text>
        </View>

        <View style={styles.cardContent}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('matchSheet.fields.notesPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            value={notasEntrenador}
            onChangeText={setNotasEntrenador}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Card de Eventos del Partido */}
      <View style={IS_MOBILE ? styles.cardMobile : styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="flash" size={24} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>{t('matchSheet.sections.matchEvents')}</Text>
        </View>

        <View style={styles.cardContent}>
          {/* Goles */}
          <TouchableOpacity 
            style={styles.eventSelector} 
            onPress={onShowGolesModal}
          >
            <View style={styles.eventSelectorHeader}>
              <Ionicons name="football" size={20} color={theme.colors.success} />
              <Text style={styles.eventSelectorTitle}>{t('matchSheet.fields.goals')} ({goles.length})</Text>
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
                const jugador = players.find(p => p._id === gol.jugador);
                const originalIndex = goles.indexOf(gol);
                return (
                  <View key={originalIndex} style={styles.eventChip}>
                    <Text style={styles.eventChipText}>
                      {gol.minuto}' - {jugador ? (getPlayerFullName ? getPlayerFullName(jugador) : jugador.nombre) : 'Jugador'}
                      {gol.tipo && ` (${gol.tipo})`}
                    </Text>
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
            onPress={onShowTarjetasModal}
          >
            <View style={styles.eventSelectorHeader}>
              <Ionicons name="square" size={20} color="#FFC107" />
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
                const jugador = players.find(p => p._id === tarjeta.jugador);
                const originalIndex = tarjetasAmarillas.indexOf(tarjeta);
                return (
                  <View key={`a-${originalIndex}`} style={styles.eventChip}>
                    <View style={[styles.cardIndicator, { backgroundColor: '#FFC107' }]} />
                    <Text style={styles.eventChipText}>
                      {tarjeta.minuto}' - {jugador ? (getPlayerFullName ? getPlayerFullName(jugador) : jugador.nombre) : 'Jugador'}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      const removedCard = tarjetasAmarillas[originalIndex];
                      const removedJugadorId = typeof removedCard.jugador === 'object' ? removedCard.jugador._id : removedCard.jugador;
                      const newAmarillas = tarjetasAmarillas.filter((_, i) => i !== originalIndex);
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
                const jugador = players.find(p => p._id === tarjeta.jugador);
                const originalIndex = tarjetasRojas.indexOf(tarjeta);
                const isAutoDobleAmarilla = tarjeta.motivo === 'Doble amarilla';
                return (
                  <View key={`r-${originalIndex}`} style={styles.eventChip}>
                    <View style={[styles.cardIndicator, { backgroundColor: theme.colors.error }]} />
                    <Text style={styles.eventChipText}>
                      {tarjeta.minuto}' - {jugador ? (getPlayerFullName ? getPlayerFullName(jugador) : jugador.nombre) : 'Jugador'}{isAutoDobleAmarilla ? ` (${t('matchSheet.cardTypes.doubleYellow') || 'Doble amarilla'})` : ''}{tarjeta.partidosSancion > 0 ? ` [${tarjeta.partidosSancion}${t('matchSheet.modals.banMatchesShort')}]` : ''}
                    </Text>
                    {!isAutoDobleAmarilla && (
                    <TouchableOpacity onPress={() => setTarjetasRojas(tarjetasRojas.filter((_, i) => i !== originalIndex))}>
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
            onPress={onShowCambiosModal}
          >
            <View style={styles.eventSelectorHeader}>
              <Ionicons name="swap-horizontal" size={20} color="#9C27B0" />
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
                const jugadorSale = players.find(p => p._id === cambio.sale);
                const jugadorEntra = players.find(p => p._id === cambio.entra);
                const originalIndex = cambios.indexOf(cambio);
                return (
                  <View key={originalIndex} style={styles.eventChip}>
                    <Text style={styles.eventChipText}>
                      {cambio.minuto}' - {jugadorSale ? (getPlayerFullName ? getPlayerFullName(jugadorSale) : jugadorSale.nombre) : t('matchSheet.events.out')} 
                      {' → '}{jugadorEntra ? (getPlayerFullName ? getPlayerFullName(jugadorEntra) : jugadorEntra.nombre) : t('matchSheet.events.in')}
                    </Text>
                    <TouchableOpacity onPress={() => setCambios(cambios.filter((_, i) => i !== originalIndex))}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Goles del Rival */}
          <TouchableOpacity 
            style={[styles.eventSelector, { borderLeftWidth: 3, borderLeftColor: theme.colors.error }]} 
            onPress={onShowGolesRivalModal}
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
                  <View key={originalIndex} style={[styles.eventChip, { backgroundColor: theme.colors.errorSoft, borderColor: theme.colors.errorSoft }]}>
                    <Text style={[styles.eventChipText, { color: theme.colors.errorSoftText }]}>
                      {gol.minuto}' - {rival || t('matchSheet.rivalGoals.title')}
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
      </View>
    </KeyboardAwareScrollView>
  );
};

const makeStyles = (theme) => StyleSheet.create({
  formBody: {
    flex: 1,
  },
  formContent: {
    padding: 24,
  },
  formContentMobile: {
    padding: 16,
  },
  card: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardMobile: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  cardContent: {
    gap: 16,
  },
  escudosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    marginBottom: 8,
  },
  escudoContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  escudoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  escudoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  escudoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  escudoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  escudoPlaceholderText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textMuted,
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
    color: theme.colors.textSecondary,
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
  descuentoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
  },
  descuentoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  descuentoValue: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  descuentoHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
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
  resultadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resultadoText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
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
  playerSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerSelectorTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  selectedPlayersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
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
  emptyLineupMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    gap: 8,
  },
  emptyLineupText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    flex: 1,
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
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  starterSubDorsal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterSubDorsalText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  starterSubName: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
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
});

export default MatchSheetFormContent;
