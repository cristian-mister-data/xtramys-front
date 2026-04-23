import { useEffect, useState, useCallback } from 'react';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  MdFavorite, MdLink, MdContentCopy, MdShare, MdPlayArrow, MdPause,
  MdDelete, MdCheckCircle, MdCancel,
} from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Row, Stack, Muted } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';
import { BACKEND_URL } from '@/config';
import {
  getPreWellnessSession,
  generatePreWellnessLink,
  togglePreWellnessLink,
  deletePreWellnessResponse,
} from '@/api/wellness';

const HeroCard = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.mode === 'dark' ? '#be185d' : '#ec4899'}, ${({ theme }) => theme.mode === 'dark' ? '#9d174d' : '#db2777'});
  color: #ffffff;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radius.lg};
  margin-bottom: 16px;
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
`;

const StatBox = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px;
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: ${({ $color, theme }) => $color || theme.colors.text};
`;

const Section = styled.div`
  margin-bottom: 14px;
`;

const SectionTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px;
`;

const LinkBox = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-family: monospace;
  font-size: 11px;
  word-break: break-all;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ $tone, theme }) =>
    theme.colors[$tone === 'success' ? 'successSoft' : 'errorSoft']};
  color: ${({ $tone, theme }) =>
    theme.colors[$tone === 'success' ? 'successSoftText' : 'errorSoftText']};
`;

const ResponseMeta = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
`;

const ResponseRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: 0; }
`;

const Loading = styled.div`
  text-align: center;
  padding: 30px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default function PreWellnessDetailModal({
  open,
  onClose,
  session,
  onUpdate,
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const sessionId = session?._id;
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await getPreWellnessSession(sessionId);
      setData(res.data);
    } catch {
      setData({ totalResponses: 0, responses: [], preWellnessToken: null });
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (open && sessionId) load();
    if (!open) setData(null);
  }, [open, sessionId, load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generatePreWellnessLink(sessionId, { expiryHours: 48 });
      await load();
      onUpdate?.();
      toast.success(t('preWellness.linkGenerated', 'Enlace generado'));
    } catch {
      toast.error(t('preWellness.error', 'No se pudo generar el enlace'));
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async () => {
    if (!data?.preWellnessToken) return;
    const isActive = data?.preWellnessLinkActive !== false;
    setToggling(true);
    try {
      await togglePreWellnessLink(sessionId, { active: !isActive });
      await load();
      toast.success(!isActive
        ? t('preWellness.linkActivated', 'Enlace activado')
        : t('preWellness.linkDeactivated', 'Enlace desactivado'));
    } catch {
      toast.error(t('preWellness.error', 'Error al cambiar estado'));
    } finally {
      setToggling(false);
    }
  };

  const buildLink = () => {
    if (!data?.preWellnessToken) return '';
    const lang = i18n.language === 'en' ? 'en' : 'es';
    return `${BACKEND_URL}/prewellness/form/${data.preWellnessToken}?lang=${lang}`;
  };

  const handleCopy = async () => {
    const link = buildLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t('preWellness.linkCopied', 'Enlace copiado'));
    } catch {
      toast.error(t('common.error', 'Error al copiar'));
    }
  };

  const handleShare = async () => {
    const link = buildLink();
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: t('preWellness.formTitle', 'Pre-Wellness'), url: link });
      } catch { /* */ }
    } else {
      handleCopy();
    }
  };

  const handleDeleteResponse = async (resp) => {
    const ok = await confirmAction(
      t('preWellness.deleteResponseConfirm', '¿Eliminar esta respuesta?')
    );
    if (!ok) return;
    try {
      await deletePreWellnessResponse(resp._id);
      await load();
      toast.success(t('preWellness.responseDeleted', 'Respuesta eliminada'));
    } catch {
      toast.error(t('preWellness.error', 'No se pudo eliminar'));
    }
  };

  const isLinkActive = data?.preWellnessLinkActive !== false;
  const responses = data?.responses || [];
  const responseCount = data?.totalResponses ?? responses.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('preWellness.title', 'Pre-Wellness')}
      width={720}
      footer={
        <Row style={{ justifyContent: 'flex-end', width: '100%', gap: 8 }}>
          <Button type="button" $variant="ghost" onClick={onClose}>
            {t('common.close', 'Cerrar')}
          </Button>
        </Row>
      }
    >
      <HeroCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700 }}>
          <MdFavorite /> {t('preWellness.title', 'Pre-Wellness')}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
          {session?.fecha
            ? new Date(session.fecha).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })
            : ''}
        </div>
      </HeroCard>

      {loading ? (
        <Loading>{t('common.loading', 'Cargando...')}</Loading>
      ) : (
        <Stack $gap={14}>
          <StatsGrid>
            <StatBox>
              <StatLabel>{t('preWellness.responses', 'Respuestas')}</StatLabel>
              <StatValue>{responseCount}</StatValue>
            </StatBox>
            <StatBox>
              <StatLabel>{t('preWellness.status', 'Estado del enlace')}</StatLabel>
              <StatValue $color={data?.preWellnessToken ? (isLinkActive ? theme.colors.success : theme.colors.error) : theme.colors.textMuted}>
                {data?.preWellnessToken
                  ? (isLinkActive ? t('preWellness.linkActive', 'Activo') : t('preWellness.linkInactive', 'Inactivo'))
                  : '—'}
              </StatValue>
            </StatBox>
          </StatsGrid>

          <Section>
            <SectionTitle>{t('preWellness.linkSection', 'Enlace para jugadores')}</SectionTitle>
            <Card>
              {!data?.preWellnessToken ? (
                <Stack $gap={8}>
                  <Muted>{t('preWellness.noLink', 'Aún no se ha generado el enlace.')}</Muted>
                  <Button type="button" onClick={handleGenerate} disabled={generating}>
                    <MdLink /> {generating ? t('common.loading', 'Generando...') : t('preWellness.generateLink', 'Generar enlace')}
                  </Button>
                </Stack>
              ) : (
                <Stack $gap={8}>
                  <Row $gap={8} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusPill $tone={isLinkActive ? 'success' : 'error'}>
                      {isLinkActive ? <MdCheckCircle /> : <MdCancel />}
                      {isLinkActive ? t('preWellness.linkActive', 'Activo') : t('preWellness.linkInactive', 'Inactivo')}
                    </StatusPill>
                    <Button type="button" $variant="secondary" onClick={handleToggle} disabled={toggling}>
                      {isLinkActive ? <MdPause /> : <MdPlayArrow />}
                      {isLinkActive ? t('preWellness.deactivate', 'Desactivar') : t('preWellness.activate', 'Activar')}
                    </Button>
                  </Row>
                  <LinkBox>{buildLink()}</LinkBox>
                  <Row $gap={8}>
                    <Button type="button" $variant="secondary" onClick={handleCopy} disabled={!isLinkActive}>
                      <MdContentCopy /> {t('preWellness.copyLink', 'Copiar')}
                    </Button>
                    <Button type="button" $variant="secondary" onClick={handleShare} disabled={!isLinkActive}>
                      <MdShare /> {t('preWellness.shareLink', 'Compartir')}
                    </Button>
                  </Row>
                </Stack>
              )}
            </Card>
          </Section>

          <Section>
            <SectionTitle>{t('preWellness.responses', 'Respuestas')} ({responses.length})</SectionTitle>
            <Card>
              {responses.length === 0 ? (
                <Muted>{t('preWellness.noResponses', 'Aún no hay respuestas')}</Muted>
              ) : (
                responses.map((r) => (
                  <ResponseRow key={r._id}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {r?.player?.nombre || t('common.player', 'Jugador')} {r?.player?.apellidos || ''}
                      </div>
                      <ResponseMeta>
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'es-ES')
                          : ''}
                      </ResponseMeta>
                    </div>
                    <Button
                      type="button"
                      $variant="ghost"
                      onClick={() => handleDeleteResponse(r)}
                      title={t('edition.delete', 'Eliminar')}
                    >
                      <MdDelete />
                    </Button>
                  </ResponseRow>
                ))
              )}
            </Card>
          </Section>
        </Stack>
      )}
    </Modal>
  );
}
