// components/pages/matchSheet/MatchSheetPDF.js
// Utilidades compartidas para generar PDFs de alineación y convocatoria
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { savePdfToDownloads } from '@/utils/pdfDownload';
import { getPlayerFullName, getPlayerFirstName } from '@/utils/playerHelpers';

// Colores por posición
const getPositionColor = (pos) => {
  const position = pos?.toUpperCase() || '';
  if (position === 'POR' || position === 'PORTERO') return '#059669';
  if (['DFC', 'LI', 'LD', 'CAI', 'CAD', 'CENTRAL', 'LATERAL'].some(p => position.includes(p))) return '#2563eb';
  if (['MC', 'MCO', 'MCD', 'MI', 'MD', 'MEDIO', 'CENTROCAMPISTA'].some(p => position.includes(p))) return '#d97706';
  if (['DC', 'EI', 'ED', 'SD', 'DELANTERO', 'EXTREMO'].some(p => position.includes(p))) return '#dc2626';
  return '#4f46e5';
};

// Posiciones predefinidas para todas las formaciones
const FORMATION_POSITIONS = {
  '1-4-4-2': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'LI', x: 10, y: 70 },
    { pos: 'DFC', x: 32, y: 74 },
    { pos: 'DFC', x: 68, y: 74 },
    { pos: 'LD', x: 90, y: 70 },
    { pos: 'MI', x: 10, y: 46 },
    { pos: 'MC', x: 35, y: 50 },
    { pos: 'MC', x: 65, y: 50 },
    { pos: 'MD', x: 90, y: 46 },
    { pos: 'DC', x: 35, y: 22 },
    { pos: 'DC', x: 65, y: 22 },
  ],
  '1-4-3-3': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'LI', x: 10, y: 70 },
    { pos: 'DFC', x: 32, y: 74 },
    { pos: 'DFC', x: 68, y: 74 },
    { pos: 'LD', x: 90, y: 70 },
    { pos: 'MC', x: 25, y: 50 },
    { pos: 'MC', x: 50, y: 46 },
    { pos: 'MC', x: 75, y: 50 },
    { pos: 'EI', x: 15, y: 22 },
    { pos: 'DC', x: 50, y: 18 },
    { pos: 'ED', x: 85, y: 22 },
  ],
  '1-4-2-3-1': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'LI', x: 10, y: 70 },
    { pos: 'DFC', x: 32, y: 74 },
    { pos: 'DFC', x: 68, y: 74 },
    { pos: 'LD', x: 90, y: 70 },
    { pos: 'MCD', x: 35, y: 56 },
    { pos: 'MCD', x: 65, y: 56 },
    { pos: 'MI', x: 15, y: 36 },
    { pos: 'MCO', x: 50, y: 32 },
    { pos: 'MD', x: 85, y: 36 },
    { pos: 'DC', x: 50, y: 14 },
  ],
  '1-3-5-2': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'DFC', x: 25, y: 76 },
    { pos: 'DFC', x: 50, y: 80 },
    { pos: 'DFC', x: 75, y: 76 },
    { pos: 'CAI', x: 6, y: 50 },
    { pos: 'MC', x: 28, y: 50 },
    { pos: 'MC', x: 50, y: 46 },
    { pos: 'MC', x: 72, y: 50 },
    { pos: 'CAD', x: 94, y: 50 },
    { pos: 'DC', x: 35, y: 20 },
    { pos: 'DC', x: 65, y: 20 },
  ],
  '1-3-4-3': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'DFC', x: 25, y: 76 },
    { pos: 'DFC', x: 50, y: 80 },
    { pos: 'DFC', x: 75, y: 76 },
    { pos: 'MI', x: 12, y: 50 },
    { pos: 'MC', x: 38, y: 48 },
    { pos: 'MC', x: 62, y: 48 },
    { pos: 'MD', x: 88, y: 50 },
    { pos: 'EI', x: 18, y: 22 },
    { pos: 'DC', x: 50, y: 18 },
    { pos: 'ED', x: 82, y: 22 },
  ],
  '1-4-5-1': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'LI', x: 10, y: 70 },
    { pos: 'DFC', x: 32, y: 74 },
    { pos: 'DFC', x: 68, y: 74 },
    { pos: 'LD', x: 90, y: 70 },
    { pos: 'MI', x: 10, y: 46 },
    { pos: 'MC', x: 30, y: 50 },
    { pos: 'MC', x: 50, y: 46 },
    { pos: 'MC', x: 70, y: 50 },
    { pos: 'MD', x: 90, y: 46 },
    { pos: 'DC', x: 50, y: 18 },
  ],
  '1-5-3-2': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'CAI', x: 6, y: 68 },
    { pos: 'DFC', x: 28, y: 76 },
    { pos: 'DFC', x: 50, y: 80 },
    { pos: 'DFC', x: 72, y: 76 },
    { pos: 'CAD', x: 94, y: 68 },
    { pos: 'MC', x: 28, y: 48 },
    { pos: 'MC', x: 50, y: 44 },
    { pos: 'MC', x: 72, y: 48 },
    { pos: 'DC', x: 35, y: 20 },
    { pos: 'DC', x: 65, y: 20 },
  ],
  '1-5-4-1': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'CAI', x: 6, y: 68 },
    { pos: 'DFC', x: 28, y: 76 },
    { pos: 'DFC', x: 50, y: 80 },
    { pos: 'DFC', x: 72, y: 76 },
    { pos: 'CAD', x: 94, y: 68 },
    { pos: 'MI', x: 15, y: 46 },
    { pos: 'MC', x: 38, y: 48 },
    { pos: 'MC', x: 62, y: 48 },
    { pos: 'MD', x: 85, y: 46 },
    { pos: 'DC', x: 50, y: 18 },
  ],
  '1-4-1-4-1': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'LI', x: 10, y: 70 },
    { pos: 'DFC', x: 32, y: 74 },
    { pos: 'DFC', x: 68, y: 74 },
    { pos: 'LD', x: 90, y: 70 },
    { pos: 'MCD', x: 50, y: 58 },
    { pos: 'MI', x: 10, y: 40 },
    { pos: 'MC', x: 35, y: 42 },
    { pos: 'MC', x: 65, y: 42 },
    { pos: 'MD', x: 90, y: 40 },
    { pos: 'DC', x: 50, y: 18 },
  ],
  '1-3-4-1-2': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'DFC', x: 25, y: 76 },
    { pos: 'DFC', x: 50, y: 80 },
    { pos: 'DFC', x: 75, y: 76 },
    { pos: 'MI', x: 12, y: 54 },
    { pos: 'MC', x: 38, y: 52 },
    { pos: 'MC', x: 62, y: 52 },
    { pos: 'MD', x: 88, y: 54 },
    { pos: 'MCO', x: 50, y: 34 },
    { pos: 'DC', x: 35, y: 18 },
    { pos: 'DC', x: 65, y: 18 },
  ],
  '1-4-3-2-1': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'LI', x: 10, y: 70 },
    { pos: 'DFC', x: 32, y: 74 },
    { pos: 'DFC', x: 68, y: 74 },
    { pos: 'LD', x: 90, y: 70 },
    { pos: 'MC', x: 25, y: 54 },
    { pos: 'MC', x: 50, y: 50 },
    { pos: 'MC', x: 75, y: 54 },
    { pos: 'MI', x: 25, y: 34 },
    { pos: 'MD', x: 75, y: 34 },
    { pos: 'DC', x: 50, y: 16 },
  ],
  '1-4-1-2-1-2': [
    { pos: 'POR', x: 50, y: 90 },
    { pos: 'LI', x: 10, y: 70 },
    { pos: 'DFC', x: 32, y: 74 },
    { pos: 'DFC', x: 68, y: 74 },
    { pos: 'LD', x: 90, y: 70 },
    { pos: 'MCD', x: 50, y: 58 },
    { pos: 'MC', x: 30, y: 46 },
    { pos: 'MC', x: 70, y: 46 },
    { pos: 'MCO', x: 50, y: 34 },
    { pos: 'DC', x: 35, y: 18 },
    { pos: 'DC', x: 65, y: 18 },
  ],
};

// Generar HTML del campo de fútbol (compacto para una página)
const generateFieldHTML = (lineup, players, formation, showPhotos, showNames, fieldWidth = 340, titulares = [], positionTranslations = {}) => {
  const fieldHeight = fieldWidth * 1.35;
  const positions = FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['1-4-4-2'];
  
  const margin = 5;
  const fieldW = fieldWidth - margin * 2;
  const fieldH = fieldHeight - margin * 2;
  const penaltyAreaW = fieldW * 0.55;
  const penaltyAreaH = fieldH * 0.155;
  const goalAreaW = fieldW * 0.24;
  const goalAreaH = fieldH * 0.055;
  const centerCircleR = fieldW * 0.12;
  const penaltySpotDist = fieldH * 0.095;
  const goalW = fieldW * 0.14;
  const goalH = fieldH * 0.02;
  
  // Helper to translate position
  const translatePosition = (posCode) => positionTranslations[posCode] || posCode;
  
  let playersHTML = '';
  positions.forEach((pos, index) => {
    const assignedPlayer = lineup?.find(l => l.index === index);
    let player = null;
    
    if (assignedPlayer?.player) {
      player = players.find(p => p._id === assignedPlayer.player || p._id === assignedPlayer.player._id);
    } else if (titulares && titulares[index]) {
      const titularId = titulares[index];
      player = players.find(p => p._id === titularId || p._id === titularId._id);
    }
    
    const x = (assignedPlayer?.x ?? pos.x) / 100 * fieldWidth;
    const y = (assignedPlayer?.y ?? pos.y) / 100 * fieldHeight;
    const color = getPositionColor(pos.pos);
    const translatedPos = translatePosition(pos.pos);
    
    playersHTML += `
      <div style="position: absolute; left: ${x - 18}px; top: ${y - 18}px; width: 36px; display: flex; flex-direction: column; align-items: center;">
        ${showPhotos && player?.foto ? `
          <img src="${player.foto}" style="width: 34px; height: 34px; border-radius: 17px; border: 2px solid white; object-fit: cover; box-shadow: 0 1px 4px rgba(0,0,0,0.35);" />
        ` : `
          <div style="width: 32px; height: 32px; border-radius: 16px; background: ${color}; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.35);">${player?.dorsal || translatedPos}</div>
        `}
${showNames && player ? `
          <div style="background: rgba(0,0,0,0.85); color: white; padding: 2px 5px; border-radius: 3px; font-size: 8px; font-weight: 600; margin-top: 2px; white-space: nowrap; max-width: 60px; overflow: hidden; text-overflow: ellipsis;">${getPlayerFirstName(player)}</div>
        ` : ''}
      </div>
    `;
  });
  
  const stripes = 12;
  const stripeH = fieldHeight / stripes;
  let stripesHTML = '';
  for (let i = 0; i < stripes; i++) {
    stripesHTML += `<rect x="0" y="${i * stripeH}" width="${fieldWidth}" height="${stripeH}" fill="${i % 2 === 0 ? '#1d8f3e' : '#178a35'}"/>`;
  }
  
  return `
    <div style="position: relative; width: ${fieldWidth}px; height: ${fieldHeight}px; border-radius: 8px; overflow: hidden; margin: 0 auto; box-shadow: 0 3px 12px rgba(0,0,0,0.2);">
      <svg width="${fieldWidth}" height="${fieldHeight}" style="position: absolute; top: 0; left: 0;">
        ${stripesHTML}
        <rect x="${margin}" y="${margin}" width="${fieldW}" height="${fieldH}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <line x1="${margin}" y1="${fieldHeight / 2}" x2="${fieldWidth - margin}" y2="${fieldHeight / 2}" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <circle cx="${fieldWidth / 2}" cy="${fieldHeight / 2}" r="${centerCircleR}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <circle cx="${fieldWidth / 2}" cy="${fieldHeight / 2}" r="3" fill="rgba(255,255,255,0.9)"/>
        <rect x="${(fieldWidth - penaltyAreaW) / 2}" y="${margin}" width="${penaltyAreaW}" height="${penaltyAreaH}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <rect x="${(fieldWidth - goalAreaW) / 2}" y="${margin}" width="${goalAreaW}" height="${goalAreaH}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <circle cx="${fieldWidth / 2}" cy="${margin + penaltySpotDist}" r="2" fill="rgba(255,255,255,0.9)"/>
        <rect x="${(fieldWidth - goalW) / 2}" y="${margin - goalH}" width="${goalW}" height="${goalH}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <rect x="${(fieldWidth - penaltyAreaW) / 2}" y="${fieldHeight - margin - penaltyAreaH}" width="${penaltyAreaW}" height="${penaltyAreaH}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <rect x="${(fieldWidth - goalAreaW) / 2}" y="${fieldHeight - margin - goalAreaH}" width="${goalAreaW}" height="${goalAreaH}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <circle cx="${fieldWidth / 2}" cy="${fieldHeight - margin - penaltySpotDist}" r="2" fill="rgba(255,255,255,0.9)"/>
        <rect x="${(fieldWidth - goalW) / 2}" y="${fieldHeight - margin}" width="${goalW}" height="${goalH}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
      </svg>
      ${playersHTML}
    </div>
  `;
};

// Generar suplentes compacto
const generateSuplentesBanquilloCompact = (playerIds, players, showPhotos, showNames, substitutesLabel = 'Suplentes') => {
  if (!playerIds || playerIds.length === 0) return '';
  
  const playerItems = playerIds.map(id => {
    const player = players.find(p => p._id === id || p._id === id._id);
    if (!player) return '';
    const color = getPositionColor(player.posicion);
    return `
      <div style="display: flex; flex-direction: column; align-items: center; width: 70px; margin: 4px;">
        ${showPhotos && player.foto ? `
          <img src="${player.foto}" style="width: 36px; height: 36px; border-radius: 18px; border: 2px solid ${color}; object-fit: cover;" />
        ` : `
          <div style="width: 32px; height: 32px; border-radius: 16px; background: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">${player.dorsal || '?'}</div>
        `}
        ${showNames ? `<div style="font-size: 9px; font-weight: 600; margin-top: 4px; text-align: center; color: #1e293b;">${getPlayerFullName(player)}</div>` : ''}
        <div style="font-size: 8px; color: #64748b; margin-top: 1px;">#${player.dorsal || '?'}</div>
      </div>
    `;
  }).join('');
  
  return `
    <div style="margin-top: 12px; padding: 10px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 8px;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
        <div style="width: 4px; height: 14px; background: #9333ea; border-radius: 2px;"></div>
        <span style="font-size: 11px; font-weight: 700; color: #1e293b;">${substitutesLabel} (${playerIds.length})</span>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">${playerItems}</div>
    </div>
  `;
};

/**
 * Genera PDF de Alineación - UNA SOLA PÁGINA
 */
export const generateLineupPDF = async ({
  matchSheet,
  team,
  players,
  lineup,
  formation,
  showPhotos = true,
  showNames = true,
  translations = {},
}) => {
  const lang = translations.lang || 'es';
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  
  const formatDate = (date) => {
    if (!date) return translations.noDate || 'Sin fecha';
    return new Date(date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };
  
  const titulares = matchSheet.alineacionTitulares || [];
  const suplentes = matchSheet.alineacionSuplentes || [];
  
  // Labels
  const teamLabel = translations.team || 'Equipo';
  const substitutesLabel = translations.substitutes || 'Suplentes';
  const lineupHeader = translations.lineupHeader || 'ALINEACIÓN';
  
  // Position translations
  const positionTranslations = translations.positions || {};
  
  const fieldHTML = generateFieldHTML(lineup, players, formation, showPhotos, showNames, 360, titulares, positionTranslations);

  // Suplentes diseño claro
  const suplentesHTMLLight = (() => {
    if (!suplentes || suplentes.length === 0) return '';
    const items = suplentes.map(id => {
      const player = players.find(p => p._id === id || p._id === id._id);
      if (!player) return '';
      const color = getPositionColor(player.posicion);
      return `
        <div style="display: flex; flex-direction: column; align-items: center; width: 68px; margin: 4px;">
          ${showPhotos && player.foto ? `
            <img src="${player.foto}" style="width: 38px; height: 38px; border-radius: 19px; border: 2px solid ${color}; object-fit: cover;" />
          ` : `
            <div style="width: 36px; height: 36px; border-radius: 18px; background: ${color}18; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; color: ${color}; font-weight: 900; font-size: 13px;">${player.dorsal || '?'}</div>
          `}
          ${showNames ? `<div style="font-size: 9px; font-weight: 600; margin-top: 4px; text-align: center; color: #374151;">${getPlayerFullName(player)}</div>` : ''}
          <div style="font-size: 8px; color: ${color}; margin-top: 1px; font-weight: 700;">#${player.dorsal || '?'}</div>
        </div>
      `;
    }).join('');
    return `
      <div style="margin-top: 14px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
          <div style="width: 3px; height: 16px; background: #a855f7; border-radius: 2px;"></div>
          <span style="font-size: 10px; font-weight: 900; color: #374151; letter-spacing: 2px;">${substitutesLabel.toUpperCase()} (${suplentes.length})</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">${items}</div>
      </div>
    `;
  })();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${lineupHeader} - ${matchSheet.rival}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; }
        .page { padding: 12mm 14mm; background: #fff; }
        .no-break { page-break-inside: avoid; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="no-break" style="text-align: center; padding-bottom: 14px; border-bottom: 2px solid #e2e8f0; margin-bottom: 14px;">
          ${team?.escudo ? `<img src="${team.escudo}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 8px; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto;" />` : ''}
          <div style="font-size: 20px; font-weight: 900; color: #111827; letter-spacing: 2px;">${lineupHeader}</div>
          <div style="font-size: 13px; font-weight: 600; color: #6b7280; margin: 2px 0;">VS</div>
          <div style="font-size: 18px; font-weight: 800; color: #111827; margin-bottom: 8px;">${matchSheet.rival}</div>
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 10px;">${formatDate(matchSheet.fechaHora)}${formatTime(matchSheet.fechaHora) ? ' · ' + formatTime(matchSheet.fechaHora) : ''}</div>
          <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
            ${formation ? `<span style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #374151; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 700;">⚽ ${formation}</span>` : ''}
            ${(() => {
              const roundLabels = translations.roundLabels || {};
              const legFirstLabel = translations.legFirst || 'Ida';
              const legSecondLabel = translations.legSecond || 'Vuelta';
              const groupLabel = translations.group || 'Grupo';
              const matchDayLbl = translations.matchdayFileLabel || 'J';
              const chipStyle = 'background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 4px 12px; border-radius: 20px; font-size: 10px;';
              if (matchSheet.fase === 'eliminatoria' && matchSheet.ronda) {
                const roundLabel = roundLabels[matchSheet.ronda] || matchSheet.ronda;
                const legSuffix = matchSheet.pierna && matchSheet.pierna !== 'unico' ? ` (${matchSheet.pierna === 'ida' ? legFirstLabel : legSecondLabel})` : '';
                return `<span style="${chipStyle}">${roundLabel}${legSuffix}</span>`;
              } else if (matchSheet.fase === 'grupos') {
                const groupPart = matchSheet.grupo ? `${groupLabel} ${matchSheet.grupo}` : '';
                const jornadaPart = matchSheet.jornada ? `${matchDayLbl} ${matchSheet.jornada}` : '';
                const combined = [groupPart, jornadaPart].filter(Boolean).join(' - ');
                return combined ? `<span style="${chipStyle}">${combined}</span>` : '';
              } else {
                return matchSheet.jornada ? `<span style="${chipStyle}">J${matchSheet.jornada}</span>` : '';
              }
            })()}
            ${matchSheet.torneoId && typeof matchSheet.torneoId === 'object' && matchSheet.torneoId.nombre ? `<span style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 4px 12px; border-radius: 20px; font-size: 10px;">🏆 ${matchSheet.torneoId.nombre}</span>` : ''}
            ${matchSheet.ubicacion ? `<span style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 4px 12px; border-radius: 20px; font-size: 10px;">📍 ${matchSheet.ubicacion}</span>` : ''}
          </div>
        </div>

        <div class="no-break" style="display: flex; justify-content: center; margin-bottom: 0;">
          ${fieldHTML}
        </div>
        ${suplentesHTMLLight}

        <div style="text-align: center; color: #9ca3af; font-size: 9px; margin-top: 14px; letter-spacing: 1px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          ${translations.generatedWith || 'Generado con Xtramys'} · ${new Date().toLocaleDateString(locale)}
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    const { uri } = await Print.printToFileAsync({ html });
    const pdfPrefix = translations.lineupFileName || 'lineup';
    const teamName = (team?.nombre || 'equipo').replace(/\s/g, '_');
    const jornadaFileLabel = translations.matchdayFileLabel || 'jornada';
    const jornadaStr = matchSheet.jornada ? `_${jornadaFileLabel}_${matchSheet.jornada}` : '';
    const pdfName = `${pdfPrefix}_${teamName}${jornadaStr}.pdf`;
    await savePdfToDownloads(uri, pdfName);
    return pdfName;
  } catch (error) {
    console.error('Error generating lineup PDF:', error);
    throw error;
  }
};

/**
 * Genera PDF de Convocatoria - DISEÑO PROFESIONAL
 */
export const generateCallUpPDF = async ({
  matchSheet,
  team,
  players,
  convocados,
  noConvocados,
  horaQuedada,
  lugarQuedada,
  observaciones,
  fechaQuedada,
  showPhotos = true,
  translations = {},
}) => {
  const lang = translations.lang || 'es';
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  
  const formatDate = (date) => {
    if (!date) return translations.noDate || 'Sin fecha';
    return new Date(date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  // Función para determinar el grupo de posición
  const getPositionGroup = (pos) => {
    const p = (pos || '').toUpperCase();
    if (p === 'POR' || p.includes('PORTERO')) return { order: 0, label: lang === 'en' ? 'GOALKEEPERS' : 'PORTEROS' };
    if (['DFC', 'LI', 'LD', 'CAI', 'CAD'].some(x => p.includes(x)) || p.includes('DEFENSA') || p.includes('CENTRAL') || p.includes('LATERAL')) return { order: 1, label: lang === 'en' ? 'DEFENDERS' : 'DEFENSAS' };
    if (['MC', 'MCO', 'MCD', 'MI', 'MD'].some(x => p.includes(x)) || p.includes('MEDIO') || p.includes('CENTROCAMPISTA')) return { order: 2, label: lang === 'en' ? 'MIDFIELDERS' : 'CENTROCAMPISTAS' };
    if (['DC', 'EI', 'ED', 'SD'].some(x => p.includes(x)) || p.includes('DELANTERO') || p.includes('EXTREMO')) return { order: 3, label: lang === 'en' ? 'FORWARDS' : 'DELANTEROS' };
    return { order: 4, label: lang === 'en' ? 'OTHERS' : 'OTROS' };
  };

  // Agrupar convocados por posición
  const positionGroups = {};
  convocados.forEach(id => {
    const player = players.find(p => p._id === id || p._id === id._id);
    if (!player) return;
    const group = getPositionGroup(player.posicion);
    if (!positionGroups[group.order]) positionGroups[group.order] = { label: group.label, players: [] };
    positionGroups[group.order].players.push(player);
  });

  // Tarjeta de jugador para convocatoria clara
  const playerCardHTML = (player) => {
    const color = getPositionColor(player.posicion);
    return `
      <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px;">
        <div style="min-width: 28px; width: 28px; height: 28px; border-radius: 50%; background: ${color}18; border: 1.5px solid ${color}; display: flex; align-items: center; justify-content: center; color: ${color}; font-weight: 900; font-size: 12px; flex-shrink: 0;">${player.dorsal || '?'}</div>
        ${showPhotos && player.foto ? `<img src="${player.foto}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 1.5px solid #e2e8f0; flex-shrink: 0;" />` : ''}
        <div style="flex: 1; min-width: 0;">
          <div style="color: #111827; font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${getPlayerFullName(player)}</div>
          <div style="color: ${color}; font-size: 9px;">${player.posicion || ''}</div>
        </div>
      </div>
    `;
  };

  // HTML de grupos de convocados
  const groupsHTML = Object.keys(positionGroups)
    .sort((a, b) => Number(a) - Number(b))
    .map(key => {
      const group = positionGroups[key];
      let rowsHTML = '';
      for (let i = 0; i < group.players.length; i += 2) {
        const p1 = group.players[i];
        const p2 = group.players[i + 1];
        rowsHTML += `
          <div style="display: flex; gap: 8px; margin-bottom: 6px;">
            ${playerCardHTML(p1)}
            ${p2 ? playerCardHTML(p2) : '<div style="flex: 1;"></div>'}
          </div>
        `;
      }
      return `
        <div style="margin-bottom: 14px; page-break-inside: avoid;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
            <span style="color: #374151; font-size: 9px; letter-spacing: 2px; font-weight: 900;">${group.label}</span>
            <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
          </div>
          ${rowsHTML}
        </div>
      `;
    }).join('');

  // Labels for PDF
  const callupHeader = translations.callupHeader || 'CONVOCATORIA';
  const teamLabel = translations.team || 'Equipo';
  const calledLabel = translations.called || 'Convocados';
  const observationsLabel = translations.observations || 'Observaciones';
  const notCalledLabel = translations.notCalled || 'No Convocados';

  // No convocados diseño claro
  const noConvocadosHTML = noConvocados && noConvocados.length > 0 ? `
    <div style="margin-top: 10px; padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; page-break-inside: avoid;">
      <div style="font-size: 9px; letter-spacing: 2px; color: #991b1b; font-weight: 700; margin-bottom: 8px;">${notCalledLabel.toUpperCase()} (${noConvocados.length})</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${noConvocados.map(id => {
          const p = players.find(pl => pl._id === id || pl._id === id._id);
          if (!p) return '';
          return `<span style="background: #fff; border: 1px solid #fecaca; color: #991b1b; padding: 3px 10px; border-radius: 4px; font-size: 10px;">${p.dorsal ? '#' + p.dorsal + ' ' : ''}${getPlayerFullName(p)}</span>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // Observaciones diseño claro
  const observacionesHTML = observaciones ? `
    <div style="margin: 12px 0; background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 10px 14px; page-break-inside: avoid;">
      <div style="font-size: 9px; letter-spacing: 2px; color: #854d0e; font-weight: 700; margin-bottom: 6px;">📝 ${observationsLabel.toUpperCase()}</div>
      <div style="font-size: 11px; color: #713f12; line-height: 1.5; white-space: pre-wrap;">${observaciones}</div>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${callupHeader} - ${matchSheet.rival}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; }
        .page { padding: 12mm 14mm; background: #fff; }
      </style>
    </head>
    <body>
      <div class="page">
        <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px;">
          ${team?.escudo ? `<img src="${team.escudo}" style="width: 90px; height: 90px; object-fit: contain; border-radius: 8px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;" />` : ''}
          <div style="font-size: 20px; font-weight: 900; color: #111827; letter-spacing: 2px; margin-bottom: 2px;">${callupHeader}</div>
          <div style="font-size: 13px; font-weight: 600; color: #6b7280; margin: 2px 0;">VS</div>
          <div style="font-size: 18px; font-weight: 800; color: #111827; margin-bottom: 12px;">${matchSheet.rival}</div>
          <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
            <span style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #374151; padding: 5px 14px; border-radius: 20px; font-size: 10px;">📅 ${formatDate(matchSheet.fechaHora)}</span>
            ${formatTime(matchSheet.fechaHora) ? `<span style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #374151; padding: 5px 14px; border-radius: 20px; font-size: 10px;">⏰ ${formatTime(matchSheet.fechaHora)}</span>` : ''}
            ${matchSheet.ubicacion ? `<span style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #374151; padding: 5px 14px; border-radius: 20px; font-size: 10px;">🏟️ ${matchSheet.ubicacion}</span>` : ''}
            ${lugarQuedada ? `<span style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #374151; padding: 5px 14px; border-radius: 20px; font-size: 10px;">📍 ${lugarQuedada}</span>` : ''}
            ${horaQuedada ? `<span style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #374151; padding: 5px 14px; border-radius: 20px; font-size: 10px;">🕐 ${horaQuedada}</span>` : ''}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
          <span style="color: #374151; font-size: 11px; letter-spacing: 3px; font-weight: 900;">${calledLabel.toUpperCase()} — ${convocados.length}</span>
          <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
        </div>

        ${groupsHTML}

        ${observacionesHTML}

        ${noConvocadosHTML}

        <div style="text-align: center; color: #9ca3af; font-size: 9px; margin-top: 14px; letter-spacing: 1px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          ${translations.generatedWith || 'Generado con Xtramys'} · ${new Date().toLocaleDateString(locale)}
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    const { uri } = await Print.printToFileAsync({ html });
    const pdfPrefix = translations.callupFileName || 'callup';
    const teamName = (team?.nombre || 'equipo').replace(/\s/g, '_');
    const jornadaFileLabel = translations.matchdayFileLabel || 'jornada';
    const jornadaStr = matchSheet.jornada ? `_${jornadaFileLabel}_${matchSheet.jornada}` : '';
    const pdfName = `${pdfPrefix}_${teamName}${jornadaStr}.pdf`;
    await savePdfToDownloads(uri, pdfName);
    return pdfName;
  } catch (error) {
    console.error('Error generating call-up PDF:', error);
    throw error;
  }
};

/**
 * Genera PDF de Ficha de Partido Completa - DISEÑO PROFESIONAL
 */
export const generateMatchSheetPDF = async ({
  matchSheet,
  team,
  players,
  lineup,
  locale = 'es',
  translations = {},
  positionTranslations = {},
  showPhotos = true,
  showNames = true,
}) => {
  const formation = matchSheet.alineacion || '1-4-4-2';
  const titulares = matchSheet.alineacionTitulares || [];
  const suplentes = matchSheet.alineacionSuplentes || [];
  const convocados = matchSheet.convocados || [];
  const goles = matchSheet.goles || [];
  const tarjetasAmarillas = matchSheet.tarjetasAmarillas || [];
  const tarjetasRojas = matchSheet.tarjetasRojas || [];
  const cambios = matchSheet.cambios || [];
  const golesRival = matchSheet.golesRival || [];
  
  // Helper para parsear minuto string ("45+2" → 47)
  const parseMinutoPDF = (minuto) => {
    if (typeof minuto === 'number') return minuto;
    if (typeof minuto === 'string') {
      if (minuto.includes('+')) {
        const parts = minuto.split('+');
        return (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0);
      }
      return parseInt(minuto) || 0;
    }
    return 0;
  };
  
  // Ordenar cambios por minuto
  const cambiosSorted = [...cambios].sort((a, b) => parseMinutoPDF(a.minuto) - parseMinutoPDF(b.minuto));
  
  // Labels con traducciones
  const teamLabel = translations.team || 'Equipo';
  const matchSheetLabel = translations.matchSheetTitle || 'Ficha de Partido';
  const matchDayLabel = translations.matchDay || 'Jornada';
  const locationLabel = translations.location || 'Ubicación';
  const lineupLabel = translations.lineup || 'Alineación';
  const substitutesLabel = translations.substitutes || 'Suplentes';
  const goalsLabel = translations.goals || 'Goles';
  const yellowCardsLabel = translations.yellowCards || 'Tarjetas Amarillas';
  const redCardsLabel = translations.redCards || 'Tarjetas Rojas';
  const substitutionsLabel = translations.substitutions || 'Cambios';
  const coachNotesLabel = translations.coachNotes || 'Notas del Entrenador';
  const calledLabel = translations.called || 'Convocados';
  const resultLabel = translations.result || 'Resultado';
  const rivalFormationLabel = translations.rivalFormation || 'Formación Rival';
  const localLabel = translations.local || 'Local';
  const visitorLabel = translations.visitor || 'Visitante';
  const neutralLabel = translations.neutral || 'Neutral';
  const assistLabel = translations.assist || 'Asist';
  const rivalGoalsLabel = translations.rivalGoals || 'Goles del Rival';
  
  // Traducciones de resultado desde BD
  const victoriaLabel = translations.victoria || 'Victoria';
  const empateLabel = translations.empate || 'Empate';
  const derrotaLabel = translations.derrota || 'Derrota';
  
  // Traducciones de ubicación desde BD
  const casaLabel = translations.casa || 'Casa';
  const fueraLabel = translations.fuera || 'Fuera';
  
  // Obtener escudos
  const teamEscudo = matchSheet.miEscudo || team?.escudo;
  const rivalEscudo = matchSheet.rivalEscudo;
  
  // Helper para formatear fecha
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', options);
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString(locale === 'en' ? 'en-US' : 'es-ES', { hour: '2-digit', minute: '2-digit' });
  };
  
  // Obtener nombre de jugador
  const getPlayerNameById = (playerId) => {
    const player = players.find(p => p._id === playerId || p._id === playerId?._id);
    return player ? getPlayerFullName(player) : '?';
  };
  
  // Generar campo de fútbol
  const fieldHTML = generateFieldHTML(lineup, players, formation, showPhotos, showNames, 280, titulares, positionTranslations);
  
  // Generar HTML de suplentes
  const suplentesHTML = generateSuplentesBanquilloCompact(suplentes, players, showPhotos, showNames, substitutesLabel);
  
  // Determinar resultado visual
  // Si el partido es a futuro, mostrar "-" en vez de "0"
  const isFutureMatch = matchSheet.fechaHora ? new Date(matchSheet.fechaHora) > new Date() : false;
  const golesFavor = isFutureMatch ? '-' : (matchSheet.golesFavor ?? '-');
  const golesContra = isFutureMatch ? '-' : (matchSheet.golesContra ?? '-');
  const resultadoRaw = matchSheet.resultado;
  
  // Traducir resultado desde BD
  const translateResultado = (res) => {
    if (res === 'Victoria') return victoriaLabel;
    if (res === 'Empate') return empateLabel;
    if (res === 'Derrota') return derrotaLabel;
    return res || '';
  };
  const resultado = translateResultado(resultadoRaw);
  const resultColor = resultadoRaw === 'Victoria' ? '#22c55e' : resultadoRaw === 'Derrota' ? '#ef4444' : '#f59e0b';
  
  // Ubicación traducida (tanto valores nuevos como legacy)
  const getUbicacionLabel = (ubi) => {
    if (ubi === 'local') return localLabel;
    if (ubi === 'visitante') return visitorLabel;
    if (ubi === 'neutral') return neutralLabel;
    // Legacy values
    if (ubi === 'Casa') return casaLabel;
    if (ubi === 'Fuera') return fueraLabel;
    if (ubi === 'Neutral') return neutralLabel;
    return ubi || '';
  };
  
  // Determinar orden de escudos según ubicación
  const isAway = matchSheet.ubicacion === 'visitante' || matchSheet.ubicacion === 'Fuera';
  const leftEscudo = isAway ? rivalEscudo : teamEscudo;
  const rightEscudo = isAway ? teamEscudo : rivalEscudo;
  const leftName = isAway ? matchSheet.rival : (team?.nombre || teamLabel);
  const rightName = isAway ? (team?.nombre || teamLabel) : matchSheet.rival;
  const leftGoals = isAway ? golesContra : golesFavor;
  const rightGoals = isAway ? golesFavor : golesContra;
  
  // HTML de goles
  const golesSorted = [...goles].sort((a, b) => parseMinutoPDF(a.minuto) - parseMinutoPDF(b.minuto));
  const golesHTML = golesSorted.length > 0 ? golesSorted.map(g => `
    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
      <span style="font-size: 16px;">⚽</span>
      <span style="font-weight: 600; color: #1e293b;">${getPlayerNameById(g.jugador)}</span>
      ${g.minuto ? `<span style="color: #64748b; font-size: 12px;">${g.minuto}'</span>` : ''}
      ${g.tipo ? `<span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #475569;">${g.tipo}</span>` : ''}
      ${g.asistente ? `<span style="color: #64748b; font-size: 11px;">(${assistLabel}: ${getPlayerNameById(g.asistente)})</span>` : ''}
    </div>
  `).join('') : `<div style="color: #94a3b8; font-size: 12px; padding: 10px 0; text-align: center;">-</div>`;
  
  // HTML de tarjetas amarillas
  const amarillasSorted = [...tarjetasAmarillas].sort((a, b) => parseMinutoPDF(a.minuto) - parseMinutoPDF(b.minuto));
  const amarillasHTML = amarillasSorted.length > 0 ? amarillasSorted.map(t => `
    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
      <span style="width: 14px; height: 18px; background: #fbbf24; border-radius: 2px; display: inline-block;"></span>
      <span style="font-weight: 600; color: #1e293b;">${getPlayerNameById(t.jugador)}</span>
      ${t.minuto ? `<span style="color: #64748b; font-size: 12px;">${t.minuto}'</span>` : ''}
      ${t.motivo ? `<span style="color: #64748b; font-size: 11px;">(${t.motivo})</span>` : ''}
    </div>
  `).join('') : `<div style="color: #94a3b8; font-size: 12px; padding: 10px 0; text-align: center;">-</div>`;
  
  // HTML de tarjetas rojas
  const rojasSorted = [...tarjetasRojas].sort((a, b) => parseMinutoPDF(a.minuto) - parseMinutoPDF(b.minuto));
  const rojasHTML = rojasSorted.length > 0 ? rojasSorted.map(t => `
    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
      <span style="width: 14px; height: 18px; background: #ef4444; border-radius: 2px; display: inline-block;"></span>
      <span style="font-weight: 600; color: #1e293b;">${getPlayerNameById(t.jugador)}</span>
      ${t.minuto ? `<span style="color: #64748b; font-size: 12px;">${t.minuto}'</span>` : ''}
      ${t.motivo ? `<span style="color: #64748b; font-size: 11px;">(${t.motivo})</span>` : ''}
    </div>
  `).join('') : `<div style="color: #94a3b8; font-size: 12px; padding: 10px 0; text-align: center;">-</div>`;
  
  // HTML de cambios (ordenados por minuto)
  const cambiosHTML = cambiosSorted.length > 0 ? cambiosSorted.map(c => `
    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
      <span style="font-size: 14px;">🔄</span>
      <span style="color: #ef4444;">↓ ${getPlayerNameById(c.sale)}</span>
      <span style="color: #22c55e;">↑ ${getPlayerNameById(c.entra)}</span>
      ${c.minuto ? `<span style="color: #64748b; font-size: 12px;">${c.minuto}'</span>` : ''}
    </div>
  `).join('') : `<div style="color: #94a3b8; font-size: 12px; padding: 10px 0; text-align: center;">-</div>`;
  
  // HTML de goles del rival
  const golesRivalHTML = golesRival.length > 0 ? [...golesRival].sort((a, b) => parseMinutoPDF(a.minuto) - parseMinutoPDF(b.minuto)).map(g => `
    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
      <span style="font-size: 16px;">⚽</span>
      <span style="font-weight: 600; color: #ef4444;">${matchSheet.rival || '?'}</span>
      ${g.minuto ? `<span style="color: #64748b; font-size: 12px;">${g.minuto}'</span>` : ''}
    </div>
  `).join('') : `<div style="color: #94a3b8; font-size: 12px; padding: 10px 0; text-align: center;">-</div>`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page { size: A4; margin: 10mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #1e293b; background: #f8fafc; }
        .header { background: linear-gradient(135deg, #1a237e 0%, #3949ab 100%); color: white; padding: 16px 20px; border-radius: 12px; margin-bottom: 12px; page-break-inside: avoid; }
        .header-title { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 4px; }
        .header-subtitle { font-size: 11px; opacity: 0.9; text-align: center; }
        .match-info { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); page-break-inside: avoid; }
        .escudos-row { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 12px; }
        .escudo-container { text-align: center; }
        .escudo-img { width: 48px; height: 48px; object-fit: contain; border-radius: 8px; background: #f1f5f9; }
        .escudo-placeholder { width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #1a237e, #3949ab); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
        .team-name { font-size: 11px; font-weight: 600; color: #1e293b; margin-top: 4px; max-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .score-container { display: flex; align-items: center; gap: 8px; }
        .score { font-size: 28px; font-weight: 800; color: #1e293b; min-width: 35px; text-align: center; }
        .score-divider { font-size: 24px; color: #94a3b8; }
        .result-badge { padding: 4px 12px; border-radius: 16px; font-size: 10px; font-weight: 700; color: white; text-transform: uppercase; }
        .meta-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 10px; }
        .meta-badge { background: #f1f5f9; padding: 4px 10px; border-radius: 12px; font-size: 10px; color: #475569; }
        .section { background: white; border-radius: 12px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); page-break-inside: avoid; }
        .section-title { font-size: 13px; font-weight: 700; color: #1a237e; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 6px; }
        .two-columns { display: flex; gap: 12px; }
        .column { flex: 1; }
        .field-container { display: flex; justify-content: center; margin: 8px 0; }
        .events-section { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; page-break-inside: avoid; margin-top: 12px; }
        .event-card { background: #f8fafc; border-radius: 8px; padding: 10px; border: 1px solid #e2e8f0; page-break-inside: avoid; }
        .event-title { font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
        .notes-box { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 10px; font-size: 11px; color: #92400e; white-space: pre-wrap; }
        .footer { text-align: center; color: #94a3b8; font-size: 9px; margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; page-break-inside: avoid; }
        /* Evitar cortes de elementos entre páginas */
        .no-break { page-break-inside: avoid; }
        .page-break-before { page-break-before: always; padding-top: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-title">${matchSheetLabel}</div>
        <div class="header-subtitle">${formatDate(matchSheet.fechaHora)} ${formatTime(matchSheet.fechaHora) ? '• ' + formatTime(matchSheet.fechaHora) : ''}</div>
      </div>
      
      <div class="match-info">
        <div class="escudos-row">
          <div class="escudo-container">
            ${leftEscudo ? `<img src="${leftEscudo}" class="escudo-img" />` : `<div class="escudo-placeholder">${leftName?.charAt(0) || '?'}</div>`}
            <div class="team-name">${leftName}</div>
          </div>
          <div class="score-container">
            <span class="score">${leftGoals}</span>
            <span class="score-divider">-</span>
            <span class="score">${rightGoals}</span>
          </div>
          <div class="escudo-container">
            ${rightEscudo ? `<img src="${rightEscudo}" class="escudo-img" />` : `<div class="escudo-placeholder">${rightName?.charAt(0) || '?'}</div>`}
            <div class="team-name">${rightName}</div>
          </div>
        </div>
        ${resultado ? `<div style="text-align: center;"><span class="result-badge" style="background: ${resultColor};">${resultado}</span></div>` : ''}
        <div class="meta-row">
          ${(() => {
            const roundLabels = translations.roundLabels || {};
            const legFirstLabel = translations.legFirst || 'Ida';
            const legSecondLabel = translations.legSecond || 'Vuelta';
            const groupLabel = translations.group || 'Grupo';
            if (matchSheet.fase === 'eliminatoria' && matchSheet.ronda) {
              const roundLabel = roundLabels[matchSheet.ronda] || matchSheet.ronda;
              const legSuffix = matchSheet.pierna && matchSheet.pierna !== 'unico' ? ` (${matchSheet.pierna === 'ida' ? legFirstLabel : legSecondLabel})` : '';
              return `<span class="meta-badge"><strong>${roundLabel}${legSuffix}</strong></span>`;
            } else if (matchSheet.fase === 'grupos') {
              const groupPart = matchSheet.grupo ? `${groupLabel} ${matchSheet.grupo}` : '';
              const jornadaPart = matchSheet.jornada ? `${matchDayLabel} ${matchSheet.jornada}` : '';
              const combined = [groupPart, jornadaPart].filter(Boolean).join(' - ');
              return combined ? `<span class="meta-badge"><strong>${combined}</strong></span>` : '';
            } else {
              return matchSheet.jornada ? `<span class="meta-badge"><strong>${matchDayLabel} ${matchSheet.jornada}</strong></span>` : '';
            }
          })()}
          ${matchSheet.torneoId && typeof matchSheet.torneoId === 'object' && matchSheet.torneoId.nombre ? `<span class="meta-badge">🏆 ${matchSheet.torneoId.nombre}</span>` : ''}
          ${matchSheet.ubicacion ? `<span class="meta-badge">📍 ${getUbicacionLabel(matchSheet.ubicacion)}</span>` : ''}
          ${formation ? `<span class="meta-badge">⚽ ${formation}</span>` : ''}
          ${matchSheet.alineacionRival ? `<span class="meta-badge">🆚 ${matchSheet.alineacionRival}</span>` : ''}
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">📋 ${lineupLabel} (${formation})</div>
        <div class="field-container">
          ${fieldHTML}
        </div>
        ${suplentesHTML}
      </div>
      
      <!-- Page break for match events -->
      <div class="page-break-before">
        <div class="events-section">
          <div class="event-card">
            <div class="event-title">⚽ ${goalsLabel}</div>
            ${golesHTML}
          </div>
          <div class="event-card">
            <div class="event-title">⚽ ${rivalGoalsLabel}</div>
            ${golesRivalHTML}
          </div>
          <div class="event-card">
            <div class="event-title">🟨 ${yellowCardsLabel}</div>
            ${amarillasHTML}
          </div>
          <div class="event-card">
            <div class="event-title">🟥 ${redCardsLabel}</div>
            ${rojasHTML}
          </div>
          <div class="event-card">
            <div class="event-title">🔄 ${substitutionsLabel}</div>
            ${cambiosHTML}
          </div>
        </div>
      </div>
      
      ${matchSheet.notasEntrenador ? `
        <div class="section">
          <div class="section-title">📝 ${coachNotesLabel}</div>
          <div class="notes-box">${matchSheet.notasEntrenador}</div>
        </div>
      ` : ''}
      
      <div class="footer">
        ${translations.generatedWith || 'Generado con Xtramys'} • ${new Date().toLocaleDateString(locale)}
      </div>
    </body>
    </html>
  `;
  
  try {
    const { uri } = await Print.printToFileAsync({ html });
    const pdfPrefix = translations.matchSheetFileName || 'ficha_partido';
    const teamName = (team?.nombre || 'equipo').replace(/\s/g, '_');
    const jornadaFileLabel = translations.matchdayFileLabel || 'jornada';
    const jornadaStr = matchSheet.jornada ? `_${jornadaFileLabel}_${matchSheet.jornada}` : '';
    const pdfName = `${pdfPrefix}_${teamName}${jornadaStr}.pdf`;
    await savePdfToDownloads(uri, pdfName);
    return pdfName;
  } catch (error) {
    console.error('Error generating match sheet PDF:', error);
    throw error;
  }
};
