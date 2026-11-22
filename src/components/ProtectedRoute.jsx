import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function getHomePathForRole(role) {
  if (role === 'admin' || role === 'instructor') return '/admin';
  if (role === 'officer') return '/officer';
  return '/login';
}

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-mut dark:bg-slate-950 dark:text-slate-400">
        Verifying session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={getHomePathForRole(role)} replace />;
  }

  return children;
}