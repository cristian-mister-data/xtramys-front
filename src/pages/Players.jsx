import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, PageHeader, PageTitle, Row, Stack, Muted } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';
import TeamRequiredCard from '@/components/shared/TeamRequiredCard';
import PlayerCard from '@/components/player/PlayerCard';
import PlayerFormModal from '@/components/player/PlayerFormModal';
import PlayerDetailModal from '@/components/player/PlayerDetailModal';
import {
  POSITION_ORDER,
  getPositionOptions,
  getPositionColor,
  getPositionIcon,
  getPlayerFullName,
} from '@/components/player/playerHelpers';
import {
  fetchJugadoresEquipo,
  createJugador,
  updateJugador,
  deleteJugador,
} from '@/store/slices/player/playerThunks';

const Toolbar = styled(Card)`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.full};
  border: 1px solid ${({ $active, $color, theme }) => ($active ? ($color || theme.colors.primary) : theme.colors.border)};
  background: ${({ $active, $color, theme }) => ($active ? ($color || theme.colors.primary) : theme.colors.surface)};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.textSecondary)};
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s;
`;

const Spacer = styled.div`flex: 1;`;

const ViewSwitch = styled.div`
  display: inline-flex;
  background: ${({ theme }) => theme.colors.background};
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.full};
`;

const ViewBtn = styled.button`
  padding: 6px 12px;
  border: 0;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.textSecondary)};
  font-size: 13px;
  font-weight: 600;
  border-radius: ${({ theme }) => theme.radius.full};
  cursor: pointer;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
`;

const EmptyCard = styled(Card)`
  text-align: center;
  padding: 40px 24px;
`;

const EMPTY = [];

const TYPE_OPTIONS = [
  { value: 'all', labelKey: 'player.allPlayers', fallback: 'Todos' },
  { value: 'roster', labelKey: 'player.rosterPlayers', fallback: 'Plantilla' },
  { value: 'extra', labelKey: 'player.extraPlayers', fallback: 'Extras' },
];

export default function Players() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const equipos = useSelector((s) => s.team?.teams ?? EMPTY);
  const players = useSelector((s) => s.player?.players ?? EMPTY);
  const loading = useSelector((s) => s.player?.loading);

  const selectedTeam = useMemo(
    () => equipos.find((e) => e.seleccionado) || equipos[0] || null,
    [equipos],
  );

  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dorsal');
  const [viewMode, setViewMode] = useState('list');

  const [createOpen, setCreateOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [detailPlayer, setDetailPlayer] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedTeam?._id) dispatch(fetchJugadoresEquipo({ team: selectedTeam._id }));
  }, [selectedTeam?._id, dispatch]);

  const positionOptions = useMemo(() => getPositionOptions(t), [t]);

  const filtered = useMemo(() => {
    if (!players) return [];
    return [...players]
      .filter((p) => {
        const fullName = getPlayerFullName(p).toLowerCase();
        const matchesName = !search || fullName.includes(search.toLowerCase());
        const matchesPos = !positionFilter || p.posicion === positionFilter;
        const matchesType =
          typeFilter === 'all' ||
          (typeFilter === 'roster' && !p.extra) ||
          (typeFilter === 'extra' && p.extra);
        return matchesName && matchesPos && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'posicion') {
          const pa = POSITION_ORDER[(a.posicion || '').toLowerCase()] ?? 99;
          const pb = POSITION_ORDER[(b.posicion || '').toLowerCase()] ?? 99;
          if (pa !== pb) return pa - pb;
        }
        const ad = Number.isFinite(parseInt(a.dorsal, 10)) ? parseInt(a.dorsal, 10) : Infinity;
        const bd = Number.isFinite(parseInt(b.dorsal, 10)) ? parseInt(b.dorsal, 10) : Infinity;
        if (ad !== bd) return ad - bd;
        return (a.nombre || '').localeCompare(b.nombre || '');
      });
  }, [players, search, positionFilter, typeFilter, sortBy]);

  const handleCreate = async (payload) => {
    try {
      setSaving(true);
      await dispatch(createJugador({ ...payload, equipo: selectedTeam._id })).unwrap();
      toast.success(t('player.addPlayerSuccess', 'Jugador creado'));
      setCreateOpen(false);
      dispatch(fetchJugadoresEquipo({ team: selectedTeam._id }));
    } catch (err) {
      toast.error(err?.message || t('player.addPlayerError', 'Error al crear el jugador'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (payload) => {
    if (!editPlayer) return;
    try {
      setSaving(true);
      await dispatch(updateJugador({
        id: editPlayer._id,
        data: { ...payload, equipo: selectedTeam._id },
      })).unwrap();
      toast.success(t('player.editPlayerSuccess', 'Jugador actualizado'));
      setEditPlayer(null);
      setDetailPlayer(null);
      dispatch(fetchJugadoresEquipo({ team: selectedTeam._id }));
    } catch (err) {
      toast.error(err?.message || t('player.editPlayerError', 'Error al actualizar'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (player) => {
    const ok = await confirmAction(
      `${t('player.deleteConfirmation', '¿Eliminar al jugador')} ${getPlayerFullName(player)}?`,
    );
    if (!ok) return;
    try {
      await dispatch(deleteJugador(player._id)).unwrap();
      toast.success(t('player.deletePlayerSuccess', 'Jugador eliminado'));
      setDetailPlayer(null);
      setEditPlayer(null);
    } catch {
      toast.error(t('player.deletePlayerError', 'Error al eliminar el jugador'));
    }
  };

  return (
    <Stack style={{ gap: 16 }}>
      <PageHeader>
        <div>
          <PageTitle>{t('player.players', 'Jugadores')}</PageTitle>
          <Muted>{selectedTeam?.nombre || t('player.noTeamSelected', 'Selecciona un equipo')}</Muted>
        </div>
        {selectedTeam ? (
          <Button onClick={() => setCreateOpen(true)}>+ {t('player.createPlayer', 'Nuevo jugador')}</Button>
        ) : null}
      </PageHeader>

      {!selectedTeam ? (
        <TeamRequiredCard />
      ) : (
        <>
          <Toolbar>
            <Input
              style={{ flex: '1 1 200px', minWidth: 180 }}
              placeholder={t('player.searchPlaceholder', 'Buscar jugador...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ViewSwitch>
              <ViewBtn $active={viewMode === 'list'} onClick={() => setViewMode('list')}>☰ {t('player.viewList', 'Lista')}</ViewBtn>
              <ViewBtn $active={viewMode === 'grid'} onClick={() => setViewMode('grid')}>▦ {t('player.viewGrid', 'Cuadrícula')}</ViewBtn>
            </ViewSwitch>
            <Spacer />
          </Toolbar>

          <Toolbar>
            <ChipRow>
              <Chip $active={!positionFilter} onClick={() => setPositionFilter('')}>
                {t('player.allPositions', 'Todas las posiciones')}
              </Chip>
              {positionOptions.map((opt) => {
                const c = getPositionColor(opt.value);
                return (
                  <Chip
                    key={opt.value}
                    $active={positionFilter === opt.value}
                    $color={c[0]}
                    onClick={() => setPositionFilter(opt.value)}
                  >
                    {getPositionIcon(opt.value)} {opt.label}
                  </Chip>
                );
              })}
            </ChipRow>
            <Spacer />
            <ChipRow>
              {TYPE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  $active={typeFilter === opt.value}
                  $color={opt.value === 'extra' ? '#f59e0b' : undefined}
                  onClick={() => setTypeFilter(opt.value)}
                >
                  {opt.value === 'extra' ? '⭐ ' : ''}{t(opt.labelKey, opt.fallback)}
                </Chip>
              ))}
            </ChipRow>
            <ChipRow>
              <Chip $active={sortBy === 'dorsal'} onClick={() => setSortBy('dorsal')}>
                # {t('player.sortByNumber', 'Dorsal')}
              </Chip>
              <Chip $active={sortBy === 'posicion'} onClick={() => setSortBy('posicion')}>
                ⚽ {t('player.sortByPosition', 'Posición')}
              </Chip>
            </ChipRow>
          </Toolbar>

          {loading ? (
            <EmptyCard><Muted>{t('player.loadingPlayers', 'Cargando jugadores...')}</Muted></EmptyCard>
          ) : filtered.length === 0 ? (
            <EmptyCard>
              <div style={{ fontSize: 40 }}>👥</div>
              <h3 style={{ margin: '8px 0 4px' }}>
                {players.length === 0
                  ? t('player.noPlayers', 'No hay jugadores')
                  : t('player.noResults', 'No se han encontrado resultados')}
              </h3>
              <Muted style={{ display: 'block', marginBottom: 12 }}>
                {players.length === 0
                  ? t('player.createFirstPlayer', 'Crea tu primer jugador para empezar.')
                  : t('player.tryDifferentFilters', 'Prueba con otros filtros.')}
              </Muted>
              {players.length === 0 ? (
                <Button onClick={() => setCreateOpen(true)}>+ {t('player.createPlayer', 'Crear jugador')}</Button>
              ) : null}
            </EmptyCard>
          ) : viewMode === 'list' ? (
            <List>
              {filtered.map((p) => (
                <PlayerCard key={p._id} player={p} viewMode="list" onClick={() => setDetailPlayer(p)} />
              ))}
            </List>
          ) : (
            <Grid>
              {filtered.map((p) => (
                <PlayerCard key={p._id} player={p} viewMode="grid" onClick={() => setDetailPlayer(p)} />
              ))}
            </Grid>
          )}

          <Row>
            <Muted style={{ fontSize: 12 }}>
              {filtered.length} {t('player.players', 'jugadores').toLowerCase()}
              {' · '}
              {t('player.profileFutureHint', 'Próximamente: perfil completo del jugador con estadísticas y lesiones.')}
            </Muted>
          </Row>
        </>
      )}

      <PlayerFormModal
        open={createOpen}
        mode="create"
        existingPlayers={players}
        loading={saving}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <PlayerFormModal
        open={!!editPlayer}
        mode="edit"
        player={editPlayer}
        existingPlayers={players}
        loading={saving}
        onClose={() => setEditPlayer(null)}
        onSubmit={handleUpdate}
      />

      <PlayerDetailModal
        open={!!detailPlayer}
        player={detailPlayer}
        onClose={() => setDetailPlayer(null)}
        onEdit={(p) => { setDetailPlayer(null); setEditPlayer(p); }}
        onDelete={handleDelete}
        onViewProfile={(p) => { setDetailPlayer(null); navigate(`/players/${p._id}`); }}
      />
    </Stack>
  );
}
