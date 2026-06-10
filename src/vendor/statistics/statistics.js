import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  Modal,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import i18n from '@/i18n';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import AppLayout from '@/vendor/shared/appLayout';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { fetchMatchSheetsByTeam } from '@/store/slices/matchSheet/matchSheetThunks';
import {
  generateTeamStatsPdf,
  generatePlayersStatsPdf,
  generateInjuriesStatsPdf,
  generateCombinedStatsPdf,
  generateWeeklyAttendancePdf,
} from './pdf';
import { fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';
import { fetchInjuriesByTeam } from '@/store/slices/injury/injuryThunks';
import { fetchEntrenamientosPorEquipo } from '@/store/slices/session/sessionThunks';
import { fetchTournamentsByTeam } from '@/store/slices/tournament/tournamentThunks';
import InjuryStatistics from '@/vendor/injuries/injuryStatistics';
// PlayerProfile RN aún no portado a vendor; stub para no crashear el modal.
const PlayerProfile = () => null;
import { getPlayerFullName } from '@/utils/playerHelpers';

// Helper para obtener locale basado en i18n
const getLocale = () => (i18n.language === 'en' ? 'en-US' : 'es-ES');

export default function Statistics({ navigation: navigationProp }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const route = useRoute();
  const navigationHook = useNavigation();
  const navigation = navigationProp || navigationHook;
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const isMobile = viewportWidth < 768;
  const styles = useMemo(() => makeStyles(theme, isMobile), [theme, isMobile]);
  const matchSheets = useSelector((state) => state.matchSheet.matchSheets) || [];
  const loading = useSelector((state) => state.matchSheet.loading);
  const temporada = useSelector((state) => state.season.season);
  const teams = useSelector((state) => state.team.teams) || [];
  const players = useSelector((state) => state.player.players) || [];
  const injuries = useSelector((state) => state.injury.injuries) || [];
  const trainingSessions = useSelector((state) => state.session.session) || [];
  const tournaments = useSelector((state) => state.tournament?.tournaments) || [];

  const [activeTab, setActiveTab] = useState('team'); // 'team', 'players', 'injuries'
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [sortBy, setSortBy] = useState('minutes'); // 'minutes', 'goals', 'matches', 'rating'
  const [sortOrder, setSortOrder] = useState('desc');
  const [weeklyDateRange, setWeeklyDateRange] = useState({ start: null, end: null });
  const [tempDateRange, setTempDateRange] = useState({ start: null, end: null });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]); // Filter by players (empty = all)
  const [showPlayerFilterModal, setShowPlayerFilterModal] = useState(false);
  const [playerSearch, setPlayerSearch] = useState(''); // Búsqueda de jugadores
  const [competitionFilter, setCompetitionFilter] = useState('total'); // 'total' | tournamentId
  const [selectedTournamentId, setSelectedTournamentId] = useState(null); // kept for backward compat

  // Estado para el perfil del jugador
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [selectedPlayerForProfile, setSelectedPlayerForProfile] = useState(null);

  // Manejar navegación de vuelta a la pestaña de jugadores
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  useEffect(() => {
    if (temporada?._id) {
      dispatch(fetchEquiposTemporada({ season: temporada._id }));
    }
  }, [temporada, dispatch]);

  useEffect(() => {
    if (teams && teams.length > 0) {
      const team = teams.find((t) => t.seleccionado === true);
      setSelectedTeam(team);
      if (team?._id) {
        dispatch(fetchMatchSheetsByTeam(team._id));
        dispatch(fetchJugadoresEquipo({ team: team._id }));
        dispatch(fetchInjuriesByTeam({ team: team._id }));
        dispatch(fetchEntrenamientosPorEquipo({ team: team._id }));
        dispatch(fetchTournamentsByTeam(team._id));
      }
    }
  }, [teams, dispatch]);

  // Recargar datos cuando la pantalla recibe el foco (después de editar una ficha de partido)
  useFocusEffect(
    useCallback(() => {
      if (selectedTeam?._id) {
        dispatch(fetchMatchSheetsByTeam(selectedTeam._id));
      }
    }, [selectedTeam, dispatch]),
  );

  // Crear una key para forzar recalculo cuando los datos cambian
  const matchSheetsKey = useMemo(() => {
    return matchSheets
      .map((m) => `${m._id}-${m.golesFavor}-${m.golesContra}-${m.resultado}`)
      .join(',');
  }, [matchSheets]);

  // Filter matchSheets by selected tournament or amistosos
  const filteredMatchSheets = useMemo(() => {
    if (competitionFilter === 'total') return matchSheets;
    if (competitionFilter === 'amistosos') {
      return matchSheets.filter((m) => {
        const mTourneyId = m.torneoId?._id || m.torneoId;
        return !mTourneyId || m.competicion === 'amistoso';
      });
    }
    // competitionFilter is a tournament ID
    return matchSheets.filter((m) => {
      const mTourneyId = m.torneoId?._id || m.torneoId;
      return mTourneyId === competitionFilter;
    });
  }, [matchSheets, competitionFilter]);

  const stats = useMemo(() => {
    if (!filteredMatchSheets || !players) return null;

    // Team Stats
    const teamStats = {
      matches: 0, // Se calculará después con isMatchPlayed
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      formations: {},
      totalSubs: 0,
      cleanSheets: 0,
      totalInjuries: injuries.length,
      activeInjuries: (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return injuries.filter((i) => {
          // Si tiene fechaFin y está en el futuro = activa
          if (i.fechaFin) {
            const endDate = new Date(i.fechaFin);
            return endDate >= today;
          }
          // Si no tiene fechaFin pero tiene fechaFinPrevista en el futuro = activa
          if (i.fechaFinPrevista) {
            const estimatedEndDate = new Date(i.fechaFinPrevista);
            return estimatedEndDate >= today;
          }
          // Sin fechas definidas = activa
          return true;
        }).length;
      })(),
    };

    // Player Stats Map
    const playerStatsMap = {};

    // Calculate total past training sessions (fecha < today)
    const today = new Date();
    const pastTrainingSessions = trainingSessions.filter((session) => {
      if (!session.fecha) return false;
      return new Date(session.fecha) < today;
    });

    players.forEach((p) => {
      // Count training sessions attended by this player
      const trainingsAttended = pastTrainingSessions.filter((session) => {
        const jugadoresIds = (session.jugadores || []).map((j) =>
          typeof j === 'object' ? j._id : j,
        );
        return jugadoresIds.includes(p._id);
      }).length;

      playerStatsMap[p._id] = {
        id: p._id,
        name: getPlayerFullName(p),
        position: p.posicion || t('statistics.players.noPosition'),
        number: p.dorsal || '-',
        matches: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        doubleYellowCards: 0,
        starter: 0,
        subIn: 0,
        subOut: 0,
        notCalled: 0,
        bench: 0, // Called but didn't play
        injuries: injuries.filter(
          (i) => (typeof i.jugador === 'object' ? i.jugador._id : i.jugador) === p._id,
        ).length,
        totalTrainingSessions: pastTrainingSessions.length,
        trainingsAttended: trainingsAttended,
        attendancePercentage:
          pastTrainingSessions.length > 0
            ? Math.round((trainingsAttended / pastTrainingSessions.length) * 100)
            : 0,
      };
    });

    // Helper para verificar si un partido ya se ha jugado
    const isMatchPlayed = (match) => {
      // Un partido se considera jugado si la fecha del partido es anterior a hoy a la hora actual
      if (match.fechaHora && new Date(match.fechaHora) < new Date()) return true;
      return false;
    };

    // Procesar solo partidos jugados
    const playedMatches = filteredMatchSheets.filter((match) => isMatchPlayed(match));
    teamStats.matches = playedMatches.length;

    playedMatches.forEach((match) => {
      // Team Stats - Calcular resultado basado en goles si no hay resultado explícito
      let matchResult = match.resultado;
      const golesFavor = match.golesFavor;
      const golesContra = match.golesContra;

      // Si no hay resultado pero hay goles definidos (incluyendo 0), calcular resultado
      if (
        !matchResult &&
        golesFavor !== null &&
        golesFavor !== undefined &&
        golesContra !== null &&
        golesContra !== undefined
      ) {
        if (golesFavor > golesContra) matchResult = 'Victoria';
        else if (golesFavor < golesContra) matchResult = 'Derrota';
        else matchResult = 'Empate';
      }

      if (matchResult === 'Victoria') teamStats.wins++;
      else if (matchResult === 'Empate') teamStats.draws++;
      else if (matchResult === 'Derrota') teamStats.losses++;

      teamStats.goalsFor += golesFavor || 0;
      teamStats.goalsAgainst += golesContra || 0;

      // Solo contar portería a cero si los goles contra están definidos y son 0
      if (golesContra === 0) teamStats.cleanSheets++;

      if (match.alineacion) {
        teamStats.formations[match.alineacion] = (teamStats.formations[match.alineacion] || 0) + 1;
      }

      if (match.cambios) {
        teamStats.totalSubs += match.cambios.length;
      }

      // Player Participation
      const starters = (match.alineacionTitulares || []).map((p) =>
        typeof p === 'object' ? p._id : p,
      );
      const subs = (match.alineacionSuplentes || []).map((p) =>
        typeof p === 'object' ? p._id : p,
      );
      const notCalled = (match.noConvocados || []).map((p) => (typeof p === 'object' ? p._id : p));

      // Helper para parsear minuto que puede ser string como "45+2", "90+3" o número
      const parseMinuto = (minuto, defaultValue = 90) => {
        if (typeof minuto === 'number') return minuto;
        if (typeof minuto === 'string') {
          // Formato nuevo: "45+2" significa minuto 45 + 2 de descuento
          if (minuto.includes('+')) {
            const parts = minuto.split('+');
            const baseMinuto = parseInt(parts[0]);
            const addedTime = parseInt(parts[1]) || 0;
            if (!isNaN(baseMinuto)) {
              return baseMinuto + addedTime;
            }
          }
          // Formato simple: "60"
          const parsed = parseInt(minuto);
          return isNaN(parsed) ? defaultValue : parsed;
        }
        return defaultValue;
      };

      // Obtener tiempo total del partido incluyendo tiempo de descuento
      const tiempoPorParte = match.equipo?.tiempoPorParte || 45;
      const descuentoPrimerTiempo = match.descuentoPrimerTiempo || 0;
      const descuentoSegundoTiempo = match.descuentoSegundoTiempo || 0;
      const tiempoPrimeraParte = tiempoPorParte + descuentoPrimerTiempo;
      const tiempoSegundaParte = tiempoPorParte + descuentoSegundoTiempo;
      const tiempoTotal = tiempoPrimeraParte + tiempoSegundaParte;

      // Identify players who played (starters + subs in)
      const playedIds = new Set([...starters]);

      // Helper para calcular minutos jugados considerando tiempo de descuento
      // Si un cambio ocurre en el minuto X:
      // - Si X <= tiempoPorParte (primera parte): el que sale jugó X minutos
      // - Si X > tiempoPorParte (segunda parte): el que sale jugó tiempoPrimeraParte + (X - tiempoPorParte) minutos
      // Para el que entra:
      // - Si entra en minuto X <= tiempoPorParte: jugará tiempoTotal - X minutos (aproximadamente)
      // - Si entra en minuto X > tiempoPorParte: jugará tiempoTotal - (tiempoPrimeraParte + (X - tiempoPorParte))
      const calcularMinutosJugador = (minutoSalida, esTitular) => {
        const minuto = parseMinuto(minutoSalida, tiempoTotal);
        if (minuto <= tiempoPorParte) {
          // Cambio en primera parte: no incluye descuento de primera parte
          return minuto;
        } else {
          // Cambio en segunda parte: incluye toda la primera parte con descuento
          return tiempoPrimeraParte + (minuto - tiempoPorParte);
        }
      };

      const calcularMinutosDesdeEntrada = (minutoEntrada) => {
        const minuto = parseMinuto(minutoEntrada, tiempoTotal);
        if (minuto <= tiempoPorParte) {
          // Entró en primera parte: jugará el resto de primera + toda segunda con descuentos
          return tiempoPorParte - minuto + descuentoPrimerTiempo + tiempoSegundaParte;
        } else {
          // Entró en segunda parte: jugará el resto de segunda con descuento
          return tiempoSegundaParte - (minuto - tiempoPorParte);
        }
      };

      // Process Changes to track sub ins/outs
      (match.cambios || []).forEach((cambio) => {
        const saleId = typeof cambio.sale === 'object' ? cambio.sale._id : cambio.sale;
        const entraId = typeof cambio.entra === 'object' ? cambio.entra._id : cambio.entra;

        playedIds.add(entraId);

        if (playerStatsMap[saleId]) {
          playerStatsMap[saleId].subOut++;
          // Minute logic for starters subbed out
          if (starters.includes(saleId)) {
            playerStatsMap[saleId].minutes += calcularMinutosJugador(cambio.minuto, true);
          }
        }

        if (playerStatsMap[entraId]) {
          playerStatsMap[entraId].subIn++;
          playerStatsMap[entraId].minutes += calcularMinutosDesdeEntrada(cambio.minuto);
        }
      });

      // Starters who finished the game (not subbed out)
      starters.forEach((pid) => {
        if (playerStatsMap[pid]) {
          playerStatsMap[pid].starter++;
          playerStatsMap[pid].matches++;

          const wasSubbedOut = (match.cambios || []).some((c) => {
            const sId = typeof c.sale === 'object' ? c.sale._id : c.sale;
            return sId === pid;
          });

          if (!wasSubbedOut) {
            playerStatsMap[pid].minutes += tiempoTotal;
          }
        }
      });

      // Subs who played but weren't subbed out
      playedIds.forEach((pid) => {
        if (playerStatsMap[pid] && !starters.includes(pid)) {
          // If played but not starter -> Sub In
          playerStatsMap[pid].matches++;
        }
      });

      // Bench (Subs who didn't play)
      subs.forEach((pid) => {
        if (playerStatsMap[pid] && !playedIds.has(pid)) {
          playerStatsMap[pid].bench++;
        }
      });

      // Not Called
      notCalled.forEach((pid) => {
        if (playerStatsMap[pid]) {
          playerStatsMap[pid].notCalled++;
        }
      });
      // Implicit not called
      const allInMatch = new Set([...starters, ...subs, ...notCalled]);
      players.forEach((p) => {
        if (!allInMatch.has(p._id)) {
          playerStatsMap[p._id].notCalled++;
        }
      });

      // Goals & Cards & Minutes Override from Eventos if available
      if (match.eventos && match.eventos.length > 0) {
        match.eventos.forEach((evento) => {
          const pid = typeof evento.player === 'object' ? evento.player._id : evento.player;
          if (playerStatsMap[pid]) {
            // Override minutes with precise data from backend if needed, or just accumulate?
            // The logic above calculates minutes based on changes.
            // If 'eventos' has minutes, it might be safer to use it if we trust it more.
            // But 'eventos' is newly added. Let's stick to the calculated minutes for now unless we want to fully switch.
            // Actually, let's use 'eventos' for Goals and Cards as they are definitive there.
            // And let's ADD goals from events (since we don't accumulate them above).

            // Wait, if we iterate events, we might double count if we also iterate match.goles?
            // No, we removed the match.goles iteration in this block.

            playerStatsMap[pid].goals += evento.goles || 0;
            if (evento.tarjetaAmarilla) playerStatsMap[pid].yellowCards++;
            if (evento.tarjetaRoja) playerStatsMap[pid].redCards++;
          }
        });
      } else {
        // Fallback for old match sheets without 'eventos'
        (match.goles || []).forEach((gol) => {
          const pid = typeof gol.jugador === 'object' ? gol.jugador._id : gol.jugador;
          if (playerStatsMap[pid]) playerStatsMap[pid].goals++;

          // Contar asistencias
          if (gol.asistente) {
            const assistId = typeof gol.asistente === 'object' ? gol.asistente._id : gol.asistente;
            if (playerStatsMap[assistId]) playerStatsMap[assistId].assists++;
          }
        });

        // Detect double yellow red cards
        const doubleYellowRedIds = new Set();
        (match.tarjetasRojas || []).forEach((card) => {
          if (card.motivo === 'Doble amarilla') {
            const pid = typeof card.jugador === 'object' ? card.jugador._id : card.jugador;
            if (pid) doubleYellowRedIds.add(pid);
          }
        });

        (match.tarjetasAmarillas || []).forEach((card) => {
          const pid = typeof card.jugador === 'object' ? card.jugador._id : card.jugador;
          if (playerStatsMap[pid]) {
            playerStatsMap[pid].yellowCards++;
            if (doubleYellowRedIds.has(pid)) {
              playerStatsMap[pid].doubleYellowCards++;
            }
          }
        });

        (match.tarjetasRojas || []).forEach((card) => {
          const pid = typeof card.jugador === 'object' ? card.jugador._id : card.jugador;
          if (playerStatsMap[pid]) playerStatsMap[pid].redCards++;
        });
      }

      // También contar asistencias de match.goles incluso si hay eventos (los eventos no tienen asistencias)
      (match.goles || []).forEach((gol) => {
        if (gol.asistente) {
          const assistId = typeof gol.asistente === 'object' ? gol.asistente._id : gol.asistente;
          if (playerStatsMap[assistId]) {
            // Solo contar si no lo hemos contado ya en el bloque else
            if (match.eventos && match.eventos.length > 0) {
              playerStatsMap[assistId].assists++;
            }
          }
        }
      });
    });

    // Helper function to get position priority for sorting
    const getPositionPriority = (position) => {
      const pos = (position || '').toLowerCase();
      if (pos.includes('portero') || pos.includes('goalkeeper') || pos.includes('arquero'))
        return 1;
      if (
        pos.includes('defensa') ||
        pos.includes('defender') ||
        pos.includes('lateral') ||
        pos.includes('central') ||
        pos.includes('líbero') ||
        pos.includes('libero') ||
        pos.includes('zaguero') ||
        pos.includes('carrilero')
      )
        return 2;
      if (
        pos.includes('centro') ||
        pos.includes('medio') ||
        pos.includes('midfielder') ||
        pos.includes('pivote') ||
        pos.includes('interior') ||
        pos.includes('extremo') ||
        pos.includes('volante')
      )
        return 3;
      if (
        pos.includes('delantero') ||
        pos.includes('forward') ||
        pos.includes('atacante') ||
        pos.includes('punta') ||
        pos.includes('ariete') ||
        pos.includes('striker')
      )
        return 4;
      return 5; // Sin posición
    };

    // Sort players
    const sortedPlayers = Object.values(playerStatsMap).sort((a, b) => {
      if (sortBy === 'position') {
        const priorityA = getPositionPriority(a.position);
        const priorityB = getPositionPriority(b.position);
        return sortOrder === 'desc' ? priorityB - priorityA : priorityA - priorityB;
      }
      const valA = a[sortBy];
      const valB = b[sortBy];
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    // Most used formation
    let mostUsedFormation = '-';
    let maxCount = 0;
    Object.entries(teamStats.formations).forEach(([form, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedFormation = form;
      }
    });

    // --- Rival Goal Statistics ---
    const rivalGoalStats = (() => {
      // Collect all rival goal minutes from played matches that have golesRival data
      const matchesWithData = playedMatches.filter((m) => m.golesRival && m.golesRival.length > 0);
      const allRivalGoalMinutes = [];
      const firstGoalMinutes = []; // first rival goal per match

      matchesWithData.forEach((match) => {
        const minutes = match.golesRival
          .map((g) => {
            if (!g.minuto) return null;
            const str = String(g.minuto);
            if (str.includes('+')) {
              const parts = str.split('+');
              const base = parseInt(parts[0]);
              const extra = parseInt(parts[1]) || 0;
              return isNaN(base) ? null : base + extra;
            }
            const parsed = parseInt(str);
            return isNaN(parsed) ? null : parsed;
          })
          .filter((m) => m !== null);

        allRivalGoalMinutes.push(...minutes);
        if (minutes.length > 0) {
          firstGoalMinutes.push(Math.min(...minutes));
        }
      });

      if (allRivalGoalMinutes.length === 0) {
        return {
          hasData: false,
          matchesWithData: matchesWithData.length,
          totalRivalGoals: 0,
        };
      }

      // Average first rival goal minute
      const avgFirstGoal =
        firstGoalMinutes.length > 0
          ? (firstGoalMinutes.reduce((a, b) => a + b, 0) / firstGoalMinutes.length).toFixed(1)
          : null;

      // Most common rival goal minutes (histogram in 15-min buckets)
      const buckets = { '1-15': 0, '16-30': 0, '31-45': 0, '46-60': 0, '61-75': 0, '76-90+': 0 };
      allRivalGoalMinutes.forEach((m) => {
        if (m <= 15) buckets['1-15']++;
        else if (m <= 30) buckets['16-30']++;
        else if (m <= 45) buckets['31-45']++;
        else if (m <= 60) buckets['46-60']++;
        else if (m <= 75) buckets['61-75']++;
        else buckets['76-90+']++;
      });

      // Find most dangerous period
      let mostDangerousPeriod = '1-15';
      let mostDangerousCount = 0;
      Object.entries(buckets).forEach(([period, count]) => {
        if (count > mostDangerousCount) {
          mostDangerousCount = count;
          mostDangerousPeriod = period;
        }
      });

      // Goals per half
      const tiempoPorParteDefault = 45;
      const firstHalfGoals = allRivalGoalMinutes.filter((m) => m <= tiempoPorParteDefault).length;
      const secondHalfGoals = allRivalGoalMinutes.filter((m) => m > tiempoPorParteDefault).length;

      // Avg rival goals per match (across ALL played matches, not just those with data)
      const avgPerMatch =
        playedMatches.length > 0
          ? (allRivalGoalMinutes.length / playedMatches.length).toFixed(1)
          : '0';

      // Earliest and latest rival goal
      const earliest = Math.min(...allRivalGoalMinutes);
      const latest = Math.max(...allRivalGoalMinutes);

      return {
        hasData: true,
        matchesWithData: matchesWithData.length,
        totalRivalGoals: allRivalGoalMinutes.length,
        avgFirstGoal,
        buckets,
        mostDangerousPeriod,
        mostDangerousCount,
        firstHalfGoals,
        secondHalfGoals,
        avgPerMatch,
        earliest,
        latest,
      };
    })();

    return {
      team: {
        ...teamStats,
        mostUsedFormation,
        avgSubs: teamStats.matches ? (teamStats.totalSubs / teamStats.matches).toFixed(1) : 0,
        winRate: teamStats.matches ? Math.round((teamStats.wins / teamStats.matches) * 100) : 0,
        rivalGoalStats,
      },
      players: sortedPlayers,
    };
  }, [
    filteredMatchSheets,
    matchSheetsKey,
    players,
    injuries,
    trainingSessions,
    sortBy,
    sortOrder,
    competitionFilter,
  ]);

  // Calculate weekly training attendance
  const weeklyAttendance = useMemo(() => {
    if (!trainingSessions || trainingSessions.length === 0) return [];

    const today = new Date();
    let pastSessions = trainingSessions.filter((session) => {
      if (!session.fecha) return false;
      return new Date(session.fecha) < today;
    });

    // Apply date range filter only if BOTH dates are set
    if (weeklyDateRange.start && weeklyDateRange.end) {
      pastSessions = pastSessions.filter((session) => {
        const sessionDate = new Date(session.fecha);
        if (sessionDate < weeklyDateRange.start || sessionDate > weeklyDateRange.end) {
          return false;
        }
        return true;
      });
    }

    // Group sessions by week
    const weekMap = {};
    pastSessions.forEach((session) => {
      const date = new Date(session.fecha);
      // Get Monday of that week
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      const weekKey = monday.toISOString().split('T')[0];

      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          weekStart: weekKey,
          sessions: [],
        };
      }
      weekMap[weekKey].sessions.push(session);
    });

    // Convert to array and sort by week (most recent first)
    return Object.values(weekMap)
      .map((week) => ({
        ...week,
        totalSessions: week.sessions.length,
        // Calculate attendance per player
        playerAttendance: players
          .filter(
            (player) => selectedPlayerIds.length === 0 || selectedPlayerIds.includes(player._id),
          ) // Filter by selected players
          .map((player) => {
            const attendedSessions = week.sessions.filter((session) => {
              const jugadoresIds = (session.jugadores || []).map((j) =>
                typeof j === 'object' ? j._id : j,
              );
              return jugadoresIds.includes(player._id);
            });
            const missedSessions = week.sessions.filter((session) => {
              const jugadoresIds = (session.jugadores || []).map((j) =>
                typeof j === 'object' ? j._id : j,
              );
              return !jugadoresIds.includes(player._id);
            });
            return {
              playerId: player._id,
              playerName: getPlayerFullName(player),
              attended: attendedSessions.length,
              percentage:
                week.sessions.length > 0
                  ? Math.round((attendedSessions.length / week.sessions.length) * 100)
                  : 0,
              missedDates: missedSessions.map((s) =>
                new Date(s.fecha).toLocaleDateString(getLocale(), {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                }),
              ),
            };
          }),
      }))
      .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart))
      .slice(0, weeklyDateRange.start || weeklyDateRange.end ? 100 : 8); // Show more weeks when filtered
  }, [trainingSessions, players, weeklyDateRange, selectedPlayerIds]);

  // Funci�n para generar PDF de asistencia semanal
  const generateWeeklyAttendancePDF = async (week) => {
    const weekDate = new Date(week.weekStart);
    const weekEnd = new Date(weekDate);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const teamName = selectedTeam?.nombre || t('statistics.yourTeam');
    const locale = getLocale();
    const weekLabel = `${weekDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;

    try {
      await generateWeeklyAttendancePdf(week, teamName, weekLabel, t);
    } catch (error) {
      console.error('Error generating weekly attendance PDF:', error);
      Alert.alert(
        t('common.error'),
        t('statistics.weeklyAttendance.pdfError', 'Error al generar el PDF'),
      );
    }
  };
  const sharedPDFStyles = `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: A4;
            margin: 0;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #334155;
            background-color: #f8fafc;
            font-size: 10px;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
            letter-spacing: 0.2px;
        }

        .page-wrapper {
            padding: 15mm 16mm 20mm 16mm;
            min-height: 100vh;
            position: relative;
            background-color: #f8fafc;
        }

        .page {
            background-color: transparent;
            position: relative;
            page-break-before: always;
            break-before: always;
            padding: 0;
            box-sizing: border-box;
        }
        
        .page:first-of-type {
            page-break-before: avoid;
            break-before: avoid;
        }
        
        .page-break {
            page-break-before: always;
            break-before: always;
            clear: both;
            margin-top: 20px;
        }
        
        /* Main Header Banner */
        .header-container {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            border-radius: 12px;
            padding: 20px 24px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            page-break-inside: avoid;
            box-shadow: 0 4px 15px rgba(15, 23, 42, 0.05);
        }
        
        .header-left h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 18px;
            font-weight: 900;
            color: #ffffff;
            margin: 0 0 4px 0;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            line-height: 1.2;
        }
        
        .header-left p {
            font-family: 'Outfit', sans-serif;
            font-size: 8.5px;
            color: #94a3b8;
            margin: 0;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-top: 3px;
        }
        
        .header-right {
            text-align: right;
            flex-shrink: 0;
        }
        
        .header-right .date {
            font-family: 'Outfit', sans-serif;
            font-size: 11px;
            font-weight: 800;
            color: #60a5fa;
            text-transform: uppercase;
            letter-spacing: 1.2px;
        }

        .section-title, h1, h2, h3, h4, h5, h6 {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: avoid;
            break-after: avoid;
        }

        .section-title {
            font-family: 'Outfit', sans-serif;
            font-size: 12px;
            font-weight: 900;
            color: var(--primary);
            margin-top: 0;
            margin-bottom: 16px;
            letter-spacing: 1px;
            padding-bottom: 5px;
            border-bottom: 2px solid var(--primary);
            text-transform: uppercase;
            line-height: 1.3;
        }
        
        /* Grid Layouts */
        .grid-2 {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
            page-break-inside: avoid;
        }
        
        .grid-2 > div { flex: 1; min-width: 0; }
        
        .grid-3 {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            page-break-inside: avoid;
        }
        
        .grid-3 > div { flex: 1; min-width: 0; }
        
        .grid-4 {
            display: flex;
            gap: 10px;
            margin-bottom: 14px;
            page-break-inside: avoid;
        }
        
        .grid-4 > div { flex: 1; min-width: 0; }
        
        /* Cards */
        .card {
            background: #ffffff;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            page-break-inside: avoid;
        }
        
        .card-primary {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #ffffff;
            border: none;
            box-shadow: 0 4px 15px rgba(15, 23, 42, 0.05);
        }
        
        /* Metric Items */
        .metric-box {
            text-align: center;
            padding: 8px 0;
            page-break-inside: avoid;
        }
        
        .metric-val {
            font-family: 'Outfit', sans-serif;
            font-size: 24px;
            font-weight: 900;
            color: var(--primary);
            line-height: 1.1;
            letter-spacing: -0.5px;
        }
        
        .card-primary .metric-val {
            color: #ffffff;
        }
        
        .metric-lbl {
            font-family: 'Outfit', sans-serif;
            font-size: 8.5px;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-top: 6px;
            letter-spacing: 1px;
            line-height: 1.3;
        }
        
        .card-primary .metric-lbl {
            color: #94a3b8;
        }
        
        /* Tables */
        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 12px;
            margin-bottom: 20px;
            background-color: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            page-break-inside: auto;
        }
        
        thead {
            display: table-header-group;
        }
        
        tr {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        tbody { display: table-row-group; }
        
        th {
            background-color: #1e293b;
            color: #ffffff;
            font-family: 'Outfit', sans-serif;
            font-weight: 700;
            text-align: left;
            padding: 8px 12px;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            border: none;
            line-height: 1.3;
        }
        
        td {
            padding: 8px 12px;
            border: none;
            border-bottom: 1px solid var(--border);
            font-size: 8.5px;
            color: var(--text-main);
            vertical-align: middle;
            line-height: 1.4;
        }
        
        tr:nth-child(even) td {
            background-color: #f8fafc;
        }
        
        tr:last-child td {
            border-bottom: none;
        }
        
        .badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 8px;
            font-weight: 700;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            text-align: center;
            line-height: 1.4;
            font-family: 'Inter', sans-serif;
        }
        
        .badge-primary { background-color: #e2e8f0; color: #334155; }
        .badge-success { background-color: #dcfce7; color: #166534; font-weight: 800; }
        .badge-warning { background-color: #fef3c7; color: #854d0e; font-weight: 800; }
        .badge-danger { background-color: #fee2e2; color: #991b1b; font-weight: 800; }
        
        /* Custom bars for lists */
        .bar-list-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            page-break-inside: avoid;
            gap: 10px;
        }
        
        .bar-list-label {
            width: 130px;
            font-weight: 600;
            font-size: 9px;
            color: var(--text-main);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex-shrink: 0;
        }
        
        .bar-list-track {
            flex: 1;
            height: 8px;
            background-color: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
            min-width: 0;
        }
        
        .bar-list-fill {
            height: 100%;
            border-radius: 4px;
        }
        
        .bar-list-val {
            width: 35px;
            text-align: right;
            font-family: 'Outfit', sans-serif;
            font-weight: 800;
            font-size: 9.5px;
            color: var(--primary);
            margin-left: 8px;
            flex-shrink: 0;
        }
        
        /* Ring chart representation */
        .ring-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .ring-outer {
            width: 85px;
            height: 85px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        
        .ring-inner {
            text-align: center;
        }
        
        .ring-value {
            font-family: 'Outfit', sans-serif;
            font-size: 16px;
            font-weight: 900;
            color: var(--primary);
            letter-spacing: -0.3px;
        }
        
        .ring-label {
            font-family: 'Outfit', sans-serif;
            font-size: 8px;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-top: 2px;
            letter-spacing: 0.5px;
        }
        
        /* Footer logo (Fixed on every printed page) */
        .footer-logo {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 16mm;
            border-top: 1.5px solid var(--border);
            padding: 8px 16mm 6px 16mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8px;
            color: var(--text-muted);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            background-color: #ffffff;
            font-family: 'Inter', sans-serif;
        }
        
        .footer-logo strong {
            color: var(--primary);
            font-size: 9.5px;
            font-weight: 800;
            letter-spacing: 0.3px;
        }
        
        .page-number::after {
            content: counter(page);
        }
        
        /* Icons via text */
        .icon-text {
            display: inline-block;
            font-size: 13px;
            margin-right: 5px;
            vertical-align: middle;
        }
    `;

  const handleDownloadTeamStatsPDF = async () => {
    try {
      const dateStr = new Date().toLocaleDateString(getLocale(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const teamName = selectedTeam?.nombre || 'Equipo';
      await generateTeamStatsPdf(stats, teamName, dateStr, t);
    } catch (error) {
      console.error('Error generating Team Stats PDF:', error);
      Alert.alert(t('common.error'), t('statistics.pdfError', 'Error al generar el PDF'));
    }
  };

  const handleDownloadPlayersStatsPDF = async () => {
    try {
      const dateStr = new Date().toLocaleDateString(getLocale(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const teamName = selectedTeam?.nombre || 'Equipo';
      await generatePlayersStatsPdf(stats, teamName, dateStr, t);
    } catch (error) {
      console.error('Error generating Players Stats PDF:', error);
      Alert.alert(t('common.error'), t('statistics.pdfError', 'Error al generar el PDF'));
    }
  };

  const handleDownloadInjuriesStatsPDF = async () => {
    try {
      const dateStr = new Date().toLocaleDateString(getLocale(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const teamName = selectedTeam?.nombre || 'Equipo';
      await generateInjuriesStatsPdf(injuries, players, teamName, dateStr, t);
    } catch (error) {
      console.error('Error generating Injuries Stats PDF:', error);
      Alert.alert(t('common.error'), t('statistics.pdfError', 'Error al generar el PDF'));
    }
  };

  const handleDownloadCombinedPDF = async () => {
    try {
      const dateStr = new Date().toLocaleDateString(getLocale(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const teamName = selectedTeam?.nombre || 'Equipo';
      await generateCombinedStatsPdf(stats, injuries, players, teamName, dateStr, t);
    } catch (error) {
      console.error('Error generating Combined Stats PDF:', error);
      Alert.alert(t('common.error'), t('statistics.pdfError', 'Error al generar el PDF'));
    }
  };

  const handleDownloadActiveTabPDF = () => {
    if (activeTab === 'team') {
      handleDownloadTeamStatsPDF();
    } else if (activeTab === 'players') {
      handleDownloadPlayersStatsPDF();
    } else if (activeTab === 'injuries') {
      handleDownloadInjuriesStatsPDF();
    }
  };

  const handlePlayerProfilePress = (player) => {
    const fullPlayer = players.find((p) => p._id === player.id);
    const playerId = fullPlayer?._id || player.id;
    if (playerId) {
      navigation.navigate('/players/' + playerId);
    }
  };

  const handleSort = (criteria) => {
    if (sortBy === criteria) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(criteria);
      setSortOrder('desc');
    }
  };

  if (loading && !stats) {
    return (
      <AppLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('statistics.loading')}</Text>
        </View>
      </AppLayout>
    );
  }

  if (!stats) {
    return (
      <AppLayout>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <MaterialIcons name="analytics" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyText}>{t('statistics.noData')}</Text>
          <Text style={styles.emptySubText}>{t('statistics.noDataSubtitle')}</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Header */}
        <View style={styles.headerSection}>
          <LinearGradient
            colors={['#0f172a', '#1d4ed8', '#0891b2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <MaterialIcons name="analytics" size={28} color="#ffffff" />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.seasonLabel}>
                    {t('statistics.season')} {temporada?.nombre}
                  </Text>
                  <Text style={styles.teamName}>
                    {selectedTeam?.nombre || t('statistics.yourTeam')}
                  </Text>
                </View>
              </View>
              <View style={styles.headerStats}>
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{stats.team.matches}</Text>
                  <Text style={styles.headerStatLabel}>{t('statistics.matches')}</Text>
                </View>
                <View style={styles.headerStatDivider} />
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{stats.team.winRate}%</Text>
                  <Text style={styles.headerStatLabel}>{t('statistics.wins')}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* PDF Downloads Actions Container */}
        <View style={styles.pdfActionsContainer}>
          <TouchableOpacity style={styles.pdfPrimaryButton} onPress={handleDownloadCombinedPDF}>
            <Ionicons name="document-text" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.pdfPrimaryButtonText}>
              {t('statistics.downloadCombined', 'Descargar Reporte Completo')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pdfSecondaryButton} onPress={handleDownloadActiveTabPDF}>
            <MaterialIcons
              name="picture-as-pdf"
              size={18}
              color={theme.colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.pdfSecondaryButtonText}>
              {activeTab === 'team' && t('statistics.downloadTeamPDF', 'Descargar PDF de Equipo')}
              {activeTab === 'players' &&
                t('statistics.downloadPlayersPDF', 'Descargar PDF de Jugadores')}
              {activeTab === 'injuries' &&
                t('statistics.downloadInjuriesPDF', 'Descargar PDF de Lesiones')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabsContainer}>
          {['team', 'players', 'injuries'].map((tab) => {
            const icons = {
              team: 'shield',
              players: 'people',
              injuries: 'medical',
            };
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons
                  name={icons[tab]}
                  size={isMobile ? 14 : 18}
                  color={activeTab === tab ? theme.colors.primary : theme.colors.textSecondary}
                  style={{ marginRight: isMobile ? 4 : 6 }}
                />
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab === 'team'
                    ? t('statistics.tabs.team')
                    : tab === 'players'
                      ? t('statistics.tabs.players')
                      : t('statistics.tabs.injuries')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tournament Filter Tabs */}
        {activeTab !== 'injuries' && (
          <View style={styles.competitionFilterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.competitionTabs}
              contentContainerStyle={{ paddingHorizontal: 2 }}
            >
              {[
                { key: 'total', label: t('home.total') || 'Total' },
                ...tournaments.map((tr) => ({ key: tr._id, label: tr.nombre })),
                { key: 'amistosos', label: t('matchSheet.friendlies') || 'Amistosos' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.competitionTab,
                    competitionFilter === tab.key && styles.competitionTabActive,
                  ]}
                  onPress={() => {
                    setCompetitionFilter(tab.key);
                  }}
                >
                  <Text
                    style={[
                      styles.competitionTabText,
                      competitionFilter === tab.key && styles.competitionTabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.contentContainer}>
          {activeTab === 'team' && (
            <View style={styles.animateFadeIn}>
              {/* Performance Ring Card */}
              <View style={styles.performanceRingCard}>
                <LinearGradient
                  colors={['#0f172a', '#172554', '#164e63']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.performanceRingGradient}
                >
                  <View style={styles.performanceRingContent}>
                    <View style={styles.performanceRingLeft}>
                      <View style={styles.performanceRingContainer}>
                        <View style={styles.performanceRingOuter}>
                          <View
                            style={[
                              styles.performanceRingProgress,
                              {
                                borderTopColor: theme.colors.success,
                                borderRightColor:
                                  stats.team.winRate >= 25
                                    ? theme.colors.success
                                    : 'rgba(255,255,255,0.1)',
                                borderBottomColor:
                                  stats.team.winRate >= 50
                                    ? theme.colors.success
                                    : 'rgba(255,255,255,0.1)',
                                borderLeftColor:
                                  stats.team.winRate >= 75
                                    ? theme.colors.success
                                    : 'rgba(255,255,255,0.1)',
                              },
                            ]}
                          />
                          <View style={styles.performanceRingInner}>
                            <Text style={styles.performanceRingValue}>{stats.team.winRate}%</Text>
                            <Text style={styles.performanceRingLabel}>{t('statistics.wins')}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View style={styles.performanceRingRight}>
                      <View style={styles.performanceRingStats}>
                        <View style={styles.performanceRingStat}>
                          <View
                            style={[
                              styles.performanceStatDot,
                              { backgroundColor: theme.colors.success },
                            ]}
                          />
                          <Text style={styles.performanceStatLabel}>{t('statistics.wins')}</Text>
                          <Text style={styles.performanceStatValue}>{stats.team.wins}</Text>
                        </View>
                        <View style={styles.performanceRingStat}>
                          <View
                            style={[
                              styles.performanceStatDot,
                              { backgroundColor: theme.colors.warning },
                            ]}
                          />
                          <Text style={styles.performanceStatLabel}>{t('statistics.draws')}</Text>
                          <Text style={styles.performanceStatValue}>{stats.team.draws}</Text>
                        </View>
                        <View style={styles.performanceRingStat}>
                          <View
                            style={[
                              styles.performanceStatDot,
                              { backgroundColor: theme.colors.error },
                            ]}
                          />
                          <Text style={styles.performanceStatLabel}>{t('statistics.losses')}</Text>
                          <Text style={styles.performanceStatValue}>{stats.team.losses}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Goals Comparison Card */}
              <View style={styles.goalsComparisonCard}>
                <View style={styles.goalsComparisonHeader}>
                  <View style={styles.goalsComparisonIconWrap}>
                    <Ionicons name="football" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.goalsComparisonTitle}>{t('statistics.goalsBalance')}</Text>
                </View>

                <View style={styles.goalsComparisonBody}>
                  <View style={styles.goalsComparisonSide}>
                    <Text style={styles.goalsComparisonSideLabel}>{t('statistics.goalsFor')}</Text>
                    <Text
                      style={[styles.goalsComparisonSideValue, { color: theme.colors.success }]}
                    >
                      {stats.team.goalsFor}
                    </Text>
                    <View
                      style={[
                        styles.goalsComparisonBar,
                        { backgroundColor: theme.colors.success + '30' },
                      ]}
                    >
                      <View
                        style={[
                          styles.goalsComparisonBarFill,
                          {
                            width: `${Math.min((stats.team.goalsFor / Math.max(stats.team.goalsFor, stats.team.goalsAgainst, 1)) * 100, 100)}%`,
                            backgroundColor: theme.colors.success,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.goalsComparisonDivider}>
                    <View style={styles.goalsComparisonDiffBadge}>
                      <Text
                        style={[
                          styles.goalsComparisonDiffText,
                          {
                            color:
                              stats.team.goalsFor >= stats.team.goalsAgainst
                                ? theme.colors.success
                                : theme.colors.error,
                          },
                        ]}
                      >
                        {stats.team.goalsFor - stats.team.goalsAgainst > 0 ? '+' : ''}
                        {stats.team.goalsFor - stats.team.goalsAgainst}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.goalsComparisonSide}>
                    <Text style={styles.goalsComparisonSideLabel}>
                      {t('statistics.goalsAgainst')}
                    </Text>
                    <Text style={[styles.goalsComparisonSideValue, { color: theme.colors.error }]}>
                      {stats.team.goalsAgainst}
                    </Text>
                    <View
                      style={[
                        styles.goalsComparisonBar,
                        { backgroundColor: theme.colors.error + '30' },
                      ]}
                    >
                      <View
                        style={[
                          styles.goalsComparisonBarFill,
                          {
                            width: `${Math.min((stats.team.goalsAgainst / Math.max(stats.team.goalsFor, stats.team.goalsAgainst, 1)) * 100, 100)}%`,
                            backgroundColor: theme.colors.error,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.goalsComparisonFooter}>
                  <View style={styles.goalsComparisonFooterItem}>
                    <Ionicons name="stats-chart" size={16} color={theme.colors.primary} />
                    <Text style={styles.goalsComparisonFooterLabel}>
                      {t('statistics.avgPerMatch')}
                    </Text>
                    <Text style={styles.goalsComparisonFooterValue}>
                      {stats.team.matches > 0
                        ? (stats.team.goalsFor / stats.team.matches).toFixed(1)
                        : '0'}
                    </Text>
                  </View>
                  <View style={styles.goalsComparisonFooterDivider} />
                  <View style={styles.goalsComparisonFooterItem}>
                    <Ionicons name="shield-checkmark" size={16} color={theme.colors.success} />
                    <Text style={styles.goalsComparisonFooterLabel}>
                      {t('statistics.cleanSheets')}
                    </Text>
                    <Text style={styles.goalsComparisonFooterValue}>{stats.team.cleanSheets}</Text>
                  </View>
                </View>
              </View>

              {/* Rival Goal Statistics Card */}
              {stats.team.rivalGoalStats && stats.team.rivalGoalStats.hasData && (
                <View style={styles.rivalGoalCard}>
                  <View style={styles.rivalGoalHeader}>
                    <View style={styles.rivalGoalIconWrap}>
                      <Ionicons name="alert-circle" size={20} color="#ffffff" />
                    </View>
                    <Text style={styles.rivalGoalTitle}>{t('statistics.team.rivalGoalStats')}</Text>
                    <Text style={styles.rivalGoalMatchCount}>
                      {stats.team.rivalGoalStats.matchesWithData}{' '}
                      {t('statistics.team.matchesWithRivalGoalData')}
                    </Text>
                  </View>

                  {/* Key metrics row */}
                  <View style={styles.rivalGoalMetricsRow}>
                    <View style={styles.rivalGoalMetricItem}>
                      <Text style={[styles.rivalGoalMetricValue, { color: theme.colors.error }]}>
                        {stats.team.rivalGoalStats.avgFirstGoal}'
                      </Text>
                      <Text style={styles.rivalGoalMetricLabel}>
                        {t('statistics.team.avgFirstGoalAgainst')}
                      </Text>
                    </View>
                    <View style={styles.rivalGoalMetricDivider} />
                    <View style={styles.rivalGoalMetricItem}>
                      <Text style={[styles.rivalGoalMetricValue, { color: theme.colors.text }]}>
                        {stats.team.rivalGoalStats.avgPerMatch}
                      </Text>
                      <Text style={styles.rivalGoalMetricLabel}>
                        {t('statistics.team.avgRivalGoalsPerMatch')}
                      </Text>
                    </View>
                    <View style={styles.rivalGoalMetricDivider} />
                    <View style={styles.rivalGoalMetricItem}>
                      <Text style={[styles.rivalGoalMetricValue, { color: '#f59e0b' }]}>
                        {stats.team.rivalGoalStats.mostDangerousPeriod}'
                      </Text>
                      <Text style={styles.rivalGoalMetricLabel}>
                        {t('statistics.team.mostCommonRivalGoalMinutes')}
                      </Text>
                    </View>
                  </View>

                  {/* Histogram bars */}
                  <View style={styles.rivalGoalHistogram}>
                    {Object.entries(stats.team.rivalGoalStats.buckets).map(([period, count]) => {
                      const maxBucket = Math.max(
                        ...Object.values(stats.team.rivalGoalStats.buckets),
                        1,
                      );
                      const pct = (count / maxBucket) * 100;
                      const isMostDangerous =
                        period === stats.team.rivalGoalStats.mostDangerousPeriod;
                      return (
                        <View key={period} style={styles.rivalGoalBarRow}>
                          <Text style={styles.rivalGoalBarLabel}>{period}</Text>
                          <View style={styles.rivalGoalBarTrack}>
                            <View
                              style={[
                                styles.rivalGoalBarFill,
                                {
                                  width: `${Math.max(pct, count > 0 ? 8 : 0)}%`,
                                  backgroundColor: isMostDangerous ? theme.colors.error : '#475569',
                                },
                              ]}
                            >
                              {count > 0 && <Text style={styles.rivalGoalBarCount}>{count}</Text>}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Goals per half + earliest/latest */}
                  <View style={styles.goalsComparisonFooter}>
                    <View style={styles.goalsComparisonFooterItem}>
                      <Text style={styles.rivalGoalHalfLabel}>1ª</Text>
                      <Text style={styles.goalsComparisonFooterLabel}>
                        {t('statistics.team.firstHalf')}
                      </Text>
                      <Text style={styles.goalsComparisonFooterValue}>
                        {stats.team.rivalGoalStats.firstHalfGoals}
                      </Text>
                    </View>
                    <View style={styles.goalsComparisonFooterDivider} />
                    <View style={styles.goalsComparisonFooterItem}>
                      <Text style={styles.rivalGoalHalfLabel}>2ª</Text>
                      <Text style={styles.goalsComparisonFooterLabel}>
                        {t('statistics.team.secondHalf')}
                      </Text>
                      <Text style={styles.goalsComparisonFooterValue}>
                        {stats.team.rivalGoalStats.secondHalfGoals}
                      </Text>
                    </View>
                    <View style={styles.goalsComparisonFooterDivider} />
                    <View style={styles.goalsComparisonFooterItem}>
                      <Ionicons name="arrow-down" size={14} color={theme.colors.success} />
                      <Text style={styles.goalsComparisonFooterLabel}>
                        {t('statistics.team.earliestRivalGoal')}
                      </Text>
                      <Text style={styles.goalsComparisonFooterValue}>
                        {stats.team.rivalGoalStats.earliest}'
                      </Text>
                    </View>
                    <View style={styles.goalsComparisonFooterDivider} />
                    <View style={styles.goalsComparisonFooterItem}>
                      <Ionicons name="arrow-up" size={14} color={theme.colors.error} />
                      <Text style={styles.goalsComparisonFooterLabel}>
                        {t('statistics.team.latestRivalGoal')}
                      </Text>
                      <Text style={styles.goalsComparisonFooterValue}>
                        {stats.team.rivalGoalStats.latest}'
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Tactical Stats Grid */}
              <View style={styles.tacticalStatsGrid}>
                <View style={styles.tacticalStatCard}>
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tacticalStatGradient}
                  >
                    <Ionicons name="grid-outline" size={isMobile ? 20 : 28} color="#ffffff" />
                    <Text style={styles.tacticalStatValue}>{stats.team.mostUsedFormation}</Text>
                    <Text style={styles.tacticalStatLabel}>
                      {t('statistics.preferredFormation')}
                    </Text>
                  </LinearGradient>
                </View>
                <View style={styles.tacticalStatCard}>
                  <LinearGradient
                    colors={['#8b5cf6', '#7c3aed']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tacticalStatGradient}
                  >
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={isMobile ? 20 : 28}
                      color="#ffffff"
                    />
                    <Text style={styles.tacticalStatValue}>{stats.team.avgSubs}</Text>
                    <Text style={styles.tacticalStatLabel}>{t('statistics.subsPerMatch')}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.tacticalStatCard}>
                  <LinearGradient
                    colors={['#06b6d4', '#0891b2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tacticalStatGradient}
                  >
                    <Ionicons name="calendar-outline" size={isMobile ? 20 : 28} color="#ffffff" />
                    <Text style={styles.tacticalStatValue}>{stats.team.matches}</Text>
                    <Text style={styles.tacticalStatLabel}>{t('statistics.matchesPlayed')}</Text>
                  </LinearGradient>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'players' && (
            <View style={styles.animateFadeIn}>
              {/* Players Summary Header */}
              <View style={styles.playersSummaryCard}>
                <LinearGradient
                  colors={['#0f172a', '#1e3a8a', '#155e75']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.playersSummaryGradient}
                >
                  <View style={styles.playersSummaryContent}>
                    <View style={styles.playersSummaryItem}>
                      <View
                        style={[
                          styles.playersSummaryIconWrap,
                          { backgroundColor: theme.colors.primary + '30' },
                        ]}
                      >
                        <Ionicons
                          name="people"
                          size={isMobile ? 16 : 20}
                          color={theme.colors.primary}
                        />
                      </View>
                      <Text style={styles.playersSummaryValue}>{stats.players.length}</Text>
                      <Text style={styles.playersSummaryLabel}>{t('statistics.playersCount')}</Text>
                    </View>
                    <View style={styles.playersSummaryDivider} />
                    <View style={styles.playersSummaryItem}>
                      <View
                        style={[
                          styles.playersSummaryIconWrap,
                          { backgroundColor: theme.colors.success + '30' },
                        ]}
                      >
                        <Ionicons
                          name="football"
                          size={isMobile ? 16 : 20}
                          color={theme.colors.success}
                        />
                      </View>
                      <Text style={styles.playersSummaryValue}>
                        {stats.players.reduce((acc, p) => acc + p.goals, 0)}
                      </Text>
                      <Text style={styles.playersSummaryLabel}>{t('statistics.goals')}</Text>
                    </View>
                    <View style={styles.playersSummaryDivider} />
                    <View style={styles.playersSummaryItem}>
                      <View
                        style={[
                          styles.playersSummaryIconWrap,
                          { backgroundColor: theme.colors.purpleSoft },
                        ]}
                      >
                        <Ionicons
                          name="hand-left"
                          size={isMobile ? 16 : 20}
                          color={theme.colors.purple}
                        />
                      </View>
                      <Text style={styles.playersSummaryValue}>
                        {stats.players.reduce((acc, p) => acc + p.assists, 0)}
                      </Text>
                      <Text style={styles.playersSummaryLabel}>{t('statistics.assists')}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Search Bar */}
              <View style={styles.playerSearchContainer}>
                <View style={styles.playerSearchInputWrapper}>
                  <Ionicons
                    name="search"
                    size={isMobile ? 16 : 18}
                    color={theme.colors.textSecondary}
                  />
                  <TextInput
                    style={styles.playerSearchInput}
                    placeholder={t('statistics.searchPlayer')}
                    placeholderTextColor={theme.colors.textMuted}
                    value={playerSearch}
                    onChangeText={setPlayerSearch}
                  />
                  {playerSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setPlayerSearch('')}>
                      <Ionicons
                        name="close-circle"
                        size={isMobile ? 16 : 18}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Sort Controls */}
              <View style={styles.sortControlsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.sortControlsScroll}
                >
                  {[
                    {
                      key: 'position',
                      label: t('statistics.sortLabels.position'),
                      icon: 'shirt-outline',
                    },
                    {
                      key: 'minutes',
                      label: t('statistics.sortLabels.minutes'),
                      icon: 'time-outline',
                    },
                    {
                      key: 'goals',
                      label: t('statistics.sortLabels.goals'),
                      icon: 'football-outline',
                    },
                    {
                      key: 'assists',
                      label: t('statistics.sortLabels.assists'),
                      icon: 'hand-left-outline',
                    },
                    {
                      key: 'matches',
                      label: t('statistics.sortLabels.matchesPlayed'),
                      icon: 'calendar-outline',
                    },
                    {
                      key: 'attendancePercentage',
                      label: t('statistics.sortLabels.attendance'),
                      icon: 'checkmark-circle-outline',
                    },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.sortChip, sortBy === item.key && styles.sortChipActive]}
                      onPress={() => handleSort(item.key)}
                    >
                      <Ionicons
                        name={item.icon}
                        size={isMobile ? 13 : 15}
                        color={
                          sortBy === item.key ? theme.colors.onPrimary : theme.colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.sortChipText,
                          sortBy === item.key && styles.sortChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {sortBy === item.key && (
                        <Ionicons
                          name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
                          size={12}
                          color={theme.colors.onPrimary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Position Color Legend */}
              <View style={styles.positionLegendContainer}>
                <View style={styles.positionLegendRow}>
                  <View style={styles.positionLegendItem}>
                    <View style={[styles.positionLegendDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={styles.positionLegendText}>
                      {t('statistics.positionLegend.goalkeeper')}
                    </Text>
                  </View>
                  <View style={styles.positionLegendItem}>
                    <View style={[styles.positionLegendDot, { backgroundColor: '#3b82f6' }]} />
                    <Text style={styles.positionLegendText}>
                      {t('statistics.positionLegend.defender')}
                    </Text>
                  </View>
                  <View style={styles.positionLegendItem}>
                    <View style={[styles.positionLegendDot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.positionLegendText}>
                      {t('statistics.positionLegend.midfielder')}
                    </Text>
                  </View>
                  <View style={styles.positionLegendItem}>
                    <View style={[styles.positionLegendDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.positionLegendText}>
                      {t('statistics.positionLegend.forward')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Compact Player List */}
              <View style={styles.compactPlayerList}>
                {stats.players
                  .filter(
                    (player) =>
                      playerSearch.length === 0 ||
                      player.name.toLowerCase().includes(playerSearch.toLowerCase()),
                  )
                  .map((player, index) => (
                    <TouchableOpacity
                      key={player.id}
                      style={styles.compactPlayerRow}
                      onPress={() => handlePlayerProfilePress(player)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.compactPlayerLeft}>
                        <Text style={styles.compactPlayerRank}>#{index + 1}</Text>
                        <View
                          style={[
                            styles.compactPositionDot,
                            {
                              backgroundColor: (() => {
                                const pos = (player.position || '').toLowerCase();
                                if (
                                  pos.includes('portero') ||
                                  pos.includes('goalkeeper') ||
                                  pos.includes('arquero')
                                )
                                  return '#f59e0b';
                                if (
                                  pos.includes('defensa') ||
                                  pos.includes('defender') ||
                                  pos.includes('lateral') ||
                                  pos.includes('central') ||
                                  pos.includes('líbero') ||
                                  pos.includes('libero') ||
                                  pos.includes('zaguero') ||
                                  pos.includes('carrilero')
                                )
                                  return '#3b82f6';
                                if (
                                  pos.includes('centro') ||
                                  pos.includes('medio') ||
                                  pos.includes('midfielder') ||
                                  pos.includes('pivote') ||
                                  pos.includes('interior') ||
                                  pos.includes('extremo') ||
                                  pos.includes('volante')
                                )
                                  return '#10b981';
                                if (
                                  pos.includes('delantero') ||
                                  pos.includes('forward') ||
                                  pos.includes('atacante') ||
                                  pos.includes('punta') ||
                                  pos.includes('ariete') ||
                                  pos.includes('striker')
                                )
                                  return '#ef4444';
                                return '#9ca3af'; // Sin posición - gris
                              })(),
                            },
                          ]}
                        />
                        <Text style={styles.compactPlayerName} numberOfLines={1}>
                          {player.name}
                        </Text>
                      </View>
                      <View style={styles.compactPlayerStats}>
                        <View style={styles.compactStatBox}>
                          <Text style={styles.compactStatValue}>{player.matches}</Text>
                          <Text style={styles.compactStatLabel}>PJ</Text>
                        </View>
                        <View style={styles.compactStatBox}>
                          <Text style={[styles.compactStatValue, { color: theme.colors.primary }]}>
                            {player.minutes}'
                          </Text>
                          <Text style={styles.compactStatLabel}>MIN</Text>
                        </View>
                        <View style={styles.compactStatBox}>
                          <Text
                            style={[
                              styles.compactStatValue,
                              player.goals > 0 && {
                                color: theme.colors.success,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            {player.goals}
                          </Text>
                          <Text style={styles.compactStatLabel}>G</Text>
                        </View>
                        <View style={styles.compactStatBox}>
                          <Text
                            style={[
                              styles.compactStatValue,
                              player.assists > 0 && {
                                color: theme.colors.purple,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            {player.assists}
                          </Text>
                          <Text style={styles.compactStatLabel}>A</Text>
                        </View>
                        <View style={styles.compactCardsContainer}>
                          {player.yellowCards > 0 && (
                            <View style={styles.compactCardGroup}>
                              <View style={styles.compactYellowCard}>
                                <Text style={styles.compactCardText}>{player.yellowCards}</Text>
                              </View>
                              {player.doubleYellowCards > 0 && (
                                <Text style={styles.compactDoubleYellowText}>
                                  ({player.doubleYellowCards}🟨🟨)
                                </Text>
                              )}
                            </View>
                          )}
                          {player.redCards > 0 && (
                            <View style={styles.compactRedCard}>
                              <Text style={styles.compactCardText}>{player.redCards}</Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.compactAttendance,
                            {
                              color:
                                player.attendancePercentage >= 80
                                  ? theme.colors.success
                                  : player.attendancePercentage >= 60
                                    ? theme.colors.warning
                                    : theme.colors.error,
                            },
                          ]}
                        >
                          {player.attendancePercentage}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>

              {/* Weekly Attendance Breakdown */}
              <View style={styles.weeklyAttendanceSection}>
                <View style={styles.weeklyAttendanceSection}>
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIconContainer}>
                        <MaterialIcons
                          name="calendar-today"
                          size={18}
                          color={theme.colors.primary}
                        />
                      </View>
                      <Text style={styles.sectionTitle}>
                        {t('statistics.weeklyAttendance.title')}
                      </Text>
                    </View>

                    {/* Player Filter */}
                    <View style={styles.playerFilterContainer}>
                      <Text style={styles.dateFilterLabel}>
                        {t('statistics.weeklyAttendance.filterByPlayers')}:
                      </Text>
                      <TouchableOpacity
                        style={styles.playerFilterTrigger}
                        onPress={() => setShowPlayerFilterModal(true)}
                      >
                        <Text style={styles.playerFilterTriggerText}>
                          {selectedPlayerIds.length === 0
                            ? t('statistics.weeklyAttendance.allPlayers')
                            : `${selectedPlayerIds.length} ${t('statistics.weeklyAttendance.playersSelected')}`}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color={theme.colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Date Filter */}
                    <View style={styles.dateFilterContainer}>
                      <View style={styles.dateFilterInputs}>
                        <View style={styles.dateFilterItem}>
                          <Text style={styles.dateFilterLabel}>
                            {t('statistics.weeklyAttendance.from')}:
                          </Text>
                          <TouchableOpacity
                            style={styles.dateFilterButton}
                            onPress={() => setShowStartPicker(true)}
                          >
                            <Text style={styles.dateFilterButtonText}>
                              {tempDateRange.start
                                ? tempDateRange.start.toLocaleDateString(getLocale())
                                : t('statistics.weeklyAttendance.selectDate')}
                            </Text>
                            <Ionicons
                              name="calendar-outline"
                              size={18}
                              color={theme.colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.dateFilterItem}>
                          <Text style={styles.dateFilterLabel}>
                            {t('statistics.weeklyAttendance.to')}:
                          </Text>
                          <TouchableOpacity
                            style={styles.dateFilterButton}
                            onPress={() => setShowEndPicker(true)}
                          >
                            <Text style={styles.dateFilterButtonText}>
                              {tempDateRange.end
                                ? tempDateRange.end.toLocaleDateString(getLocale())
                                : t('statistics.weeklyAttendance.selectDate')}
                            </Text>
                            <Ionicons
                              name="calendar-outline"
                              size={18}
                              color={theme.colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.filterButtons}>
                        <TouchableOpacity
                          style={[
                            styles.applyFilterButton,
                            !tempDateRange.start &&
                              !tempDateRange.end &&
                              styles.applyFilterButtonDisabled,
                          ]}
                          onPress={() => {
                            if (tempDateRange.start || tempDateRange.end) {
                              setWeeklyDateRange(tempDateRange);
                            }
                          }}
                          disabled={!tempDateRange.start && !tempDateRange.end}
                        >
                          <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                          <Text style={styles.applyFilterText}>
                            {t('statistics.weeklyAttendance.applyFilter')}
                          </Text>
                        </TouchableOpacity>
                        {(tempDateRange.start ||
                          tempDateRange.end ||
                          weeklyDateRange.start ||
                          weeklyDateRange.end) && (
                          <TouchableOpacity
                            style={styles.clearFilterButton}
                            onPress={() => {
                              setTempDateRange({ start: null, end: null });
                              setWeeklyDateRange({ start: null, end: null });
                            }}
                          >
                            <Ionicons name="close-circle" size={16} color={theme.colors.error} />
                            <Text style={styles.clearFilterText}>
                              {t('statistics.weeklyAttendance.clear')}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {weeklyAttendance.length === 0 ? (
                      <View style={styles.emptyFilterState}>
                        <Ionicons
                          name="calendar-outline"
                          size={48}
                          color={theme.colors.textDisabled}
                        />
                        <Text style={styles.emptyFilterText}>
                          {t('statistics.weeklyAttendance.noData')}
                        </Text>
                        <Text style={styles.emptyFilterSubText}>
                          {weeklyDateRange.start && weeklyDateRange.end
                            ? t('statistics.weeklyAttendance.noDataInRange')
                            : t('statistics.weeklyAttendance.selectDateRange')}
                        </Text>
                      </View>
                    ) : (
                      weeklyAttendance.map((week, weekIndex) => {
                        const weekDate = new Date(week.weekStart);
                        const weekEnd = new Date(weekDate);
                        weekEnd.setDate(weekEnd.getDate() + 6);

                        return (
                          <View key={week.weekStart} style={styles.weekCard}>
                            <View style={styles.weekHeader}>
                              <View style={styles.weekHeaderLeft}>
                                <Text style={styles.weekLabel}>
                                  {t('statistics.weeklyAttendance.weekOf')}{' '}
                                  {weekDate.toLocaleDateString(getLocale(), {
                                    day: 'numeric',
                                    month: 'short',
                                  })}{' '}
                                  -{' '}
                                  {weekEnd.toLocaleDateString(getLocale(), {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </Text>
                                <View style={styles.weekBadge}>
                                  <Text style={styles.weekBadgeText}>
                                    {week.totalSessions}{' '}
                                    {week.totalSessions === 1
                                      ? t('statistics.weeklyAttendance.training')
                                      : t('statistics.weeklyAttendance.trainings')}
                                  </Text>
                                </View>
                              </View>
                              <TouchableOpacity
                                style={styles.weekPdfButton}
                                onPress={() => generateWeeklyAttendancePDF(week)}
                              >
                                <MaterialIcons name="picture-as-pdf" size={18} color="#ffffff" />
                              </TouchableOpacity>
                            </View>
                            <View style={styles.weekPlayersGrid}>
                              {week.playerAttendance
                                .filter((pa) => pa.attended > 0 || week.totalSessions > 0)
                                .sort((a, b) => b.percentage - a.percentage)
                                .map((playerAtt, idx) => (
                                  <View key={playerAtt.playerId} style={styles.weekPlayerItem}>
                                    <Text style={styles.weekPlayerName} numberOfLines={1}>
                                      {playerAtt.playerName}
                                    </Text>
                                    <View style={styles.weekPlayerStats}>
                                      <Text style={styles.weekPlayerCount}>
                                        {playerAtt.attended}/{week.totalSessions}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.weekPlayerPercentage,
                                          {
                                            color:
                                              playerAtt.percentage >= 80
                                                ? '#10b981'
                                                : playerAtt.percentage >= 60
                                                  ? '#f59e0b'
                                                  : '#ef4444',
                                          },
                                        ]}
                                      >
                                        {playerAtt.percentage}%
                                      </Text>
                                    </View>
                                  </View>
                                ))}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'injuries' && (
            <View style={styles.animateFadeIn}>
              <InjuryStatistics />
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Player Filter Modal */}
      <Modal
        visible={showPlayerFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlayerFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('statistics.weeklyAttendance.filterByPlayers')}
              </Text>
              <TouchableOpacity onPress={() => setShowPlayerFilterModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => setSelectedPlayerIds(stats.players.map((p) => p.id))}
              >
                <Text style={styles.modalActionText}>
                  {t('statistics.weeklyAttendance.selectAll')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => setSelectedPlayerIds([])}
              >
                <Text style={styles.modalActionText}>
                  {t('statistics.weeklyAttendance.clearSelection')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {stats.players.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.modalItem, isSelected && styles.modalItemActive]}
                    onPress={() => {
                      setSelectedPlayerIds((prev) => {
                        if (isSelected) {
                          return prev.filter((id) => id !== player.id);
                        } else {
                          return [...prev, player.id];
                        }
                      });
                    }}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                      {player.name}
                    </Text>
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isSelected ? theme.colors.primary : theme.colors.borderStrong}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={() => setShowPlayerFilterModal(false)}
            >
              <Text style={styles.modalConfirmButtonText}>
                {t('statistics.weeklyAttendance.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Player Profile Modal */}
      <PlayerProfile
        visible={showPlayerProfile}
        player={selectedPlayerForProfile}
        team={selectedTeam}
        onClose={() => {
          setShowPlayerProfile(false);
          setSelectedPlayerForProfile(null);
        }}
      />

      {/* DateTimePicker modals for weekly attendance filter */}
      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="date"
        onConfirm={(date) => {
          setTempDateRange((prev) => ({ ...prev, start: date }));
          setShowStartPicker(false);
        }}
        onCancel={() => setShowStartPicker(false)}
        date={tempDateRange.start || new Date()}
      />
      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        onConfirm={(date) => {
          setTempDateRange((prev) => ({ ...prev, end: date }));
          setShowEndPicker(false);
        }}
        onCancel={() => setShowEndPicker(false)}
        date={tempDateRange.end || new Date()}
      />
    </AppLayout>
  );
}

const makeStyles = (theme, isMobile) =>
  StyleSheet.create({
    container: {
      flex: 1,
      minHeight: '100%',
      backgroundColor: theme.colors.background,
    },
    pdfActionsContainer: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: isMobile ? 12 : 16,
      marginTop: 8,
      marginBottom: 16,
      gap: 12,
      width: '100%',
    },
    pdfPrimaryButton: {
      width: isMobile ? '100%' : 'auto',
      minWidth: isMobile ? '100%' : 220,
      flexDirection: 'row',
      backgroundColor: '#0f172a',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    pdfPrimaryButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    pdfSecondaryButton: {
      width: isMobile ? '100%' : 'auto',
      minWidth: isMobile ? '100%' : 220,
      flexDirection: 'row',
      backgroundColor: '#ffffff',
      borderWidth: 1.5,
      borderColor: '#cbd5e1',
      paddingVertical: 13,
      paddingHorizontal: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    pdfSecondaryButtonText: {
      color: '#334155',
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 400,
    },
    loadingText: {
      marginTop: 16,
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '500',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      marginTop: 60,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 16,
    },
    emptySubText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    headerSection: {
      marginBottom: isMobile ? 16 : 20,
      marginTop: isMobile ? 10 : 14,
    },
    headerGradient: {
      borderRadius: isMobile ? 16 : 20,
      marginHorizontal: isMobile ? 12 : 16,
      paddingVertical: isMobile ? 18 : 24,
      paddingHorizontal: isMobile ? 16 : 24,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 10,
    },
    headerContent: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? 16 : 0,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      width: '100%',
      minWidth: 0,
    },
    headerIconContainer: {
      width: isMobile ? 46 : 54,
      height: isMobile ? 46 : 54,
      borderRadius: isMobile ? 12 : 14,
      backgroundColor: 'rgba(255,255,255,0.16)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.24)',
    },
    headerTextContainer: {
      marginLeft: 14,
      flex: 1,
      minWidth: 0,
    },
    seasonLabel: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.8,
      marginBottom: 4,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    teamName: {
      color: '#ffffff',
      fontSize: isMobile ? 21 : 28,
      fontWeight: '800',
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
      flexShrink: 1,
    },
    headerStats: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      width: isMobile ? '100%' : 'auto',
      justifyContent: isMobile ? 'space-around' : 'flex-start',
      marginTop: isMobile ? 8 : 0,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    headerStatItem: {
      alignItems: 'center',
      paddingHorizontal: isMobile ? 8 : 16,
      flex: isMobile ? 1 : 0,
      minWidth: isMobile ? 0 : 74,
    },
    headerStatValue: {
      color: '#ffffff',
      fontSize: 22,
      fontWeight: '700',
    },
    headerStatLabel: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    headerStatDivider: {
      width: 1,
      height: 28,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: isMobile ? 12 : 16,
      marginTop: isMobile ? -6 : -10,
      gap: isMobile ? 8 : 10,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      paddingVertical: isMobile ? 11 : 13,
      borderRadius: isMobile ? 10 : 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activeTab: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primary,
    },
    tabText: {
      fontSize: isMobile ? 12 : 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    activeTabText: {
      color: theme.colors.primarySoftText,
    },
    competitionFilterContainer: {
      paddingHorizontal: isMobile ? 12 : 16,
      marginTop: 14,
      marginBottom: 6,
    },
    competitionTabs: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    competitionTab: {
      paddingVertical: isMobile ? 10 : 8,
      paddingHorizontal: isMobile ? 12 : 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      marginHorizontal: 2,
    },
    competitionTabActive: {
      backgroundColor: theme.colors.primarySoft,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    competitionTabText: {
      fontSize: isMobile ? 12 : 13,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    competitionTabTextActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    tournamentSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
    },
    tournamentSelectorText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    tournamentPickerContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      width: isMobile ? '90%' : 400,
      maxHeight: '60%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 10,
    },
    tournamentPickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tournamentPickerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    tournamentPickerList: {
      maxHeight: 350,
    },
    tournamentPickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tournamentPickerItemActive: {
      backgroundColor: theme.colors.primary + '08',
    },
    tournamentPickerItemText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    tournamentPickerItemTextActive: {
      fontWeight: '700',
      color: theme.colors.primary,
    },
    tournamentPickerDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    contentContainer: {
      padding: isMobile ? 12 : 18,
      maxWidth: 1180,
      width: '100%',
      alignSelf: 'center',
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: isMobile ? 24 : 32,
    },
    animateFadeIn: {
      opacity: 1,
    },
    kpiGrid: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 12,
      marginBottom: 20,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    kpiCardWin: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.success,
    },
    kpiCardDraw: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.warning,
    },
    kpiCardLoss: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.error,
    },
    kpiIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    kpiLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    kpiValue: {
      fontSize: 32,
      fontWeight: '700',
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: isMobile ? 14 : 18,
      padding: isMobile ? 14 : 18,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginLeft: 12,
    },
    goalsChart: {
      gap: 16,
    },
    goalBarContainer: {
      marginBottom: 12,
    },
    goalBarLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    goalBarLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    goalBarValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    progressBarBg: {
      height: 10,
      backgroundColor: theme.colors.border,
      borderRadius: 5,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 5,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statRowLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    statRowValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    tacticalGrid: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 14,
    },
    tacticalItem: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tacticalValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.primary,
      marginBottom: 4,
      textAlign: 'center',
    },
    tacticalLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontWeight: '500',
    },
    tableWrapper: {
      alignItems: 'center',
      marginBottom: 16,
    },
    tableContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tableHeader: {
      flexDirection: 'row',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    th: {
      paddingVertical: 14,
      paddingHorizontal: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    thText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tr: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    trEven: {
      backgroundColor: theme.colors.surface,
    },
    trOdd: {
      backgroundColor: theme.colors.background,
    },
    td: {
      paddingVertical: 14,
      paddingHorizontal: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tdText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    playerName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'left',
      width: '100%',
    },
    playerPosition: {
      fontSize: 11,
      color: theme.colors.textMuted,
      textAlign: 'left',
      width: '100%',
      marginTop: 2,
    },
    goalBadge: {
      backgroundColor: theme.colors.success + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    goalBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.success,
    },
    cardY: {
      backgroundColor: theme.colors.warning + '25',
      width: 22,
      height: 26,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardR: {
      backgroundColor: theme.colors.error + '25',
      width: 22,
      height: 26,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.text,
    },
    weeklyAttendanceSection: {
      marginTop: isMobile ? 16 : 20,
      paddingHorizontal: 0,
    },
    weekCard: {
      marginTop: isMobile ? 12 : 16,
      paddingTop: isMobile ? 12 : 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    weekHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: isMobile ? 10 : 14,
      gap: isMobile ? 6 : 8,
    },
    weekHeaderLeft: {
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? 6 : 12,
      flex: 1,
    },
    weekLabel: {
      fontSize: isMobile ? 12 : 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    weekBadge: {
      backgroundColor: theme.colors.primary + '15',
      paddingHorizontal: isMobile ? 10 : 14,
      paddingVertical: isMobile ? 4 : 6,
      borderRadius: isMobile ? 10 : 12,
    },
    weekBadgeText: {
      fontSize: isMobile ? 10 : 12,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    weekPdfButton: {
      backgroundColor: theme.colors.error,
      width: isMobile ? 32 : 36,
      height: isMobile ? 32 : 36,
      borderRadius: isMobile ? 8 : 10,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.error,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    weekPlayersGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isMobile ? 8 : 10,
    },
    weekPlayerItem: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: isMobile ? 10 : 14,
      paddingVertical: isMobile ? 10 : 12,
      borderRadius: isMobile ? 10 : 12,
      width: isMobile ? '100%' : 'auto',
      minWidth: isMobile ? '100%' : 160,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    weekPlayerName: {
      fontSize: isMobile ? 11 : 13,
      fontWeight: '500',
      color: theme.colors.text,
      flex: 1,
      marginRight: isMobile ? 6 : 8,
    },
    weekPlayerStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isMobile ? 6 : 8,
    },
    weekPlayerCount: {
      fontSize: isMobile ? 10 : 12,
      fontWeight: '600',
      color: theme.colors.text,
    },
    weekPlayerPercentage: {
      fontSize: isMobile ? 10 : 12,
      fontWeight: '700',
    },
    // Responsive Player Cards
    playersListContainer: {
      paddingHorizontal: 16,
    },
    playerCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    playerCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    playerCardLeft: {
      flex: 1,
    },
    playerCardName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    playerCardPosition: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    goalBadgeLarge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      gap: 6,
    },
    goalBadgeLargeText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 12,
    },
    statItem: {
      flex: 1,
      minWidth: isMobile ? '18%' : 80,
      backgroundColor: theme.colors.background,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statLabel: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    attendanceSection: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    attendanceSectionTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    attendanceGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    attendanceItem: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    attendanceLabel: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      marginBottom: 4,
    },
    attendanceValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    cardsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    // Date Filter Styles
    dateFilterContainer: {
      marginBottom: isMobile ? 12 : 16,
      paddingBottom: isMobile ? 12 : 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    dateFilterInputs: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 10 : 12,
      marginBottom: isMobile ? 6 : 8,
    },
    dateFilterItem: {
      flex: 1,
    },
    dateFilterLabel: {
      fontSize: isMobile ? 11 : 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: isMobile ? 4 : 6,
    },
    dateFilterButton: {
      backgroundColor: theme.colors.inputBg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: isMobile ? 10 : 12,
      paddingHorizontal: isMobile ? 12 : 14,
      paddingVertical: isMobile ? 10 : 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dateFilterButtonText: {
      fontSize: isMobile ? 12 : 14,
      color: theme.colors.text,
    },
    clearFilterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isMobile ? 4 : 6,
      alignSelf: 'flex-start',
      marginTop: isMobile ? 8 : 10,
      paddingVertical: isMobile ? 6 : 8,
      paddingHorizontal: isMobile ? 10 : 12,
      borderRadius: isMobile ? 6 : 8,
      backgroundColor: theme.colors.error + '10',
    },
    clearFilterText: {
      fontSize: isMobile ? 11 : 12,
      fontWeight: '600',
      color: theme.colors.error,
    },
    filterButtons: {
      flexDirection: 'row',
      gap: isMobile ? 12 : 16,
      alignItems: 'center',
      marginTop: isMobile ? 10 : 12,
      justifyContent: isMobile ? 'space-between' : 'flex-start',
    },
    applyFilterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isMobile ? 4 : 6,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: isMobile ? 14 : 18,
      paddingVertical: isMobile ? 8 : 10,
      borderRadius: isMobile ? 10 : 12,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    applyFilterButtonDisabled: {
      backgroundColor: theme.colors.textMuted,
      shadowOpacity: 0,
      elevation: 0,
    },
    applyFilterText: {
      fontSize: isMobile ? 12 : 13,
      fontWeight: '600',
      color: '#ffffff',
    },
    emptyFilterState: {
      alignItems: 'center',
      paddingVertical: isMobile ? 36 : 48,
    },
    emptyFilterText: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginTop: isMobile ? 12 : 14,
    },
    emptyFilterSubText: {
      fontSize: isMobile ? 11 : 13,
      color: theme.colors.textMuted,
      marginTop: isMobile ? 4 : 6,
      textAlign: 'center',
    },
    playerFilterContainer: {
      marginBottom: isMobile ? 12 : 16,
    },
    playerFilterTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.inputBg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: isMobile ? 10 : 12,
      paddingHorizontal: isMobile ? 12 : 16,
      paddingVertical: isMobile ? 10 : 14,
      marginTop: isMobile ? 6 : 8,
    },
    playerFilterTriggerText: {
      fontSize: isMobile ? 12 : 14,
      color: theme.colors.text,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: isMobile ? 20 : 24,
      borderTopRightRadius: isMobile ? 20 : 24,
      padding: isMobile ? 16 : 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: isMobile ? 16 : 20,
      paddingBottom: isMobile ? 12 : 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: isMobile ? 12 : 16,
    },
    modalActionButton: {
      paddingVertical: isMobile ? 8 : 10,
      paddingHorizontal: isMobile ? 10 : 12,
      borderRadius: isMobile ? 6 : 8,
      backgroundColor: theme.colors.primary + '10',
    },
    modalActionText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: isMobile ? 12 : 14,
    },
    modalList: {
      marginBottom: isMobile ? 16 : 20,
    },
    modalItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: isMobile ? 12 : 14,
      paddingHorizontal: isMobile ? 6 : 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      borderRadius: isMobile ? 6 : 8,
    },
    modalItemActive: {
      backgroundColor: theme.colors.primary + '10',
    },
    modalItemText: {
      fontSize: isMobile ? 13 : 15,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    modalItemTextActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    modalConfirmButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: isMobile ? 14 : 16,
      borderRadius: isMobile ? 12 : 14,
      alignItems: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
    modalConfirmButtonText: {
      color: '#ffffff',
      fontSize: isMobile ? 14 : 16,
      fontWeight: '700',
    },
    // New Team Statistics Styles
    performanceRingCard: {
      marginBottom: isMobile ? 12 : 18,
      borderRadius: isMobile ? 14 : 18,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 6,
    },
    performanceRingGradient: {
      padding: isMobile ? 16 : 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    performanceRingContent: {
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      gap: 24,
    },
    performanceRingLeft: {
      alignItems: 'center',
    },
    performanceRingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    performanceRingOuter: {
      width: isMobile ? 104 : 132,
      height: isMobile ? 104 : 132,
      borderRadius: isMobile ? 52 : 66,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    performanceRingProgress: {
      position: 'absolute',
      width: isMobile ? 104 : 132,
      height: isMobile ? 104 : 132,
      borderRadius: isMobile ? 52 : 66,
      borderWidth: isMobile ? 6 : 8,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    performanceRingInner: {
      width: isMobile ? 80 : 100,
      height: isMobile ? 80 : 100,
      borderRadius: isMobile ? 40 : 50,
      backgroundColor: 'rgba(15,23,42,0.72)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    performanceRingValue: {
      fontSize: isMobile ? 22 : 28,
      fontWeight: '800',
      color: '#ffffff',
    },
    performanceRingLabel: {
      fontSize: isMobile ? 9 : 11,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.6)',
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    performanceRingRight: {
      flex: 1,
      width: isMobile ? '100%' : 'auto',
    },
    performanceRingStats: {
      gap: 12,
    },
    performanceRingStat: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.09)',
      borderRadius: isMobile ? 10 : 12,
      padding: isMobile ? 10 : 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    performanceStatDot: {
      width: isMobile ? 8 : 10,
      height: isMobile ? 8 : 10,
      borderRadius: isMobile ? 4 : 5,
      marginRight: isMobile ? 8 : 12,
    },
    performanceStatLabel: {
      flex: 1,
      fontSize: isMobile ? 12 : 14,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '500',
    },
    performanceStatValue: {
      fontSize: isMobile ? 16 : 20,
      fontWeight: '700',
      color: '#ffffff',
    },
    resultsStripContainer: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 12,
      marginBottom: 16,
    },
    resultsStripItem: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
    },
    resultsStripGradient: {
      padding: 18,
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    resultsStripIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    resultsStripValue: {
      fontSize: 32,
      fontWeight: '800',
      marginBottom: 4,
    },
    resultsStripLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      letterSpacing: 1,
    },
    goalsComparisonCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: isMobile ? 14 : 18,
      overflow: 'hidden',
      marginBottom: isMobile ? 12 : 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    goalsComparisonHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: isMobile ? 14 : 18,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    goalsComparisonIconWrap: {
      width: isMobile ? 30 : 36,
      height: isMobile ? 30 : 36,
      borderRadius: isMobile ? 8 : 10,
      backgroundColor: theme.colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: isMobile ? 10 : 12,
    },
    goalsComparisonTitle: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    goalsComparisonBody: {
      flexDirection: isMobile ? 'column' : 'row',
      padding: isMobile ? 16 : 20,
      gap: isMobile ? 12 : 16,
    },
    goalsComparisonSide: {
      flex: 1,
      alignItems: isMobile ? 'stretch' : 'center',
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: isMobile ? 12 : 14,
      padding: isMobile ? 14 : 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    goalsComparisonSideLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      letterSpacing: 1,
      marginBottom: 8,
    },
    goalsComparisonSideValue: {
      fontSize: isMobile ? 36 : 48,
      fontWeight: '800',
      marginBottom: isMobile ? 8 : 12,
    },
    goalsComparisonBar: {
      width: '100%',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    goalsComparisonBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    goalsComparisonDivider: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: isMobile ? 0 : 12,
    },
    goalsComparisonDiffBadge: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    goalsComparisonDiffText: {
      fontSize: 18,
      fontWeight: '800',
    },
    goalsComparisonFooter: {
      flexDirection: isMobile ? 'column' : 'row',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingVertical: 16,
      paddingHorizontal: 20,
      gap: isMobile ? 12 : 0,
    },
    goalsComparisonFooterItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    goalsComparisonFooterLabel: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    goalsComparisonFooterValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    goalsComparisonFooterDivider: {
      width: 1,
      backgroundColor: theme.colors.border,
      marginHorizontal: 16,
    },
    rivalGoalCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: isMobile ? 14 : 18,
      overflow: 'hidden',
      marginBottom: isMobile ? 12 : 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    rivalGoalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: isMobile ? 14 : 18,
      backgroundColor: theme.colors.error,
    },
    rivalGoalIconWrap: {
      width: isMobile ? 30 : 36,
      height: isMobile ? 30 : 36,
      borderRadius: isMobile ? 8 : 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: isMobile ? 10 : 12,
    },
    rivalGoalTitle: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '700',
      color: '#ffffff',
    },
    rivalGoalMatchCount: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
      marginLeft: 'auto',
    },
    rivalGoalMetricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: isMobile ? 14 : 18,
      paddingHorizontal: isMobile ? 8 : 12,
    },
    rivalGoalMetricItem: {
      alignItems: 'center',
      flex: 1,
    },
    rivalGoalMetricValue: {
      fontSize: isMobile ? 22 : 26,
      fontWeight: '700',
    },
    rivalGoalMetricLabel: {
      color: theme.colors.textSecondary,
      fontSize: isMobile ? 10 : 11,
      textAlign: 'center',
      marginTop: 4,
    },
    rivalGoalMetricDivider: {
      width: 1,
      backgroundColor: theme.colors.border,
    },
    rivalGoalHistogram: {
      paddingHorizontal: isMobile ? 12 : 16,
      paddingBottom: isMobile ? 12 : 16,
    },
    rivalGoalBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    rivalGoalBarLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      width: 50,
      textAlign: 'right',
      marginRight: 8,
    },
    rivalGoalBarTrack: {
      flex: 1,
      height: 18,
      backgroundColor: theme.colors.background,
      borderRadius: 6,
      overflow: 'hidden',
    },
    rivalGoalBarFill: {
      height: '100%',
      borderRadius: 6,
      justifyContent: 'center',
      paddingLeft: 6,
    },
    rivalGoalBarCount: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
    rivalGoalHalfLabel: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
    },
    tacticalStatsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isMobile ? 8 : 14,
    },
    tacticalStatCard: {
      flex: 1,
      minWidth: isMobile ? '31%' : 170,
      borderRadius: isMobile ? 12 : 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    tacticalStatGradient: {
      padding: isMobile ? 12 : 18,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: isMobile ? 90 : 120,
    },
    tacticalStatValue: {
      fontSize: isMobile ? 16 : 22,
      fontWeight: '800',
      color: '#ffffff',
      marginTop: isMobile ? 6 : 10,
      marginBottom: isMobile ? 2 : 4,
      textAlign: 'center',
    },
    tacticalStatLabel: {
      fontSize: isMobile ? 9 : 11,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // New Player Statistics Styles
    playersSummaryCard: {
      marginBottom: isMobile ? 12 : 18,
      borderRadius: isMobile ? 14 : 18,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 6,
    },
    playersSummaryGradient: {
      padding: isMobile ? 14 : 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    playersSummaryContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    playersSummaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    playersSummaryIconWrap: {
      width: isMobile ? 36 : 44,
      height: isMobile ? 36 : 44,
      borderRadius: isMobile ? 10 : 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: isMobile ? 6 : 10,
    },
    playersSummaryValue: {
      fontSize: isMobile ? 18 : 24,
      fontWeight: '800',
      color: '#ffffff',
      marginBottom: 2,
    },
    playersSummaryLabel: {
      fontSize: isMobile ? 9 : 11,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.6)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    playersSummaryDivider: {
      width: 1,
      height: isMobile ? 40 : 50,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    sortControlsContainer: {
      marginBottom: isMobile ? 10 : 14,
    },
    sortControlsLabel: {
      fontSize: isMobile ? 11 : 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: isMobile ? 8 : 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sortControlsScroll: {
      flexDirection: 'row',
    },
    sortChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: isMobile ? 10 : 13,
      paddingVertical: isMobile ? 8 : 9,
      borderRadius: isMobile ? 10 : 12,
      marginRight: isMobile ? 6 : 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: isMobile ? 4 : 6,
    },
    sortChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    sortChipText: {
      fontSize: isMobile ? 11 : 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    sortChipTextActive: {
      color: theme.colors.onPrimary,
    },
    positionLegendContainer: {
      paddingHorizontal: isMobile ? 12 : 16,
      paddingVertical: isMobile ? 9 : 11,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: 12,
      marginBottom: isMobile ? 10 : 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    positionLegendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: isMobile ? 12 : 20,
    },
    positionLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    positionLegendDot: {
      width: isMobile ? 10 : 12,
      height: isMobile ? 10 : 12,
      borderRadius: isMobile ? 5 : 6,
    },
    positionLegendText: {
      fontSize: isMobile ? 11 : 13,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    playerCardsContainer: {
      gap: 12,
      marginBottom: 20,
    },
    playerStatCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    playerStatCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    playerStatCardRank: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    playerStatCardRankText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    playerStatCardInfo: {
      flex: 1,
    },
    playerStatCardName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 2,
    },
    playerStatCardPosition: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    positionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    playerStatCardPositionText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    playerGoalsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.success,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 4,
    },
    playerGoalsBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    playerStatCardBody: {
      padding: 14,
    },
    playerStatRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    playerStatItem: {
      alignItems: 'center',
      flex: 1,
    },
    playerStatItemValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 2,
    },
    playerStatItemLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    playerStatDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 12,
    },
    playerStatFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    playerCardsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    playerYellowCard: {
      backgroundColor: '#fbbf24',
      width: 20,
      height: 26,
      borderRadius: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playerRedCard: {
      backgroundColor: '#ef4444',
      width: 20,
      height: 26,
      borderRadius: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playerCardNumber: {
      fontSize: 10,
      fontWeight: '700',
      color: '#ffffff',
    },
    playerAttendanceBar: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginLeft: 16,
      gap: 10,
    },
    playerAttendanceBarBg: {
      flex: 1,
      height: 6,
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    playerAttendanceBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    playerAttendanceText: {
      fontSize: 13,
      fontWeight: '700',
      minWidth: 40,
      textAlign: 'right',
    },
    // Compact Player List Styles
    playerSearchContainer: {
      marginBottom: isMobile ? 10 : 14,
    },
    playerSearchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: isMobile ? 12 : 14,
      paddingHorizontal: isMobile ? 12 : 14,
      paddingVertical: isMobile ? 10 : 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: isMobile ? 8 : 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 1,
    },
    playerSearchInput: {
      flex: 1,
      fontSize: isMobile ? 12 : 14,
      color: theme.colors.text,
      paddingVertical: 0,
    },
    compactPlayerList: {
      backgroundColor: theme.colors.surface,
      borderRadius: isMobile ? 14 : 18,
      overflow: 'hidden',
      marginBottom: isMobile ? 16 : 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.05,
      shadowRadius: 18,
      elevation: 2,
    },
    compactPlayerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: isMobile ? 10 : 13,
      paddingHorizontal: isMobile ? 12 : 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: isMobile ? 8 : 12,
    },
    compactPlayerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: isMobile ? 1.2 : 1,
      minWidth: 0,
      maxWidth: isMobile ? '45%' : '42%',
    },
    compactPlayerRank: {
      fontSize: isMobile ? 10 : 11,
      fontWeight: '600',
      color: theme.colors.textMuted,
      width: isMobile ? 22 : 28,
    },
    compactPositionDot: {
      width: isMobile ? 6 : 8,
      height: isMobile ? 6 : 8,
      borderRadius: isMobile ? 3 : 4,
      marginRight: isMobile ? 6 : 8,
    },
    compactPlayerName: {
      fontSize: isMobile ? 12 : 14,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    compactPlayerStats: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: isMobile ? 4 : 10,
      flexWrap: 'nowrap',
      flex: isMobile ? 2 : 1,
    },
    compactStatBox: {
      alignItems: 'center',
      minWidth: isMobile ? 28 : 42,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: 8,
      paddingVertical: isMobile ? 4 : 7,
      paddingHorizontal: isMobile ? 3 : 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    compactStatValue: {
      fontSize: isMobile ? 12 : 13,
      fontWeight: '700',
      color: theme.colors.text,
    },
    compactStatLabel: {
      fontSize: isMobile ? 8 : 9,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
    },
    compactCardsContainer: {
      flexDirection: 'row',
      gap: 3,
      minWidth: isMobile ? 24 : 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    compactCardGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    compactYellowCard: {
      backgroundColor: '#fbbf24',
      width: isMobile ? 12 : 14,
      height: isMobile ? 16 : 18,
      borderRadius: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactRedCard: {
      backgroundColor: '#ef4444',
      width: isMobile ? 12 : 14,
      height: isMobile ? 16 : 18,
      borderRadius: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactCardText: {
      fontSize: isMobile ? 8 : 9,
      fontWeight: '700',
      color: '#ffffff',
    },
    compactDoubleYellowText: {
      fontSize: isMobile ? 7 : 8,
      color: '#92400e',
      fontWeight: '600',
    },
    compactAttendance: {
      fontSize: isMobile ? 10 : 12,
      fontWeight: '700',
      minWidth: isMobile ? 28 : 38,
      textAlign: 'center',
    },
  });
