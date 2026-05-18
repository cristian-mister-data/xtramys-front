// Página principal de Análisis del Rival.
// - Lista los análisis del equipo seleccionado en formato grid de cards.
// - Filtros: por rival y por alineación.
// - Botones: crear nuevo, gestionar plantillas.
// - Click en card → modal de detalle.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  MdAdd,
  MdSearch,
  MdShield,
  MdLibraryBooks,
  MdGridOn,
  MdAnalytics,
} from 'react-icons/md';

import {
  fetchRivalAnalysesByTeam,
  fetchActiveTemplate,
  fetchUserTemplates,
} from '@/store/slices/rivalAnalysis/rivalAnalysisThunks';
import { fetchRivalsByTeam } from '@/store/slices/rival/rivalThunks';
import {
  Button,
  Row,
  Muted,
} from '@/ui/primitives';
import SectionHeader from '@/ui/SectionHeader';

import {
  ALINEACIONES,
  normalizeFormation,
  getFormationShort,
} from './rivalAnalysisData';
import AnalysisFormModal from './AnalysisFormModal';
import AnalysisDetailModal from './AnalysisDetailModal';
import TemplateManagerModal from './TemplateManagerModal';

// ---------- styles ----------
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 600px) {
    gap: 12px;
    padding: 12px;
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;

  @media (max-width: 600px) {
    align-items: stretch;
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 8px 12px;
  flex: 1;
  min-width: 220px;

  @media (max-width: 600px) {
    width: 100%;
    min-width: 0;
  }

  input {
    border: none;
    outline: none;
    background: transparent;
    flex: 1;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const FilterPill = styled.button`
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.surface};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.text)};
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;

  @media (max-width: 600px) {
    flex: 1 1 calc(33.333% - 6px);
    min-width: 82px;
    padding: 8px 10px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.button`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 12px 14px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.15s, border-color 0.15s;
  text-align: center;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 600px) {
    padding: 14px 10px 12px;
    gap: 8px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

const EscudoBox = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  @media (max-width: 600px) {
    width: 64px;
    height: 64px;
  }
`;

const RivalName = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text};
  word-break: break-word;

  @media (max-width: 600px) {
    font-size: 13px;
  }
`;

const FormationBadge = styled.span`
  background: #eef2ff;
  color: #3949ab;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 24px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};

  @media (max-width: 600px) {
    padding: 36px 18px;
  }
`;

// ---------- component ----------
export default function RivalAnalysis() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const analyses = useSelector((s) => s.rivalAnalysis.rivalAnalyses || []);
  const loading = useSelector((s) => s.rivalAnalysis.loading);
  const activeTemplate = useSelector((s) => s.rivalAnalysis.activeTemplate);
  const userTemplates = useSelector((s) => s.rivalAnalysis.userTemplates || []);
  const rivals = useSelector((s) => s.rival.rivals || []);
  const equipos = useSelector((s) => s.team.teams || []);
  const userId = useSelector((s) => s.usuario.user?._id);

  const selectedTeam = useMemo(
    () => equipos.find((e) => e.seleccionado === true),
    [equipos]
  );

  const [filterName, setFilterName] = useState('');
  const [filterFormation, setFilterFormation] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    if (!autoOpened && analyses.length > 0) {
      const openId = searchParams.get('open');
      if (openId) {
        const found = analyses.find((a) => a._id === openId);
        if (found) {
          setViewing(found);
          searchParams.delete('open');
          setSearchParams(searchParams, { replace: true });
        }
        setAutoOpened(true);
      }
    }
  }, [analyses, autoOpened, searchParams, setSearchParams]);

  useEffect(() => {
    if (selectedTeam?._id) {
      dispatch(fetchRivalAnalysesByTeam(selectedTeam._id));
      dispatch(fetchRivalsByTeam({ teamId: selectedTeam._id }));
    }
  }, [selectedTeam, dispatch]);

  useEffect(() => {
    if (userId) {
      dispatch(fetchActiveTemplate(userId));
      dispatch(fetchUserTemplates(userId));
    }
  }, [userId, dispatch]);

  const filtered = useMemo(() => {
    const q = filterName.trim().toLowerCase();
    return analyses.filter((a) => {
      if (q && !(a.rival || '').toLowerCase().includes(q)) return false;
      if (filterFormation && normalizeFormation(a.alineacion) !== filterFormation) {
        return false;
      }
      return true;
    });
  }, [analyses, filterName, filterFormation]);

  const formationsInUse = useMemo(() => {
    const set = new Set();
    analyses.forEach((a) => {
      if (a.alineacion) set.add(normalizeFormation(a.alineacion));
    });
    return ALINEACIONES.filter((f) => set.has(f));
  }, [analyses]);

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setViewing(null);
    setShowForm(true);
  };

  const handleSaved = () => {
    if (selectedTeam?._id) {
      dispatch(fetchRivalAnalysesByTeam(selectedTeam._id));
    }
  };

  const templateForView = useMemo(() => {
    if (!viewing) return activeTemplate;
    if (viewing.templateId) {
      return (
        userTemplates.find((tpl) => tpl._id === viewing.templateId) || activeTemplate
      );
    }
    return activeTemplate;
  }, [viewing, userTemplates, activeTemplate]);

  if (!selectedTeam) {
    return (
      <Container>
        <SectionHeader
          title={t('rivalAnalysis.title', 'Análisis del Rival')}
          subtitle={t('rivalAnalysis.noTeamSelectedSubtitle', 'Selecciona un equipo para gestionar los análisis de sus rivales.')}
          icon={MdAnalytics}
        />
        <EmptyState>
          <MdAnalytics size={56} />
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            {t('rivalAnalysis.noTeamSelected', 'No hay equipo seleccionado')}
          </div>
          <Muted>
            {t(
              'rivalAnalysis.noTeamSelectedSubtitle',
              'Selecciona un equipo para gestionar los análisis de sus rivales.'
            )}
          </Muted>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader
        title={t('rivalAnalysis.title', 'Análisis del Rival')}
        subtitle={selectedTeam?.nombre || t('rivalAnalysis.subtitle', 'Scouting y seguimiento del oponente')}
        icon={MdAnalytics}
        actions={(
          <Row $gap={8}>
            <Button $variant="secondary" onClick={() => setShowTemplates(true)}>
              <Row $gap={6}>
                <MdLibraryBooks size={18} />
                {t('rivalAnalysis.templates', 'Plantillas')}
              </Row>
            </Button>
            <Button $variant="primary" onClick={openCreate}>
              <Row $gap={6}>
                <MdAdd size={18} />
                {t('rivalAnalysis.add', 'Nuevo análisis')}
              </Row>
            </Button>
          </Row>
        )}
      />

      <Toolbar>
        <SearchBar>
          <MdSearch size={18} />
          <input
            type="text"
            placeholder={t('rivalAnalysis.searchPlaceholder', 'Buscar por rival…')}
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
        </SearchBar>
        <Muted>
          {filtered.length} / {analyses.length}
        </Muted>
      </Toolbar>

      {formationsInUse.length > 0 && (
        <Row $gap={6} $wrap>
          <FilterPill
            type="button"
            $active={!filterFormation}
            onClick={() => setFilterFormation('')}
          >
            {t('common.all', 'Todas')}
          </FilterPill>
          {formationsInUse.map((f) => (
            <FilterPill
              key={f}
              type="button"
              $active={filterFormation === f}
              onClick={() => setFilterFormation(filterFormation === f ? '' : f)}
            >
              <Row $gap={4}>
                <MdGridOn size={12} />
                {getFormationShort(f)}
              </Row>
            </FilterPill>
          ))}
        </Row>
      )}

      {loading && analyses.length === 0 ? (
        <Muted>{t('rivalAnalysis.loading', 'Cargando análisis…')}</Muted>
      ) : filtered.length === 0 ? (
        <EmptyState>
          <MdAnalytics size={56} />
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            {analyses.length === 0
              ? t('rivalAnalysis.empty', 'Aún no hay análisis')
              : t('rivalAnalysis.noResults', 'Sin resultados con esos filtros')}
          </div>
          {analyses.length === 0 && (
            <Button $variant="primary" onClick={openCreate}>
              <Row $gap={6}>
                <MdAdd size={18} />
                {t('rivalAnalysis.addFirst', 'Crear el primero')}
              </Row>
            </Button>
          )}
        </EmptyState>
      ) : (
        <Grid>
          {filtered.map((a) => {
            const formation = normalizeFormation(a.alineacion);
            return (
              <Card key={a._id} type="button" onClick={() => setViewing(a)}>
                <EscudoBox>
                  {a.rivalEscudo ? (
                    <img src={a.rivalEscudo} alt={a.rival} />
                  ) : (
                    <MdShield size={48} color="#94a3b8" />
                  )}
                </EscudoBox>
                <RivalName>{a.rival}</RivalName>
                {formation && (
                  <FormationBadge>{getFormationShort(formation)}</FormationBadge>
                )}
              </Card>
            );
          })}
        </Grid>
      )}

      {/* Modal crear/editar */}
      <AnalysisFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        editing={editing}
        selectedTeam={selectedTeam}
        userId={userId}
        rivals={rivals}
        activeTemplate={activeTemplate}
        userTemplates={userTemplates}
        onSaved={handleSaved}
      />

      {/* Modal detalle */}
      <AnalysisDetailModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        analysis={viewing}
        template={templateForView}
        selectedTeam={selectedTeam}
        onEdit={openEdit}
        onDeleted={handleSaved}
      />

      {/* Plantillas */}
      <TemplateManagerModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        userId={userId}
      />
    </Container>
  );
}
