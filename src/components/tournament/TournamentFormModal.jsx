import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Modal, { FORM_MODAL_WIDTH } from '@/ui/Modal';
import Select from '@/ui/Select';
import {
  Button, Field, Input, Label, Row, Stack, TextArea, ErrorText, Muted,
} from '@/ui/primitives';
import { showMissingFieldsToast } from '@/utils/validationToast';
import {
  TOURNAMENT_TYPES, FORMATO_OPTIONS, RONDAS_OPTIONS, TOURNAMENT_COLORS,
} from './tournamentHelpers';

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.full};
  border: 1px solid ${({ theme, $active, $color }) => $active ? ($color || theme.colors.primary) : theme.colors.border};
  background: ${({ $active, $color }) => $active ? `${$color || '#1a237e'}18` : 'transparent'};
  color: ${({ theme, $active, $color }) => $active ? ($color || theme.colors.primary) : theme.colors.text};
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 600 : 500};
  cursor: pointer;
`;

const Swatch = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 3px solid ${({ $active }) => $active ? '#1e293b' : 'transparent'};
  cursor: pointer;
  padding: 0;
`;

const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  cursor: pointer;
  font-size: 14px;
`;

function dateToInputValue(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const empty = {
  nombre: '',
  tipo: 'torneo',
  estado: 'activo',
  descripcion: '',
  color: '#F59E0B',
  fechaInicio: '',
  fechaFin: '',
  formato: 'eliminatoria',
  numGrupos: '2',
  equiposPorGrupo: '4',
  formatoGrupos: 'unico',
  rondasEliminatorias: 'cuartos',
  formatoPartido: 'unico',
  idaYvueltaDesde: 'todas',
  formatoFinal: 'unico',
  cicloAmarillas: '5',
  porDefecto: false,
};

export default function TournamentFormModal({
  open, onClose, onSave, tournament, loading,
}) {
  const { t } = useTranslation();
  const isEdit = !!tournament;
  const [form, setForm] = useState(empty);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (tournament) {
      setForm({
        ...empty,
        ...tournament,
        nombre: tournament.nombre || '',
        descripcion: tournament.descripcion || '',
        color: tournament.color || '#F59E0B',
        fechaInicio: dateToInputValue(tournament.fechaInicio),
        fechaFin: dateToInputValue(tournament.fechaFin),
        numGrupos: String(tournament.numGrupos || 2),
        equiposPorGrupo: String(tournament.equiposPorGrupo || 4),
        formatoGrupos: tournament.formatoGrupos || 'unico',
        cicloAmarillas: String(tournament.cicloAmarillas || 5),
      });
      setShowAdvanced(!!tournament.formato);
    } else {
      setForm(empty);
      setShowAdvanced(false);
    }
    setError(null);
  }, [open, tournament]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = () => {
    setError(null);
    if (!form.nombre.trim()) {
      showMissingFieldsToast(t, [t('tournaments.name', 'Nombre')]);
      return;
    }
    const data = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      estado: form.estado,
      descripcion: form.descripcion.trim(),
      color: form.color,
      fechaInicio: form.fechaInicio ? new Date(form.fechaInicio).toISOString() : null,
      fechaFin: form.fechaFin ? new Date(form.fechaFin).toISOString() : null,
      porDefecto: !!form.porDefecto,
    };
    if (form.tipo === 'liga') {
      data.formato = 'liga';
      data.cicloAmarillas = parseInt(form.cicloAmarillas, 10) || 5;
      data.tieneGrupos = false;
      data.formatoGrupos = undefined;
    } else if (form.tipo === 'copa' || form.tipo === 'torneo') {
      data.formato = form.formato;
      data.cicloAmarillas = parseInt(form.cicloAmarillas, 10) || 5;
      if (form.formato === 'grupos+eliminatoria') {
        data.tieneGrupos = true;
        data.numGrupos = parseInt(form.numGrupos, 10) || 2;
        data.equiposPorGrupo = parseInt(form.equiposPorGrupo, 10) || 4;
        data.formatoGrupos = form.formatoGrupos || 'unico';
      } else {
        data.tieneGrupos = false;
        data.formatoGrupos = undefined;
      }
      if (form.formato !== 'liga') {
        data.rondasEliminatorias = form.rondasEliminatorias;
        data.formatoPartido = form.formatoPartido;
        data.formatoFinal = form.formatoFinal;
        if (form.formatoPartido === 'idayvuelta') {
          data.idaYvueltaDesde = form.idaYvueltaDesde;
        }
      }
    }
    onSave(data);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('tournaments.editTitle', 'Editar torneo') : t('tournaments.createTitle', 'Nuevo torneo')}
      width={FORM_MODAL_WIDTH}
    >
      <Stack $gap={14}>
        <Field>
          <Label>{t('tournaments.name', 'Nombre')} *</Label>
          <Input
            value={form.nombre}
            onChange={(e) => update({ nombre: e.target.value })}
            placeholder={t('tournaments.namePlaceholder', 'Ej. Liga local 2026')}
          />
        </Field>

        <Field>
          <Label>{t('tournaments.type', 'Tipo')}</Label>
          <ChipRow>
            {TOURNAMENT_TYPES.map((tt) => (
              <Chip
                key={tt.value}
                type="button"
                $active={form.tipo === tt.value}
                $color={tt.color}
                onClick={() => update({ tipo: tt.value })}
              >
                <span>{tt.icon}</span>
                <span>{t(tt.labelKey, tt.value)}</span>
              </Chip>
            ))}
          </ChipRow>
        </Field>

        <Row $gap={12} $wrap>
          <Field style={{ flex: 1, minWidth: 180 }}>
            <Label>{t('tournaments.status', 'Estado')}</Label>
            <Select
              value={form.estado}
              onChange={(v) => update({ estado: v })}
              options={[
                { value: 'activo', label: t('tournaments.active', 'Activo') },
                { value: 'finalizado', label: t('tournaments.finished', 'Finalizado') },
              ]}
            />
          </Field>
          <Field style={{ flex: 1, minWidth: 180 }}>
            <Label>{t('tournaments.color', 'Color')}</Label>
            <Row $gap={6} $wrap>
              {TOURNAMENT_COLORS.map((c) => (
                <Swatch
                  key={c}
                  type="button"
                  $color={c}
                  $active={form.color === c}
                  onClick={() => update({ color: c })}
                  aria-label={c}
                />
              ))}
            </Row>
          </Field>
        </Row>

        <Row $gap={12} $wrap>
          <Field style={{ flex: 1, minWidth: 180 }}>
            <Label>{t('tournaments.startDate', 'Fecha inicio')}</Label>
            <Input
              type="date"
              value={form.fechaInicio}
              onChange={(e) => update({ fechaInicio: e.target.value })}
            />
          </Field>
          <Field style={{ flex: 1, minWidth: 180 }}>
            <Label>{t('tournaments.endDate', 'Fecha fin')}</Label>
            <Input
              type="date"
              value={form.fechaFin}
              onChange={(e) => update({ fechaFin: e.target.value })}
            />
          </Field>
        </Row>

        <Field>
          <Label>{t('tournaments.description', 'Descripción')}</Label>
          <TextArea
            value={form.descripcion}
            onChange={(e) => update({ descripcion: e.target.value })}
            placeholder={t('tournaments.descriptionPlaceholder', 'Notas, formato, sede...')}
          />
        </Field>

        <ToggleRow>
          <span>{t('tournaments.advancedConfig', 'Configuración avanzada')}</span>
          <input
            type="checkbox"
            checked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.target.checked)}
          />
        </ToggleRow>

        {showAdvanced && (
          <Stack $gap={12}>
            {(form.tipo === 'copa' || form.tipo === 'torneo') && (
              <Field>
                <Label>{t('tournaments.format', 'Formato')}</Label>
                <Select
                  value={form.formato}
                  onChange={(v) => update({ formato: v })}
                  options={FORMATO_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey, o.value) }))}
                />
              </Field>
            )}

            {(form.tipo === 'copa' || form.tipo === 'torneo') && form.formato === 'grupos+eliminatoria' && (
              <Row $gap={12} $wrap>
                <Field style={{ flex: 1, minWidth: 140 }}>
                  <Label>{t('tournaments.numGroups', 'Nº grupos')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.numGrupos}
                    onChange={(e) => update({ numGrupos: e.target.value })}
                  />
                </Field>
                <Field style={{ flex: 1, minWidth: 140 }}>
                  <Label>{t('tournaments.teamsPerGroup', 'Equipos por grupo')}</Label>
                  <Input
                    type="number"
                    min="2"
                    max="99"
                    value={form.equiposPorGrupo}
                    onChange={(e) => update({ equiposPorGrupo: e.target.value })}
                  />
                </Field>
                <Field style={{ flex: 1, minWidth: 180 }}>
                  <Label>{t('tournaments.groupStageMatchFormat', 'Fase de grupos')}</Label>
                  <Select
                    value={form.formatoGrupos}
                    onChange={(v) => update({ formatoGrupos: v })}
                    options={[
                      { value: 'unico', label: t('matchSheet.fields.legSingle', 'Único') },
                      { value: 'idayvuelta', label: t('tournaments.legHomeAway', 'Ida y vuelta') },
                    ]}
                  />
                </Field>
              </Row>
            )}

            {(form.tipo === 'copa' || form.tipo === 'torneo') && form.formato !== 'liga' && (
              <>
                <Field>
                  <Label>{t('tournaments.startRound', 'Ronda inicial')}</Label>
                  <Select
                    value={form.rondasEliminatorias}
                    onChange={(v) => update({ rondasEliminatorias: v })}
                    options={RONDAS_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey, o.value) }))}
                  />
                </Field>
                <Field>
                  <Label>{t('tournaments.matchFormat', 'Formato de partido')}</Label>
                  <Select
                    value={form.formatoPartido}
                    onChange={(v) => update({ formatoPartido: v })}
                    options={[
                      { value: 'unico', label: t('matchSheet.fields.legSingle', 'Único') },
                      { value: 'idayvuelta', label: t('tournaments.legHomeAway', 'Ida y vuelta') },
                    ]}
                  />
                </Field>
                {form.formatoPartido === 'idayvuelta' && (
                  <Field>
                    <Label>{t('tournaments.legFrom', 'Ida y vuelta desde')}</Label>
                    <Select
                      value={form.idaYvueltaDesde}
                      onChange={(v) => update({ idaYvueltaDesde: v })}
                      options={[
                        { value: 'todas', label: t('tournaments.allRounds', 'Todas') },
                        ...RONDAS_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey, o.value) })),
                      ]}
                    />
                  </Field>
                )}
                <Field>
                  <Label>{t('tournaments.finalFormat', 'Formato de la final')}</Label>
                  <Select
                    value={form.formatoFinal}
                    onChange={(v) => update({ formatoFinal: v })}
                    options={[
                      { value: 'unico', label: t('matchSheet.fields.legSingle', 'Único') },
                      { value: 'idayvuelta', label: t('tournaments.legHomeAway', 'Ida y vuelta') },
                    ]}
                  />
                </Field>
              </>
            )}

            <Field>
              <Label>{t('tournaments.yellowCardCycle', 'Ciclo de tarjetas amarillas')}</Label>
              <Input
                type="number"
                min="1"
                value={form.cicloAmarillas}
                onChange={(e) => update({ cicloAmarillas: e.target.value })}
              />
              <Muted>{t('tournaments.yellowCardCycleHint', 'Cada cuántas amarillas se aplica una sanción')}</Muted>
            </Field>
          </Stack>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        <Row $gap={8} style={{ justifyContent: 'flex-end' }}>
          <Button $variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '...' : (isEdit ? t('common.save', 'Guardar') : t('common.create', 'Crear'))}
          </Button>
        </Row>
      </Stack>
    </Modal>
  );
}
