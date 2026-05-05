// components/pages/session/SessionPDF.js
// Utilidades compartidas para generar PDFs de sesiones de entrenamiento
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native';
import { savePdfToDownloads } from '@/utils/pdfDownload';
import { Asset } from 'expo-asset';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { getEntityId } from '@/utils/sessionExercises';
import { getSectionForExercise, getStrengthExerciseImage } from '@/data/strengthExercises';

/**
 * Genera el HTML para el PDF de sesión de entrenamiento
 * @param {Object} params - Parámetros de la sesión
 * @param {Object} params.session - Datos de la sesión
 * @param {Array} params.exercises - Ejercicios de la sesión
 * @param {Object} params.team - Equipo
 * @param {Array} params.players - Jugadores disponibles
 * @param {Object} params.i18n - Instancia de i18n para traducciones (opcional)
 */
export const generateSessionPDFHTML = ({
  session,
  exercises,
  strengthExercises = [],
  team,
  players = [],
  i18n = null,
  imageDataUris = {}
}) => {
  const t = (key, fallback, options = {}) => {
    if (i18n) {
      return i18n.t(key, { defaultValue: fallback, ...options });
    }
    if (options.count !== undefined) {
      const count = Number(options.count);
      if (count === 1) return `${count} ${fallback.toString().endsWith('s') ? fallback.slice(0, -1) : fallback}`;
      return `${count} ${fallback}`;
    }
    return fallback;
  };
  const locale = i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US';
  
  const fecha = new Date(session.fecha);
  const fechaFormateada = fecha.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Obtener información de jugadores disponibles
  let jugadoresDisponiblesHTML = '';
  const jugadoresIds = session.jugadores || [];
  if (jugadoresIds.length > 0 && players.length > 0) {
const jugadoresNombres = jugadoresIds.map(jid => {
      const id = typeof jid === 'string' ? jid : jid._id;
      const jugador = players.find(j => j._id === id);
      return jugador ? getPlayerFullName(jugador) : null;
    }).filter(Boolean);
    
    if (jugadoresNombres.length > 0) {
      jugadoresDisponiblesHTML = `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #2c3e50; margin-bottom: 10px; font-size: 16px;">${t('session.availablePlayers', 'Jugadores Disponibles')} (${jugadoresNombres.length})</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
            ${jugadoresNombres.join(', ')}
          </div>
        </div>
      `;
    }
  }

  // Jugadores extras
  let jugadoresExtrasHTML = '';
  const jugadoresExtrasIds = session.jugadoresExtras || [];
  if (jugadoresExtrasIds.length > 0 && players.length > 0) {
const jugadoresExtrasNombres = jugadoresExtrasIds.map(jid => {
      const id = typeof jid === 'string' ? jid : jid._id;
      const jugador = players.find(j => j._id === id);
      return jugador ? getPlayerFullName(jugador) : null;
    }).filter(Boolean);
    
    if (jugadoresExtrasNombres.length > 0) {
      jugadoresExtrasHTML = `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #2c3e50; margin-bottom: 10px; font-size: 16px;">${t('session.extraPlayers', 'Jugadores Extras')} (${jugadoresExtrasNombres.length})</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8;">
            ${jugadoresExtrasNombres.join(', ')}
          </div>
        </div>
      `;
    }
  }

  // Crear mapa de detalles de ejercicios
  const detalleMap = {};
  if (session.ejerciciosDetalle && session.ejerciciosDetalle.length > 0) {
    session.ejerciciosDetalle.forEach(det => {
      const ejercicioId = typeof det.ejercicio === 'string' ? det.ejercicio : (det.ejercicio?._id || det.ejercicio);
      if (ejercicioId) {
        detalleMap[ejercicioId] = { 
          orden: det.orden || 0, 
          tiempoDescanso: det.tiempoDescanso || 0,
          observacion: det.observacion || '',
          teamAssignments: det.teamAssignments || []
        };
      }
    });
  }

  // Helper para colores de equipos
  const getTeamColor = (teamNumber) => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    return colors[(teamNumber - 1) % colors.length];
  };

  // Helper para generar HTML de asignaciones de equipos - versión compacta
  const generateTeamAssignmentsHTML = (teamAssignments, players, jugadoresExtras) => {
    if (!teamAssignments || teamAssignments.length === 0) return '';
    
    const assignmentsWithPlayers = teamAssignments.filter(ta => 
      (ta.players && ta.players.length > 0) || (ta.extraPlayers && ta.extraPlayers.length > 0)
    );
    
    if (assignmentsWithPlayers.length === 0) return '';
    
    const teamsHTML = assignmentsWithPlayers.map(ta => {
      const teamColor = getTeamColor(ta.teamNumber);
      const playerNames = [];
      
// Obtener nombres de jugadores regulares
      if (ta.players && ta.players.length > 0) {
        ta.players.forEach(pid => {
          const id = getEntityId(pid);
          const jugador = players.find(j => getEntityId(j) === id);
          if (jugador) {
            const nombre = getPlayerFullName(jugador);
            playerNames.push(jugador.dorsal ? `<b>${jugador.dorsal}</b> ${nombre}` : nombre);
          } else if (typeof pid === 'object' && pid) {
            const nombre = getPlayerFullName(pid);
            if (nombre) playerNames.push(nombre);
            else if (id) playerNames.push(id);
          }
        });
      }
      
      // Añadir jugadores extras
      if (ta.extraPlayers && ta.extraPlayers.length > 0) {
        ta.extraPlayers.forEach(epId => {
          const id = getEntityId(epId);
          const jugador = players.find(j => getEntityId(j) === id);
          if (jugador) {
            const nombre = getPlayerFullName(jugador);
            playerNames.push(`<span class="extra-player">⭐ ${jugador.dorsal ? `<b>${jugador.dorsal}</b> ` : ''}${nombre}</span>`);
          } else if (typeof epId === 'object' && epId) {
            const nombre = getPlayerFullName(epId);
            if (nombre) playerNames.push(`<span class="extra-player">⭐ ${nombre}</span>`);
            else if (id) playerNames.push(`<span class="extra-player">⭐ ${id}</span>`);
          } else if (id) {
            playerNames.push(`<span class="extra-player">⭐ ${id}</span>`);
          }
        });
      }
      
      return `
        <div class="team-block">
          <div class="team-badge-inline">
            <span class="team-color-badge" style="background-color: ${teamColor};">
              ${t('session.team', 'Equipo')} ${ta.teamNumber}
            </span>
            <span class="team-count">(${playerNames.length})</span>
          </div>
          <div class="team-players" style="border-color: ${teamColor};">
            ${playerNames.join(' • ')}
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="teams-section">
        <div class="section-header">
          👥 ${t('session.teamAssignments', 'Asignación de Equipos')}
        </div>
        ${teamsHTML}
      </div>
    `;
  };

  // Ordenar ejercicios
  const ejerciciosOrdenados = [...exercises].sort((a, b) => {
    const ordenA = detalleMap[a._id]?.orden || 0;
    const ordenB = detalleMap[b._id]?.orden || 0;
    return ordenA - ordenB;
  });

  // Helper para truncar texto largo
  const truncateText = (text, maxLength = 300) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Generar HTML de ejercicios optimizado para una página
  const ejerciciosHTML = ejerciciosOrdenados.map((ejercicio, index) => {
    const detalle = detalleMap[ejercicio._id] || {};
    const ordenNumero = detalle.orden || (index + 1);
    const tiempoDescanso = detalle.tiempoDescanso || 0;
    const observacion = detalle.observacion || '';
    const isLastExercise = index === ejerciciosOrdenados.length - 1;

    // Imagen con tamaño optimizado
    let imagenHTML = '';
    if (ejercicio.imagen) {
      let imagenSrc = ejercicio.imagen;
      if (ejercicio.imagen.startsWith('http')) {
        const timestamp = new Date().getTime();
        imagenSrc = ejercicio.imagen.includes('?')
          ? `${ejercicio.imagen}&t=${timestamp}`
          : `${ejercicio.imagen}?t=${timestamp}`;
      } else {
        imagenSrc = `data:image/png;base64,${ejercicio.imagen}`;
      }
      imagenHTML = `
        <div class="exercise-image-container">
          <img src="${imagenSrc}" class="exercise-img" />
        </div>
      `;
    }

    // Generar HTML de asignaciones de equipos compacto
    const teamAssignmentsHTML = generateTeamAssignmentsHTML(detalle.teamAssignments, players, session.jugadoresExtras);
    const hasTeams = teamAssignmentsHTML !== '';

    // Datos principales del ejercicio en grid compacto
    const mainData = [];
    const numeroJugadoresText = ejercicio.numeroJugadores
      ? t(
          'exercises.numberOfPlayersCount',
          `${ejercicio.numeroJugadores} jugadores`,
          { count: ejercicio.numeroJugadores }
        )
      : '';
    const equiposText = ejercicio.equipos
      ? t(
          'exercises.teamsCount',
          `${ejercicio.equipos} equipos`,
          { count: ejercicio.equipos }
        )
      : '';
    if (ejercicio.numeroJugadores) mainData.push({ icon: '👥', label: t('exercises.numberOfPlayers', 'Nº Jugadores'), value: numeroJugadoresText });
    if (ejercicio.equipos) mainData.push({ icon: '🎯', label: t('exercises.teams', 'Equipos'), value: equiposText });
    if (ejercicio.dimensiones) mainData.push({ icon: '📐', label: t('exercise.fieldDimensions', 'Dimensiones'), value: ejercicio.dimensiones });
    if (ejercicio.tiempo) mainData.push({ icon: '⏱️', label: t('exercise.duration', 'Duración'), value: `${ejercicio.tiempo} ${t('common.minutesShort', 'min')}` });
    if (!isLastExercise && tiempoDescanso > 0) mainData.push({ icon: '☕', label: t('session.restTime', 'Descanso'), value: `${tiempoDescanso} ${t('common.minutesShort', 'min')}` });

    const mainDataHTML = mainData.length > 0 ? `
      <div class="exercise-data-grid">
        ${mainData.map(d => `
          <div class="data-item">
            <span class="data-icon">${d.icon}</span>
            <span class="data-label">${d.label}:</span>
            <span class="data-value">${d.value}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    // Descripción y objetivo
    const descObjetivo = [];
    if (ejercicio.objetivo) descObjetivo.push({ title: t('exercise.objective', 'Objetivo'), text: ejercicio.objetivo });
    if (ejercicio.descripcion) descObjetivo.push({ title: t('exercise.description', 'Descripción'), text: truncateText(ejercicio.descripcion, 400) });
    if (observacion) descObjetivo.push({ title: t('session.observation', 'Observación'), text: observacion });

    const descObjetivoHTML = descObjetivo.length > 0 ? `
      <div class="exercise-details">
        ${descObjetivo.map(d => `
          <div class="detail-block">
            <span class="detail-title">${d.title}:</span>
            <span class="detail-text">${d.text}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    return `
      <div class="exercise-page">
        <div class="exercise-card">
          <div class="exercise-header">
            <span class="exercise-number">${ordenNumero}</span>
            <h3 class="exercise-title">${ejercicio.nombre || t('exercise.unnamed', 'Ejercicio sin nombre')}</h3>
          </div>
          
          <div class="exercise-content ${hasTeams ? 'with-teams' : ''}">
            <div class="exercise-left">
              ${imagenHTML}
              ${mainDataHTML}
            </div>
            
            <div class="exercise-right">
              ${descObjetivoHTML}
              ${teamAssignmentsHTML}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Generar HTML de ejercicios de fuerza en grid compacto (12 por página, 4 columnas x 3 filas)
  const STRENGTH_PER_PAGE = 12;
  let ejerciciosFuerzaHTML = '';
  if (strengthExercises && strengthExercises.length > 0) {
    const pages = [];
    for (let i = 0; i < strengthExercises.length; i += STRENGTH_PER_PAGE) {
      pages.push(strengthExercises.slice(i, i + STRENGTH_PER_PAGE));
    }
    ejerciciosFuerzaHTML = pages.map((pageExercises, pageIdx) => {
      const cardsHTML = pageExercises.map((exercise, idx) => {
        const globalIdx = pageIdx * STRENGTH_PER_PAGE + idx;
        const imagenSrc = imageDataUris[exercise.image] || '';
        const exerciseName = i18n ? i18n.t(exercise.i18nKey) : exercise.id;
        const sectionResult = getSectionForExercise(exercise.id || exercise);
        const sectionColor = sectionResult?.section?.color || '#8b5cf6';
        const sectionName = sectionResult ? (i18n ? i18n.t(sectionResult.section.i18nKey) : sectionResult.section.id) : '';
        return `
          <div class="strength-card">
            <div class="strength-card-img">
              ${imagenSrc ? `<img src="${imagenSrc}" />` : '<div class="strength-card-placeholder">💪</div>'}
            </div>
            <div class="strength-card-info">
              <span class="strength-card-num" style="background: ${sectionColor};">${globalIdx + 1}</span>
              <span class="strength-card-name">${exerciseName}</span>
            </div>
            <div class="strength-card-meta">
              <span class="strength-card-section">${sectionName}</span>
              <span class="strength-card-level">${t('session.level', 'Nv')} ${exercise.level}</span>
            </div>
          </div>
        `;
      }).join('');
      const isLastPage = pageIdx === pages.length - 1;
      return `
        <div class="strength-grid-page" ${!isLastPage ? 'style="page-break-after: always;"' : ''}>
          <div class="strength-grid-header">
            <span>💪 ${t('session.strengthExercise', 'Ejercicios de Fuerza')}</span>
            <span class="strength-grid-page-num">${t('common.page', 'Pág')} ${pageIdx + 1}/${pages.length}</span>
          </div>
          <div class="strength-grid">
            ${cardsHTML}
          </div>
        </div>
      `;
    }).join('');
  }

  // Determinar información de horario
  const horaInicio = session.horaInicio || '--:--';
  const horaFin = session.horaFin || '--:--';
  const lugar = session.lugar || '';
  const duracion = session.duracion || '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${t('session.pdfTitle', 'Sesión de Entrenamiento')} - ${fechaFormateada}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #1e293b;
            background: #fff;
          }
          
          /* Primera página - Información General */
          .cover-page {
            page-break-after: always;
            min-height: 100vh;
            padding: 15px;
          }
          
          .team-header {
            text-align: center;
            margin-bottom: 20px;
          }
          
          .team-badge {
            width: 80px;
            height: 80px;
            border-radius: 10px;
            object-fit: contain;
            background: #f8fafc;
            padding: 5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          
          .team-name {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 10px;
          }
          
          .session-header {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 20px;
          }
          
          .session-header h1 {
            font-size: 22px;
            margin-bottom: 8px;
          }
          
          .session-header .subtitle {
            font-size: 14px;
            opacity: 0.9;
          }
          
          .info-section {
            background: #f8fafc;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
          }
          
          .info-section h2 {
            font-size: 14px;
            color: #3b82f6;
            margin-bottom: 12px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 6px;
          }
          
          .info-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          
          .info-item {
            flex: 1 1 45%;
            background: white;
            padding: 10px;
            border-radius: 8px;
            border-left: 3px solid #3b82f6;
          }
          
          .info-label {
            font-size: 10px;
            color: #64748b;
            margin-bottom: 2px;
          }
          
          .info-value {
            font-size: 13px;
            font-weight: 600;
            color: #1e293b;
          }
          
          .players-section {
            background: #f8fafc;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
          }
          
          .players-section h3 {
            font-size: 13px;
            color: #059669;
            margin-bottom: 8px;
          }
          
          .players-list {
            background: white;
            padding: 10px;
            border-radius: 8px;
            border-left: 3px solid #10b981;
            font-size: 11px;
            line-height: 1.6;
          }
          
          .players-section.extras h3 {
            color: #d97706;
          }
          
          .players-section.extras .players-list {
            border-left-color: #f59e0b;
          }
          
          /* Páginas de Ejercicios */
          .exercise-page {
            page-break-after: always;
            page-break-inside: avoid;
            height: 100vh;
            max-height: 100vh;
            padding: 10px;
            display: flex;
            flex-direction: column;
          }
          
          .exercise-page:last-child {
            page-break-after: auto;
          }
          
          .exercise-card {
            flex: 1;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          
          .exercise-header {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 12px 15px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .exercise-number {
            background: rgba(255,255,255,0.25);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 700;
          }
          
          .exercise-title {
            font-size: 16px;
            font-weight: 600;
            flex: 1;
          }
          
          .exercise-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 12px;
            gap: 10px;
            overflow: hidden;
          }
          
          .exercise-content.with-teams {
            flex-direction: row;
          }
          
          .exercise-left {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          
          .exercise-content.with-teams .exercise-left {
            flex: 0 0 55%;
          }
          
          .exercise-right {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
            overflow: hidden;
          }
          
          .exercise-content.with-teams .exercise-right {
            flex: 0 0 43%;
            border-left: 1px solid #e2e8f0;
            padding-left: 12px;
          }
          
          .exercise-image-container {
            flex: 1;
            min-height: 200px;
            max-height: 450px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            border-radius: 8px;
            overflow: hidden;
            padding: 8px;
          }
          
          .exercise-img {
            width: 100%;
            height: auto;
            max-height: 430px;
            object-fit: contain;
            border-radius: 6px;
          }
          
          .exercise-data-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          
          .data-item {
            background: #f1f5f9;
            padding: 6px 10px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
          }
          
          .data-icon {
            font-size: 11px;
          }
          
          .data-label {
            color: #64748b;
          }
          
          .data-value {
            font-weight: 600;
            color: #1e293b;
          }
          
          .exercise-details {
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow-y: auto;
          }
          
          .detail-block {
            background: #f8fafc;
            padding: 8px 10px;
            border-radius: 6px;
            font-size: 10px;
          }
          
          .detail-title {
            font-weight: 600;
            color: #3b82f6;
            display: block;
            margin-bottom: 3px;
          }
          
          .detail-text {
            color: #475569;
            line-height: 1.5;
          }
          
          /* Grid compacto de ejercicios de fuerza */
          .strength-grid-page {
            padding: 10px;
            min-height: 100vh;
          }
          
          .strength-grid-header {
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            color: white;
            padding: 10px 16px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .strength-grid-page-num {
            font-size: 11px;
            font-weight: 500;
            opacity: 0.85;
          }
          
          .strength-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .strength-card {
            width: calc(25% - 6px);
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            background: white;
            break-inside: avoid;
          }
          
          .strength-card-img {
            width: 100%;
            aspect-ratio: 4 / 3;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          
          .strength-card-img img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .strength-card-placeholder {
            font-size: 28px;
            opacity: 0.3;
          }
          
          .strength-card-info {
            padding: 4px 6px 2px;
            display: flex;
            align-items: flex-start;
            gap: 4px;
          }
          
          .strength-card-num {
            flex-shrink: 0;
            min-width: 18px;
            height: 18px;
            border-radius: 50%;
            color: white;
            font-size: 9px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .strength-card-name {
            font-size: 8px;
            font-weight: 600;
            color: #1e293b;
            line-height: 1.2;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          
          .strength-card-meta {
            padding: 2px 6px 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .strength-card-section {
            font-size: 7px;
            color: #8b5cf6;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 70%;
          }
          
          .strength-card-level {
            font-size: 7px;
            color: #64748b;
            font-weight: 600;
            flex-shrink: 0;
          }

          .teams-section {
            background: #fef3c7;
            border-radius: 8px;
            padding: 10px;
            overflow-y: auto;
            flex: 1;
            min-height: 0;
          }
          
          .teams-section .section-header {
            font-weight: 600;
            color: #92400e;
            font-size: 11px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .team-block {
            margin-bottom: 8px;
          }
          
          .team-badge-inline {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
          }
          
          .team-color-badge {
            padding: 2px 8px;
            border-radius: 10px;
            color: white;
            font-size: 10px;
            font-weight: 600;
          }
          
          .team-count {
            color: #64748b;
            font-size: 9px;
          }
          
          .team-players {
            font-size: 10px;
            color: #475569;
            padding-left: 8px;
            border-left: 2px solid;
            margin-left: 4px;
            line-height: 1.6;
          }
          
          .extra-player {
            color: #d97706;
          }
          
          @media print {
            body { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .exercise-page {
              height: auto;
              min-height: 97vh;
            }
          }
        </style>
      </head>
      <body>
        <!-- Página de portada con información general -->
        <div class="cover-page">
          <div class="team-header">
            ${team?.escudo ? `<img src="${team.escudo}" class="team-badge" />` : ''}
            <div class="team-name">${team?.nombre || t('common.team', 'Equipo')}</div>
          </div>
          
          <div class="session-header">
            <h1>🏆 ${t('session.pdfTitle', 'Sesión de Entrenamiento')}</h1>
            <div class="subtitle">${fechaFormateada}</div>
          </div>

          <div class="info-section">
            <h2>📋 ${t('session.generalInfo', 'Información General')}</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">📅 ${t('session.dateLabel', 'Fecha')}</div>
                <div class="info-value">${fechaFormateada}</div>
              </div>
              <div class="info-item">
                <div class="info-label">⏰ ${t('session.schedule', 'Horario')}</div>
                <div class="info-value">${horaInicio} - ${horaFin}</div>
              </div>
              ${lugar ? `
                <div class="info-item">
                  <div class="info-label">📍 ${t('session.location', 'Lugar')}</div>
                  <div class="info-value">${lugar}</div>
                </div>
              ` : ''}
              <div class="info-item">
                <div class="info-label">⚽ ${t('session.exercises', 'Ejercicios')}</div>
                <div class="info-value">${ejerciciosOrdenados.length}</div>
              </div>
            </div>
          </div>

          ${jugadoresDisponiblesHTML}

          ${jugadoresExtrasHTML}
          
          ${session.observaciones ? `
            <div class="info-section">
              <h2>📝 ${t('session.observations', 'Observaciones')}</h2>
              <p style="font-size: 11px; color: #475569; line-height: 1.6;">${session.observaciones}</p>
            </div>
          ` : ''}
        </div>

        <!-- Páginas de ejercicios -->
        ${ejerciciosHTML}
        
        <!-- Páginas de ejercicios de fuerza -->
        ${ejerciciosFuerzaHTML}
      </body>
    </html>
  `;
};

/**
 * Genera y comparte el PDF de sesión de entrenamiento
 * @param {Object} params - Parámetros de la sesión
 */
export const generateSessionPDF = async ({
  session,
  exercises,
  strengthExercises = [],
  team,
  players = [],
  i18n = null
}) => {
  try {
    const t = (key, fallback) => i18n?.t(key) || fallback;
    const locale = i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US';
    
    // Pre-resolver imágenes de ejercicios de fuerza a base64 para el HTML.
    // En web, `getStrengthExerciseImage` devuelve la URL bundleada por Vite,
    // así que la convertimos directamente a data:URL con fetch + FileReader.
    // (En móvil este flujo usaba expo-asset + FileSystem.readAsStringAsync,
    // que no funciona en navegador.)
    const imageDataUris = {};
    if (strengthExercises && strengthExercises.length > 0) {
      const toDataUrl = async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error('fetch failed: ' + res.status);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      };
      await Promise.all(strengthExercises.map(async (exercise) => {
        try {
          const imageSource = getStrengthExerciseImage(exercise.image);
          if (!imageSource) return;
          // En web `imageSource` es una URL string; en RN era un módulo.
          const url = typeof imageSource === 'string' ? imageSource : imageSource?.uri;
          if (!url) return;
          imageDataUris[exercise.image] = await toDataUrl(url);
        } catch (e) {
          console.warn('Failed to resolve image for PDF:', exercise.id, e);
        }
      }));
    }

    // Generar HTML
    const html = generateSessionPDFHTML({ session, exercises, strengthExercises, team, players, i18n, imageDataUris });

    // Generar PDF
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    // Crear nombre de archivo
    const fecha = new Date(session.fecha);
    const diasKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const diaKey = diasKeys[fecha.getDay()];
    const diaSemana = t(`weekdays.${diaKey}`, diaKey);
    const fechaStr = fecha.toLocaleDateString(locale).replace(/\//g, '-');
    // Usar "Sesion_Entrenamiento" o "Training_Session" según idioma
    const pdfPrefix = t('session.pdfFilePrefix', 'Sesion_Entrenamiento');
    const fileName = `${pdfPrefix}_${diaSemana}_${fechaStr}.pdf`;

    await savePdfToDownloads(uri, fileName);

    return fileName;
  } catch (error) {
    console.error('Error generating session PDF:', error);
    throw error;
  }
};
