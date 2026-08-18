import { useRef, useState } from 'react';
import styled from 'styled-components';
import { MdAdd, MdClose, MdDeleteOutline, MdDragIndicator } from 'react-icons/md';
import { Button, Input, Label } from '@/ui/primitives';
import { FieldBackground } from '@/features/matchSheet/LineupField';
import { ALINEACIONES_BY_PLAYER_COUNT, getFormationSlots, POSITION_COLORS } from '@/features/matchSheet/formations';

const PITCH_ROWS = (formation = '') => {
  const rows = String(formation || '1-4-4-2').split('-').map(Number).filter(Boolean);
  return rows.length > 1 && rows[0] === 1 ? rows.slice(1) : rows;
};

export const defaultPositions = (formation, count = 11) => {
  const lineupSlots = getFormationSlots(count, formation);
  if (lineupSlots.length === count) return lineupSlots.map(({ x, y, pos }) => ({ x, y, position: pos }));

  const rows = PITCH_ROWS(formation);
  const positions = [{ x: 50, y: 92, position: 'POR' }];
  const usableRows = rows.length ? rows : [4, 4, 2];
  let index = 0;
  usableRows.forEach((rowCount, rowIndex) => {
    const y = 74 - (rowIndex * (56 / Math.max(1, usableRows.length - 1)));
    for (let column = 0; column < rowCount && index < count - 1; column += 1) {
      positions.push({
        x: rowCount === 1 ? 50 : 12 + (column * (76 / (rowCount - 1))),
        y,
        position: rowIndex === 0 ? 'DFC' : rowIndex === usableRows.length - 1 ? 'DC' : 'MC',
      });
      index += 1;
    }
  });
  while (positions.length < count) positions.push({ x: 50, y: 50, position: '' });
  return positions.slice(0, count);
};

const parsePlayer = (value, index, formation, count = 11) => {
  if (typeof value === 'string') {
    const match = value.match(/^\s*(\d{1,2})\s*[.)\-:]?\s*(.+)$/);
    value = { number: match?.[1] || '', name: (match?.[2] || value).trim() };
  }
  const fallback = defaultPositions(formation, count)[index] || { x: 50, y: 50, position: '' };
  return {
    number: String(value?.number || value?.shirtNumber || value?.dorsal || '').trim(),
    name: String(value?.name || value?.nombre || value?.player || '').trim(),
    x: Number.isFinite(Number(value?.x)) ? Number(value.x) : fallback.x,
    y: Number.isFinite(Number(value?.y)) ? Number(value.y) : fallback.y,
    position: value?.position || fallback.position,
  };
};

const normalizeTeam = (team = {}, fallback = {}) => {
  const formation = team.formation || fallback.formation || '1-4-4-2';
  const source = Array.isArray(team.players) && team.players.length
    ? team.players
    : Array.isArray(fallback.players) && fallback.players.length
      ? fallback.players
      : Array.isArray(team.lineup) ? team.lineup : [];
  const count = source.length || 11;
  return {
    formation,
    players: Array.from({ length: count }, (_, index) => parsePlayer(source[index], index, formation, count)),
  };
};

export const normalizeCampograms = (value, teamA = {}, teamB = {}) => {
  const phases = Array.isArray(value) && value.length ? value : [{ minute: '0', label: '', teamA, teamB }];
  return phases.map((phase, index) => ({
    minute: String(phase?.minute ?? (index === 0 ? '0' : '')).trim(),
    label: String(phase?.label || '').trim(),
    teamA: normalizeTeam(phase?.teamA, teamA),
    teamB: normalizeTeam(phase?.teamB, teamB),
  }));
};

const Shell = styled.div`display:flex;flex-direction:column;gap:16px;min-width:0;`;
const PhaseBar = styled.div`
  display:flex;gap:8px;align-items:center;overflow-x:auto;padding:2px 2px 7px;scrollbar-width:thin;
  > * { flex:0 0 auto; }
`;
const PhaseButton = styled.button`
  min-height:40px;padding:8px 13px;border:1px solid ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
  border-radius:${({ theme }) => theme.radius.full};background:${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.surface};
  color:${({ theme, $active }) => $active ? theme.colors.onPrimary : theme.colors.text};box-shadow:${({ $active, theme }) => $active ? theme.shadows.sm : 'none'};
  font:inherit;font-size:12px;font-weight:800;cursor:pointer;
`;
const EditorGrid = styled.div`
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start;
  @media(max-width:1080px){grid-template-columns:1fr;}
`;
const TeamPanel = styled.section`
  min-width:0;padding:12px;border:1px solid ${({ theme }) => theme.colors.border};border-radius:${({ theme }) => theme.radius.lg};
  background:${({ theme }) => theme.colors.surface};box-shadow:${({ theme }) => theme.shadows.sm};display:flex;flex-direction:column;gap:10px;
  @media(max-width:600px){padding:8px;border-radius:${({ theme }) => theme.radius.md};}
`;
const TeamHeader = styled.div`
  display:flex;justify-content:space-between;align-items:center;gap:10px;color:${({ theme }) => theme.colors.text};
  @media(max-width:420px){align-items:stretch;flex-direction:column;}
`;
const TeamName = styled.div`
  min-width:0;
  strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;}
  span{color:${({ theme }) => theme.colors.textSecondary};font-size:11px;}
`;
const HeaderActions = styled.div`
  display:flex;align-items:center;gap:7px;flex:0 0 auto;
  @media(max-width:420px){width:100%;select{flex:1;max-width:none;}}
`;
const PitchFrame = styled.div`position:relative;width:min(100%,470px);margin:0 auto;`;
const PitchSurface = styled.div`
  position:relative;width:100%;aspect-ratio:100/142;overflow:hidden;border-radius:14px;background:#2f7a2f;
  box-shadow:0 8px 24px rgba(15,23,42,.25);touch-action:none;user-select:none;
`;
const FieldSvg = styled.svg`position:absolute;inset:0;width:100%;height:100%;display:block;`;
const Token = styled.button`
  position:absolute;z-index:2;transform:translate(-50%,-50%);width:clamp(34px,4vw,46px);aspect-ratio:1;padding:0;display:grid;place-items:center;
  border:3px solid ${({ $selected, $position }) => $selected ? '#fde047' : (POSITION_COLORS[$position] || '#fff')};border-radius:50%;
  background:${({ $side }) => $side === 'A' ? 'linear-gradient(145deg,#2563eb,#1e3a8a)' : 'linear-gradient(145deg,#ef4444,#991b1b)'};
  color:#fff;box-shadow:0 3px 9px rgba(0,0,0,.42);cursor:grab;font:inherit;font-size:clamp(11px,1.6vw,14px);font-weight:900;
  &:active{cursor:grabbing;}&:focus-visible{outline:3px solid #fff;outline-offset:2px;}
`;
const PlayerName = styled.span`
  position:absolute;top:calc(100% + 5px);left:50%;transform:translateX(-50%);max-width:clamp(76px,12vw,112px);padding:2px 6px;
  border-radius:6px;background:rgba(2,6,23,.76);color:#fff;font-size:clamp(9px,1.2vw,11px);font-weight:800;line-height:1.25;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;
`;
const PositionTag = styled.span`
  position:absolute;top:-8px;right:-8px;min-width:20px;padding:2px 4px;border-radius:999px;background:#fff;color:#0f172a;
  font-size:7px;font-weight:900;box-shadow:0 1px 4px rgba(0,0,0,.3);pointer-events:none;
`;
const DirectEditor = styled.div`
  position:absolute;z-index:5;left:10px;right:10px;bottom:10px;display:grid;grid-template-columns:64px minmax(0,1fr) 92px 38px 38px;
  gap:7px;align-items:end;padding:10px;border:1px solid rgba(255,255,255,.28);border-radius:12px;background:rgba(15,23,42,.94);
  box-shadow:0 10px 28px rgba(0,0,0,.38);backdrop-filter:blur(10px);
  label{color:#cbd5e1;font-size:9px;text-transform:uppercase;letter-spacing:.45px;}input{min-width:0;min-height:36px;padding:7px 8px;}
  @media(max-width:600px){position:relative;inset:auto;grid-template-columns:58px minmax(0,1fr) 76px;margin-top:8px;background:${({ theme }) => theme.colors.backgroundAlt};border-color:${({ theme }) => theme.colors.border};box-shadow:none;label{color:${({ theme }) => theme.colors.textSecondary};}}
`;
const EditorField = styled.div`display:flex;flex-direction:column;gap:3px;min-width:0;`;
const IconButton = styled.button`
  width:38px;height:38px;display:grid;place-items:center;border:1px solid ${({ theme }) => theme.colors.border};border-radius:${({ theme }) => theme.radius.md};
  background:${({ theme }) => theme.colors.surface};color:${({ theme, $danger }) => $danger ? theme.colors.error : theme.colors.textSecondary};cursor:pointer;
`;
const Hint = styled.p`
  margin:0;display:flex;align-items:center;justify-content:center;gap:5px;color:${({ theme }) => theme.colors.textSecondary};font-size:11px;line-height:1.4;text-align:center;
`;
const Grid = styled.div`
  display:grid;grid-template-columns:repeat(${({ $columns = 2 }) => $columns},minmax(0,1fr));gap:12px;
  @media(max-width:720px){grid-template-columns:1fr;}
`;
const Section = styled.section`display:flex;flex-direction:column;gap:10px;break-inside:avoid;`;
const SectionTitle = styled.h3`margin:0;color:${({ theme }) => theme.colors.text};font-size:15px;`;
const Select = styled.select`
  min-height:38px;max-width:155px;padding:7px 9px;border:1px solid ${({ theme }) => theme.colors.inputBorder};border-radius:${({ theme }) => theme.radius.md};
  background:${({ theme }) => theme.colors.inputBg};color:${({ theme }) => theme.colors.text};font:inherit;font-size:12px;
`;

function PitchBoard({ side, team, editable = false, onChange, t }) {
  const pitchRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [selected, setSelected] = useState(null);
  const players = team.players || [];
  const updatePlayer = (index, patch) => onChange?.({ players: players.map((player, playerIndex) => playerIndex === index ? { ...player, ...patch } : player) });
  const movePlayer = (event) => {
    if (!editable || dragging == null || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    updatePlayer(dragging, {
      x: Math.max(5, Math.min(95, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(5, Math.min(95, ((event.clientY - rect.top) / rect.height) * 100)),
    });
  };
  const selectedPlayer = selected == null ? null : players[selected];

  return (
    <PitchFrame>
      <PitchSurface ref={pitchRef} onPointerMove={movePlayer} onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)}>
        <FieldSvg viewBox="0 0 100 142" preserveAspectRatio="none" aria-hidden="true"><FieldBackground /></FieldSvg>
        {players.map((player, index) => (
          <Token
            key={index}
            type="button"
            $side={side}
            $position={player.position}
            $selected={selected === index}
            style={{ left: `${player.x}%`, top: `${player.y}%` }}
            onClick={(event) => { event.stopPropagation(); if (editable) setSelected(index); }}
            onPointerDown={(event) => { if (!editable) return; event.currentTarget.setPointerCapture(event.pointerId); setDragging(index); setSelected(index); }}
            aria-label={`${player.number || player.position || '–'} ${player.name || t('opponentMatch.campogram.emptyPlayer')}`}
          >
            {player.number || (!editable || player.name ? player.position : '+') || '–'}
            {player.position ? <PositionTag>{player.position}</PositionTag> : null}
            {player.name ? <PlayerName>{player.name}</PlayerName> : null}
          </Token>
        ))}
      </PitchSurface>
      {editable && selectedPlayer ? (
        <DirectEditor>
          <EditorField><Label>{t('opponentMatch.fields.shirtNumber')}</Label><Input inputMode="numeric" maxLength={2} value={selectedPlayer.number} onChange={(event) => updatePlayer(selected, { number: event.target.value.replace(/\D/g, '').slice(0, 2) })} /></EditorField>
          <EditorField><Label>{t('opponentMatch.fields.playerName')}</Label><Input autoFocus value={selectedPlayer.name} placeholder={t('opponentMatch.placeholders.playerName')} onChange={(event) => updatePlayer(selected, { name: event.target.value })} /></EditorField>
          <EditorField><Label>{t('opponentMatch.campogram.position')}</Label><Input value={selectedPlayer.position} placeholder="MC" onChange={(event) => updatePlayer(selected, { position: event.target.value.toUpperCase().slice(0, 5) })} /></EditorField>
          <IconButton type="button" $danger onClick={() => { onChange({ players: players.filter((_, index) => index !== selected) }); setSelected(null); }} aria-label={t('opponentMatch.actions.removePlayer')}><MdDeleteOutline /></IconButton>
          <IconButton type="button" onClick={() => setSelected(null)} aria-label={t('opponentMatch.campogram.closeEditor')}><MdClose /></IconButton>
        </DirectEditor>
      ) : null}
    </PitchFrame>
  );
}

function TeamCampogram({ side, name, team, onChange, t }) {
  const players = team.players || [];
  const changeFormation = (formation) => {
    const positions = defaultPositions(formation, players.length || 11);
    onChange({ formation, players: players.map((player, index) => ({ ...player, ...positions[index] })) });
  };
  const addPlayer = () => {
    const positions = defaultPositions(team.formation, players.length + 1);
    onChange({ players: [...players, { number: '', name: '', ...positions.at(-1) }] });
  };

  return (
    <TeamPanel>
      <TeamHeader>
        <TeamName><strong>{name}</strong><span>{t('opponentMatch.campogram.players', { count: players.length })}</span></TeamName>
        <HeaderActions>
          <Select aria-label={`${t('opponentMatch.fields.formation')} ${name}`} value={team.formation} onChange={(event) => changeFormation(event.target.value)}>
            <option value="">{t('common.select')}</option>
            {ALINEACIONES_BY_PLAYER_COUNT[11].map((formation) => <option key={formation} value={formation}>{formation}</option>)}
          </Select>
          <IconButton type="button" onClick={addPlayer} aria-label={t('opponentMatch.actions.addPlayer')}><MdAdd /></IconButton>
        </HeaderActions>
      </TeamHeader>
      <PitchBoard side={side} team={team} editable onChange={onChange} t={t} />
      <Hint><MdDragIndicator size={17} /> {t('opponentMatch.campogram.directEditHint')}</Hint>
    </TeamPanel>
  );
}

export function CampogramEditor({ value, onChange, teamNames, t }) {
  const phases = value?.length ? value : normalizeCampograms();
  const [active, setActive] = useState(0);
  const currentIndex = Math.min(active, phases.length - 1);
  const current = phases[currentIndex] || phases[0];
  const updatePhase = (patch) => onChange(phases.map((phase, index) => index === currentIndex ? { ...phase, ...patch } : phase));
  const updateTeam = (letter, patch) => updatePhase({ [`team${letter}`]: { ...current[`team${letter}`], ...patch } });
  const addPhase = () => {
    const next = {
      ...current,
      minute: '',
      label: '',
      teamA: { ...current.teamA, players: current.teamA.players.map((player) => ({ ...player })) },
      teamB: { ...current.teamB, players: current.teamB.players.map((player) => ({ ...player })) },
    };
    onChange([...phases, next]);
    setActive(phases.length);
  };
  const removePhase = () => {
    if (phases.length === 1) return;
    onChange(phases.filter((_, index) => index !== currentIndex));
    setActive(Math.max(0, currentIndex - 1));
  };

  return (
    <Shell>
      <PhaseBar>
        {phases.map((phase, index) => <PhaseButton key={index} type="button" $active={index === currentIndex} onClick={() => setActive(index)}>{phase.minute ? `${phase.minute}' · ` : ''}{phase.label || (index === 0 ? t('opponentMatch.campogram.initial') : t('opponentMatch.campogram.phase', { n: index + 1 }))}</PhaseButton>)}
        <Button type="button" $variant="secondary" onClick={addPhase}><MdAdd /> {t('opponentMatch.campogram.addPhase')}</Button>
        {phases.length > 1 ? <IconButton type="button" $danger onClick={removePhase} aria-label={t('opponentMatch.campogram.removePhase')}><MdDeleteOutline /></IconButton> : null}
      </PhaseBar>
      <Grid $columns={2}>
        <div><Label htmlFor="campogram-minute">{t('opponentMatch.campogram.minute')}</Label><Input id="campogram-minute" inputMode="numeric" value={current.minute} onChange={(event) => updatePhase({ minute: event.target.value })} placeholder="0 / 60" /></div>
        <div><Label htmlFor="campogram-label">{t('opponentMatch.campogram.label')}</Label><Input id="campogram-label" value={current.label} onChange={(event) => updatePhase({ label: event.target.value })} placeholder={t('opponentMatch.campogram.start')} /></div>
      </Grid>
      <EditorGrid>
        <TeamCampogram side="A" name={teamNames.teamA} team={current.teamA} onChange={(patch) => updateTeam('A', patch)} t={t} />
        <TeamCampogram side="B" name={teamNames.teamB} team={current.teamB} onChange={(patch) => updateTeam('B', patch)} t={t} />
      </EditorGrid>
    </Shell>
  );
}

export function CampogramView({ campograms = [], teamNames, t }) {
  return (
    <Shell>
      {campograms.map((phase, phaseIndex) => (
        <Section key={phaseIndex}>
          <SectionTitle>{phase.minute ? `${phase.minute}' · ` : ''}{phase.label || (phaseIndex === 0 ? t('opponentMatch.campogram.initial') : t('opponentMatch.campogram.phase', { n: phaseIndex + 1 }))}</SectionTitle>
          <EditorGrid>
            {['A', 'B'].map((letter) => (
              <TeamPanel key={letter}>
                <TeamHeader><TeamName><strong>{teamNames[`team${letter}`]}</strong><span>{phase[`team${letter}`]?.formation || '—'}</span></TeamName></TeamHeader>
                <PitchBoard side={letter} team={phase[`team${letter}`] || { players: [] }} t={t} />
              </TeamPanel>
            ))}
          </EditorGrid>
        </Section>
      ))}
    </Shell>
  );
}
