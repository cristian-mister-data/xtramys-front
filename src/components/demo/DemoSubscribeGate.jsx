import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { getAccessMode } from '@/utils/subscriptionAccess';

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

const SubscribeButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary || '#2563eb'};
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  transition: opacity 0.2s;
  &:hover {
    opacity: 0.9;
  }
`;

export default function DemoSubscribeGate({ children }) {
  const { t } = useTranslation();
  const user = useSelector((s) => s.usuario.user);
  const subscriptionStatus = useSelector((s) => s.usuario.subscriptionStatus);

  if (getAccessMode(user, subscriptionStatus) !== 'demo') return children;

  return (
    <GateContainer>
      <GateCard>
        <GateTitle>
          {t('subscription.requiredToView', 'Tienes que estar suscrito para verlo')}
        </GateTitle>
        <GateDescription>
          {t('subscription.demoNotice', 'Esta seccion no esta incluida en la demo. Suscribete para desbloquear todo el contenido.')}
        </GateDescription>
        <SubscribeButton to="/subscribe">
          {t('subscription.viewSubscription', 'Ver suscripción')}
        </SubscribeButton>
      </GateCard>
    </GateContainer>
  );
}
