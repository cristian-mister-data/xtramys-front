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
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
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
    if (ejercicio.numeroJugadores) pills.push(`${ejercicio.numeroJugadores} jugadores`);
    if (ejercicio.equipos) pills.push(`${ejercicio.equipos} equipos`);
    if (ejercicio.dimensiones) pills.push(ejercicio.dimensiones);
    if (ejercicio.tiempo) pills.push(`${ejercicio.tiempo} min`);
    if (!isLastExercise && tiempoDescanso > 0) pills.push(`Descanso: ${tiempoDescanso}min`);

    const pillsHTML = pills.length > 0
      ? `<div class="ex-pills">${pills.map(p => `<span class="ex-pill">${p}</span>`).join('')}</div>`
      : '';

    // Secciones de texto
    const sections = [];
    if (ejercicio.objetivo) sections.push({ label: 'Objetivo', text: ejercicio.objetivo });
    if (ejercicio.descripcion) sections.push({ label: 'Descripcion', text: truncateText(ejercicio.descripcion, 500) });
    if (observacion) sections.push({ label: 'Observacion', text: observacion });

    const sectionsHTML = sections.map((s, i) => `
      ${i > 0 ? '<div class="ex-divider"></div>' : ''}
      <div class="ex-section">
        <div class="ex-section-label">${s.label}</div>
        <div class="ex-section-text">${s.text}</div>
      </div>
    `).join('');

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
            <span class="team-tag" style="background:${color};">Equipo ${ta.teamNumber}</span>
            <span class="team-names">${names.join(' - ')}</span>
          </div>
        `;
      }).join('');

      teamsHTML = `
        <div class="teams-block">
          <div class="teams-title">Asignacion de equipos</div>
          ${rowsHTML}
        </div>
      `;
    }

    return `
      <div class="ex-card">
        <div class="ex-header">
          <div class="ex-num">${ordenNumero}</div>
          <div class="ex-header-content">
            <div class="ex-name">${ejercicio.nombre || 'Ejercicio sin nombre'}</div>
            ${pillsHTML}
          </div>
        </div>
        <div class="ex-body">
          <div class="ex-img-col">
            ${imagenSrc
              ? `<img src="${imagenSrc}" class="ex-img" onerror="this.style.display='none'" />`
              : `<div class="ex-img-placeholder">Sin imagen</div>`}
          </div>
          <div class="ex-info-col">
            ${sectionsHTML || '<div class="ex-empty">Sin descripcion</div>'}
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
            <div class="sheet-title">Ejercicios</div>
          </div>
          <div class="sheet-count">${fromNumber}-${toNumber} / ${ejerciciosOrdenados.length}</div>
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
        const sectionColor = sectionResult?.section?.color || '#8b5cf6';
        const sectionName = sectionResult ? (i18n ? i18n.t(sectionResult.section.i18nKey) : sectionResult.section.id) : '';
        return `
          <div class="st-card">
            <div class="st-img">
              ${imagenSrc ? `<img src="${imagenSrc}" />` : `<div class="st-placeholder">💪</div>`}
            </div>
            <div class="st-body">
              <div class="st-header">
                <div class="st-num" style="background:${sectionColor};">${globalIdx + 1}</div>
                <div class="st-name">${exerciseName}</div>
              </div>
              <div class="st-footer">
                <span class="st-section">${sectionName}</span>
                <span class="st-level">Nv ${exercise.level}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      return `
        <div class="strength-page" ${!isLastPage ? 'style="page-break-after:always;"' : ''}>
          <div class="sheet-header">
            <div class="sheet-header-left">
              <div class="sheet-dot" style="background:#7c3aed;"></div>
              <div class="sheet-title" style="color:#7c3aed;">Ejercicios de Fuerza</div>
            </div>
            <div class="sheet-count">Pag ${pageIdx + 1} / ${pages.length}</div>
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
  <title>Sesion de Entrenamiento - ${fechaFormateada}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10px;
      color: #0f172a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── PORTADA ── */
    .cover-page {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm 14mm 10mm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%);
      border-radius: 14px;
      padding: 22px 26px;
      color: #fff;
      margin-bottom: 4px;
    }
    .banner-team {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.55);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .team-logo {
      width: 30px;
      height: 30px;
      object-fit: contain;
      background: rgba(255,255,255,0.15);
      border-radius: 6px;
      padding: 3px;
    }
    .banner-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 5px;
    }
    .banner-date {
      font-size: 11px;
      color: rgba(255,255,255,0.7);
      font-weight: 400;
    }

    /* Stats strip */
    .stats-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .stat-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .stat-label {
      font-size: 8px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 14px;
      font-weight: 800;
      color: #2563eb;
      line-height: 1.2;
      word-break: break-word;
    }
    .stat-sub {
      font-size: 8.5px;
      color: #94a3b8;
      margin-top: 2px;
    }

    /* Panels */
    .panels-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      flex: 1;
    }
    .panel {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    .panel-title {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #0f172a;
    }
    .panel-badge {
      font-size: 8.5px;
      font-weight: 700;
      color: #2563eb;
      background: #eff6ff;
      padding: 2px 8px;
      border-radius: 20px;
    }
    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .chip {
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 9px;
      font-weight: 600;
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .chip.extra {
      background: #fffbeb;
      border-color: #fde68a;
      color: #b45309;
    }
    .panel-empty {
      font-size: 9px;
      color: #94a3b8;
      font-style: italic;
    }
    .obs-text {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .obs-ex-item {
      padding: 5px 8px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #2563eb;
      margin-bottom: 4px;
    }
    .obs-ex-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 8.5px;
    }
    .obs-ex-text {
      font-size: 8.5px;
      color: #475569;
    }

    /* ── EXERCISE SHEETS ── */
    .exercise-sheet {
      width: 210mm;
      min-height: 297mm;
      padding: 9mm 13mm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }
    .exercise-sheet:last-of-type { page-break-after: auto; }

    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      margin-bottom: 10px;
      border-bottom: 2px solid #0f172a;
    }
    .sheet-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sheet-dot {
      width: 10px;
      height: 10px;
      background: #2563eb;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .sheet-title {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }
    .sheet-count {
      font-size: 9px;
      color: #94a3b8;
      font-weight: 600;
    }

    /* Exercise grid */
    .ex-grid {
      display: grid;
      grid-template-rows: 1fr 1fr;
      gap: 10px;
      flex: 1;
    }
    .ex-grid.single {
      grid-template-rows: 1fr;
    }

    /* Exercise card */
    .ex-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .ex-header {
      background: #0f172a;
      color: #fff;
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
      width: 26px;
      height: 26px;
      background: #2563eb;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 13px;
      text-align: center;
      line-height: 26px;
    }
    .ex-header-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      width: 100%;
      padding: 0 40px;
    }
    .ex-name {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-align: center;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .ex-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .ex-pill {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: 700;
      background: #334155;
      color: #e2e8f0;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid #475569;
    }

    /* Exercise body */
    .ex-body {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .ex-img-col {
      flex: 0 0 52%;
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
      border-radius: 6px;
      display: block;
    }
    .ex-img-placeholder {
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
    }
    .ex-info-col {
      flex: 0 0 48%;
      padding: 12px 13px;
      display: flex;
      flex-direction: column;
      gap: 7px;
      overflow: hidden;
    }
    .ex-section {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ex-section-label {
      font-size: 7.5px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 800;
      color: #2563eb;
    }
    .ex-section-text {
      font-size: 9px;
      color: #475569;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .ex-divider {
      height: 1px;
      background: #f1f5f9;
    }
    .ex-empty {
      font-size: 9px;
      color: #94a3b8;
      font-style: italic;
    }

    /* Teams */
    .teams-block {
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
    }
    .teams-title {
      font-size: 7.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.8px;
      margin-bottom: 5px;
    }
    .team-row {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 4px;
    }
    .team-tag {
      padding: 1px 6px;
      border-radius: 4px;
      color: #fff;
      font-size: 7.5px;
      font-weight: 800;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .team-names {
      font-size: 8.5px;
      color: #475569;
      line-height: 1.4;
    }

    /* ── STRENGTH PAGES ── */
    .strength-page {
      width: 210mm;
      min-height: 297mm;
      padding: 9mm 13mm;
      page-break-before: always;
    }
    .st-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 8px;
    }
    .st-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .st-img {
      width: 100%;
      aspect-ratio: 4/3;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .st-img img { width: 100%; height: 100%; object-fit: cover; }
    .st-placeholder { font-size: 24px; opacity: 0.2; }
    .st-body { padding: 7px 8px; }
    .st-header { display: flex; align-items: flex-start; gap: 5px; margin-bottom: 5px; }
    .st-num {
      width: 17px;
      height: 17px;
      border-radius: 4px;
      color: #fff;
      font-size: 8.5px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      text-align: center;
    }
    .st-name { font-size: 8.5px; font-weight: 700; color: #0f172a; line-height: 1.2; }
    .st-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 4px; border-top: 1px solid #f1f5f9; }
    .st-section { font-size: 7px; font-weight: 700; color: #7c3aed; }
    .st-level { font-size: 7px; font-weight: 700; color: #94a3b8; background: #f8fafc; padding: 1px 4px; border-radius: 6px; }

    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>

  <!-- PORTADA -->
  <div class="cover-page">
    <div class="banner">
      <div class="banner-team">
        ${team?.escudo ? `<img src="${team.escudo}" class="team-logo" />` : ''}
        ${team?.nombre || 'Equipo'}
      </div>
      <div class="banner-title">Sesion de Entrenamiento</div>
      <div class="banner-date">${fechaFormateada}</div>
    </div>

    <div class="stats-strip">
      <div class="stat-card">
        <div class="stat-label">Horario</div>
        <div class="stat-value" style="font-size:12px;">${horaInicio} - ${horaFin}</div>
        <div class="stat-sub">${duracionLabel}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ejercicios</div>
        <div class="stat-value">${ejerciciosOrdenados.length}</div>
        <div class="stat-sub">${strengthExercises.length > 0 ? `+ ${strengthExercises.length} fuerza` : 'tacticos'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Jugadores</div>
        <div class="stat-value">${jugadoresNombres.length}</div>
        <div class="stat-sub">${jugadoresExtrasNombres.length > 0 ? `+ ${jugadoresExtrasNombres.length} extras` : 'plantilla'}</div>
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
          <div class="panel-title">Jugadores disponibles</div>
          <div class="panel-badge">${jugadoresNombres.length + jugadoresExtrasNombres.length}</div>
        </div>
        <div class="chip-list">
          ${jugadoresNombres.length > 0
            ? jugadoresNombres.map(n => `<span class="chip">${n}</span>`).join('')
            : `<span class="panel-empty">Sin jugadores cargados</span>`}
        </div>
        ${jugadoresExtrasNombres.length > 0 ? `
          <div class="panel-head" style="margin-top:6px; border-color:#fde68a;">
            <div class="panel-title" style="color:#b45309;">Jugadores extras</div>
            <div class="panel-badge" style="color:#b45309; background:#fffbeb;">${jugadoresExtrasNombres.length}</div>
          </div>
          <div class="chip-list">
            ${jugadoresExtrasNombres.map(n => `<span class="chip extra">${n}</span>`).join('')}
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
          <div>
            ${exerciseObservationsPreview.map(item => `
              <div class="obs-ex-item">
                <div class="obs-ex-name">${item.title}</div>
                <div class="obs-ex-text">${item.text}</div>
              </div>
            `).join('')}
            ${remainingExerciseObservations > 0 ? `
              <div style="font-size:8px; color:#94a3b8; margin-top:4px;">+${remainingExerciseObservations} observaciones mas</div>
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

    const { uri } = await Print.printToFileAsync({ html, base64: false });

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
