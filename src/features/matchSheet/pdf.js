// PDF generators for MatchSheet using window.open + window.print().
// Three exports:
//   - generateMatchSheetPDF(matchSheet, players, team, t)  -> ficha completa
//   - generateLineupPDF(matchSheet, players, team, options, t) -> alineación
//   - generateCallUpPDF(matchSheet, players, team, callupData, t) -> convocatoria

import { getFormationSlots, POSITION_COLORS } from './formations';

const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function getPlayer(players, id) {
  return players.find((p) => p._id === id);
}

function playerName(p) {
  return p ? p.nombre : '—';
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

function openPrintWindow(html, title) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title>${html}</head></html>`);
  w.document.close();
}

const baseStyles = `
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; margin: 0; color: #1a237e; }
    h1, h2, h3 { margin: 0; }
    .page-break { page-break-after: always; }
    .header {
      background: linear-gradient(135deg, #1a237e, #3949ab, #5c6bc0);
      color: #fff; padding: 24px; border-radius: 12px; margin-bottom: 16px;
    }
    .header h1 { font-size: 22px; letter-spacing: 1px; margin-bottom: 4px; }
    .header p { margin: 0; opacity: 0.9; font-size: 13px; }
    .info-card {
      display: flex; align-items: center; justify-content: space-around;
      padding: 16px; border: 1px solid #e0e0e0; border-radius: 12px;
      background: #fafafa; margin-bottom: 16px;
    }
    .crest { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; background: #eee; }
    .score { font-size: 44px; font-weight: 800; color: #1a237e; }
    .vs { text-align: center; }
    .vs .name { font-size: 13px; color: #555; margin-bottom: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; color: #fff; }
    .badge-win { background: #10b981; }
    .badge-draw { background: #64748b; }
    .badge-loss { background: #ef4444; }
    .meta-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
      margin-bottom: 16px;
    }
    .meta-item {
      padding: 8px 12px; background: #f5f5f5; border-radius: 8px;
      font-size: 12px;
    }
    .meta-label { color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .meta-value { font-weight: 700; color: #1a237e; }
    .section { margin-bottom: 16px; }
    .section-title {
      font-size: 14px; font-weight: 700; color: #1a237e;
      border-bottom: 2px solid #1a237e; padding-bottom: 4px; margin-bottom: 8px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .events-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
    }
    .event-card { padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; }
    .event-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; }
    .minute {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 28px; height: 22px; padding: 0 6px; font-size: 11px; font-weight: 800;
      border-radius: 999px;
    }
    .min-green { background: #dcfce7; color: #16a34a; }
    .min-red { background: #fee2e2; color: #dc2626; }
    .min-yellow { background: #fef3c7; color: #d97706; }
    .min-gray { background: #f1f5f9; color: #475569; }
    .field-wrap {
      position: relative; width: 100%; max-width: 380px; margin: 0 auto;
      aspect-ratio: 100/142; border-radius: 12px; overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .field-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .slot {
      position: absolute; transform: translate(-50%, -50%);
      display: flex; flex-direction: column; align-items: center;
    }
    .slot-circle {
      width: 38px; height: 38px; border-radius: 50%; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      border: 2px solid #fff;
    }
    .slot-name { margin-top: 2px; font-size: 9px; color: #fff;
      background: rgba(0,0,0,0.6); padding: 1px 5px; border-radius: 4px;
      max-width: 70px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .player-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
      margin-top: 8px;
    }
    .player-cell {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 8px; background: #fafafa; border-radius: 6px; font-size: 12px;
    }
    .player-num {
      width: 28px; height: 28px; border-radius: 50%; background: #1a237e; color: #fff;
      display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px;
      flex-shrink: 0;
    }
    .notes { white-space: pre-wrap; padding: 12px; background: #fffbe6; border-radius: 8px; font-size: 13px; color: #444; }
    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 16px; }
  </style>
`;

function renderFieldHTML(slots, titularesIds, players) {
  // Stripes
  let stripes = '';
  for (let i = 0; i < 14; i++) {
    stripes += `<rect x="0" y="${(i * 142) / 14}" width="100" height="${142 / 14}" fill="${i % 2 === 0 ? '#3a8a3a' : '#2f7a2f'}"/>`;
  }
  const lines = `
    <rect x="0.4" y="0.4" width="99.2" height="141.2" fill="none" stroke="#fff" stroke-width="0.4"/>
    <line x1="0" y1="71" x2="100" y2="71" stroke="#fff" stroke-width="0.4"/>
    <circle cx="50" cy="71" r="13.5" fill="none" stroke="#fff" stroke-width="0.4"/>
    <circle cx="50" cy="71" r="0.7" fill="#fff"/>
    <rect x="22.5" y="0" width="55" height="15.5" fill="none" stroke="#fff" stroke-width="0.4"/>
    <rect x="38" y="0" width="24" height="5.5" fill="none" stroke="#fff" stroke-width="0.4"/>
    <rect x="22.5" y="126.5" width="55" height="15.5" fill="none" stroke="#fff" stroke-width="0.4"/>
    <rect x="38" y="136.5" width="24" height="5.5" fill="none" stroke="#fff" stroke-width="0.4"/>
  `;
  const slotsHtml = slots.map((slot, idx) => {
    const id = titularesIds[idx];
    const p = id ? getPlayer(players, id) : null;
    const color = POSITION_COLORS[slot.pos] || '#3b82f6';
    const inner = p ? `${p.dorsal ?? '?'}` : slot.label;
    const name = p ? `<div class="slot-name">${esc((p.nombre || '').split(' ')[0])}</div>` : '';
    return `
      <div class="slot" style="left:${slot.x}%; top:${slot.y}%;">
        <div class="slot-circle" style="background:${color};">${esc(inner)}</div>
        ${name}
      </div>`;
  }).join('');
  return `
    <div class="field-wrap">
      <svg class="field-svg" viewBox="0 0 100 142" preserveAspectRatio="none">
        ${stripes}${lines}
      </svg>
      ${slotsHtml}
    </div>`;
}

function resultBadge(matchSheet) {
  const r = matchSheet.resultado || '';
  const cls = r === 'Victoria' ? 'badge-win' : r === 'Derrota' ? 'badge-loss' : 'badge-draw';
  return r ? `<span class="badge ${cls}">${esc(r)}</span>` : '';
}

function infoCard(matchSheet, team) {
  return `
    <div class="info-card">
      <div class="vs">
        <div class="name">${esc(team?.nombre || '')}</div>
        ${team?.escudo ? `<img src="${esc(team.escudo)}" class="crest"/>` : ''}
      </div>
      <div>
        <div class="score">${matchSheet.golesFavor ?? 0} - ${matchSheet.golesContra ?? 0}</div>
        <div style="text-align:center; margin-top:6px;">${resultBadge(matchSheet)}</div>
      </div>
      <div class="vs">
        <div class="name">${esc(matchSheet.rival || '')}</div>
        ${matchSheet.rivalEscudo ? `<img src="${esc(matchSheet.rivalEscudo)}" class="crest"/>` : ''}
      </div>
    </div>`;
}

function metaGrid(matchSheet, t) {
  const items = [
    [t('matchSheet.fields.location', 'Ubicación'), matchSheet.ubicacion],
    [t('matchSheet.fields.competition', 'Competición'), matchSheet.competicion],
    [t('matchSheet.fields.matchday', 'Jornada'), matchSheet.jornada ?? ''],
    [t('matchSheet.fields.dateTime', 'Fecha'), fmtDate(matchSheet.fechaHora)],
    [t('matchSheet.fields.formation', 'Alineación'), matchSheet.alineacion || ''],
    [t('matchSheet.fields.rivalFormation', 'Alineación rival'), matchSheet.alineacionRival || ''],
  ].filter(([, v]) => v !== '' && v != null);
  return `
    <div class="meta-grid">
      ${items.map(([label, value]) => `
        <div class="meta-item">
          <div class="meta-label">${esc(label)}</div>
          <div class="meta-value">${esc(value)}</div>
        </div>`).join('')}
    </div>`;
}

function eventsBlock(matchSheet, players, t) {
  const renderList = (arr, fn) => arr.length
    ? arr.map(fn).join('')
    : `<div style="font-size:11px; color:#999;">${esc(t('common.empty', 'Sin datos'))}</div>`;

  return `
    <div class="events-grid">
      <div class="event-card">
        <div class="section-title">${esc(t('matchSheet.fields.goalsFor', 'Goles'))}</div>
        ${renderList(matchSheet.goles || [], (g) => `
          <div class="event-row">
            <span class="minute min-green">${g.minuto}'</span>
            <span>${esc(playerName(getPlayer(players, g.jugador)))}</span>
            ${g.tipo && g.tipo !== 'normal' ? `<span style="color:#888; font-size:10px;">(${esc(g.tipo)})</span>` : ''}
          </div>`)}
      </div>
      <div class="event-card">
        <div class="section-title">${esc(t('matchSheet.fields.goalsAgainst', 'Goles rival'))}</div>
        ${renderList(matchSheet.golesRival || matchSheet.golesRivalDetalle || [], (g) => `
          <div class="event-row">
            <span class="minute min-red">${g.minuto}'</span>
          </div>`)}
      </div>
      <div class="event-card">
        <div class="section-title">${esc(t('matchSheet.fields.cards', 'Tarjetas'))}</div>
        ${renderList(matchSheet.tarjetasAmarillas || [], (c) => `
          <div class="event-row">
            <span class="minute min-yellow">${c.minuto}'</span>
            <span>🟨 ${esc(playerName(getPlayer(players, c.jugador)))}</span>
          </div>`)}
        ${(matchSheet.tarjetasRojas || []).map((c) => `
          <div class="event-row">
            <span class="minute min-red">${c.minuto}'</span>
            <span>🟥 ${esc(playerName(getPlayer(players, c.jugador)))}</span>
          </div>`).join('')}
      </div>
      <div class="event-card">
        <div class="section-title">${esc(t('matchSheet.fields.changes', 'Cambios'))}</div>
        ${renderList(matchSheet.cambios || [], (c) => `
          <div class="event-row">
            <span class="minute min-gray">${c.minuto}'</span>
            <span style="color:#dc2626;">↓ ${esc(playerName(getPlayer(players, c.sale)))}</span>
            <span style="color:#16a34a;">↑ ${esc(playerName(getPlayer(players, c.entra)))}</span>
          </div>`)}
      </div>
    </div>`;
}

function playerListBlock(title, ids, players) {
  return `
    <div class="section">
      <div class="section-title">${esc(title)} (${ids.length})</div>
      <div class="player-grid">
        ${ids.map((id) => {
          const p = getPlayer(players, id);
          if (!p) return '';
          return `
            <div class="player-cell">
              <div class="player-num">${esc(p.dorsal ?? '?')}</div>
              <span>${esc(p.nombre || '')}</span>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function header(matchSheet, team, subtitle) {
  return `
    <div class="header">
      <h1>${esc(subtitle)}</h1>
      <p>${esc(team?.nombre || '')} · ${esc(fmtDate(matchSheet.fechaHora))}</p>
    </div>`;
}

const printScript = `<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>`;

export function generateMatchSheetPDF(matchSheet, players, team, t) {
  const slots = getFormationSlots(11, matchSheet.alineacion || '1-4-4-2');
  const titulares = matchSheet.alineacionTitulares || [];
  const suplentes = matchSheet.alineacionSuplentes || [];
  const html = `
    ${baseStyles}
    <body>
      ${header(matchSheet, team, t('matchSheet.pdf.fullSheet', 'FICHA DE PARTIDO'))}
      ${infoCard(matchSheet, team)}
      ${metaGrid(matchSheet, t)}
      ${titulares.length ? `
        <div class="section">
          <div class="section-title">${esc(t('matchSheet.fields.lineup', 'Alineación'))}</div>
          ${renderFieldHTML(slots, titulares, players)}
        </div>
        ${playerListBlock(t('matchSheet.fields.starters', 'Titulares'), titulares, players)}
      ` : ''}
      ${suplentes.length ? playerListBlock(t('matchSheet.substitutes', 'Suplentes'), suplentes, players) : ''}
      <div class="page-break"></div>
      <div class="section">
        <div class="section-title">${esc(t('matchSheet.fields.events', 'Eventos'))}</div>
        ${eventsBlock(matchSheet, players, t)}
      </div>
      ${matchSheet.notasEntrenador ? `
        <div class="section">
          <div class="section-title">${esc(t('matchSheet.fields.coachNotes', 'Notas'))}</div>
          <div class="notes">${esc(matchSheet.notasEntrenador)}</div>
        </div>` : ''}
      <div class="footer">Xtramys · ${new Date().toLocaleDateString()}</div>
      ${printScript}
    </body>`;
  openPrintWindow(html, t('matchSheet.pdf.fullSheet', 'Ficha de partido'));
}

export function generateLineupPDF(matchSheet, players, team, options, t) {
  const slots = getFormationSlots(11, matchSheet.alineacion || '1-4-4-2');
  const titulares = matchSheet.alineacionTitulares || [];
  const suplentes = matchSheet.alineacionSuplentes || [];
  const html = `
    ${baseStyles}
    <body>
      ${header(matchSheet, team, t('matchSheet.pdf.lineup', 'ALINEACIÓN'))}
      ${infoCard(matchSheet, team)}
      <div class="section">
        ${renderFieldHTML(slots, titulares, players)}
      </div>
      ${playerListBlock(t('matchSheet.fields.starters', 'Titulares'), titulares, players)}
      ${suplentes.length ? playerListBlock(t('matchSheet.substitutes', 'Suplentes'), suplentes, players) : ''}
      <div class="footer">Xtramys · ${new Date().toLocaleDateString()}</div>
      ${printScript}
    </body>`;
  openPrintWindow(html, t('matchSheet.pdf.lineup', 'Alineación'));
}

export function generateCallUpPDF(matchSheet, players, team, callupData, t) {
  const convocados = matchSheet.convocados || [];
  const noConvocados = matchSheet.noConvocados || [];
  const meeting = callupData?.horaQuedada || '';
  const place = callupData?.lugarQuedada || '';
  const obs = callupData?.observaciones || '';
  const html = `
    ${baseStyles}
    <body>
      ${header(matchSheet, team, t('matchSheet.pdf.callup', 'CONVOCATORIA'))}
      ${infoCard(matchSheet, team)}
      ${meeting || place ? `
        <div class="meta-grid">
          ${meeting ? `<div class="meta-item"><div class="meta-label">${esc(t('matchSheet.meetingTime', 'Hora quedada'))}</div><div class="meta-value">${esc(meeting)}</div></div>` : ''}
          ${place ? `<div class="meta-item"><div class="meta-label">${esc(t('matchSheet.meetingPlace', 'Lugar'))}</div><div class="meta-value">${esc(place)}</div></div>` : ''}
        </div>` : ''}
      ${playerListBlock(t('matchSheet.callups', 'Convocados'), convocados, players)}
      ${noConvocados.length ? playerListBlock(t('matchSheet.notCalledUp', 'No convocados'), noConvocados, players) : ''}
      ${obs ? `
        <div class="section">
          <div class="section-title">${esc(t('matchSheet.fields.observations', 'Observaciones'))}</div>
          <div class="notes">${esc(obs)}</div>
        </div>` : ''}
      <div class="footer">Xtramys · ${new Date().toLocaleDateString()}</div>
      ${printScript}
    </body>`;
  openPrintWindow(html, t('matchSheet.pdf.callup', 'Convocatoria'));
}
