import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import useSupervision from '@/hooks/useSupervision';
import { LockedSubscriptionButton } from './CanMutate';

const Notice = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  strong {
    display: block;
    font-size: 14px;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 13px;
  }

  @media (max-width: 600px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export default function DemoSubscriptionNotice({ title, message }) {
  const { t } = useTranslation();
  const { isDemo } = useSupervision();

  if (!isDemo) return null;

  return (
    <Notice role="note">
      <div>
        <strong>{title || t('subscription.demoContentTitle', 'Disponibles con suscripción')}</strong>
        <p>{message || t('subscription.demoContentMessage', 'Activa una suscripción para crear y acceder a todo el contenido.')}</p>
      </div>
      <LockedSubscriptionButton />
    </Notice>
  );
}
