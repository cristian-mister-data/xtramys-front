import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

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

  if (user?.role !== 'admin' && subscriptionStatus !== 'active') {
    if (location.pathname !== '/subscribe' && location.pathname !== '/payment/success') {
      return <Navigate to="/subscribe" state={{ from: location }} replace />;
    }
  }

  return children;
}
