// Modal de creación / edición de un análisis de rival.
// Renderiza dinámicamente las preguntas de la plantilla activa y soporta
// los 6 tipos: select, text, players, formation, graphic, video.
// - graphic: abre TacticalSnapshotModal y guarda {imageBase64, elements, fieldType}
// - video:   simple file input (FileReader → dataUrl). Versión web simplificada.
// - players: lista editable de {nombre, observacion}.
// - formation: modal con chips de ALINEACIONES.
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  MdAdd,
  MdClose,
  MdDelete,
  MdShield,
  MdVideocam,
  MdGridOn,
  MdBrush,
  MdCheckCircle,
} from 'react-icons/md';

import {
  createRivalAnalysis,
  updateRivalAnalysis,
} from '@/store/slices/rivalAnalysis/rivalAnalysisThunks';
import Modal from '@/ui/Modal';
import {
  Button,
  Input,
  TextArea,
  Field,
  Label,
  Stack,
  Row,
  Muted,
  ErrorText,
} from '@/ui/primitives';
import { toast } from '@/ui/toast';
import TacticalSnapshotModal from './TacticalSnapshotModal';
import {
  ALINEACIONES,
  getIconComponent,
  getQuestionText,
  resolveOptionLabel,
  partitionAnswers,
  buildDynamicAnswers,
  normalizeFormation,
  getFormationShort,
} from './rivalAnalysisData';

// ---------- styles ----------
const QBlock = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const QHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const QIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ $color }) => `${$color}22`};
  color: ${({ $color }) => $color};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const QTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
`;

const Pill = styled.button`
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.surface};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.text)};
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.12s;
`;

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const PlayerRow = styled.div`
  display: flex;
  gap: 6px;
  align-items: flex-start;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 8px;
`;

const SnapshotPreview = styled.div`
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  min-height: 120px;

  img {
    max-width: 100%;
    max-height: 240px;
    border-radius: 6px;
  }
`;

const RivalOption = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid
    ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $selected }) =>
    $selected ? `${theme.colors.primary}11` : theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  width: 100%;
  text-align: left;
`;

const RivalEscudoSm = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
`;

// ---------- helpers ----------
function PlayersEditor({ value, onChange, t }) {
  const players = Array.isArray(value) ? value : [];

  const addPlayer = () => {
    onChange([...players, { nombre: '', observacion: '' }]);
  };

  const updatePlayer = (idx, patch) => {
    onChange(players.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const removePlayer = (idx) => {
    onChange(players.filter((_, i) => i !== idx));
  };

  return (
    <Stack $gap={6}>
      {players.map((p, i) => (
        <PlayerRow key={i}>
          <Stack $gap={4} style={{ flex: 1 }}>
            <Input
              value={p.nombre || ''}
              onChange={(e) => updatePlayer(i, { nombre: e.target.value })}
              placeholder={t('rivalAnalysis.players.namePlaceholder', 'Nombre')}
            />
            <Input
              value={p.observacion || ''}
              onChange={(e) => updatePlayer(i, { observacion: e.target.value })}
              placeholder={t('rivalAnalysis.players.notePlaceholder', 'Observación')}
            />
          </Stack>
          <Button $variant="ghost" type="button" onClick={() => removePlayer(i)}>
            <MdDelete size={16} />
          </Button>
        </PlayerRow>
      ))}
      <Button $variant="secondary" type="button" onClick={addPlayer}>
        <Row $gap={6}>
          <MdAdd size={16} />
          {t('rivalAnalysis.players.add', 'Añadir jugador')}
        </Row>
      </Button>
    </Stack>
  );
}

// ---------- component ----------
export default function AnalysisFormModal({
  open,
  onClose,
  editing, // null o el rivalAnalysis a editar
  selectedTeam,
  userId,
  rivals = [],
  activeTemplate, // plantilla a usar
  onSaved,
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [videoQuestionId, setVideoQuestionId] = useState(null);

  const existingAnalyses = useSelector((s) => s.rivalAnalysis.rivalAnalyses || []);

  const [rival, setRival] = useState('');
  const [rivalId, setRivalId] = useState('');
  const [rivalEscudo, setRivalEscudo] = useState('');
  const [showRivalPicker, setShowRivalPicker] = useState(false);
  const [rivalSearch, setRivalSearch] = useState('');

  const [dynamicAnswers, setDynamicAnswers] = useState({});
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [formationQuestionId, setFormationQuestionId] = useState(null);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [snapshotQuestionId, setSnapshotQuestionId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // hidratar al abrir
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setRival(editing.rival || '');
      setRivalId(editing.rivalId || '');
      setRivalEscudo(editing.rivalEscudo || '');
      setDynamicAnswers(buildDynamicAnswers(editing));
    } else {
      setRival('');
      setRivalId('');
      setRivalEscudo('');
      setDynamicAnswers({});
    }
    setError('');
    setShowRivalPicker(false);
    setRivalSearch('');
  }, [open, editing]);

  const questions = useMemo(() => {
    const list = activeTemplate?.questions || [];
    return [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [activeTemplate]);

  const filteredRivals = useMemo(() => {
    const q = rivalSearch.trim().toLowerCase();
    if (!q) return rivals;
    return rivals.filter((r) => (r.nombre || '').toLowerCase().includes(q));
  }, [rivals, rivalSearch]);

  const setAnswer = (qid, value) => {
    setDynamicAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  // --- handlers
  const handlePickRival = (r) => {
    setRival(r.nombre || '');
    setRivalId(r._id || '');
    setRivalEscudo(r.escudo || '');
    setShowRivalPicker(false);
  };

  const openFormationPicker = (qid) => {
    setFormationQuestionId(qid);
    setShowFormationModal(true);
  };

  const pickFormation = (formation) => {
    if (formationQuestionId) {
      setAnswer(formationQuestionId, formation);
    }
    setShowFormationModal(false);
    setFormationQuestionId(null);
  };

  const openSnapshot = (qid) => {
    setSnapshotQuestionId(qid);
    setShowSnapshot(true);
  };

  const handleSnapshotSave = (payload) => {
    if (snapshotQuestionId) {
      setAnswer(snapshotQuestionId, payload);
    }
    setShowSnapshot(false);
    setSnapshotQuestionId(null);
  };

  const triggerVideoUpload = (qid) => {
    setVideoQuestionId(qid);
    fileInputRef.current?.click();
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !videoQuestionId) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error(t('rivalAnalysis.video.tooLarge', 'El vídeo es demasiado grande (máx 50MB)'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAnswer(videoQuestionId, {
        name: file.name,
        size: file.size,
        url: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!rival.trim()) {
      setError(t('rivalAnalysis.form.rivalRequired', 'Selecciona o escribe un rival'));
      return;
    }
    if (!selectedTeam?._id) {
      toast.error(t('rivalAnalysis.form.noTeam', 'No hay equipo seleccionado'));
      return;
    }
    // validar duplicado
    const dup = existingAnalyses.find(
      (a) =>
        (a.rival || '').trim().toLowerCase() === rival.trim().toLowerCase() &&
        (!editing || a._id !== editing._id)
    );
    if (dup) {
      setError(t('rivalAnalysis.form.duplicate', 'Ya existe un análisis para este rival'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { topLevel, customAnswers } = partitionAnswers(dynamicAnswers);
      const data = {
        rival: rival.trim(),
        rivalId: rivalId || undefined,
        rivalEscudo: rivalEscudo || '',
        equipo: selectedTeam._id,
        usuario: userId,
        templateId: activeTemplate?._id,
        ...topLevel,
        customAnswers,
      };
      if (data.alineacion) {
        data.alineacion = normalizeFormation(data.alineacion);
      }
      if (editing) {
        await dispatch(updateRivalAnalysis({ id: editing._id, data })).unwrap();
        toast.success(t('rivalAnalysis.form.updateSuccess', 'Análisis actualizado'));
      } else {
        await dispatch(createRivalAnalysis(data)).unwrap();
        toast.success(t('rivalAnalysis.form.createSuccess', 'Análisis creado'));
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      const msg = err?.message || t('common.error', 'Error');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // --- render question by type
  const renderQuestion = (q) => {
    const Icon = getIconComponent(q.icon);
    const value = dynamicAnswers[q.id];

    let body = null;
    if (q.type === 'select') {
      body = (
        <PillRow>
          {(q.options || []).map((opt) => (
            <Pill
              key={opt.key}
              type="button"
              $active={value === opt.key}
              onClick={() => setAnswer(q.id, value === opt.key ? '' : opt.key)}
            >
              {resolveOptionLabel(opt, t)}
            </Pill>
          ))}
        </PillRow>
      );
    } else if (q.type === 'text') {
      const isLong = q.id === 'observaciones';
      body = isLong ? (
        <TextArea
          rows={3}
          value={value || ''}
          onChange={(e) => setAnswer(q.id, e.target.value)}
        />
      ) : (
        <Input value={value || ''} onChange={(e) => setAnswer(q.id, e.target.value)} />
      );
    } else if (q.type === 'players') {
      body = (
        <PlayersEditor value={value} onChange={(v) => setAnswer(q.id, v)} t={t} />
      );
    } else if (q.type === 'formation') {
      const display = value ? getFormationShort(normalizeFormation(value)) : '';
      body = (
        <Row $gap={8}>
          <Button $variant="secondary" type="button" onClick={() => openFormationPicker(q.id)}>
            <Row $gap={6}>
              <MdGridOn size={16} />
              {display ||
                t('rivalAnalysis.form.pickFormation', 'Elegir formación')}
            </Row>
          </Button>
          {value && (
            <Button $variant="ghost" type="button" onClick={() => setAnswer(q.id, '')}>
              <MdClose size={14} />
            </Button>
          )}
        </Row>
      );
    } else if (q.type === 'graphic') {
      body = (
        <Stack $gap={6}>
          {value?.imageBase64 ? (
            <SnapshotPreview>
              <img src={value.imageBase64} alt="snapshot" />
            </SnapshotPreview>
          ) : (
            <SnapshotPreview>
              <Muted>{t('rivalAnalysis.form.noSnapshot', 'Sin gráfico')}</Muted>
            </SnapshotPreview>
          )}
          <Row $gap={6}>
            <Button $variant="secondary" type="button" onClick={() => openSnapshot(q.id)}>
              <Row $gap={6}>
                <MdBrush size={16} />
                {value?.imageBase64
                  ? t('rivalAnalysis.form.editGraphic', 'Editar gráfico')
                  : t('rivalAnalysis.form.addGraphic', 'Crear gráfico')}
              </Row>
            </Button>
            {value?.imageBase64 && (
              <Button $variant="ghost" type="button" onClick={() => setAnswer(q.id, null)}>
                <MdDelete size={14} />
              </Button>
            )}
          </Row>
        </Stack>
      );
    } else if (q.type === 'video') {
      body = (
        <Stack $gap={6}>
          {value?.url ? (
            <video
              src={value.url}
              controls
              style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6 }}
            />
          ) : (
            <Muted>{t('rivalAnalysis.form.noVideo', 'Sin vídeo')}</Muted>
          )}
          <Row $gap={6}>
            <Button $variant="secondary" type="button" onClick={() => triggerVideoUpload(q.id)}>
              <Row $gap={6}>
                <MdVideocam size={16} />
                {value?.url
                  ? t('rivalAnalysis.form.changeVideo', 'Cambiar vídeo')
                  : t('rivalAnalysis.form.addVideo', 'Subir vídeo')}
              </Row>
            </Button>
            {value?.url && (
              <Button $variant="ghost" type="button" onClick={() => setAnswer(q.id, null)}>
                <MdDelete size={14} />
              </Button>
            )}
          </Row>
        </Stack>
      );
    }

    return (
      <QBlock key={q.id}>
        <QHead>
          <QIcon $color={q.iconColor || '#3578e5'}>
            <Icon size={18} />
          </QIcon>
          <QTitle>{getQuestionText(q, t)}</QTitle>
        </QHead>
        {body}
      </QBlock>
    );
  };

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={
          editing
            ? t('rivalAnalysis.form.editTitle', 'Editar análisis')
            : t('rivalAnalysis.form.createTitle', 'Nuevo análisis')
        }
        width={760}
        footer={
          <Row $gap={8}>
            <Button $variant="secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button $variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving', 'Guardando…') : t('common.save', 'Guardar')}
            </Button>
          </Row>
        }
      >
        <Stack $gap={14}>
          {/* Selector de rival */}
          <Field>
            <Label>{t('rivalAnalysis.form.rival', 'Rival')}</Label>
            <Row $gap={8}>
              <RivalEscudoSm>
                {rivalEscudo ? (
                  <img src={rivalEscudo} alt="escudo" />
                ) : (
                  <MdShield size={18} color="#94a3b8" />
                )}
              </RivalEscudoSm>
              <Input
                value={rival}
                onChange={(e) => {
                  setRival(e.target.value);
                  setRivalId('');
                  setRivalEscudo('');
                }}
                placeholder={t('rivalAnalysis.form.rivalPlaceholder', 'Nombre del rival')}
                style={{ flex: 1 }}
              />
              <Button $variant="secondary" type="button" onClick={() => setShowRivalPicker(true)}>
                {t('rivalAnalysis.form.pickRival', 'De la lista')}
              </Button>
            </Row>
            {error && <ErrorText>{error}</ErrorText>}
          </Field>

          {!activeTemplate && (
            <Muted>
              {t(
                'rivalAnalysis.form.noTemplate',
                'No hay plantilla activa. Crea o activa una plantilla para añadir preguntas.'
              )}
            </Muted>
          )}

          {questions.map(renderQuestion)}

          {/* Aviso si no hay pregunta de alineacion en plantilla pero hay valor manual */}
          {!questions.some((q) => q.id === 'alineacion') && (
            <QBlock>
              <QHead>
                <QIcon $color="#3578e5">
                  <MdGridOn size={18} />
                </QIcon>
                <QTitle>{t('rivalAnalysis.fields.alineacion', 'Alineación')}</QTitle>
              </QHead>
              <Row $gap={8}>
                <Button
                  $variant="secondary"
                  type="button"
                  onClick={() => openFormationPicker('alineacion')}
                >
                  <Row $gap={6}>
                    <MdGridOn size={16} />
                    {dynamicAnswers.alineacion
                      ? getFormationShort(normalizeFormation(dynamicAnswers.alineacion))
                      : t('rivalAnalysis.form.pickFormation', 'Elegir formación')}
                  </Row>
                </Button>
                {dynamicAnswers.alineacion && (
                  <Button
                    $variant="ghost"
                    type="button"
                    onClick={() => setAnswer('alineacion', '')}
                  >
                    <MdClose size={14} />
                  </Button>
                )}
              </Row>
            </QBlock>
          )}
        </Stack>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          style={{ display: 'none' }}
        />
      </Modal>

      {/* Picker de rival */}
      <Modal
        open={showRivalPicker}
        onClose={() => setShowRivalPicker(false)}
        title={t('rivalAnalysis.form.pickRivalTitle', 'Elegir rival')}
        width={460}
      >
        <Stack $gap={10}>
          <Input
            value={rivalSearch}
            onChange={(e) => setRivalSearch(e.target.value)}
            placeholder={t('common.search', 'Buscar…')}
            autoFocus
          />
          {filteredRivals.length === 0 ? (
            <Muted>{t('rivalAnalysis.form.noRivals', 'Sin rivales')}</Muted>
          ) : (
            <Stack $gap={6}>
              {filteredRivals.map((r) => (
                <RivalOption
                  key={r._id}
                  type="button"
                  $selected={r._id === rivalId}
                  onClick={() => handlePickRival(r)}
                >
                  <RivalEscudoSm>
                    {r.escudo ? (
                      <img src={r.escudo} alt={r.nombre} />
                    ) : (
                      <MdShield size={16} color="#94a3b8" />
                    )}
                  </RivalEscudoSm>
                  <span style={{ flex: 1 }}>{r.nombre}</span>
                  {r._id === rivalId && <MdCheckCircle size={18} color="#10b981" />}
                </RivalOption>
              ))}
            </Stack>
          )}
        </Stack>
      </Modal>

      {/* Picker de formación */}
      <Modal
        open={showFormationModal}
        onClose={() => {
          setShowFormationModal(false);
          setFormationQuestionId(null);
        }}
        title={t('rivalAnalysis.form.pickFormation', 'Elegir formación')}
        width={420}
      >
        <PillRow>
          {ALINEACIONES.map((f) => (
            <Pill
              key={f}
              type="button"
              $active={
                formationQuestionId &&
                normalizeFormation(dynamicAnswers[formationQuestionId]) === f
              }
              onClick={() => pickFormation(f)}
            >
              {getFormationShort(f)}
            </Pill>
          ))}
        </PillRow>
      </Modal>

      {/* Snapshot táctico */}
      <TacticalSnapshotModal
        open={showSnapshot}
        onClose={() => {
          setShowSnapshot(false);
          setSnapshotQuestionId(null);
        }}
        onSave={handleSnapshotSave}
        title={t('rivalAnalysis.form.tacticalBoard', 'Pizarra táctica')}
      />
    </>
  );
}
