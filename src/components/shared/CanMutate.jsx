import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { MdLock } from 'react-icons/md';
import useSupervision from '@/hooks/useSupervision';

const LockedButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: not-allowed;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  opacity: 1;

  svg {
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 600px) {
    width: 100%;
  }
`;

export function LockedSubscriptionButton({ label }) {
  const { t } = useTranslation();
  const text = label || t('subscription.availableWithSubscription', 'Disponible con suscripción');

  return (
    <LockedButton type="button" disabled aria-label={text} title={text}>
      <MdLock size={18} />
      <span>{text}</span>
    </LockedButton>
  );
}

export default function CanMutate({ children, fallback }) {
  const { canMutate, isDemo } = useSupervision();
  if (canMutate) return children;
  if (isDemo) return fallback || <LockedSubscriptionButton />;
  return null;
}
