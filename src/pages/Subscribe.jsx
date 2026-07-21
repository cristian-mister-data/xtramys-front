import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { FiArrowLeft, FiCheck, FiCheckCircle, FiCreditCard, FiHelpCircle, FiLock, FiRefreshCw } from 'react-icons/fi';
import styled from 'styled-components';
import SubscribeAccountStep from '@/components/subscription/SubscribeAccountStep';
import { createCheckoutSession, verifyPayPalSubscription } from '@/api/subscription';
import { PAYPAL_CLIENT_ID, PAYPAL_PLAN_ID } from '@/config';
import xtramysLogo from '@/images/xtramys.webp';
import xtramysWhiteLogo from '@/images/xtramys_white.webp';
import { websiteUrl } from '@/platform/externalWeb';
import { checkSubscription, logoutThunk } from '@/store/slices/user/userThunks';
import { useThemeMode } from '@/theme/ThemeContext';
import { hasPaidSubscriptionAccess } from '@/utils/subscriptionAccess';

const CLUB_MIN_QUANTITY = 5;
const INDIVIDUAL_PRICE = 59;
const CLUB_PRICE_PER_USER = 49;

const Page = styled.div`
  min-height: 100dvh;
  padding: 0 24px 32px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};

  @media (max-width: 700px) {
    padding: 0 14px 24px;
  }
`;

const Header = styled.header`
  width: min(1160px, 100%);
  min-height: 78px;
  margin: 0 auto 32px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderStrong || theme.colors.border};

  @media (max-width: 700px) {
    min-height: 62px;
    margin-bottom: 20px;
    grid-template-columns: 1fr auto;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
`;

const BrandLogo = styled.img`
  display: block;
  width: 116px;
  height: 48px;
  object-fit: contain;
  object-position: left center;
`;

const SecurePayment = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;

  svg { color: ${({ theme }) => theme.colors.success}; }

  @media (max-width: 700px) {
    display: none;
  }
`;

const BackButton = styled.button`
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.backgroundAlt};
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

const CheckoutGrid = styled.main`
  width: min(1160px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  align-items: start;
  gap: 28px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    gap: 18px;
  }
`;

const Panel = styled.section`
  width: 100%;
  padding: 28px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong || theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.md};
  overflow: hidden;

  @media (max-width: 700px) {
    padding: 20px 18px;
  }
`;

const SummaryPanel = styled(Panel)`
  position: sticky;
  top: 20px;

  @media (max-width: 860px) {
    position: static;
  }
`;

const PanelHeader = styled.div`
  margin: -28px -28px 22px;
  padding: 18px 28px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;

  @media (max-width: 700px) {
    margin: -20px -18px 18px;
    padding: 15px 18px;
  }
`;

const PlanBox = styled.div`
  margin: 0 -28px 24px;
  padding: 24px 28px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt || theme.colors.backgroundAlt};

  @media (max-width: 700px) {
    margin-inline: -18px;
    padding: 20px 18px;
  }
`;

const PlanTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  margin-bottom: 22px;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong || theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
`;

const PlanTab = styled.button`
  min-height: 40px;
  padding: 9px 12px;
  border: 0;
  border-radius: 6px;
  background: ${({ $active, theme }) => ($active ? theme.colors.surface : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textSecondary)};
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadows.sm : 'none')};
  transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.surface};
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: -3px;
  }
`;

const Badge = styled.span`
  display: inline-flex;
  margin-bottom: 12px;
  padding: 5px 9px;
  border-radius: 5px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary || '#fff'};
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
`;

const PlanTitle = styled.h1`
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
`;

const PlanSubtitle = styled.p`
  margin: 0 0 18px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
  line-height: 1.5;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px;
`;

const Amount = styled.span`
  font-size: 38px;
  font-weight: 900;
  line-height: 1;
`;

const Period = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 15px;
`;

const PriceNote = styled.p`
  margin: 9px 0 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
`;

const Features = styled.div`
  display: grid;
  gap: 11px;
`;

const Feature = styled.div`
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: start;
  gap: 9px;
  font-size: 13px;
  line-height: 1.45;

  svg {
    margin-top: 1px;
    color: ${({ theme }) => theme.colors.success};
  }
`;

const IncludedTitle = styled.p`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
`;

const Quantity = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 18px;
`;

const QuantityLabel = styled.label`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
`;

const QuantityControl = styled.div`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
`;

const QuantityButton = styled.button`
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: 18px;
  cursor: pointer;

  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.backgroundAlt}; }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
  }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const QuantityInput = styled.input`
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: 16px;
  font-weight: 800;
  text-align: center;
`;

const Steps = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 26px;
`;

const Step = styled.div`
  position: relative;
  display: grid;
  justify-items: center;
  gap: 6px;
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 13px;
    left: calc(50% + 16px);
    width: calc(100% - 32px);
    height: 2px;
    background: ${({ $complete, theme }) => ($complete ? theme.colors.primary : theme.colors.border)};
  }
`;

const StepNumber = styled.span`
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 2px solid ${({ $active, $complete, theme }) => ($active || $complete ? theme.colors.primary : theme.colors.border)};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ $active, $complete, theme }) => ($active || $complete ? theme.colors.primary : theme.colors.textMuted)};
  font-size: 12px;
  font-weight: 800;
`;

const SectionTitle = styled.h2`
  margin: 0 0 6px;
  font-size: 21px;
  font-weight: 800;
  line-height: 1.25;
`;

const SectionIntro = styled.p`
  margin: 0 0 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  line-height: 1.5;
`;

const AccountInfo = styled.div`
  margin-bottom: 18px;
  padding: 11px 13px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong || theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
`;

const PaymentArea = styled.div`
  display: grid;
  gap: 14px;
`;

const PrimaryButton = styled.button`
  width: 100%;
  min-height: 50px;
  padding: 13px 16px;
  border: 0;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary || '#fff'};
  font: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: background-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryHover || theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 3px;
  }
  &:disabled { cursor: not-allowed; opacity: 0.55; }
`;

const CardButton = styled(PrimaryButton)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong || theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt || theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const DemoButton = styled.button`
  width: 100%;
  margin-bottom: 18px;
  min-height: 46px;
  padding: 11px 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid ${({ theme }) => theme.colors.success};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.success};
  color: ${({ theme }) => theme.colors.onSuccess || '#fff'};
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: background-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.successSoftText || theme.colors.success};
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 3px;
  }
`;

const Note = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.border};
  }
`;

const PayPalBox = styled.div`
  min-height: 50px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong || theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceAlt || theme.colors.backgroundAlt};
`;

const Message = styled.div`
  padding: 11px 13px;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  color: ${({ theme }) => theme.colors.error};
  font-size: 13px;
  line-height: 1.45;
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  margin-top: 14px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong || theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceAlt || theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.surface};
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 3px;
  }
`;

const Status = styled.div`
  padding: 18px 0 4px;
  text-align: center;
`;

const StatusIcon = styled.div`
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.successSoft};
  color: ${({ theme }) => theme.colors.successSoftText || theme.colors.success};

  svg { width: 28px; height: 28px; }
`;

const StatusTitle = styled.h2`
  margin: 0 0 7px;
  color: ${({ theme }) => theme.colors.successSoftText || theme.colors.success};
  font-size: 20px;
`;

const StatusDate = styled.p`
  margin: 0 0 22px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
`;

const TrustBar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 24px -28px -28px;
  padding: 16px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundAlt};

  @media (max-width: 700px) {
    margin: 22px -18px -20px;
    padding: 14px 12px;
  }
`;

const TrustItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 10px;
  font-weight: 700;
  text-align: center;

  svg {
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.success};
  }
`;

const LogoutButton = styled.button`
  display: block;
  min-height: 40px;
  margin: 20px auto 0;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.error};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.errorSoft};
  color: ${({ theme }) => theme.colors.error};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.error};
    color: ${({ theme }) => theme.colors.onError || '#fff'};
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 3px;
  }
`;

function PayPalButton({ planId, locale, onApprove, onError }) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isPending) return <PayPalBox>{locale === 'es_ES' ? 'Cargando PayPal...' : 'Loading PayPal...'}</PayPalBox>;
  if (isRejected) return <Message>{locale === 'es_ES' ? 'No se ha podido cargar PayPal.' : 'PayPal could not be loaded.'}</Message>;

  return (
    <PayPalBox>
      <PayPalButtons
        forceReRender={[planId, locale]}
        style={{ layout: 'vertical', shape: 'rect', label: 'subscribe', height: 45, color: 'gold' }}
        createSubscription={(_, actions) => actions.subscription.create({ plan_id: planId })}
        onApprove={onApprove}
        onError={onError}
      />
    </PayPalBox>
  );
}

export default function Subscribe() {
  const { t, i18n } = useTranslation();
  const { mode } = useThemeMode();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isClubPlan = params.get('plan') === 'club';
  const initialQuantity = Number.parseInt(params.get('quantity') || String(CLUB_MIN_QUANTITY), 10);
  const user = useSelector((state) => state.usuario.user);
  const authChecked = useSelector((state) => state.usuario.authChecked);
  const subscriptionStatus = useSelector((state) => state.usuario.subscriptionStatus);
  const [quantity, setQuantity] = useState(initialQuantity >= CLUB_MIN_QUANTITY ? initialQuantity : CLUB_MIN_QUANTITY);
  const [activeStep, setActiveStep] = useState('account');
  const [accountIntent, setAccountIntent] = useState('payment');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const paypalMountKey = useRef(Date.now()).current;

  const isEs = i18n.language?.startsWith('es');
  const locale = isEs ? 'es-ES' : 'en-US';
  const returnPath = `${location.pathname}${location.search}${location.hash}`;
  const hasAccess = hasPaidSubscriptionAccess(user, subscriptionStatus);
  const isCancelling = (
    user?.subscriptionCancelAtPeriodEnd
    || subscriptionStatus === 'canceled'
    || subscriptionStatus === 'cancelled'
  ) && user?.subscriptionCurrentPeriodEnd && new Date() < new Date(user.subscriptionCurrentPeriodEnd);

  useEffect(() => {
    const nextQuantity = Number.parseInt(new URLSearchParams(location.search).get('quantity'), 10);
    if (nextQuantity >= CLUB_MIN_QUANTITY) setQuantity(nextQuantity);
  }, [location.search]);

  useEffect(() => {
    if (user) setActiveStep('payment');
  }, [user]);

  const handleStripeSubscribe = async () => {
    if (!user) {
      setActiveStep('account');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = isClubPlan
        ? await createCheckoutSession(window.location.origin, { priceType: 'club', quantity })
        : await createCheckoutSession(window.location.origin);
      if (data.url) {
        sessionStorage.setItem('xtramys:postCheckoutPath', isClubPlan ? '/club/dashboard' : '/season/create');
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err?.message || t('subscription.error', 'Error al iniciar el proceso de pago'));
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalApprove = async (data) => {
    setError(null);
    try {
      await verifyPayPalSubscription(data.subscriptionID);
      await dispatch(checkSubscription()).unwrap();
      navigate('/season/create', { replace: true });
    } catch (err) {
      setError(err?.message || t('subscription.paypalError', 'Error al verificar el pago con PayPal'));
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutThunk()).unwrap();
      setActiveStep('account');
      navigate(returnPath, { replace: true });
    } catch {
      // The checkout stays usable if remote logout fails.
    }
  };

  const handleBack = () => window.location.assign(websiteUrl(i18n.language));

  const handleAuthenticated = () => {
    if (accountIntent === 'demo') {
      navigate('/app', { replace: true });
      return;
    }
    setActiveStep('payment');
  };

  const selectPlan = (plan) => {
    const nextParams = new URLSearchParams(location.search);
    if (plan === 'club') {
      nextParams.set('plan', 'club');
      setAccountIntent('payment');
    }
    else {
      nextParams.delete('plan');
      nextParams.delete('quantity');
    }
    const query = nextParams.toString();
    navigate(`${location.pathname}${query ? `?${query}` : ''}`);
  };

  const features = isClubPlan ? [
    t('subscription.clubFeatures.coaches', 'Cuentas de entrenador individuales'),
    t('subscription.clubFeatures.library', 'Biblioteca de ejercicios compartida'),
    t('subscription.clubFeatures.tactics', 'Recursos y vídeos tácticos compartidos'),
    t('subscription.clubFeatures.supervision', 'Panel de supervisión del club'),
    t('subscription.clubFeatures.billing', 'Facturación centralizada'),
  ] : [
    t('subscription.features.tacticalBoard', 'Pizarra táctica con grabación de vídeo'),
    t('subscription.features.training', 'Planificación de entrenamientos'),
    t('subscription.features.wellness', 'Monitorización wellness'),
    t('subscription.features.rivals', 'Análisis de rivales'),
    t('subscription.features.matchSheets', 'Fichas de partido'),
    t('subscription.features.statistics', 'Estadísticas avanzadas'),
    t('subscription.features.injuries', 'Control de lesiones'),
    t('subscription.features.methodology', 'Metodología de juego'),
  ];

  const checkoutStep = hasAccess ? 3 : user && activeStep === 'payment' ? 2 : 1;

  return (
    <Page>
      <Header>
        <Brand><BrandLogo src={mode === 'dark' ? xtramysWhiteLogo : xtramysLogo} alt="Xtramys" /></Brand>
        <SecurePayment><FiLock /> {t('subscription.securePayment', 'Pago seguro · SSL')}</SecurePayment>
        <BackButton type="button" onClick={handleBack}><FiArrowLeft /> {t('common.back', 'Volver')}</BackButton>
      </Header>

      <CheckoutGrid>
        <SummaryPanel>
          <PanelHeader>{t('subscription.yourOrder', 'Tu pedido')}</PanelHeader>
          <PlanTabs role="tablist" aria-label={t('subscription.choosePlan', 'Elige tu plan')}>
            <PlanTab type="button" role="tab" aria-selected={!isClubPlan} $active={!isClubPlan} onClick={() => selectPlan('individual')}>
              {t('subscription.plan', 'Plan Individual')}
            </PlanTab>
            <PlanTab type="button" role="tab" aria-selected={isClubPlan} $active={isClubPlan} onClick={() => selectPlan('club')}>
              {t('subscription.clubTitle', 'Plan Club')}
            </PlanTab>
          </PlanTabs>
          <PlanBox>
            <Badge>{isClubPlan ? t('subscription.clubPlanBadge', 'Club') : t('subscription.planBadge', 'Individual')}</Badge>
            <PlanTitle>{isClubPlan ? t('subscription.clubTitle', 'Plan Club') : t('subscription.proAnnual', 'Plan PRO Anual')}</PlanTitle>
            <PlanSubtitle>
              {isClubPlan
                ? t('subscription.clubSubtitle', 'Administra a tus entrenadores bajo una única organización')
                : t('subscription.subtitle', 'Acceso completo a todas las funcionalidades de Xtramys')}
            </PlanSubtitle>

            <PriceRow>
              <Amount>
                {isClubPlan
                  ? `${CLUB_PRICE_PER_USER}€`
                  : isEs ? `${INDIVIDUAL_PRICE}€` : `€${INDIVIDUAL_PRICE}`}
              </Amount>
              <Period>/{isClubPlan ? t('subscription.userYear', 'usuario/año') : t('subscription.year', 'año')}</Period>
            </PriceRow>
            <PriceNote>
              {isClubPlan
                ? t('subscription.clubAnnual', 'Facturación anual por usuario')
                : t('subscription.annual', 'Facturado anualmente · Cancela cuando quieras')}
            </PriceNote>

            {isClubPlan && (
              <Quantity>
                <QuantityLabel htmlFor="club-quantity">{t('subscription.qtyLabel', 'Número de licencias')}</QuantityLabel>
                <QuantityControl>
                  <QuantityButton type="button" onClick={() => setQuantity((value) => Math.max(CLUB_MIN_QUANTITY, value - 1))} disabled={quantity <= CLUB_MIN_QUANTITY}>-</QuantityButton>
                  <QuantityInput id="club-quantity" type="number" min={CLUB_MIN_QUANTITY} value={quantity} onChange={(event) => setQuantity(Math.max(CLUB_MIN_QUANTITY, Number.parseInt(event.target.value, 10) || CLUB_MIN_QUANTITY))} />
                  <QuantityButton type="button" onClick={() => setQuantity((value) => value + 1)}>+</QuantityButton>
                </QuantityControl>
                <PriceNote>{t('subscription.totalAnnual', 'Total anual:')} {quantity * CLUB_PRICE_PER_USER}€</PriceNote>
              </Quantity>
            )}
          </PlanBox>

          <IncludedTitle>{t('subscription.includedTitle', 'Todo lo que incluye')}</IncludedTitle>
          <Features>
            {features.map((feature) => (
              <Feature key={feature}><FiCheck /><span>{feature}</span></Feature>
            ))}
          </Features>
        </SummaryPanel>

        <Panel>
          <Steps aria-label={t('subscription.checkoutSteps', 'Pasos de la suscripción')}>
            <Step $active={checkoutStep === 1} $complete={checkoutStep > 1}>
              <StepNumber $active={checkoutStep === 1} $complete={checkoutStep > 1}>1</StepNumber>
              <span>{t('subscription.account', 'Cuenta')}</span>
            </Step>
            <Step $active={checkoutStep === 2} $complete={checkoutStep > 2}>
              <StepNumber $active={checkoutStep === 2} $complete={checkoutStep > 2}>2</StepNumber>
              <span>{t('subscription.payment', 'Pago')}</span>
            </Step>
            <Step $active={checkoutStep === 3}>
              <StepNumber $active={checkoutStep === 3}>3</StepNumber>
              <span>{t('subscription.ready', 'Listo')}</span>
            </Step>
          </Steps>

          {hasAccess ? (
            <Status>
              <StatusIcon><FiCheck /></StatusIcon>
              <StatusTitle>
                {isCancelling
                  ? t('subscription.cancelledUntilEnd', 'Suscripción cancelada, acceso hasta el')
                  : t('subscription.active', 'Tu suscripción está activa')}
              </StatusTitle>
              {user?.subscriptionCurrentPeriodEnd && (
                <StatusDate>
                  {isCancelling ? '' : t('subscription.validUntil', 'Válida hasta el')}{' '}
                  {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString(locale, {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </StatusDate>
              )}
              <PrimaryButton type="button" onClick={() => navigate('/profile')}>
                {t('subscription.manage', 'Gestionar suscripción')}
              </PrimaryButton>
            </Status>
          ) : !authChecked && !user ? (
            <SectionIntro>{t('common.loading', 'Cargando...')}</SectionIntro>
          ) : !user || activeStep === 'account' ? (
            <>
              <SectionTitle>
                {accountIntent === 'demo'
                  ? t('subscription.demoAccountTitle', 'Crea tu cuenta demo')
                  : t('subscription.checkoutAccountTitle', 'Tu cuenta')}
              </SectionTitle>
              <SectionIntro>
                {accountIntent === 'demo'
                  ? t('subscription.demoAccountSubtitle', 'Crea tu cuenta o inicia sesión para acceder directamente a la demo.')
                  : t('subscription.checkoutAccountSubtitle', 'Crea una cuenta o inicia sesión antes de realizar ningún pago.')}
              </SectionIntro>
              {!isClubPlan && (
                <DemoButton
                  type="button"
                  onClick={() => setAccountIntent((current) => current === 'demo' ? 'payment' : 'demo')}
                >
                  <FiCheckCircle aria-hidden="true" />
                  {accountIntent === 'demo'
                    ? t('subscription.backToSubscription', 'Quiero suscribirme')
                    : t('subscription.tryDemo', 'Probar la demo gratis')}
                </DemoButton>
              )}
              <SubscribeAccountStep returnPath={returnPath} intent={accountIntent} onAuthenticated={handleAuthenticated} />
            </>
          ) : (
            <>
              <SectionTitle>{t('subscription.paymentTitle', 'Completa el pago')}</SectionTitle>
              <SectionIntro>{t('subscription.paymentSubtitle', 'Elige el método de pago para activar tu plan.')}</SectionIntro>
              <AccountInfo>{t('subscription.account', 'Cuenta')}: <strong>{user.correo}</strong></AccountInfo>

              {user.plan === 'demo' && !isClubPlan && (
                <DemoButton type="button" onClick={() => navigate('/app')}>
                  <FiCheckCircle aria-hidden="true" />
                  {t('subscription.demoMode', 'Entrar en modo demo')}
                </DemoButton>
              )}

              <PaymentArea>
                {error && <Message>{error}</Message>}

                {isClubPlan || !PAYPAL_CLIENT_ID ? (
                  <PrimaryButton type="button" onClick={handleStripeSubscribe} disabled={loading}>
                    {loading ? t('subscription.loading', 'Procesando...') : t('subscription.subscribe', 'Continuar al pago')}
                  </PrimaryButton>
                ) : (
                  <PayPalScriptProvider key={`paypal-${locale}-${paypalMountKey}`} options={{
                    clientId: PAYPAL_CLIENT_ID,
                    vault: true,
                    intent: 'subscription',
                    locale: isEs ? 'es_ES' : 'en_US',
                    components: 'buttons',
                  }}>
                    <PayPalButton
                      planId={PAYPAL_PLAN_ID}
                      locale={isEs ? 'es_ES' : 'en_US'}
                      onApprove={handlePayPalApprove}
                      onError={() => setError(t('subscription.paypalError', 'Error al procesar el pago con PayPal'))}
                    />
                    <Divider>{t('common.or', 'o')}</Divider>
                    <CardButton type="button" onClick={handleStripeSubscribe} disabled={loading}>
                      <FiCreditCard />
                      {loading ? t('subscription.loading', 'Procesando...') : t('subscription.payWithCard', 'Pagar con tarjeta')}
                    </CardButton>
                  </PayPalScriptProvider>
                )}

                <Note>{t('subscription.paymentNote', 'Tras el pago, tu acceso se activará automáticamente.')}</Note>
              </PaymentArea>

              <SecondaryButton type="button" onClick={() => dispatch(checkSubscription())}>
                <FiRefreshCw /> {t('subscription.refresh', 'Verificar estado de suscripción')}
              </SecondaryButton>
            </>
          )}

          <TrustBar>
            <TrustItem><FiLock /> {t('subscription.encryptedPayment', 'Pago cifrado')}</TrustItem>
            <TrustItem><FiCheckCircle /> {t('subscription.noCommitment', 'Sin permanencia')}</TrustItem>
            <TrustItem><FiHelpCircle /> {t('subscription.support', 'Soporte Xtramys')}</TrustItem>
          </TrustBar>
        </Panel>
      </CheckoutGrid>

      {user && (
        <LogoutButton type="button" onClick={handleLogout}>
          {t('menu.logout', 'Cerrar sesión y usar otra cuenta')}
        </LogoutButton>
      )}
    </Page>
  );
}
