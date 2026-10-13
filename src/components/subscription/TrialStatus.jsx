import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FiClock } from 'react-icons/fi';
import styled from 'styled-components';
import { hasTrialAccess, hasPaidSubscriptionAccess } from '@/utils/subscriptionAccess';
import { formatLocalDateTime } from '@/utils/localDateTime';

const Notice = styled.div`
  display: flex; align-items: flex-start; gap: 12px;
  margin: 0 0 20px; padding: 16px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ theme }) => theme.colors.primary};
  border-radius: 12px; background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.text};
  > svg { flex-shrink: 0; width: 20px; height: 20px; margin-top: 2px;
    color: ${({ theme }) => theme.colors.primary}; }
  strong { display: block; font-size: 14px; line-height: 1.5; }
  p { margin: 4px 0 0; font-size: 14px; line-height: 1.6;
    color: ${({ theme }) => theme.colors.textSecondary}; }
  time { font-weight: 600; }
  @media (max-width: 480px) { padding: 14px; }
`;

export default function TrialStatus() {
  const user = useSelector((s) => s.usuario.user);
  const { i18n } = useTranslation();
  if (!hasTrialAccess(user) || hasPaidSubscriptionAccess(user)) return null;
  const es = i18n.language?.startsWith('es');
  const endsAt = new Date(user.trialEndsAt);
  return <Notice role="status">
    <FiClock aria-hidden="true" />
    <div>
      <strong>{es ? 'Tu prueba gratuita está activa' : 'Your free trial is active'}</strong>
      <p>{es ? 'Disponible hasta el ' : 'Available until '}
        <time dateTime={endsAt.toISOString()}>{formatLocalDateTime(endsAt, es ? 'es-ES' : 'en-GB', {
          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })}</time>.
      </p>
      <p>{es ? 'Sin tarjeta ni cobros automáticos.' : 'No card or automatic charges.'}</p>
    </div>
  </Notice>;
}
