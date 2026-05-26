import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { createCheckoutSession, verifyPayPalSubscription } from '@/api/subscription';
import { checkSubscription } from '@/store/slices/user/userThunks';
import { PAYPAL_CLIENT_ID, PAYPAL_PLAN_ID } from '@/config';
import { hasPaidSubscriptionAccess } from '@/utils/subscriptionAccess';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`;

const Page = styled.div`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 32px 24px;
  background: linear-gradient(135deg, #0B0F19 0%, #1a2744 50%, #0B0F19 100%);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(255,107,0,0.12) 0%, transparent 70%);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
`;

const Card = styled.div`
  position: relative;
  width: 100%;
  max-width: 440px;
  padding: 40px 32px 32px;
  border-radius: 24px;
  background: rgba(18, 26, 45, 0.85);
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(24px);
  text-align: center;
  animation: ${fadeIn} 0.5s ease-out;

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 24px;
    background: linear-gradient(135deg, rgba(255,107,0,0.15), rgba(229,90,0,0.08));
    z-index: -1;
  }
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 6px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #FF6B00, #E55A00);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
`;

const Subtitle = styled.p`
  margin: 0 0 24px;
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  line-height: 1.5;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin-bottom: 4px;
`;

const Amount = styled.span`
  font-size: 48px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
`;

const Period = styled.span`
  font-size: 18px;
  color: rgba(255,255,255,0.4);
`;

const PriceSub = styled.p`
  margin: 0 0 28px;
  font-size: 13px;
  color: rgba(255,255,255,0.3);
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 28px;
  text-align: left;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: rgba(255,255,255,0.8);
`;

const CheckCircle = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(34,197,94,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 13px;
    height: 13px;
    color: #22c55e;
  }
`;

const PaymentSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`;

const PayPalWrapper = styled.div`
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(255,255,255,0.15);
  }
`;

const PayPalLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.6);

  svg {
    width: 18px;
    height: 18px;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 2px 0;
  color: rgba(255,255,255,0.25);
  font-size: 12px;
  font-weight: 500;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.08);
  }
`;

const StripeButton = styled.button`
  width: 100%;
  padding: 14px 18px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.8);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  &:hover:not(:disabled) {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg { width: 18px; height: 18px; }
`;

const PaymentNote = styled.p`
  margin: 0;
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  line-height: 1.5;
  text-align: center;
`;

const ErrorBox = styled.div`
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.2);
  color: #fca5a5;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 4px;
`;

const VerifyButton = styled.button`
  width: 100%;
  padding: 12px 18px;
  border: 1px solid rgba(255,107,0,0.3);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255,107,0,0.08), rgba(229,90,0,0.04));
  color: #FF6B00;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;

  &:hover {
    background: linear-gradient(135deg, rgba(255,107,0,0.15), rgba(229,90,0,0.08));
    border-color: rgba(255,107,0,0.5);
    color: #ff8533;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const StatusCard = styled.div`
  width: 100%;
`;

const StatusIcon = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.2);
  display: flex;
  align-items: center;
  justify-content: center;

  svg { width: 32px; height: 32px; color: #22c55e; }
`;

const StatusTitle = styled.p`
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #22c55e;
`;

const StatusDate = styled.p`
  margin: 0 0 24px;
  font-size: 13px;
  color: rgba(255,255,255,0.4);
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 14px 18px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #FF6B00, #E55A00);
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 8px 24px rgba(255,107,0,0.3);

  &:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 12px 32px rgba(255,107,0,0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function Subscribe() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.usuario.user);
  const subscriptionStatus = useSelector((s) => s.usuario.subscriptionStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isCancelling = (user?.subscriptionCancelAtPeriodEnd || subscriptionStatus === 'canceled' || subscriptionStatus === 'cancelled')
    && user?.subscriptionCurrentPeriodEnd
    && new Date() < new Date(user.subscriptionCurrentPeriodEnd);
  const hasAccess = hasPaidSubscriptionAccess(user, subscriptionStatus);
  const locale = i18n.language?.startsWith('es') ? 'es-ES' : 'en-US';
  const isEs = i18n.language?.startsWith('es');

  const handleStripeSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = window.location.origin;
      const data = await createCheckoutSession(baseUrl);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err?.message || t('subscription.error', 'Error al iniciar el proceso de pago'));
    } finally {
      setLoading(false);
    }
  };

  const handleManage = () => {
    navigate('/profile');
  };

  const handleRefresh = async () => {
    try {
      await dispatch(checkSubscription()).unwrap();
    } catch { /* ignore */ }
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
      <Card>
        {hasAccess ? (
          <StatusCard>
            <StatusIcon><CheckIcon /></StatusIcon>
            <StatusTitle>
              {isCancelling
                ? t('subscription.cancelledUntilEnd', 'Suscripción cancelada — acceso hasta el')
                : t('subscription.active', 'Tu suscripción está activa')}
            </StatusTitle>
            {user?.subscriptionCurrentPeriodEnd && (
              <StatusDate>
                {isCancelling ? '' : t('subscription.validUntil', 'Válida hasta el')}{' '}
                {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString(
                  locale, { year: 'numeric', month: 'long', day: 'numeric' }
                )}
              </StatusDate>
            )}
            <ActionButton onClick={handleManage} disabled={loading}>
              {t('subscription.manage', 'Gestionar suscripción')}
            </ActionButton>
          </StatusCard>
        ) : (
          <>
            <Badge>{t('subscription.planBadge', 'Pro')}</Badge>
            <Title>{t('subscription.title', 'Suscripción requerida')}</Title>
            <Subtitle>
              {t('subscription.subtitle', 'Activa tu suscripción para acceder a todas las funcionalidades de Xtramys')}
            </Subtitle>

            <PriceRow>
              <Amount>{isEs ? '72€' : '€72'}</Amount>
              <Period>/{t('subscription.year', 'año')}</Period>
            </PriceRow>
            <PriceSub>{isEs ? '6€' : '€6'}/{t('subscription.month', 'mes')} · {t('subscription.annual', 'Facturación anual')}</PriceSub>

            <FeatureList>
              {features.map((f) => (
                <FeatureItem key={f}>
                  <CheckCircle><CheckIcon /></CheckCircle>
                  <span>{f}</span>
                </FeatureItem>
              ))}
            </FeatureList>

            {error && <ErrorBox>{error}</ErrorBox>}

            <PaymentSection>
              {PAYPAL_CLIENT_ID ? (
                <PayPalScriptProvider key={`${PAYPAL_CLIENT_ID}-${locale}`} options={{
                  clientId: PAYPAL_CLIENT_ID,
                  vault: true,
                  intent: 'subscription',
                  locale: isEs ? 'es_ES' : 'en_US',
                  components: 'buttons',
                }}>
                  <PayPalWrapper>
                    <PayPalLabel>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.473z"/>
                      </svg>
                      {t('subscription.payWithPaypal', 'Pagar con PayPal')}
                    </PayPalLabel>
                    <PayPalButtons
                      forceReRender={[PAYPAL_PLAN_ID, locale]}
                      style={{ layout: 'vertical', shape: 'pill', label: 'subscribe', height: 45, color: 'gold' }}
                      createSubscription={(data, actions) =>
                        actions.subscription.create({ plan_id: PAYPAL_PLAN_ID })
                      }
                      onApprove={async (data) => {
                        setError(null);
                        try {
                          await verifyPayPalSubscription(data.subscriptionID);
                          await dispatch(checkSubscription()).unwrap();
                          setTimeout(() => navigate('/season/create', { replace: true }), 100);
                        } catch (err) {
                          setError(err?.message || t('subscription.paypalError', 'Error al verificar el pago con PayPal'));
                        }
                      }}
                      onError={() => setError(t('subscription.paypalError', 'Error al procesar el pago con PayPal'))}
                    />
                  </PayPalWrapper>
                  <Divider>{t('common.or', 'o')}</Divider>
                  <StripeButton onClick={handleStripeSubscribe} disabled={loading}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.873 4.56 3.127 3.754 4.946 3.754 7.005c0 3.898 3.18 5.39 5.708 6.175 2.507.773 3.434 1.441 3.434 2.482 0 .948-.734 1.529-2.019 1.529-2.522 0-4.899-1.173-6.428-2.001l-.899 5.506c1.752.965 4.304 1.578 6.813 1.577 2.717 0 5.003-.718 6.572-2.062 1.584-1.346 2.437-3.337 2.437-5.724 0-3.816-2.957-5.347-6.258-6.336z"/></svg>
                    {loading ? t('subscription.loading', 'Procesando...') : t('subscription.payWithCard', 'Pagar con tarjeta')}
                  </StripeButton>
                  <PaymentNote>
                    {t('subscription.paymentNote', 'Tras el pago, tu acceso se activará automáticamente.')}
                  </PaymentNote>
                </PayPalScriptProvider>
              ) : (
                <ActionButton onClick={handleStripeSubscribe} disabled={loading}>
                  {loading ? t('subscription.loading', 'Procesando...') : t('subscription.subscribe', 'Suscribirme ahora')}
                </ActionButton>
              )}
            </PaymentSection>

            <VerifyButton onClick={handleRefresh}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              {t('subscription.refresh', 'Verificar estado de suscripción')}
            </VerifyButton>

            {subscriptionStatus === 'past_due' && (
              <ActionButton onClick={handleManage} disabled={loading} style={{ marginTop: 12 }}>
                {t('subscription.updatePayment', 'Actualizar método de pago')}
              </ActionButton>
            )}
          </>
        )}
      </Card>
    </Page>
  );
}
