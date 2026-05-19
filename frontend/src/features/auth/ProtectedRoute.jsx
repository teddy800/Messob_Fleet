import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';

export default function ProtectedRoute() {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}