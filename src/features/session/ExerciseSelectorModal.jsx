import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdSearch, MdCheck, MdImage } from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Input, Row, Muted } from '@/ui/primitives';

const SearchBox = styled.div`
  position: relative;
  margin-bottom: 10px;
  svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: ${({ theme }) => theme.colors.textMuted}; }
  input { padding-left: 32px; }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 420px;
  overflow-y: auto;
`;

const ItemRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: ${({ $sel, theme }) => ($sel ? theme.colors.primarySoft : 'transparent')};
  border: 1px solid ${({ $sel, theme }) => ($sel ? theme.colors.primary : theme.colors.border)};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  color: ${({ theme }) => theme.colors.text};
  transition: background 0.15s ease, border-color 0.15s ease;
  &:hover { background: ${({ $sel, theme }) => ($sel ? theme.colors.primarySoft : theme.colors.surfaceAlt)}; }
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const Thumb = styled.div`
  width: 44px; height: 44px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  display: flex; align-items: center; justify-content: center;
  color: ${({ theme }) => theme.colors.textMuted};
  flex-shrink: 0;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Meta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
`;

const Check = styled(MdCheck)`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 22px;
`;

export default function ExerciseSelectorModal({
  open,
  onClose,
  exercises = [],
  selectedIds = [],
  onConfirm,
  multi = true,
  excludeIds = [],
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState(selectedIds);

  useEffect(() => {
    if (open) {
      setPicked(selectedIds);
      setSearch('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises
      .filter((e) => !excludeIds.includes(e._id))
      .filter((e) => !q || (e.nombre || '').toLowerCase().includes(q));
  }, [exercises, search, excludeIds]);

  const toggle = (id) => {
    if (!multi) {
      onConfirm?.([id]);
      onClose?.();
      return;
    }
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('session.selectExercises', 'Seleccionar ejercicios')}
      width={560}
      footer={
        multi ? (
          <Row style={{ justifyContent: 'flex-end', width: '100%', gap: 8 }}>
            <Button type="button" $variant="ghost" onClick={onClose}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                onConfirm?.(picked);
                onClose?.();
              }}
            >
              {t('common.confirm', 'Confirmar')} ({picked.length})
            </Button>
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
          {t('session.noExercises', 'No hay ejercicios disponibles')}
        </Muted>
      ) : (
        <List>
          {filtered.map((ex) => {
            const sel = picked.includes(ex._id);
            const folderName = ex.folder?.nombre;
            return (
              <ItemRow key={ex._id} type="button" $sel={sel} onClick={() => toggle(ex._id)}>
                <Thumb>
                  {ex.imagen ? <img src={ex.imagen} alt="" /> : <MdImage size={22} />}
                </Thumb>
                <Body>
                  <Name>{ex.nombre || t('session.untitledExercise', 'Sin nombre')}</Name>
                  <Meta>
                    {folderName ? `${folderName} • ` : ''}
                    {ex.equipos > 0
                      ? t('session.teamsCount', '{{n}} equipos', { n: ex.equipos })
                      : t('session.individual', 'Individual')}
                  </Meta>
                </Body>
                {sel ? <Check /> : null}
              </ItemRow>
            );
          })}
        </List>
      )}
    </Modal>
  );
}
