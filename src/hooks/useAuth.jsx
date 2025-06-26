import { useEffect, useState, createContext, useContext, useMemo, useRef } from 'react';
import { supabase } from '../supabase/client';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Add debugging to track hook usage
  if (process.env.NODE_ENV === 'development') {
    console.log('useAuth hook called from:', new Error().stack?.split('\n')[2]?.trim() || 'unknown location');
  }
  
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const authListenerRef = useRef(null);
  const authFlowInProgressRef = useRef(false);
  const lastAuthStateRef = useRef(null);
  const previousSessionRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Only log initialization once
  useEffect(() => {
    if (!isInitialized) {
      console.log('useAuth hook initialized');
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    // Prevent multiple listeners
    if (authListenerRef.current) {
      return;
    }

    // This function handles the entire authentication flow from user to organization
    const loadUserAndProfile = async (sessionUser) => {
      // Prevent multiple auth flows from running simultaneously
      if (authFlowInProgressRef.current) {
        console.log('Auth: Auth flow already in progress, skipping...');
        return;
      }

      // Check if auth state hasn't actually changed
      const currentAuthState = sessionUser?.id;
      if (lastAuthStateRef.current === currentAuthState && user && profile && organization) {
        console.log('Auth: Auth state unchanged, skipping flow...');
        return;
      }

      // Additional check: if we have a valid session and user, don't restart
      if (sessionUser && user && sessionUser.id === user.id && profile && organization) {
        console.log('Auth: Valid session already exists, skipping restart...');
        return;
      }

      authFlowInProgressRef.current = true;
      lastAuthStateRef.current = currentAuthState;

      console.log('Auth: Starting auth flow for user:', sessionUser?.id);
      
      // If no user, reset everything
      if (!sessionUser) {
        setUser(null);
        setProfile(null);
        setOrganization(null);
        setLoading(false);
        console.log('Auth: No user, session cleared.');
        authFlowInProgressRef.current = false;
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
          authFlowInProgressRef.current = false;
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
            authFlowInProgressRef.current = false;
            return;
          }

          setOrganization(orgData);
          console.log('Auth: Organization loaded:', orgData);
          console.log('Auth: Organization logo_url:', orgData.logo_url);

          // Block access if trial expired
          if (orgData.subscription_status === 'trial' && orgData.trial_end_date) {
            const now = new Date();
            const trialEnd = new Date(orgData.trial_end_date);
            if (trialEnd < now) {
              setTrialExpired(true);
            } else {
              setTrialExpired(false);
            }
          } else {
            setTrialExpired(false);
          }
        } else {
          // No organization associated with this profile
          setOrganization(null);
          setTrialExpired(false);
          console.log('Auth: No organization linked to profile.');
        }
      } catch (e) {
        console.error("Auth: A critical error occurred during data fetching:", e);
        setProfile(null);
        setOrganization(null);
      } finally {
        // IMPORTANT: Ensure loading is set to false after all operations
        setLoading(false);
        authFlowInProgressRef.current = false;
        console.log('Auth: Auth flow finished.');
      }
    };

    // --- Auth Listener ---
    // Check for an existing session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoading(true);
      previousSessionRef.current = session;
      loadUserAndProfile(session?.user);
      isInitialLoadRef.current = false;
    });

    // Listen for changes in auth state (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Check if auth listeners are disabled during tab switch
        if (window.__authListenerDisabled) {
          console.log('Auth: Auth listener disabled during tab switch, ignoring event:', _event);
          return;
        }
        
        console.log(`Auth: Auth state changed, event: ${_event}`);
        
        // Skip if this is the initial load
        if (isInitialLoadRef.current) {
          console.log('Auth: Initial load, skipping auth state change');
          return;
        }
        
        // Check if this is a genuine auth state change or just a session refresh
        const currentSessionId = session?.user?.id;
        const previousSessionId = previousSessionRef.current?.user?.id;
        
        if (_event === 'SIGNED_IN' && currentSessionId === previousSessionId) {
          console.log('Auth: Session refresh detected, not a genuine sign-in event');
          return;
        }
        
        // Update the previous session reference
        previousSessionRef.current = session;
        
        setLoading(true);
        loadUserAndProfile(session?.user);
      }
    );

    // Store the listener reference
    authListenerRef.current = listener;

    // Cleanup the listener on component unmount
    return () => {
      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
        authListenerRef.current = null;
      }
    };
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    profile,
    organization,
    loading,
    trialExpired,
    signUp: async (email, password, name, organizationData = null) => {
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
    },
    signIn: async (email, password) => {
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
    },
    signOut: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },
    resetPassword: async (email) => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        return { error: null };
      } catch (error) {
        return { error };
      }
    },
    updatePassword: async (password) => {
      try {
        const { error } = await supabase.auth.updateUser({
          password,
        });
        if (error) throw error;
        return { error: null };
      } catch (error) {
        return { error };
      }
    },
    updateProfile: async (updates) => {
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
    },
    reloadOrganization: async () => {
      if (!profile?.organization_id) {
        console.log('reloadOrganization: No organization_id in profile');
        return;
      }
      try {
        console.log('reloadOrganization: Fetching organization with ID:', profile.organization_id);
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();
        
        if (orgError) {
          console.error('reloadOrganization: Error fetching organization:', orgError);
          return;
        }
        
        console.log('reloadOrganization: Organization data fetched:', orgData);
        console.log('reloadOrganization: Logo URL:', orgData.logo_url);
        setOrganization(orgData);
      } catch (e) {
        console.error('reloadOrganization: Exception:', e);
      }
    },
  }), [user, profile, organization, loading, trialExpired]);

  // Only log state changes when they actually change
  useEffect(() => {
    console.log('useAuth: Current state:', { user: user?.id, profile: !!profile, organization: !!organization, loading });
  }, [user?.id, profile, organization, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 