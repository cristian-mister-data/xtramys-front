// components/pages/PlayerProfile.js
import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useSelector } from 'react-redux';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { savePdfToDownloads } from '../../utils/pdfDownload';
import {
  generateProfilePdf,
  generateAnthropometryPdf,
  generateAttendancePdf,
  generateInjuryPdf,
  generateWellnessPdf,
  generatePreWellnessPdf
} from './pdf';

import { getPlayerWellnessHistory, getPlayerAnthropometry, getPlayerAnthropometryPDF, getPlayerPreWellnessHistory } from '../../utils/api';
import { getPlayerFullName } from '../../utils/playerHelpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '@/vendor/shared/ProfessionalHeader';
import { useTheme } from 'styled-components';

// Detectar si es móvil
const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

// Helper para obtener locale basado en i18n
const getLocale = () => i18n.language === 'en' ? 'en-US' : 'es-ES';

// Helper para color según nivel de wellness
const getWellnessColor = (value, isDark = false) => {
  if (!value) return '#64748b';
  if (value >= 8) return isDark ? '#4ade80' : '#00521493'; // Verde
  if (value >= 6) return isDark ? '#fbbf24' : '#f59e0b'; // Naranja
  if (value >= 4) return isDark ? '#fb923c' : '#f97316'; // Naranja oscuro
  return isDark ? '#f87171' : '#ef4444'; // Rojo
};

// Helper para convertir URL de imagen a base64
const imageToBase64 = async (url) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Mobile (React Native / Expo)
      const filename = url.split('/').pop().split('?')[0] || 'photo.jpg';
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.downloadAsync(url, localUri);
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const ext = filename.split('.').pop().toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${base64}`;
    }
  } catch (error) {
    console.warn('Error converting image to base64, using original URL:', error);
    return url;
  }
};

const PlayerProfile = ({ visible, player, team, onClose }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isDark = theme.mode === 'dark';
  const insets = useSafeAreaInsets();
  const [wellnessData, setWellnessData] = useState(null);
  const [loadingWellness, setLoadingWellness] = useState(false);
  const [showWellnessDetail, setShowWellnessDetail] = useState(false);
  
  // Estados para pre-wellness
  const [preWellnessData, setPreWellnessData] = useState(null);
  const [loadingPreWellness, setLoadingPreWellness] = useState(false);
  const [showPreWellnessDetail, setShowPreWellnessDetail] = useState(false);
  
  // Estados para antropometría
  const [anthropometryData, setAnthropometryData] = useState([]);
  const [loadingAnthropometry, setLoadingAnthropometry] = useState(false);
  const [showAnthropometryDetail, setShowAnthropometryDetail] = useState(false);
  
  // Estado para detalle de asistencia
  const [showAttendanceDetail, setShowAttendanceDetail] = useState(false);
  
  // Obtener datos del Redux (igual que en statistics.js)
  const matchSheets = useSelector(state => state.matchSheet.matchSheets) || [];
  const injuries = useSelector(state => state.injury.injuries) || [];
  const trainingSessions = useSelector(state => state.session.session) || [];

  // Cargar historial de wellness del jugador
  useEffect(() => {
    const loadWellnessHistory = async () => {
      if (!player || !visible) return;
      
      setLoadingWellness(true);
      try {
        const data = await getPlayerWellnessHistory(player._id, team?._id);
        setWellnessData(data);
      } catch (error) {
        console.error('Error loading wellness history:', error);
        setWellnessData(null);
      } finally {
        setLoadingWellness(false);
      }
    };

    loadWellnessHistory();
  }, [player, visible]);

  // Cargar historial de pre-wellness del jugador
  useEffect(() => {
    const loadPreWellnessHistory = async () => {
      if (!player || !visible) return;
      
      setLoadingPreWellness(true);
      try {
        const data = await getPlayerPreWellnessHistory(player._id, team?._id);
        setPreWellnessData(data);
      } catch (error) {
        console.error('Error loading pre-wellness history:', error);
        setPreWellnessData(null);
      } finally {
        setLoadingPreWellness(false);
      }
    };

    loadPreWellnessHistory();
  }, [player, visible]);

  // Cargar historial de antropometría del jugador
  useEffect(() => {
    const loadAnthropometryHistory = async () => {
      if (!player || !visible) return;
      
      setLoadingAnthropometry(true);
      try {
        const data = await getPlayerAnthropometry(player._id);
        // Ordenar por fecha descendente (más reciente primero)
        const sortedData = (data || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setAnthropometryData(sortedData);
      } catch (error) {
        console.error('Error loading anthropometry history:', error);
        setAnthropometryData([]);
      } finally {
        setLoadingAnthropometry(false);
      }
    };

    loadAnthropometryHistory();
  }, [player, visible]);

  // Calcular estadísticas del jugador (misma lógica que statistics.js)
  const stats = useMemo(() => {
    if (!player || !visible) return null;

    const playerId = player._id;

    // Inicializar estadísticas del jugador
    const playerStats = {
      matches: {
        total: 0,
        starter: 0,
        substitute: 0,
        notCalled: 0,
        bench: 0,
        minutesPlayed: 0
      },
      goals: { total: 0, assists: 0 },
      cards: { yellow: 0, red: 0 },
      trainings: {
        attended: 0,
        total: 0,
        percentage: 0,
        missed: 0,
        missedSessions: [], // Array con sesiones a las que faltó
        weeklyAverageAbsences: 0,
        currentStreak: 0, // Racha actual de asistencia
        bestStreak: 0 // Mejor racha de asistencia
      },
      injuries: {
        total: 0,
        active: 0,
        recovered: 0,
        daysMissed: 0
      }
    };

    // Helper para parsear minuto que puede ser string como "45+2", "90+3" o número
    const parseMinuto = (minuto, defaultValue = 90) => {
      if (typeof minuto === 'number') return minuto;
      if (typeof minuto === 'string') {
        if (minuto.includes('+')) {
          const parts = minuto.split('+');
          const baseMinuto = parseInt(parts[0]);
          const addedTime = parseInt(parts[1]) || 0;
          if (!isNaN(baseMinuto)) {
            return baseMinuto + addedTime;
          }
        }
        const parsed = parseInt(minuto);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return defaultValue;
    };

    // Helper para verificar si un partido ya se ha jugado
    const isMatchPlayed = (match) => {
      // Un partido se considera jugado si la fecha del partido es anterior a hoy a la hora actual
      if (match.fechaHora && new Date(match.fechaHora) < new Date()) return true;
      return false;
    };

    // Procesar partidos jugados
    matchSheets.filter(match => isMatchPlayed(match)).forEach(match => {
      const tiempoPorParte = 45;
      const descuentoPrimerTiempo = match.descuentoPrimerTiempo || 0;
      const descuentoSegundoTiempo = match.descuentoSegundoTiempo || 0;
      const tiempoPrimeraParte = tiempoPorParte + descuentoPrimerTiempo;
      const tiempoSegundaParte = tiempoPorParte + descuentoSegundoTiempo;
      const tiempoTotal = tiempoPrimeraParte + tiempoSegundaParte;

      const starters = (match.alineacionTitulares || []).map(p => typeof p === 'object' ? p._id : p);
      const subs = (match.alineacionSuplentes || []).map(p => typeof p === 'object' ? p._id : p);
      const notCalled = (match.noConvocados || []).map(p => typeof p === 'object' ? p._id : p);

      const calcularMinutosJugador = (minutoSalida) => {
        const minuto = parseMinuto(minutoSalida, tiempoTotal);
        if (minuto <= tiempoPorParte) {
          return minuto;
        } else {
          return tiempoPrimeraParte + (minuto - tiempoPorParte);
        }
      };

      const calcularMinutosDesdeEntrada = (minutoEntrada) => {
        const minuto = parseMinuto(minutoEntrada, tiempoTotal);
        if (minuto <= tiempoPorParte) {
          return (tiempoPorParte - minuto) + descuentoPrimerTiempo + tiempoSegundaParte;
        } else {
          return tiempoSegundaParte - (minuto - tiempoPorParte);
        }
      };

      const playedIds = new Set([...starters]);
      let wasSubbedOut = false;

      // Procesar cambios
      (match.cambios || []).forEach(cambio => {
        const saleId = typeof cambio.sale === 'object' ? cambio.sale._id : cambio.sale;
        const entraId = typeof cambio.entra === 'object' ? cambio.entra._id : cambio.entra;

        playedIds.add(entraId);

        if (saleId === playerId) {
          wasSubbedOut = true;
          if (starters.includes(playerId)) {
            playerStats.matches.minutesPlayed += calcularMinutosJugador(cambio.minuto);
          }
        }

        if (entraId === playerId) {
          playerStats.matches.substitute++;
          playerStats.matches.total++;
          playerStats.matches.minutesPlayed += calcularMinutosDesdeEntrada(cambio.minuto);
        }
      });

      // Si fue titular
      if (starters.includes(playerId)) {
        playerStats.matches.starter++;
        playerStats.matches.total++;
        if (!wasSubbedOut) {
          playerStats.matches.minutesPlayed += tiempoTotal;
        }
      }

      // Si fue suplente pero no entró
      if (subs.includes(playerId) && !playedIds.has(playerId)) {
        playerStats.matches.bench++;
      }

      // Si no fue convocado
      if (notCalled.includes(playerId)) {
        playerStats.matches.notCalled++;
      }

      // No convocado implícito
      const allInMatch = new Set([...starters, ...subs, ...notCalled]);
      if (!allInMatch.has(playerId)) {
        playerStats.matches.notCalled++;
      }

      // Goles y tarjetas desde eventos
      if (match.eventos && match.eventos.length > 0) {
        match.eventos.forEach(evento => {
          const pid = typeof evento.player === 'object' ? evento.player._id : evento.player;
          if (pid === playerId) {
            playerStats.goals.total += (evento.goles || 0);
            if (evento.tarjetaAmarilla) playerStats.cards.yellow++;
            if (evento.tarjetaRoja) playerStats.cards.red++;
          }
        });
      } else {
        // Fallback para partidos sin eventos
        (match.goles || []).forEach(gol => {
          const pid = typeof gol.jugador === 'object' ? gol.jugador._id : gol.jugador;
          if (pid === playerId) playerStats.goals.total++;
          
          if (gol.asistente) {
            const assistId = typeof gol.asistente === 'object' ? gol.asistente._id : gol.asistente;
            if (assistId === playerId) playerStats.goals.assists++;
          }
        });

        (match.tarjetasAmarillas || []).forEach(card => {
          const pid = typeof card.jugador === 'object' ? card.jugador._id : card.jugador;
          if (pid === playerId) playerStats.cards.yellow++;
        });

        (match.tarjetasRojas || []).forEach(card => {
          const pid = typeof card.jugador === 'object' ? card.jugador._id : card.jugador;
          if (pid === playerId) playerStats.cards.red++;
        });
      }

      // Asistencias de match.goles (siempre)
      (match.goles || []).forEach(gol => {
        if (gol.asistente) {
          const assistId = typeof gol.asistente === 'object' ? gol.asistente._id : gol.asistente;
          if (assistId === playerId && match.eventos && match.eventos.length > 0) {
            playerStats.goals.assists++;
          }
        }
      });
    });

    // Entrenamientos
    const today = new Date();
    const pastTrainingSessions = trainingSessions.filter(session => {
      if (!session.fecha) return false;
      return new Date(session.fecha) < today;
    }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // Ordenar por fecha

    // Identificar entrenamientos a los que asistió y a los que faltó
    const attendedSessions = [];
    const missedSessions = [];

    pastTrainingSessions.forEach(session => {
      const jugadoresIds = (session.jugadores || []).map(j =>
        typeof j === 'object' ? j._id : j
      );
      const jugadoresExtrasIds = (session.jugadoresExtras || []).map(j =>
        typeof j === 'object' ? j._id : j
      );
      const wasPresent = jugadoresIds.includes(playerId) || jugadoresExtrasIds.includes(playerId);
      
      if (wasPresent) {
        attendedSessions.push(session);
      } else {
        missedSessions.push({
          _id: session._id,
          fecha: session.fecha
        });
      }
    });

    // Calcular rachas de asistencia
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Recorrer sesiones ordenadas cronológicamente
    pastTrainingSessions.forEach(session => {
      const jugadoresIds = (session.jugadores || []).map(j =>
        typeof j === 'object' ? j._id : j
      );
      const jugadoresExtrasIds = (session.jugadoresExtras || []).map(j =>
        typeof j === 'object' ? j._id : j
      );
      const wasPresent = jugadoresIds.includes(playerId) || jugadoresExtrasIds.includes(playerId);
      
      if (wasPresent) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    });
    currentStreak = tempStreak; // La racha actual es el último valor de tempStreak

    // Calcular media de faltas por semana
    let weeklyAverageAbsences = 0;
    if (missedSessions.length > 0 && pastTrainingSessions.length > 0) {
      const firstSessionDate = new Date(pastTrainingSessions[0].fecha);
      const lastSessionDate = new Date(pastTrainingSessions[pastTrainingSessions.length - 1].fecha);
      const weeksDiff = Math.max(1, Math.ceil((lastSessionDate - firstSessionDate) / (1000 * 60 * 60 * 24 * 7)));
      weeklyAverageAbsences = parseFloat((missedSessions.length / weeksDiff).toFixed(2));
    }

    playerStats.trainings.total = pastTrainingSessions.length;
    playerStats.trainings.attended = attendedSessions.length;
    playerStats.trainings.missed = missedSessions.length;
    playerStats.trainings.missedSessions = missedSessions;
    playerStats.trainings.currentStreak = currentStreak;
    playerStats.trainings.bestStreak = bestStreak;
    playerStats.trainings.weeklyAverageAbsences = weeklyAverageAbsences;
    playerStats.trainings.percentage = pastTrainingSessions.length > 0
      ? Math.round((attendedSessions.length / pastTrainingSessions.length) * 100)
      : 0;

    // Lesiones
    const playerInjuries = injuries.filter(i => {
      const injuryPlayerId = typeof i.jugador === 'object' ? i.jugador._id : i.jugador;
      return injuryPlayerId === playerId;
    });

    playerStats.injuries.total = playerInjuries.length;
    // Activa = sin fechaFin definitiva Y (sin fechaFinPrevista O fechaFinPrevista en futuro) O fechaFin en futuro
    playerStats.injuries.active = playerInjuries.filter(i => {
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
    // Recuperada = fechaFin en el pasado
    playerStats.injuries.recovered = playerInjuries.filter(i => {
      if (!i.fechaFin) return false;
      const endDate = new Date(i.fechaFin);
      return endDate < today;
    }).length;

    // Calcular días totales lesionado
    playerInjuries.forEach(injury => {
      if (injury.fechaInicio) {
        const endDate = injury.fechaFin ? new Date(injury.fechaFin) : new Date();
        const startDate = new Date(injury.fechaInicio);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        playerStats.injuries.daysMissed += diffDays;
      }
    });

    return playerStats;
  }, [player, visible, matchSheets, injuries, trainingSessions]);

  
  const exportToPDF = async () => {
    if (!stats) {
      Alert.alert(t('message.error'), t('player.profile.statsNotReady'));
      return;
    }
    try {
      let fotoBase64 = '';
      if (player?.foto) {
        fotoBase64 = await imageToBase64(player.foto);
      }
      await generateProfilePdf({ player, team, fotoBase64, stats, anthropometryData, injuries, t });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };

  const exportAnthropometryPDF = async () => {
    if (!anthropometryData || anthropometryData.length === 0) {
      Alert.alert(t('message.error'), t('anthropometry.noMeasurements'));
      return;
    }
    try {
      await generateAnthropometryPdf({ player, team, data: anthropometryData, t });
    } catch (error) {
      console.error('Error exporting anthropometry PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };

  const exportAttendancePDF = async () => {
    if (!stats || !stats.trainings) {
      Alert.alert(t('message.error'), t('player.profile.statsNotReady'));
      return;
    }
    try {
      await generateAttendancePdf({ player, team, stats, t });
    } catch (error) {
      console.error('Error exporting attendance PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };

  const exportInjuryPDF = async () => {
    const playerInjuries = injuries.filter(injury => 
      (typeof injury.jugador === 'object' ? injury.jugador._id : injury.jugador) === player._id
    );
    if (!playerInjuries || playerInjuries.length === 0) {
      Alert.alert(t('message.error'), t('player.profile.noInjuries'));
      return;
    }
    try {
      await generateInjuryPdf({ player, team, stats, injuries, t });
    } catch (error) {
      console.error('Error exporting injury PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };

  const exportWellnessPDF = async () => {
    if (!wellnessData || !wellnessData.history || wellnessData.history.length === 0) {
      Alert.alert(t('message.error'), t('player.profile.noWellnessData'));
      return;
    }
    try {
      await generateWellnessPdf({ player, team, wellnessData, t });
    } catch (error) {
      console.error('Error exporting wellness PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };

  const exportPreWellnessPDF = async () => {
    if (!preWellnessData || !preWellnessData.history || preWellnessData.history.length === 0) {
      Alert.alert(t('message.error'), t('player.profile.noPreWellnessData'));
      return;
    }
    try {
      await generatePreWellnessPdf({ player, team, preWellnessData, t });
    } catch (error) {
      console.error('Error exporting pre-wellness PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };
if (!stats) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>{t('player.profile.loadingStats')}</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>{t('player.profile.title')}</Text>
<Text style={styles.headerSubtitle}>
                {getPlayerFullName(player)}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.pdfButton} onPress={exportToPDF}>
            <MaterialIcons name="picture-as-pdf" size={22} color="#fff" />
            <Text style={styles.pdfButtonText}>{t('player.profile.exportPDF')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Información Personal */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="person" size={20} color="#3b82f6" />
              <Text style={styles.sectionTitle}>{t('player.profile.personalInfo')}</Text>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>{t('player.profile.name')}</Text>
                <Text style={styles.infoValue}>{getPlayerFullName(player)}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>{t('player.profile.age')}</Text>
                <Text style={styles.infoValue}>{player.edad || '-'} {t('player.yearsOld')}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>{t('player.profile.position')}</Text>
                <Text style={styles.infoValue}>{player.posicion || '-'}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>{t('player.profile.dorsal')}</Text>
                <Text style={styles.infoValue}>#{player.dorsal || '-'}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>{t('player.profile.type')}</Text>
                <Text style={styles.infoValue}>{player.esExtra ? t('player.profile.extraPlayer') : t('player.profile.rosterPlayer')}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>{t('player.profile.team')}</Text>
                <Text style={styles.infoValue}>{team?.nombre || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Estadísticas de Partidos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="sports-soccer" size={20} color="#00521493" />
              <Text style={styles.sectionTitle}>{t('player.profile.matchStats')}</Text>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.matchesPlayed')}</Text>
                <Text style={styles.statValue}>{stats?.matches?.total || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.asStarter')}</Text>
                <Text style={styles.statValue}>{stats?.matches?.starter || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.asSubstitute')}</Text>
                <Text style={styles.statValue}>{stats?.matches?.substitute || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.notCalled')}</Text>
                <Text style={styles.statValue}>{stats?.matches?.notCalled || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.minutesPlayed')}</Text>
                <Text style={styles.statValue}>{stats?.matches?.minutesPlayed || 0}'</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.goals')}</Text>
                <Text style={styles.statValue}>{stats?.goals?.total || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.assists')}</Text>
                <Text style={styles.statValue}>{stats?.goals?.assists || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.yellowCards')}</Text>
                <Text style={styles.statValue}>{stats?.cards?.yellow || 0}</Text>
              </View>
              {(stats?.cards?.doubleYellow || 0) > 0 && (
                <>
                  <View style={[styles.statRow, { paddingLeft: 12 }]}>
                    <Text style={[styles.statLabel, { fontSize: 12, color: '#92400e' }]}>↳ {t('player.profile.simpleYellowCards')}</Text>
                    <Text style={[styles.statValue, { fontSize: 13 }]}>{(stats?.cards?.yellow || 0) - (stats?.cards?.doubleYellow || 0)}</Text>
                  </View>
                  <View style={[styles.statRow, { paddingLeft: 12 }]}>
                    <Text style={[styles.statLabel, { fontSize: 12, color: '#92400e' }]}>↳ {t('player.profile.doubleYellowCards')}</Text>
                    <Text style={[styles.statValue, { fontSize: 13 }]}>{stats?.cards?.doubleYellow || 0}</Text>
                  </View>
                </>
              )}
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.redCards')}</Text>
                <Text style={styles.statValue}>{stats?.cards?.red || 0}</Text>
              </View>
            </View>
          </View>

          {/* Entrenamientos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="fitness-center" size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>{t('player.profile.trainingStats')}</Text>
              <TouchableOpacity 
                style={styles.exportMiniButton}
                onPress={exportAttendancePDF}
              >
                <MaterialIcons name="picture-as-pdf" size={16} color="#f59e0b" />
              </TouchableOpacity>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.trainingsAttended')}</Text>
                <Text style={styles.statValue}>
                  {stats?.trainings?.attended || 0} / {stats?.trainings?.total || 0} ({stats?.trainings?.percentage || 0}%)
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.trainingsMissed')}</Text>
                <Text style={[styles.statValue, { color: (stats?.trainings?.missed || 0) > 0 ? (isDark ? '#f87171' : '#ef4444') : (isDark ? '#4ade80' : '#00521493') }]}>
                  {stats?.trainings?.missed || 0}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.weeklyAverageAbsences')}</Text>
                <Text style={styles.statValue}>
                  {stats?.trainings?.weeklyAverageAbsences || 0}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.currentStreak')}</Text>
                <Text style={[styles.statValue, { color: isDark ? '#4ade80' : '#00521493' }]}>
                  {stats?.trainings?.currentStreak || 0} {t('player.profile.consecutiveTrainings')}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.bestStreak')}</Text>
                <Text style={[styles.statValue, { color: isDark ? '#60a5fa' : '#3b82f6' }]}>
                  {stats?.trainings?.bestStreak || 0} {t('player.profile.consecutiveTrainings')}
                </Text>
              </View>
            </View>

            {/* Lista de entrenamientos a los que faltó */}
            {stats?.trainings?.missedSessions && stats.trainings.missedSessions.length > 0 && (
              <TouchableOpacity 
                style={styles.viewDetailsButton}
                onPress={() => setShowAttendanceDetail(true)}
              >
                <MaterialIcons name="event-busy" size={16} color="#ef4444" />
                <Text style={styles.viewDetailsText}>
                  {t('player.profile.viewMissedTrainings')} ({stats.trainings.missedSessions.length})
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          {/* Lesiones */}
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="local-hospital" size={20} color="#ef4444" />
                <Text style={styles.sectionTitle}>{t('player.profile.injuryHistory')}</Text>
              </View>
              {stats?.injuries?.total > 0 && (
                <TouchableOpacity 
                  style={[styles.exportButton, { paddingHorizontal: 10, paddingVertical: 5 }]} 
                  onPress={exportInjuryPDF}
                >
                  <MaterialIcons name="picture-as-pdf" size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Estadísticas resumidas */}
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.totalInjuries')}</Text>
                <Text style={styles.statValue}>{stats?.injuries?.total || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.activeInjuries')}</Text>
                <Text style={styles.statValue}>{stats?.injuries?.active || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.recoveredInjuries')}</Text>
                <Text style={styles.statValue}>{stats?.injuries?.recovered || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.totalDaysInjured')}</Text>
                <Text style={styles.statValue}>{stats?.injuries?.daysMissed || 0}</Text>
              </View>
            </View>

            {/* Lista detallada de lesiones */}
            {stats?.injuries?.total > 0 && (
              <View style={styles.injuryListContainer}>
                <Text style={styles.injuryListTitle}>{t('player.profile.injuryDetails')}</Text>
                {injuries
                  .filter(injury => (typeof injury.jugador === 'object' ? injury.jugador._id : injury.jugador) === player._id)
                  .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio))
                  .map((injury, index) => (
                    <View key={index} style={styles.injuryCard}>
                      <View style={styles.injuryHeader}>
                        <View style={styles.injuryTypeContainer}>
                          <Text style={styles.injuryType}>
                            {injury.tipo?.value ? t('injury.types.' + injury.tipo.value, injury.tipo.label) : (injury.tipo?.label || injury.tipo?.name || injury.tipo?.es || injury.tipo || t('player.profile.unknownInjury'))}
                          </Text>
                          {injury.recaida && (
                            <View style={styles.recaidaBadge}>
                              <Text style={styles.recaidaText}>{t('player.profile.relapse')}</Text>
                            </View>
                          )}
                        </View>
                        <View style={[styles.injuryStatusBadge, { backgroundColor: (() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);

                          // Si hay fechaFin y es anterior a hoy = recuperada
                          if (injury.fechaFin) {
                            const endDate = new Date(injury.fechaFin);
                            if (endDate < today) return '#00521493'; // Recuperada
                          }

                          // Si hay fechaFinPrevista y es posterior a hoy = activa (en recuperación)
                          if (injury.fechaFinPrevista) {
                            const estimatedEndDate = new Date(injury.fechaFinPrevista);
                            if (estimatedEndDate >= today) return '#ef4444'; // Activa
                          }

                          // Sin fechas definidas = activa
                          return '#ef4444';
                        })() }]}>
                          <Text style={styles.injuryStatusText}>
                            {(() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);

                              // Si hay fechaFin y es anterior a hoy = recuperada
                              if (injury.fechaFin) {
                                const endDate = new Date(injury.fechaFin);
                                if (endDate < today) return t('player.profile.recovered');
                              }

                              // Si hay fechaFinPrevista y es posterior a hoy = activa (en recuperación)
                              if (injury.fechaFinPrevista) {
                                const estimatedEndDate = new Date(injury.fechaFinPrevista);
                                if (estimatedEndDate >= today) return t('player.profile.active');
                              }

                              // Sin fechas definidas = activa
                              return t('player.profile.active');
                            })()}
                          </Text>
                        </View>
                      </View>

                      {injury.zona && (
                        <View style={styles.injuryDetailRow}>
                          <MaterialIcons name="location-on" size={16} color="#64748b" />
                          <Text style={styles.injuryDetailLabel}>{t('player.profile.injuryLocation')}:</Text>
                          <Text style={styles.injuryDetailValue}>
                            {injury.zona?.value ? t('injury.zones.' + injury.zona.value, injury.zona.label) : (injury.zona?.label || injury.zona?.name || injury.zona?.es || injury.zona || t('player.profile.unknownLocation'))}
                          </Text>
                        </View>
                      )}

                      {injury.lesionEspecifica && (
                        <View style={styles.injuryDetailRow}>
                          <MaterialIcons name="description" size={16} color="#64748b" />
                          <Text style={styles.injuryDetailLabel}>{t('player.profile.specificInjury')}:</Text>
                          <Text style={styles.injuryDetailValue}>{injury.lesionEspecifica}</Text>
                        </View>
                      )}

                      <View style={styles.injuryDatesContainer}>
                        <View style={styles.injuryDateItem}>
                          <MaterialIcons name="event" size={14} color="#64748b" />
                          <Text style={styles.injuryDateLabel}>{t('player.profile.startDate')}:</Text>
                          <Text style={styles.injuryDateValue}>
                            {injury.fechaInicio ? new Date(injury.fechaInicio).toLocaleDateString(getLocale()) : t('player.profile.unknown')}
                          </Text>
                        </View>
                        
                        {injury.fechaFin && (
                          <View style={styles.injuryDateItem}>
                            <MaterialIcons name="event-available" size={14} color="#00521493" />
                            <Text style={styles.injuryDateLabel}>{t('player.profile.endDate')}:</Text>
                            <Text style={styles.injuryDateValue}>
                              {new Date(injury.fechaFin).toLocaleDateString(getLocale())}
                            </Text>
                          </View>
                        )}

                        {injury.fechaFinPrevista && (
                          <View style={styles.injuryDateItem}>
                            <MaterialIcons name="schedule" size={14} color="#f59e0b" />
                            <Text style={styles.injuryDateLabel}>{t('player.profile.estimatedEndDate')}:</Text>
                            <Text style={styles.injuryDateValue}>
                              {new Date(injury.fechaFinPrevista).toLocaleDateString(getLocale())}
                            </Text>
                          </View>
                        )}

                        {injury.fechaInicio && (
                          <View style={styles.injuryDateItem}>
                            <MaterialIcons name="schedule" size={14} color="#64748b" />
                            <Text style={styles.injuryDateLabel}>{t('player.profile.duration')}:</Text>
                            <Text style={styles.injuryDateValue}>
                              {(() => {
                                const startDate = new Date(injury.fechaInicio);
                                const currentDate = new Date();
                                let durationText = '';

                                // Si la lesión ya terminó (tiene fechaFin)
                                if (injury.fechaFin) {
                                  const endDate = new Date(injury.fechaFin);
                                  const diffTime = Math.abs(endDate - startDate);
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  durationText = `${diffDays} ${t('player.profile.days')}`;
                                }
                                // Si la lesión está activa
                                else {
                                  const diffTime = Math.abs(currentDate - startDate);
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                  // Si tiene fecha fin prevista, mostrar duración actual y prevista
                                  if (injury.fechaFinPrevista) {
                                    const estimatedEndDate = new Date(injury.fechaFinPrevista);
                                    const estimatedDiffTime = Math.abs(estimatedEndDate - startDate);
                                    const estimatedDiffDays = Math.ceil(estimatedDiffTime / (1000 * 60 * 60 * 24));
                                    durationText = `${diffDays} ${t('player.profile.days')} ${t('player.profile.current')} / ${estimatedDiffDays} ${t('player.profile.days')} ${t('player.profile.estimated')}`;
                                  }
                                  // Si no tiene fecha fin prevista, solo duración actual
                                  else {
                                    durationText = `${diffDays} ${t('player.profile.days')} ${t('player.profile.current')}`;
                                  }
                                }

                                return durationText;
                              })()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
              </View>
            )}
          </View>

          {/* Pre-Wellness - Solo visible en la app, no en PDF */}
          <View style={styles.section}>
            <TouchableOpacity 
              onPress={() => preWellnessData && preWellnessData.totalResponses > 0 && setShowPreWellnessDetail(true)}
              activeOpacity={preWellnessData && preWellnessData.totalResponses > 0 ? 0.7 : 1}
            >
              <View style={styles.sectionHeader}>
                <MaterialIcons name="trending-up" size={20} color="#f59e0b" />
                <Text style={styles.sectionTitle}>{t('player.profile.preWellnessHistory') || 'Pre-Wellness History'}</Text>
                <View style={styles.preWellnessBadge}>
                  <Text style={styles.preWellnessBadgeText}>PRE</Text>
                </View>
                {preWellnessData && preWellnessData.totalResponses > 0 && (
                  <MaterialIcons name="chevron-right" size={24} color="#f59e0b" style={{ marginLeft: 'auto' }} />
                )}
              </View>
              {loadingPreWellness ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : preWellnessData ? (
                <View style={styles.statsContainer}>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>{t('player.profile.totalPreWellnessReports') || 'Total Pre-Wellness Reports'}</Text>
                    <Text style={styles.statValue}>{preWellnessData.totalResponses || 0}</Text>
                  </View>
                  {preWellnessData.totalResponses > 0 && (
                    <Text style={styles.tapToViewText}>{t('player.profile.tapToViewPreWellness') || 'Tap to view pre-wellness history'}</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.noDataText}>{t('player.profile.noPreWellnessData') || 'No pre-wellness data'}</Text>
              )}
            </TouchableOpacity>
            {preWellnessData && preWellnessData.totalResponses > 0 && (
              <TouchableOpacity 
                style={styles.cardPdfButton}
                onPress={exportPreWellnessPDF}
              >
                <MaterialIcons name="picture-as-pdf" size={18} color="white" />
                <Text style={styles.cardPdfButtonText}>{t('player.profile.downloadPDF')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Wellness - Solo visible en la app, no en PDF */}
          <View style={styles.section}>
            <TouchableOpacity 
              onPress={() => wellnessData && wellnessData.totalResponses > 0 && setShowWellnessDetail(true)}
              activeOpacity={wellnessData && wellnessData.totalResponses > 0 ? 0.7 : 1}
            >
              <View style={styles.sectionHeader}>
                <MaterialIcons name="favorite" size={20} color="#8b5cf6" />
                <Text style={styles.sectionTitle}>{t('player.profile.wellnessHistory')}</Text>
                <View style={[styles.preWellnessBadge, { backgroundColor: isDark ? '#166534' : '#00521493' }]}>
                  <Text style={styles.preWellnessBadgeText}>POST</Text>
                </View>
                {wellnessData && wellnessData.totalResponses > 0 && (
                  <MaterialIcons name="chevron-right" size={24} color="#8b5cf6" style={{ marginLeft: 'auto' }} />
                )}
              </View>
              {loadingWellness ? (
                <ActivityIndicator size="small" color="#8b5cf6" />
              ) : wellnessData ? (
                <View style={styles.statsContainer}>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>{t('player.profile.totalWellnessReports')}</Text>
                    <Text style={styles.statValue}>{wellnessData.totalResponses || 0}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>{t('player.profile.averageWellness')}</Text>
                    <Text style={[styles.statValue, { color: getWellnessColor(wellnessData.averageWellness, isDark) }]}>
                      {wellnessData.averageWellness ? wellnessData.averageWellness.toFixed(1) : '-'} / 10
                    </Text>
                  </View>
                  {wellnessData.totalResponses > 0 && (
                    <Text style={styles.tapToViewText}>{t('player.profile.tapToViewWellness')}</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.noDataText}>{t('player.profile.noWellnessData')}</Text>
              )}
            </TouchableOpacity>
            {wellnessData && wellnessData.totalResponses > 0 && (
              <TouchableOpacity 
                style={[styles.cardPdfButton, { backgroundColor: '#8b5cf6' }]}
                onPress={exportWellnessPDF}
              >
                <MaterialIcons name="picture-as-pdf" size={18} color="white" />
                <Text style={styles.cardPdfButtonText}>{t('player.profile.downloadPDF')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Antropometría - Sección separada con su propio PDF */}
          <TouchableOpacity 
            style={styles.section}
            onPress={() => anthropometryData && anthropometryData.length > 0 && setShowAnthropometryDetail(true)}
            activeOpacity={anthropometryData && anthropometryData.length > 0 ? 0.7 : 1}
          >
            <View style={styles.sectionHeader}>
              <MaterialIcons name="straighten" size={20} color="#22c55e" />
              <Text style={styles.sectionTitle}>{t('anthropometry.title')}</Text>
              {anthropometryData && anthropometryData.length > 0 && (
                <MaterialIcons name="chevron-right" size={24} color="#22c55e" style={{ marginLeft: 'auto' }} />
              )}
            </View>
            {loadingAnthropometry ? (
              <ActivityIndicator size="small" color="#22c55e" />
            ) : anthropometryData && anthropometryData.length > 0 ? (
              <View style={styles.statsContainer}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>{t('anthropometry.totalMeasurements')}</Text>
                  <Text style={styles.statValue}>{anthropometryData.length}</Text>
                </View>
                {anthropometryData[0] && (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>{t('anthropometry.latestWeight')}</Text>
                      <Text style={styles.statValue}>{anthropometryData[0].peso || '-'} kg</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>{t('anthropometry.latestFatPercentage')}</Text>
                      <Text style={[styles.statValue, { color: isDark ? '#4ade80' : '#22c55e' }]}>
                        {anthropometryData[0].porcentajeGrasa ? anthropometryData[0].porcentajeGrasa.toFixed(1) : '-'}%
                      </Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>{t('anthropometry.latestMeasurementDate')}</Text>
                      <Text style={styles.statValue}>
                        {anthropometryData[0].fecha ? new Date(anthropometryData[0].fecha).toLocaleDateString(getLocale()) : '-'}
                      </Text>
                    </View>
                  </>
                )}
                <Text style={styles.tapToViewText}>{t('anthropometry.tapToViewHistory')}</Text>
              </View>
            ) : (
              <Text style={styles.noDataText}>{t('anthropometry.noMeasurements')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Modal de Detalle de Wellness */}
        <Modal
          visible={showWellnessDetail}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowWellnessDetail(false)}
        >
          <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => setShowWellnessDetail(false)} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <View>
<Text style={styles.headerTitle}>{t('player.profile.wellnessHistory')}</Text>
                  <Text style={styles.headerSubtitle}>
                    {getPlayerFullName(player)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.exportButton} onPress={exportWellnessPDF}>
                <MaterialIcons name="picture-as-pdf" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Resumen */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="analytics" size={20} color="#8b5cf6" />
                  <Text style={styles.sectionTitle}>{t('player.profile.wellnessSummary')}</Text>
                </View>
                <View style={styles.wellnessSummaryGrid}>
                  <View style={styles.wellnessSummaryCard}>
                    <Text style={styles.wellnessSummaryValue}>{wellnessData?.totalResponses || 0}</Text>
                    <Text style={styles.wellnessSummaryLabel}>{t('player.profile.totalReports')}</Text>
                  </View>
                  <View style={styles.wellnessSummaryCard}>
                    <Text style={[styles.wellnessSummaryValue, { color: getWellnessColor(wellnessData?.averageWellness, isDark) }]}>
                      {wellnessData?.averageWellness ? wellnessData.averageWellness.toFixed(1) : '-'}
                    </Text>
                    <Text style={styles.wellnessSummaryLabel}>{t('player.profile.averageScore')}</Text>
                  </View>
                </View>
              </View>

              {/* Historial completo */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="history" size={20} color="#3b82f6" />
                  <Text style={styles.sectionTitle}>{t('player.profile.completeHistory')}</Text>
                </View>
                
                {wellnessData?.history && wellnessData.history.length > 0 ? (
                  wellnessData.history.map((item, index) => (
                    <View key={index} style={styles.wellnessDetailCard}>
                      <View style={styles.wellnessDetailHeader}>
                        <View style={styles.wellnessDetailDateContainer}>
                          <MaterialIcons name="event" size={16} color="#64748b" />
                          <Text style={styles.wellnessDetailDate}>
                            {(item.sessionDate || item.session?.fecha) ? new Date(item.sessionDate || item.session?.fecha).toLocaleDateString(getLocale(), {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : t('player.profile.unknownDate')}
                          </Text>
                          {(item.sessionTime || item.session?.horaInicio) && (
                            <Text style={styles.wellnessDetailTime}>{item.sessionTime || item.session?.horaInicio}</Text>
                          )}
                        </View>
                        <View style={[styles.wellnessDetailBadge, { backgroundColor: getWellnessColor(item.wellness, isDark) }]}>
                          <Text style={styles.wellnessDetailBadgeText}>{item.wellness}/10</Text>
                        </View>
                      </View>
                      
                      {/* Nombre del equipo */}
                      {(item.teamName || item.session?.equipo?.nombre) && (
                        <View style={styles.wellnessTeamRow}>
                          <MaterialIcons name="groups" size={14} color="#64748b" />
                          <Text style={styles.wellnessTeamName}>{item.teamName || item.session?.equipo?.nombre}</Text>
                        </View>
                      )}
                      
                      {/* Respuestas a preguntas */}
                      {item.questionResponses && item.questionResponses.length > 0 && (
                        <View style={styles.wellnessQuestionsContainer}>
                          {item.questionResponses.map((qr, qIndex) => (
                            <View key={qIndex} style={styles.wellnessQuestionItem}>
                              <Text style={styles.wellnessQuestionText}>{qr.question}</Text>
                              <Text style={styles.wellnessAnswerText}>{qr.answer || qr.response || ''}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {item.submittedAt && (
                        <Text style={styles.wellnessSubmittedAt}>
                          {t('player.profile.submittedAt')}: {new Date(item.submittedAt).toLocaleString(getLocale(), {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>{t('player.profile.noWellnessData')}</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Modal de Detalle de Pre-Wellness */}
        <Modal
          visible={showPreWellnessDetail}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowPreWellnessDetail(false)}
        >
          <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => setShowPreWellnessDetail(false)} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <View>
                  <Text style={styles.headerTitle}>{t('player.profile.preWellnessHistory') || 'Pre-Wellness History'}</Text>
                  <Text style={styles.headerSubtitle}>
                    {getPlayerFullName(player)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.exportButton} onPress={exportPreWellnessPDF}>
                <MaterialIcons name="picture-as-pdf" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Resumen */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="analytics" size={20} color="#f59e0b" />
                  <Text style={styles.sectionTitle}>{t('player.profile.preWellnessSummary') || 'Pre-Wellness Summary'}</Text>
                </View>
                <View style={styles.wellnessSummaryGrid}>
                  <View style={styles.wellnessSummaryCard}>
                    <Text style={styles.wellnessSummaryValue}>{preWellnessData?.totalResponses || 0}</Text>
                    <Text style={styles.wellnessSummaryLabel}>{t('player.profile.totalReports')}</Text>
                  </View>
                </View>
              </View>

              {/* Historial completo */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="history" size={20} color="#3b82f6" />
                  <Text style={styles.sectionTitle}>{t('player.profile.completeHistory')}</Text>
                </View>
                
                {preWellnessData?.history && preWellnessData.history.length > 0 ? (
                  preWellnessData.history.map((item, index) => (
                    <View key={index} style={[styles.wellnessDetailCard, { borderLeftColor: '#f59e0b' }]}>
                      <View style={styles.wellnessDetailHeader}>
                        <View style={styles.wellnessDetailDateContainer}>
                          <MaterialIcons name="event" size={16} color="#64748b" />
                          <Text style={styles.wellnessDetailDate}>
                            {(item.sessionDate || item.session?.fecha) ? new Date(item.sessionDate || item.session?.fecha).toLocaleDateString(getLocale(), {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : t('player.profile.unknownDate')}
                          </Text>
                          {(item.sessionTime || item.session?.horaInicio) && (
                            <Text style={styles.wellnessDetailTime}>{item.sessionTime || item.session?.horaInicio}</Text>
                          )}
                        </View>
                      </View>
                      
                      {/* Nombre del equipo */}
                      {(item.teamName || item.session?.equipo?.nombre) && (
                        <View style={styles.wellnessTeamRow}>
                          <MaterialIcons name="groups" size={14} color="#64748b" />
                          <Text style={styles.wellnessTeamName}>{item.teamName || item.session?.equipo?.nombre}</Text>
                        </View>
                      )}
                      
                      {/* Respuestas a preguntas */}
                      {item.questionResponses && item.questionResponses.length > 0 && (
                        <View style={styles.wellnessQuestionsContainer}>
                          {item.questionResponses.map((qr, qIndex) => (
                            <View key={qIndex} style={styles.wellnessQuestionItem}>
                              <Text style={styles.wellnessQuestionText}>{qr.question}</Text>
                              <Text style={styles.wellnessAnswerText}>{qr.answer || qr.response || ''}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {item.submittedAt && (
                        <Text style={styles.wellnessSubmittedAt}>
                          {t('player.profile.submittedAt')}: {new Date(item.submittedAt).toLocaleString(getLocale(), {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>{t('player.profile.noPreWellnessData') || 'No pre-wellness data'}</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Modal de Detalle de Asistencia a Entrenamientos */}
        <Modal
          visible={showAttendanceDetail}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowAttendanceDetail(false)}
        >
          <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => setShowAttendanceDetail(false)} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <View>
                  <Text style={styles.headerTitle}>{t('player.profile.attendanceHistory')}</Text>
                  <Text style={styles.headerSubtitle}>
                    {getPlayerFullName(player)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.exportButton} onPress={exportAttendancePDF}>
                <MaterialIcons name="picture-as-pdf" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Resumen */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="analytics" size={20} color="#f59e0b" />
                  <Text style={styles.sectionTitle}>{t('player.profile.attendanceSummary')}</Text>
                </View>
                <View style={styles.wellnessSummaryGrid}>
                  <View style={styles.wellnessSummaryCard}>
                    <Text style={styles.wellnessSummaryValue}>{stats?.trainings?.total || 0}</Text>
                    <Text style={styles.wellnessSummaryLabel}>{t('player.profile.totalTrainings')}</Text>
                  </View>
                  <View style={styles.wellnessSummaryCard}>
                    <Text style={[styles.wellnessSummaryValue, { color: isDark ? '#4ade80' : '#00521493' }]}>
                      {stats?.trainings?.attended || 0}
                    </Text>
                    <Text style={styles.wellnessSummaryLabel}>{t('player.profile.attended')}</Text>
                  </View>
                  <View style={styles.wellnessSummaryCard}>
                    <Text style={[styles.wellnessSummaryValue, { color: isDark ? '#f87171' : '#ef4444' }]}>
                      {stats?.trainings?.missed || 0}
                    </Text>
                    <Text style={styles.wellnessSummaryLabel}>{t('player.profile.missed')}</Text>
                  </View>
                  <View style={styles.wellnessSummaryCard}>
                    <Text style={[styles.wellnessSummaryValue, { color: isDark ? '#fbbf24' : '#f59e0b' }]}>
                      {stats?.trainings?.percentage || 0}%
                    </Text>
                    <Text style={styles.wellnessSummaryLabel}>{t('player.profile.attendancePercentage')}</Text>
                  </View>
                </View>

                {/* Estadísticas adicionales */}
                <View style={styles.statsContainer}>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>{t('player.profile.weeklyAverageAbsences')}</Text>
                    <Text style={styles.statValue}>{stats?.trainings?.weeklyAverageAbsences || 0}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>{t('player.profile.currentStreak')}</Text>
                    <Text style={[styles.statValue, { color: isDark ? '#4ade80' : '#00521493' }]}>
                      {stats?.trainings?.currentStreak || 0} {t('player.profile.consecutiveTrainings')}
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>{t('player.profile.bestStreak')}</Text>
                    <Text style={[styles.statValue, { color: isDark ? '#60a5fa' : '#3b82f6' }]}>
                      {stats?.trainings?.bestStreak || 0} {t('player.profile.consecutiveTrainings')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Lista de entrenamientos a los que faltó */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="event-busy" size={20} color="#ef4444" />
                  <Text style={styles.sectionTitle}>{t('player.profile.missedTrainingsList')}</Text>
                </View>
                
                {stats?.trainings?.missedSessions && stats.trainings.missedSessions.length > 0 ? (
                  stats.trainings.missedSessions
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                    .map((session, index) => (
                      <View key={index} style={[styles.wellnessDetailCard, { borderLeftColor: '#ef4444' }]}>
                        <View style={styles.wellnessDetailHeader}>
                          <View style={styles.wellnessDetailDateContainer}>
                            <MaterialIcons name="event" size={16} color="#ef4444" />
                            <Text style={styles.wellnessDetailDate}>
                              {new Date(session.fecha).toLocaleDateString(getLocale(), {
                                weekday: 'long',
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </Text>
                            {session.horaInicio && (
                              <Text style={styles.wellnessDetailTime}>{session.horaInicio}</Text>
                            )}
                          </View>
                        </View>
                        {session.nombre && (
                          <Text style={styles.missedSessionName}>{session.nombre}</Text>
                        )}
                        {session.equipo && (
                          <View style={styles.wellnessTeamRow}>
                            <MaterialIcons name="groups" size={14} color="#64748b" />
                            <Text style={styles.wellnessTeamName}>{session.equipo}</Text>
                          </View>
                        )}
                      </View>
                    ))
                ) : (
                  <View style={styles.emptyStateCard}>
                    <MaterialIcons name="check-circle" size={40} color="#00521493" />
                    <Text style={styles.emptyStateText}>{t('player.profile.noMissedTrainings')}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Modal de Detalle de Antropometría */}
        <Modal
          visible={showAnthropometryDetail}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowAnthropometryDetail(false)}
        >
          <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => setShowAnthropometryDetail(false)} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <View>
<Text style={styles.headerTitle}>{t('anthropometry.title')}</Text>
                  <Text style={styles.headerSubtitle}>
                    {getPlayerFullName(player)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.pdfButton, { backgroundColor: '#22c55e' }]} onPress={exportAnthropometryPDF}>
                <MaterialIcons name="picture-as-pdf" size={22} color="#fff" />
                <Text style={styles.pdfButtonText}>{t('anthropometry.downloadPdf')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Última Medición */}
              {anthropometryData && anthropometryData.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons name="analytics" size={20} color="#22c55e" />
                    <Text style={styles.sectionTitle}>{t('anthropometry.latestMeasurement')}</Text>
                  </View>
                  <Text style={styles.measurementDateText}>
                    {anthropometryData[0].fecha ? new Date(anthropometryData[0].fecha).toLocaleDateString(getLocale(), {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    }) : '-'}
                  </Text>
                  
                  {/* Composición Corporal */}
                  <View style={styles.anthropometryCompositionGrid}>
                    <View style={[styles.anthropometryCompositionCard, { backgroundColor: isDark ? 'rgba(74, 222, 128, 0.15)' : '#f0fdf4', borderColor: isDark ? 'rgba(74, 222, 128, 0.3)' : '#bbf7d0' }]}>
                      <Text style={[styles.anthropometryCompositionValue, { color: isDark ? '#86efac' : '#166534' }]}>
                        {anthropometryData[0].peso || '-'}
                      </Text>
                      <Text style={styles.anthropometryCompositionUnit}>kg</Text>
                      <Text style={styles.anthropometryCompositionLabel}>{t('anthropometry.weight')}</Text>
                    </View>
                    <View style={[styles.anthropometryCompositionCard, { backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : '#eff6ff', borderColor: isDark ? 'rgba(96, 165, 250, 0.3)' : '#bfdbfe' }]}>
                      <Text style={[styles.anthropometryCompositionValue, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                        {anthropometryData[0].porcentajeGrasa ? anthropometryData[0].porcentajeGrasa.toFixed(1) : '-'}
                      </Text>
                      <Text style={styles.anthropometryCompositionUnit}>%</Text>
                      <Text style={styles.anthropometryCompositionLabel}>{t('anthropometry.fatPercentage')}</Text>
                    </View>
                    <View style={[styles.anthropometryCompositionCard, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : '#fef3c7', borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : '#fde68a' }]}>
                      <Text style={[styles.anthropometryCompositionValue, { color: isDark ? '#fcd34d' : '#92400e' }]}>
                        {anthropometryData[0].masa_grasa ? anthropometryData[0].masa_grasa.toFixed(1) : '-'}
                      </Text>
                      <Text style={styles.anthropometryCompositionUnit}>kg</Text>
                      <Text style={styles.anthropometryCompositionLabel}>{t('anthropometry.fatMass')}</Text>
                    </View>
                    <View style={[styles.anthropometryCompositionCard, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.18)' : '#f3e8ff', borderColor: isDark ? 'rgba(167, 139, 250, 0.3)' : '#d8b4fe' }]}>
                      <Text style={[styles.anthropometryCompositionValue, { color: isDark ? '#c084fc' : '#7c3aed' }]}>
                        {anthropometryData[0].masa_magra ? anthropometryData[0].masa_magra.toFixed(1) : '-'}
                      </Text>
                      <Text style={styles.anthropometryCompositionUnit}>kg</Text>
                      <Text style={styles.anthropometryCompositionLabel}>{t('anthropometry.leanMass')}</Text>
                    </View>
                  </View>
                  
                  {/* Pliegues */}
                  <View style={styles.anthropometryFoldsContainer}>
                    <Text style={styles.anthropometryFoldsTitle}>{t('anthropometry.skinfolds')} ({t('anthropometry.sixFoldsSystem')})</Text>
                    <Text style={styles.anthropometrySumText}>
                      {t('anthropometry.sumOfFolds')}: {anthropometryData[0].sumaPliegues ? anthropometryData[0].sumaPliegues.toFixed(1) : '-'} mm
                    </Text>
                    <View style={styles.anthropometryFoldsGrid}>
                      <View style={styles.anthropometryFoldItem}>
                        <Text style={styles.anthropometryFoldValue}>{anthropometryData[0].pliegues?.tricipital || '-'}</Text>
                        <Text style={styles.anthropometryFoldLabel}>{t('anthropometry.folds.tricipital')}</Text>
                      </View>
                      <View style={styles.anthropometryFoldItem}>
                        <Text style={styles.anthropometryFoldValue}>{anthropometryData[0].pliegues?.subescapular || '-'}</Text>
                        <Text style={styles.anthropometryFoldLabel}>{t('anthropometry.folds.subescapular')}</Text>
                      </View>
                      <View style={styles.anthropometryFoldItem}>
                        <Text style={styles.anthropometryFoldValue}>{anthropometryData[0].pliegues?.suprailiaco || '-'}</Text>
                        <Text style={styles.anthropometryFoldLabel}>{t('anthropometry.folds.suprailiaco')}</Text>
                      </View>
                      <View style={styles.anthropometryFoldItem}>
                        <Text style={styles.anthropometryFoldValue}>{anthropometryData[0].pliegues?.abdominal || '-'}</Text>
                        <Text style={styles.anthropometryFoldLabel}>{t('anthropometry.folds.abdominal')}</Text>
                      </View>
                      <View style={styles.anthropometryFoldItem}>
                        <Text style={styles.anthropometryFoldValue}>{anthropometryData[0].pliegues?.muslo_frontal || '-'}</Text>
                        <Text style={styles.anthropometryFoldLabel}>{t('anthropometry.folds.muslo_frontal')}</Text>
                      </View>
                      <View style={styles.anthropometryFoldItem}>
                        <Text style={styles.anthropometryFoldValue}>{anthropometryData[0].pliegues?.pierna_medial || '-'}</Text>
                        <Text style={styles.anthropometryFoldLabel}>{t('anthropometry.folds.pierna_medial')}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Historial completo */}
              {anthropometryData && anthropometryData.length > 1 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons name="history" size={20} color="#3b82f6" />
                    <Text style={styles.sectionTitle}>{t('anthropometry.playerHistory')}</Text>
                  </View>
                  
                  {anthropometryData.slice(1).map((measurement, index) => (
                    <View key={index} style={styles.anthropometryHistoryCard}>
                      <View style={styles.anthropometryHistoryHeader}>
                        <View style={styles.anthropometryHistoryDateContainer}>
                          <MaterialIcons name="event" size={16} color="#64748b" />
                          <Text style={styles.anthropometryHistoryDate}>
                            {measurement.fecha ? new Date(measurement.fecha).toLocaleDateString(getLocale(), {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </Text>
                        </View>
                        <View style={styles.anthropometryHistoryBadge}>
                          <Text style={styles.anthropometryHistoryBadgeText}>
                            {measurement.porcentajeGrasa ? measurement.porcentajeGrasa.toFixed(1) : '-'}%
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.anthropometryHistoryStats}>
                        <View style={styles.anthropometryHistoryStat}>
                          <Text style={styles.anthropometryHistoryStatValue}>{measurement.peso || '-'} kg</Text>
                          <Text style={styles.anthropometryHistoryStatLabel}>{t('anthropometry.weight')}</Text>
                        </View>
                        <View style={styles.anthropometryHistoryStat}>
                          <Text style={styles.anthropometryHistoryStatValue}>{measurement.sumaPliegues ? measurement.sumaPliegues.toFixed(1) : '-'} mm</Text>
                          <Text style={styles.anthropometryHistoryStatLabel}>{t('anthropometry.sumOfFolds')}</Text>
                        </View>
                        <View style={styles.anthropometryHistoryStat}>
                          <Text style={styles.anthropometryHistoryStatValue}>{measurement.masa_grasa ? measurement.masa_grasa.toFixed(1) : '-'} kg</Text>
                          <Text style={styles.anthropometryHistoryStatLabel}>{t('anthropometry.fatMass')}</Text>
                        </View>
                        <View style={styles.anthropometryHistoryStat}>
                          <Text style={styles.anthropometryHistoryStatValue}>{measurement.masa_magra ? measurement.masa_magra.toFixed(1) : '-'} kg</Text>
                          <Text style={styles.anthropometryHistoryStatLabel}>{t('anthropometry.leanMass')}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              
              {(!anthropometryData || anthropometryData.length === 0) && (
                <View style={styles.section}>
                  <Text style={styles.noDataText}>{t('anthropometry.noMeasurements')}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: isMobileDevice() ? 14 : 16,
    color: theme.colors.textMuted,
  },
  header: {
    backgroundColor: theme.colors.surface,
    padding: isMobileDevice() ? 12 : 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: isMobileDevice() ? 12 : 14,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: isMobileDevice() ? 10 : 16,
    paddingVertical: isMobileDevice() ? 8 : 10,
    borderRadius: 8,
    gap: 6,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: isMobileDevice() ? 12 : 13,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: isMobileDevice() ? 8 : 12,
    paddingVertical: isMobileDevice() ? 6 : 8,
    borderRadius: 8,
    gap: 6,
  },
  content: {
    flex: 1,
    padding: isMobileDevice() ? 10 : 16,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 8 : 12,
    padding: isMobileDevice() ? 12 : 16,
    marginBottom: isMobileDevice() ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isMobileDevice() ? 12 : 16,
    paddingBottom: isMobileDevice() ? 10 : 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
  },
  sectionTitle: {
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  preWellnessBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  preWellnessBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isMobileDevice() ? 8 : 12,
  },
  infoCard: {
    flex: 1,
    minWidth: isMobileDevice() ? '45%' : '30%',
    backgroundColor: theme.colors.backgroundAlt,
    padding: isMobileDevice() ? 10 : 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  statsContainer: {
    gap: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: theme.colors.textDisabled,
    textAlign: 'center',
    paddingVertical: 20,
  },
  wellnessHistoryContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  wellnessHistoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 10,
  },
  wellnessHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  wellnessHistoryDate: {
    flexDirection: 'column',
  },
  wellnessDateText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  wellnessTimeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  wellnessValueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  wellnessValueText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tapToViewText: {
    fontSize: 12,
    color: '#8b5cf6',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  cardPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    paddingVertical: isMobileDevice() ? 8 : 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  cardPdfButtonText: {
    color: '#fff',
    fontSize: isMobileDevice() ? 12 : 13,
    fontWeight: '600',
  },
  wellnessSummaryGrid: {
    flexDirection: 'row',
    gap: isMobileDevice() ? 8 : 12,
  },
  wellnessSummaryCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundAlt,
    padding: isMobileDevice() ? 12 : 16,
    borderRadius: isMobileDevice() ? 8 : 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  wellnessSummaryValue: {
    fontSize: isMobileDevice() ? 24 : 28,
    fontWeight: '700',
    color: theme.colors.text,
  },
  wellnessSummaryLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  wellnessDetailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 8 : 12,
    padding: isMobileDevice() ? 12 : 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  wellnessDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  wellnessDetailDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  wellnessDetailDate: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  wellnessDetailTime: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },
  wellnessTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  wellnessTeamName: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  wellnessDetailBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  wellnessDetailBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  wellnessQuestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  wellnessQuestionItem: {
    marginBottom: 10,
  },
  wellnessQuestionText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  wellnessAnswerText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  wellnessSubmittedAt: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 8,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  injuryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 8 : 12,
    padding: isMobileDevice() ? 12 : 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  injuryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  injuryTypeBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  injuryRelapseBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  injuryStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  injuryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  injuryLocationText: {
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  injurySpecificText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  injuryDatesText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  injuryDurationText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  injuryDetailsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  injuryListContainer: {
    marginTop: 8,
  },
  injuryListTitle: {
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  injuryTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  injuryType: {
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  recaidaBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  recaidaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  injuryStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  injuryDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  injuryDetailLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginLeft: 8,
    fontWeight: '500',
  },
  injuryDetailValue: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 4,
    flex: 1,
  },
  injuryDatesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  injuryDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  injuryDateLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginLeft: 6,
    fontWeight: '500',
  },
  injuryDateValue: {
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 4,
    fontWeight: '600',
  },
  // Estilos de Antropometría
  measurementDateText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  anthropometryCompositionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  anthropometryCompositionCard: {
    width: '48%',
    padding: isMobileDevice() ? 10 : 14,
    borderRadius: isMobileDevice() ? 8 : 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  anthropometryCompositionValue: {
    fontSize: isMobileDevice() ? 24 : 28,
    fontWeight: '700',
  },
  anthropometryCompositionUnit: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: -4,
  },
  anthropometryCompositionLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  anthropometryFoldsContainer: {
    backgroundColor: theme.colors.backgroundAlt,
    padding: isMobileDevice() ? 12 : 16,
    borderRadius: isMobileDevice() ? 8 : 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  anthropometryFoldsTitle: {
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  anthropometrySumText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
    marginBottom: 12,
  },
  anthropometryFoldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  anthropometryFoldItem: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  anthropometryFoldValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  anthropometryFoldLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  anthropometryHistoryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 8 : 12,
    padding: isMobileDevice() ? 12 : 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  anthropometryHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  anthropometryHistoryDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  anthropometryHistoryDate: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  anthropometryHistoryBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  anthropometryHistoryBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  anthropometryHistoryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  anthropometryHistoryStat: {
    width: '48%',
    backgroundColor: theme.colors.backgroundAlt,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  anthropometryHistoryStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  anthropometryHistoryStatLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.errorSoft,
    padding: isMobileDevice() ? 10 : 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  viewDetailsText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: '500',
    marginLeft: 8,
  },
  exportMiniButton: {
    marginLeft: 'auto',
    padding: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.warningSoft,
  },
  missedSessionName: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    marginTop: 6,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMobileDevice() ? 20 : 30,
    backgroundColor: theme.colors.successSoft,
    borderRadius: isMobileDevice() ? 8 : 12,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.successSoftText,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default PlayerProfile;
