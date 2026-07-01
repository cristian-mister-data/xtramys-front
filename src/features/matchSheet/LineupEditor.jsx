import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdClear, MdAutoFixHigh } from 'react-icons/md';
import LineupField from './LineupField';
import { getFormationSlots, POSITION_COLORS } from './formations';
import { Button, Row, Muted } from '@/ui/primitives';
import { cdnUrl } from '@/config';
import { getPlayerFirstName, getPlayerFullName } from '@/utils/playerHelpers';

// LineupEditor — visual tap-to-place lineup builder.
// Props:
//  - players: full team players
//  - convocadosIds: string[]
//  - titularesIds: string[]            (length up to playerCount)
//  - suplentesIds: string[]
//  - playerCount: 7 | 8 | 11
//  - formation: e.g. '1-4-4-2'
//  - onChange: ({ titulares, suplentes }) => void

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(150px, 180px) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 560px;
  overflow-y: auto;
  padding: 6px;
  background: ${({ theme }) => theme.colors.surfaceAlt || '#f5f5f5'};
  border-radius: 10px;
  @media (max-width: 768px) {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    max-height: none;
    order: 2;
    padding: 2px 0;
  }
`;

const FieldWrap = styled.div`
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  @media (max-width: 768px) {
    order: 1;
  }
`;

const PlayerChip = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 2px solid ${({ $selected }) => ($selected ? '#1a237e' : 'transparent')};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  min-width: 0;
  flex: 0 0 auto;
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a237e, #5c6bc0);
  color: #fff;
  font-weight: 800;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
`;

const Name = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const ListSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
`;

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.muted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StarterPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: ${({ $color }) => `${$color}22`};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color};
  font-size: 11px;
  font-weight: 700;
`;

export default function LineupEditor({
  players = [],
  convocadosIds = [],
  titularesIds = [],
  suplentesIds = [],
  playerCount = 11,
  formation = '1-4-4-2',
  onChange,
}) {
  const { t } = useTranslation();
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const slots = useMemo(
    () => getFormationSlots(playerCount, formation),
    [playerCount, formation]
  );

  const convocadosPlayers = useMemo(
    () => convocadosIds.map((id) => players.find((p) => p._id === id)).filter(Boolean),
    [convocadosIds, players]
  );

  const availableForSidebar = useMemo(
    () => convocadosPlayers.filter((p) => !titularesIds.includes(p._id)),
    [convocadosPlayers, titularesIds]
  );

  const updateLineup = (nextTitulares) => {
    // Remove duplicates and trim to playerCount slots
    const tit = nextTitulares.slice(0, slots.length);
    // Suplentes = convocados minus titulares
    const sup = convocadosIds.filter((id) => !tit.includes(id));
    onChange?.({ titulares: tit, suplentes: sup });
  };

  const handleSlotClick = (slotIdx, currentPlayerId) => {
    const next = [...titularesIds];
    // ensure correct length
    while (next.length < slots.length) next.push(null);
    if (selectedPlayerId) {
      // If the selected player is already in another slot, swap
      const prevIdx = next.indexOf(selectedPlayerId);
      if (prevIdx !== -1 && prevIdx !== slotIdx) next[prevIdx] = currentPlayerId || null;
      next[slotIdx] = selectedPlayerId;
      setSelectedPlayerId(null);
    } else if (currentPlayerId) {
      // Empty the slot
      next[slotIdx] = null;
    }
    // Compact nulls? No — keep slot positions; convert to ids array same length as slots
    const cleaned = next.slice(0, slots.length).map((x) => x || null);
    updateLineup(cleaned.filter(Boolean).concat(cleaned.filter((x) => !x).map(() => null)).slice(0, slots.length));
    // The above keeps starter ids in slot order; null entries sink to the end.
    // We actually want positional preservation — pass through directly:
    // Restore positional version (overrides above):
    onChange?.({
      titulares: cleaned.filter((x) => x !== null && x !== undefined),
      suplentes: convocadosIds.filter((id) => !cleaned.includes(id)),
    });
  };

  const handleAutoFill = () => {
    const next = [];
    for (const p of convocadosPlayers) {
      if (next.length >= slots.length) break;
      next.push(p._id);
    }
    updateLineup(next);
  };

  const handleClear = () => updateLineup([]);

  return (
    <div>
      <Row $gap={8} style={{ justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap' }}>
        <Muted style={{ fontSize: 13 }}>
          {t('matchSheet.lineupHelp', 'Selecciona un jugador y toca una posición')} · {titularesIds.length}/{slots.length}
        </Muted>
        <Row $gap={6}>
          <Button type="button" $variant="ghost" onClick={handleAutoFill} disabled={!convocadosIds.length}>
            <MdAutoFixHigh /> {t('matchSheet.autoFill', 'Autollenar')}
          </Button>
          <Button type="button" $variant="ghost" onClick={handleClear} disabled={!titularesIds.length}>
            <MdClear /> {t('common.clear', 'Limpiar')}
          </Button>
        </Row>
      </Row>

      <Layout>
        <Sidebar>
          {availableForSidebar.length === 0 ? (
            <Muted style={{ fontSize: 12, padding: 8 }}>
              {convocadosIds.length === 0
                ? t('matchSheet.noCallups', 'Selecciona convocados primero')
                : t('matchSheet.allPlaced', 'Todos colocados')}
            </Muted>
          ) : (
            availableForSidebar.map((p) => (
              <PlayerChip
                key={p._id}
                type="button"
                $selected={selectedPlayerId === p._id}
                onClick={() => setSelectedPlayerId(selectedPlayerId === p._id ? null : p._id)}
              >
                <Avatar>
                  {p.foto ? <img src={cdnUrl(p.foto)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.dorsal ?? '?')}
                </Avatar>
                <Name>{getPlayerFirstName(p)}</Name>
              </PlayerChip>
            ))
          )}
        </Sidebar>

        <FieldWrap>
          <LineupField
            slots={slots}
            players={players}
            starterIds={titularesIds}
            slotSize={48}
            selectedPlayerId={selectedPlayerId}
            onSlotClick={handleSlotClick}
          />
        </FieldWrap>
      </Layout>

      {suplentesIds.length > 0 ? (
        <ListSection>
          <SectionLabel>{t('matchSheet.substitutes', 'Suplentes')} ({suplentesIds.length})</SectionLabel>
          <Row $gap={6} $wrap>
            {suplentesIds.map((id) => {
              const p = players.find((x) => x._id === id);
              if (!p) return null;
              return (
                <StarterPill key={id} $color={POSITION_COLORS.MC}>
                  {p.dorsal ?? '?'} · {getPlayerFullName(p)}
                </StarterPill>
              );
            })}
          </Row>
        </ListSection>
      ) : null}
    </div>
  );
}
