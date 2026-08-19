import { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  MdStar,
  MdCheck,
  MdPerson,
  MdCalendarToday,
  MdAssignment,
  MdGroup,
  MdSearch,
  MdCheckCircle,
  MdLayers,
} from 'react-icons/md';

import { addEvaluation, updateEvaluation } from '@/store/slices/evaluations/evaluationsSlice';
import { fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import useSupervision from '@/hooks/useSupervision';
import Modal, { FORM_MODAL_WIDTH } from '@/ui/Modal';
import { Button, Input, TextArea, Field, Label, Stack, Row, Muted, ErrorText } from '@/ui/primitives';
import { toast } from '@/ui/toast';

import {
  getIconComponent,
  getScoreColor,
  computeEvaluationScore,
  resolveOptionLabel,
} from './evaluationsData';

// ---------- styles ----------
const SectionBox = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ScopeTabGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const ScopeTabBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff'
      : theme.colors.surface};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.text)};
  font-weight: 700;
  font-size: 13.5px;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const TemplateCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
`;

const TemplateCardBtn = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff'
      : theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;
  transition: all 150ms ease;
  position: relative;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const PlayerSearchInput = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 6px 12px;
  margin-bottom: 8px;

  input {
    border: none;
    background: transparent;
    outline: none;
    color: ${({ theme }) => theme.colors.text};
    width: 100%;
    font-size: 13.5px;
  }
`;

const PlayerGridScroll = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const PlayerCardBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff'
      : theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  text-align: left;
  transition: all 120ms ease;
  position: relative;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const PlayerAvatarCircle = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  background-image: ${({ src }) => (src ? `url(${src})` : 'none')};
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
`;

const DorsalBadge = styled.span`
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.primarySoft};
  padding: 1px 6px;
  border-radius: 4px;
`;

const QuestionBox = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const QuestionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const IconCircle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ $color }) => `${$color}22`};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const QuestionTitle = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
`;

const Rating10Container = styled.div`
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;

  @media (max-width: 600px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const Rating10Btn = styled.button`
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 2px solid
    ${({ $selected, $color, theme }) => ($selected ? $color : theme.colors.border)};
  background: ${({ $selected, $color, theme }) =>
    $selected ? $color : theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
  color: ${({ $selected, theme }) => ($selected ? '#ffffff' : theme.colors.text)};
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 120ms ease;

  &:hover {
    border-color: ${({ $color }) => $color};
    transform: translateY(-1px);
  }
`;

const StarsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StarBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: ${({ $filled }) => ($filled ? '#fbbf24' : '#cbd5e1')};
  transition: transform 120ms ease, color 120ms ease;
  display: inline-flex;

  &:hover {
    transform: scale(1.15);
  }
`;

const OptionPillGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const OptionPill = styled.button`
  padding: 8px 14px;
  border-radius: 999px;
  border: 2px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  background: ${({ $selected, theme }) =>
    $selected ? (theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff') : theme.colors.surface};
  color: ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.text)};
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 120ms ease;
`;

const ScoreSummaryBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-weight: 700;
  font-size: 15px;
`;

export default function EvaluationFormModal({ open, onClose, evaluationToEdit = null }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const templates = useSelector((s) => s.evaluations.templates || []);
  const players = useSelector((s) => s.player.players || []);
  const equipos = useSelector((s) => s.team.teams || []);

  const selectedTeam = useMemo(
    () => equipos.find((e) => e.seleccionado === true) || equipos[0],
    [equipos]
  );

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [scope, setScope] = useState('POR_JUGADOR');
  const [playerId, setPlayerId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [answers, setAnswers] = useState({});
  const [generalNotes, setGeneralNotes] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [error, setError] = useState('');

  // Fetch players on mount / team load
  useEffect(() => {
    const teamId = selectedTeam?._id || selectedTeam?.id;
    if (open && teamId) {
      dispatch(fetchJugadoresEquipo({ team: teamId }));
    }
  }, [open, selectedTeam?._id, selectedTeam?.id, dispatch]);

  useEffect(() => {
    if (open) {
      if (evaluationToEdit) {
        setDate(evaluationToEdit.date || new Date().toISOString().split('T')[0]);
        setScope(evaluationToEdit.scope || 'POR_JUGADOR');
        setPlayerId(evaluationToEdit.playerId || '');
        setTemplateId(evaluationToEdit.templateId || '');
        setAnswers(evaluationToEdit.answers || {});
        setGeneralNotes(evaluationToEdit.generalNotes || '');
      } else {
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
        setScope('POR_JUGADOR');
        setPlayerId(players[0]?._id || '');
        const defaultTpl = templates.find((t) => t.isDefault) || templates[0];
        setTemplateId(defaultTpl?._id || '');
        setAnswers({});
        setGeneralNotes('');
      }
      setPlayerSearch('');
      setError('');
    }
  }, [open, evaluationToEdit, templates]);

  // Ensure playerId has default if empty once players load
  useEffect(() => {
    if (open && scope === 'POR_JUGADOR' && !playerId && players.length > 0) {
      setPlayerId(players[0]._id);
    }
  }, [open, scope, playerId, players]);

  const selectedTemplate = templates.find((t) => t._id === templateId) || templates[0];
  const questions = selectedTemplate?.questions || [];

  const filteredPlayers = useMemo(() => {
    if (!playerSearch.trim()) return players;
    const q = playerSearch.toLowerCase();
    return players.filter((p) => {
      const name = `${p.nombre || ''} ${p.apellidos || p.apellido || ''}`.toLowerCase();
      const dorsal = String(p.dorsal || '');
      return name.includes(q) || dorsal.includes(q);
    });
  }, [players, playerSearch]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleToggleMultiSelect = (questionId, optionKey) => {
    const current = Array.isArray(answers[questionId]) ? answers[questionId] : [];
    if (current.includes(optionKey)) {
      handleAnswerChange(
        questionId,
        current.filter((k) => k !== optionKey)
      );
    } else {
      handleAnswerChange(questionId, [...current, optionKey]);
    }
  };

  const calculatedScore = computeEvaluationScore(answers, questions);
  const scoreColors = getScoreColor(calculatedScore);

  const { canMutate, isDemo } = useSupervision();

  const handleSave = () => {
    if (!canMutate && isDemo) {
      toast.error(t('subscription.availableWithSubscription', 'Disponible solo con suscripción'));
      return;
    }
    if (scope === 'POR_JUGADOR' && !playerId) {
      setError(t('evaluations.form.playerRequired', 'Selecciona un jugador para la evaluación'));
      return;
    }
    if (!templateId) {
      setError(t('evaluations.form.templateRequired', 'Selecciona una plantilla de evaluación'));
      return;
    }

    const selectedPlayer = players.find((p) => p._id === playerId);
    const playerName = selectedPlayer
      ? `${selectedPlayer.nombre || ''} ${selectedPlayer.apellidos || selectedPlayer.apellido || ''}`.trim()
      : '';

    const payload = {
      date,
      scope,
      playerId: scope === 'POR_JUGADOR' ? playerId : null,
      playerName: scope === 'POR_JUGADOR' ? playerName : 'Equipo / General',
      playerPhoto: scope === 'POR_JUGADOR' ? selectedPlayer?.foto || selectedPlayer?.imagen : null,
      playerDorsal: scope === 'POR_JUGADOR' ? selectedPlayer?.dorsal : null,
      templateId,
      templateName: selectedTemplate?.name || 'Evaluación',
      answers,
      overallScore: calculatedScore,
      generalNotes: generalNotes.trim(),
    };

    if (evaluationToEdit) {
      dispatch(updateEvaluation({ id: evaluationToEdit._id, data: payload }));
      toast.success(t('evaluations.form.updateSuccess', 'Evaluación actualizada correctamente'));
    } else {
      dispatch(addEvaluation(payload));
      toast.success(t('evaluations.form.saveSuccess', 'Evaluación guardada correctamente'));
    }

    onClose?.();
  };

  const getRatingColor = (val) => {
    if (val >= 8.5) return '#10b981';
    if (val >= 7) return '#0284c7';
    if (val >= 5) return '#f59e0b';
    return '#ef4444';
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        evaluationToEdit
          ? t('evaluations.form.editTitle', 'Editar Evaluación')
          : t('evaluations.form.newTitle', 'Nueva Evaluación')
      }
      width={FORM_MODAL_WIDTH}
      footer={
        <Row $gap={8}>
          <Button $variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button $variant="primary" onClick={handleSave}>
            {t('common.save', 'Guardar Evaluación')}
          </Button>
        </Row>
      }
    >
      <Stack $gap={16}>
        {error && <ErrorText>{error}</ErrorText>}

        {/* 1. Date & Scope Section */}
        <SectionBox>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <Field style={{ margin: 0 }}>
              <Label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdCalendarToday size={16} />
                Fecha de la Evaluación
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>

            <Field style={{ margin: 0 }}>
              <Label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdAssignment size={16} />
                Ámbito de la Evaluación
              </Label>
              <ScopeTabGrid>
                <ScopeTabBtn
                  type="button"
                  $active={scope === 'POR_JUGADOR'}
                  onClick={() => setScope('POR_JUGADOR')}
                >
                  <MdPerson size={18} />
                  Por Jugador
                </ScopeTabBtn>

                <ScopeTabBtn
                  type="button"
                  $active={scope === 'GENERAL'}
                  onClick={() => {
                    setScope('GENERAL');
                    setPlayerId('');
                  }}
                >
                  <MdGroup size={18} />
                  General / Equipo
                </ScopeTabBtn>
              </ScopeTabGrid>
            </Field>
          </div>
        </SectionBox>

        {/* 2. Visual Template Selector */}
        <SectionBox>
          <Label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <MdLayers size={18} color="#3b82f6" />
            Selecciona la Plantilla de Preguntas
          </Label>
          <TemplateCardGrid>
            {templates.map((tpl) => {
              const isSelected = templateId === tpl._id;
              return (
                <TemplateCardBtn
                  key={tpl._id}
                  type="button"
                  $selected={isSelected}
                  onClick={() => {
                    setTemplateId(tpl._id);
                    setAnswers({});
                  }}
                >
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 10, right: 10, color: '#3b82f6' }}>
                      <MdCheckCircle size={18} />
                    </div>
                  )}
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{tpl.name}</span>
                  <Muted style={{ fontSize: 12 }}>
                    {tpl.questions?.length || 0} preguntas · {tpl.scope === 'GENERAL' ? 'General' : 'Por Jugador'}
                  </Muted>
                </TemplateCardBtn>
              );
            })}
          </TemplateCardGrid>
        </SectionBox>

        {/* 3. Visual Player Selector (Only if scope === POR_JUGADOR) */}
        {scope === 'POR_JUGADOR' && (
          <SectionBox>
            <Label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              <MdPerson size={18} color="#3b82f6" />
              Selecciona el Jugador a Evaluar
            </Label>

            <PlayerSearchInput>
              <MdSearch size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Buscar por nombre o dorsal..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
              />
            </PlayerSearchInput>

            {filteredPlayers.length === 0 ? (
              <Muted style={{ padding: 12, textAlign: 'center' }}>
                {players.length === 0
                  ? 'Cargando plantilla de jugadores...'
                  : 'No se encontraron jugadores con ese filtro'}
              </Muted>
            ) : (
              <PlayerGridScroll>
                {filteredPlayers.map((p) => {
                  const isSelected = playerId === p._id;
                  const pPhoto = p.foto || p.imagen;
                  const pName = `${p.nombre || ''} ${p.apellidos || p.apellido || ''}`.trim();

                  return (
                    <PlayerCardBtn
                      key={p._id}
                      type="button"
                      $selected={isSelected}
                      onClick={() => setPlayerId(p._id)}
                    >
                      <PlayerAvatarCircle src={pPhoto}>
                        {!pPhoto && (p.nombre?.[0] || 'J')}
                      </PlayerAvatarCircle>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pName}
                        </div>
                        {p.dorsal && <DorsalBadge>#{p.dorsal}</DorsalBadge>}
                      </div>
                      {isSelected && <MdCheckCircle size={18} color="#3b82f6" />}
                    </PlayerCardBtn>
                  );
                })}
              </PlayerGridScroll>
            )}
          </SectionBox>
        )}

        {/* Calculated score summary badge */}
        {calculatedScore !== null && (
          <ScoreSummaryBadge $bg={scoreColors.bg} $color={scoreColors.color}>
            <span>Nota General Calculada:</span>
            <span style={{ fontSize: 20 }}>{calculatedScore} / 10</span>
          </ScoreSummaryBadge>
        )}

        {/* Dynamic Questions rendering */}
        <Stack $gap={12}>
          <Label style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
            Cuestionario de Evaluación
          </Label>

          {questions.map((q, idx) => {
            const Icon = getIconComponent(q.icon);
            const val = answers[q.id];

            return (
              <QuestionBox key={q.id || idx}>
                <QuestionHeader>
                  <IconCircle $color={q.iconColor || '#3b82f6'}>
                    <Icon size={18} />
                  </IconCircle>
                  <QuestionTitle>
                    {idx + 1}. {q.questionText}
                  </QuestionTitle>
                </QuestionHeader>

                {/* Rating 1 - 10 */}
                {q.type === 'rating10' && (
                  <Rating10Container>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                      const isSel = Number(val) === num;
                      const numColor = getRatingColor(num);
                      return (
                        <Rating10Btn
                          key={num}
                          type="button"
                          $selected={isSel}
                          $color={numColor}
                          onClick={() => handleAnswerChange(q.id, num)}
                        >
                          {num}
                        </Rating10Btn>
                      );
                    })}
                  </Rating10Container>
                )}

                {/* 5 Stars */}
                {q.type === 'stars5' && (
                  <StarsRow>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarBtn
                        key={star}
                        type="button"
                        $filled={Number(val) >= star}
                        onClick={() => handleAnswerChange(q.id, star)}
                      >
                        <MdStar size={30} />
                      </StarBtn>
                    ))}
                    <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600 }}>
                      {val ? `${val} / 5 estrellas` : 'Sin puntuar'}
                    </span>
                  </StarsRow>
                )}

                {/* Single Choice (Select) */}
                {q.type === 'select' && (
                  <OptionPillGroup>
                    {(q.options || []).map((opt, i) => {
                      const optKey = typeof opt === 'object' ? opt.key : opt;
                      const isSel = val === optKey;
                      return (
                        <OptionPill
                          key={i}
                          type="button"
                          $selected={isSel}
                          onClick={() => handleAnswerChange(q.id, optKey)}
                        >
                          {isSel && <MdCheck size={16} />}
                          {resolveOptionLabel(opt)}
                        </OptionPill>
                      );
                    })}
                  </OptionPillGroup>
                )}

                {/* Multi Select */}
                {q.type === 'multiSelect' && (
                  <OptionPillGroup>
                    {(q.options || []).map((opt, i) => {
                      const optKey = typeof opt === 'object' ? opt.key : opt;
                      const selectedList = Array.isArray(val) ? val : [];
                      const isSel = selectedList.includes(optKey);
                      return (
                        <OptionPill
                          key={i}
                          type="button"
                          $selected={isSel}
                          onClick={() => handleToggleMultiSelect(q.id, optKey)}
                        >
                          {isSel && <MdCheck size={16} />}
                          {resolveOptionLabel(opt)}
                        </OptionPill>
                      );
                    })}
                  </OptionPillGroup>
                )}

                {/* Boolean (Sí / No) */}
                {q.type === 'boolean' && (
                  <OptionPillGroup>
                    <OptionPill
                      type="button"
                      $selected={val === true}
                      onClick={() => handleAnswerChange(q.id, true)}
                    >
                      {val === true && <MdCheck size={16} />}
                      Sí / Afirmativo
                    </OptionPill>
                    <OptionPill
                      type="button"
                      $selected={val === false}
                      onClick={() => handleAnswerChange(q.id, false)}
                    >
                      {val === false && <MdCheck size={16} />}
                      No / Negativo
                    </OptionPill>
                  </OptionPillGroup>
                )}

                {/* Player picker */}
                {q.type === 'player' && (
                  <PlayerGridScroll style={{ maxHeight: 150 }}>
                    {players.map((p) => {
                      const isSelected = val === p._id;
                      const pPhoto = p.foto || p.imagen;
                      const pName = `${p.nombre || ''} ${p.apellidos || p.apellido || ''}`.trim();
                      return (
                        <PlayerCardBtn
                          key={p._id}
                          type="button"
                          $selected={isSelected}
                          onClick={() => handleAnswerChange(q.id, p._id)}
                        >
                          <PlayerAvatarCircle src={pPhoto}>
                            {!pPhoto && (p.nombre?.[0] || 'J')}
                          </PlayerAvatarCircle>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {pName}
                            </div>
                            {p.dorsal && <DorsalBadge>#{p.dorsal}</DorsalBadge>}
                          </div>
                          {isSelected && <MdCheckCircle size={18} color="#3b82f6" />}
                        </PlayerCardBtn>
                      );
                    })}
                  </PlayerGridScroll>
                )}

                {/* Free Text */}
                {q.type === 'text' && (
                  <TextArea
                    rows={3}
                    value={val || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Escribe aquí las observaciones o respuesta libre..."
                  />
                )}
              </QuestionBox>
            );
          })}
        </Stack>

        {/* General notes */}
        <Field>
          <Label>Observaciones Generales Adicionales</Label>
          <TextArea
            rows={3}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Añade cualquier nota final sobre esta evaluación..."
          />
        </Field>
      </Stack>
    </Modal>
  );
}
