import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const resolveUserRole = async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      setRole(null);
      return null;
    }

    const metaRole = currentUser.user_metadata?.role || null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
      const resolved = data.role || metaRole || 'officer';
      setRole(resolved);
      return resolved;
    }

    setProfile(null);
    const fallback = metaRole || 'officer';
    setRole(fallback);
    return fallback;
  };

  useEffect(() => {
    let active = true;

    const initSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!active) return;
        setSession(initialSession);
        const currentUser = initialSession?.user ?? null;
        setUser(currentUser);
        await resolveUserRole(currentUser);
      } finally {
        if (active) setLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      const currentUser = nextSession?.user ?? null;
      setUser(currentUser);
      await resolveUserRole(currentUser);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        profile,
        loading,
        resolveUserRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}