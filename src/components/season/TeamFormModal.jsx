import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';
import Select from '@/ui/Select';
import { Button, Field, Input, Label, Row, Stack, ErrorText, Muted } from '@/ui/primitives';
import {
  categoryOptions,
  timePerHalfOptions,
  playersPerTeamOptions,
} from './seasonHelpers';
import ImageCropper from './ImageCropper';

const BadgeBox = styled.button`
  width: 96px;
  height: 96px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px dashed ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.inputBg};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const BadgeImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Remove = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: ${({ theme }) => theme.colors.error};
  color: #fff;
  border: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  &:hover { filter: brightness(1.1); }
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const ImportRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  cursor: pointer;
  font-size: 14px;
`;

/**
 * Modal de creación / edición de equipo.
 * `mode` = 'create' | 'edit'
 * `initialValue` = objeto con los campos del equipo
 * `previousSeasonInfo` = solo para crear; { previousSeason, hasPlayers, playersCount }
 */
export default function TeamFormModal({
  open,
  onClose,
  mode = 'create',
  initialValue,
  onSubmit,
  loading,
  previousSeasonInfo,
  canMutate = true,
}) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [form, setForm] = useState(() => initialValue || {
    nombre: '',
    categoriaKey: 'otro',
    categoriaCustom: '',
    tiempoPorParte: 45,
    jugadoresPorEquipo: 11,
    escudo: null,
  });
  const [importPlayers, setImportPlayers] = useState(false);
  const [error, setError] = useState(null);
  const [cropperSrc, setCropperSrc] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(initialValue || {
        nombre: '',
        categoriaKey: 'otro',
        categoriaCustom: '',
        tiempoPorParte: 45,
        jugadoresPorEquipo: 11,
        escudo: null,
      });
      setImportPlayers(false);
      setError(null);
    }
  }, [open, initialValue]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropperSrc(url);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCropConfirm = async (croppedB64) => {
    update({ escudo: croppedB64 });
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const handleCropCancel = () => {
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const handleSubmit = () => {
    setError(null);
    if (!form.nombre?.trim()) {
      setError(t('message.missingFields', { fields: t('team.teamName', 'Nombre del equipo') }));
      return;
    }
    if (!form.categoriaKey) {
      setError(t('message.missingFields', { fields: t('team.category', 'Categoría') }));
      return;
    }
    if (form.categoriaKey === 'otro' && !form.categoriaCustom?.trim()) {
      setError(t('message.missingFields', { fields: t('team.customCategory', 'Categoría personalizada') }));
      return;
    }

    const categoriaLegacy = form.categoriaKey === 'otro' ? form.categoriaCustom : form.categoriaKey;
    onSubmit({
      ...form,
      categoria: categoriaLegacy,
      importPlayers: mode === 'create' ? importPlayers : undefined,
    });
  };

  const cats = categoryOptions(t);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'edit'
        ? t('team.editTeam', 'Editar equipo')
        : t('team.createTeam', 'Crear nuevo equipo')}
      width={520}
    >
      <Stack $gap={12}>
        <Field>
          <Label>{t('team.teamName', 'Nombre del equipo')}</Label>
          <Input
            value={form.nombre}
            onChange={(e) => update({ nombre: e.target.value })}
            placeholder={t('team.teamName', 'Nombre del equipo')}
          />
        </Field>

        <Field>
          <Label>{t('team.category', 'Categoría')}</Label>
          <Select
            value={form.categoriaKey}
            onChange={(v) => update({ categoriaKey: v })}
            options={cats}
            placeholder={t('team.selectCategory', 'Seleccionar categoría')}
          />
        </Field>

        {form.categoriaKey === 'otro' && (
          <Field>
            <Label>{t('team.customCategory', 'Categoría personalizada')}</Label>
            <Input
              value={form.categoriaCustom || ''}
              onChange={(e) => update({ categoriaCustom: e.target.value })}
              placeholder={t('team.customCategoryPlaceholder', 'Escribe la categoría')}
            />
          </Field>
        )}

        <Field>
          <Label>{t('team.timePerHalf', 'Tiempo por parte')}</Label>
          <Select
            value={form.tiempoPorParte}
            onChange={(v) => update({ tiempoPorParte: v })}
            options={timePerHalfOptions.map((m) => ({
              value: m,
              label: t('team.timePerHalfMinutes', { minutes: m, defaultValue: `${m} min` }),
            }))}
          />
        </Field>

        <Field>
          <Label>{t('team.playersPerTeam', 'Jugadores por equipo')}</Label>
          <Select
            value={form.jugadoresPorEquipo}
            onChange={(v) => update({ jugadoresPorEquipo: v })}
            options={playersPerTeamOptions.map((c) => ({
              value: c,
              label: t('team.playersPerTeamCount', { count: c, defaultValue: `${c} jugadores` }),
            }))}
          />
        </Field>

        <Field>
          <Label>{t('team.badge', 'Escudo')}</Label>
          <Row $gap={12}>
            <BadgeBox type="button" onClick={() => fileRef.current?.click()}>
              {form.escudo ? (
                <>
                  <BadgeImg src={form.escudo} alt="escudo" />
                  <Remove
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      update({ escudo: null });
                    }}
                  >×</Remove>
                </>
              ) : (
                <Muted style={{ fontSize: 12, textAlign: 'center', padding: 4 }}>
                  {t('team.tapToUpload', 'Pulsa para subir')}
                </Muted>
              )}
            </BadgeBox>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
            <Muted>{t('team.badgeHint', 'PNG/JPG cuadrada')}</Muted>
          </Row>
        </Field>

        {mode === 'create' && previousSeasonInfo?.hasPlayers && (
          <ImportRow>
            <input
              type="checkbox"
              checked={importPlayers}
              onChange={(e) => setImportPlayers(e.target.checked)}
            />
            <span>
              {t('team.importPlayersFromPrevious', {
                count: previousSeasonInfo.playersCount || 0,
                defaultValue: 'Importar jugadores de la temporada anterior',
              })}
            </span>
          </ImportRow>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        <Row $gap={8} style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <Button $variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || canMutate === false}>
            {loading ? '...' : (mode === 'edit'
              ? t('common.save', 'Guardar')
              : t('common.create', 'Crear'))}
          </Button>
        </Row>
      </Stack>
      {cropperSrc && (
        <ImageCropper
          src={cropperSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          title={t('team.adjustBadge', 'Ajustar escudo')}
        />
      )}
    </Modal>
  );
}
