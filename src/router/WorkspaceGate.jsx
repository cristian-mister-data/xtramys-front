import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorkspaces, selectWorkspace } from '@/store/slices/workspace/workspaceSlice';

const Fallback = () => (
  <div style={{
    minHeight: '100dvh',
    background: 'var(--color-background, #0b0f19)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  }}>
    <div style={{
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.1)',
      borderTopColor: '#ff6b35',
      animation: 'spin 0.8s linear infinite',
    }} />
    <span style={{ fontSize: 14, opacity: 0.7, fontFamily: 'sans-serif', color: '#fff' }}>Cargando...</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function WorkspaceGate({ children }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((state) => state.usuario.user);
  const supervising = useSelector((state) => state.usuario.supervising);
  const { items, selected, loaded, loading, error } = useSelector((state) => state.workspace);
  const selecting = useRef(false);

  const isDemo = user?.plan === 'demo' || user?.accessMode === 'demo';
  const hasSupervisionSession = Boolean(
    supervising ||
    location.state?.clubSupervision ||
    sessionStorage.getItem('xtramys:club-supervision-active') === '1' ||
    (sessionStorage.getItem('xtramys:club-supervision-user') &&
      (sessionStorage.getItem('xtramys:club-supervision-owner') === String(user?._id) ||
        sessionStorage.getItem('xtramys:club-supervision-user') === String(user?._id))) ||
    (sessionStorage.getItem('xtramys:club-manage-user') &&
      (sessionStorage.getItem('xtramys:club-supervision-owner') === String(user?._id) ||
        sessionStorage.getItem('xtramys:club-supervision-user') === String(user?._id)))
  );

  const isClubAdmin = (user?.role === 'club_admin' || user?.clubRole === 'admin') && !hasSupervisionSession;

  useEffect(() => {
    // En supervisión cargamos los workspaces del usuario objetivo.
    if (user && !isDemo && !loaded && !loading) {
      dispatch(fetchWorkspaces());
    }
  }, [dispatch, loaded, loading, supervising, user, isDemo]);

  useEffect(() => {
    if (isDemo || isClubAdmin || !loaded || selected || items.length !== 1 || selecting.current) return;
    selecting.current = true;
    dispatch(selectWorkspace(items[0])).finally(() => { selecting.current = false; });
  }, [dispatch, items, loaded, selected, supervising, isDemo, isClubAdmin]);

  if (isDemo) return children;

  if (sessionStorage.getItem('xtramys:club-supervision-leaving') === '1') return children;

  // Al cerrar una supervisión el workspace se limpia antes de que termine de
  // restaurarse el usuario administrador. El dashboard no necesita equipo.
  if (location.pathname === '/club/dashboard' && location.state?.leavingSupervision) return children;

  // Un administrador del club trabaja sobre el panel completo; no necesita elegir equipo para entrar.
  if (isClubAdmin) {
    if (location.pathname === '/app') return <Navigate to="/club/dashboard" replace />;
    return children;
  }

  if (!loaded || loading || selecting.current) return <Fallback />;
  if (supervising) {
    if (items.length > 1 && !selected) {
      return <Navigate to="/team-select" state={{ from: { pathname: '/app' }, clubSupervision: true }} replace />;
    }
    return children;
  }
  if (selected) return children;
  if (error) {
    if (location.pathname === '/team-select') return children;
    return <Navigate to="/team-select" state={{ error }} replace />;
  }
  if (user?.role === 'club_admin' && items.length === 0 && location.pathname === '/club/dashboard') return children;
  if (user?.role === 'club_admin' && items.length === 0) return <Navigate to="/club/dashboard" replace />;

  if (location.pathname === '/team-select') return children;
  return <Navigate to="/team-select" state={{ from: location }} replace />;
}
