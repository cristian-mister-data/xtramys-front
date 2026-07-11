import React from 'react';
import { Svg, Polygon, Line, Ellipse, Circle, Defs, RadialGradient, Stop, Path, Rect } from '@react-pdf/renderer';
import {
  Document, Page, Text, View, Image, StyleSheet,
  baseStyles, COLORS, SPACING, FONT_SIZE, PdfHeader, PdfFooter, PdfSection, renderPdf
} from '@/utils/pdfDesign';
import { getPlayerFullName, getPlayerFirstName } from '@/utils/playerHelpers';
import { format } from 'date-fns';
import i18n from '@/i18n';
import { translatePosition } from '@/components/player/playerHelpers';
import { DEFAULT_KITS, DEFAULT_RIVAL_KITS } from '@/utils/kits';


const s = StyleSheet.create({
  grid2: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, marginBottom: SPACING.md },
  grid3: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.md },
  grid4: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.md },
  card: { padding: SPACING.md, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginBottom: SPACING.sm },
  cardTitle: { fontSize: FONT_SIZE.sm, fontFamily: 'Helvetica-Bold', color: COLORS.text, marginBottom: 4 },
  cardSubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#fff' },
  statCard: { flex: 1, padding: SPACING.sm, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLORS.primary, marginBottom: 4 },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textTransform: 'uppercase' },
  table: { width: '100%', marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.bgHeader, paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  th: { flex: 1, fontSize: FONT_SIZE.xs, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  td: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.text },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: COLORS.bgSoft, fontSize: 10, fontFamily: 'Helvetica-Bold', color: COLORS.primary, borderWidth: 1, borderColor: COLORS.borderLight, textAlign: 'center', marginBottom: 4 }
});

const PdfKit = ({ kit, size = 42 }) => {
  const primary = kit?.primaryColor || '#2563eb';
  const secondary = kit?.secondaryColor || '#ffffff';
  const shorts = kit?.shortsColor || primary;
  const pattern = kit?.pattern || 'solid';
  if (kit?.shape === 'circle') return <Svg width={size} height={size}><Circle cx={size / 2} cy={size / 2} r={size * .42} fill={primary} stroke="#334155" strokeWidth="1" />{pattern !== 'solid' ? <Line x1={size * .25} y1={size * .75} x2={size * .75} y2={size * .25} stroke={secondary} strokeWidth={size * .14} /> : null}</Svg>;
  return <Svg width={size} height={size * 1.15} viewBox="0 0 48 56">
    <Path d="M15 5 L20 2 L28 2 L33 5 L44 10 L39 20 L34 17 L34 40 L14 40 L14 17 L9 20 L4 10 Z" fill={primary} stroke="#334155" strokeWidth="1" />
    {pattern === 'halves' ? <Path d="M24 2 L28 2 L33 5 L44 10 L39 20 L34 17 L34 40 L24 40 Z" fill={secondary} /> : null}
    {pattern === 'vertical' ? <><Rect x="13.5" y="5.5" width="3" height="34" fill={secondary} /><Rect x="22.5" y="2.5" width="3" height="37.5" fill={secondary} /><Rect x="31.5" y="5.5" width="3" height="34" fill={secondary} /></> : null}
    {pattern === 'horizontal' ? <><Rect x="14" y="15" width="20" height="5" fill={secondary} /><Rect x="14" y="27" width="20" height="5" fill={secondary} /></> : null}
    {(pattern === 'diagonal' || pattern === 'sash') ? <Line x1="13" y1="36" x2="35" y2="9" stroke={secondary} strokeWidth={pattern === 'sash' ? 8 : 5} /> : null}
    <Path d="M15 42 L23 42 L24 47 L25 42 L33 42 L35 54 L25 54 L24 51 L23 54 L13 54 Z" fill={shorts} stroke="#334155" strokeWidth="1" />
  </Svg>;
};

const PdfKitMatchup = ({ matchSheet, team }) => {
  const own = matchSheet.equipacionPropia 
    || team?.equipaciones?.[matchSheet.equipacionPropiaKey || 'first'] 
    || DEFAULT_KITS[matchSheet.equipacionPropiaKey || 'first'];
  const rival = matchSheet.equipacionRival 
    || matchSheet.rivalId?.equipaciones?.[matchSheet.equipacionRivalKey || 'first'] 
    || DEFAULT_RIVAL_KITS[matchSheet.equipacionRivalKey || 'first'];
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: COLORS.bgSoft, borderWidth: 1, borderColor: COLORS.borderLight, justifyContent: 'center' }}>
    <PdfKit kit={own} size={28} /><Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.text }}>{team?.nombre || 'Equipo'}</Text>
    <Text style={{ fontSize: 9, color: COLORS.textMuted }}>VS</Text>
    <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.text }}>{matchSheet.rival}</Text><PdfKit kit={rival} size={28} />
  </View>;
};

const getPositionColor = (pos) => {
  const position = pos?.toUpperCase() || '';
  if (position === 'POR' || position === 'PORTERO') return '#10b981';
  if (['DFC', 'CENTRAL'].some((p) => position.includes(p))) return '#3b82f6';
  if (['LI', 'LD', 'CAI', 'CAD', 'LATERAL'].some((p) => position.includes(p))) return '#8b5cf6';
  if (['MC', 'MCO', 'MCD', 'MI', 'MD', 'MEDIO', 'CENTROCAMPISTA'].some((p) => position.includes(p))) return '#f59e0b';
  if (['EI', 'ED', 'EXTREMO'].some((p) => position.includes(p))) return '#ec4899';
  if (['DC', 'SD', 'DELANTERO'].some((p) => position.includes(p))) return '#ef4444';
  return '#6366f1';
};

const FORMATION_POSITIONS = {
  '1-4-4-2': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'LI', x: 10, y: 70 }, { pos: 'DFC', x: 32, y: 74 }, { pos: 'DFC', x: 68, y: 74 }, { pos: 'LD', x: 90, y: 70 }, { pos: 'MI', x: 10, y: 46 }, { pos: 'MC', x: 35, y: 50 }, { pos: 'MC', x: 65, y: 50 }, { pos: 'MD', x: 90, y: 46 }, { pos: 'DC', x: 35, y: 22 }, { pos: 'DC', x: 65, y: 22 }],
  '1-4-3-3': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'LI', x: 10, y: 70 }, { pos: 'DFC', x: 32, y: 74 }, { pos: 'DFC', x: 68, y: 74 }, { pos: 'LD', x: 90, y: 70 }, { pos: 'MC', x: 25, y: 50 }, { pos: 'MC', x: 50, y: 46 }, { pos: 'MC', x: 75, y: 50 }, { pos: 'EI', x: 15, y: 22 }, { pos: 'DC', x: 50, y: 18 }, { pos: 'ED', x: 85, y: 22 }],
  '1-4-2-3-1': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'LI', x: 10, y: 70 }, { pos: 'DFC', x: 32, y: 74 }, { pos: 'DFC', x: 68, y: 74 }, { pos: 'LD', x: 90, y: 70 }, { pos: 'MCD', x: 35, y: 56 }, { pos: 'MCD', x: 65, y: 56 }, { pos: 'MI', x: 15, y: 36 }, { pos: 'MCO', x: 50, y: 32 }, { pos: 'MD', x: 85, y: 36 }, { pos: 'DC', x: 50, y: 14 }],
  '1-3-5-2': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'DFC', x: 25, y: 76 }, { pos: 'DFC', x: 50, y: 80 }, { pos: 'DFC', x: 75, y: 76 }, { pos: 'CAI', x: 6, y: 50 }, { pos: 'MC', x: 28, y: 50 }, { pos: 'MC', x: 50, y: 46 }, { pos: 'MC', x: 72, y: 50 }, { pos: 'CAD', x: 94, y: 50 }, { pos: 'DC', x: 35, y: 20 }, { pos: 'DC', x: 65, y: 20 }],
  '1-3-4-3': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'DFC', x: 25, y: 76 }, { pos: 'DFC', x: 50, y: 80 }, { pos: 'DFC', x: 75, y: 76 }, { pos: 'MI', x: 12, y: 50 }, { pos: 'MC', x: 38, y: 48 }, { pos: 'MC', x: 62, y: 48 }, { pos: 'MD', x: 88, y: 50 }, { pos: 'EI', x: 18, y: 22 }, { pos: 'DC', x: 50, y: 18 }, { pos: 'ED', x: 82, y: 22 }],
  '1-4-5-1': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'LI', x: 10, y: 70 }, { pos: 'DFC', x: 32, y: 74 }, { pos: 'DFC', x: 68, y: 74 }, { pos: 'LD', x: 90, y: 70 }, { pos: 'MI', x: 10, y: 46 }, { pos: 'MC', x: 30, y: 50 }, { pos: 'MC', x: 50, y: 46 }, { pos: 'MC', x: 70, y: 50 }, { pos: 'MD', x: 90, y: 46 }, { pos: 'DC', x: 50, y: 18 }],
  '1-5-3-2': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'CAI', x: 6, y: 68 }, { pos: 'DFC', x: 28, y: 76 }, { pos: 'DFC', x: 50, y: 80 }, { pos: 'DFC', x: 72, y: 76 }, { pos: 'CAD', x: 94, y: 68 }, { pos: 'MC', x: 28, y: 48 }, { pos: 'MC', x: 50, y: 44 }, { pos: 'MC', x: 72, y: 48 }, { pos: 'DC', x: 35, y: 20 }, { pos: 'DC', x: 65, y: 20 }],
  '1-5-4-1': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'CAI', x: 6, y: 68 }, { pos: 'DFC', x: 28, y: 76 }, { pos: 'DFC', x: 50, y: 80 }, { pos: 'DFC', x: 72, y: 76 }, { pos: 'CAD', x: 94, y: 68 }, { pos: 'MI', x: 15, y: 46 }, { pos: 'MC', x: 38, y: 48 }, { pos: 'MC', x: 62, y: 48 }, { pos: 'MD', x: 85, y: 46 }, { pos: 'DC', x: 50, y: 18 }],
  '1-4-1-4-1': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'LI', x: 10, y: 70 }, { pos: 'DFC', x: 32, y: 74 }, { pos: 'DFC', x: 68, y: 74 }, { pos: 'LD', x: 90, y: 70 }, { pos: 'MCD', x: 50, y: 58 }, { pos: 'MI', x: 10, y: 40 }, { pos: 'MC', x: 35, y: 42 }, { pos: 'MC', x: 65, y: 42 }, { pos: 'MD', x: 90, y: 40 }, { pos: 'DC', x: 50, y: 18 }],
  '1-3-4-1-2': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'DFC', x: 25, y: 76 }, { pos: 'DFC', x: 50, y: 80 }, { pos: 'DFC', x: 75, y: 76 }, { pos: 'MI', x: 12, y: 54 }, { pos: 'MC', x: 38, y: 52 }, { pos: 'MC', x: 62, y: 52 }, { pos: 'MD', x: 88, y: 54 }, { pos: 'MCO', x: 50, y: 34 }, { pos: 'DC', x: 35, y: 18 }, { pos: 'DC', x: 65, y: 18 }],
  '1-4-3-2-1': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'LI', x: 10, y: 70 }, { pos: 'DFC', x: 32, y: 74 }, { pos: 'DFC', x: 68, y: 74 }, { pos: 'LD', x: 90, y: 70 }, { pos: 'MC', x: 25, y: 54 }, { pos: 'MC', x: 50, y: 50 }, { pos: 'MC', x: 75, y: 54 }, { pos: 'MI', x: 25, y: 34 }, { pos: 'MD', x: 75, y: 34 }, { pos: 'DC', x: 50, y: 16 }],
  '1-4-1-2-1-2': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'LI', x: 10, y: 70 }, { pos: 'DFC', x: 32, y: 74 }, { pos: 'DFC', x: 68, y: 74 }, { pos: 'LD', x: 90, y: 70 }, { pos: 'MCD', x: 50, y: 58 }, { pos: 'MC', x: 30, y: 46 }, { pos: 'MC', x: 70, y: 46 }, { pos: 'MCO', x: 50, y: 34 }, { pos: 'DC', x: 35, y: 18 }, { pos: 'DC', x: 65, y: 18 }],
  '1-3-3-1': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'DFC', x: 20, y: 72 }, { pos: 'DFC', x: 50, y: 76 }, { pos: 'DFC', x: 80, y: 72 }, { pos: 'MI', x: 15, y: 46 }, { pos: 'MC', x: 50, y: 42 }, { pos: 'MD', x: 85, y: 46 }, { pos: 'DC', x: 50, y: 18 }],
  '1-3-2-1': [{ pos: 'POR', x: 50, y: 95 }, { pos: 'DFC', x: 20, y: 72 }, { pos: 'DFC', x: 50, y: 76 }, { pos: 'DFC', x: 80, y: 72 }, { pos: 'MC', x: 32, y: 46 }, { pos: 'MC', x: 68, y: 46 }, { pos: 'DC', x: 50, y: 18 }],
};

const getPlayersPerTeam = (matchSheet, team, explicitValue) => {
  const count = Number(explicitValue || matchSheet?.jugadoresPorEquipo || team?.jugadoresPorEquipo || 11);
  return [7, 8, 11].includes(count) ? count : 11;
};

const getDefaultFormation = (jugadoresPorEquipo) => {
  if (jugadoresPorEquipo === 7) return '1-3-2-1';
  if (jugadoresPorEquipo === 8) return '1-3-3-1';
  return '1-4-4-2';
};

const buildFormationPositions = (formation) => {
  const rows = String(formation || '').split('-').map(Number).filter(Number.isFinite);
  if (rows.length < 2 || rows[0] !== 1) return null;

  const yByRows = rows.length === 4 ? [95, 72, 45, 18] : rows.length === 5 ? [95, 74, 56, 36, 16] : null;
  if (!yByRows) return null;

  return rows.flatMap((amount, rowIndex) => {
    const y = yByRows[rowIndex];
    return Array.from({ length: amount }, (_, index) => {
      const x = amount === 1 ? 50 : 12 + (index * 76) / (amount - 1);
      const pos = rowIndex === 0 ? 'POR' : rowIndex === rows.length - 1 ? 'DC' : rowIndex === 1 ? 'DFC' : 'MC';
      return { pos, x, y };
    });
  });
};

const getFormationPositions = (formation, jugadoresPorEquipo) => (
  FORMATION_POSITIONS[formation]
  || buildFormationPositions(formation)
  || FORMATION_POSITIONS[getDefaultFormation(jugadoresPorEquipo)]
  || FORMATION_POSITIONS['1-4-4-2']
);

const formatDateSafe = (dateStr) => {
  if (!dateStr) return '-';
  try { return format(new Date(dateStr), 'dd/MM/yyyy'); } catch(e) { return dateStr; }
};

const formatTimeSafe = (dateStr) => {
  if (!dateStr) return '';
  try { return format(new Date(dateStr), 'HH:mm'); } catch(e) { return ''; }
};

// 2D SVG Field Component
const SoccerField = ({ lineup, players, formation, jugadoresPorEquipo = 11, showPhotos, showNames, width = 340, titulares = [], kit, goalkeeperKit }) => {
  const height = width * 1.35;
  const W = width;
  const H = height;
  const cx = W / 2;
  const cy = H / 2;
  const penW = W * 0.58;
  const penH = H * 0.16;
  const goalW = W * 0.26;
  const goalH = H * 0.055;
  const circleR = W * 0.15;
  const penSpotY = H * 0.11;
  const sw = 1.8;
  const strokeColor = 'rgba(255,255,255,0.7)';

  const stripes = 12;
  const stripeHeight = H / stripes;
  const stripesSvg = [];
  for (let i = 0; i < stripes; i++) {
    const y1 = i * stripeHeight;
    const y2 = (i + 1) * stripeHeight;
    const pts = `0,${y1} ${W},${y1} ${W},${y2} 0,${y2}`;
    stripesSvg.push(<Polygon key={i} points={pts} fill={i % 2 === 0 ? '#388E3C' : '#2E7D32'} />);
  }

  const dyArc = penH - penSpotY;
  const dxArc = Math.sqrt(Math.max(0, circleR * circleR - dyArc * dyArc));
  const topArc = `M ${cx - dxArc},${penH} A ${circleR},${circleR} 0 0,0 ${cx + dxArc},${penH}`;
  const botArc = `M ${cx - dxArc},${H - penH} A ${circleR},${circleR} 0 0,1 ${cx + dxArc},${H - penH}`;

  const penTop = `${cx - penW/2},0 ${cx + penW/2},0 ${cx + penW/2},${penH} ${cx - penW/2},${penH}`;
  const penBot = `${cx - penW/2},${H} ${cx + penW/2},${H} ${cx + penW/2},${H - penH} ${cx - penW/2},${H - penH}`;
  
  const goalTop = `${cx - goalW/2},0 ${cx + goalW/2},0 ${cx + goalW/2},${goalH} ${cx - goalW/2},${goalH}`;
  const goalBot = `${cx - goalW/2},${H} ${cx + goalW/2},${H} ${cx + goalW/2},${H - goalH} ${cx - goalW/2},${H - goalH}`;

  const cornerR = 12;
  const cornerTL = `M 0,${cornerR} A ${cornerR},${cornerR} 0 0,0 ${cornerR},0`;
  const cornerTR = `M ${W - cornerR},0 A ${cornerR},${cornerR} 0 0,0 ${W},${cornerR}`;
  const cornerBL = `M 0,${H - cornerR} A ${cornerR},${cornerR} 0 0,1 ${cornerR},${H}`;
  const cornerBR = `M ${W - cornerR},${H} A ${cornerR},${cornerR} 0 0,1 ${W},${H - cornerR}`;

  const marginX = 24;
  const marginY = 24;
  const innerW = W - marginX * 2;
  const innerH = H - marginY * 2;

  const project = (x_pct, y_pct) => {
    return {
      x: marginX + (x_pct / 100) * innerW,
      y: marginY + (y_pct / 100) * innerH
    };
  };

  const positions = getFormationPositions(formation, jugadoresPorEquipo);

  return (
    <View style={{ width, height, position: 'relative', borderRadius: 12, overflow: 'hidden', marginHorizontal: 'auto' }}>
      <Svg width={W} height={H} style={{ position: 'absolute', top: 0, left: 0 }}>
        {stripesSvg}
        <Polygon points={`0,0 ${W},0 ${W},${H} 0,${H}`} fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Line x1={0} y1={cy} x2={W} y2={cy} stroke={strokeColor} strokeWidth={sw} />
        <Circle cx={cx} cy={cy} r={circleR} fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />
        <Path d={topArc} fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Path d={botArc} fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Polygon points={penTop} fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Polygon points={penBot} fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Polygon points={goalTop} fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Polygon points={goalBot} fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Circle cx={cx} cy={penSpotY} r={1.5} fill="#ffffff" />
        <Circle cx={cx} cy={H - penSpotY} r={1.5} fill="#ffffff" />
        <Path d={cornerTL} fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Path d={cornerTR} fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Path d={cornerBL} fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Path d={cornerBR} fill="none" stroke={strokeColor} strokeWidth={sw} />
      </Svg>

      {positions.map((pos, index) => {
        const assignedPlayer = lineup?.find((l) => l.index === index);
        let player = null;
        if (assignedPlayer?.player) {
          player = players.find(p => p._id === assignedPlayer.player || p._id === assignedPlayer.player._id);
        } else if (titulares && titulares[index]) {
          const titularId = titulares[index];
          player = players.find(p => p._id === titularId || p._id === titularId._id);
        }

        const proj = project(assignedPlayer?.x ?? pos.x, assignedPlayer?.y ?? pos.y);
        const isGoalkeeper = pos.pos === 'POR' || pos.pos === 'PORTERO';
        const activeKit = isGoalkeeper ? goalkeeperKit : kit;
        const color = activeKit?.primaryColor || getPositionColor(pos.pos);
        
        const kitTextColor = (() => {
          const prim = (activeKit?.primaryColor || color).toLowerCase();
          const sec = (activeKit?.secondaryColor || '#ffffff').toLowerCase();
          const isLightPrim = ['#ffffff', '#fff', '#fcfcfc', '#f3f4f6', '#e5e7eb', '#fef08a', '#fde047', '#fffae6'].includes(prim);
          if (isLightPrim) {
            return (sec === '#ffffff' || sec === '#fff') ? '#111827' : sec;
          }
          return sec;
        })();

        return (
          <View key={index} style={{ position: 'absolute', left: proj.x - 22, top: proj.y - 28, width: 44, alignItems: 'center' }}>
            {showPhotos && player?.foto ? (
              <Image src={player.foto} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: color, backgroundColor: '#fff' }} />
            ) : (
              <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <PdfKit kit={activeKit || { shape: 'shirt', primaryColor: color, secondaryColor: '#ffffff' }} size={28} />
                {player?.dorsal !== undefined && player?.dorsal !== null && (
                  <Text style={{
                    position: 'absolute',
                    top: (activeKit?.shape === 'circle') ? 11 : 6,
                    fontSize: (activeKit?.shape === 'circle') ? 9 : 8,
                    fontFamily: 'Helvetica-Bold',
                    color: kitTextColor,
                    textAlign: 'center',
                    width: '100%'
                  }}>
                    {player.dorsal}
                  </Text>
                )}
              </View>
            )}
            {showNames && (
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, marginTop: 2, textAlign: 'center' }}>
                {player ? getPlayerFirstName(player).toUpperCase() : pos.pos}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
};

// --- ALINEACIÓN PDF ---
const LineupPage = ({ matchSheet, team, players, lineup, formation, jugadoresPorEquipo, showPhotos, showNames, translations }) => {
  const suplentesIds = matchSheet.alineacionSuplentes || [];
  const playersPerTeam = getPlayersPerTeam(matchSheet, team, jugadoresPorEquipo);
  const resolvedFormation = formation || getDefaultFormation(playersPerTeam);
  
  const ownKit = matchSheet.equipacionPropia 
    || team?.equipaciones?.[matchSheet.equipacionPropiaKey || 'first'] 
    || DEFAULT_KITS[matchSheet.equipacionPropiaKey || 'first'];
  const ownGoalkeeperKit = matchSheet.equipacionPorteroPropia 
    || team?.equipaciones?.[matchSheet.equipacionPropiaKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'] 
    || DEFAULT_KITS[matchSheet.equipacionPropiaKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'];
  
  return (
    <Page size="A4" style={[baseStyles.page, { flexDirection: 'row', padding: 0 }]}>
      <View style={{ width: '65%', padding: SPACING.md, backgroundColor: COLORS.bgSoft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: COLORS.borderLight, paddingBottom: 8, marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.textMuted, textTransform: 'uppercase' }}>{translations?.lineupHeader || 'ALINEACIÓN'}</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: COLORS.primary, marginTop: 2 }}>vs {matchSheet.rival}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{formatDateSafe(matchSheet.fechaHora)}</Text>
            <Text style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2 }}>{formatTimeSafe(matchSheet.fechaHora)}</Text>
          </View>
        </View>

        <SoccerField 
          lineup={lineup} 
          players={players} 
          formation={resolvedFormation} 
          jugadoresPorEquipo={playersPerTeam} 
          showPhotos={showPhotos} 
          showNames={showNames} 
          width={360} 
          titulares={matchSheet.alineacionTitulares} 
          kit={ownKit}
          goalkeeperKit={ownGoalkeeperKit}
        />

        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <Text style={s.chip}>{resolvedFormation}</Text>
        </View>
      </View>

      <View style={{ width: '35%', padding: SPACING.md, backgroundColor: COLORS.primary, color: '#fff' }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          {team?.escudo ? (
            <Image src={team.escudo} style={{ width: 76, height: 76, borderRadius: 14, backgroundColor: '#fff', padding: 4 }} />
          ) : (
            <View style={{ width: 76, height: 76, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}><Text style={{fontSize: 24}}>🛡️</Text></View>
          )}
          <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#fff', marginTop: 8 }}>{team?.nombre || 'Equipo'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <PdfKit 
              kit={matchSheet.equipacionPropia 
                || team?.equipaciones?.[matchSheet.equipacionPropiaKey || 'first'] 
                || DEFAULT_KITS[matchSheet.equipacionPropiaKey || 'first']} 
              size={30} 
            />
            <Text style={{ color: '#fff', fontSize: 8 }}>VS</Text>
            <PdfKit 
              kit={matchSheet.equipacionRival 
                || matchSheet.rivalId?.equipaciones?.[matchSheet.equipacionRivalKey || 'first'] 
                || DEFAULT_RIVAL_KITS[matchSheet.equipacionRivalKey || 'first']} 
              size={30} 
            />
          </View>
        </View>

        <View style={{ marginBottom: 20 }}>
          {matchSheet.jornada && <Text style={[s.chip, { color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'transparent' }]}>Jornada {matchSheet.jornada}</Text>}
          {matchSheet.torneoId?.nombre && <Text style={[s.chip, { color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'transparent' }]}>{matchSheet.torneoId.nombre}</Text>}
          {matchSheet.ubicacion && <Text style={[s.chip, { color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'transparent' }]}>{matchSheet.ubicacion.toUpperCase()}</Text>}
        </View>

        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingBottom: 4, marginBottom: 8 }}>SUPLENTES ({suplentesIds.length})</Text>
        <View style={{ gap: 8 }}>
          {suplentesIds.map(id => {
            const p = players.find(x => x._id === id || x._id === id._id);
            if(!p) return null;
            return (
              <View key={p._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {showPhotos && p.foto ? (
                  <Image src={p.foto} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#fff' }} />
                ) : (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}><Text style={{fontSize: 9, color: '#fff'}}>#{p.dorsal || '-'}</Text></View>
                )}
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#fff' }}>{p.dorsal ? `#${p.dorsal} ` : ''}{getPlayerFullName(p)}</Text>
              </View>
            )
          })}
        </View>
      </View>
    </Page>
  );
};

// --- CONVOCATORIA PDF ---
const CallUpPage = ({ matchSheet, team, players, convocados = [], noConvocados = [], horaQuedada, lugarQuedada, observaciones, fechaQuedada, showPhotos, translations }) => {
  const getGroup = (pos) => {
    const p = (pos || '').toUpperCase();
    if (p === 'POR' || p.includes('PORTERO')) return { order: 0, label: 'PORTEROS' };
    if (['DFC', 'LI', 'LD', 'CAI', 'CAD'].some((x) => p.includes(x)) || p.includes('DEFENSA') || p.includes('CENTRAL') || p.includes('LATERAL')) return { order: 1, label: 'DEFENSAS' };
    if (['MC', 'MCO', 'MCD', 'MI', 'MD'].some((x) => p.includes(x)) || p.includes('MEDIO') || p.includes('CENTRO')) return { order: 2, label: 'CENTROCAMPISTAS' };
    if (['DC', 'EI', 'ED', 'SD'].some((x) => p.includes(x)) || p.includes('DELANTERO') || p.includes('EXTREMO')) return { order: 3, label: 'DELANTEROS' };
    return { order: 4, label: 'OTROS' };
  };

  const grouped = convocados.map(id => players.find(p => p._id === id || p._id === id._id)).filter(Boolean).reduce((acc, p) => {
    const group = getGroup(p.posicion);
    if (!acc[group.label]) acc[group.label] = { order: group.order, players: [] };
    acc[group.label].players.push(p);
    return acc;
  }, {});

  const sortedGroups = Object.keys(grouped).sort((a, b) => grouped[a].order - grouped[b].order);

  return (
    <Page size="A4" style={baseStyles.page}>
      <PdfHeader title="CONVOCATORIA" subtitle={`vs ${matchSheet.rival}`} />
      <View style={baseStyles.content}>
        <PdfKitMatchup matchSheet={matchSheet} team={team} />
        <View style={s.grid4}>
          <View style={s.statCard}><Text style={s.statLabel}>Fecha Partido</Text><Text style={[s.statValue, { fontSize: FONT_SIZE.md, marginTop: 4 }]}>{formatDateSafe(matchSheet.fechaHora)} - {formatTimeSafe(matchSheet.fechaHora)}</Text></View>
          <View style={s.statCard}><Text style={s.statLabel}>Cita</Text><Text style={[s.statValue, { fontSize: FONT_SIZE.md, marginTop: 4 }]}>{fechaQuedada ? formatDateSafe(fechaQuedada) : formatDateSafe(matchSheet.fechaHora)} - {horaQuedada || formatTimeSafe(matchSheet.fechaHora)}</Text></View>
          <View style={s.statCard}><Text style={s.statLabel}>Lugar</Text><Text style={[s.statValue, { fontSize: FONT_SIZE.md, marginTop: 4 }]}>{lugarQuedada || matchSheet.ubicacion || '-'}</Text></View>
        </View>

        <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md }}>
          <View style={{ flex: 2 }}>
            <PdfSection title={`CONVOCADOS (${convocados.length})`}>
              {sortedGroups.map(groupName => (
                <View key={groupName} style={{ marginBottom: SPACING.sm }} wrap={false}>
                  <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: COLORS.primary, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, paddingBottom: 2, marginBottom: 6 }}>{groupName}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {grouped[groupName].players.map(p => (
                      <View key={p._id} style={{ width: '48%', flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        {showPhotos && p.foto ? (
                          <Image src={p.foto} style={{ width: 28, height: 28, borderRadius: 14 }} />
                        ) : (
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.bgSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{fontSize: 9, color: COLORS.primary}}>#{p.dorsal || '-'}</Text></View>
                        )}
                        <View>
                          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.text }}>{getPlayerFullName(p)}</Text>
                          <Text style={{ fontSize: 8, color: COLORS.textMuted }}>Dorsal: {p.dorsal || '-'}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </PdfSection>

            {observaciones && (
              <View style={[s.card, { backgroundColor: COLORS.bgHeader, marginTop: SPACING.sm }]}>
                <Text style={s.cardTitle}>Observaciones</Text>
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text }}>{observaciones}</Text>
              </View>
            )}
          </View>
          
          {noConvocados && noConvocados.length > 0 && (
            <View style={{ flex: 1 }}>
              <PdfSection title={`NO CONVOCADOS (${noConvocados.length})`}>
                <View style={{ gap: 6 }}>
                  {noConvocados.map(id => {
                    const p = players.find(x => x._id === id || x._id === id._id);
                    if (!p) return null;
                    return (
                      <View key={p._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {showPhotos && p.foto ? (
                          <Image src={p.foto} style={{ width: 20, height: 20, borderRadius: 10 }} />
                        ) : null}
                        <Text style={{ fontSize: 9, color: COLORS.textMuted }}>{getPlayerFullName(p)}</Text>
                      </View>
                    );
                  })}
                </View>
              </PdfSection>
            </View>
          )}
        </View>
      </View>
      <PdfFooter />
    </Page>
  );
};

// --- FICHA PARTIDO PDF ---
const resolvePlayer = (playerField, playersList) => {
  if (!playerField) return null;
  if (typeof playerField === 'object' && playerField.nombre) return playerField;
  const id = typeof playerField === 'object' ? (playerField._id || playerField.id) : playerField;
  return playersList?.find(p => p._id === id || p.id === id) || null;
};

const parseMinute = (value) => {
  const raw = String(value ?? '').trim();
  const normal = raw.replace(/\+.*/, '');
  const parsed = parseInt(normal, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortByMinute = (items = []) => [...items].sort((a, b) => parseMinute(a?.minuto) - parseMinute(b?.minuto));

const renderEventIcon = (tipo) => {
  if (tipo === 'gol' || tipo === 'golRival') {
    return (
      <View style={{ width: 12, height: 12, marginRight: 6 }}>
        <Svg width={12} height={12} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={10} fill="#ffffff" stroke="#1e293b" strokeWidth={1.5} />
          <Circle cx={12} cy={12} r={4} fill="#1e293b" />
          <Path d="M12 2 L12 8 M2 12 L8 12 M12 22 L12 16 M22 12 L16 12" stroke="#1e293b" strokeWidth={1.5} />
        </Svg>
      </View>
    );
  }
  if (tipo === 'amarilla') {
    return <View style={{ width: 8, height: 12, backgroundColor: '#fbbf24', borderRadius: 1.5, marginRight: 6, marginLeft: 2 }} />;
  }
  if (tipo === 'roja') {
    return <View style={{ width: 8, height: 12, backgroundColor: '#ef4444', borderRadius: 1.5, marginRight: 6, marginLeft: 2 }} />;
  }
  if (tipo === 'cambio') {
    return (
      <View style={{ width: 12, height: 12, marginRight: 6 }}>
        <Svg width={12} height={12} viewBox="0 0 24 24">
          <Path d="M6 13 L12 7 L18 13" stroke="#22c55e" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6 17 L12 23 L18 17" stroke="#ef4444" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    );
  }
  return null;
};

const MatchSheetPage = ({ matchSheet, team, players, titulares = [], suplentes = [], noConvocados = [], goles = [], golesRival = [], tarjetasAmarillas = [], tarjetasRojas = [], cambios = [], jugadoresPorEquipo, showPhotos, translations = {} }) => {
  const eventos = [
    ...sortByMinute(goles).map(g => ({ ...g, tipo: 'gol' })),
    ...sortByMinute(golesRival).map(g => ({ ...g, tipo: 'golRival', isRival: true })),
    ...sortByMinute(tarjetasAmarillas).map(t => ({ ...t, tipo: 'amarilla' })),
    ...sortByMinute(tarjetasRojas).map(t => ({ ...t, tipo: 'roja' })),
    ...sortByMinute(cambios).map(c => ({ ...c, tipo: 'cambio' }))
  ].sort((a, b) => parseMinute(a.minuto) - parseMinute(b.minuto));
  const playersPerTeam = getPlayersPerTeam(matchSheet, team, jugadoresPorEquipo);
  const ownFormation = matchSheet.alineacion || getDefaultFormation(playersPerTeam);
  const rivalFormation = matchSheet.alineacionRival || getDefaultFormation(playersPerTeam);

  const ownKit = matchSheet.equipacionPropia 
    || team?.equipaciones?.[matchSheet.equipacionPropiaKey || 'first'] 
    || DEFAULT_KITS[matchSheet.equipacionPropiaKey || 'first'];
  const ownGoalkeeperKit = matchSheet.equipacionPorteroPropia 
    || team?.equipaciones?.[matchSheet.equipacionPropiaKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'] 
    || DEFAULT_KITS[matchSheet.equipacionPropiaKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'];

  const rivalKit = matchSheet.equipacionRival 
    || matchSheet.rivalId?.equipaciones?.[matchSheet.equipacionRivalKey || 'first'] 
    || DEFAULT_RIVAL_KITS[matchSheet.equipacionRivalKey || 'first'];
  const rivalGoalkeeperKit = matchSheet.equipacionPorteroRival 
    || matchSheet.rivalId?.equipaciones?.[matchSheet.equipacionRivalKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'] 
    || DEFAULT_RIVAL_KITS[matchSheet.equipacionRivalKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'];

  return (
    <Page size="A4" style={baseStyles.page}>
      <PdfHeader title={translations.matchSheetTitle || "FICHA DE PARTIDO"} subtitle={`${team?.nombre || translations.team || 'Local'} vs ${matchSheet.rival}`} />
      <View style={baseStyles.content}>
        <PdfKitMatchup matchSheet={matchSheet} team={team} />
        <View style={s.grid4}>
          <View style={s.statCard}><Text style={s.statLabel}>{translations.date || 'Fecha'}</Text><Text style={[s.statValue, { fontSize: FONT_SIZE.md, marginTop: 4 }]}>{formatDateSafe(matchSheet.fechaHora)}</Text></View>
          <View style={s.statCard}><Text style={s.statLabel}>{translations.time || 'Hora'}</Text><Text style={[s.statValue, { fontSize: FONT_SIZE.md, marginTop: 4 }]}>{formatTimeSafe(matchSheet.fechaHora) || '-'}</Text></View>
          {matchSheet.jornada ? (
            <View style={s.statCard}><Text style={s.statLabel}>{translations.matchDay || 'Jornada'}</Text><Text style={[s.statValue, { fontSize: FONT_SIZE.md, marginTop: 4 }]}>{matchSheet.jornada}</Text></View>
          ) : null}
          <View style={s.statCard}><Text style={s.statLabel}>{translations.location || 'Ubicación'}</Text><Text style={[s.statValue, { fontSize: FONT_SIZE.md, marginTop: 4 }]}>{matchSheet.ubicacion || '-'}</Text></View>
        </View>

        {(matchSheet.golesLocal || matchSheet.golesVisitante) && (
          <View style={[s.card, { alignItems: 'center', backgroundColor: COLORS.bgHeader, paddingVertical: 20 }]}>
            <Text style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 8 }}>{translations.result || 'RESULTADO FINAL'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
               <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', color: COLORS.primary }}>{matchSheet.ubicacion === 'local' || matchSheet.ubicacion === 'Casa' ? team?.nombre : matchSheet.rival}</Text>
              <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                <Text style={{ fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#fff' }}>{matchSheet.golesLocal} - {matchSheet.golesVisitante}</Text>
              </View>
              <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', color: COLORS.primary }}>{matchSheet.ubicacion === 'local' || matchSheet.ubicacion === 'Casa' ? matchSheet.rival : team?.nombre}</Text>
            </View>
          </View>
        )}

        {(titulares.length > 0 || matchSheet.alineacionRival) && (
          <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md }}>
            <View style={{ flex: 1 }}>
              <PdfSection title={`${team?.nombre || 'Mi equipo'} (${ownFormation})`}>
                <SoccerField
                  lineup={[]}
                  players={players}
                  formation={ownFormation}
                  jugadoresPorEquipo={playersPerTeam}
                  showPhotos={showPhotos}
                  showNames={true}
                  width={230}
                  titulares={titulares}
                  kit={ownKit}
                  goalkeeperKit={ownGoalkeeperKit}
                />
              </PdfSection>
            </View>
            <View style={{ flex: 1 }}>
              <PdfSection title={`${matchSheet.rival || 'Rival'} (${rivalFormation})`}>
                <SoccerField
                  lineup={[]}
                  players={[]}
                  formation={rivalFormation}
                  jugadoresPorEquipo={playersPerTeam}
                  showPhotos={false}
                  showNames={true}
                  width={230}
                  titulares={[]}
                  kit={rivalKit}
                  goalkeeperKit={rivalGoalkeeperKit}
                />
              </PdfSection>
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md }}>
          <View style={{ flex: 1 }}>
            <PdfSection title={`TITULARES (${titulares.length})`}>
              <View style={s.table}>
                <View style={s.tableHeader}>
                  <Text style={[s.th, { flex: 0.5 }]}>#</Text>
                  <Text style={[s.th, { flex: 3 }]}>Jugador</Text>
                  <Text style={[s.th, { flex: 1 }]}>Pos</Text>
                </View>
                {titulares.map(id => {
                  const p = players.find(x => x._id === id || x._id === id._id);
                  if (!p) return null;
                  return (
                    <View key={p._id} style={s.tableRow}>
                      <Text style={[s.td, { flex: 0.5 }]}>{p.dorsal || '-'}</Text>
                      <Text style={[s.td, { flex: 3, fontFamily: 'Helvetica-Bold' }]}>{getPlayerFullName(p)}</Text>
                      <Text style={[s.td, { flex: 1 }]}>{p.posicion || '-'}</Text>
                    </View>
                  );
                })}
              </View>
            </PdfSection>
          </View>
          <View style={{ flex: 1 }}>
            <PdfSection title={`SUPLENTES (${suplentes.length})`}>
              <View style={s.table}>
                <View style={s.tableHeader}>
                  <Text style={[s.th, { flex: 0.5 }]}>#</Text>
                  <Text style={[s.th, { flex: 3 }]}>Jugador</Text>
                  <Text style={[s.th, { flex: 1 }]}>Pos</Text>
                </View>
                {suplentes.map(id => {
                  const p = players.find(x => x._id === id || x._id === id._id);
                  if (!p) return null;
                  return (
                    <View key={p._id} style={s.tableRow}>
                      <Text style={[s.td, { flex: 0.5 }]}>{p.dorsal || '-'}</Text>
                      <Text style={[s.td, { flex: 3, fontFamily: 'Helvetica-Bold' }]}>{getPlayerFullName(p)}</Text>
                      <Text style={[s.td, { flex: 1 }]}>{p.posicion || '-'}</Text>
                    </View>
                  );
                })}
              </View>
            </PdfSection>

            {eventos.length > 0 && (
              <PdfSection title="INCIDENCIAS DEL PARTIDO" style={{ marginTop: SPACING.md }}>
                <View style={[s.card, { paddingVertical: 6, paddingHorizontal: 10 }]}>
                  {eventos.map((ev, i) => {
                    const resolvedMinuto = ev.minuto || '0';
                    let content = null;

                    if (ev.tipo === 'cambio') {
                      const sale = resolvePlayer(ev.sale, players);
                      const entra = resolvePlayer(ev.entra, players);
                      content = (
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Text style={{ fontSize: FONT_SIZE.xs, color: '#22c55e', fontFamily: 'Helvetica-Bold' }}>
                            {entra ? getPlayerFullName(entra) : '-'}
                          </Text>
                          <Text style={{ fontSize: FONT_SIZE.xs - 1, color: COLORS.textMuted, marginLeft: 2, marginRight: 4 }}>
                            (Entra)
                          </Text>
                          <Text style={{ fontSize: FONT_SIZE.xs - 2, color: COLORS.textMuted, marginRight: 4 }}>
                            ➔
                          </Text>
                          <Text style={{ fontSize: FONT_SIZE.xs, color: '#ef4444', fontFamily: 'Helvetica-Bold' }}>
                            {sale ? getPlayerFullName(sale) : '-'}
                          </Text>
                          <Text style={{ fontSize: FONT_SIZE.xs - 1, color: COLORS.textMuted, marginLeft: 2 }}>
                            (Sale)
                          </Text>
                        </View>
                      );
                    } else if (ev.isRival) {
                      content = (
                        <Text style={{ fontSize: FONT_SIZE.xs, color: '#ef4444', flex: 1 }}>
                          Gol Rival: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{matchSheet.rival || 'Rival'}</Text>
                        </Text>
                      );
                    } else {
                      const p = resolvePlayer(ev.jugador, players);
                      let label = '';
                      if (ev.tipo === 'amarilla') label = 'Tarjeta Amarilla: ';
                      else if (ev.tipo === 'roja') label = 'Tarjeta Roja: ';
                      else label = 'Gol: ';
                      
                      content = (
                        <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text, flex: 1 }}>
                          {label}<Text style={{ fontFamily: 'Helvetica-Bold' }}>{p ? getPlayerFullName(p) : 'Desconocido'}</Text>
                          {ev.tipoDetalle ? ` (${ev.tipoDetalle})` : ''}
                        </Text>
                      );
                    }

                    return (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
                        <Text style={{ width: 28, fontSize: FONT_SIZE.xs, fontFamily: 'Helvetica-Bold', color: COLORS.primary }}>{resolvedMinuto}'</Text>
                        <View style={{ width: 18, alignItems: 'center', justifyContent: 'center' }}>
                          {renderEventIcon(ev.tipo)}
                        </View>
                        {content}
                      </View>
                    );
                  })}
                </View>
              </PdfSection>
            )}
          </View>
        </View>

        {matchSheet.observaciones && (
          <PdfSection title="Observaciones Generales" style={{ marginTop: SPACING.md }}>
            <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text }}>{matchSheet.observaciones}</Text>
          </PdfSection>
        )}

      </View>
      <PdfFooter />
    </Page>
  );
};


// ── EXPORTACIÓN ASÍNCRONA ──────────────────────────────────────────

export const generateLineupPdf = async ({ matchSheet, team, players, lineup, formation, jugadoresPorEquipo, showPhotos, showNames, translations }) => {
  const fileName = `alineacion_${matchSheet.rival.replace(/\s+/g, '_')}`;
  await renderPdf(<Document><LineupPage matchSheet={matchSheet} team={team} players={players} lineup={lineup} formation={formation} jugadoresPorEquipo={jugadoresPorEquipo} showPhotos={showPhotos} showNames={showNames} translations={translations} /></Document>, fileName);
};

export const generateCallUpPdf = async ({ matchSheet, team, players, convocados, noConvocados, horaQuedada, lugarQuedada, observaciones, fechaQuedada, showPhotos, translations }) => {
  const fileName = `convocatoria_${matchSheet.rival.replace(/\s+/g, '_')}`;
  await renderPdf(<Document><CallUpPage matchSheet={matchSheet} team={team} players={players} convocados={convocados} noConvocados={noConvocados} horaQuedada={horaQuedada} lugarQuedada={lugarQuedada} observaciones={observaciones} fechaQuedada={fechaQuedada} showPhotos={showPhotos} translations={translations} /></Document>, fileName);
};

export const generateMatchSheetPdf = async ({ matchSheet, team, players, titulares, suplentes, noConvocados, goles, golesRival, tarjetasAmarillas, tarjetasRojas, cambios, jugadoresPorEquipo, showPhotos, translations }) => {
  const fileName = `ficha_partido_${matchSheet.rival.replace(/\s+/g, '_')}`;
  await renderPdf(<Document><MatchSheetPage matchSheet={matchSheet} team={team} players={players} titulares={titulares} suplentes={suplentes} noConvocados={noConvocados} goles={goles} golesRival={golesRival} tarjetasAmarillas={tarjetasAmarillas} tarjetasRojas={tarjetasRojas} cambios={cambios} jugadoresPorEquipo={jugadoresPorEquipo} showPhotos={showPhotos} translations={translations} /></Document>, fileName);
};
