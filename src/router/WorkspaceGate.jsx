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

  useEffect(() => {
    // La supervisión se inicia desde el panel del club y no necesita abrir
    // un workspace del administrador. El usuario supervisado se resuelve en
    // las peticiones de datos mediante su id, por lo que no debemos bloquear
    // la entrada con el selector de equipos.
    if (user && !supervising && !loaded && !loading) dispatch(fetchWorkspaces());
  }, [dispatch, loaded, loading, supervising, user]);

  useEffect(() => {
    if (supervising || !loaded || selected || items.length !== 1 || selecting.current) return;
    selecting.current = true;
    dispatch(selectWorkspace(items[0])).finally(() => { selecting.current = false; });
  }, [dispatch, items, loaded, selected, supervising]);

  // “Ver en panel” es una sesión de supervisión de solo lectura. No requiere
  // un permiso/workspace propio del administrador ni debe mostrar TeamSelect.
  if (supervising) return children;

  if (!loaded || loading || selecting.current) return <Fallback />;
  if (error) return <Navigate to="/team-select" state={{ error }} replace />;
  // Un administrador del club trabaja sobre el panel completo; no necesita
  // elegir un equipo para entrar. La selección solo aplica al modo entrenador.
  const isClubAdmin = user?.clubRole === 'admin' || (user?.role === 'club_admin' && user?.clubRole !== 'coach');
  if (isClubAdmin && location.pathname === '/app') return <Navigate to="/club/dashboard" replace />;
  if (isClubAdmin) return children;
  if (selected) return children;
  if (user?.role === 'club_admin' && items.length === 0 && location.pathname === '/club/dashboard') return children;
  if (user?.role === 'club_admin' && items.length === 0) return <Navigate to="/club/dashboard" replace />;
  return <Navigate to="/team-select" state={{ from: location }} replace />;
}
