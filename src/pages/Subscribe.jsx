import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { createCheckoutSession, createPortalSession } from '@/api/subscription';
import { checkSubscription } from '@/store/slices/user/userThunks';
import { Card, Title, Subtitle, Button, Stack, Muted } from '@/ui/primitives';
import styled from 'styled-components';

const Page = styled.div`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: ${({ theme }) => theme.colors.background};
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin: 16px 0;
`;

const Amount = styled.span`
  font-size: 40px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
`;

const Period = styled.span`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
`;

const Check = styled.span`
  color: ${({ theme }) => theme.colors.success};
  font-size: 18px;
  flex-shrink: 0;
`;

export default function Subscribe() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.usuario.user);
  const subscriptionStatus = useSelector((s) => s.usuario.subscriptionStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isActive = subscriptionStatus === 'active';

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = window.location.origin;
      const data = await createCheckoutSession(baseUrl);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err?.message || t('subscription.error', 'Error al iniciar el proceso de pago'));
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await createPortalSession();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err?.message || t('subscription.portalError', 'Error al abrir el portal de gestión'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await dispatch(checkSubscription()).unwrap();
    } catch {
      // ignore
    }
  };

  const features = [
    t('subscription.features.tacticalBoard', 'Pizarra táctica con grabación de vídeo'),
    t('subscription.features.training', 'Planificación de entrenamientos'),
    t('subscription.features.wellness', 'Monitorización wellness'),
    t('subscription.features.rivals', 'Análisis de rivales'),
    t('subscription.features.matchSheets', 'Fichas de partido'),
    t('subscription.features.statistics', 'Estadísticas avanzadas'),
    t('subscription.features.nutrition', 'Seguimiento nutricional'),
    t('subscription.features.injuries', 'Control de lesiones'),
    t('subscription.features.methodology', 'Metodología de juego'),
  ];

  return (
    <Page>
      <Card style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <Title>{t('subscription.title', 'Suscripción requerida')}</Title>
        <Subtitle>
          {t('subscription.subtitle', 'Activa tu suscripción para acceder a todas las funcionalidades de Xtramys')}
        </Subtitle>

        {isActive ? (
          <Stack $gap={16}>
            <p style={{ color: 'var(--colors-success, #22c55e)', fontWeight: 600, margin: 0 }}>
              {t('subscription.active', 'Tu suscripción está activa')}
            </p>
            {user?.subscriptionCurrentPeriodEnd && (
              <p style={{ color: 'var(--colors-text-secondary, #64748b)', fontSize: 13, margin: 0 }}>
                {t('subscription.validUntil', 'Válida hasta el')}{' '}
                {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString(
                  'es-ES', { year: 'numeric', month: 'long', day: 'numeric' }
                )}
              </p>
            )}
            <Button onClick={handleManage} disabled={loading}>
              {t('subscription.manage', 'Gestionar suscripción')}
            </Button>
          </Stack>
        ) : (
          <>
            <PriceRow>
              <Amount>72€</Amount>
              <Period>/{t('subscription.year', 'año')}</Period>
            </PriceRow>

            <FeatureList>
              {features.map((f) => (
                <FeatureItem key={f}>
                  <Check>&#10003;</Check>
                  <span>{f}</span>
                </FeatureItem>
              ))}
            </FeatureList>

            {error && <p style={{ color: 'var(--colors-error, #ef4444)', fontSize: 14, margin: '0 0 12px' }}>{error}</p>}

            <Button onClick={handleSubscribe} disabled={loading} style={{ width: '100%' }}>
              {loading
                ? t('subscription.loading', 'Procesando...')
                : t('subscription.subscribe', 'Suscribirme ahora')}
            </Button>
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <Muted>
            {t('subscription.afterPayment', 'Tras el pago, tu acceso se activará automáticamente.')}
          </Muted>
        </div>

        {subscriptionStatus === 'past_due' && (
          <div style={{ marginTop: 12 }}>
            <Button $variant="secondary" onClick={handleManage} disabled={loading}>
              {t('subscription.updatePayment', 'Actualizar método de pago')}
            </Button>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <Button $variant="link" onClick={handleRefresh}>
            {t('subscription.refresh', 'Verificar estado de suscripción')}
          </Button>
        </div>
      </Card>
    </Page>
  );
}
