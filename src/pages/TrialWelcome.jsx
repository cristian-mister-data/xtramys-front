import styled from 'styled-components';
import TrialOffer from '@/components/subscription/TrialOffer';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { hasPaidSubscriptionAccess, hasTrialAccess } from '@/utils/subscriptionAccess';
const Page = styled.main`
  min-height: 100dvh; display: grid; align-items: center;
  padding: clamp(20px, 5vw, 60px); background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  > div { width: 100%; max-width: 720px; margin: auto; }
  h1 { margin: 0 0 24px; color: ${({ theme }) => theme.colors.primary}; font-size: 28px; letter-spacing: -.04em; }
`;
export default function TrialWelcome() {
  const user = useSelector((s) => s.usuario.user);
  if (hasTrialAccess(user)) return <Navigate to="/app" replace />;
  if (hasPaidSubscriptionAccess(user) || user?.clubId) return <Navigate to="/profile" replace />;
  return <Page><div><h1>Xtramys</h1><TrialOffer /></div></Page>;
}
