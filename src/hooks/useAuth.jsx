import { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '../supabase/client';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  console.log('useAuth hook initialized');

  useEffect(() => {
    // This function handles the entire authentication flow from user to organization
    const loadUserAndProfile = async (sessionUser) => {
      console.log('Auth: Starting auth flow for user:', sessionUser?.id);
      
      // If no user, reset everything
      if (!sessionUser) {
        setUser(null);
        setProfile(null);
        setOrganization(null);
        setLoading(false);
        console.log('Auth: No user, session cleared.');
        return;
      }

      setUser(sessionUser);

      try {
        // Step 1: Fetch the user's profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (profileError) {
          // Using PGRST116 (Not Found) to create a default profile is risky,
          // as a temporary network error could trigger a profile overwrite.
          // It's better to fail and log the error.
          console.error('Auth: Error fetching profile:', profileError);
          setProfile(null);
          setOrganization(null);
          // Don't throw here, just end the flow.
          return;
        }

        setProfile(profileData);
        console.log('Auth: Profile loaded:', profileData);

        // Step 2: If profile has an organization_id, fetch the organization
        if (profileData?.organization_id) {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profileData.organization_id)
            .single();

          if (orgError) {
            console.error('Auth: Error fetching organization:', orgError);
            setOrganization(null);
            return;
          }

          setOrganization(orgData);
          console.log('Auth: Organization loaded:', orgData);
        } else {
          // No organization associated with this profile
          setOrganization(null);
          console.log('Auth: No organization linked to profile.');
        }
      } catch (e) {
        console.error("Auth: A critical error occurred during data fetching:", e);
        setProfile(null);
        setOrganization(null);
      } finally {
        // IMPORTANT: Ensure loading is set to false after all operations
        setLoading(false);
        console.log('Auth: Auth flow finished.');
      }
    };

    // --- Auth Listener ---
    // Check for an existing session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoading(true);
      loadUserAndProfile(session?.user);
    });

    // Listen for changes in auth state (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log(`Auth: Auth state changed, event: ${_event}`);
        setLoading(true);
        loadUserAndProfile(session?.user);
      }
    );

    // Cleanup the listener on component unmount
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  console.log('useAuth: Current state:', { user: user?.id, profile: !!profile, organization: !!organization, loading });

  const signUp = async (email, password, name, organizationData = null) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) throw error;

      // If organization data is provided, create organization
      if (organizationData && data.user) {
        const { error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: organizationData.name,
            slug: organizationData.slug,
            subscription_status: 'trial',
            trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            max_users: 5,
            max_customers: 100,
            max_cylinders: 1000,
          });

        if (orgError) throw orgError;

        // Get the created organization
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', organizationData.slug)
          .single();

        // Update user profile with organization_id
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            organization_id: org.id,
            role: 'owner',
            name,
          })
          .eq('id', data.user.id);

        if (profileError) throw profileError;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updatePassword = async (password) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    profile,
    organization,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 