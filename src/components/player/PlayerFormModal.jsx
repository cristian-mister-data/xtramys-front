import { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';
import { Button, Field, Label, Input, Row, Stack, ErrorText } from '@/ui/primitives';
import {
  getPositionOptions,
  getPositionColor,
  getPositionIcon,
} from './playerHelpers';
import ImageCropper from '@/components/season/ImageCropper';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const PhotoWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const PhotoPreview = styled.div`
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: ${({ $colors }) => `${$colors[0]}22`};
  color: ${({ $colors }) => $colors[1]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 26px;
  overflow: hidden;
  border: 2px solid ${({ theme }) => theme.colors.border};
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const PosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  @media (max-width: 480px) { grid-template-columns: repeat(2, 1fr); }
`;

const PosChip = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ $active, $colors, theme }) => ($active ? $colors[0] : theme.colors.border)};
  background: ${({ $active, $colors, theme }) => ($active ? `${$colors[0]}18` : theme.colors.surface)};
  color: ${({ $active, $colors, theme }) => ($active ? $colors[1] : theme.colors.text)};
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.12s;
`;

const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  input { cursor: pointer; }
`;

const SexRow = styled.div`
  display: inline-flex;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.full};
`;

const SexBtn = styled.button`
  padding: 6px 14px;
  border: 0;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.onPrimary : theme.colors.textSecondary)};
  font-weight: 600;
  font-size: 13px;
  border-radius: ${({ theme }) => theme.radius.full};
  cursor: pointer;
  transition: all 0.12s;
`;

const emptyForm = {
  nombre: '', apellido: '', edad: '', posicion: '',
  dorsal: '', altura: '', sexo: 'M', foto: null, extra: false,
};

export default function PlayerFormModal({
  open,
  mode = 'create',
  player = null,
  existingPlayers = [],
  loading = false,
  onClose,
  onSubmit,
}) {
  const { t } = useTranslation();
  const [data, setData] = useState(emptyForm);
  const [error, setError] = useState('');
  const [cropperSrc, setCropperSrc] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && player) {
      setData({
        nombre: player.nombre || '',
        apellido: player.apellido || '',
        edad: player.edad?.toString() || '',
        posicion: player.posicion || '',
        dorsal: player.dorsal?.toString() || '',
        altura: player.altura?.toString() || '',
        sexo: player.sexo || 'M',
        foto: player.foto || null,
        extra: !!player.extra,
      });
    } else {
      setData(emptyForm);
    }
    setError('');
    setCropperSrc(null);
  }, [open, mode, player]);

  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('player.invalidImage', 'El archivo seleccionado no es una imagen válida'));
      return;
    }
    const url = URL.createObjectURL(file);
    setCropperSrc(url);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCropConfirm = (croppedB64) => {
    setData((d) => ({ ...d, foto: croppedB64 }));
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const handleCropCancel = () => {
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const removePhoto = () => setData((d) => ({ ...d, foto: null }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const missing = [];
    if (!data.nombre.trim()) missing.push(t('player.name', 'Nombre'));
    if (!data.apellido.trim()) missing.push(t('player.lastName', 'Apellido'));
    if (!data.edad) missing.push(t('player.age', 'Edad'));
    if (!data.posicion) missing.push(t('player.position', 'Posición'));
    if (data.dorsal === '') missing.push(t('player.dorsal', 'Dorsal'));
    if (missing.length) {
      setError(t('message.missingFields', 'Faltan campos: ') + missing.join(', '));
      return;
    }
    const dorsalNum = parseInt(data.dorsal, 10);
    if (!Number.isFinite(dorsalNum)) {
      setError(t('player.dorsalMustBeNumber', 'El dorsal debe ser un número'));
      return;
    }
    const repeated = existingPlayers.some(
      (p) => p.dorsal === dorsalNum && (mode !== 'edit' || p._id !== player?._id),
    );
    if (repeated) {
      setError(t('player.dorsalRepeated', 'Ese dorsal ya está asignado'));
      return;
    }
    const payload = {
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      edad: parseInt(data.edad, 10),
      posicion: data.posicion,
      dorsal: dorsalNum,
      sexo: data.sexo || 'M',
      extra: !!data.extra,
    };
    if (data.altura) payload.altura = parseInt(data.altura, 10);
    else if (mode === 'edit') payload.altura = null;
    if (data.foto && typeof data.foto === 'string' && data.foto.startsWith('data:image')) {
      payload.foto = data.foto;
    } else if (mode === 'edit' && data.foto === null) {
      payload.foto = null;
    }
    onSubmit?.(payload);
  };

  const positions = getPositionOptions(t);
  const colors = getPositionColor(data.posicion);
  const initials = `${data.nombre.charAt(0)}${data.apellido.charAt(0)}`.toUpperCase() || '?';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? t('player.editPlayer', 'Editar jugador') : t('player.createPlayer', 'Crear jugador')}
      width={620}
      footer={
        <Row style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button type="button" $variant="ghost" onClick={onClose}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading
              ? t('common.saving', 'Guardando...')
              : mode === 'edit'
                ? t('common.save', 'Guardar')
                : t('player.create', 'Crear')}
          </Button>
        </Row>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack style={{ gap: 14 }}>
          <PhotoWrap>
            <PhotoPreview $colors={colors}>
              {data.foto ? <img src={data.foto} alt="" /> : initials}
            </PhotoPreview>
            <Stack style={{ gap: 6 }}>
              <Label as="label" style={{ cursor: 'pointer' }}>
                <Button as="span" type="button" $variant="ghost">
                  {t('player.choosePhoto', 'Elegir foto')}
                </Button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: 'none' }} />
              </Label>
              {data.foto ? (
                <Button type="button" $variant="ghost" onClick={removePhoto}>
                  {t('player.removePhoto', 'Quitar foto')}
                </Button>
              ) : null}
            </Stack>
          </PhotoWrap>

          <Grid>
            <Field>
              <Label>{t('player.name', 'Nombre')}</Label>
              <Input value={data.nombre} onChange={set('nombre')} />
            </Field>
            <Field>
              <Label>{t('player.lastName', 'Apellido')}</Label>
              <Input value={data.apellido} onChange={set('apellido')} />
            </Field>
            <Field>
              <Label>{t('player.dorsal', 'Dorsal')}</Label>
              <Input type="number" min="0" value={data.dorsal} onChange={set('dorsal')} />
            </Field>
            <Field>
              <Label>{t('player.age', 'Edad')}</Label>
              <Input type="number" min="0" value={data.edad} onChange={set('edad')} />
            </Field>
            <Field>
              <Label>{t('player.height', 'Altura (cm)')}</Label>
              <Input type="number" min="0" value={data.altura} onChange={set('altura')} />
            </Field>
            <Field>
              <Label>{t('player.sex', 'Sexo')}</Label>
              <SexRow>
                <SexBtn type="button" $active={data.sexo === 'M'} onClick={() => setData((d) => ({ ...d, sexo: 'M' }))}>
                  {t('player.male', 'M')}
                </SexBtn>
                <SexBtn type="button" $active={data.sexo === 'F'} onClick={() => setData((d) => ({ ...d, sexo: 'F' }))}>
                  {t('player.female', 'F')}
                </SexBtn>
              </SexRow>
            </Field>
          </Grid>

          <Field>
            <Label>{t('player.position', 'Posición')}</Label>
            <PosGrid>
              {positions.map((p) => {
                const c = getPositionColor(p.value);
                return (
                  <PosChip
                    key={p.value}
                    type="button"
                    $active={data.posicion === p.value}
                    $colors={c}
                    onClick={() => setData((d) => ({ ...d, posicion: p.value }))}
                  >
                    <span>{getPositionIcon(p.value)}</span>
                    <span>{p.label}</span>
                  </PosChip>
                );
              })}
            </PosGrid>
          </Field>

          <ToggleRow>
            <input
              type="checkbox"
              checked={data.extra}
              onChange={(e) => setData((d) => ({ ...d, extra: e.target.checked }))}
            />
            <span>⭐ {t('player.extraDescription', 'Jugador extra (no de plantilla)')}</span>
          </ToggleRow>

          {error ? <ErrorText>{error}</ErrorText> : null}
        </Stack>
      </form>
      {cropperSrc && (
        <ImageCropper
          src={cropperSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          title={t('player.adjustPhoto', 'Ajustar foto')}
        />
      )}
    </Modal>
  );
}
