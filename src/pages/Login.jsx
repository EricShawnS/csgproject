import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getHomePathForRole } from '../components/ProtectedRoute';

export default function Login() {
  const { user, role, loading, resolveUserRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!loading && user && role) {
      navigate(getHomePathForRole(role), { replace: true });
    }
  }, [user, role, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message || 'Unable to sign in. Check your credentials.');
        setSubmitting(false);
        return;
      }

      const nextRole = await resolveUserRole(data.user);
      navigate(getHomePathForRole(nextRole), { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Unexpected sign-in error.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft/50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-xl border border-line bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5">
          <span className="inline-block rounded-full bg-admin-aside px-2.5 py-0.5 text-xs font-semibold text-white">
            CSG System
          </span>
          <h1 className="mt-2 text-xl font-bold text-ink dark:text-white">Sign In</h1>
          <p className="mt-1 text-xs text-mut dark:text-slate-400">
            Access Admin/Instructor Management or CSG Student Tracker based on your assigned role.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-xs text-red">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs font-semibold text-ink dark:text-slate-200">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@school.edu"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs font-semibold text-ink dark:text-slate-200">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-admin-active px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}