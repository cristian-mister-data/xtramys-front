import { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdSearch, MdCheck } from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Input, Row, Muted } from '@/ui/primitives';

const SearchBox = styled.div`
  position: relative;
  margin-bottom: 10px;
  svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #888; }
  input { padding-left: 32px; }
`;

const PlayerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 360px;
  overflow-y: auto;
`;

const PlayerRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: ${({ $selected }) => ($selected ? '#e8f0fe' : 'transparent')};
  border: 1px solid ${({ $selected, theme }) => ($selected ? '#1a237e' : theme.colors.border)};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  width: 100%;
`;

const Avatar = styled.div`
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a237e, #5c6bc0);
  color: #fff; font-weight: 800; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; overflow: hidden;
`;

const Name = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 600;
`;

const CheckIcon = styled(MdCheck)`
  color: #1a237e;
  font-size: 22px;
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
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(initialSelected);

  useEffect(() => {
    if (open) {
      setSelectedIds(initialSelected);
      setSearch('');
    }
  }, [open]);  // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players
      .filter((p) => !excludeIds.includes(p._id))
      .filter((p) => !q || (p.nombre || '').toLowerCase().includes(q));
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

  const selectAll = () => setSelectedIds(filtered.map((p) => p._id));
  const clearAll = () => setSelectedIds([]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || t('matchSheet.selectPlayers', 'Seleccionar jugadores')}
      width={520}
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
      <SearchBox>
        <MdSearch size={18} />
        <Input
          placeholder={t('common.search', 'Buscar...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </SearchBox>

      {filtered.length === 0 ? (
        <Muted style={{ textAlign: 'center', padding: 20 }}>
          {t('matchSheet.noPlayers', 'No hay jugadores')}
        </Muted>
      ) : (
        <PlayerList>
          {filtered.map((p) => {
            const sel = selectedIds.includes(p._id);
            return (
              <PlayerRow key={p._id} type="button" $selected={sel} onClick={() => toggle(p._id)}>
                <Avatar>
                  {p.foto ? (
                    <img src={p.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    p.dorsal ?? '?'
                  )}
                </Avatar>
                <Name>{p.nombre}</Name>
                {sel ? <CheckIcon /> : null}
              </PlayerRow>
            );
          })}
        </PlayerList>
      )}
    </Modal>
  );
}
