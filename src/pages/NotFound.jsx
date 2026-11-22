import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomePathForRole } from '../components/ProtectedRoute';

export default function NotFound() {
  const { user, role } = useAuth();
  const target = user ? getHomePathForRole(role) : '/login';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-wider text-mut">404</p>
      <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white">Page Not Found</h1>
      <p className="mt-2 max-w-md text-sm text-mut dark:text-slate-400">
        The page you requested does not exist or you do not have access to it.
      </p>
      <Link
        to={target}
        className="mt-4 rounded-lg bg-admin-active px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
      >
        Return Home
      </Link>
    </div>
  );
}