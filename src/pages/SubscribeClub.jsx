import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { createCheckoutSession } from '@/api/subscription';
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

  @media (max-width: 480px) {
    padding: 14px;
    place-items: start center;
  }
`;

const Card = styled.div`
  position: relative;
  width: 100%;
  max-width: 460px;
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

  @media (max-width: 480px) {
    max-width: 100%;
    padding: 24px 18px 20px;
    border-radius: 20px;
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
  font-size: clamp(24px, 7vw, 28px);
  font-weight: 800;
  color: #fff;
  line-height: 1.2;

  @media (max-width: 480px) {
    margin-bottom: 8px;
  }
`;

const Subtitle = styled.p`
  margin: 0 0 28px;
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  line-height: 1.5;

  @media (max-width: 480px) {
    margin-bottom: 20px;
    font-size: 13px;
  }
`;

const PriceBlock = styled.div`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: left;

  @media (max-width: 480px) {
    padding: 16px;
  }
`;

const PriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 8px;

  @media (max-width: 480px) {
    flex-wrap: wrap;
    align-items: flex-start;
  }
`;

const PriceValue = styled.span`
  font-weight: 700;
  color: #fff;
`;

const OldPriceValue = styled.span`
  margin-right: 8px;
  color: rgba(255,255,255,0.38);
  font-weight: 700;
  text-decoration: line-through;
  text-decoration-thickness: 2px;
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 12px;
  margin-top: 4px;

  @media (max-width: 480px) {
    gap: 8px;
  }
`;

const TotalLabel = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TotalAmount = styled.span`
  font-size: clamp(22px, 6vw, 28px);
  font-weight: 900;
  color: #FF6B00;
`;

const QtyContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
  text-align: left;

  @media (max-width: 480px) {
    margin-bottom: 20px;
  }
`;

const QtyLabel = styled.label`
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const QtySelectorRow = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 4px;

  @media (max-width: 480px) {
    padding: 3px;
  }
`;

const QtyButton = styled.button`
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: rgba(255,255,255,0.6);
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255,255,255,0.05);
    color: #fff;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    width: 34px;
    height: 34px;
  }
`;

const QtyInput = styled.input`
  flex: 1;
  text-align: center;
  background: transparent;
  border: 0;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  outline: none;

  @media (max-width: 480px) {
    font-size: 15px;
  }
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
  text-align: left;

  @media (max-width: 480px) {
    gap: 8px;
    margin-bottom: 22px;
  }
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(255,255,255,0.75);

  @media (max-width: 480px) {
    font-size: 12px;
    line-height: 1.35;
  }
`;

const CheckDot = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(34,197,94,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 11px; height: 11px; color: #22c55e; }
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 15px 18px;
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

  @media (max-width: 480px) {
    padding: 12px 14px;
    font-size: 14px;
  }
`;

const Note = styled.p`
  margin: 12px 0 0;
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  line-height: 1.5;

  @media (max-width: 480px) {
    font-size: 11px;
  }
`;

const AdminNotice = styled.div`
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 12px;
  color: rgba(147,197,253,0.9);
  margin-bottom: 20px;
  text-align: left;
  line-height: 1.5;

  @media (max-width: 480px) {
    padding: 10px 12px;
    font-size: 11px;
  }
`;

const ErrorBox = styled.div`
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.2);
  color: #fca5a5;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 16px;

  @media (max-width: 480px) {
    padding: 10px 12px;
  }
`;

const AlreadySubscribed = styled.div`
  text-align: center;
`;

const GreenIcon = styled.div`
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

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const MIN_QUANTITY = 5;
const MAX_QUANTITY = 100;
const PRICE_PER_USER = 49;

export default function SubscribeClub() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const initialQty = parseInt(searchParams.get('quantity') || String(MIN_QUANTITY), 10);
  const safeInitialQty = Number.isFinite(initialQty) && initialQty >= MIN_QUANTITY && initialQty <= MAX_QUANTITY
    ? initialQty
    : MIN_QUANTITY;

  const [quantity, setQuantity] = useState(safeInitialQty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const user = useSelector((s) => s.usuario.user);
  const subscriptionStatus = useSelector((s) => s.usuario.subscriptionStatus);
  const hasAccess = hasPaidSubscriptionAccess(user, subscriptionStatus);

  const isEs = i18n.language?.startsWith('es');

  const handleQuantityChange = (val) => {
    const n = Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, val));
    setQuantity(n);
  };

  const handleCheckout = async () => {
    if (quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
      setError(
        isEs
          ? `La cantidad debe estar entre ${MIN_QUANTITY} y ${MAX_QUANTITY}`
          : `Quantity must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}`
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const successBaseUrl = window.location.origin;
      const data = await createCheckoutSession(successBaseUrl, {
        priceType: 'club',
        quantity,
      });
      if (data?.url) {
        sessionStorage.setItem('xtramys:postCheckoutPath', '/club/dashboard');
        window.location.href = data.url;
      } else {
        throw new Error(data?.mensaje || 'No checkout URL returned');
      }
    } catch (err) {
      const code = err?.response?.data?.code || err?.code;
      if (code === 'ALREADY_SUBSCRIBED') {
        setError(isEs ? 'Ya tienes una suscripción activa.' : 'You already have an active subscription.');
      } else if (code === 'INVALID_QUANTITY') {
        setError(isEs
          ? `La cantidad de licencias debe estar entre ${MIN_QUANTITY} y ${MAX_QUANTITY}.`
          : `License count must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`);
      } else {
        setError(err?.response?.data?.mensaje || err?.message || t('subscription.error', 'Error al iniciar el proceso de pago'));
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    isEs ? 'Cuentas de entrenador individuales independientes' : 'Independent individual coach accounts',
    isEs ? 'Biblioteca de ejercicios compartida' : 'Shared exercise library',
    isEs ? 'Recursos y vídeos tácticos compartidos' : 'Shared tactical resources and videos',
    isEs ? 'Panel de supervisión del club (modo lectura)' : 'Club supervision panel (read-only)',
    isEs ? 'Facturación centralizada por usuario/año' : 'Centralized billing per user/year',
    isEs ? 'Pizarra táctica, planificación y wellness' : 'Tactical board, training planning and wellness',
  ];

  if (hasAccess) {
    return (
      <Page>
        <Card>
          <AlreadySubscribed>
            <GreenIcon><CheckIcon /></GreenIcon>
            <Title style={{ marginBottom: 8 }}>
              {isEs ? 'Suscripción activa' : 'Active subscription'}
            </Title>
            <Subtitle>
              {isEs
                ? 'Ya tienes una suscripción activa. Accede al panel de tu club.'
                : 'You already have an active subscription. Go to your club dashboard.'}
            </Subtitle>
            <ActionButton onClick={() => navigate('/club/dashboard')}>
              {isEs ? 'Ir al panel del club' : 'Go to club dashboard'}
            </ActionButton>
          </AlreadySubscribed>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <Card>
        <Badge>
          {isEs ? '🏟️ Plan Club' : '🏟️ Club Plan'}
        </Badge>
        <Title>
          {isEs ? 'Suscripción de Club' : 'Club Subscription'}
        </Title>
        <Subtitle>
          {isEs
            ? 'Gestiona todos tus entrenadores bajo una única organización'
            : 'Manage all your coaches under a single organization'}
        </Subtitle>

        {/* Quantity selector */}
        <QtyContainer>
          <QtyLabel>
            {isEs ? 'Número de licencias (entrenadores)' : 'Number of licenses (coaches)'}
          </QtyLabel>
          <QtySelectorRow>
            <QtyButton
              type="button"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= MIN_QUANTITY}
            >
              −
            </QtyButton>
            <QtyInput
              type="number"
              min={MIN_QUANTITY}
              max={MAX_QUANTITY}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) handleQuantityChange(val);
              }}
            />
            <QtyButton
              type="button"
              onClick={() => handleQuantityChange(quantity + 1)}
            >
              +
            </QtyButton>
          </QtySelectorRow>
        </QtyContainer>

        {/* Price breakdown */}
        <PriceBlock>
          <PriceRow style={{ alignItems: 'baseline' }}>
            <span>{isEs ? 'Precio unitario' : 'Unit price'}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <PriceValue style={{ fontSize: '1.15em', fontWeight: 'bold' }}>
                {PRICE_PER_USER}€
              </PriceValue>
              <span style={{ color: '#94a3b8', fontSize: '0.8em' }}>
                /{isEs ? 'usuario/año' : 'user/year'}
              </span>
            </div>
          </PriceRow>
          <PriceRow>
            <span>{isEs ? 'Licencias' : 'Licenses'}</span>
            <PriceValue>× {quantity}</PriceValue>
          </PriceRow>
          <TotalRow>
            <TotalLabel>{isEs ? 'Total anual' : 'Annual total'}</TotalLabel>
            <TotalAmount>{quantity * PRICE_PER_USER}€</TotalAmount>
          </TotalRow>
        </PriceBlock>

        {/* Admin notice */}
        <AdminNotice>
          ℹ️ {isEs
            ? 'El administrador del club no consume licencia y tiene acceso de supervisión gratuito en modo lectura.'
            : 'The club administrator does not consume a license and has free read-only supervision access.'}
        </AdminNotice>

        {/* Features */}
        <FeatureList>
          {features.map((f) => (
            <FeatureItem key={f}>
              <CheckDot><CheckIcon /></CheckDot>
              <span>{f}</span>
            </FeatureItem>
          ))}
        </FeatureList>

        {error && <ErrorBox>{error}</ErrorBox>}

        <ActionButton onClick={handleCheckout} disabled={loading || quantity < MIN_QUANTITY}>
          {loading
            ? (isEs ? 'Procesando...' : 'Processing...')
            : (isEs ? 'Suscribirme ahora' : 'Subscribe now')}
        </ActionButton>

        <Note>
          {isEs
            ? `Facturación anual. Incluye ${quantity} licencia${quantity !== 1 ? 's' : ''} de entrenador. El acceso se activa automáticamente tras el pago.`
            : `Annual billing. Includes ${quantity} coach license${quantity !== 1 ? 's' : ''}. Access activates automatically after payment.`}
        </Note>
      </Card>
    </Page>
  );
}
