import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { requestTrialActivation } from '@/api/auth';
import { fetchMe } from '@/store/slices/user/userThunks';
import { hasTrialAccess, hasPaidSubscriptionAccess } from '@/utils/subscriptionAccess';
import { formatLocalDateTime } from '@/utils/localDateTime';
import { isNative } from '@/platform/capacitor';
import { openExternalWeb, websiteUrl } from '@/platform/externalWeb';

const Card = styled.section`
  margin: 16px 0; padding: clamp(24px, 4vw, 40px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 4px solid ${({ theme }) => theme.colors.primary};
  border-radius: 20px; background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text}; box-shadow: 0 16px 48px rgba(15, 23, 42, .08);
  > strong { display: inline-block; padding: 7px 12px; border-radius: 999px;
    background: ${({ theme }) => theme.colors.primarySoft}; color: ${({ theme }) => theme.colors.primarySoftText};
    font-size: 13px; font-weight: 700; }
  h2 { margin: 22px 0 16px; font-size: clamp(26px, 4vw, 36px); line-height: 1.2; letter-spacing: -.035em; }
  p { margin: 12px 0; color: ${({ theme }) => theme.colors.textSecondary}; line-height: 1.7; }
  small { display: block; margin-top: 28px; padding-top: 20px;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.textMuted}; font-size: 13px; line-height: 1.65; }
`;
const Actions = styled.div`display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px;`;
const Action = styled.button`
  min-height: 48px; padding: 13px 22px; border-radius: 10px;
  border: 1px solid ${({ $primary, theme }) => $primary ? theme.colors.primary : theme.colors.borderStrong};
  background: ${({ $primary, theme }) => $primary ? theme.colors.primary : theme.colors.surface};
  color: ${({ $primary, theme }) => $primary ? theme.colors.onPrimary : theme.colors.text}; font: inherit; font-weight: 700;
  &:hover:not(:disabled) { background: ${({ $primary, theme }) => $primary ? theme.colors.primaryHover : theme.colors.backgroundAlt}; }
  cursor: pointer; &:disabled { opacity: .55; cursor: wait; }
  &:focus-visible { outline: 3px solid ${({ theme }) => theme.colors.focusRing}; outline-offset: 3px; }
  @media(max-width: 480px) { width: 100%; }
`;
export default function TrialOffer() {
  const user = useSelector((s) => s.usuario.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const es = !i18n.language?.startsWith('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [emailTrialUsed, setEmailTrialUsed] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const cooldownUntil = Math.max(resendAt, new Date(user?.trialActivationRequestedAt || 0).getTime() + 30000);
  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  useEffect(() => {
    if (!secondsLeft) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);
  const pendingEmail = sent || user?.trialStatus === 'awaiting_activation';
  useEffect(() => {
    if (!pendingEmail) return;
    let alive = true;
    let lastChecked = 0;
    const refresh = () => {
      if (!alive || document.visibilityState === 'hidden' || Date.now() - lastChecked < 2000) return;
      lastChecked = Date.now();
      dispatch(fetchMe({ force: true })).unwrap().catch(() => {});
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    let nativeListener;
    if (isNative) import('@capacitor/app').then(({ App }) => App.addListener('appStateChange', ({ isActive }) => { if (isActive) refresh(); }))
      .then(listener => { if (alive) nativeListener = listener; else listener.remove(); }).catch(() => {});
    return () => { alive = false; window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); nativeListener?.remove(); };
  }, [pendingEmail, dispatch]);
  if (!user || user.clubId || user.role !== 'user' || hasPaidSubscriptionAccess(user)) return null;
  const active = hasTrialAccess(user);
  const eligible = user.trialEligible ?? (['free', 'demo'].includes(user.plan)
    && !user.trialStartedAt && !user.subscriptionStartedAt && !user.subscriptionStatus);
  const used = !active && (emailTrialUsed || user.trialStatus === 'used' || Boolean(user.trialStartedAt));
  if (!active && !eligible && !used) return null;
  const expired = Boolean(user.trialStartedAt && !active);
  const pending = pendingEmail;
  const request = async () => {
    if (busy || secondsLeft || used || !eligible) return;
    if (!user.emailVerificado) return navigate('/auth/verify-email', { state: { correo: user.correo, from: '/trial' } });
    setBusy(true); setError(''); setNow(Date.now()); setResendAt(Date.now() + 30000);
    try {
      await requestTrialActivation(isNative ? 'app' : 'web');
      setSent(true);
      await dispatch(fetchMe({ force: true })).unwrap();
    } catch (err) {
      if ((err?.code || err?.response?.data?.code) === 'TRIAL_ALREADY_USED') {
        setEmailTrialUsed(true);
        dispatch(fetchMe({ force: true }));
      } else setError(err?.message || (es ? 'No se pudo enviar el correo. Inténtalo de nuevo.' : 'Could not send the email. Please try again.'));
    }
    finally { setBusy(false); }
  };
  const buy = () => isNative
    ? openExternalWeb(websiteUrl(i18n.language, es ? '/precios' : '/pricing')).catch(() => setError(es ? 'No se pudo abrir el enlace.' : 'Could not open the link.'))
    : navigate('/subscribe?intent=payment');
  if (used) return <Card>
    <strong>{es ? 'Xtramys · Prueba ya utilizada' : 'Xtramys · Trial already used'}</strong>
    <h2>{es ? 'Este correo ya ha utilizado los 7 días gratis' : 'This email has already used its 7 free days'}</h2>
    <p>{es ? 'La prueba gratuita está disponible una sola vez por correo. Elige un plan para continuar usando Xtramys.'
      : 'The free trial is available once per email. Choose a plan to continue using Xtramys.'}</p>
    {expired && <p>{es ? 'Tu trabajo se conserva.' : 'Your work is saved.'}</p>}
    <Actions><Action $primary type="button" onClick={buy}>{es ? 'Ver planes y comprar' : 'View plans and buy'}</Action></Actions>
    {error && <p role="alert">{error}</p>}
  </Card>;
  return <Card>
    <strong>Xtramys · {es ? '7 días gratis' : '7 days free'}</strong>
    <h2>{active ? (es ? 'Tu prueba está activa' : 'Your trial is active') : expired
      ? (es ? 'Tu prueba ha terminado. Tu trabajo se conserva.' : 'Your trial has ended. Your work is saved.')
      : (es ? 'Empieza cuando tú quieras' : 'Start when you are ready')}</h2>
    <p>{es ? 'Crea y guarda tus equipos, ejercicios y entrenamientos durante 7 días. Sin tarjeta ni cobros automáticos.'
      : 'Create and save your teams, exercises and training sessions for 7 days. No card or automatic charges.'}</p>
    {!active && !expired && <p>{es ? 'Te enviaremos un enlace a tu correo validado. Los 7 días empiezan únicamente cuando confirmes la activación desde ese enlace.'
      : 'We will email a link to your verified address. Your 7 days only begin when you confirm activation from that link.'}</p>}
    {active && <p>{es ? 'Disponible hasta: ' : 'Available until: '}{formatLocalDateTime(user.trialEndsAt, es ? 'es-ES' : 'en-GB')}</p>}
    {pending && !active && !expired && <p role="status">{es ? 'Revisa tu correo y la carpeta de spam: ' : 'Check your inbox and spam folder: '}{user.correo}. {es ? 'La prueba todavía no ha empezado.' : 'Your trial has not started yet.'}</p>}
    {error && <p role="alert">{error}</p>}
    <Actions>
      {!expired && <Action $primary type="button" disabled={busy || (!active && secondsLeft > 0)} onClick={active ? () => navigate('/app') : request}>
        {busy ? (es ? 'Enviando correo…' : 'Sending email…') : active ? (es ? 'Abrir aplicación' : 'Open app') : secondsLeft > 0
          ? (es ? `Reenviar en ${secondsLeft} s` : `Resend in ${secondsLeft} s`) : pending
          ? (es ? 'Reenviar enlace de activación' : 'Resend activation link') : (es ? 'Activar 7 días gratis' : 'Activate 7 days free')}
      </Action>}
      <Action type="button" onClick={buy}>{es ? 'Ver planes y comprar' : 'View plans and buy'}</Action>
    </Actions>
    <small>{es ? 'Nutrición, metodología y metodología de porteros requieren un plan de pago y no están incluidas en la prueba. El enlace de activación caduca en 24 horas.'
      : 'Nutrition, methodology and goalkeeper methodology require a paid plan and are not included in the trial. Activation links expire after 24 hours.'}</small>
  </Card>;
}
