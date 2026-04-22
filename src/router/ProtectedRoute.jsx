import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector((s) => s.usuario.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/welcome" state={{ from: location }} replace />;
  }
  return children;
}
