import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { MdSearch, MdCheck, MdImage, MdStar, MdFolderShared, MdPerson } from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Input, Row, Muted } from '@/ui/primitives';
import { getContentImage } from '@/utils/contentVisual';

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

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
`;

const FilterButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? theme.colors.primarySoft : theme.colors.surface)};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.surfaceAlt}; }
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
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
  const [sourceFilter, setSourceFilter] = useState('all');
  const user = useSelector((s) => s.usuario.user);
  const isDemo = user?.plan === 'demo' || user?.accessMode === 'demo';

  useEffect(() => {
    if (open) {
      setPicked(selectedIds);
      setSearch('');
      setSourceFilter('all');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises
      .filter((e) => !excludeIds.includes(e._id))
      .filter((e) => {
        if (sourceFilter === 'favorites') return e.favorito;
        if (sourceFilter === 'mine') return !e.isGlobal;
        if (sourceFilter === 'global') return e.isGlobal;
        return true;
      })
      .filter((e) => !q || (e.nombre || '').toLowerCase().includes(q));
  }, [exercises, search, excludeIds, sourceFilter]);

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

      <Filters>
        {[
          { key: 'all', label: t('common.all', 'Todos'), icon: null },
          { key: 'favorites', label: t('common.favorites', 'Favoritos'), icon: MdStar },
          { key: 'mine', label: t('exercise.mine', 'Mis ejercicios'), icon: MdPerson },
          ...(!isDemo ? [{ key: 'global', label: t('exercise.appExercises', 'App'), icon: MdFolderShared }] : []),
        ].map(({ key, label, icon: Icon }) => (
          <FilterButton
            key={key}
            type="button"
            $active={sourceFilter === key}
            onClick={() => setSourceFilter(key)}
          >
            {Icon ? <Icon size={15} /> : null}
            {label}
          </FilterButton>
        ))}
      </Filters>

      {filtered.length === 0 ? (
        <Muted style={{ textAlign: 'center', padding: 20 }}>
          {t('session.noExercises', 'No hay ejercicios disponibles')}
        </Muted>
      ) : (
        <List>
          {filtered.map((ex) => {
            const sel = picked.includes(ex._id);
            const folderName = ex.folderPathLabel || ex.folder?.nombre;
            return (
              <ItemRow key={ex._id} type="button" $sel={sel} onClick={() => toggle(ex._id)}>
                <Thumb>
                  {getContentImage(ex) ? <img src={getContentImage(ex)} alt="" /> : <MdImage size={22} />}
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
