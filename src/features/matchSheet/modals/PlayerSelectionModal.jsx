import { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdSearch, MdCheck, MdClose } from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Input, Row, Muted } from '@/ui/primitives';
import { cdnUrl } from '@/config';
import { getPositionColor, getPlayerInitials, translatePosition } from '@/components/player/playerHelpers';
import { getPlayerFullName } from '@/utils/playerHelpers';

const SearchWrap = styled.div`
  position: relative;
  margin-bottom: 12px;
  svg {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.textMuted};
    pointer-events: none;
  }
  input { padding-left: 38px; }
`;

const PlayerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    max-height: 340px;
  }
`;

const PlayerCard = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: ${({ $selected, theme }) => $selected ? '#eff6ff' : theme.colors.surface};
  border: 2px solid ${({ $selected, theme }) => $selected ? theme.colors.primary : theme.colors.border};
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.15s ease;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primarySoft};
  }
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const Avatar = styled.div`
  width: 40px; height: 40px;
  border-radius: 50%;
  background: ${({ $color, theme }) => $color || theme.gradients.primary};
  color: #ffffff;
  font-weight: 800;
  font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const PlayerName = styled.div`
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
`;

const PlayerMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
`;

const Dorsal = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textMuted};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  padding: 1px 6px;
  border-radius: 4px;
`;

const Position = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: ${({ $pos }) => getPositionColor($pos)};
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const SanctionBadge = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: #dc2626;
  background: #fee2e2;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const CheckBadge = styled.div`
  width: 22px; height: 22px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  svg { font-size: 14px; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px 16px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default function PlayerSelectionModal({
  open,
  onClose,
  players = [],
  selectedIds: initialSelected = [],
  onConfirm,
  title,
  multi = true,
  excludeIds = [],
  maxSelection = null,
  sanctionedPlayerIds = [],
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(initialSelected);

  useEffect(() => {
    if (open) {
      setSelectedIds(initialSelected);
      setSearch('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players
      .filter((p) => !excludeIds.includes(p._id))
      .filter((p) => !q || getPlayerFullName(p).toLowerCase().includes(q) || String(p.dorsal || '').includes(q));
  }, [players, search, excludeIds]);

  const toggle = (id) => {
    if (!multi) {
      onConfirm?.([id]);
      onClose?.();
      return;
    }
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) return prev.filter((x) => x !== id);
      if (maxSelection && prev.length >= maxSelection) return prev;
      return [...prev, id];
    });
  };

  const isSelected = (id) => selectedIds.includes(id);

  const selectAll = () => setSelectedIds(filtered.map((p) => p._id));
  const clearAll = () => setSelectedIds([]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || t('matchSheet.selectPlayers', 'Seleccionar jugadores')}
      width={multi ? 580 : 480}
      footer={
        multi ? (
          <Row style={{ justifyContent: 'space-between', width: '100%' }}>
            <Row $gap={6}>
              <Button type="button" $variant="ghost" onClick={selectAll}>
                {t('common.selectAll', 'Todos')}
              </Button>
              <Button type="button" $variant="ghost" onClick={clearAll}>
                {t('common.clear', 'Limpiar')}
              </Button>
            </Row>
            <Row $gap={8}>
              <Button type="button" $variant="ghost" onClick={onClose}>
                {t('common.cancel', 'Cancelar')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onConfirm?.(selectedIds);
                  onClose?.();
                }}
              >
                {t('common.confirm', 'Confirmar')} ({selectedIds.length})
              </Button>
            </Row>
          </Row>
        ) : null
      }
    >
      <SearchWrap>
        <MdSearch size={18} />
        <Input
          placeholder={multi ? t('matchSheet.searchPlayers', 'Buscar jugador por nombre o dorsal...') : t('common.search', 'Buscar...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
          >
            <MdClose size={18} />
          </button>
        )}
      </SearchWrap>

      {filtered.length === 0 ? (
        <EmptyState>
          <Muted>{search ? t('matchSheet.noPlayersFound', 'No se encontraron jugadores') : t('matchSheet.noPlayers', 'No hay jugadores')}</Muted>
        </EmptyState>
      ) : (
        <PlayerGrid>
          {filtered.map((p) => {
            const sel = isSelected(p._id);
            const pos = p.posicion || p.position || '';
            return (
              <PlayerCard key={p._id} type="button" $selected={sel} onClick={() => toggle(p._id)}>
                <Avatar $color={getPositionColor(pos)}>
                  {p.foto ? (
                    <img src={cdnUrl(p.foto)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getPlayerInitials(p)
                  )}
                </Avatar>
                <Info>
                  <PlayerName>{getPlayerFullName(p) || t('matchSheet.unknown', 'Sin nombre')}</PlayerName>
                  <PlayerMeta>
                    {p.dorsal != null && <Dorsal>#{p.dorsal}</Dorsal>}
                    {pos && <Position $pos={pos}>{translatePosition(pos, t)}</Position>}
                    {sanctionedPlayerIds.includes(p._id) && (
                      <SanctionBadge>
                        {t('tournaments.sanctioned', 'Sancionado')}
                      </SanctionBadge>
                    )}
                  </PlayerMeta>
                </Info>
                {sel && <CheckBadge><MdCheck /></CheckBadge>}
              </PlayerCard>
            );
          })}
        </PlayerGrid>
      )}
    </Modal>
  );
}
