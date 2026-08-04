import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdPeople, MdFilterList, MdPictureAsPdf } from 'react-icons/md';
import { Card, Button, Input, Row, Stack, Muted } from '@/ui/primitives';
import SectionHeader from '@/ui/SectionHeader';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';
import CanMutate from '@/components/shared/CanMutate';
import useSupervision from '@/hooks/useSupervision';
import TeamRequiredCard from '@/components/shared/TeamRequiredCard';
import PlayerCard from '@/components/player/PlayerCard';
import PlayerFormModal from '@/components/player/PlayerFormModal';
import PlayerDetailModal from '@/components/player/PlayerDetailModal';
import PlayerRosterPdfModal from '@/components/player/PlayerRosterPdfModal';
import { generatePlayerRosterPdf } from '@/vendor/playerRoster/pdf';
import {
  POSITION_ORDER,
  getPositionOptions,
  getPositionColor,
  getPositionIcon,
  getPlayerRosterName,
} from '@/components/player/playerHelpers';
import {
  fetchJugadoresEquipo,
  createJugador,
  updateJugador,
  deleteJugador,
} from '@/store/slices/player/playerThunks';
import { fetchInjuriesByTeam } from '@/store/slices/injury/injuryThunks';

const Toolbar = styled(Card)`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;

  @media (max-width: 600px) {
    padding: 12px;
    gap: 10px;

    > * {
      min-width: 0;
    }
  }
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  @media (max-width: 600px) {
    width: 100%;
  }
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.full};
  border: 1px solid ${({ $active, $color, theme }) => ($active ? ($color || theme.colors.primary) : theme.colors.border)};
  background: ${({ $active, $color, theme }) => ($active ? ($color || theme.colors.primary) : theme.colors.surface)};
  color: ${({ $active, $color, theme }) => {
    if (!$active) return theme.colors.textSecondary;
    return $color ? '#fff' : theme.colors.onPrimary;
  }};
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s;

  @media (max-width: 600px) {
    flex: 1 1 calc(50% - 6px);
    justify-content: center;
    min-width: 0;
    padding: 8px 10px;
  }
`;

const Spacer = styled.div`
  flex: 1;

  @media (max-width: 600px) {
    display: none;
  }
`;

const ViewSwitch = styled.div`
  display: inline-flex;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.full};

  @media (max-width: 600px) {
    width: 100%;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

const ViewBtn = styled.button`
  padding: 6px 12px;
  border: 0;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.onPrimary : theme.colors.textSecondary)};
  font-size: 13px;
  font-weight: 600;
  border-radius: ${({ theme }) => theme.radius.full};
  cursor: pointer;

  @media (max-width: 600px) {
    flex: 1;
    padding: 9px 10px;
    border-radius: ${({ theme }) => theme.radius.sm};
  }
`;

const FiltersToolbar = styled(Toolbar)`
  @media (max-width: 600px) {
    display: none;
  }
`;

const SearchWrapper = styled.div`
  display: flex;
  gap: 8px;
  flex: 1 1 240px;
  min-width: 0;
  
  input {
    flex: 1;
    min-width: 0;
  }
`;

const MobileFilterBtn = styled(Button)`
  display: none;
  
  @media (max-width: 600px) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    padding: 0;
    border-radius: ${({ theme }) => theme.radius.md};
    position: relative;
    background: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.surface)};
    border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
    color: ${({ $active, theme }) => ($active ? theme.colors.onPrimary : theme.colors.textSecondary)};
  }
`;

const FilterBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff5722;
  color: #fff;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
  border: 2px solid ${({ theme }) => theme.colors.surface};
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const ModalContentMobile = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  width: 100%;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.shadows.xl};
  overflow: hidden;
  animation: slideUp 200ms cubic-bezier(0.2, 0, 0, 1);

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

const ModalHeaderMobile = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
`;

const ModalCloseBtn = styled.button`
  background: transparent;
  border: 0;
  font-size: 24px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ModalBodyMobile = styled.div`
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ModalFooterMobile = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  
  button {
    flex: 1;
    justify-content: center;
  }
`;

const FilterSectionTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
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

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
`;

const InactiveSection = styled.section`
  margin-top: 12px;
  padding-top: 18px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const InactiveHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h2 {
    margin: 0;
    font-size: 16px;
    color: ${({ theme }) => theme.colors.text};
  }

  span {
    min-width: 28px;
    padding: 4px 9px;
    border-radius: ${({ theme }) => theme.radius.full};
    background: ${({ theme }) => theme.colors.backgroundAlt};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 12px;
    font-weight: 700;
    text-align: center;
  }
`;

const EmptyCard = styled(Card)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  padding: 60px 24px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  color: ${({ theme }) => theme.colors.textSecondary};

  @media (max-width: 600px) {
    padding: 36px 18px;
  }
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
  const { t, i18n } = useTranslation();
  const { canMutate } = useSupervision();
  const equipos = useSelector((s) => s.team?.teams ?? EMPTY);
  const players = useSelector((s) => s.player?.players ?? EMPTY);
  const injuries = useSelector((s) => s.injury?.injuries ?? EMPTY);
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFiltersCount = useMemo(
    () => (positionFilter ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0),
    [positionFilter, typeFilter]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [detailPlayer, setDetailPlayer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rosterPdfOpen, setRosterPdfOpen] = useState(false);
  const [generatingRosterPdf, setGeneratingRosterPdf] = useState(false);

  useEffect(() => {
    if (selectedTeam?._id) {
      dispatch(fetchJugadoresEquipo({ team: selectedTeam._id }));
      dispatch(fetchInjuriesByTeam({ team: selectedTeam._id }));
    }
  }, [selectedTeam?._id, dispatch]);

  const positionOptions = useMemo(() => getPositionOptions(t), [t]);

  const filtered = useMemo(() => {
    if (!players) return [];
    return [...players]
      .filter((p) => {
        const fullName = getPlayerRosterName(p).toLowerCase();
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

  const activePlayers = filtered.filter((player) => player.activo !== false);
  const inactivePlayers = filtered.filter((player) => player.activo === false);

  const renderPlayers = (items) => {
    const Container = viewMode === 'list' ? List : Grid;
    return (
      <Container>
        {items.map((player) => (
          <PlayerCard
            key={player._id}
            player={player}
            viewMode={viewMode}
            onClick={() => setDetailPlayer(player)}
          />
        ))}
      </Container>
    );
  };

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
      `${t('player.deleteConfirmation', '¿Eliminar al jugador')} ${getPlayerRosterName(player)}?`,
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

  const handleGenerateRosterPdf = async ({ includeExtras, showPhotos }) => {
    try {
      setGeneratingRosterPdf(true);
      await generatePlayerRosterPdf({
        players,
        team: selectedTeam,
        injuries,
        includeExtras,
        showPhotos,
        locale: i18n.language === 'en' ? 'en-US' : 'es-ES',
        t,
      });
      setRosterPdfOpen(false);
      toast.success(t('player.rosterPdfGenerated', 'PDF de plantilla descargado'));
    } catch (error) {
      toast.error(error?.message || t('player.rosterPdfError', 'No se pudo generar el PDF'));
    } finally {
      setGeneratingRosterPdf(false);
    }
  };

  return (
    <Stack style={{ gap: 16 }}>
      <SectionHeader
        title={t('player.players', 'Jugadores')}
        subtitle={selectedTeam?.nombre || t('player.noTeamSelected', 'Selecciona un equipo')}
        icon={MdPeople}
        actions={selectedTeam ? (
          <Row $gap={8} $wrap>
            <Button $variant="secondary" onClick={() => setRosterPdfOpen(true)}>
              <MdPictureAsPdf size={18} />
              {t('player.rosterPdfButton', 'PDF plantilla')}
            </Button>
            <CanMutate>
              <Button onClick={() => setCreateOpen(true)}>
                <MdAdd size={18} />
                {t('player.createPlayer', 'Nuevo jugador')}
              </Button>
            </CanMutate>
          </Row>
        ) : null}
      />

      {!selectedTeam ? (
        <TeamRequiredCard />
      ) : (
        <>
          <Toolbar>
            <SearchWrapper>
              <Input
                placeholder={t('player.searchPlaceholder', 'Buscar jugador...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <MobileFilterBtn
                $active={activeFiltersCount > 0}
                onClick={() => setFiltersOpen(true)}
              >
                <MdFilterList size={20} />
                {activeFiltersCount > 0 && <FilterBadge>{activeFiltersCount}</FilterBadge>}
              </MobileFilterBtn>
            </SearchWrapper>
            <ViewSwitch>
              <ViewBtn $active={viewMode === 'list'} onClick={() => setViewMode('list')}>☰ {t('player.viewList', 'Lista')}</ViewBtn>
              <ViewBtn $active={viewMode === 'grid'} onClick={() => setViewMode('grid')}>▦ {t('player.viewGrid', 'Cuadrícula')}</ViewBtn>
            </ViewSwitch>
            <Spacer />
          </Toolbar>

          <FiltersToolbar>
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
          </FiltersToolbar>

          {filtersOpen && (
            <ModalOverlay onClick={() => setFiltersOpen(false)}>
              <ModalContentMobile onClick={(e) => e.stopPropagation()}>
                <ModalHeaderMobile>
                  <h3>{t('statistics.players.filterByPlayers', 'Filtrar jugadores')}</h3>
                  <ModalCloseBtn onClick={() => setFiltersOpen(false)}>&times;</ModalCloseBtn>
                </ModalHeaderMobile>
                <ModalBodyMobile>
                  <FilterSectionTitle>{t('statistics.sortLabels.position', 'Posición')}</FilterSectionTitle>
                  <ChipRow style={{ gap: '6px 8px' }}>
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

                  <FilterSectionTitle style={{ marginTop: 12 }}>{t('player.type', 'Tipo')}</FilterSectionTitle>
                  <ChipRow style={{ gap: '6px 8px' }}>
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
                  
                  <FilterSectionTitle style={{ marginTop: 12 }}>{t('statistics.players.sortBy', 'Ordenar por')}</FilterSectionTitle>
                  <ChipRow style={{ gap: '6px 8px' }}>
                    <Chip $active={sortBy === 'dorsal'} onClick={() => setSortBy('dorsal')}>
                      # {t('player.sortByNumber', 'Dorsal')}
                    </Chip>
                    <Chip $active={sortBy === 'posicion'} onClick={() => setSortBy('posicion')}>
                      ⚽ {t('player.sortByPosition', 'Posición')}
                    </Chip>
                  </ChipRow>
                </ModalBodyMobile>
                <ModalFooterMobile>
                  <Button $variant="secondary" onClick={() => { setPositionFilter(''); setTypeFilter('all'); setSortBy('dorsal'); }}>
                    {t('statistics.players.clear', 'Limpiar')}
                  </Button>
                  <Button $variant="primary" onClick={() => setFiltersOpen(false)}>
                    {t('statistics.players.apply', 'Aplicar')}
                  </Button>
                </ModalFooterMobile>
              </ModalContentMobile>
            </ModalOverlay>
          )}

          {loading ? (
            <EmptyCard><Muted>{t('player.loadingPlayers', 'Cargando jugadores...')}</Muted></EmptyCard>
          ) : filtered.length === 0 ? (
            <EmptyCard>
              <MdPeople size={56} />
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {players.length === 0
                  ? t('player.noPlayers', 'No hay jugadores')
                  : t('player.noResults', 'No se han encontrado resultados')}
              </div>
              <Muted>
                {players.length === 0
                  ? t('player.createFirstPlayer', 'Crea tu primer jugador para comenzar')
                  : t('player.tryDifferentFilters', 'Prueba con otros filtros.')}
              </Muted>
              {players.length === 0 ? (
                <CanMutate>
                  <Button $variant="primary" onClick={() => setCreateOpen(true)}>
                    <Row $gap={6}>
                      <MdAdd size={18} />
                      {t('player.createPlayer', 'Crear jugador')}
                    </Row>
                  </Button>
                </CanMutate>
              ) : null}
            </EmptyCard>
          ) : (
            <>
              {activePlayers.length > 0 ? renderPlayers(activePlayers) : null}
              <Row>
                <Muted style={{ fontSize: 12 }}>
                  {activePlayers.length} {t('player.players', 'jugadores').toLowerCase()}
                </Muted>
              </Row>
              {inactivePlayers.length > 0 ? (
                <InactiveSection>
                  <InactiveHeader>
                    <h2>{t('player.inactivePlayers', 'Jugadores de baja')}</h2>
                    <span>{inactivePlayers.length}</span>
                  </InactiveHeader>
                  {renderPlayers(inactivePlayers)}
                </InactiveSection>
              ) : null}
            </>
          )}
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
        onEdit={canMutate ? (p) => { setDetailPlayer(null); setEditPlayer(p); } : undefined}
        onDelete={canMutate ? handleDelete : undefined}
        onViewProfile={(p) => { setDetailPlayer(null); navigate(`/players/${p._id}`); }}
      />

      <PlayerRosterPdfModal
        visible={rosterPdfOpen}
        onClose={() => setRosterPdfOpen(false)}
        players={players}
        onGenerate={handleGenerateRosterPdf}
        generating={generatingRosterPdf}
      />
    </Stack>
  );
}
