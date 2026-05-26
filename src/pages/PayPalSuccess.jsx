import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { checkSubscription } from '@/store/slices/user/userThunks';
import { capturePayPalOrder } from '@/api/subscription';
import { Card, Title, Button, Stack, Muted } from '@/ui/primitives';
import styled from 'styled-components';
import { MdCheckCircle, MdError, MdHourglassEmpty } from 'react-icons/md';

const Page = styled.div`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: ${({ theme }) => theme.colors.background};
`;

export default function PayPalSuccess() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscriptionStatus = useSelector((s) => s.usuario.subscriptionStatus);

  const orderId = searchParams.get('order_id');
  const [step, setStep] = useState(orderId ? 'capturing' : 'polling');
  const [error, setError] = useState('');

  useEffect(() => {
    if (subscriptionStatus === 'active') {
      setStep('success');
    }
  }, [subscriptionStatus]);

  const captureOrder = useCallback(async () => {
    if (!orderId) {
      setStep('failed');
      setError(t('payment.noOrderId', 'No se encontró el ID de la orden'));
      return;
    }

    try {
      const res = await capturePayPalOrder(orderId);
      if (res.subscriptionStatus === 'active' || res.plan === 'pro') {
        await dispatch(checkSubscription()).unwrap();
        setStep('success');
      } else {
        setStep('polling');
      }
    } catch (err) {
      console.error('[PayPalSuccess] Capture error:', err);
      setStep('polling');
    }
  }, [orderId, dispatch, t]);

  useEffect(() => {
    if (step === 'capturing') {
      captureOrder();
    }
  }, [step, captureOrder]);

  useEffect(() => {
    if (step !== 'polling') return;
    if (subscriptionStatus === 'active') {
      setStep('success');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await dispatch(checkSubscription()).unwrap();
        if (result.subscriptionStatus === 'active') {
          setStep('success');
        }
      } catch {
        // continue polling
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [step, subscriptionStatus, dispatch]);

  useEffect(() => {
    if (step !== 'success') return;
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [step, navigate]);

  const handleRetry = () => {
    setStep(orderId ? 'capturing' : 'polling');
    setError('');
  };

  return (
    <Page>
      <Card style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        {step === 'capturing' || step === 'polling' ? (
          <>
            <div style={{ fontSize: 48, color: 'var(--colors-primary)', marginBottom: 16 }}>
              <MdHourglassEmpty />
            </div>
            <Title>{t('payment.verifying', 'Verificando pago...')}</Title>
            <Muted>{t('payment.verifyingPaypal', 'Confirmando tu pago con PayPal. Esto puede tardar unos segundos.')}</Muted>
          </>
        ) : step === 'success' ? (
          <>
            <div style={{ fontSize: 48, color: 'var(--colors-success)', marginBottom: 16 }}>
              <MdCheckCircle />
            </div>
            <Title>{t('payment.success', '¡Pago completado!')}</Title>
            <Muted>{t('payment.redirecting', 'Serás redirigido a la aplicación...')}</Muted>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, color: 'var(--colors-error)', marginBottom: 16 }}>
              <MdError />
            </div>
            <Title>{t('payment.failed', 'No se pudo verificar el pago')}</Title>
            {error && <p style={{ color: 'var(--colors-error)', fontSize: 13 }}>{error}</p>}
            <Stack $gap={12} style={{ marginTop: 16 }}>
              <Button onClick={handleRetry}>{t('payment.retry', 'Reintentar')}</Button>
              <Button $variant="secondary" onClick={() => navigate('/subscribe')}>
                {t('payment.backToSubscribe', 'Volver a suscripción')}
              </Button>
            </Stack>
          </>
        )}
      </Card>
    </Page>
  );
}