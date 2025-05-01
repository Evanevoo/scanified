import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext();

// This file provides authentication logic for the app.
// It lets you log in, sign up, log out, and keeps track of the current user and their role (admin, manager, user).
// You can use the useAuth() hook in your components to access the user and auth functions.
// The AuthProvider should wrap your app to provide this functionality everywhere.
//
// Example usage:
// import { useAuth } from '../hooks/useAuth';
// const { user, role, login, signup, logout } = useAuth();
//
// See the README for more details.

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id);
      else setRole(null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const fetchRole = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    setRole(data?.role || null);
  };

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      const user = (await supabase.auth.getUser()).data.user;
      setUser(user);
      if (user) fetchRole(user.id);
    }
    return error;
  };

  const signup = async (email, password, fullName, role = 'user') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        role,
      });
      setUser(data.user);
      setRole(role);
    }
    return error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 