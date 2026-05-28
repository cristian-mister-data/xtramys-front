// components/pages/matchSheet/MatchSheetPDF.js
// Utilidades compartidas para generar PDFs de alineación y convocatoria
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { savePdfToDownloads } from '@/utils/pdfDownload';
import { getPlayerFullName, getPlayerFirstName } from '@/utils/playerHelpers';
import api from '@/api/client';

// Helper to pre-resolve images to base64 to avoid Cloudflare R2 CORS/tainted canvas issues
const toDataUrl = async (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:')) return url;
  try {
    const res = await api.get('/media/image-download', {
      params: { url },
      responseType: 'blob',
      timeout: 15000
    });
    const blob = res.data;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Proxy fetch failed for URL, trying direct fetch:', url, err.message);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed: ' + res.status);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch (e2) {
      console.warn('Direct fetch failed for URL, fallback to original:', url, e2.message);
      return url;
    }
  }
};

// Colores por posición (Escala de grises)
const getPositionColor = (pos) => {
  const position = pos?.toUpperCase() || '';
  if (position === 'POR' || position === 'PORTERO') return '#0f172a'; // Charcoal
  if (['DFC', 'LI', 'LD', 'CAI', 'CAD', 'CENTRAL', 'LATERAL'].some(p => position.includes(p))) return '#334155'; // Dark Slate
  if (['MC', 'MCO', 'MCD', 'MI', 'MD', 'MEDIO', 'CENTROCAMPISTA'].some(p => position.includes(p))) return '#475569'; // Cool Gray
  if (['DC', 'EI', 'ED', 'SD', 'DELANTERO', 'EXTREMO'].some(p => position.includes(p))) return '#64748b'; // Slate Gray
  return '#475569'; // Default Gray
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

// Generar HTML del campo de fútbol en perspectiva 3D idéntica a la plantilla
// Helper for drawing a 3D-ish soccer jersey SVG
const drawJerseySVG = (posCode) => {
  const isGK = posCode === 'POR' || posCode === 'PORTERO';
  const shirtColor = isGK ? '#ffffff' : '#18181b';
  const strokeColor = isGK ? '#1e293b' : '#ffffff';
  return `
    <svg viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.35)); display: block;">
      <path d="M6 3.5 L7.5 2 L12 4.5 L16.5 2 L18 3.5 L22 6 L19.5 9.5 L17.5 8 L17.5 21 L6.5 21 L6.5 8 L4.5 9.5 L2 6 Z" fill="${shirtColor}" stroke="${strokeColor}" stroke-width="1.2" stroke-linejoin="round" />
      <path d="M10 2.8 L12 5 L14 2.8" fill="none" stroke="${strokeColor}" stroke-width="1.2" />
    </svg>
  `;
};

// Generar HTML del campo de fútbol en perspectiva 3D idéntica a la plantilla
const generateFieldHTML = (lineup, players, formation, showPhotos, showNames, fieldWidth = 340, titulares = [], positionTranslations = {}) => {
  const fieldHeight = fieldWidth * 1.22;
  
  // Función de proyección perspectiva 3D
  const project = (x_pct, y_pct) => {
    const W_bottom = fieldWidth - 24;
    const W_top = fieldWidth * 0.58; // Estrechamiento de perspectiva
    
    // Ancho de la línea en este Y
    const W_y = W_top + (y_pct / 100) * (W_bottom - W_top);
    // Margen izquierdo para centrar
    const X_left = (fieldWidth - W_y) / 2;
    
    const X_proj = X_left + (x_pct / 100) * W_y;
    // Compresión vertical para efecto 3D
    const Y_proj = 18 + (y_pct / 100) * (fieldHeight - 34);
    
    return { x: X_proj, y: Y_proj };
  };
  
  const positions = FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['1-4-4-2'];
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
    
    // Proyectar posición
    const proj = project(assignedPlayer?.x ?? pos.x, assignedPlayer?.y ?? pos.y);
    const color = getPositionColor(pos.pos);
    const translatedPos = translatePosition(pos.pos);
    
    playersHTML += `
      <div style="position: absolute; left: ${proj.x - 22}px; top: ${proj.y - 28}px; width: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10;">
        ${showPhotos && player?.foto ? `
          <img src="${player.foto}" style="width: 36px; height: 36px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 0 0 2px ${color}, 0 4px 10px rgba(0,0,0,0.35); object-fit: cover;" />
        ` : `
          ${drawJerseySVG(pos.pos)}
        `}
        ${showNames ? `
          <div style="display: flex; align-items: center; justify-content: center; height: 16px; background: #0e1726; color: #ffffff; padding: 0 6px; border-radius: 5px; font-size: 7.5px; font-weight: 800; text-align: center; margin-top: 5px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-family: 'Inter', sans-serif; white-space: nowrap; max-width: 80px; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; letter-spacing: 0.2px; line-height: 1;">
            ${player ? getPlayerFirstName(player) : translatedPos}
          </div>
        ` : ''}
      </div>
    `;
  });
  
  // Dibujar franjas del césped en perspectiva (Grayscale)
  const stripes = 10;
  let stripesHTML = '';
  for (let i = 0; i < stripes; i++) {
    const y1 = i * (100 / stripes);
    const y2 = (i + 1) * (100 / stripes);
    const pTL = project(0, y1);
    const pTR = project(100, y1);
    const pBR = project(100, y2);
    const pBL = project(0, y2);
    stripesHTML += `<polygon points="${pTL.x},${pTL.y} ${pTR.x},${pTR.y} ${pBR.x},${pBR.y} ${pBL.x},${pBL.y}" fill="${i % 2 === 0 ? '#f1f5f9' : '#e2e8f0'}" />`;
  }
  
  // Proyectar líneas del campo (Grayscale)
  const pTL = project(0, 0);
  const pTR = project(100, 0);
  const pBR = project(100, 100);
  const pBL = project(0, 100);
  
  const pML = project(0, 50);
  const pMR = project(100, 50);
  
  const pCenter = project(50, 50);
  const rxCenter = project(62, 50).x - pCenter.x;
  const ryCenter = project(50, 56).y - pCenter.y;
  
  // Área penal superior
  const pP_TL = project(22, 0);
  const pP_TR = project(78, 0);
  const pP_BR = project(78, 16);
  const pP_BL = project(22, 16);
  
  // Área de meta superior
  const pG_TL = project(37, 0);
  const pG_TR = project(63, 0);
  const pG_BR = project(63, 5.5);
  const pG_BL = project(37, 5.5);
  
  // Área penal inferior
  const pP_BL_top = project(22, 84);
  const pP_BR_top = project(78, 84);
  const pP_BR_bot = project(78, 100);
  const pP_BL_bot = project(22, 100);
  
  // Área de meta inferior
  const pG_BL_top = project(37, 94.5);
  const pG_BR_top = project(63, 94.5);
  const pG_BR_bot = project(63, 100);
  const pG_BL_bot = project(37, 100);
 
  // Puntos de penal
  const pSpotTop = project(50, 11.5);
  const pSpotBot = project(50, 88.5);
 
  return `
    <div style="position: relative; width: ${fieldWidth}px; height: ${fieldHeight}px; border-radius: 16px; overflow: hidden; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.15); background: radial-gradient(circle, #f8fafc 0%, #cbd5e1 100%); padding: 0;">
      <svg width="${fieldWidth}" height="${fieldHeight}" style="position: absolute; top: 0; left: 0;">
        <!-- Césped -->
        ${stripesHTML}
        
        <!-- Líneas exteriores -->
        <polygon points="${pTL.x},${pTL.y} ${pTR.x},${pTR.y} ${pBR.x},${pBR.y} ${pBL.x},${pBL.y}" fill="none" stroke="#475569" stroke-width="2"/>
        
        <!-- Línea media -->
        <line x1="${pML.x}" y1="${pML.y}" x2="${pMR.x}" y2="${pMR.y}" stroke="#475569" stroke-width="2" />
        
        <!-- Círculo central (Elipse proyectada) -->
        <ellipse cx="${pCenter.x}" cy="${pCenter.y}" rx="${rxCenter}" ry="${ryCenter}" fill="none" stroke="#475569" stroke-width="2" />
        <circle cx="${pCenter.x}" cy="${pCenter.y}" r="3" fill="#475569" />
        
        <!-- Área superior -->
        <polygon points="${pP_TL.x},${pP_TL.y} ${pP_TR.x},${pP_TR.y} ${pP_BR.x},${pP_BR.y} ${pP_BL.x},${pP_BL.y}" fill="none" stroke="#475569" stroke-width="2" />
        <polygon points="${pG_TL.x},${pG_TL.y} ${pG_TR.x},${pG_TR.y} ${pG_BR.x},${pG_BR.y} ${pG_BL.x},${pG_BL.y}" fill="none" stroke="#475569" stroke-width="2" />
        <circle cx="${pSpotTop.x}" cy="${pSpotTop.y}" r="2" fill="#475569" />
        
        <!-- Área inferior -->
        <polygon points="${pP_BL_top.x},${pP_BL_top.y} ${pP_BR_top.x},${pP_BR_top.y} ${pP_BR_bot.x},${pP_BR_bot.y} ${pP_BL_bot.x},${pP_BL_bot.y}" fill="none" stroke="#475569" stroke-width="2" />
        <polygon points="${pG_BL_top.x},${pG_BL_top.y} ${pG_BR_top.x},${pG_BR_top.y} ${pG_BR_bot.x},${pG_BR_bot.y} ${pG_BL_bot.x},${pG_BL_bot.y}" fill="none" stroke="#475569" stroke-width="2" />
        <circle cx="${pSpotBot.x}" cy="${pSpotBot.y}" r="2" fill="#475569" />
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
      <div style="display: flex; flex-direction: column; align-items: center; width: 68px; margin: 4px;">
        ${showPhotos && player.foto ? `
          <img src="${player.foto}" style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${color}; object-fit: cover; box-shadow: 0 0 0 1px #fff, 0 2px 5px rgba(0,0,0,0.15);" />
        ` : `
          <div style="width: 34px; height: 34px; border-radius: 50%; background: ${color}15; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; color: ${color}; font-weight: 800; font-size: 11px; font-family: 'Inter', sans-serif; line-height: 1;">${player.dorsal || '?'}</div>
        `}
        ${showNames ? `<div style="font-size: 8px; font-weight: 700; margin-top: 5px; text-align: center; color: #334155; text-transform: uppercase; font-family: 'Inter', sans-serif; white-space: nowrap; max-width: 60px; overflow: hidden; text-overflow: ellipsis;">${getPlayerFirstName(player)}</div>` : ''}
        <div style="font-size: 8px; color: ${color}; margin-top: 1px; font-weight: 800; font-family: 'Inter', sans-serif;">#${player.dorsal || '?'}</div>
      </div>
    `;
  }).join('');
  
  return `
    <div style="margin-top: 14px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <div style="width: 3px; height: 14px; background: #475569; border-radius: 2px;"></div>
        <span style="font-size: 9px; font-weight: 900; color: #334155; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Inter', sans-serif;">${substitutesLabel} (${playerIds.length})</span>
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
    return new Date(date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  // Pre-resolve all images to Base64 to bypass CORS
  const resolvedPlayers = await Promise.all((players || []).map(async (p) => {
    if (p.foto && typeof p.foto === 'string' && p.foto.startsWith('http')) {
      const base64 = await toDataUrl(p.foto);
      return { ...p, foto: base64 };
    }
    return p;
  }));

  let resolvedTeamEscudo = team?.escudo;
  if (team?.escudo && typeof team.escudo === 'string' && team.escudo.startsWith('http')) {
    resolvedTeamEscudo = await toDataUrl(team.escudo);
  }
  const resolvedTeam = team ? { ...team, escudo: resolvedTeamEscudo } : team;

  const titulares = matchSheet.alineacionTitulares || [];
  const suplentes = matchSheet.alineacionSuplentes || [];
  
  const substitutesLabel = translations.substitutes || 'Suplentes';
  const lineupHeader = translations.lineupHeader || 'ALINEACIÓN';
  const positionTranslations = translations.positions || {};
  
  const localLabel = translations.local || 'Local';
  const visitorLabel = translations.visitor || 'Visitante';
  const neutralLabel = translations.neutral || 'Neutral';
  const casaLabel = translations.casa || 'Casa';
  const fueraLabel = translations.fuera || 'Fuera';

  const getUbicacionLabel = (ubi) => {
    if (ubi === 'local') return localLabel;
    if (ubi === 'visitante') return visitorLabel;
    if (ubi === 'neutral') return neutralLabel;
    if (ubi === 'Casa') return casaLabel;
    if (ubi === 'Fuera') return fueraLabel;
    if (ubi === 'Neutral') return neutralLabel;
    return ubi || '';
  };

  const fieldHTML = generateFieldHTML(lineup, resolvedPlayers, formation, showPhotos, showNames, 440, titulares, positionTranslations);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${lineupHeader} - ${matchSheet.rival}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box;        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: #0f172a; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        
        .pdf-page { 
          width: 210mm; 
          height: 297mm; 
          box-sizing: border-box; 
          display: flex; 
          flex-direction: row; 
          overflow: hidden; 
        }
        
        .left-column {
          width: 65%;
          height: 100%;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 12mm 10mm;
          position: relative;
        }
        
        .right-column {
          width: 35%;
          height: 100%;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          display: flex;
          flex-direction: column;
          padding: 12mm 10mm;
          border-left: 2.5px solid rgba(255,255,255,0.08);
          box-shadow: -10px 0 25px rgba(0,0,0,0.4);
        }
        
        .chip {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 18px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.12);
          color: #ffffff;
          padding: 0 10px;
          border-radius: 20px;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'Inter', sans-serif;
          line-height: 1;
        }
      </style>
    </head>
    <body>
      <div class="pdf-page">
        <!-- Left Side: Match Details & Tactical Board -->
        <div class="left-column">
          <!-- Match Header Info -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid rgba(15,23,42,0.08); padding-bottom: 10px; width: 100%; margin-bottom: 15px;">
            <div>
              <div style="color: #475569; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">${lineupHeader}</div>
              <div style="color: #0f172a; font-size: 16px; font-weight: 900; text-transform: uppercase; margin-top: 3px; letter-spacing: 0.5px;">vs ${matchSheet.rival}</div>
            </div>
            <div style="text-align: right;">
              <div style="color: #64748b; font-size: 9px; font-weight: 700;">${formatDate(matchSheet.fechaHora)}</div>
              ${formatTime(matchSheet.fechaHora) ? `<div style="color: #475569; font-size: 8.5px; font-weight: 800; margin-top: 2px;">${formatTime(matchSheet.fechaHora)}</div>` : ''}
            </div>
          </div>

          <!-- The soccer field SVG projection -->
          <div style="display: flex; justify-content: center; flex: 1; align-items: center; width: 100%;">
            ${fieldHTML}
          </div>

          <!-- Bottom bar: Formation Pill and Footer -->
          <div style="width: 100%; margin-top: 15px; display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <div style="display: flex; align-items: center; justify-content: center; height: 22px; background: #0f172a; color: #ffffff; padding: 0 18px; border-radius: 20px; font-size: 9px; font-weight: 800; border: 1.5px solid rgba(255,255,255,0.15); box-shadow: 0 4px 6px rgba(0,0,0,0.2); text-transform: uppercase; letter-spacing: 0.5px; line-height: 1;">
              Formación: ${formation}
            </div>
            <div style="color: #94a3b8; font-size: 8px; letter-spacing: 0.5px; border-top: 1px solid rgba(15,23,42,0.05); padding-top: 10px; width: 100%; text-align: center;">
              ${translations.generatedWith || 'Generado con Xtramys'} · ${new Date().toLocaleDateString(locale)}
            </div>
          </div>
        </div>

        <!-- Right Side: Club Logo, Match Metadata & Substitutions -->
        <div class="right-column">
          <!-- Club Header shield -->
          <div style="text-align: center; margin-bottom: 20px;">
            ${resolvedTeam?.escudo
              ? `<img src="${resolvedTeam.escudo}" style="width: 76px; height: 76px; object-fit: contain; background: #ffffff; border-radius: 12px; padding: 5px; box-shadow: 0 8px 16px rgba(0,0,0,0.4); border: 2.5px solid #ffffff;" />`
              : `<div style="width: 76px; height: 76px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 2.5 dashed rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 24px;">🛡️</div>`}
            <div style="color: #ffffff; font-size: 13px; font-weight: 900; margin-top: 10px; text-transform: uppercase; letter-spacing: 1.5px;">
              ${resolvedTeam?.nombre || 'Mi Club'}
            </div>
          </div>

          <!-- Metadata Badges -->
          <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 25px; align-items: center; width: 100%;">
            ${(() => {
              const roundLabels = translations.roundLabels || {};
              const legFirstLabel = translations.legFirst || 'Ida';
              const legSecondLabel = translations.legSecond || 'Vuelta';
              const groupLabel = translations.group || 'Grupo';
              const matchDayLbl = translations.matchdayFileLabel || 'J';
              if (matchSheet.fase === 'eliminatoria' && matchSheet.ronda) {
                const roundLabel = roundLabels[matchSheet.ronda] || matchSheet.ronda;
                const legSuffix = matchSheet.pierna && matchSheet.pierna !== 'unico' ? ` (${matchSheet.pierna === 'ida' ? legFirstLabel : legSecondLabel})` : '';
                return `<span class="chip">${roundLabel}${legSuffix}</span>`;
              } else if (matchSheet.fase === 'grupos') {
                const groupPart = matchSheet.grupo ? `${groupLabel} ${matchSheet.grupo}` : '';
                const jornadaPart = matchSheet.jornada ? `${matchDayLbl} ${matchSheet.jornada}` : '';
                const combined = [groupPart, jornadaPart].filter(Boolean).join(' - ');
                return `<span class="chip">${combined}</span>`;
              } else {
                return matchSheet.jornada ? `<span class="chip">Jornada ${matchSheet.jornada}</span>` : '';
              }
            })()}
            ${matchSheet.torneoId && typeof matchSheet.torneoId === 'object' && matchSheet.torneoId.nombre ? `<span class="chip">🏆 ${matchSheet.torneoId.nombre}</span>` : ''}
            ${matchSheet.ubicacion ? `<span class="chip">📍 ${getUbicacionLabel(matchSheet.ubicacion)}</span>` : ''}
          </div>

          <!-- Substitutions Section -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: center; height: 22px; background: #cbd5e1; color: #0f172a; padding: 0 14px; border-radius: 20px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; align-self: flex-start; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); font-family: 'Inter', sans-serif; line-height: 1;">
              ${substitutesLabel} (${suplentes.length})
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px; overflow: hidden; justify-content: flex-start;">
              ${suplentes.map(id => {
                const player = resolvedPlayers.find(p => p._id === id || p._id === id._id);
                if (!player) return '';
                const isGK = player.posicion?.toUpperCase() === 'POR' || player.posicion?.toUpperCase() === 'PORTERO';
                const shirtColor = isGK ? '#ffffff' : '#18181b';
                const strokeColor = isGK ? '#1e293b' : '#ffffff';
                
                return `
                  <div style="display: flex; align-items: center; gap: 10px;">
                    ${showPhotos && player.foto ? `
                      <img src="${player.foto}" style="width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid #ffffff; object-fit: cover; box-shadow: 0 2px 5px rgba(0,0,0,0.3); flex-shrink: 0;" />
                    ` : `
                      <div style="flex-shrink: 0; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
                        <svg viewBox="0 0 24 24" width="28" height="28" style="filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.35));">
                          <path d="M6 3.5 L7.5 2 L12 4.5 L16.5 2 L18 3.5 L22 6 L19.5 9.5 L17.5 8 L17.5 21 L6.5 21 L6.5 8 L4.5 9.5 L2 6 Z" fill="${shirtColor}" stroke="${strokeColor}" stroke-width="1.2" stroke-linejoin="round" />
                          <path d="M10 2.8 L12 5 L14 2.8" fill="none" stroke="${strokeColor}" stroke-width="1.2" />
                        </svg>
                      </div>
                    `}
                    <div style="display: flex; align-items: center; justify-content: center; height: 22px; background: #0f172a; color: #ffffff; padding: 0 12px; border-radius: 6px; font-size: 8.5px; font-weight: 700; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 2px 4px rgba(0,0,0,0.25); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; letter-spacing: 0.2px; line-height: 1;">
                      ${player.dorsal ? `#${player.dorsal} ` : ''}${getPlayerFullName(player)}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
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
    return new Date(date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  // Pre-resolve all images to Base64 to bypass CORS
  const resolvedPlayers = await Promise.all((players || []).map(async (p) => {
    if (p.foto && typeof p.foto === 'string' && p.foto.startsWith('http')) {
      const base64 = await toDataUrl(p.foto);
      return { ...p, foto: base64 };
    }
    return p;
  }));

  let resolvedTeamEscudo = team?.escudo;
  if (team?.escudo && typeof team.escudo === 'string' && team.escudo.startsWith('http')) {
    resolvedTeamEscudo = await toDataUrl(team.escudo);
  }
  const resolvedTeam = team ? { ...team, escudo: resolvedTeamEscudo } : team;

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
    const player = resolvedPlayers.find(p => p._id === id || p._id === id._id);
    if (!player) return;
    const group = getPositionGroup(player.posicion);
    if (!positionGroups[group.order]) positionGroups[group.order] = { label: group.label, players: [] };
    positionGroups[group.order].players.push(player);
  });

  // Tarjeta de jugador para convocatoria clara
  const playerCardHTML = (player) => {
    const color = getPositionColor(player.posicion);
    return `
      <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s;">
        <div style="min-width: 26px; width: 26px; height: 26px; border-radius: 6px; background: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px; flex-shrink: 0; box-shadow: 0 2px 4px ${color}40; font-family: 'Inter', sans-serif;">${player.dorsal || '?'}</div>
        ${showPhotos && player.foto ? `
          <img src="${player.foto}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid #e2e8f0; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" />
        ` : `
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; border: 1.5px solid #e2e8f0; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 12px; font-weight: bold; flex-shrink: 0;">👤</div>
        `}
        <div style="flex: 1; min-width: 0;">
          <div style="color: #0f172a; font-size: 11.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Inter', sans-serif;">${getPlayerFullName(player)}</div>
          <div style="color: ${color}; font-size: 9px; font-family: 'Inter', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${player.posicion || ''}</div>
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
            ${p2 ? playerCardHTML(p2) : '<div style="flex: 1; visibility: hidden;"></div>'}
          </div>
        `;
      }
      return `
        <div style="margin-bottom: 14px; page-break-inside: avoid;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 6px; height: 6px; background: #475569; border-radius: 50%;"></div>
            <span style="color: #475569; font-size: 8.5px; letter-spacing: 1.8px; font-weight: 800; font-family: 'Inter', sans-serif; text-transform: uppercase;">${group.label}</span>
            <div style="flex: 1; height: 1px; background: #e2e8f0; margin-left: 4px;"></div>
          </div>
          ${rowsHTML}
        </div>
      `;
    }).join('');

  // Labels for PDF
  const callupHeader = translations.callupHeader || 'CONVOCATORIA';
  const calledLabel = translations.called || 'Convocados';
  const observationsLabel = translations.observations || 'Observaciones';
  const notCalledLabel = translations.notCalled || 'No Convocados';

  // No convocados diseño claro (Grayscale)
  const noConvocadosHTML = noConvocados && noConvocados.length > 0 ? `
    <div style="margin-top: 14px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; page-break-inside: avoid;">
      <div style="font-size: 9px; letter-spacing: 1.5px; color: #334155; font-weight: 800; margin-bottom: 8px; font-family: 'Inter', sans-serif; text-transform: uppercase;">${notCalledLabel.toUpperCase()} (${noConvocados.length})</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${noConvocados.map(id => {
          const p = resolvedPlayers.find(pl => pl._id === id || pl._id === id._id);
          if (!p) return '';
          return `<span style="background: #ffffff; border: 1px solid #e2e8f0; color: #334155; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; font-family: 'Inter', sans-serif; display: inline-flex; align-items: center; justify-content: center; line-height: 1;">${p.dorsal ? '#' + p.dorsal + ' ' : ''}${getPlayerFullName(p)}</span>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // Observaciones diseño claro (Grayscale)
  const observacionesHTML = observaciones ? `
    <div style="margin-top: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; page-break-inside: avoid;">
      <div style="font-size: 9px; letter-spacing: 1.5px; color: #334155; font-weight: 800; margin-bottom: 6px; font-family: 'Inter', sans-serif; text-transform: uppercase;">📝 ${observationsLabel.toUpperCase()}</div>
      <div style="font-size: 10.5px; color: #334155; line-height: 1.6; white-space: pre-wrap; font-family: 'Inter', sans-serif;">${observaciones}</div>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${callupHeader} - ${matchSheet.rival}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: #ffffff; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .pdf-page { padding: 12mm 14mm; background: #ffffff; width: 210mm; height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }
        
        .banner {
          background: linear-gradient(135deg, #0f172a 0%, #334155 60%, #475569 100%);
          border-radius: 14px;
          padding: 22px 26px;
          color: #fff;
          margin-bottom: 14px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.15);
        }
        .banner-logo {
          width: 48px;
          height: 48px;
          object-fit: contain;
          background: rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 8px;
          display: inline-block;
        }
        .banner-title {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .banner-vs {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          margin-bottom: 2px;
          letter-spacing: 2px;
        }
        .banner-rival {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        
        .meeting-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 18px;
        }
        .meeting-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
          text-align: center;
        }
        .meeting-label {
          font-size: 7.5px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .meeting-value {
          font-size: 11px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.3;
          word-break: break-word;
        }
      </style>
    </head>
    <body>
      <div class="pdf-page">
        <div class="banner">
          ${resolvedTeam?.escudo ? `<img src="${resolvedTeam.escudo}" class="banner-logo" />` : ''}
          <div class="banner-title">${callupHeader}</div>
          <div class="banner-vs">VS</div>
          <div class="banner-rival">${matchSheet.rival}</div>
        </div>

        <div class="meeting-strip">
          <div class="meeting-card">
            <div class="meeting-label">Fecha</div>
            <div class="meeting-value">${formatDate(matchSheet.fechaHora)}</div>
          </div>
          <div class="meeting-card">
            <div class="meeting-label">Hora Partido</div>
            <div class="meeting-value">${formatTime(matchSheet.fechaHora) || '--:--'}</div>
          </div>
          <div class="meeting-card">
            <div class="meeting-label">Lugar Quedada</div>
            <div class="meeting-value">${lugarQuedada || '---'}</div>
          </div>
          <div class="meeting-card">
            <div class="meeting-label">Hora Quedada</div>
            <div class="meeting-value">${horaQuedada || '---'}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
          <span style="color: #0f172a; font-size: 10px; letter-spacing: 2px; font-weight: 900; text-transform: uppercase;">${calledLabel} — ${convocados.length}</span>
        </div>

        <div style="flex: 1;">
          ${groupsHTML}
        </div>

        ${observacionesHTML}
        ${noConvocadosHTML}

        <div style="text-align: center; color: #94a3b8; font-size: 8.5px; margin-top: 14px; letter-spacing: 0.8px; border-top: 1px solid #f1f5f9; padding-top: 10px; font-family: 'Inter', sans-serif;">
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
  
  // Pre-resolve all images to Base64 to bypass CORS
  const resolvedPlayers = await Promise.all((players || []).map(async (p) => {
    if (p.foto && typeof p.foto === 'string' && p.foto.startsWith('http')) {
      const base64 = await toDataUrl(p.foto);
      return { ...p, foto: base64 };
    }
    return p;
  }));

  let resolvedTeamEscudo = matchSheet.miEscudo || team?.escudo;
  if (resolvedTeamEscudo && typeof resolvedTeamEscudo === 'string' && resolvedTeamEscudo.startsWith('http')) {
    resolvedTeamEscudo = await toDataUrl(resolvedTeamEscudo);
  }

  let resolvedRivalEscudo = matchSheet.rivalEscudo;
  if (resolvedRivalEscudo && typeof resolvedRivalEscudo === 'string' && resolvedRivalEscudo.startsWith('http')) {
    resolvedRivalEscudo = await toDataUrl(resolvedRivalEscudo);
  }

  // Ordenar cambios por minuto
  const cambiosSorted = [...cambios].sort((a, b) => parseMinutoPDF(a.minuto) - parseMinutoPDF(b.minuto));
  
  // Labels con traducciones
  const teamLabel = translations.team || 'Equipo';
  const matchSheetLabel = translations.matchSheetTitle || 'Ficha de Partido';
  const matchDayLabel = translations.matchDay || 'Jornada';
  const lineupLabel = translations.lineup || 'Alineación';
  const substitutesLabel = translations.substitutes || 'Suplentes';
  const goalsLabel = translations.goals || 'Goles';
  const yellowCardsLabel = translations.yellowCards || 'Tarjetas Amarillas';
  const redCardsLabel = translations.redCards || 'Tarjetas Rojas';
  const substitutionsLabel = translations.substitutions || 'Cambios';
  const coachNotesLabel = translations.coachNotes || 'Notas del Entrenador';
  const resultLabel = translations.result || 'Resultado';
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
    const player = resolvedPlayers.find(p => p._id === playerId || p._id === playerId?._id);
    return player ? getPlayerFullName(player) : '?';
  };
  
  // Generar campo de fútbol
  const fieldHTML = generateFieldHTML(lineup, resolvedPlayers, formation, showPhotos, showNames, 280, titulares, positionTranslations);
  
  // Generar HTML de suplentes
  const suplentesHTML = generateSuplentesBanquilloCompact(suplentes, resolvedPlayers, showPhotos, showNames, substitutesLabel);
  
  // Determinar resultado visual
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
  const resultadoStyle = resultadoRaw === 'Victoria'
    ? 'background: #18181b; border: 1px solid #18181b; color: #ffffff;'
    : resultadoRaw === 'Derrota'
      ? 'background: #f4f4f5; border: 1px solid #d4d4d8; color: #52525b;'
      : 'background: #e4e4e7; border: 1px solid #d4d4d8; color: #27272a;';
  
  // Ubicación traducida
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
  const leftEscudo = isAway ? resolvedRivalEscudo : resolvedTeamEscudo;
  const rightEscudo = isAway ? resolvedTeamEscudo : resolvedRivalEscudo;
  const leftName = isAway ? matchSheet.rival : (team?.nombre || teamLabel);
  const rightName = isAway ? (team?.nombre || teamLabel) : matchSheet.rival;
  const leftGoals = isAway ? golesContra : golesFavor;
  const rightGoals = isAway ? golesFavor : golesContra;
  
  // HTML de goles
  const golesSorted = [...goles].sort((a, b) => parseMinutoPDF(a.minuto) - parseMinutoPDF(b.minuto));
  const golesHTML = golesSorted.length > 0 ? golesSorted.map(g => `
    <div class="event-row">
      <span class="event-icon">⚽</span>
      <div class="event-details">
        <span class="event-player">${getPlayerNameById(g.jugador)}</span>
        ${g.asistente ? `<span class="event-subtext">(${assistLabel}: ${getPlayerNameById(g.asistente)})</span>` : ''}
      </div>
      ${g.minuto ? `<span class="event-time">${g.minuto}'</span>` : ''}
      ${g.tipo ? `<span class="event-badge">${g.tipo}</span>` : ''}
    </div>
  `).join('') : `<div class="event-empty">-</div>`;
  
  // HTML de tarjetas amarillas
  const amarillasSorted = [...tarjetasAmarillas].sort((a, b) => parseMinutoPDF(a.minuto) - parseMinutoPDF(b.minuto));
  const amarillasHTML = amarillasSorted.length > 0 ? amarillasSorted.map(t => `
    <div class="event-row">
      <span class="card-icon yellow"></span>
      <div class="event-details">
        <span class="event-player">${getPlayerNameById(t.jugador)}</span>
        ${t.motivo ? `<span class="event-subtext">(${t.motivo})</span>` : ''}
      </div>
      ${t.minuto ? `<span class="event-time">${t.minuto}'</span>` : ''}
    </div>
  `).join('') : `<div class="event-empty">-</div>`;
  
  // HTML de tarjetas rojas
  const rojasSorted = [...tarjetasRojas].sort((a, b) => parseMinutoPDF(a.minuto) - parseMinutoPDF(b.minuto));
  const rojasHTML = rojasSorted.length > 0 ? rojasSorted.map(t => `
    <div class="event-row">
      <span class="card-icon red"></span>
      <div class="event-details">
        <span class="event-player">${getPlayerNameById(t.jugador)}</span>
        ${t.motivo ? `<span class="event-subtext">(${t.motivo})</span>` : ''}
      </div>
      ${t.minuto ? `<span class="event-time">${t.minuto}'</span>` : ''}
    </div>
  `).join('') : `<div class="event-empty">-</div>`;
  
  // HTML de cambios
  const cambiosHTML = cambiosSorted.length > 0 ? cambiosSorted.map(c => `
    <div class="event-row">
      <span class="event-icon">🔄</span>
      <div class="event-details">
        <div style="display:flex; flex-direction:column; gap:1px;">
          <span class="event-player" style="color:#0f172a;">↑ ${getPlayerNameById(c.entra)}</span>
          <span class="event-player" style="color:#64748b; font-weight: 500;">↓ ${getPlayerNameById(c.sale)}</span>
        </div>
      </div>
      ${c.minuto ? `<span class="event-time">${c.minuto}'</span>` : ''}
    </div>
  `).join('') : `<div class="event-empty">-</div>`;
  
  // HTML de goles del rival
  const golesRivalHTML = golesRival.length > 0 ? [...golesRival].sort((a, b) => parseMinutoPDF(a.minuto) - parseMinutoPDF(b.minuto)).map(g => `
    <div class="event-row">
      <span class="event-icon">⚽</span>
      <div class="event-details">
        <span class="event-player">${matchSheet.rival || '?'}</span>
      </div>
      ${g.minuto ? `<span class="event-time">${g.minuto}'</span>` : ''}
    </div>
  `).join('') : `<div class="event-empty">-</div>`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, sans-serif; font-size: 10px; line-height: 1.4; color: #1e293b; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
        
        .pdf-page {
          width: 210mm;
          height: 297mm;
          padding: 12mm 14mm;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #ffffff;
          page-break-after: always;
        }
        .pdf-page:last-child {
          page-break-after: avoid;
        }
        
        .header {
          background: linear-gradient(135deg, #0f172a 0%, #334155 60%, #475569 100%);
          color: white;
          padding: 18px 24px;
          border-radius: 12px;
          margin-bottom: 12px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.05);
        }
        .header-title { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
        .header-subtitle { font-size: 11px; opacity: 0.85; font-weight: 500; }
        
        .page-header {
          border-bottom: 1.5px dashed #334155;
          padding-bottom: 6px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-header-title {
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #334155;
          letter-spacing: 1px;
        }
        .page-header-subtitle {
          font-size: 8px;
          color: #94a3b8;
          font-weight: 500;
        }
        
        .match-info { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .escudos-row { display: flex; align-items: center; justify-content: center; gap: 30px; margin-bottom: 12px; }
        .escudo-container { text-align: center; display: flex; flex-direction: column; align-items: center; width: 110px; }
        .escudo-img { width: 44px; height: 44px; object-fit: contain; border-radius: 8px; background: #f8fafc; padding: 3px; border: 1px solid #e2e8f0; }
        .escudo-placeholder { width: 44px; height: 44px; border-radius: 8px; background: linear-gradient(135deg, #0f172a, #1e3a5f); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .team-name { font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; max-width: 110px; overflow: hidden; text-overflow: ellipsis; }
        
        .score-container { display: flex; align-items: center; gap: 12px; }
        .score { font-size: 32px; font-weight: 900; color: #0f172a; min-width: 40px; text-align: center; letter-spacing: -1px; }
        .score-divider { font-size: 24px; color: #94a3b8; font-weight: 300; }
        .result-badge { display: inline-flex; align-items: center; justify-content: center; height: 18px; padding: 0 14px; border-radius: 20px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); line-height: 1; }
        
        .meta-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: 10px; }
        .meta-badge { background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 20px; font-size: 9px; color: #475569; font-weight: 600; }
        
        .section { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .section-title { font-size: 11px; font-weight: 900; color: #0f172a; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #0f172a; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 1px; }
        
        .field-container { display: flex; justify-content: center; margin: 4px 0; }
        
        .events-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .event-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .event-title { font-size: 9px; font-weight: 900; color: #0f172a; padding-bottom: 6px; border-bottom: 1.5px solid #e2e8f0; display: flex; align-items: center; gap: 5px; text-transform: uppercase; letter-spacing: 1.2px; }
        
        .event-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
        .event-row:last-child { border-bottom: none; }
        .event-icon { font-size: 13px; display: flex; align-items: center; justify-content: center; }
        .card-icon { width: 10px; height: 13px; border-radius: 2px; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .card-icon.yellow { background: #cbd5e1; border: 0.5px solid #475569; }
        .card-icon.red { background: #18181b; border: 0.5px solid #18181b; }
        
        .event-details { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .event-player { font-weight: 700; color: #334155; font-size: 10px; }
        .event-subtext { color: #64748b; font-size: 8.5px; font-weight: 500; }
        .event-time { font-size: 9.5px; font-weight: 800; color: #94a3b8; }
        .event-badge { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 8px; color: #475569; font-weight: 700; text-transform: uppercase; }
        .event-empty { color: #94a3b8; font-size: 10px; padding: 12px 0; text-align: center; font-style: italic; }
        
        .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 10px; color: #334155; white-space: pre-wrap; line-height: 1.5; font-weight: 500; }
        .footer { text-align: center; color: #94a3b8; font-size: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid #e2e8f0; letter-spacing: 0.5px; }
      </style>
    </head>
    <body>
      <!-- PAGINA 1: DATOS GENERALES Y ALINEACION -->
      <div class="pdf-page">
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
          ${resultado ? `<div style="text-align: center;"><span class="result-badge" style="${resultadoStyle}">${resultado}</span></div>` : ''}
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
                return `<span class="meta-badge"><strong>${combined}</strong></span>`;
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
        
        <div class="section" style="margin-bottom:0; flex: 1; display:flex; flex-direction:column; justify-content:center;">
          <div class="section-title">📋 ${lineupLabel} (${formation})</div>
          <div class="field-container">
            ${fieldHTML}
          </div>
          ${suplentesHTML}
        </div>
        
        <div class="footer">
          ${translations.generatedWith || 'Generado con Xtramys'} • Pág 1 / 2
        </div>
      </div>
      
      <!-- PAGINA 2: EVENTOS Y NOTAS -->
      <div class="pdf-page">
        <div class="page-header">
          <span class="page-header-title">${matchSheetLabel} — vs — ${matchSheet.rival}</span>
          <span class="page-header-subtitle">Pág 2 / 2</span>
        </div>
        
        <div class="events-section" style="flex: 1; align-content: start;">
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
          <div class="event-card" style="grid-column: span 2;">
            <div class="event-title">🔄 ${substitutionsLabel}</div>
            ${cambiosHTML}
          </div>
        </div>
        
        ${matchSheet.notasEntrenador ? `
          <div class="section" style="margin-top:10px; margin-bottom: 0;">
            <div class="section-title">📝 ${coachNotesLabel}</div>
            <div class="notes-box">${matchSheet.notasEntrenador}</div>
          </div>
        ` : ''}
        
        <div class="footer">
          ${translations.generatedWith || 'Generado con Xtramys'} • Pág 2 / 2
        </div>
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
