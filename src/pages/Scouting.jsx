import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import styled, { useTheme } from 'styled-components';
import { MdAdd, MdPersonSearch, MdSearch, MdStar } from 'react-icons/md';

import SectionHeader from '@/ui/SectionHeader';
import Modal, { FORM_MODAL_WIDTH } from '@/ui/Modal';
import { Badge, Button, Field, Input, Label, Muted, Row, Stack, TextArea } from '@/ui/primitives';
import TeamRequiredCard from '@/components/shared/TeamRequiredCard';
import CanMutate from '@/components/shared/CanMutate';
import useSupervision from '@/hooks/useSupervision';
import {
  createScoutingReport,
  deleteScoutingReport,
  getScoutingReports,
  updateScoutingReport,
} from '@/api/scouting';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';
import ScoutingDetailModal from '@/components/scouting/ScoutingDetailModal';

const TAGS = [
  'Rápido',
  'Técnico',
  'Inteligente',
  'Competitivo',
  'Trabajador',
  'Creativo',
  'Fuerte',
  'Buen pase',
  'Buen disparo',
  'Buen 1 vs 1',
  'Líder',
  'Polivalente',
  'Agresivo',
  'Tranquilo con balón',
  'Buena lectura táctica',
];

const SCORE_GROUPS = [
  ['technical', 'Tecnica', ['control', 'pase', 'conduccion', 'regate', 'tiro', 'juegoAereo']],
  ['physical', 'Fisica', ['velocidad', 'resistencia', 'fuerza', 'agilidad']],
  ['tactical', 'Tactica', ['posicionamiento', 'tomaDecisiones', 'visionJuego', 'trabajoDefensivo']],
  ['mental', 'Mental', ['actitud', 'esfuerzo', 'concentracion', 'comunicacion', 'liderazgo']],
];
const SCORE_VALUES = Array.from({ length: 11 }, (_, value) => value);

const FIELD_LABELS = {
  juegoAereo: 'Juego aereo',
  tomaDecisiones: 'Toma de decisiones',
  visionJuego: 'Vision de juego',
  trabajoDefensivo: 'Trabajo defensivo',
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Toolbar = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 220px;
  padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};

  input {
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: ${({ theme }) => theme.colors.text};
    font: inherit;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
`;

const ReportCard = styled.article`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const CardTitle = styled.div`
  font-weight: 800;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text};
`;

const CardMeta = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
  line-height: 1.4;
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const TagButton = styled.button`
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primarySoft : theme.colors.surface};
  color: ${({ theme, $active }) => ($active ? theme.colors.primarySoftText : theme.colors.text)};
  border-radius: ${({ theme }) => theme.radius.full};
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
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

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const TwoGrid = styled(FormGrid)`
  grid-template-columns: repeat(2, minmax(0, 1fr));
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.inputBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-height: 42px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primarySoft};
  }
`;

const SectionTitle = styled.div`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
`;

const today = () => new Date().toISOString().slice(0, 10);
const scoreLabel = (field) => FIELD_LABELS[field] || field.charAt(0).toUpperCase() + field.slice(1);
const cleanNumber = (value) => (value === '' || value == null ? null : Number(value));
const normalizeScore = (value) => value !== '' && value != null && SCORE_VALUES.includes(Number(value)) ? String(value) : '';

function ScoreSelect({ value, onChange, label }) {
  return (
    <Select value={value ?? ''} onChange={onChange} aria-label={label}>
      <option value="">Sin valorar</option>
      {SCORE_VALUES.map((score) => (
        <option key={score} value={score}>{score} / 10</option>
      ))}
    </Select>
  );
}

const emptyScores = () =>
  SCORE_GROUPS.reduce((acc, [group, , fields]) => {
    acc[group] = fields.reduce((inner, field) => ({ ...inner, [field]: '' }), {});
    return acc;
  }, {});

function emptyForm(team, params = new URLSearchParams()) {
  const isFromMatch = !!params.get('matchSheet');
  return {
    equipo: team?._id || '',
    playerName: params.get('playerName') || '',
    age: '',
    playerTeam: params.get('playerTeam') || params.get('rival') || '',
    position: '',
    dominantFoot: '',
    observationDate: params.get('date') || today(),
    rival: isFromMatch ? team?.nombre || '' : params.get('rival') || '',
    rivalId: params.get('rivalId') || null,
    competition: params.get('competition') || '',
    matchSheet: params.get('matchSheet') || null,
    rivalAnalysis: params.get('rivalAnalysis') || null,
    rating: '',
    ...emptyScores(),
    strengths: '',
    improvements: '',
    observations: '',
    recommendation: 'seguir_observando',
    potential: 'medio',
    tags: [],
  };
}

function normalizeForForm(report, team) {
  const normalized = {
    ...emptyForm(team),
    ...report,
    equipo: report.equipo?._id || report.equipo || team?._id || '',
    rivalId: report.rivalId?._id || report.rivalId || null,
    observationDate: report.observationDate
      ? new Date(report.observationDate).toISOString().slice(0, 10)
      : today(),
    age: report.age ?? '',
    rating: normalizeScore(report.rating),
    tags: report.tags || [],
  };
  SCORE_GROUPS.forEach(([group, , fields]) => {
    normalized[group] = fields.reduce(
      (scores, field) => ({ ...scores, [field]: normalizeScore(report[group]?.[field]) }),
      {},
    );
  });
  return normalized;
}

function cleanPayload(form) {
  const payload = {
    ...form,
    age: cleanNumber(form.age),
    rating: cleanNumber(form.rating),
  };
  SCORE_GROUPS.forEach(([group, , fields]) => {
    payload[group] = fields.reduce(
      (acc, field) => ({ ...acc, [field]: cleanNumber(form[group]?.[field]) }),
      {},
    );
  });
  return payload;
}

export default function Scouting() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canMutate } = useSupervision();
  const [searchParams, setSearchParams] = useSearchParams();
  const teams = useSelector((s) => s.team?.teams ?? []);
  const selectedTeam = useMemo(() => teams.find((e) => e.seleccionado), [teams]);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [originMatchSheet, setOriginMatchSheet] = useState(null);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [form, setForm] = useState(() => emptyForm(selectedTeam));
  const [saving, setSaving] = useState(false);

  const loadReports = async () => {
    if (!selectedTeam?._id) return;
    setLoading(true);
    try {
      const { data } = await getScoutingReports({ equipo: selectedTeam._id });
      setReports(data || []);
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar scouting');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedTeam?._id]);

  useEffect(() => {
    if (!selectedTeam?._id || !searchParams.size) return;
    const editId = searchParams.get('edit');
    const msId = searchParams.get('matchSheet');
    if (msId) {
      setOriginMatchSheet(msId);
    }
    if (editId) {
      const reportToEdit = reports.find((r) => r._id === editId);
      if (reportToEdit) {
        setEditing(reportToEdit);
        setForm(normalizeForForm(reportToEdit, selectedTeam));
        setSearchParams({}, { replace: true });
      }
      return;
    }
    setEditing({ _id: null });
    setForm(emptyForm(selectedTeam, searchParams));
    setSearchParams({}, { replace: true });
  }, [selectedTeam?._id, searchParams, reports, setSearchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((report) =>
      [report.playerName, report.playerTeam, report.position, report.rival].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [reports, query]);

  const openCreate = () => {
    setEditing({ _id: null });
    setForm(emptyForm(selectedTeam));
  };

  const openEdit = (report) => {
    setEditing(report);
    setForm(normalizeForForm(report, selectedTeam));
  };

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const updateScore = (group, field, value) =>
    setForm((prev) => ({
      ...prev,
      [group]: { ...(prev[group] || {}), [field]: value },
    }));
  const toggleTag = (tag) =>
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((item) => item !== tag)
        : [...prev.tags, tag],
    }));

  const handleSave = async (event) => {
    event.preventDefault();
    if (!canMutate) return;
    if (!form.playerName.trim()) {
      toast.error('El nombre del jugador es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const payload = cleanPayload({ ...form, equipo: selectedTeam?._id || form.equipo });
      if (editing?._id) await updateScoutingReport(editing._id, payload);
      else await createScoutingReport(payload);
      setEditing(null);
      await loadReports();
      toast.success('Informe de scouting guardado');
      if (originMatchSheet || (form.matchSheet && !editing?._id)) {
        navigate(`/match-sheets?open=${originMatchSheet || form.matchSheet}`);
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el informe');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (report) => {
    const ok = await confirmAction(`Eliminar el informe de ${report.playerName}?`, {
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteScoutingReport(report._id);
      await loadReports();
      toast.success('Informe eliminado');
      if (originMatchSheet) {
        navigate(`/match-sheets?open=${originMatchSheet}`);
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar');
    }
  };

  if (!selectedTeam) {
    return (
      <Container>
        <SectionHeader
          title={t('menu.scouting', 'Scouting')}
          subtitle="Selecciona un equipo para registrar informes de jugadores."
          icon={MdPersonSearch}
        />
        <TeamRequiredCard />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader
        title={t('menu.scouting', 'Scouting')}
        subtitle={selectedTeam.nombre}
        icon={MdPersonSearch}
        actions={
          <CanMutate>
            <Button $variant="primary" onClick={openCreate}>
              <MdAdd size={18} />
              Nuevo informe
            </Button>
          </CanMutate>
        }
      />

      <Toolbar>
        <SearchBox>
          <MdSearch size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jugador, equipo, posicion..."
          />
        </SearchBox>
        <Muted>{loading ? 'Cargando...' : `${filtered.length} / ${reports.length}`}</Muted>
      </Toolbar>

      <Grid>
        {filtered.map((report) => (
          <ReportCard
            key={report._id}
            onClick={() => setSelectedReport(report)}
            style={{ cursor: 'pointer' }}
          >
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }} $gap={8}>
              <CardTitle>{report.playerName}</CardTitle>
              {report.rating ? (
                <Badge $tone="warning">
                  <MdStar /> {report.rating}/10
                </Badge>
              ) : null}
            </Row>
            <CardMeta>
              {[report.position, report.playerTeam].filter(Boolean).join(' - ') ||
                'Sin equipo/posición'}
            </CardMeta>
            <TagList style={{ marginTop: 8 }}>
              {(report.tags || []).slice(0, 5).map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </TagList>
          </ReportCard>
        ))}
      </Grid>

      {!loading && filtered.length === 0 ? (
        <EmptyState>
          <MdPersonSearch size={56} />
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            {reports.length === 0
              ? 'No hay informes de scouting'
              : 'Sin resultados con esa búsqueda'}
          </div>
          <Muted>
            {reports.length === 0
              ? 'Crea tu primer informe para comenzar'
              : 'Prueba con otra búsqueda.'}
          </Muted>
          {reports.length === 0 && (
            <CanMutate>
              <Button $variant="primary" onClick={openCreate}>
                <Row $gap={6} style={{ alignItems: 'center' }}>
                  <MdAdd size={18} />
                  Crear informe
                </Row>
              </Button>
            </CanMutate>
          )}
        </EmptyState>
      ) : null}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Editar informe de scouting' : 'Nuevo informe de scouting'}
        width={FORM_MODAL_WIDTH}
        footer={
          <>
            <Button
              type="button"
              $variant="secondary"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="scouting-form" disabled={saving || !canMutate}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form id="scouting-form" onSubmit={handleSave}>
          <Stack $gap={18}>
            <FormGrid>
              <Field>
                <Label>Nombre</Label>
                <Input
                  value={form.playerName}
                  onChange={(e) => update({ playerName: e.target.value })}
                  required
                />
              </Field>
              <Field>
                <Label>Edad</Label>
                <Input
                  type="number"
                  min="0"
                  max="80"
                  value={form.age}
                  onChange={(e) => update({ age: e.target.value })}
                />
              </Field>
              <Field>
                <Label>Equipo</Label>
                <Input
                  value={form.playerTeam}
                  onChange={(e) => update({ playerTeam: e.target.value })}
                />
              </Field>
              <Field>
                <Label>Posición</Label>
                <Input
                  readOnly
                  placeholder="Seleccionar posición..."
                  value={form.position}
                  onClick={() => setShowPositionModal(true)}
                  style={{ cursor: 'pointer' }}
                />
              </Field>
              <Field>
                <Label>Pie dominante</Label>
                <Select
                  value={form.dominantFoot}
                  onChange={(e) => update({ dominantFoot: e.target.value })}
                >
                  <option value="">Sin definir</option>
                  <option value="derecho">Derecho</option>
                  <option value="izquierdo">Izquierdo</option>
                  <option value="ambos">Ambos</option>
                </Select>
              </Field>
              <Field>
                <Label>Fecha observacion</Label>
                <Input
                  type="date"
                  value={form.observationDate}
                  onChange={(e) => update({ observationDate: e.target.value })}
                />
              </Field>
              <Field>
                <Label>Rival</Label>
                <Input value={form.rival} onChange={(e) => update({ rival: e.target.value })} />
              </Field>
              <Field>
                <Label>Competicion</Label>
                <Input
                  value={form.competition}
                  onChange={(e) => update({ competition: e.target.value })}
                />
              </Field>
              <Field>
                <Label>Valoracion final</Label>
                <ScoreSelect
                  value={form.rating}
                  onChange={(e) => update({ rating: e.target.value })}
                  label="Valoracion final"
                />
              </Field>
            </FormGrid>

            {SCORE_GROUPS.map(([group, title, fields]) => (
              <Stack key={group} $gap={8}>
                <SectionTitle>{title}</SectionTitle>
                <FormGrid>
                  {fields.map((field) => (
                    <Field key={field}>
                      <Label>{scoreLabel(field)}</Label>
                      <ScoreSelect
                        value={form[group]?.[field] ?? ''}
                        onChange={(e) => updateScore(group, field, e.target.value)}
                        label={scoreLabel(field)}
                      />
                    </Field>
                  ))}
                </FormGrid>
              </Stack>
            ))}

            <Stack $gap={8}>
              <SectionTitle>Tags</SectionTitle>
              <TagList>
                {TAGS.map((tag) => (
                  <TagButton
                    key={tag}
                    type="button"
                    $active={form.tags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </TagButton>
                ))}
              </TagList>
            </Stack>

            <TwoGrid>
              <Field>
                <Label>Recomendacion</Label>
                <Select
                  value={form.recommendation}
                  onChange={(e) => update({ recommendation: e.target.value })}
                >
                  <option value="muy_recomendable">Muy recomendable</option>
                  <option value="seguir_observando">Seguir observando</option>
                  <option value="no_recomendado">No recomendado</option>
                </Select>
              </Field>
              <Field>
                <Label>Potencial</Label>
                <Select
                  value={form.potential}
                  onChange={(e) => update({ potential: e.target.value })}
                >
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </Select>
              </Field>
            </TwoGrid>

            <TwoGrid>
              <Field>
                <Label>Fortalezas</Label>
                <TextArea
                  value={form.strengths}
                  onChange={(e) => update({ strengths: e.target.value })}
                />
              </Field>
              <Field>
                <Label>Aspectos a mejorar</Label>
                <TextArea
                  value={form.improvements}
                  onChange={(e) => update({ improvements: e.target.value })}
                />
              </Field>
            </TwoGrid>
            <Field>
              <Label>Observaciones</Label>
              <TextArea
                value={form.observations}
                onChange={(e) => update({ observations: e.target.value })}
              />
            </Field>
          </Stack>
        </form>
      </Modal>
      <ScoutingDetailModal
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
        onEdit={openEdit}
        onDelete={canMutate ? handleDelete : undefined}
      />
      <Modal
        open={showPositionModal}
        onClose={() => setShowPositionModal(false)}
        title="Seleccionar Posición"
        width={500}
      >
        <Stack $gap={16}>
          {POSITION_GROUPS.map((group) => (
            <div key={group.line} style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: group.color,
                  textTransform: 'uppercase',
                  borderBottom: `2px solid ${group.color}20`,
                  paddingBottom: '4px',
                  marginBottom: '8px',
                }}
              >
                {group.line}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {group.positions.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => {
                      update({ position: pos });
                      setShowPositionModal(false);
                    }}
                    style={{
                      background: form.position === pos ? group.color : theme.colors.backgroundAlt,
                      color: form.position === pos ? '#fff' : theme.colors.text,
                      border: `1px solid ${form.position === pos ? group.color : theme.colors.border}`,
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Stack>
      </Modal>
    </Container>
  );
}

const POSITION_GROUPS = [
  {
    line: 'Portería',
    color: '#10b981',
    positions: ['Portero'],
  },
  {
    line: 'Defensa',
    color: '#3b82f6',
    positions: ['Central', 'Lateral Derecho', 'Lateral Izquierdo', 'Carrilero'],
  },
  {
    line: 'Mediocampo',
    color: '#f59e0b',
    positions: ['Pivote', 'Mediocentro', 'Interior', 'Mediapunta'],
  },
  {
    line: 'Delantera',
    color: '#ef4444',
    positions: ['Delantero Centro', 'Extremo Derecho', 'Extremo Izquierdo', 'Segundo Delantero'],
  },
];
