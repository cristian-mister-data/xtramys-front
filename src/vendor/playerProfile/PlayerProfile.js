// components/pages/PlayerProfile.js
import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useSelector } from 'react-redux';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { savePdfToDownloads } from '../../utils/pdfDownload';
import { getPlayerWellnessHistory, getPlayerAnthropometry, getPlayerAnthropometryPDF, getPlayerPreWellnessHistory } from '../../utils/api';
import { getPlayerFullName } from '../../utils/playerHelpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '@/vendor/shared/ProfessionalHeader';

// Detectar si es móvil
const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

// Helper para obtener locale basado en i18n
const getLocale = () => i18n.language === 'en' ? 'en-US' : 'es-ES';

// Helper para color según nivel de wellness
const getWellnessColor = (value) => {
  if (!value) return '#64748b';
  if (value >= 8) return '#00521493'; // Verde
  if (value >= 6) return '#f59e0b'; // Naranja
  if (value >= 4) return '#f97316'; // Naranja oscuro
  return '#ef4444'; // Rojo
};

const PlayerProfile = ({ visible, player, team, onClose }) => {
  const { t } = useTranslation();
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
      const html = generatePDFHTML(t);
      const playerName = getPlayerFullName(player);
      const filePrefix = i18n.language === 'en' ? 'profile' : 'perfil';
      const fileName = `${filePrefix}_${playerName.replace(/\s+/g, '_')}.pdf`;
      
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false
      });
      
      await savePdfToDownloads(uri, fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };

  // Exportar PDF de antropometría (separado del PDF general)
  const exportAnthropometryPDF = async () => {
    if (!anthropometryData || anthropometryData.length === 0) {
      Alert.alert(t('message.error'), t('anthropometry.noMeasurements'));
      return;
    }
    
    try {
const html = generateAnthropometryPDFHTML(t);
      const playerName = getPlayerFullName(player);
      const fileName = `antropometria_${playerName.replace(/\s+/g, '_')}.pdf`;
      
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false
      });
      
      await savePdfToDownloads(uri, fileName);
    } catch (error) {
      console.error('Error exporting anthropometry PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };

  // Generar HTML para PDF de antropometría
const generateAnthropometryPDFHTML = (t) => {
    const playerName = getPlayerFullName(player);
    const teamName = team?.nombre || '';
    const latestMeasurement = anthropometryData[0];
    const locale = getLocale();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Antropometría - ${playerName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
            font-size: 10px;
            line-height: 1.4;
            color: #1e293b;
            padding: 20px;
          }
          
          .header {
            border-bottom: 2px solid #22c55e;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          
          .header-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 4px;
          }
          
          .header-subtitle {
            font-size: 11px;
            color: #64748b;
          }
          
          .section {
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          
          .section-header {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            padding: 6px 0;
            border-bottom: 1px solid #22c55e;
            margin-bottom: 8px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }
          
          .info-item {
            padding: 6px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
          }
          
          .info-label {
            font-size: 8px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 2px;
          }
          
          .info-value {
            font-size: 12px;
            color: #1e293b;
            font-weight: 600;
          }
          
          .stats-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          
          .stats-label {
            font-size: 9px;
            color: #475569;
          }
          
          .stats-value {
            font-size: 9px;
            color: #1e293b;
            font-weight: 600;
          }
          
          .highlight-value {
            font-size: 11px;
            color: #22c55e;
            font-weight: 700;
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          
          .table th {
            background: #f0fdf4;
            padding: 4px 6px;
            text-align: left;
            font-size: 8px;
            font-weight: 600;
            color: #166534;
            border: 1px solid #bbf7d0;
          }
          
          .table td {
            padding: 4px 6px;
            font-size: 8px;
            color: #1e293b;
            border: 1px solid #e2e8f0;
          }
          
          .footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 8px;
            color: #94a3b8;
          }
          
          .composition-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-top: 12px;
          }
          
          .composition-card {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 6px;
            padding: 12px;
            text-align: center;
          }
          
          .composition-value {
            font-size: 18px;
            font-weight: 700;
            color: #166534;
          }
          
          .composition-label {
            font-size: 9px;
            color: #475569;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-title">${t('anthropometry.title')} - ${playerName}</div>
          <div class="header-subtitle">${teamName} • ${t('anthropometry.sixFoldsSystem')}</div>
        </div>
        
        ${latestMeasurement ? `
        <div class="section">
          <div class="section-header">${t('anthropometry.latestMeasurement')} - ${new Date(latestMeasurement.fecha).toLocaleDateString(locale)}</div>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${t('anthropometry.weight')}</div>
              <div class="info-value">${latestMeasurement.peso || '-'} kg</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('anthropometry.height')}</div>
              <div class="info-value">${player.altura || '-'} cm</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('anthropometry.sumOfFolds')}</div>
              <div class="info-value">${latestMeasurement.sumaPliegues ? latestMeasurement.sumaPliegues.toFixed(1) : '-'} mm</div>
            </div>
          </div>
          
          <div class="composition-grid">
            <div class="composition-card">
              <div class="composition-value">${latestMeasurement.porcentajeGrasa ? latestMeasurement.porcentajeGrasa.toFixed(1) : '-'}%</div>
              <div class="composition-label">${t('anthropometry.fatPercentage')}</div>
            </div>
            <div class="composition-card">
              <div class="composition-value">${latestMeasurement.masa_grasa ? latestMeasurement.masa_grasa.toFixed(1) : '-'} kg</div>
              <div class="composition-label">${t('anthropometry.fatMass')}</div>
            </div>
            <div class="composition-card">
              <div class="composition-value">${latestMeasurement.masa_magra ? latestMeasurement.masa_magra.toFixed(1) : '-'} kg</div>
              <div class="composition-label">${t('anthropometry.leanMass')}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">${t('anthropometry.folds')} (${t('anthropometry.sixFoldsSystem')})</div>
          <div class="stats-row">
            <span class="stats-label">${t('anthropometry.folds.tricipital')}</span>
            <span class="stats-value">${latestMeasurement.pliegues?.tricipital || '-'} mm</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('anthropometry.folds.subescapular')}</span>
            <span class="stats-value">${latestMeasurement.pliegues?.subescapular || '-'} mm</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('anthropometry.folds.suprailiaco')}</span>
            <span class="stats-value">${latestMeasurement.pliegues?.suprailiaco || '-'} mm</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('anthropometry.folds.abdominal')}</span>
            <span class="stats-value">${latestMeasurement.pliegues?.abdominal || '-'} mm</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('anthropometry.folds.muslo_frontal')}</span>
            <span class="stats-value">${latestMeasurement.pliegues?.muslo_frontal || '-'} mm</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('anthropometry.folds.pierna_medial')}</span>
            <span class="stats-value">${latestMeasurement.pliegues?.pierna_medial || '-'} mm</span>
          </div>
        </div>
        ` : ''}
        
        ${anthropometryData.length > 1 ? `
        <div class="section">
          <div class="section-header">${t('anthropometry.playerHistory')}</div>
          <table class="table">
            <thead>
              <tr>
                <th>${t('anthropometry.date')}</th>
                <th>${t('anthropometry.weight')}</th>
                <th>${t('anthropometry.sumOfFolds')}</th>
                <th>${t('anthropometry.fatPercentage')}</th>
                <th>${t('anthropometry.fatMass')}</th>
                <th>${t('anthropometry.leanMass')}</th>
              </tr>
            </thead>
            <tbody>
              ${anthropometryData.map(m => `
                <tr>
                  <td>${new Date(m.fecha).toLocaleDateString(locale)}</td>
                  <td>${m.peso || '-'} kg</td>
                  <td>${m.sumaPliegues ? m.sumaPliegues.toFixed(1) : '-'} mm</td>
                  <td>${m.porcentajeGrasa ? m.porcentajeGrasa.toFixed(1) : '-'}%</td>
                  <td>${m.masa_grasa ? m.masa_grasa.toFixed(1) : '-'} kg</td>
                  <td>${m.masa_magra ? m.masa_magra.toFixed(1) : '-'} kg</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <div class="footer">
          ${t('player.profile.generatedAt')}: ${new Date().toLocaleDateString(locale)} ${new Date().toLocaleTimeString(locale)}
        </div>
      </body>
      </html>
    `;
  };

  // Exportar PDF de asistencia a entrenamientos
  const exportAttendancePDF = async () => {
    if (!stats || !stats.trainings) {
      Alert.alert(t('message.error'), t('player.profile.statsNotReady'));
      return;
    }
    
    try {
      const html = generateAttendancePDFHTML(t);
      const playerName = getPlayerFullName(player);
      const filePrefix = i18n.language === 'en' ? 'attendance' : 'asistencia';
      const fileName = `${filePrefix}_${playerName.replace(/\s+/g, '_')}.pdf`;
      
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false
      });
      
      await savePdfToDownloads(uri, fileName);
    } catch (error) {
      console.error('Error exporting attendance PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };

  // Exportar PDF de historial de lesiones
  const exportInjuryPDF = async () => {
    const playerInjuries = injuries.filter(injury => 
      (typeof injury.jugador === 'object' ? injury.jugador._id : injury.jugador) === player._id
    );
    
    if (!playerInjuries || playerInjuries.length === 0) {
      Alert.alert(t('message.error'), t('player.profile.noInjuries'));
      return;
    }
    
    try {
      const html = generateInjuryPDFHTML(t);
      const playerName = getPlayerFullName(player);
      const filePrefix = i18n.language === 'en' ? 'injuries' : 'lesiones';
      const fileName = `${filePrefix}_${playerName.replace(/\s+/g, '_')}.pdf`;
      
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false
      });
      
      await savePdfToDownloads(uri, fileName);
    } catch (error) {
      console.error('Error exporting injury PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };

  // Exportar PDF de historial de Wellness
  const exportWellnessPDF = async () => {
    if (!wellnessData || !wellnessData.history || wellnessData.history.length === 0) {
      Alert.alert(t('message.error'), t('player.profile.noWellnessData'));
      return;
    }
    
    try {
      const html = generateWellnessPDFHTML(t);
      const playerName = getPlayerFullName(player);
      const fileName = `wellness_${playerName.replace(/\s+/g, '_')}.pdf`;
      
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false
      });
      
      await savePdfToDownloads(uri, fileName);
    } catch (error) {
      console.error('Error exporting wellness PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };

  // Exportar PDF de historial de Pre-Wellness
  const exportPreWellnessPDF = async () => {
    if (!preWellnessData || !preWellnessData.history || preWellnessData.history.length === 0) {
      Alert.alert(t('message.error'), t('player.profile.noPreWellnessData'));
      return;
    }
    
    try {
      const html = generatePreWellnessPDFHTML(t);
      const playerName = getPlayerFullName(player);
      const filePrefix = i18n.language === 'en' ? 'prewellness' : 'prewellness';
      const fileName = `${filePrefix}_${playerName.replace(/\s+/g, '_')}.pdf`;
      
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false
      });
      
      await savePdfToDownloads(uri, fileName);
    } catch (error) {
      console.error('Error exporting pre-wellness PDF:', error);
      Alert.alert(t('message.error'), t('player.profile.exportError'));
    }
  };

  // Generar HTML para PDF de asistencia
  const generateAttendancePDFHTML = (t) => {
    const playerName = getPlayerFullName(player);
    const teamName = team?.nombre || '';
    const missedSessions = stats?.trainings?.missedSessions || [];
    const locale = getLocale();
    
    // Agrupar faltas por mes
    const missedByMonth = {};
    missedSessions.forEach(session => {
      const date = new Date(session.fecha);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      if (!missedByMonth[monthKey]) {
        missedByMonth[monthKey] = { name: monthName, sessions: [] };
      }
      missedByMonth[monthKey].sessions.push(session);
    });
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${t('player.profile.attendanceReport')} - ${playerName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
            font-size: 10px;
            line-height: 1.4;
            color: #1e293b;
            padding: 20px;
          }
          
          .header {
            border-bottom: 2px solid #f59e0b;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          
          .header-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 4px;
          }
          
          .header-subtitle {
            font-size: 11px;
            color: #64748b;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          
          .summary-card {
            background: #f8fafc;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }
          
          .summary-value {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          
          .summary-value.green { color: #00521493; }
          .summary-value.red { color: #ef4444; }
          .summary-value.blue { color: #3b82f6; }
          .summary-value.orange { color: #f59e0b; }
          
          .summary-label {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
          }
          
          .section {
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 12px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .month-section {
            margin-bottom: 12px;
          }
          
          .month-title {
            font-size: 11px;
            font-weight: 600;
            color: #f59e0b;
            margin-bottom: 6px;
            text-transform: capitalize;
          }
          
          .missed-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          
          .missed-item {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 9px;
            color: #ef4444;
          }
          
          .no-data {
            color: #64748b;
            font-style: italic;
            padding: 12px;
            text-align: center;
            background: #f8fafc;
            border-radius: 8px;
          }
          
          .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            font-size: 8px;
            color: #94a3b8;
            text-align: center;
          }
          
          .streak-info {
            display: flex;
            gap: 20px;
            margin-top: 12px;
            padding: 12px;
            background: #f0fdf4;
            border-radius: 8px;
          }
          
          .streak-item {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .streak-label {
            font-size: 9px;
            color: #64748b;
          }
          
          .streak-value {
            font-weight: 600;
            color: #00521493;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-title">${t('player.profile.attendanceReport')}</div>
          <div class="header-subtitle">${playerName}${teamName ? ` • ${teamName}` : ''}</div>
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-value">${stats?.trainings?.total || 0}</div>
            <div class="summary-label">${t('player.profile.totalTrainings')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-value green">${stats?.trainings?.attended || 0}</div>
            <div class="summary-label">${t('player.profile.attended')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-value red">${stats?.trainings?.missed || 0}</div>
            <div class="summary-label">${t('player.profile.missed')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-value orange">${stats?.trainings?.percentage || 0}%</div>
            <div class="summary-label">${t('player.profile.attendancePercentage')}</div>
          </div>
        </div>
        
        <div class="streak-info">
          <div class="streak-item">
            <span class="streak-label">${t('player.profile.weeklyAverageAbsences')}:</span>
            <span class="streak-value">${stats?.trainings?.weeklyAverageAbsences || 0}</span>
          </div>
          <div class="streak-item">
            <span class="streak-label">${t('player.profile.currentStreak')}:</span>
            <span class="streak-value">${stats?.trainings?.currentStreak || 0} ${t('player.profile.consecutiveTrainings')}</span>
          </div>
          <div class="streak-item">
            <span class="streak-label">${t('player.profile.bestStreak')}:</span>
            <span class="streak-value">${stats?.trainings?.bestStreak || 0} ${t('player.profile.consecutiveTrainings')}</span>
          </div>
        </div>
        
        <div class="section" style="margin-top: 20px;">
          <div class="section-title">${t('player.profile.missedTrainingsList')}</div>
          ${missedSessions.length > 0 ? 
            Object.keys(missedByMonth).sort().reverse().map(monthKey => `
              <div class="month-section">
                <div class="month-title">${missedByMonth[monthKey].name} (${missedByMonth[monthKey].sessions.length})</div>
                <div class="missed-list">
                  ${missedByMonth[monthKey].sessions.map(session => `
                    <div class="missed-item">
                      ${new Date(session.fecha).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' })}${session.horaInicio ? ` ${session.horaInicio}` : ''}${session.nombre ? ` - ${session.nombre}` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('') 
            : `<div class="no-data">${t('player.profile.noMissedTrainings')}</div>`
          }
        </div>
        
        <div class="footer">
          ${t('player.profile.generatedAt')}: ${new Date().toLocaleDateString(locale)} ${new Date().toLocaleTimeString(locale)}
        </div>
      </body>
      </html>
    `;
  };

  // Generar HTML para PDF de lesiones
  const generateInjuryPDFHTML = (t) => {
    const playerName = getPlayerFullName(player);
    const teamName = team?.nombre || '';
    const locale = getLocale();
    const playerInjuries = injuries
      .filter(injury => (typeof injury.jugador === 'object' ? injury.jugador._id : injury.jugador) === player._id)
      .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${t('player.profile.injuryHistory')} - ${playerName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 10px; line-height: 1.4; color: #1e293b; padding: 20px; }
          .header { border-bottom: 2px solid #ef4444; padding-bottom: 12px; margin-bottom: 16px; }
          .header-title { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
          .header-subtitle { font-size: 11px; color: #64748b; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 13px; font-weight: 700; color: #1e293b; padding: 6px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
          .summary-item { background: #fef2f2; padding: 8px; border-radius: 6px; text-align: center; }
          .summary-value { font-size: 18px; font-weight: 700; color: #ef4444; }
          .summary-label { font-size: 8px; color: #64748b; text-transform: uppercase; }
          .injury-card { background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #ef4444; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
          .injury-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
          .injury-tipo { font-size: 12px; font-weight: 600; color: #1e293b; }
          .injury-status { font-size: 9px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
          .status-active { background: #fef2f2; color: #ef4444; }
          .status-recovered { background: #f0fdf4; color: #22c55e; }
          .injury-detail { font-size: 9px; color: #64748b; margin-bottom: 4px; }
          .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-title">${t('player.profile.injuryHistory')}</div>
          <div class="header-subtitle">${playerName} • ${teamName}</div>
        </div>

        <div class="section">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${stats?.injuries?.total || 0}</div>
              <div class="summary-label">${t('player.profile.totalInjuries')}</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${stats?.injuries?.active || 0}</div>
              <div class="summary-label">${t('player.profile.activeInjuries')}</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${stats?.injuries?.recovered || 0}</div>
              <div class="summary-label">${t('player.profile.recoveredInjuries')}</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${stats?.injuries?.daysMissed || 0}</div>
              <div class="summary-label">${t('player.profile.totalDaysInjured')}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${t('player.profile.injuryDetails')}</div>
          ${playerInjuries.map(injury => {
            const startDate = injury.fechaInicio ? new Date(injury.fechaInicio).toLocaleDateString(locale) : t('player.profile.unknown');
            const endDate = injury.fechaFin ? new Date(injury.fechaFin).toLocaleDateString(locale) : null;
            const estimatedEndDate = injury.fechaFinPrevista ? new Date(injury.fechaFinPrevista).toLocaleDateString(locale) : null;
            const isActive = injury.estado === 'activa' || !injury.fechaFin;
            
            return `
              <div class="injury-card">
                <div class="injury-header">
                  <span class="injury-tipo">${injury.tipo || t('player.profile.unknown')}</span>
                  <span class="injury-status ${isActive ? 'status-active' : 'status-recovered'}">
                    ${isActive ? t('player.profile.activeInjury') : t('player.profile.recovered')}
                  </span>
                </div>
                <div class="injury-detail"><strong>${t('player.profile.startDate')}:</strong> ${startDate}</div>
                ${endDate ? `<div class="injury-detail"><strong>${t('player.profile.endDate')}:</strong> ${endDate}</div>` : ''}
                ${estimatedEndDate && !endDate ? `<div class="injury-detail"><strong>${t('player.profile.estimatedEndDate')}:</strong> ${estimatedEndDate}</div>` : ''}
                ${injury.zona ? `<div class="injury-detail"><strong>${t('player.profile.injuryLocation')}:</strong> ${injury.zona}${injury.lado ? ` (${injury.lado})` : ''}</div>` : ''}
                ${injury.lesionEspecifica ? `<div class="injury-detail"><strong>${t('player.profile.specificInjury')}:</strong> ${injury.lesionEspecifica}</div>` : ''}
                ${injury.descripcion ? `<div class="injury-detail"><strong>${t('player.profile.description')}:</strong> ${injury.descripcion}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <div class="footer">
          ${t('player.profile.generatedAt')}: ${new Date().toLocaleDateString(locale)} ${new Date().toLocaleTimeString(locale)}
        </div>
      </body>
      </html>
    `;
  };

  // Generar HTML para PDF de Wellness
  const generateWellnessPDFHTML = (t) => {
    const playerName = getPlayerFullName(player);
    const teamName = team?.nombre || '';
    const locale = getLocale();
    const history = wellnessData?.history || [];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${t('player.profile.wellnessHistory')} - ${playerName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 10px; line-height: 1.4; color: #1e293b; padding: 20px; }
          .header { border-bottom: 2px solid #8b5cf6; padding-bottom: 12px; margin-bottom: 16px; }
          .header-title { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
          .header-subtitle { font-size: 11px; color: #64748b; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 13px; font-weight: 700; color: #1e293b; padding: 6px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; }
          .summary-item { background: #f5f3ff; padding: 8px; border-radius: 6px; text-align: center; }
          .summary-value { font-size: 18px; font-weight: 700; color: #8b5cf6; }
          .summary-label { font-size: 8px; color: #64748b; text-transform: uppercase; }
          .wellness-card { background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #8b5cf6; border-radius: 6px; padding: 10px; margin-bottom: 8px; }
          .wellness-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
          .wellness-date { font-size: 10px; color: #64748b; }
          .wellness-score { font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 10px; color: white; }
          .score-high { background: #00521493; }
          .score-medium { background: #f59e0b; }
          .score-low { background: #ef4444; }
          .wellness-comment { font-size: 9px; color: #475569; margin-top: 4px; padding: 6px; background: #f8fafc; border-radius: 4px; }
          .question-response { font-size: 9px; color: #475569; padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
          .question-response:last-child { border-bottom: none; }
          .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-title">${t('player.profile.wellnessHistory')}</div>
          <div class="header-subtitle">${playerName} • ${teamName}</div>
        </div>

        <div class="section">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${wellnessData?.totalResponses || 0}</div>
              <div class="summary-label">${t('player.profile.totalReports')}</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${wellnessData?.averageWellness ? wellnessData.averageWellness.toFixed(1) : '-'}</div>
              <div class="summary-label">${t('player.profile.averageScore')}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${t('player.profile.completeHistory')}</div>
          ${history.map(item => {
            const scoreClass = item.wellness >= 8 ? 'score-high' : item.wellness >= 6 ? 'score-medium' : 'score-low';
            const dateStr = (item.sessionDate || item.session?.fecha) 
              ? new Date(item.sessionDate || item.session?.fecha).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
              : t('player.profile.unknownDate');
            const timeStr = item.sessionTime || item.session?.horaInicio || '';
            
            return `
              <div class="wellness-card">
                <div class="wellness-header">
                  <span class="wellness-date">${dateStr}${timeStr ? ` - ${timeStr}` : ''}</span>
                  <span class="wellness-score ${scoreClass}">${item.wellness}/10</span>
                </div>
                ${item.teamName || item.session?.equipo?.nombre ? `<div style="font-size: 9px; color: #64748b;">${item.teamName || item.session?.equipo?.nombre}</div>` : ''}
                ${item.questionResponses && item.questionResponses.length > 0 ? `
                  <div style="margin-top: 6px;">
                    ${item.questionResponses.map(qr => `
                      <div class="question-response">
                        <strong>${qr.question}:</strong> ${qr.answer || qr.response || ''}
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
                ${item.comment ? `<div class="wellness-comment">${item.comment}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <div class="footer">
          ${t('player.profile.generatedAt')}: ${new Date().toLocaleDateString(locale)} ${new Date().toLocaleTimeString(locale)}
        </div>
      </body>
      </html>
    `;
  };

  // Generar HTML para PDF de Pre-Wellness
  const generatePreWellnessPDFHTML = (t) => {
    const playerName = getPlayerFullName(player);
    const teamName = team?.nombre || '';
    const locale = getLocale();
    const history = preWellnessData?.history || [];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${t('player.profile.preWellnessHistory')} - ${playerName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 10px; line-height: 1.4; color: #1e293b; padding: 20px; }
          .header { border-bottom: 2px solid #f59e0b; padding-bottom: 12px; margin-bottom: 16px; }
          .header-title { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
          .header-subtitle { font-size: 11px; color: #64748b; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 13px; font-weight: 700; color: #1e293b; padding: 6px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 8px; }
          .summary-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 16px; }
          .summary-item { background: #fffbeb; padding: 8px; border-radius: 6px; text-align: center; }
          .summary-value { font-size: 18px; font-weight: 700; color: #f59e0b; }
          .summary-label { font-size: 8px; color: #64748b; text-transform: uppercase; }
          .prewellness-card { background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 10px; margin-bottom: 8px; }
          .prewellness-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
          .prewellness-date { font-size: 10px; color: #64748b; }
          .prewellness-score { font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 10px; color: white; }
          .score-high { background: #00521493; }
          .score-medium { background: #f59e0b; }
          .score-low { background: #ef4444; }
          .question-response { font-size: 9px; color: #475569; padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
          .question-response:last-child { border-bottom: none; }
          .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-title">${t('player.profile.preWellnessHistory')}</div>
          <div class="header-subtitle">${playerName} • ${teamName}</div>
        </div>

        <div class="section">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${preWellnessData?.totalResponses || 0}</div>
              <div class="summary-label">${t('player.profile.totalReports')}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${t('player.profile.completeHistory')}</div>
          ${history.map(item => {
            const dateStr = (item.sessionDate || item.session?.fecha) 
              ? new Date(item.sessionDate || item.session?.fecha).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
              : t('player.profile.unknownDate');
            const timeStr = item.sessionTime || item.session?.horaInicio || '';
            
            return `
              <div class="prewellness-card">
                <div class="prewellness-header">
                  <span class="prewellness-date">${dateStr}${timeStr ? ` - ${timeStr}` : ''}</span>
                </div>
                ${item.teamName || item.session?.equipo?.nombre ? `<div style="font-size: 9px; color: #64748b; margin-bottom: 4px;">${item.teamName || item.session?.equipo?.nombre}</div>` : ''}
                ${item.questionResponses && item.questionResponses.length > 0 ? `
                  <div style="margin-top: 6px;">
                    ${item.questionResponses.map(qr => `
                      <div class="question-response">
                        <strong>${qr.question}:</strong> ${qr.answer || qr.response || ''}
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <div class="footer">
          ${t('player.profile.generatedAt')}: ${new Date().toLocaleDateString(locale)} ${new Date().toLocaleTimeString(locale)}
        </div>
      </body>
      </html>
    `;
  };

const generatePDFHTML = (t) => {
    const playerName = getPlayerFullName(player);
    const teamName = team?.nombre || '';
    const locale = getLocale();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${t('player.profile.title')} - ${playerName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
            font-size: 10px;
            line-height: 1.4;
            color: #1e293b;
            padding: 20px;
          }
          
          .header {
            border-bottom: 2px solid #1e293b;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          
          .header-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 4px;
          }
          
          .header-subtitle {
            font-size: 11px;
            color: #64748b;
          }
          
          .section {
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          
          .section-header {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            padding: 6px 0;
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 8px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }
          
          .info-item {
            padding: 6px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
          }
          
          .info-label {
            font-size: 8px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 2px;
          }
          
          .info-value {
            font-size: 12px;
            color: #1e293b;
            font-weight: 600;
          }
          
          .stats-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          
          .stats-label {
            font-size: 9px;
            color: #475569;
          }
          
          .stats-value {
            font-size: 9px;
            color: #1e293b;
            font-weight: 600;
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          
          .table th {
            background: #f1f5f9;
            padding: 4px 6px;
            text-align: left;
            font-size: 8px;
            font-weight: 600;
            color: #475569;
            border: 1px solid #e2e8f0;
          }
          
          .table td {
            padding: 4px 6px;
            font-size: 8px;
            color: #1e293b;
            border: 1px solid #e2e8f0;
          }
          
          .footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 8px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${player.foto ? `<img src="${player.foto}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;" />` : ''}
            <div>
              <div class="header-title">${t('player.profile.title')} - ${playerName}</div>
              <div class="header-subtitle">${teamName} • ${t('player.profile.dorsal')} #${player.dorsal || '-'} • ${player.posicion || '-'}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">${t('player.profile.personalInfo')}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${t('player.profile.name')}</div>
              <div class="info-value">${playerName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('player.profile.age')}</div>
              <div class="info-value">${player.edad || '-'} ${t('player.yearsOld')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('player.profile.position')}</div>
              <div class="info-value">${player.posicion || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('player.profile.dorsal')}</div>
              <div class="info-value">#${player.dorsal || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('player.profile.type')}</div>
              <div class="info-value">${player.esExtra ? t('player.profile.extraPlayer') : t('player.profile.rosterPlayer')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('player.profile.team')}</div>
              <div class="info-value">${teamName}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">${t('player.profile.matchStats')}</div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.matchesPlayed')}</span>
            <span class="stats-value">${stats?.matches?.total || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.asStarter')}</span>
            <span class="stats-value">${stats?.matches?.starter || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.asSubstitute')}</span>
            <span class="stats-value">${stats?.matches?.substitute || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.notCalled')}</span>
            <span class="stats-value">${stats?.matches?.notCalled || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.minutesPlayed')}</span>
            <span class="stats-value">${stats?.matches?.minutesPlayed || 0}'</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.goals')}</span>
            <span class="stats-value">${stats?.goals?.total || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.assists')}</span>
            <span class="stats-value">${stats?.goals?.assists || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.yellowCards')}</span>
            <span class="stats-value">${stats?.cards?.yellow || 0}</span>
          </div>
          ${(stats?.cards?.doubleYellow || 0) > 0 ? `
          <div class="stats-row" style="padding-left: 12px;">
            <span class="stats-label" style="font-size: 11px; color: #92400e;">↳ ${t('player.profile.simpleYellowCards')}</span>
            <span class="stats-value" style="font-size: 12px;">${(stats?.cards?.yellow || 0) - (stats?.cards?.doubleYellow || 0)}</span>
          </div>
          <div class="stats-row" style="padding-left: 12px;">
            <span class="stats-label" style="font-size: 11px; color: #92400e;">↳ ${t('player.profile.doubleYellowCards')}</span>
            <span class="stats-value" style="font-size: 12px;">${stats?.cards?.doubleYellow || 0}</span>
          </div>
          ` : ''}
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.redCards')}</span>
            <span class="stats-value">${stats?.cards?.red || 0}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">${t('player.profile.trainingStats')}</div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.trainingsAttended')}</span>
            <span class="stats-value">${stats?.trainings?.attended || 0} / ${stats?.trainings?.total || 0} (${stats?.trainings?.percentage || 0}%)</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.missed')}</span>
            <span class="stats-value">${stats?.trainings?.missed || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.weeklyAverageAbsences')}</span>
            <span class="stats-value">${stats?.trainings?.weeklyAverageAbsences || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.currentStreak')}</span>
            <span class="stats-value">${stats?.trainings?.currentStreak || 0} ${t('player.profile.consecutiveTrainings')}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.bestStreak')}</span>
            <span class="stats-value">${stats?.trainings?.bestStreak || 0} ${t('player.profile.consecutiveTrainings')}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.averageWellness')}</span>
            <span class="stats-value">${wellnessData?.averageWellness ? wellnessData.averageWellness.toFixed(1) : '-'}/10</span>
          </div>
        </div>

        ${anthropometryData && anthropometryData.length > 0 ? `
        <div class="section">
          <div class="section-header">${t('anthropometry.title')}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${t('anthropometry.weight')}</div>
              <div class="info-value">${anthropometryData[0].peso || '-'} kg</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('anthropometry.height')}</div>
              <div class="info-value">${player.altura || '-'} cm</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('anthropometry.fatPercentage')}</div>
              <div class="info-value">${anthropometryData[0].porcentajeGrasa ? anthropometryData[0].porcentajeGrasa.toFixed(1) : '-'}%</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('anthropometry.fatMass')}</div>
              <div class="info-value">${anthropometryData[0].masa_grasa ? anthropometryData[0].masa_grasa.toFixed(1) : '-'} kg</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('anthropometry.leanMass')}</div>
              <div class="info-value">${anthropometryData[0].masa_magra ? anthropometryData[0].masa_magra.toFixed(1) : '-'} kg</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('anthropometry.sumOfFolds')}</div>
              <div class="info-value">${anthropometryData[0].sumaPliegues ? anthropometryData[0].sumaPliegues.toFixed(1) : '-'} mm</div>
            </div>
          </div>
          <div style="margin-top: 8px;">
            <div style="font-size: 10px; font-weight: 600; margin-bottom: 4px;">${t('anthropometry.folds')} (${t('anthropometry.sixFoldsSystem')})</div>
            <div class="stats-row">
              <span class="stats-label">${t('anthropometry.folds.tricipital')}</span>
              <span class="stats-value">${anthropometryData[0].pliegues?.tricipital || '-'} mm</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">${t('anthropometry.folds.subescapular')}</span>
              <span class="stats-value">${anthropometryData[0].pliegues?.subescapular || '-'} mm</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">${t('anthropometry.folds.suprailiaco')}</span>
              <span class="stats-value">${anthropometryData[0].pliegues?.suprailiaco || '-'} mm</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">${t('anthropometry.folds.abdominal')}</span>
              <span class="stats-value">${anthropometryData[0].pliegues?.abdominal || '-'} mm</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">${t('anthropometry.folds.muslo_frontal')}</span>
              <span class="stats-value">${anthropometryData[0].pliegues?.muslo_frontal || '-'} mm</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">${t('anthropometry.folds.pierna_medial')}</span>
              <span class="stats-value">${anthropometryData[0].pliegues?.pierna_medial || '-'} mm</span>
            </div>
          </div>
          <div style="font-size: 8px; color: #64748b; margin-top: 6px;">
            ${t('anthropometry.latestMeasurementDate')}: ${anthropometryData[0].fecha ? new Date(anthropometryData[0].fecha).toLocaleDateString(locale) : '-'}
          </div>
        </div>
        ` : ''}
        
        <div class="section">
          <div class="section-header">${t('player.profile.injuryHistory')}</div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.totalInjuries')}</span>
            <span class="stats-value">${stats?.injuries?.total || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.activeInjuries')}</span>
            <span class="stats-value">${stats?.injuries?.active || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.recoveredInjuries')}</span>
            <span class="stats-value">${stats?.injuries?.recovered || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">${t('player.profile.totalDaysInjured')}</span>
            <span class="stats-value">${stats?.injuries?.daysMissed || 0}</span>
          </div>
        </div>
        
        ${stats?.injuries?.total > 0 ? `
        <div class="section">
          <div class="section-header">${t('player.profile.injuryDetails')}</div>
          ${injuries
            .filter(injury => (typeof injury.jugador === 'object' ? injury.jugador._id : injury.jugador) === player._id)
            .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio))
            .map((injury, index) => {
              const startDate = injury.fechaInicio ? new Date(injury.fechaInicio).toLocaleDateString(locale) : t('player.profile.unknown');
              const endDate = injury.fechaFin ? new Date(injury.fechaFin).toLocaleDateString(locale) : null;
              const estimatedEndDate = injury.fechaFinPrevista ? new Date(injury.fechaFinPrevista).toLocaleDateString(locale) : null;
              
              // Calcular duración
              let durationText = '';
              if (injury.fechaInicio) {
                const startDateObj = new Date(injury.fechaInicio);
                const currentDate = new Date();
                
                if (injury.fechaFin) {
                  // Lesión terminada
                  const endDateObj = new Date(injury.fechaFin);
                  const diffTime = Math.abs(endDateObj - startDateObj);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  durationText = `${diffDays} ${t('player.profile.days')}`;
                } else {
                  // Lesión activa
                  const diffTime = Math.abs(currentDate - startDateObj);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (injury.fechaFinPrevista) {
                    const estimatedEndDateObj = new Date(injury.fechaFinPrevista);
                    const estimatedDiffTime = Math.abs(estimatedEndDateObj - startDateObj);
                    const estimatedDiffDays = Math.ceil(estimatedDiffTime / (1000 * 60 * 60 * 24));
                    durationText = `${diffDays} ${t('player.profile.days')} ${t('player.profile.current')} / ${estimatedDiffDays} ${t('player.profile.days')} ${t('player.profile.estimated')}`;
                  } else {
                    durationText = `${diffDays} ${t('player.profile.days')} ${t('player.profile.current')}`;
                  }
                }
              }
              
              // Determinar estado
              let statusText = '';
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              if (injury.fechaFin) {
                const endDateObj = new Date(injury.fechaFin);
                statusText = endDateObj < today ? t('player.profile.recovered') : t('player.profile.active');
              } else if (injury.fechaFinPrevista) {
                const estimatedEndDateObj = new Date(injury.fechaFinPrevista);
                statusText = estimatedEndDateObj >= today ? t('player.profile.active') : t('player.profile.active');
              } else {
                statusText = t('player.profile.active');
              }
              
              return `
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin-bottom: 8px; page-break-inside: avoid;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="font-size: 11px; font-weight: 600; color: #1e293b;">
                      ${injury.tipo?.value ? t('injury.types.' + injury.tipo.value, injury.tipo.label || injury.tipo.name || injury.tipo.es || injury.tipo) : (injury.tipo?.label || injury.tipo?.name || injury.tipo?.es || injury.tipo || t('player.profile.unknownInjury'))}
                      ${injury.recaida ? ` (${t('player.profile.relapse')})` : ''}
                    </div>
                    <div style="font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 10px; background-color: ${statusText === t('player.profile.active') ? '#fef2f2' : '#f0fdf4'}; color: ${statusText === t('player.profile.active') ? '#dc2626' : '#166534'};">
                      ${statusText}
                    </div>
                  </div>
                  
                  ${injury.zona ? `<div style="font-size: 9px; color: #64748b; margin-bottom: 2px;"><strong>${t('player.profile.injuryLocation')}:</strong> ${injury.zona?.value ? t('injury.zones.' + injury.zona.value, injury.zona.label || injury.zona.name || injury.zona.es || injury.zona) : (injury.zona?.label || injury.zona?.name || injury.zona?.es || injury.zona || t('player.profile.unknownLocation'))}</div>` : ''}
                  
                  ${injury.lesionEspecifica ? `<div style="font-size: 9px; color: #64748b; margin-bottom: 4px;"><strong>${t('player.profile.specificInjury')}:</strong> ${injury.lesionEspecifica}</div>` : ''}
                  
                  <div style="display: flex; justify-content: space-between; font-size: 8px; color: #475569;">
                    <div><strong>${t('player.profile.startDate')}:</strong> ${startDate}</div>
                    ${endDate ? `<div><strong>${t('player.profile.endDate')}:</strong> ${endDate}</div>` : ''}
                    ${estimatedEndDate ? `<div><strong>${t('player.profile.estimatedEndDate')}:</strong> ${estimatedEndDate}</div>` : ''}
                  </div>
                  
                  ${durationText ? `<div style="font-size: 8px; color: #64748b; margin-top: 2px;"><strong>${t('player.profile.duration')}:</strong> ${durationText}</div>` : ''}
                </div>
              `;
            }).join('')}
        </div>
        ` : ''}
        
        <div class="footer">
          ${t('player.profile.generatedWith')} Xtramys • ${new Date().toLocaleDateString(locale)}
        </div>
      </body>
      </html>
    `;
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
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
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
                <Text style={[styles.statValue, { color: (stats?.trainings?.missed || 0) > 0 ? '#ef4444' : '#00521493' }]}>
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
                <Text style={[styles.statValue, { color: '#00521493' }]}>
                  {stats?.trainings?.currentStreak || 0} {t('player.profile.consecutiveTrainings')}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('player.profile.bestStreak')}</Text>
                <Text style={[styles.statValue, { color: '#3b82f6' }]}>
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
                <View style={[styles.preWellnessBadge, { backgroundColor: '#00521493' }]}>
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
                    <Text style={[styles.statValue, { color: getWellnessColor(wellnessData.averageWellness) }]}>
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
                      <Text style={[styles.statValue, { color: '#22c55e' }]}>
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
                  <Ionicons name="arrow-back" size={24} color="#1e293b" />
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
                    <Text style={[styles.wellnessSummaryValue, { color: getWellnessColor(wellnessData?.averageWellness) }]}>
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
                        <View style={[styles.wellnessDetailBadge, { backgroundColor: getWellnessColor(item.wellness) }]}>
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
                  <Ionicons name="arrow-back" size={24} color="#1e293b" />
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
                  <Ionicons name="arrow-back" size={24} color="#1e293b" />
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
                    <Text style={[styles.wellnessSummaryValue, { color: '#00521493' }]}>
                      {stats?.trainings?.attended || 0}
                    </Text>
                    <Text style={styles.wellnessSummaryLabel}>{t('player.profile.attended')}</Text>
                  </View>
                  <View style={styles.wellnessSummaryCard}>
                    <Text style={[styles.wellnessSummaryValue, { color: '#ef4444' }]}>
                      {stats?.trainings?.missed || 0}
                    </Text>
                    <Text style={styles.wellnessSummaryLabel}>{t('player.profile.missed')}</Text>
                  </View>
                  <View style={styles.wellnessSummaryCard}>
                    <Text style={[styles.wellnessSummaryValue, { color: '#f59e0b' }]}>
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
                    <Text style={[styles.statValue, { color: '#00521493' }]}>
                      {stats?.trainings?.currentStreak || 0} {t('player.profile.consecutiveTrainings')}
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>{t('player.profile.bestStreak')}</Text>
                    <Text style={[styles.statValue, { color: '#3b82f6' }]}>
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
                  <Ionicons name="arrow-back" size={24} color="#1e293b" />
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
                    <View style={[styles.anthropometryCompositionCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                      <Text style={[styles.anthropometryCompositionValue, { color: '#166534' }]}>
                        {anthropometryData[0].peso || '-'}
                      </Text>
                      <Text style={styles.anthropometryCompositionUnit}>kg</Text>
                      <Text style={styles.anthropometryCompositionLabel}>{t('anthropometry.weight')}</Text>
                    </View>
                    <View style={[styles.anthropometryCompositionCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                      <Text style={[styles.anthropometryCompositionValue, { color: '#1e40af' }]}>
                        {anthropometryData[0].porcentajeGrasa ? anthropometryData[0].porcentajeGrasa.toFixed(1) : '-'}
                      </Text>
                      <Text style={styles.anthropometryCompositionUnit}>%</Text>
                      <Text style={styles.anthropometryCompositionLabel}>{t('anthropometry.fatPercentage')}</Text>
                    </View>
                    <View style={[styles.anthropometryCompositionCard, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                      <Text style={[styles.anthropometryCompositionValue, { color: '#92400e' }]}>
                        {anthropometryData[0].masa_grasa ? anthropometryData[0].masa_grasa.toFixed(1) : '-'}
                      </Text>
                      <Text style={styles.anthropometryCompositionUnit}>kg</Text>
                      <Text style={styles.anthropometryCompositionLabel}>{t('anthropometry.fatMass')}</Text>
                    </View>
                    <View style={[styles.anthropometryCompositionCard, { backgroundColor: '#f3e8ff', borderColor: '#d8b4fe' }]}>
                      <Text style={[styles.anthropometryCompositionValue, { color: '#7c3aed' }]}>
                        {anthropometryData[0].masa_magra ? anthropometryData[0].masa_magra.toFixed(1) : '-'}
                      </Text>
                      <Text style={styles.anthropometryCompositionUnit}>kg</Text>
                      <Text style={styles.anthropometryCompositionLabel}>{t('anthropometry.leanMass')}</Text>
                    </View>
                  </View>
                  
                  {/* Pliegues */}
                  <View style={styles.anthropometryFoldsContainer}>
                    <Text style={styles.anthropometryFoldsTitle}>{t('anthropometry.folds')} ({t('anthropometry.sixFoldsSystem')})</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: isMobileDevice() ? 14 : 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: THEME.surface,
    padding: isMobileDevice() ? 12 : 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
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
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: isMobileDevice() ? 12 : 14,
    color: '#64748b',
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
    backgroundColor: THEME.surface,
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
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  sectionTitle: {
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '700',
    color: '#1e293b',
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
    backgroundColor: THEME.backgroundAlt,
    padding: isMobileDevice() ? 10 : 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#1e293b',
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
    borderBottomColor: '#f1f5f9',
  },
  statLabel: {
    fontSize: 14,
    color: '#475569',
  },
  statValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
  },
  wellnessHistoryContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  wellnessHistoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10,
  },
  wellnessHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  wellnessHistoryDate: {
    flexDirection: 'column',
  },
  wellnessDateText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  wellnessTimeText: {
    fontSize: 11,
    color: '#94a3b8',
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
    backgroundColor: THEME.backgroundAlt,
    padding: isMobileDevice() ? 12 : 16,
    borderRadius: isMobileDevice() ? 8 : 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  wellnessSummaryValue: {
    fontSize: isMobileDevice() ? 24 : 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  wellnessSummaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  wellnessDetailCard: {
    backgroundColor: THEME.surface,
    borderRadius: isMobileDevice() ? 8 : 12,
    padding: isMobileDevice() ? 12 : 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
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
    color: '#1e293b',
    fontWeight: '500',
  },
  wellnessDetailTime: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  wellnessTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  wellnessTeamName: {
    fontSize: 13,
    color: '#64748b',
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
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  wellnessQuestionItem: {
    marginBottom: 10,
  },
  wellnessQuestionText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  wellnessAnswerText: {
    fontSize: 14,
    color: '#1e293b',
  },
  wellnessSubmittedAt: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  injuryCard: {
    backgroundColor: THEME.surface,
    borderRadius: isMobileDevice() ? 8 : 12,
    padding: isMobileDevice() ? 12 : 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#1e293b',
    marginBottom: 4,
  },
  injurySpecificText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 20,
  },
  injuryDatesText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  injuryDurationText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  injuryDetailsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  injuryListContainer: {
    marginTop: 8,
  },
  injuryListTitle: {
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '600',
    color: '#1e293b',
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
    color: '#1e293b',
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
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '500',
  },
  injuryDetailValue: {
    fontSize: 14,
    color: '#1e293b',
    marginLeft: 4,
    flex: 1,
  },
  injuryDatesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  injuryDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  injuryDateLabel: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '500',
  },
  injuryDateValue: {
    fontSize: 13,
    color: '#1e293b',
    marginLeft: 4,
    fontWeight: '600',
  },
  // Estilos de Antropometría
  measurementDateText: {
    fontSize: 14,
    color: '#64748b',
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
    color: '#64748b',
    marginTop: -4,
  },
  anthropometryCompositionLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  anthropometryFoldsContainer: {
    backgroundColor: THEME.backgroundAlt,
    padding: isMobileDevice() ? 12 : 16,
    borderRadius: isMobileDevice() ? 8 : 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  anthropometryFoldsTitle: {
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '600',
    color: '#1e293b',
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
    backgroundColor: THEME.surface,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  anthropometryFoldValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  anthropometryFoldLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  anthropometryHistoryCard: {
    backgroundColor: THEME.surface,
    borderRadius: isMobileDevice() ? 8 : 12,
    padding: isMobileDevice() ? 12 : 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#1e293b',
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
    backgroundColor: THEME.backgroundAlt,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  anthropometryHistoryStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  anthropometryHistoryStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    padding: isMobileDevice() ? 10 : 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  viewDetailsText: {
    flex: 1,
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
    marginLeft: 8,
  },
  exportMiniButton: {
    marginLeft: 'auto',
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fef3c7',
  },
  missedSessionName: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    marginTop: 6,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMobileDevice() ? 20 : 30,
    backgroundColor: '#f0fdf4',
    borderRadius: isMobileDevice() ? 8 : 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#00521493',
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default PlayerProfile;
