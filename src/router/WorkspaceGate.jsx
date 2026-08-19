import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorkspaces, selectWorkspace } from '@/store/slices/workspace/workspaceSlice';

const Fallback = () => <div style={{ minHeight: '100dvh', background: 'var(--color-background, #f0f4f8)' }} />;

export default function WorkspaceGate({ children }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((state) => state.usuario.user);
  const supervising = useSelector((state) => state.usuario.supervising);
  const { items, selected, loaded, loading, error } = useSelector((state) => state.workspace);
  const selecting = useRef(false);

  const isDemo = user?.plan === 'demo' || user?.accessMode === 'demo';
  const isClubAdmin = user?.clubRole === 'admin' || (user?.role === 'club_admin' && user?.clubRole !== 'coach');

  useEffect(() => {
    // La supervisión y el modo demo no requieren selector de equipo ni workspace propio del admin.
    if (user && !supervising && !isDemo && !loaded && !loading) {
      dispatch(fetchWorkspaces());
    }
  }, [dispatch, loaded, loading, supervising, user, isDemo]);

  useEffect(() => {
    if (supervising || isDemo || isClubAdmin || !loaded || selected || items.length !== 1 || selecting.current) return;
    selecting.current = true;
    dispatch(selectWorkspace(items[0])).finally(() => { selecting.current = false; });
  }, [dispatch, items, loaded, selected, supervising, isDemo, isClubAdmin]);

  // "Ver en panel" (supervisión) y "Modo Demo" permiten navegar directamente sobre la app
  if (supervising || isDemo) return children;

  // Un administrador del club trabaja sobre el panel completo; no necesita elegir equipo para entrar.
  if (isClubAdmin) {
    if (location.pathname === '/app') return <Navigate to="/club/dashboard" replace />;
    return children;
  }

  if (!loaded || loading || selecting.current) return <Fallback />;
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
