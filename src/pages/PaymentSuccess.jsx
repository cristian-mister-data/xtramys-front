import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { checkSubscription, fetchMe } from '@/store/slices/user/userThunks';
import { RESET_WORKSPACE } from '@/store/actionTypes';
import { clearSeasonCache } from '@/store/slices/season/seasonThunks';
import { api } from '@/api/client';
import { saveToken } from '@/auth/storage';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`to { transform: rotate(360deg); }`;

const FullScreen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: linear-gradient(to bottom, #0a1628, #1a2744);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Center = styled.div`
  width: 100%;
  max-width: 400px;
  padding: 0 24px;
  text-align: center;
`;

const SpinnerRing = styled.div`
  width: 72px;
  height: 72px;
  margin: 0 auto 32px;
  position: relative;
  border-radius: 50%;
  border: 4px solid rgba(255,255,255,0.1);
  &::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 4px solid transparent;
    border-top-color: ${({ $color }) => $color || '#00bcd4'};
    animation: ${spin} 0.8s linear infinite;
  }
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 12px;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: rgba(255,255,255,0.6);
  margin: 0 0 8px;
`;

const Dots = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
`;

const Dot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? '#00bcd4' : 'rgba(255,255,255,0.2)')};
  transition: background 0.3s;
`;

const Button = styled.button`
  display: block;
  width: 100%;
  border-radius: 12px;
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  margin-bottom: 12px;
  background: ${({ $variant }) =>
    $variant === 'primary' ? '#ff6b35' :
    $variant === 'success' ? '#2176ff' :
    'transparent'};
  color: #fff;
  border: ${({ $variant }) =>
    $variant === 'ghost' ? '1px solid rgba(255,255,255,0.2)' : 'none'};
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorBox = styled.div`
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  color: #fca5a5;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 13px;
  margin-bottom: 20px;
`;

const IconCircle = styled.div`
  width: 72px;
  height: 72px;
  margin: 0 auto 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg || 'rgba(34,197,94,0.2)'};
`;

export default function PaymentSuccess() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useSelector((s) => s.usuario.user);
  const subscriptionStatus = useSelector((s) => s.usuario.subscriptionStatus);

  const sessionId = searchParams.get('session_id');
  const checkoutContext = searchParams.get('context') || searchParams.get('plan');
  const [step, setStep] = useState('polling');
  const [pollAttempts, setPollAttempts] = useState(0);
  const [activateAttempts, setActivateAttempts] = useState(0);
  const [error, setError] = useState('');
  const workspaceRefreshed = useRef(false);

  // The return URL already contains a completed Stripe Checkout session.
  // Activate it immediately; the webhook remains the normal async fallback.
  const MAX_POLL = 0;
  const MAX_ACTIVATE = 3;

  const refreshWorkspace = useCallback(async () => {
    if (workspaceRefreshed.current) return;
    workspaceRefreshed.current = true;
    clearSeasonCache();
    dispatch({ type: RESET_WORKSPACE });
    await dispatch(fetchMe({ force: true })).unwrap();
  }, [dispatch]);

  const getReturnPath = useCallback(() => {
    const storedPath = sessionStorage.getItem('xtramys:postCheckoutPath');
    if (storedPath === '/club/dashboard' || checkoutContext === 'club' || user?.role === 'club_admin') {
      return '/club/dashboard';
    }
    return '/season/create';
  }, [checkoutContext, user?.role]);

  const tryManualActivate = useCallback(async () => {
    if (!sessionId) {
      setStep('failed');
      setError(t('payment.noSessionId', 'No se encontró el ID de sesión'));
      return;
    }
    setStep('activating');
    setError('');

    try {
      const res = await api.post('/stripe/activate-manually', { sessionId });
      if (res.data?.token) {
        await saveToken(res.data.token);
      }
      if (res.data?.subscriptionStatus === 'active') {
        await dispatch(fetchMe({ force: true })).unwrap().catch(() => {});
        await dispatch(checkSubscription()).unwrap().catch(() => {});
        await refreshWorkspace();
        setStep('success');
        return;
      }
      throw new Error(res.data?.mensaje || 'Non-active status');
    } catch (err) {
      console.error('[PaymentSuccess] Manual activation error:', err);
      const next = activateAttempts + 1;
      setActivateAttempts(next);
      if (next >= MAX_ACTIVATE) {
        setStep('failed');
        setError(err?.response?.data?.mensaje || err.message || t('payment.activateError', 'Error activando suscripción'));
      } else {
        setTimeout(() => tryManualActivate(), 3000);
      }
    }
  }, [sessionId, activateAttempts, dispatch, refreshWorkspace, t]);

  useEffect(() => {
    if (subscriptionStatus === 'active') {
      refreshWorkspace().then(() => setStep('success')).catch(() => setStep('success'));
      return;
    }
    if (step === 'success' || step === 'failed') return;

    if (step === 'polling') {
      if (pollAttempts >= MAX_POLL) {
        tryManualActivate();
        return;
      }
      const timer = setTimeout(async () => {
        try {
          await dispatch(checkSubscription()).unwrap();
        } catch { /* continue */ }
        setPollAttempts((p) => p + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, pollAttempts, subscriptionStatus, dispatch, refreshWorkspace, tryManualActivate]);

  useEffect(() => {
    if (step === 'success') {
      window.history.pushState(null, '', window.location.href);
      const lockHistory = () => {
        window.history.pushState(null, '', window.location.href);
      };
      window.addEventListener('popstate', lockHistory);
      const timer = setTimeout(() => {
        sessionStorage.removeItem('xtramys:postCheckoutPath');
        navigate(getReturnPath(), { replace: true });
      }, 1800);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('popstate', lockHistory);
      };
    }
  }, [step, navigate, getReturnPath]);

  const handleRetry = () => {
    setActivateAttempts(0);
    setStep('polling');
    setPollAttempts(0);
    setError('');
  };

  return (
    <FullScreen>
      <Center>
        {step === 'polling' && (
          <>
            <SpinnerRing $color="#00bcd4" />
            <Title>{t('payment.verifyingTitle', 'Verificando tu pago...')}</Title>
            <Subtitle>{t('payment.verifyingMessage', 'Confirmando tu suscripción. Esto tomará unos segundos.')}</Subtitle>
            <Dots>{[...Array(MAX_POLL)].map((_, i) => <Dot key={i} $active={i < pollAttempts} />)}</Dots>
          </>
        )}

        {step === 'activating' && (
          <>
            <SpinnerRing $color="#ff6b35" />
            <Title>{t('payment.activatingTitle', 'Activando tu suscripción...')}</Title>
            <Subtitle>{t('payment.activatingMessage', 'Confirmando el pago con Stripe.')}</Subtitle>
            <Dots>{[...Array(MAX_ACTIVATE)].map((_, i) => <Dot key={i} $active={i < activateAttempts} />)}</Dots>
          </>
        )}

        {step === 'success' && (
          <>
            <IconCircle $bg="rgba(34,197,94,0.2)">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </IconCircle>
            <Title>{t('payment.successTitle', '¡Suscripción activa!')}</Title>
            <Subtitle>{t('payment.successMessage', 'Redirigiendo a la aplicación...')}</Subtitle>
          </>
        )}

        {step === 'failed' && (
          <>
            <IconCircle $bg="rgba(245,158,11,0.2)">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </IconCircle>
            <Title>{t('payment.failedTitle', 'No se pudo verificar automáticamente')}</Title>
            <Subtitle>{t('payment.failedMessage', 'Tu pago puede haberse procesado. Intenta verificar de nuevo.')}</Subtitle>
            {error && <ErrorBox>{error}</ErrorBox>}
            <Button $variant="primary" onClick={handleRetry}>
              {t('payment.retry', 'Reintentar verificación')}
            </Button>
            <Button $variant="ghost" onClick={() => navigate(getReturnPath(), { replace: true })}>
              {t('payment.goToAppAnyway', 'Ir a la app de todos modos')}
            </Button>
          </>
        )}
      </Center>
    </FullScreen>
  );
}
