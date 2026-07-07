import { useEffect, useState, useCallback } from 'react';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  MdMonitorHeart, MdLink, MdContentCopy, MdShare, MdPlayArrow, MdPause,
  MdDelete, MdSave, MdCheckCircle, MdCancel,
} from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Field, Label, Input, Row, Stack, Muted } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';
import { BACKEND_URL } from '@/config';
import {
  getWellnessSession,
  updateWellnessSession,
  generateWellnessLink,
  toggleWellnessLink,
  deleteWellnessResponse,
} from '@/api/wellness';
import { getWellnessFormUrl } from '@/utils/api';
import { getPlayerFullName } from '@/utils/playerHelpers';

const HeroCard = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.primaryHover});
  color: ${({ theme }) => theme.colors.onPrimary};
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

const ResponseRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: 0; }
`;

const ResponseInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ResponseName = styled.div`
  font-weight: 600;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
`;

const ResponseDate = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const ResponseScore = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: ${({ $color, theme }) => $color || theme.colors.primary};
`;

const Loading = styled.div`
  text-align: center;
  padding: 30px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

function getEmojiForScore(v) {
  if (v == null) return '—';
  if (v <= 2) return '😖';
  if (v <= 4) return '😕';
  if (v <= 6) return '🙂';
  if (v <= 8) return '😊';
  return '🤩';
}

function scoreColor(v, theme) {
  if (v == null) return theme.colors.textMuted;
  if (v <= 4) return theme.colors.error;
  if (v <= 6) return theme.colors.warning;
  return theme.colors.success;
}

export default function WellnessDetailModal({
  open,
  onClose,
  session,
  onUpdate,
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const sessionId = session?._id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [data, setData] = useState(null);
  const [expected, setExpected] = useState('');
  const [manualAverage, setManualAverage] = useState('');

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await getWellnessSession(sessionId);
      setData(res.data);
      setExpected(res.data?.expectedWellness ?? '');
      setManualAverage(res.data?.manualAverageWellness ?? '');
    } catch {
      setData({ totalResponses: 0, averageWellness: null, responses: [], wellnessToken: null });
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (open && sessionId) load();
    if (!open) {
      setData(null);
      setExpected('');
      setManualAverage('');
    }
  }, [open, sessionId, load]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const payload = {
        expectedWellness: expected === '' ? null : Number(expected),
        manualAverageWellness: manualAverage === '' ? null : Number(manualAverage),
      };
      await updateWellnessSession(sessionId, payload);
      await load();
      onUpdate?.();
      toast.success(t('session.responseSaved', 'Configuración guardada'));
    } catch {
      toast.error(t('session.responseError', 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateWellnessLink(sessionId, { expiryHours: 48 });
      await load();
      toast.success(t('session.linkGenerated', 'Enlace generado'));
    } catch {
      toast.error(t('session.responseError', 'No se pudo generar el enlace'));
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async () => {
    if (!data?.wellnessToken) return;
    const isActive = data?.wellnessLinkActive !== false;
    setToggling(true);
    try {
      await toggleWellnessLink(sessionId, { active: !isActive });
      await load();
      toast.success(!isActive
        ? t('session.linkActivated', 'Enlace activado')
        : t('session.linkDeactivated', 'Enlace desactivado'));
    } catch {
      toast.error(t('session.responseError', 'Error al cambiar estado'));
    } finally {
      setToggling(false);
    }
  };

  const buildLink = () => {
    if (!data?.wellnessToken) return '';
    const lang = i18n.language === 'en' ? 'en' : 'es';
    return getWellnessFormUrl(data.wellnessToken, lang);
  };

  const handleCopy = async () => {
    const link = buildLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t('session.linkCopied', 'Enlace copiado'));
    } catch {
      toast.error(t('common.error', 'Error al copiar'));
    }
  };

  const handleShare = async () => {
    const link = buildLink();
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: t('session.wellnessFormTitle', 'Formulario de wellness'), url: link });
      } catch { /* user cancel */ }
    } else {
      handleCopy();
    }
  };

  const handleDeleteResponse = async (resp) => {
    const ok = await confirmAction(
      t('session.deleteResponseConfirm', { name: resp?.player?.nombre || '', defaultValue: '¿Eliminar esta respuesta?' })
    );
    if (!ok) return;
    try {
      await deleteWellnessResponse(resp._id);
      await load();
      toast.success(t('session.responseDeleted', 'Respuesta eliminada'));
    } catch {
      toast.error(t('session.responseDeleteError', 'No se pudo eliminar'));
    }
  };

  const isLinkActive = data?.wellnessLinkActive !== false;
  const responses = data?.responses || [];
  const responseCount = data?.totalResponses ?? responses.length;
  const avg = data?.averageWellness;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('session.wellness', 'Wellness post-sesión')}
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
          <MdMonitorHeart /> {t('session.wellness', 'Wellness post-sesión')}
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
              <StatLabel>{t('session.responses', 'Respuestas')}</StatLabel>
              <StatValue>{responseCount}</StatValue>
            </StatBox>
            <StatBox>
              <StatLabel>{t('session.averageWellness', 'Media')}</StatLabel>
              <StatValue $color={scoreColor(avg, theme)}>
                {avg != null ? Number(avg).toFixed(1) : '—'}
              </StatValue>
            </StatBox>
            <StatBox>
              <StatLabel>{t('session.expectedWellness', 'Esperado')}</StatLabel>
              <StatValue $color={theme.colors.success}>
                {data?.expectedWellness ?? '—'}
              </StatValue>
            </StatBox>
          </StatsGrid>

          <Section>
            <SectionTitle>{t('session.config', 'Configuración')}</SectionTitle>
            <Card>
              <Field>
                <Label>{t('session.expectedWellness', 'Wellness esperado (1-10)')}</Label>
                <Row $gap={8}>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    style={{ maxWidth: 150 }}
                  />
                  <Button type="button" onClick={handleSaveConfig} disabled={saving}>
                    <MdSave /> {saving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
                  </Button>
                </Row>
              </Field>
              <Field style={{ marginTop: 12 }}>
                <Label>{t('session.manualAverageWellness', 'Media manual de la sesión (1-10)')}</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  value={manualAverage}
                  onChange={(e) => setManualAverage(e.target.value)}
                  placeholder={t('session.manualAverageWellnessPlaceholder', 'Sin media manual')}
                  style={{ maxWidth: 150 }}
                />
              </Field>
            </Card>
          </Section>

          <Section>
            <SectionTitle>{t('session.wellnessLink', 'Enlace para jugadores')}</SectionTitle>
            <Card>
              {!data?.wellnessToken ? (
                <Stack $gap={8}>
                  <Muted>{t('session.noLink', 'Aún no se ha generado el enlace para esta sesión.')}</Muted>
                  <Button type="button" onClick={handleGenerate} disabled={generating}>
                    <MdLink /> {generating ? t('common.loading', 'Generando...') : t('session.generateLink', 'Generar enlace')}
                  </Button>
                </Stack>
              ) : (
                <Stack $gap={8}>
                  <Row $gap={8} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusPill $tone={isLinkActive ? 'success' : 'error'}>
                      {isLinkActive ? <MdCheckCircle /> : <MdCancel />}
                      {isLinkActive ? t('session.linkActive', 'Activo') : t('session.linkInactive', 'Inactivo')}
                    </StatusPill>
                    <Button
                      type="button"
                      $variant="secondary"
                      onClick={handleToggle}
                      disabled={toggling}
                    >
                      {isLinkActive ? <MdPause /> : <MdPlayArrow />}
                      {isLinkActive ? t('session.deactivate', 'Desactivar') : t('session.activate', 'Activar')}
                    </Button>
                  </Row>
                  <LinkBox>{buildLink()}</LinkBox>
                  <Row $gap={8}>
                    <Button type="button" $variant="secondary" onClick={handleCopy} disabled={!isLinkActive}>
                      <MdContentCopy /> {t('session.copyLink', 'Copiar')}
                    </Button>
                    <Button type="button" $variant="secondary" onClick={handleShare} disabled={!isLinkActive}>
                      <MdShare /> {t('session.shareLink', 'Compartir')}
                    </Button>
                  </Row>
                </Stack>
              )}
            </Card>
          </Section>

          <Section>
            <SectionTitle>{t('session.responses', 'Respuestas')} ({responses.length})</SectionTitle>
            <Card>
              {responses.length === 0 ? (
                <Muted>{t('session.noResponses', 'Aún no hay respuestas')}</Muted>
              ) : (
                responses.map((r) => (
                  <ResponseRow key={r._id}>
                    <ResponseInfo>
                      <ResponseName>
                        {getPlayerFullName(r?.player) || t('common.player', 'Jugador')}
                      </ResponseName>
                      <ResponseDate>
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'es-ES')
                          : ''}
                      </ResponseDate>
                    </ResponseInfo>
                    <ResponseScore $color={scoreColor(r.wellnessScore || r.score, theme)}>
                      {getEmojiForScore(r.wellnessScore || r.score)} {(r.wellnessScore || r.score)?.toFixed?.(1) || '—'}
                    </ResponseScore>
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
