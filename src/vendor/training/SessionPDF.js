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
import api from '@/api/client';

/**
 * Genera el HTML para el PDF de sesion de entrenamiento
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

  // ── Observaciones ──
  const exerciseObservationsMap = {};
  let generalObservationsText = '';

  const addGeneralObservation = (value) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    generalObservationsText = generalObservationsText ? `${generalObservationsText}\n${trimmed}` : trimmed;
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
    if (typeof item === 'string') { addGeneralObservation(item); return; }
    if (typeof item !== 'object') return;
    const observationValue = item.observacion || item.observaciones || item.text || item.note || item.value || '';
    const exerciseId = item.ejercicioId || item.ejercicio || item.exerciseId || item.exercise;
    if (exerciseId) { setExerciseObservation(exerciseId, observationValue); return; }
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
      rawObservations.general || rawObservations.generales ||
      rawObservations.observacionesGenerales || rawObservations.notes ||
      rawObservations.notas || rawObservations.text
    );
    const grouped = rawObservations.porEjercicio || rawObservations.ejercicios || rawObservations.byExercise || rawObservations.items;
    if (Array.isArray(grouped)) { grouped.forEach(ingestObservationItem); }
    else { ingestObservationItem(rawObservations); }
  }

  // ── Mapa de detalles ──
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

  // ── Helpers ──
  const truncateText = (text, maxLength = 300) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getTeamColor = (teamNumber) => {
    const colors = ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#0d9488', '#2563eb', '#b45309'];
    return colors[(teamNumber - 1) % colors.length];
  };

  // ── Ordenar ejercicios ──
  const ejerciciosOrdenados = [...exercises].sort((a, b) => {
    const ordenA = detalleMap[a._id]?.orden || 0;
    const ordenB = detalleMap[b._id]?.orden || 0;
    return ordenA - ordenB;
  });

  const exerciseObservationItems = ejerciciosOrdenados.map((ejercicio) => {
    const detalle = detalleMap[ejercicio._id] || {};
    const text = typeof detalle.observacion === 'string' ? detalle.observacion.trim() : '';
    if (!text) return null;
    return { title: ejercicio?.nombre || 'Ejercicio sin nombre', text };
  }).filter(Boolean);

  // ── Horario / duracion ──
  const formatTimeStr = (t) => {
    if (t === null || t === undefined) return '--:--';
    const s = String(t).trim();
    if (!s) return '--:--';
    if (s.includes(':')) return s;
    if (s.length === 3) return `0${s[0]}:${s.slice(1)}`;
    if (s.length === 4) return `${s.slice(0, 2)}:${s.slice(2)}`;
    return s;
  };
  const horaInicio = formatTimeStr(session.horaInicio);
  const horaFin = formatTimeStr(session.horaFin);
  const lugar = session.lugar || '';

  const parseClock = (value) => {
    if (!value || typeof value !== 'string') return null;
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return (h * 60) + m;
  };
  const startMinutes = parseClock(horaInicio);
  const endMinutes = parseClock(horaFin);
  const computedDurationMinutes = (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes)
    ? (endMinutes - startMinutes) : null;
  const rawDuration = Number(session.duracion);
  const durationMinutes = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : computedDurationMinutes;
  const duracionLabel = durationMinutes ? `${durationMinutes} min` : '';

  // ── Observaciones preview ──
  const generalObservationsPreview = generalObservationsText ? truncateText(generalObservationsText, 520) : '';
  const exerciseObservationsPreview = exerciseObservationItems.slice(0, 5).map((item) => ({
    title: item.title,
    text: truncateText(item.text, 140),
  }));
  const remainingExerciseObservations = exerciseObservationItems.length - exerciseObservationsPreview.length;

  // ── Builder ejercicio card ──
  const buildExerciseCardHTML = (ejercicio, index) => {
    const detalle = detalleMap[ejercicio._id] || {};
    const ordenNumero = detalle.orden || (index + 1);
    const tiempoDescanso = detalle.tiempoDescanso || 0;
    const observacion = detalle.observacion || '';
    const isLastExercise = index === ejerciciosOrdenados.length - 1;

    // Imagen
    let imagenSrc = '';
    const cachedImage = imageDataUris[`ex_${ejercicio._id}`];
    if (cachedImage) {
      imagenSrc = cachedImage;
    } else if (ejercicio.imagen) {
      if (typeof ejercicio.imagen === 'string' && ejercicio.imagen.startsWith('http')) {
        imagenSrc = ejercicio.imagen;
      } else if (typeof ejercicio.imagen === 'string' && ejercicio.imagen.startsWith('data:')) {
        imagenSrc = ejercicio.imagen;
      } else if (typeof ejercicio.imagen === 'string') {
        imagenSrc = `data:image/png;base64,${ejercicio.imagen}`;
      }
    }

    // Pills de metadatos
    const pills = [];
    if (ejercicio.numeroJugadores) pills.push(`${ejercicio.numeroJugadores} Jugadores`);
    if (ejercicio.equipos) pills.push(`${ejercicio.equipos} Equipos`);
    if (ejercicio.dimensiones) pills.push(ejercicio.dimensiones);
    if (ejercicio.tiempo) pills.push(`${ejercicio.tiempo} min`);
    if (!isLastExercise && tiempoDescanso > 0) pills.push(`Descanso: ${tiempoDescanso} min`);

    const pillsHTML = pills.length > 0
      ? `<div class="ex-pills">${pills.map(p => `<span class="ex-pill">${p}</span>`).join('')}</div>`
      : '';

    // Secciones de texto
    const sections = [];
    if (ejercicio.objetivo) sections.push({ label: 'Objetivo', text: ejercicio.objetivo });
    if (ejercicio.descripcion) sections.push({ label: 'Descripción', text: truncateText(ejercicio.descripcion, 340) });
    if (observacion) sections.push({ label: 'Observación', text: observacion });

    const sectionsHTML = sections.map((s) => `
      <div class="ex-section">
        <div class="ex-section-label">${s.label}</div>
        <div class="ex-section-text">${s.text}</div>
      </div>
    `).join('<div class="ex-divider"></div>');

    // Equipos
    const teamAssignmentsData = (detalle.teamAssignments || []).filter(ta =>
      (ta.players && ta.players.length > 0) || (ta.extraPlayers && ta.extraPlayers.length > 0)
    );

    let teamsHTML = '';
    if (teamAssignmentsData.length > 0) {
      const rowsHTML = teamAssignmentsData.map(ta => {
        const color = getTeamColor(ta.teamNumber);
        const names = [];
        (ta.players || []).forEach(pid => {
          const id = getEntityId(pid);
          const p = players.find(j => getEntityId(j) === id);
          if (p) names.push(getPlayerFullName(p));
          else if (typeof pid === 'object' && pid) names.push(getPlayerFullName(pid) || id);
        });
        (ta.extraPlayers || []).forEach(epId => {
          const id = getEntityId(epId);
          const p = players.find(j => getEntityId(j) === id);
          const nombre = p ? getPlayerFullName(p) : (typeof epId === 'object' ? getPlayerFullName(epId) : id);
          if (nombre) names.push(`* ${nombre}`);
        });
        return `
          <div class="team-row">
            <span class="team-tag" style="background:${color}10; color:${color}; border: 1px solid ${color}30;">Equipo ${ta.teamNumber}:</span>
            <span class="team-names">${names.join(', ')}</span>
          </div>
        `;
      }).join('');

      teamsHTML = `
        <div class="teams-block">
          <div class="teams-title">Asignación de equipos</div>
          ${rowsHTML}
        </div>
      `;
    }

    return `
      <div class="ex-card">
        <div class="ex-header">
          <div class="ex-num">#${ordenNumero}</div>
          <div class="ex-header-content">
            <div class="ex-name">${ejercicio.nombre || 'Ejercicio sin nombre'}</div>
            ${pillsHTML}
          </div>
        </div>
        <div class="ex-body">
          <div class="ex-img-col">
            ${imagenSrc
        ? `<img src="${imagenSrc}" class="ex-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="ex-img-placeholder" style="display:none;">Sin Imagen</div>`
        : `<div class="ex-img-placeholder">Sin Imagen</div>`}
          </div>
          <div class="ex-info-col">
            ${sectionsHTML || '<div class="ex-empty">Sin descripción</div>'}
            ${teamsHTML}
          </div>
        </div>
      </div>
    `;
  };

  // ── HTML de ejercicios ──
  const EXERCISES_PER_SHEET = 2;
  const ejerciciosHTML = ejerciciosOrdenados.reduce((acc, _item, index) => {
    if (index % EXERCISES_PER_SHEET !== 0) return acc;
    const sheetExercises = ejerciciosOrdenados.slice(index, index + EXERCISES_PER_SHEET);
    const fromNumber = index + 1;
    const toNumber = index + sheetExercises.length;
    const cardsHTML = sheetExercises
      .map((ejercicio, localIdx) => buildExerciseCardHTML(ejercicio, index + localIdx))
      .join('');
    const gridClass = sheetExercises.length === 1 ? 'ex-grid single' : 'ex-grid';
    acc.push(`
      <section class="exercise-sheet">
        <div class="sheet-header">
          <div class="sheet-header-left">
            <div class="sheet-dot"></div>
            <div class="sheet-title">Ejercicios de la Sesión</div>
          </div>
          <div class="sheet-count">Ejercicios ${fromNumber}-${toNumber} / ${ejerciciosOrdenados.length}</div>
        </div>
        <div class="${gridClass}">
          ${cardsHTML}
        </div>
      </section>
    `);
    return acc;
  }, []).join('');

  // ── HTML de fuerza ──
  const STRENGTH_PER_PAGE = 12;
  let ejerciciosFuerzaHTML = '';
  if (strengthExercises && strengthExercises.length > 0) {
    const pages = [];
    for (let i = 0; i < strengthExercises.length; i += STRENGTH_PER_PAGE) {
      pages.push(strengthExercises.slice(i, i + STRENGTH_PER_PAGE));
    }
    ejerciciosFuerzaHTML = pages.map((pageExercises, pageIdx) => {
      const isLastPage = pageIdx === pages.length - 1;
      const cardsHTML = pageExercises.map((exercise, idx) => {
        const globalIdx = pageIdx * STRENGTH_PER_PAGE + idx;
        const imagenSrc = imageDataUris[exercise.image] || '';
        const exerciseName = i18n ? i18n.t(exercise.i18nKey) : exercise.id;
        const sectionResult = getSectionForExercise(exercise.id || exercise);
        const sectionName = sectionResult ? (i18n ? i18n.t(sectionResult.section.i18nKey) : sectionResult.section.id) : '';
        return `
          <div class="st-card">
            <div class="st-img">
              ${imagenSrc ? `<img src="${imagenSrc}" />` : `<div class="st-placeholder">💪</div>`}
            </div>
            <div class="st-body">
              <div class="st-header">
                <div class="st-num">${globalIdx + 1}.</div>
                <div class="st-name">${exerciseName}</div>
              </div>
              <div class="st-footer">
                <span class="st-section">${sectionName}</span>
                <span class="st-level">NV ${exercise.level}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      return `
        <div class="strength-page" ${!isLastPage ? 'style="page-break-after:always;"' : ''}>
          <div class="sheet-header">
            <div class="sheet-header-left">
              <div class="sheet-dot" style="background:#475569;"></div>
              <div class="sheet-title" style="color:#0f172a;">Ejercicios de Fuerza</div>
            </div>
            <div class="sheet-count">Pág ${pageIdx + 1} / ${pages.length}</div>
          </div>
          <div class="st-grid">
            ${cardsHTML}
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Template HTML final ──
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Sesión de Entrenamiento - ${fechaFormateada}</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-size: 10px;
      color: #334155;
      background: #f8fafc;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── PORTADA ── */
    .cover-page {
      width: 210mm;
      height: 297mm;
      padding: 12mm 14mm 10mm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
      background: #f8fafc;
    }
    .banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 70%, #334155 100%);
      border-radius: 12px;
      padding: 22px 26px;
      color: #ffffff;
      margin-bottom: 4px;
      box-shadow: 0 4px 15px rgba(15, 23, 42, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .banner-left {
      display: flex;
      flex-direction: column;
    }
    .banner-team {
      font-family: 'Outfit', sans-serif;
      font-size: 9.5px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .team-logo {
      width: 24px;
      height: 24px;
      object-fit: contain;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 50%;
      padding: 1px;
    }
    .banner-title {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #ffffff;
    }
    .banner-date {
      font-size: 10px;
      color: #cbd5e1;
      font-weight: 500;
      margin-top: 2px;
    }
    .banner-logo-right {
      width: 54px;
      height: 54px;
      object-fit: contain;
      background: #ffffff;
      border-radius: 8px;
      padding: 4px;
      border: 2px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }

    /* Stats strip */
    .stats-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-top: 3px solid #0f172a;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
    }
    .stat-label {
      font-family: 'Outfit', sans-serif;
      font-size: 7.5px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 900;
      margin-bottom: 4px;
    }
    .stat-value {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
      word-break: break-word;
    }
    .stat-sub {
      font-size: 8px;
      color: #94a3b8;
      margin-top: 2px;
      font-weight: 500;
    }

    /* Panels */
    .panels-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      flex: 1;
      min-height: 0;
    }
    .panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
      overflow-y: auto;
    }
    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 6px;
      border-bottom: 2px solid #f1f5f9;
    }
    .panel-title {
      font-family: 'Outfit', sans-serif;
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
    }
    .panel-badge {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      line-height: 1.2;
    }
    .roster-text-list {
      font-size: 8.5px;
      line-height: 1.6;
      color: #475569;
      font-weight: 500;
      white-space: normal;
      word-break: break-word;
    }
    .roster-name {
      display: inline-block;
      color: #334155;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      margin: 1px;
      font-weight: 600;
    }
    .roster-name.extra {
      color: #b45309;
      background: #fffbeb;
      border: 1px solid #fde68a;
    }
    .panel-empty {
      font-size: 9px;
      color: #94a3b8;
      font-style: italic;
    }
    .obs-text {
      font-size: 9px;
      color: #334155;
      line-height: 1.5;
      white-space: pre-wrap;
      padding: 2px 0;
    }
    .obs-ex-item {
      margin-bottom: 8px;
    }
    .obs-ex-name {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      color: #0f172a;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .obs-ex-text {
      font-size: 8.5px;
      color: #475569;
      line-height: 1.4;
    }

    /* ── EXERCISE SHEETS ── */
    .exercise-sheet {
      width: 210mm;
      height: 297mm;
      padding: 12mm 14mm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #f8fafc;
    }
    .exercise-sheet:last-of-type { page-break-after: auto; }

    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      margin-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
    }
    .sheet-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sheet-dot {
      width: 8px;
      height: 8px;
      background: #0f172a;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .sheet-title {
      font-family: 'Outfit', sans-serif;
      font-size: 11px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .sheet-count {
      font-family: 'Outfit', sans-serif;
      font-size: 8.5px;
      color: #64748b;
      font-weight: 800;
      text-transform: uppercase;
    }

    /* Exercise grid */
    .ex-grid {
      display: grid;
      grid-template-rows: 1fr 1fr;
      gap: 12px;
      flex: 1;
      min-height: 0;
    }
    .ex-grid.single {
      grid-template-rows: 1fr;
    }

    /* Exercise card */
    .ex-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.03);
    }
    .ex-header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #ffffff;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
      min-height: 48px;
    }
    .ex-num {
      position: absolute;
      left: 14px;
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 15px;
      color: #94a3b8;
    }
    .ex-header-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      width: 100%;
      padding: 0 40px;
    }
    .ex-name {
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-align: center;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .ex-pills {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      justify-content: center;
      font-size: 7.5px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .ex-pill {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 2px 6px;
      border-radius: 8px;
    }

    /* Exercise body */
    .ex-body {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .ex-img-col {
      flex: 0 0 45%;
      background: #f8fafc;
      border-right: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      overflow: hidden;
    }
    .ex-img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
      display: block;
      box-shadow: 0 4px 12px rgba(15,23,42,0.06);
    }
    .ex-img-placeholder {
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
      font-weight: 600;
      text-transform: uppercase;
      font-family: 'Outfit', sans-serif;
    }
    .ex-info-col {
      flex: 0 0 55%;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
    }
    .ex-section {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ex-section-label {
      font-family: 'Outfit', sans-serif;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 900;
      color: #475569;
    }
    .ex-section-text {
      font-size: 8.5px;
      color: #334155;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    .ex-divider {
      height: 1px;
      background: #e2e8f0;
    }
    .ex-empty {
      font-size: 9px;
      color: #94a3b8;
      font-style: italic;
    }

    /* Teams */
    .teams-block {
      margin-top: 4px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
    }
    .teams-title {
      font-family: 'Outfit', sans-serif;
      font-size: 8px;
      font-weight: 900;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }
    .team-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 3px;
    }
    .team-tag {
      font-size: 7.5px;
      font-weight: 800;
      white-space: nowrap;
      flex-shrink: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 1.5px 5px;
      border-radius: 4px;
    }
    .team-names {
      font-size: 8px;
      color: #475569;
      line-height: 1.3;
      font-weight: 600;
    }

    /* ── STRENGTH PAGES ── */
    .strength-page {
      width: 210mm;
      height: 297mm;
      padding: 12mm 14mm;
      page-break-before: always;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #f8fafc;
    }
    .st-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 4px;
      flex: 1;
      align-content: start;
    }
    .st-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(15,23,42,0.03);
      display: flex;
      flex-direction: column;
    }
    .st-img {
      width: 100%;
      aspect-ratio: 4/3;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-bottom: 1px solid #f1f5f9;
    }
    .st-img img { width: 100%; height: 100%; object-fit: cover; }
    .st-placeholder { font-size: 20px; opacity: 0.25; }
    .st-body { padding: 8px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .st-header { display: flex; align-items: flex-start; gap: 5px; margin-bottom: 6px; }
    .st-num {
      color: #94a3b8;
      font-size: 9.5px;
      font-weight: 900;
      margin-right: 2px;
      font-family: 'Outfit', sans-serif;
    }
    .st-name { font-size: 8.5px; font-weight: 700; color: #0f172a; line-height: 1.25; }
    .st-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 5px; border-top: 1px solid #f1f5f9; }
    .st-section { font-size: 7.5px; font-weight: 800; color: #475569; text-transform: uppercase; font-family: 'Outfit', sans-serif; }
    .st-level { font-size: 7.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; font-family: 'Outfit', sans-serif; }
  </style>
</head>
<body>

  <!-- PORTADA -->
  <div class="cover-page">
    <div class="banner">
      <div class="banner-left">
        <div class="banner-team">
          ${team?.escudo ? `<img src="${team.escudo}" class="team-logo" />` : ''}
          ${team?.nombre || 'Equipo'}
        </div>
        <div class="banner-title">${t('session.pdfTitle', 'Sesión de Entrenamiento')}</div>
        <div class="banner-date">${fechaFormateada}</div>
      </div>
      ${team?.escudo ? `<img src="${team.escudo}" class="banner-logo-right" />` : ''}
    </div>

    <div class="stats-strip">
      <div class="stat-card">
        <div class="stat-label">Horario</div>
        <div class="stat-value" style="font-size: 11px; white-space: nowrap; letter-spacing: -0.2px;">${horaInicio} - ${horaFin}</div>
        <div class="stat-sub">${duracionLabel}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ejercicios</div>
        <div class="stat-value">${ejerciciosOrdenados.length}</div>
        <div class="stat-sub">${strengthExercises.length > 0 ? `+ ${strengthExercises.length} Fuerza` : 'Tácticos'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Jugadores</div>
        <div class="stat-value">${jugadoresNombres.length}</div>
        <div class="stat-sub">${jugadoresExtrasNombres.length > 0 ? `+ ${jugadoresExtrasNombres.length} Extras` : 'Plantilla'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Lugar</div>
        <div class="stat-value" style="font-size:11px; margin-top:2px;">${lugar || '---'}</div>
        <div class="stat-sub">&nbsp;</div>
      </div>
    </div>

    <div class="panels-row">
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Jugadores Disponibles (${jugadoresNombres.length + jugadoresExtrasNombres.length})</div>
        </div>
        <div class="roster-text-list">
          ${jugadoresNombres.length > 0
      ? jugadoresNombres.map(n => `<span class="roster-name">${n}</span>`).join(' ')
      : `<span class="panel-empty">Sin jugadores cargados</span>`}
        </div>
        ${jugadoresExtrasNombres.length > 0 ? `
          <div class="panel-head" style="margin-top:12px; border-color:#e2e8f0; padding-top:6px;">
            <div class="panel-title" style="color:#0f172a;">Jugadores Extras (${jugadoresExtrasNombres.length})</div>
          </div>
          <div class="roster-text-list extra">
            ${jugadoresExtrasNombres.map(n => `<span class="roster-name extra">${n}</span>`).join(' ')}
          </div>
        ` : ''}
      </div>

      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Observaciones</div>
        </div>
        ${generalObservationsPreview
      ? `<div class="obs-text">${generalObservationsPreview}</div>`
      : `<div class="panel-empty">Sin observaciones generales</div>`}
        ${exerciseObservationsPreview.length > 0 ? `
          <div style="margin-top:6px;">
            ${exerciseObservationsPreview.map(item => `
              <div class="obs-ex-item">
                <div class="obs-ex-name">${item.title}</div>
                <div class="obs-ex-text">${item.text}</div>
              </div>
            `).join('')}
            ${remainingExerciseObservations > 0 ? `
              <div style="font-size:8px; color:#94a3b8; margin-top:4px;">+${remainingExerciseObservations} observaciones más</div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  </div>

  ${ejerciciosHTML}

  ${ejerciciosFuerzaHTML}

</body>
</html>`;
};

/**
 * Genera y descarga el PDF de sesion de entrenamiento
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

    // Pre-resolver imagenes a base64 (Fuerza y Regulares)
    const imageDataUris = {};
    const toDataUrl = async (url) => {
      let blob;
      try {
        const res = await api.get('/media/image-download', {
          params: { url },
          responseType: 'blob',
          timeout: 15000
        });
        blob = res.data;
      } catch (err) {
        console.warn('Proxy fetch failed, trying direct fetch:', err.message);
        const res = await fetch(url);
        if (!res.ok) throw new Error('fetch failed: ' + res.status);
        blob = await res.blob();
      }

      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    };

    if (strengthExercises && strengthExercises.length > 0) {
      await Promise.all(strengthExercises.map(async (exercise) => {
        try {
          const imageSource = getStrengthExerciseImage(exercise.image);
          if (!imageSource) return;
          const url = typeof imageSource === 'string' ? imageSource : imageSource?.uri;
          if (!url) return;
          imageDataUris[exercise.image] = await toDataUrl(url);
        } catch (e) {
          console.warn('Failed to resolve image for PDF:', exercise.id, e);
        }
      }));
    }

    if (exercises && exercises.length > 0) {
      await Promise.all(exercises.map(async (exercise) => {
        try {
          if (exercise.imagen && typeof exercise.imagen === 'string' && exercise.imagen.startsWith('http')) {
            imageDataUris[`ex_${exercise._id}`] = await toDataUrl(exercise.imagen);
          }
        } catch (e) {
          console.warn('Failed to resolve image for exercise PDF:', exercise._id, e);
        }
      }));
    }

    const html = generateSessionPDFHTML({ session, exercises, strengthExercises, team, players, i18n, imageDataUris });

    const { uri } = await Print.printToFileAsync({ html });

    const fecha = new Date(session.fecha);
    const diasKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const diaKey = diasKeys[fecha.getDay()];
    const diaSemana = t(`weekdays.${diaKey}`, diaKey);
    const fechaStr = fecha.toLocaleDateString(locale).replace(/\//g, '-');
    const pdfPrefix = t('session.pdfFilePrefix', 'Sesion_Entrenamiento');
    const fileName = `${pdfPrefix}_${diaSemana}_${fechaStr}.pdf`;

    await savePdfToDownloads(uri, fileName);

    return fileName;
  } catch (error) {
    console.error('Error generating session PDF:', error);
    throw error;
  }
};
