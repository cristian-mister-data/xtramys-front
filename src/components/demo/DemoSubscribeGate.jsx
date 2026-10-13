import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { hasTrialAccess, hasPaidSubscriptionAccess } from '@/utils/subscriptionAccess';
import { openExternalWeb, websiteUrl } from '@/platform/externalWeb';
import { isNative } from '@/platform/capacitor';

const GateContainer = styled.div`
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 360px;
  background: ${({ theme }) => theme.colors.background || 'transparent'};
  padding: 20px;
`;

const GateCard = styled.div`
  width: min(560px, 100%);
  background: ${({ theme }) => theme.colors.surface || '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border || '#dbe4ef'};
  border-radius: 8px;
  padding: 28px;
  box-shadow: ${({ theme }) => theme.shadows?.md || '0 16px 40px rgba(15, 23, 42, 0.10)'};
  text-align: center;
`;

const GateTitle = styled.h1`
  margin: 0 0 10px;
  font-size: 24px;
  color: ${({ theme }) => theme.colors.text || '#102449'};
`;

const GateDescription = styled.p`
  margin: 0 0 22px;
  color: ${({ theme }) => theme.colors.textSecondary || '#475569'};
  line-height: 1.5;
  font-size: 15px;
`;

const SubscribeButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary || '#2563eb'};
  color: #fff;
  border: 0;
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  transition: opacity 0.2s;
  &:hover {
    opacity: 0.9;
  }
`;

export default function DemoSubscribeGate({ children, feature }) {
  const { i18n } = useTranslation();
  const es = !i18n.language?.startsWith("en");
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = useSelector((s) => s.usuario.user);
  const subscriptionStatus = useSelector((s) => s.usuario.subscriptionStatus);

  if (!feature || !hasTrialAccess(user) || hasPaidSubscriptionAccess(user, subscriptionStatus)) return children;

  const showOptions = () => {
    if (isNative) openExternalWeb(websiteUrl(i18n.language, es ? '/precios' : '/pricing')).catch(() => setError(es ? 'No se pudo abrir el enlace a los planes.' : 'Could not open the plans link.'));
    else navigate('/subscribe?intent=payment');
  };
  return <GateContainer><GateCard>
    <GateTitle>{es ? 'Desbloquea esta sección con un plan' : 'Unlock this section with a plan'}</GateTitle>
    <GateDescription>{es
      ? 'Nutrición, metodología y metodología de porteros están reservadas a los planes de pago. Tu prueba sigue disponible en el resto de la aplicación.'
      : 'Nutrition, methodology and goalkeeper methodology are reserved for paid plans. Your trial remains available in the rest of the app.'}</GateDescription>
    <SubscribeButton type="button" onClick={showOptions}>{es ? 'Ver planes y comprar' : 'View plans and buy'}</SubscribeButton>
    {error && <p role="alert">{error}</p>}
  </GateCard></GateContainer>;
}
