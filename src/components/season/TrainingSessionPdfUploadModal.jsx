import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdPictureAsPdf, MdUploadFile } from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, ErrorText, Input, Label, Muted, Row, Stack } from '@/ui/primitives';
import { fileToBase64 } from './seasonHelpers';

const Intro = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
`;

const PdfIcon = styled.div`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.errorSoft};
  color: ${({ theme }) => theme.colors.error};
`;

const FilePicker = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 92px;
  padding: 18px;
  border: 1.5px dashed ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primarySoftText};
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  &:focus-within { box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  word-break: break-word;
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const formatFileSize = (size) => `${(size / (1024 * 1024)).toFixed(1)} MB`;

const dateValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export default function TrainingSessionPdfUploadModal({ open, session, onClose, onSubmit, loading = false }) {
  const { t } = useTranslation();
  const isReplace = Boolean(session?._id);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setError('');
    setFecha(dateValue(session?.fecha) || dateValue(new Date()));
    setHoraInicio(session?.horaInicio || '');
    setHoraFin(session?.horaFin || '');
  }, [open, session]);

  const handleFileChange = (event) => {
    const next = event.target.files?.[0];
    event.target.value = '';
    if (!next) return;
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setError(t('session.pdfOnly', 'Selecciona un archivo PDF.'));
      return;
    }
    if (next.size > 25 * 1024 * 1024) {
      setError(t('session.pdfTooLarge', 'El PDF no puede superar los 25 MB.'));
      return;
    }
    setError('');
    setFile(next);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError(t('session.pdfRequired', 'Selecciona el PDF de la sesión.'));
      return;
    }
    if (!isReplace && (!fecha || !horaInicio || !horaFin)) {
      setError(t('session.requiredDateTime', 'La fecha y las horas son obligatorias.'));
      return;
    }
    try {
      await onSubmit({
        fileData: await fileToBase64(file),
        filename: file.name,
        fecha,
        horaInicio,
        horaFin,
      });
    } catch (submitError) {
      setError(submitError?.message || t('session.pdfUploadError', 'No se pudo guardar el PDF.'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={isReplace ? t('session.replacePdfTitle', 'Reemplazar PDF de la sesión') : t('session.uploadPdfTitle', 'Subir sesión de entrenamiento')}
      width={620}
    >
      <form onSubmit={handleSubmit}>
        <Stack $gap={16}>
          <Intro>
            <PdfIcon><MdPictureAsPdf size={24} /></PdfIcon>
            <div>
              <strong>{isReplace ? t('session.replacePdfSubtitle', 'Sustituye el documento manteniendo la sesión') : t('session.uploadPdfSubtitle', 'Guarda tu sesión personalizada como PDF')}</strong>
              <Muted style={{ marginTop: 4, display: 'block' }}>{t('session.pdfHint', 'Se conserva el diseño original del archivo. Máximo 25 MB.')}</Muted>
            </div>
          </Intro>

          {!isReplace && (
            <FieldGrid>
              <div><Label htmlFor="training-session-pdf-date">{t('session.dateLabel', 'Fecha')}</Label><Input id="training-session-pdf-date" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
              <div><Label htmlFor="training-session-pdf-start">{t('session.startTime', 'Hora de inicio')}</Label><Input id="training-session-pdf-start" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} /></div>
              <div><Label htmlFor="training-session-pdf-end">{t('session.endTime', 'Hora de fin')}</Label><Input id="training-session-pdf-end" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} /></div>
            </FieldGrid>
          )}

          <div>
            <Label htmlFor="training-session-pdf-file">{t('session.pdfFile', 'Documento PDF')}</Label>
            <FilePicker htmlFor="training-session-pdf-file">
              <MdUploadFile size={23} />
              {file ? t('session.changePdf', 'Cambiar PDF') : t('session.choosePdf', 'Seleccionar PDF')}
              <HiddenInput id="training-session-pdf-file" type="file" accept="application/pdf,.pdf" onChange={handleFileChange} />
            </FilePicker>
          </div>

          {file && <FileInfo><span>{file.name}</span><Muted>{formatFileSize(file.size)}</Muted></FileInfo>}
          {error && <ErrorText role="alert">{error}</ErrorText>}

          <Row style={{ justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <Button type="button" $variant="ghost" onClick={onClose} disabled={loading}>{t('common.cancel', 'Cancelar')}</Button>
            <Button type="submit" disabled={loading || !file}>
              <MdUploadFile /> {loading ? t('common.saving', 'Guardando...') : t('session.savePdf', 'Guardar PDF')}
            </Button>
          </Row>
        </Stack>
      </form>
    </Modal>
  );
}
