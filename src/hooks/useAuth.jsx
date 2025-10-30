import { useEffect, useState, createContext, useContext, useMemo, useRef } from 'react';
import { supabase } from '../supabase/client';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Track hook usage in development
  if (import.meta.env.DEV) {
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
  const inactivityTimerRef = useRef(null);

  // 15 minutes inactivity auto-logout
  const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

  // Initialize hook once
  useEffect(() => {
    if (!isInitialized) {
      if (import.meta.env.DEV) {
        console.log('useAuth hook initialized');
      }
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
        if (import.meta.env.DEV) {
          console.log('Auth: Auth flow already in progress, skipping...');
        }
        return;
      }

      // Check if auth state hasn't actually changed
      const currentAuthState = sessionUser?.id;
      if (lastAuthStateRef.current === currentAuthState && user && profile && organization) {
        if (import.meta.env.DEV) {
          console.log('Auth: Auth state unchanged, skipping flow...');
        }
        return;
      }

      // Additional check: if we have a valid session and user, don't restart
      if (sessionUser && user && sessionUser.id === user.id && profile && organization) {
        if (import.meta.env.DEV) {
          console.log('Auth: Valid session already exists, skipping restart...');
        }
        return;
      }

      authFlowInProgressRef.current = true;
      lastAuthStateRef.current = currentAuthState;

      if (import.meta.env.DEV) {
        console.log('Auth: Starting auth flow for user:', sessionUser?.id);
      }
      
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
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (profileError) {
          // If profile not found, auto-create it
          if (profileError.code === 'PGRST116') {
            console.log('Auth: Creating profile for new user...');
            
            // Determine default role
            const defaultRole = sessionUser.email?.endsWith('@yourcompany.com') ? 'admin' : 'user';
            
            // Insert a new profile with minimal info
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: sessionUser.id,
                email: sessionUser.email,
                full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || '',
                role: defaultRole,
              })
              .select()
              .single();
              
            if (insertError) {
              console.error('Auth: Failed to create profile:', insertError);
              setProfile(null);
              setOrganization(null);
              setLoading(false);
              authFlowInProgressRef.current = false;
              return;
            }
            
            profileData = newProfile;
          } else {
            // Other errors: log and clear state
            console.error('Auth: Error loading profile:', profileError);
            setProfile(null);
            setOrganization(null);
            setLoading(false);
            authFlowInProgressRef.current = false;
            return;
          }
        }

        // Check if account is disabled
        if (profileData.is_active === false || profileData.disabled_at) {
          console.error('Auth: User account is disabled');
          console.log('Disabled reason:', profileData.disabled_reason);
          setProfile(null);
          setOrganization(null);
          setUser(null);
          setLoading(false);
          authFlowInProgressRef.current = false;
          
          // Sign out the user
          await supabase.auth.signOut();
          
          // Redirect to a disabled account page with reason
          const reason = encodeURIComponent(profileData.disabled_reason || 'Your account has been disabled');
          window.location.href = `/account-disabled?reason=${reason}`;
          return;
        }

        setProfile(profileData);
        console.log('Auth: Profile loaded successfully');

        // Step 2: If profile has an organization_id, fetch the organization
        if (profileData?.organization_id) {
          // First check if organization is deleted
          const { data: orgCheck, error: orgCheckError } = await supabase
            .from('organizations')
            .select('id, name, deleted_at, deletion_reason')
            .eq('id', profileData.organization_id)
            .single();

          if (orgCheck && orgCheck.deleted_at) {
            // Organization has been deleted
            console.error('Auth: Organization has been deleted');
            setProfile(null);
            setOrganization(null);
            setUser(null);
            setLoading(false);
            authFlowInProgressRef.current = false;
            
            // Sign out the user
            await supabase.auth.signOut();
            
            // Redirect to deleted organization page
            const email = encodeURIComponent(user.email);
            const reason = encodeURIComponent(orgCheck.deletion_reason || 'Your organization has been removed');
            window.location.href = `/organization-deleted?email=${email}&reason=${reason}`;
            return;
          }

          // Fetch the active organization
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profileData.organization_id)
            .is('deleted_at', null) // Only fetch active (non-deleted) organizations
            .single();

          if (orgError) {
            console.error('Auth: Error fetching organization:', orgError);
            setOrganization(null);
          } else {
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

  // Auto-logout on window close and after inactivity
  useEffect(() => {
    // Helper to safely sign out without redirect loops
    const safeSignOut = () => {
      try {
        sessionStorage.setItem('skip_org_redirect_once', '1');
      } catch (e) {}
      try {
        // Fire and forget
        supabase.auth.signOut();
      } catch (e) {
        console.warn('Auto sign-out error (ignored):', e);
      }
    };

    const resetInactivityTimer = () => {
      if (!user) return; // Only track when logged in
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        safeSignOut();
        // Hard navigate to login to ensure clean state
        try { window.location.href = '/login'; } catch (e) {}
      }, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const onActivity = () => resetInactivityTimer();

    const onUnload = () => {
      if (user) {
        safeSignOut();
      }
    };

    // Attach listeners only if user is logged in
    if (user) {
      activityEvents.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
      window.addEventListener('beforeunload', onUnload);
      window.addEventListener('pagehide', onUnload);
      resetInactivityTimer();
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      activityEvents.forEach((evt) => window.removeEventListener(evt, onActivity));
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [user]);

  // Generate unique slug function
  const generateUniqueSlug = async (orgName) => {
    // Generate base slug from organization name
    let baseSlug = orgName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // If slug is empty, use a default
    if (!baseSlug) {
      baseSlug = 'organization';
    }
    
    let slug = baseSlug;
    let counter = 1;
    
    // Keep checking until we find a unique slug
    while (true) {
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (!existingOrg) {
        return slug; // Found unique slug
      }
      
      // Try with a number suffix
      slug = `${baseSlug}-${counter}`;
      counter++;
      
      // Prevent infinite loop
      if (counter > 100) {
        // Use timestamp as fallback
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }
    
    return slug;
  };

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
          // Generate unique slug
          const slug = await generateUniqueSlug(organizationData.name);
          
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: organizationData.name,
              slug: slug,
              subscription_status: 'trial',
              trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              max_users: 5,
              max_customers: 100,
              max_cylinders: 1000,
            })
            .select()
            .single();

          if (orgError) throw orgError;

          // Update user profile with organization_id
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              organization_id: orgData.id,
              role: 'admin',
              full_name: name,
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
        console.log('Auth: Starting sign out process...');
        
        // Clear local state immediately to prevent confusion
        setUser(null);
        setProfile(null);
        setOrganization(null);
        setLoading(true);
        
        // Clear session data and perform logout
        sessionStorage.setItem('skip_org_redirect_once', '1');
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error('Supabase signOut error:', error);
          throw error;
        }
        
        console.log('Auth: Successfully signed out');
        
        // Navigate to login page
        window.location.href = '/login';
        
      } catch (error) {
        console.error('Error signing out:', error);
        // Even if logout fails, clear local state and redirect
        setUser(null);
        setProfile(null);
        setOrganization(null);
        window.location.href = '/login';
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
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();
          
        if (error) throw error;
        
        // Update local state
        setProfile(data);
        
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
          .is('deleted_at', null) // Only fetch active (non-deleted) organizations
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
    reloadUserData: async () => {
      try {
        console.log('reloadUserData: Starting to reload user data...');
        
        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !currentUser) {
          console.error('reloadUserData: Error getting user:', userError);
          return;
        }
        
        console.log('reloadUserData: User found:', currentUser.email);
        
        // Reload profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (profileError) {
          console.error('reloadUserData: Error loading profile:', profileError);
          return;
        }
        
        console.log('reloadUserData: Profile loaded:', profileData);
        setProfile(profileData);
        
        // If profile has organization, reload it
        if (profileData?.organization_id) {
          console.log('reloadUserData: Loading organization:', profileData.organization_id);
          
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profileData.organization_id)
            .is('deleted_at', null)
            .single();
          
          if (orgError) {
            console.error('reloadUserData: Error loading organization:', orgError);
            setOrganization(null);
          } else {
            console.log('reloadUserData: Organization loaded:', orgData.name);
            setOrganization(orgData);
          }
        } else {
          console.log('reloadUserData: No organization linked to profile');
          setOrganization(null);
        }
        
        console.log('✅ reloadUserData: Complete');
      } catch (e) {
        console.error('reloadUserData: Exception:', e);
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