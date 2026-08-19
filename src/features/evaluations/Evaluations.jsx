import { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import {
  MdAdd,
  MdAssignment,
  MdPerson,
  MdCalendarToday,
  MdBarChart,
  MdSearch,
  MdFormatListBulleted,
  MdStar,
  MdEdit,
  MdDelete,
  MdSettings,
  MdTrendingUp,
} from 'react-icons/md';

import TemplateManagerModal from './TemplateManagerModal';
import EvaluationFormModal from './EvaluationFormModal';
import EvaluationDetailModal from './EvaluationDetailModal';
import { deleteEvaluation } from '@/store/slices/evaluations/evaluationsSlice';
import { fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import { confirmAction } from '@/ui/confirm';
import { toast } from '@/ui/toast';
import { Button, Input, Select, Row, Stack, Muted } from '@/ui/primitives';
import { getScoreColor } from './evaluationsData';
import useSupervision from '@/hooks/useSupervision';
import CanMutate from '@/components/shared/CanMutate';
import DemoSubscriptionNotice from '@/components/shared/DemoSubscriptionNotice';

// ---------- styles ----------
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderTitleBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 600px) {
    font-size: 20px;
  }
`;

const Subtitle = styled.p`
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 550px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const StatIconBox = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $bg }) => $bg || 'rgba(59, 130, 246, 0.1)'};
  color: ${({ $color }) => $color || '#3b82f6'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const StatMeta = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatValue = styled.span`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.1;
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
`;

const Toolbar = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 6px 12px;
  flex: 1;
  min-width: 220px;

  input {
    border: none;
    background: transparent;
    outline: none;
    color: ${({ theme }) => theme.colors.text};
    width: 100%;
    font-size: 13.5px;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;

    select, input {
      flex: 1;
      min-width: 130px;
    }
  }
`;

const TabsNav = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 2px;
  overflow-x: auto;
`;

const TabBtn = styled.button`
  padding: 8px 16px;
  border: none;
  background: none;
  font-weight: 600;
  font-size: 14px;
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textMuted)};
  border-bottom: 3px solid ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  margin-bottom: -4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 120ms ease;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const EvaluationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const EvalCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $color }) => $color || '#3b82f6'};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
`;

const EvalCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`;

const PlayerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  background-image: ${({ src }) => (src ? `url(${src})` : 'none')};
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  border: 2px solid ${({ theme }) => theme.colors.surface};
  box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.border};
`;

const PlayerName = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.2;
`;

const ScoreBadge = styled.span`
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 800;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
`;

const ScopeBadge = styled.span`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const ActionIconButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme, $color }) => $color || theme.colors.textMuted};
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms ease, color 120ms ease;

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundAlt};
    color: ${({ theme, $hoverColor }) => $hoverColor || theme.colors.primary};
  }
`;

const EmptyState = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
`;

const TableResponsiveContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const RankingTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.colors.surface};
  min-width: 500px;

  th, td {
    padding: 12px 16px;
    text-align: left;
    font-size: 13.5px;
  }

  th {
    background: ${({ theme }) => theme.colors.backgroundAlt};
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  tr:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

export default function Evaluations() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { canMutate } = useSupervision();

  const evaluations = useSelector((s) => s.evaluations.evaluations || []);
  const players = useSelector((s) => s.player.players || []);
  const equipos = useSelector((s) => s.team.teams || []);

  const selectedTeam = useMemo(
    () => equipos.find((e) => e.seleccionado === true) || equipos[0],
    [equipos]
  );

  useEffect(() => {
    const teamId = selectedTeam?._id || selectedTeam?.id;
    if (teamId) {
      dispatch(fetchJugadoresEquipo({ team: teamId }));
    }
  }, [dispatch, selectedTeam?._id, selectedTeam?.id]);

  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [playerFilter, setPlayerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [evaluationToEdit, setEvaluationToEdit] = useState(null);

  // Filter evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((item) => {
      if (scopeFilter !== 'ALL' && item.scope !== scopeFilter) return false;
      if (playerFilter && item.playerId !== playerFilter) return false;
      if (dateFilter && item.date !== dateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.playerName?.toLowerCase().includes(q);
        const matchTpl = item.templateName?.toLowerCase().includes(q);
        const matchNotes = item.generalNotes?.toLowerCase().includes(q);
        if (!matchName && !matchTpl && !matchNotes) return false;
      }
      return true;
    });
  }, [evaluations, scopeFilter, playerFilter, dateFilter, searchQuery]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = evaluations.length;
    const scores = evaluations
      .map((e) => e.overallScore)
      .filter((s) => s !== null && s !== undefined && !isNaN(s));
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';

    const playerEvals = evaluations.filter((e) => e.scope === 'POR_JUGADOR');
    const generalEvals = evaluations.filter((e) => e.scope === 'GENERAL');

    // Player ranking calculation
    const playerScoresMap = {};
    playerEvals.forEach((e) => {
      if (e.playerId && e.overallScore) {
        if (!playerScoresMap[e.playerId]) {
          playerScoresMap[e.playerId] = {
            id: e.playerId,
            name: e.playerName,
            dorsal: e.playerDorsal,
            scores: [],
          };
        }
        playerScoresMap[e.playerId].scores.push(e.overallScore);
      }
    });

    const playerRanking = Object.values(playerScoresMap)
      .map((p) => ({
        ...p,
        count: p.scores.length,
        avgScore: (p.scores.reduce((a, b) => a + b, 0) / p.scores.length).toFixed(1),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    return {
      total,
      avgScore,
      playerEvalsCount: playerEvals.length,
      generalEvalsCount: generalEvals.length,
      playerRanking,
    };
  }, [evaluations]);

  const handleOpenNew = () => {
    setEvaluationToEdit(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (evaluation) => {
    setEvaluationToEdit(evaluation);
    setShowFormModal(true);
  };

  const handleOpenDetail = (evaluation) => {
    setSelectedEvaluation(evaluation);
    setShowDetailModal(true);
  };

  const handleDelete = async (evaluation) => {
    const ok = await confirmAction(
      t('evaluations.deleteConfirm', '¿Deseas eliminar la evaluación del día {{date}}?', {
        date: evaluation.date,
      })
    );
    if (!ok) return;
    dispatch(deleteEvaluation(evaluation._id));
    toast.success(t('evaluations.deleteSuccess', 'Evaluación eliminada correctamente'));
  };

  return (
    <Container>
      {/* Header */}
      <PageHeader>
        <HeaderTitleBox>
          <Title>
            <MdAssignment color="#3b82f6" />
            {t('evaluations.title', 'Evaluaciones & Cuestionarios')}
          </Title>
          <Subtitle>
            {t('evaluations.subtitle', 'Registra y analiza el rendimiento individual y de equipo mediante plantillas y fechas personalizadas')}
          </Subtitle>
        </HeaderTitleBox>

        <Row $gap={10} style={{ flexWrap: 'wrap' }}>
          <CanMutate>
            <Button $variant="secondary" onClick={() => setShowTemplateModal(true)}>
              <MdSettings size={18} />
              {t('evaluations.templates', 'Plantillas')}
            </Button>
          </CanMutate>
          <CanMutate>
            <Button $variant="primary" onClick={handleOpenNew}>
              <MdAdd size={18} />
              {t('evaluations.newEvaluation', 'Nueva Evaluación')}
            </Button>
          </CanMutate>
        </Row>
      </PageHeader>

      {/* Demo Mode Notice */}
      <DemoSubscriptionNotice
        title={t('subscription.demoContentTitle', 'Disponibles con suscripción')}
        message={t('subscription.demoContentMessage', 'Activa una suscripción para crear, editar, eliminar y gestionar plantillas de evaluación.')}
      />

      {/* Metric Cards */}
      <StatsGrid>
        <StatCard>
          <StatIconBox $bg="rgba(59, 130, 246, 0.12)" $color="#3b82f6">
            <MdAssignment size={24} />
          </StatIconBox>
          <StatMeta>
            <StatValue>{stats.total}</StatValue>
            <StatLabel>{t('evaluations.totalEvaluations', 'Total de Evaluaciones')}</StatLabel>
          </StatMeta>
        </StatCard>

        <StatCard>
          <StatIconBox $bg="rgba(16, 185, 129, 0.12)" $color="#10b981">
            <MdStar size={24} />
          </StatIconBox>
          <StatMeta>
            <StatValue>{stats.avgScore} <span style={{ fontSize: 13, fontWeight: 500 }}>/ 10</span></StatValue>
            <StatLabel>{t('evaluations.overallAverage', 'Promedio General')}</StatLabel>
          </StatMeta>
        </StatCard>

        <StatCard>
          <StatIconBox $bg="rgba(245, 158, 11, 0.12)" $color="#f59e0b">
            <MdPerson size={24} />
          </StatIconBox>
          <StatMeta>
            <StatValue>{stats.playerEvalsCount}</StatValue>
            <StatLabel>{t('evaluations.individualEvaluations', 'Evaluaciones Individuales')}</StatLabel>
          </StatMeta>
        </StatCard>

        <StatCard>
          <StatIconBox $bg="rgba(139, 92, 246, 0.12)" $color="#8b5cf6">
            <MdBarChart size={24} />
          </StatIconBox>
          <StatMeta>
            <StatValue>{stats.generalEvalsCount}</StatValue>
            <StatLabel>{t('evaluations.generalEvaluations', 'Evaluaciones Generales')}</StatLabel>
          </StatMeta>
        </StatCard>
      </StatsGrid>

      {/* Toolbar & Search */}
      <Toolbar>
        <SearchBox>
          <MdSearch size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder={t('evaluations.searchPlaceholder', 'Buscar por jugador, nota o plantilla...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchBox>

        <FilterGroup>
          <Select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="ALL">{t('evaluations.allScopes', 'Todos los Ámbitos')}</option>
            <option value="POR_JUGADOR">{t('evaluations.playerScope', 'Por Jugador')}</option>
            <option value="GENERAL">{t('evaluations.generalScope', 'General / Equipo')}</option>
          </Select>

          <Select
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="">{t('evaluations.allPlayers', 'Todos los Jugadores')} ({players.length})</option>
            {players.map((p) => (
              <option key={p._id} value={p._id}>
                {p.dorsal ? `#${p.dorsal} - ` : ''}
                {p.nombre} {p.apellidos || p.apellido || ''}
              </option>
            ))}
          </Select>

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ padding: '8px 10px', fontSize: 13, width: 'auto' }}
          />
          {dateFilter && (
            <Button $variant="ghost" onClick={() => setDateFilter('')} style={{ padding: 4 }}>
              {t('evaluations.clearDate', 'Limpiar Fecha')}
            </Button>
          )}
        </FilterGroup>
      </Toolbar>

      {/* Navigation Tabs */}
      <TabsNav>
        <TabBtn $active={activeTab === 'list'} onClick={() => setActiveTab('list')}>
          <MdFormatListBulleted size={18} />
          {t('evaluations.historyTab', 'Historial de Evaluaciones')} ({filteredEvaluations.length})
        </TabBtn>
        <TabBtn $active={activeTab === 'ranking'} onClick={() => setActiveTab('ranking')}>
          <MdTrendingUp size={18} />
          {t('evaluations.rankingsTab', 'Promedios & Rankings')}
        </TabBtn>
      </TabsNav>

      {/* TAB 1: LIST / GRID */}
      {activeTab === 'list' && (
        <>
          {filteredEvaluations.length === 0 ? (
            <EmptyState>
              <MdAssignment size={48} color="#94a3b8" />
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {t('evaluations.emptyTitle', 'No hay evaluaciones registradas')}
              </div>
              <Muted style={{ maxWidth: 400 }}>
                {t('evaluations.emptySubtitle', 'Comienza registrando la primera evaluación del equipo o individual de un jugador utilizando tus plantillas personalizadas.')}
              </Muted>
              <CanMutate>
                <Button $variant="primary" onClick={handleOpenNew} style={{ marginTop: 8 }}>
                  <MdAdd size={18} />
                  {t('evaluations.createNow', 'Crear Evaluación Ahora')}
                </Button>
              </CanMutate>
            </EmptyState>
          ) : (
            <EvaluationGrid>
              {filteredEvaluations.map((item) => {
                const scoreColors = getScoreColor(item.overallScore);
                return (
                  <EvalCard
                    key={item._id}
                    $color={scoreColors.color}
                    onClick={() => handleOpenDetail(item)}
                  >
                    <EvalCardHeader>
                      <PlayerInfo>
                        <Avatar src={item.playerPhoto}>
                          {!item.playerPhoto && (item.playerName?.[0] || 'E')}
                        </Avatar>
                        <div>
                          <PlayerName>
                            {item.playerName || (item.scope === 'GENERAL' ? t('evaluations.generalScope', 'General / Equipo') : 'Jugador')}
                            {item.playerDorsal ? ` (#${item.playerDorsal})` : ''}
                          </PlayerName>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: 500 }}>
                            {item.templateName}
                          </div>
                        </div>
                      </PlayerInfo>

                      {item.overallScore !== null && item.overallScore !== undefined && (
                        <ScoreBadge $bg={scoreColors.bg} $color={scoreColors.color}>
                          {item.overallScore} / 10
                        </ScoreBadge>
                      )}
                    </EvalCardHeader>

                    {item.generalNotes && (
                      <Muted
                        style={{
                          fontSize: 13,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontStyle: 'italic',
                          color: '#475569',
                        }}
                      >
                        "{item.generalNotes}"
                      </Muted>
                    )}

                    <CardFooter>
                      <Row $gap={8} style={{ alignItems: 'center' }}>
                        <ScopeBadge>
                          {item.scope === 'GENERAL' ? t('evaluations.generalScope', 'General') : t('evaluations.playerScope', 'Por Jugador')}
                        </ScopeBadge>
                        <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                          <MdCalendarToday size={13} />
                          {item.date}
                        </span>
                      </Row>

                      <CanMutate>
                        <Row $gap={4}>
                          <ActionIconButton
                            type="button"
                            title={t('common.edit', 'Editar')}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(item);
                            }}
                          >
                            <MdEdit size={18} />
                          </ActionIconButton>
                          <ActionIconButton
                            type="button"
                            title={t('common.delete', 'Eliminar')}
                            $hoverColor="#ef4444"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item);
                            }}
                          >
                            <MdDelete size={18} />
                          </ActionIconButton>
                        </Row>
                      </CanMutate>
                    </CardFooter>
                  </EvalCard>
                );
              })}
            </EvaluationGrid>
          )}
        </>
      )}

      {/* TAB 2: RANKINGS */}
      {activeTab === 'ranking' && (
        <Stack $gap={16}>
          <Title style={{ fontSize: 18 }}>
            {t('evaluations.playerRankingTitle', 'Clasificación de Promedios por Jugador')}
          </Title>
          {stats.playerRanking.length === 0 ? (
            <Muted>{t('evaluations.noPlayerRanking', 'No hay evaluaciones individuales de jugadores registradas aún.')}</Muted>
          ) : (
            <TableResponsiveContainer>
              <RankingTable>
                <thead>
                  <tr>
                    <th>{t('evaluations.position', 'Posición')}</th>
                    <th>{t('evaluations.player', 'Jugador')}</th>
                    <th>{t('evaluations.evalCount', 'Nº Evaluaciones')}</th>
                    <th>{t('evaluations.avgScore', 'Promedio General')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.playerRanking.map((p, idx) => {
                    const scoreColors = getScoreColor(p.avgScore);
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700 }}>#{idx + 1}</td>
                        <td>
                          {p.dorsal ? `#${p.dorsal} - ` : ''}
                          {p.name}
                        </td>
                        <td>{p.count} evaluaciones</td>
                        <td>
                          <ScoreBadge $bg={scoreColors.bg} $color={scoreColors.color}>
                            {p.avgScore} / 10
                          </ScoreBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </RankingTable>
            </TableResponsiveContainer>
          )}
        </Stack>
      )}

      {/* MODALS */}
      <TemplateManagerModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
      />

      <EvaluationFormModal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        evaluationToEdit={evaluationToEdit}
      />

      <EvaluationDetailModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        evaluation={selectedEvaluation}
        onEdit={handleOpenEdit}
      />
    </Container>
  );
}
