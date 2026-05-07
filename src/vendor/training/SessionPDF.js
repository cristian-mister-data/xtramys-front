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

  const jugadoresIds = session.jugadores || [];
  const jugadoresExtrasIds = session.jugadoresExtras || [];

  const resolvePlayerName = (playerLike) => {
    const id = getEntityId(playerLike);
    const playerFromStore = players.find((p) => getEntityId(p) === id);
    if (playerFromStore) return getPlayerFullName(playerFromStore);
    if (playerLike && typeof playerLike === 'object') {
      return getPlayerFullName(playerLike) || playerLike.nombre || playerLike.name || id;
    }
    return id;
  };

  const jugadoresNombres = (jugadoresIds || []).map((jid) => {
    const name = resolvePlayerName(jid);
    return typeof name === 'string' && name.trim() ? name : null;
  }).filter(Boolean);

  const jugadoresExtrasNombres = (jugadoresExtrasIds || []).map((jid) => {
    const name = resolvePlayerName(jid);
    return typeof name === 'string' && name.trim() ? name : null;
  }).filter(Boolean);

  const buildPlayerChips = (names = [], extraClass = '') => names
    .map((name) => `<span class="player-chip ${extraClass}">${name}</span>`)
    .join('');

  const exerciseObservationsMap = {};
  let generalObservationsText = '';

  const addGeneralObservation = (value) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    generalObservationsText = generalObservationsText
      ? `${generalObservationsText}\n${trimmed}`
      : trimmed;
  };

  const setExerciseObservation = (exerciseId, value) => {
    const id = getEntityId(exerciseId);
    if (!id || typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    exerciseObservationsMap[id] = trimmed;
  };

  const ingestObservationItem = (item) => {
    if (!item) return;
    if (typeof item === 'string') {
      addGeneralObservation(item);
      return;
    }
    if (typeof item !== 'object') return;

    const observationValue = item.observacion
      || item.observaciones
      || item.text
      || item.note
      || item.value
      || '';

    const exerciseId = item.ejercicioId || item.ejercicio || item.exerciseId || item.exercise;
    if (exerciseId) {
      setExerciseObservation(exerciseId, observationValue);
      return;
    }

    addGeneralObservation(observationValue);
  };

  addGeneralObservation(session.observacionesGenerales);
  addGeneralObservation(session.notasGenerales);
  addGeneralObservation(session.notas);

  const rawObservations = session.observaciones;
  if (typeof rawObservations === 'string') {
    addGeneralObservation(rawObservations);
  } else if (Array.isArray(rawObservations)) {
    rawObservations.forEach(ingestObservationItem);
  } else if (rawObservations && typeof rawObservations === 'object') {
    addGeneralObservation(
      rawObservations.general
      || rawObservations.generales
      || rawObservations.observacionesGenerales
      || rawObservations.notes
      || rawObservations.notas
      || rawObservations.text
    );

    const grouped = rawObservations.porEjercicio
      || rawObservations.ejercicios
      || rawObservations.byExercise
      || rawObservations.items;

    if (Array.isArray(grouped)) {
      grouped.forEach(ingestObservationItem);
    } else {
      ingestObservationItem(rawObservations);
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
          observacion: det.observacion || exerciseObservationsMap[ejercicioId] || '',
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
          ${t('session.teamAssignments', 'Asignación de Equipos')}
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

  const exerciseObservationItems = ejerciciosOrdenados.map((ejercicio) => {
    const detalle = detalleMap[ejercicio._id] || {};
    const text = typeof detalle.observacion === 'string' ? detalle.observacion.trim() : '';
    if (!text) return null;
    return {
      title: ejercicio?.nombre || t('exercise.unnamed', 'Ejercicio sin nombre'),
      text,
    };
  }).filter(Boolean);

  const hasGeneralObservations = !!generalObservationsText;
  const hasExerciseObservations = exerciseObservationItems.length > 0;

  // Helper para truncar texto largo
  const truncateText = (text, maxLength = 300) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const buildExerciseCardHTML = (ejercicio, index) => {
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
    if (ejercicio.numeroJugadores) mainData.push({ label: t('exercises.numberOfPlayers', 'Nº Jugadores'), value: numeroJugadoresText });
    if (ejercicio.equipos) mainData.push({ label: t('exercises.teams', 'Equipos'), value: equiposText });
    if (ejercicio.dimensiones) mainData.push({ label: t('exercise.fieldDimensions', 'Dimensiones'), value: ejercicio.dimensiones });
    if (ejercicio.tiempo) mainData.push({ label: t('exercise.duration', 'Duración'), value: `${ejercicio.tiempo} ${t('common.minutesShort', 'min')}` });
    if (!isLastExercise && tiempoDescanso > 0) mainData.push({ label: t('session.restTime', 'Descanso'), value: `${tiempoDescanso} ${t('common.minutesShort', 'min')}` });

    const mainDataHTML = mainData.length > 0 ? `
      <div class="exercise-data-grid">
        ${mainData.map(d => `
          <div class="data-item">
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
    `;
  };

  const EXERCISES_PER_SHEET = 2;
  const ejerciciosHTML = ejerciciosOrdenados.reduce((acc, _item, index) => {
    if (index % EXERCISES_PER_SHEET !== 0) return acc;
    const sheetExercises = ejerciciosOrdenados.slice(index, index + EXERCISES_PER_SHEET);
    const fromNumber = index + 1;
    const toNumber = index + sheetExercises.length;
    const cardsHTML = sheetExercises
      .map((ejercicio, localIdx) => buildExerciseCardHTML(ejercicio, index + localIdx))
      .join('');
    acc.push(`
      <section class="exercise-sheet">
        <div class="exercise-sheet-head">
          <span>${t('session.exercises', 'Ejercicios')}</span>
          <span>${fromNumber}-${toNumber} / ${ejerciciosOrdenados.length}</span>
        </div>
        <div class="exercise-grid ${sheetExercises.length === 1 ? 'single' : ''}">
          ${cardsHTML}
        </div>
      </section>
    `);
    return acc;
  }, []).join('');

  // Generar HTML de ejercicios de fuerza en grid compacto (12 por página, 4 columnas x 3 filas)
  const STRENGTH_PER_PAGE = 12;
  let ejerciciosFuerzaHTML = '';
  if (strengthExercises && strengthExercises.length > 0) {
    const pages = [];
    for (let i = 0; i < strengthExercises.length; i += STRENGTH_PER_PAGE) {
      pages.push(strengthExercises.slice(i, i + STRENGTH_PER_PAGE));
    }
    const strengthPagesHTML = pages.map((pageExercises, pageIdx) => {
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
          <div class="strength-grid">
            ${cardsHTML}
          </div>
        </div>
      `;
    }).join('');
    ejerciciosFuerzaHTML = `
      <section class="strength-section">
        <div class="strength-section-header">
          <span>💪 ${t('session.strengthExercise', 'Ejercicios de Fuerza')}</span>
          <span>${t('common.page', 'Pág')}</span>
        </div>
        ${strengthPagesHTML}
      </section>
    `;
  }

  // Determinar información de horario
  const horaInicio = session.horaInicio || '--:--';
  const horaFin = session.horaFin || '--:--';
  const lugar = session.lugar || '';
  const parseClock = (value) => {
    if (!value || typeof value !== 'string') return null;
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return (h * 60) + m;
  };
  const startMinutes = parseClock(session.horaInicio);
  const endMinutes = parseClock(session.horaFin);
  const computedDurationMinutes = (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes)
    ? (endMinutes - startMinutes)
    : null;
  const rawDuration = Number(session.duracion);
  const durationMinutes = Number.isFinite(rawDuration) && rawDuration > 0
    ? rawDuration
    : computedDurationMinutes;
  const duracionLabel = durationMinutes
    ? `${durationMinutes} ${t('common.minutesShort', 'min')}`
    : '—';
  const totalJugadores = jugadoresNombres.length + jugadoresExtrasNombres.length;
  const generalObservationsPreview = hasGeneralObservations
    ? truncateText(generalObservationsText, 520)
    : '';
  const exerciseObservationsPreview = exerciseObservationItems.slice(0, 5).map((item) => ({
    title: item.title,
    text: truncateText(item.text, 140),
  }));
  const remainingExerciseObservations = exerciseObservationItems.length - exerciseObservationsPreview.length;

  const jugadoresDisponiblesPanelHTML = `
    <section class="cover-card player-card">
      <div class="cover-card-head">
        <span class="cover-card-title">${t('session.availablePlayers', 'Jugadores disponibles')}</span>
        <span class="cover-card-count">${jugadoresNombres.length}</span>
      </div>
      ${jugadoresNombres.length > 0 ? `
        <div class="player-chip-list">
          ${buildPlayerChips(jugadoresNombres)}
        </div>
      ` : `<p class="cover-empty">${t('session.noAvailablePlayers', 'No hay jugadores disponibles cargados')}</p>`}
    </section>
  `;

  const jugadoresExtrasPanelHTML = `
    <section class="cover-card player-card extras-card">
      <div class="cover-card-head">
        <span class="cover-card-title">${t('session.extraPlayers', 'Jugadores extras')}</span>
        <span class="cover-card-count">${jugadoresExtrasNombres.length}</span>
      </div>
      ${jugadoresExtrasNombres.length > 0 ? `
        <div class="player-chip-list">
          ${buildPlayerChips(jugadoresExtrasNombres, 'extra')}
        </div>
      ` : `<p class="cover-empty">${t('session.noExtraPlayers', 'Sin jugadores extras asignados')}</p>`}
    </section>
  `;

  const observationsPanelHTML = `
    <section class="cover-card observations-card">
      <div class="cover-card-head">
        <span class="cover-card-title">${t('session.observations', 'Observaciones')}</span>
      </div>
      ${generalObservationsPreview ? `
        <p class="observations-body">${generalObservationsPreview}</p>
      ` : `<p class="cover-empty">${t('session.noObservations', 'Sin observaciones generales')}</p>`}
      ${exerciseObservationsPreview.length > 0 ? `
        <div class="exercise-observations-list">
          ${exerciseObservationsPreview.map((item) => `
            <div class="exercise-observation-item">
              <span class="exercise-observation-title">${item.title}:</span>
              <span class="exercise-observation-text">${item.text}</span>
            </div>
          `).join('')}
          ${remainingExerciseObservations > 0 ? `
            <div class="exercise-observation-more">+${remainingExerciseObservations} ${t('session.moreObservations', 'observaciones adicionales')}</div>
          ` : ''}
        </div>
      ` : ''}
    </section>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${t('session.pdfTitle', 'Sesión de Entrenamiento')} - ${fechaFormateada}</title>
        <style>
          :root {
            --bg-soft: #f8fafc;
            --bg-panel: #eef4ff;
            --text-main: #0f172a;
            --text-muted: #475569;
            --text-soft: #64748b;
            --primary: #1d4ed8;
            --primary-2: #1e40af;
            --border: #d7dfeb;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          @page {
            size: A4;
            margin: 7mm;
          }

          body {
            font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
            font-size: 10.5px;
            line-height: 1.35;
            color: var(--text-main);
            background: #fff;
          }

          .cover-page {
            min-height: 100vh;
            padding: 8px;
          }

          .cover-page {
            page-break-after: always;
          }

          .team-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 10px;
            border-radius: 12px;
            background: linear-gradient(135deg, #eef2ff, #f8fafc);
            border: 1px solid var(--border);
            margin-bottom: 10px;
          }

          .team-badge {
            width: 52px;
            height: 52px;
            border-radius: 10px;
            object-fit: contain;
            background: #fff;
            padding: 4px;
            border: 1px solid var(--border);
          }

          .team-name {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.2px;
          }

          .session-header {
            background: linear-gradient(135deg, var(--primary), var(--primary-2));
            color: #fff;
            padding: 12px 14px;
            border-radius: 12px;
            margin-bottom: 10px;
          }

          .session-header h1 {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 2px;
          }

          .session-header .subtitle {
            font-size: 12px;
            opacity: 0.95;
          }

          .info-section {
            background: var(--bg-soft);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 10px;
            margin-bottom: 10px;
          }

          .info-section h2 {
            font-size: 12px;
            color: var(--primary);
            font-weight: 800;
            margin-bottom: 8px;
          }

          .info-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 7px;
          }

          .info-item {
            flex: 1 1 31%;
            min-width: 120px;
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 9px;
            padding: 8px;
          }

          .info-label {
            font-size: 9px;
            color: var(--text-soft);
            margin-bottom: 3px;
            text-transform: uppercase;
            letter-spacing: 0.25px;
            font-weight: 700;
          }

          .info-value {
            font-size: 13px;
            font-weight: 800;
            color: var(--text-main);
          }

          .cover-panels {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 4px;
          }

          .cover-card {
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 8px;
            min-height: 64px;
          }

          .cover-card-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
          }

          .cover-card-title {
            font-size: 10px;
            font-weight: 800;
            color: var(--text-main);
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          .cover-card-count {
            font-size: 10px;
            font-weight: 800;
            color: var(--primary);
            background: var(--bg-panel);
            border-radius: 999px;
            padding: 2px 7px;
          }

          .cover-empty {
            color: var(--text-soft);
            font-size: 9.5px;
            line-height: 1.4;
          }

          .player-chip-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
          }

          .player-chip {
            display: inline-flex;
            align-items: center;
            padding: 2px 7px;
            border-radius: 999px;
            font-size: 9px;
            font-weight: 700;
            background: #f1f5f9;
            color: #1f2937;
            border: 1px solid #e2e8f0;
          }

          .extras-card .cover-card-count {
            color: #a16207;
            background: #fff7ed;
          }

          .player-chip.extra {
            background: #fff7ed;
            border-color: #fed7aa;
            color: #9a3412;
          }

          .observations-card {
            background: #fffbeb;
            border-color: #fde68a;
            min-height: 156px;
          }

          .observations-body {
            color: #4b5563;
            font-size: 10px;
            line-height: 1.45;
            white-space: pre-wrap;
          }

          .exercise-observations-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 6px;
          }

          .exercise-observation-item {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            font-size: 9.5px;
            line-height: 1.35;
          }

          .exercise-observation-title {
            font-weight: 800;
            color: #92400e;
          }

          .exercise-observation-text {
            color: #4b5563;
            white-space: pre-wrap;
          }

          .exercise-observation-more {
            margin-top: 2px;
            font-size: 9px;
            font-weight: 700;
            color: #92400e;
          }

          .exercise-sheet {
            page-break-after: always;
            min-height: 278mm;
            padding: 4px 4px 0;
          }

          .exercise-sheet:last-of-type {
            page-break-after: auto;
          }

          .exercise-sheet-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, var(--primary), var(--primary-2));
            color: #fff;
            border-radius: 10px;
            padding: 7px 11px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            margin-bottom: 6px;
          }

          .strength-section {
            page-break-before: always;
            padding: 4px 4px 0;
          }

          .strength-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #7c3aed, #6d28d9);
            color: #fff;
            border-radius: 10px;
            padding: 9px 12px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.35px;
            text-transform: uppercase;
            margin-bottom: 8px;
          }

          .exercise-grid {
            display: grid;
            grid-template-rows: 1fr 1fr;
            gap: 6px;
            height: 262mm;
          }

          .exercise-grid.single {
            grid-template-rows: 1fr;
          }

          .exercise-card {
            flex: 1;
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            min-height: 0;
          }

          .exercise-header {
            background: linear-gradient(135deg, var(--primary), var(--primary-2));
            color: #fff;
            padding: 9px 12px;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .exercise-number {
            background: rgba(255, 255, 255, 0.22);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 800;
            flex-shrink: 0;
          }

          .exercise-title {
            font-size: 14px;
            font-weight: 800;
            flex: 1;
          }

          .exercise-content {
            flex: 1;
            display: flex;
            flex-direction: row;
            padding: 10px;
            gap: 10px;
            overflow: hidden;
          }

          .exercise-left {
            flex: 0 0 58%;
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 0;
          }

          .exercise-right {
            flex: 0 0 42%;
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 0;
          }

          .exercise-content.with-teams .exercise-right {
            border-left: 1px solid var(--border);
            padding-left: 9px;
          }

          .exercise-image-container {
            flex: 1;
            min-height: 92mm;
            max-height: 104mm;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-soft);
            border: 1px solid var(--border);
            border-radius: 10px;
            overflow: hidden;
            padding: 6px;
          }

          .exercise-img {
            width: 100%;
            height: auto;
            max-height: 100mm;
            object-fit: contain;
            border-radius: 6px;
          }

          .exercise-data-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
          }

          .data-item {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            padding: 5px 8px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 9px;
            font-weight: 700;
            flex: 1 1 calc(50% - 5px);
          }

          .data-label {
            color: var(--text-soft);
          }

          .data-value {
            color: var(--text-main);
          }

          .exercise-details {
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
            min-height: 0;
          }

          .detail-block {
            background: var(--bg-soft);
            border: 1px solid var(--border);
            padding: 8px;
            border-radius: 8px;
            font-size: 9.5px;
          }

          .detail-title {
            font-weight: 800;
            color: var(--primary);
            display: block;
            margin-bottom: 2px;
          }

          .detail-text {
            color: var(--text-muted);
            line-height: 1.4;
            white-space: pre-wrap;
          }

          .teams-section {
            background: #fff8e1;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 8px;
            flex: 1;
            min-height: 0;
          }

          .teams-section .section-header {
            font-weight: 800;
            color: #92400e;
            font-size: 10px;
            margin-bottom: 6px;
          }

          .team-block {
            margin-bottom: 6px;
          }

          .team-badge-inline {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 3px;
          }

          .team-color-badge {
            padding: 2px 7px;
            border-radius: 10px;
            color: #fff;
            font-size: 9px;
            font-weight: 800;
          }

          .team-count {
            color: var(--text-soft);
            font-size: 9px;
            font-weight: 700;
          }

          .team-players {
            font-size: 9px;
            color: var(--text-muted);
            padding-left: 7px;
            border-left: 2px solid;
            margin-left: 3px;
            line-height: 1.5;
          }

          .extra-player {
            color: #b45309;
          }

          .strength-grid-page {
            padding: 6px;
            min-height: 96vh;
          }

          .strength-grid-header {
            background: linear-gradient(135deg, #7c3aed, #6d28d9);
            color: #fff;
            padding: 9px 12px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 800;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .strength-grid-page-num {
            font-size: 10px;
            font-weight: 700;
            opacity: 0.9;
          }

          .strength-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }

          .strength-card {
            width: calc(25% - 5px);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            background: #fff;
            break-inside: avoid;
          }

          .strength-card-img {
            width: 100%;
            aspect-ratio: 4 / 3;
            background: var(--bg-soft);
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
            font-size: 26px;
            opacity: 0.28;
          }

          .strength-card-info {
            padding: 4px 5px 2px;
            display: flex;
            align-items: flex-start;
            gap: 4px;
          }

          .strength-card-num {
            flex-shrink: 0;
            min-width: 16px;
            height: 16px;
            border-radius: 50%;
            color: #fff;
            font-size: 8px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .strength-card-name {
            font-size: 7.8px;
            font-weight: 700;
            color: var(--text-main);
            line-height: 1.2;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .strength-card-meta {
            padding: 2px 5px 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .strength-card-section {
            font-size: 7px;
            color: #7c3aed;
            font-weight: 700;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 70%;
          }

          .strength-card-level {
            font-size: 7px;
            color: var(--text-soft);
            font-weight: 700;
            flex-shrink: 0;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <section class="cover-page">
          <div class="team-header">
            ${team?.escudo ? `<img src="${team.escudo}" class="team-badge" />` : ''}
            <div class="team-name">${team?.nombre || t('common.team', 'Equipo')}</div>
          </div>

          <div class="session-header">
            <h1>${t('session.pdfTitle', 'Sesión de Entrenamiento')}</h1>
            <div class="subtitle">${fechaFormateada}</div>
          </div>

          <div class="info-section">
            <h2>${t('session.generalInfo', 'Información General')}</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">${t('session.dateLabel', 'Fecha')}</div>
                <div class="info-value">${fechaFormateada}</div>
              </div>
              <div class="info-item">
                <div class="info-label">${t('session.schedule', 'Horario')}</div>
                <div class="info-value">${horaInicio} - ${horaFin}</div>
              </div>
              <div class="info-item">
                <div class="info-label">${t('session.duration', 'Duración')}</div>
                <div class="info-value">${duracionLabel}</div>
              </div>
              ${lugar ? `
                <div class="info-item">
                  <div class="info-label">${t('session.location', 'Lugar')}</div>
                  <div class="info-value">${lugar}</div>
                </div>
              ` : ''}
              <div class="info-item">
                <div class="info-label">${t('session.exercises', 'Ejercicios')}</div>
                <div class="info-value">${ejerciciosOrdenados.length}</div>
              </div>
              <div class="info-item">
                <div class="info-label">${t('session.players', 'Jugadores')}</div>
                <div class="info-value">${totalJugadores}</div>
              </div>
            </div>
          </div>

          <div class="cover-panels">
            <div>
              ${jugadoresDisponiblesPanelHTML}
              <div style="height: 8px;"></div>
              ${jugadoresExtrasPanelHTML}
            </div>
            <div>
              ${observationsPanelHTML}
            </div>
          </div>
        </section>

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
