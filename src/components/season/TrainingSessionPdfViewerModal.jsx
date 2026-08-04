import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdDownload, MdPictureAsPdf } from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Muted, Row } from '@/ui/primitives';
import { getSessionPdf } from '@/api/session';
import { savePdfToDownloads } from '@/utils/pdfDownload';

const Viewer = styled.div`
  height: calc(100dvh - 190px);
  min-height: 560px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.backgroundAlt};

  @media (max-width: 600px) {
    height: calc(100dvh - 150px);
    min-height: 0;
    border-radius: 8px;
  }
`;

const Frame = styled.iframe`
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  background: #ffffff;
`;

const Empty = styled.div`
  height: 100%;
  display: grid;
  place-items: center;
  padding: 32px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default function TrainingSessionPdfViewerModal({ open, session, onClose }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const filename = session?.pdf?.originalName || 'sesion-entrenamiento.pdf';

  useEffect(() => {
    if (!open || !session?._id) return undefined;
    let objectUrl = '';
    setLoading(true);
    setError('');
    setUrl('');
    getSessionPdf(session._id)
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
      })
      .catch((requestError) => setError(requestError?.response?.data?.message || t('session.pdfViewError', 'No se pudo abrir el PDF.')))
      .finally(() => setLoading(false));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, session?._id, t]);

  const handleDownload = async () => {
    if (!url || downloading) return;
    setDownloading(true);
    try {
      await savePdfToDownloads(url, filename);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('session.pdfViewerTitle', 'Sesión de entrenamiento en PDF')}
      width={1400}
      footer={(
        <Row style={{ justifyContent: 'space-between', width: '100%', gap: 8, flexWrap: 'wrap' }}>
          <Row $gap={8}><MdPictureAsPdf size={20} /><Muted>{filename}</Muted></Row>
          <Row $gap={8}>
            <Button type="button" $variant="secondary" onClick={handleDownload} disabled={!url || loading || downloading}>
              <MdDownload /> {downloading ? t('common.saving', 'Guardando...') : t('session.downloadPdf', 'Descargar PDF')}
            </Button>
            <Button type="button" $variant="ghost" onClick={onClose}>{t('common.close', 'Cerrar')}</Button>
          </Row>
        </Row>
      )}
    >
      <Viewer>
        {loading ? <Empty>{t('common.loading', 'Cargando...')}</Empty> : null}
        {!loading && error ? <Empty role="alert">{error}</Empty> : null}
        {!loading && !error && url ? <Frame title={filename} src={url} /> : null}
      </Viewer>
    </Modal>
  );
}
