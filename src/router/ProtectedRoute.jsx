import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getAccessMode, hasAppAccess } from '@/utils/subscriptionAccess';
import { isNative } from '@/platform/capacitor';

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
  '/en/payment/paypal/success',
];

const GuardFallback = () => (
  <div style={{
    minHeight: '100dvh',
    background: '#0b0f19',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  }}>
    <div style={{
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.1)',
      borderTopColor: '#ff6b35',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span style={{ fontSize: 14, opacity: 0.7, fontFamily: 'sans-serif' }}>Cargando...</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const DEMO_ALLOWED_PREFIXES = [
  '/app',
  '/season',
  '/tournaments',
  '/players',
  '/evaluations',
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
  const supervising = useSelector((s) => s.usuario.supervising);
  const subscriptionStatus = useSelector((s) => s.usuario.subscriptionStatus);
  const location = useLocation();

  if (!authChecked) {
    return <GuardFallback />;
  }

  if (!isAuthenticated) {
    const isSubscribeFlow = SUBSCRIBE_PATHS.some((p) => location.pathname.startsWith(p));
    return <Navigate to={isSubscribeFlow || isNative ? '/auth/login' : '/auth/welcome'} state={{ from: location }} replace />;
  }
  // Las cuentas administradoras de club tienen su entrada en el panel del
  // club. Esto también corrige sesiones antiguas que aún intentan abrir /app.
  const restoringSupervision = Boolean(location.state?.clubSupervision) || (
    typeof window !== 'undefined'
    && (sessionStorage.getItem('xtramys:club-supervision-active') === '1'
      || sessionStorage.getItem('xtramys:club-supervision-user'))
    && (sessionStorage.getItem('xtramys:club-supervision-owner') === String(user?._id || '')
      || sessionStorage.getItem('xtramys:club-supervision-user') === String(user?._id || ''))
  );
  if (
    location.pathname === '/app' &&
    !supervising &&
    !restoringSupervision &&
    (user?.clubRole === 'admin' || (user?.role === 'club_admin' && user?.clubRole !== 'coach'))
  ) {
    return <Navigate to="/club/dashboard" replace />;
  }
  if (user?.authProvider === 'local' && user.emailVerificado === false) {
    return <Navigate to="/auth/verify-email" state={{ correo: user.correo, from: location }} replace />;
  }

  const accessMode = getAccessMode(user, subscriptionStatus);
  const hasAccess = hasAppAccess(user, subscriptionStatus);

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
