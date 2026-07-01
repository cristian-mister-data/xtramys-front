import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getAccessMode, hasAppAccess } from '@/utils/subscriptionAccess';

const SUBSCRIBE_PATHS = [
  '/subscribe',
  '/subscribe-club',
  '/en/subscribe-club',
  '/suscripcion',
  '/en/subscribe',
  '/es/subscribe',
  '/es/suscripcion',
  '/payment/success',
  '/payment/paypal/success',
  '/es/payment/success',
  '/en/payment/success',
  '/es/payment/paypal/success',
  '/en/payment/paypal/success'
];

const GuardFallback = () => (
  <div style={{ minHeight: '100dvh', background: '#f0f4f8' }} />
);

const DEMO_ALLOWED_PREFIXES = [
  '/app',
  '/season',
  '/tournaments',
  '/players',
  '/training',
  '/wellness',
  '/rivals',
  '/match-sheets',
  '/injuries',
  '/rival-analysis',
  '/scouting',
  '/anthropometry',
  '/statistics',
  '/profile',
  '/tactical-board',
  '/exercises',
  '/strategies',
  '/set-pieces',
  '/my-videos',
  '/strength-exercises',
  '/methodology',
  '/goalkeeper-methodology',
  '/nutrition',
  '/injury-prevention',
  '/video-editor',
  '/subscribe',
  '/suscripcion',
  '/payment',
];

const DEMO_REDIRECT_PREFIXES = [
  '/season/create',
  '/wellness/templates',
];

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
    const isSubscribeFlow = SUBSCRIBE_PATHS.some((p) => location.pathname.startsWith(p));
    return <Navigate to={isSubscribeFlow ? '/auth/login' : '/auth/welcome'} state={{ from: location }} replace />;
  }
  if (user?.authProvider === 'local' && user.emailVerificado === false) {
    return <Navigate to="/auth/verify-email" state={{ correo: user.correo, from: location }} replace />;
  }

  const accessMode = getAccessMode(user, subscriptionStatus);
  const hasAccess = hasAppAccess(user, subscriptionStatus);

  if (user?.role === 'club_admin') {
    const allowedPrefixes = [
      '/club',
      '/profile',
      '/subscribe',
      '/subscribe-club',
      '/suscripcion',
      '/payment',
      '/season/create',   // initial setup: create season, team and shield
      '/auth/verify-email',
      '/auth/reset-password',
    ];
    const currentPath = location.pathname;
    const isAllowed = allowedPrefixes.some((p) => currentPath.startsWith(p)) || currentPath === '/';
    if (!isAllowed) {
      return <Navigate to="/club/dashboard" replace />;
    }
  }

  if (accessMode === 'demo') {
    const currentPath = location.pathname;
    const isBlocked = DEMO_REDIRECT_PREFIXES.some((p) => currentPath.startsWith(p));
    const isAllowed = !isBlocked && (DEMO_ALLOWED_PREFIXES.some((p) => currentPath.startsWith(p)) || currentPath === '/');
    if (!isAllowed) {
      return <Navigate to="/app" replace />;
    }
  }

  if (user?.role !== 'admin' && user?.role !== 'club_admin' && !hasAccess) {
    if (!SUBSCRIBE_PATHS.some((p) => location.pathname.startsWith(p))) {
      return <Navigate to="/subscribe" state={{ from: location }} replace />;
    }
  }

  return children;
}
