import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/AuthStore';
import { tokenService } from '../services/TokenService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasValidToken = tokenService.getAccessToken() !== null;

  if (!isAuthenticated && !hasValidToken) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
