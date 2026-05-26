import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const SUBSCRIBE_PATHS = ['/subscribe', '/suscripcion', '/en/subscribe', '/es/subscribe', '/es/suscripcion', '/payment/success', '/payment/paypal/success'];

const GuardFallback = () => (
  <div style={{ minHeight: '100dvh', background: '#f0f4f8' }} />
);

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector((s) => s.usuario.isAuthenticated);
  const authChecked = useSelector((s) => s.usuario.authChecked);
  const user = useSelector((s) => s.usuario.user);
  const subscriptionStatus = useSelector((s) => s.usuario.subscriptionStatus);
  const location = useLocation();

  if (!authChecked) {
    return <GuardFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/welcome" state={{ from: location }} replace />;
  }
  if (user?.authProvider === 'local' && user.emailVerificado === false) {
    return <Navigate to="/auth/verify-email" state={{ correo: user.correo, from: location }} replace />;
  }

  const isActive = subscriptionStatus === 'active';
  const isCancellingButStillValid = (user?.subscriptionCancelAtPeriodEnd || subscriptionStatus === 'canceled')
    && user?.subscriptionCurrentPeriodEnd
    && new Date() < new Date(user.subscriptionCurrentPeriodEnd);

  if (user?.role !== 'admin' && !isActive && !isCancellingButStillValid) {
    if (!SUBSCRIBE_PATHS.some((p) => location.pathname.startsWith(p))) {
      return <Navigate to="/subscribe" state={{ from: location }} replace />;
    }
  }

  return children;
}
