import logger from '../utils/logger';
import { useEffect, useState, createContext, useContext, useMemo, useRef } from 'react';
import { supabase } from '../supabase/client';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Track hook usage in development
  if (import.meta.env.DEV) {
    logger.log('useAuth hook called from:', new Error().stack?.split('\n')[2]?.trim() || 'unknown location');
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

  // 2 hours inactivity auto-logout (increased from 15 minutes)
  const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;

  // Initialize hook once
  useEffect(() => {
    if (!isInitialized) {
      if (import.meta.env.DEV) {
        logger.log('useAuth hook initialized');
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
          logger.log('Auth: Auth flow already in progress, skipping...');
        }
        return;
      }

      // Check if auth state hasn't actually changed
      const currentAuthState = sessionUser?.id;
      if (lastAuthStateRef.current === currentAuthState && user && profile && organization) {
        if (import.meta.env.DEV) {
          logger.log('Auth: Auth state unchanged, skipping flow...');
        }
        return;
      }

      // Additional check: if we have a valid session and user, don't restart
      if (sessionUser && user && sessionUser.id === user.id && profile && organization) {
        if (import.meta.env.DEV) {
          logger.log('Auth: Valid session already exists, skipping restart...');
        }
        return;
      }

      authFlowInProgressRef.current = true;
      lastAuthStateRef.current = currentAuthState;

      if (import.meta.env.DEV) {
        logger.log('Auth: Starting auth flow for user:', sessionUser?.id);
      }
      
      // If no user, reset everything
      if (!sessionUser) {
        setUser(null);
        setProfile(null);
        setOrganization(null);
        setLoading(false);
        logger.log('Auth: No user, session cleared.');
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
            logger.log('Auth: Creating profile for new user...');
            
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
              logger.error('Auth: Failed to create profile:', insertError);
              setProfile(null);
              setOrganization(null);
              setLoading(false);
              authFlowInProgressRef.current = false;
              return;
            }
            
            profileData = newProfile;
          } else {
            // Other errors: log and clear state
            logger.error('Auth: Error loading profile:', profileError);
            setProfile(null);
            setOrganization(null);
            setLoading(false);
            authFlowInProgressRef.current = false;
            return;
          }
        }

        // Check if account is disabled
        if (profileData.is_active === false || profileData.disabled_at) {
          logger.error('Auth: User account is disabled');
          logger.log('Disabled reason:', profileData.disabled_reason);
          setProfile(null);
          setOrganization(null);
          setUser(null);
          setLoading(false);
          authFlowInProgressRef.current = false;
          
          // Sign out the user
          await supabase.auth.signOut();
          return;
        }

        setProfile(profileData);
        logger.log('Auth: Profile loaded successfully');

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
            logger.error('Auth: Organization has been deleted');
            // Clear organization but keep user and profile
            setOrganization(null);
            setLoading(false);
            authFlowInProgressRef.current = false;
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
            logger.error('Auth: Error fetching organization:', orgError);
            setOrganization(null);
          } else {
            setOrganization(orgData);
            logger.log('Auth: Organization loaded:', orgData);
            logger.log('Auth: Organization logo_url:', orgData.logo_url);

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
          logger.log('Auth: No organization linked to profile.');
        }
      } catch (e) {
        logger.error("Auth: A critical error occurred during data fetching:", e);
        setProfile(null);
        setOrganization(null);
      } finally {
        // IMPORTANT: Ensure loading is set to false after all operations
        setLoading(false);
        authFlowInProgressRef.current = false;
        logger.log('Auth: Auth flow finished.');
      }
    };

    // --- Auth Listener ---
    // Check for an existing session on initial load
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          logger.error('Auth: Error getting initial session:', error);
          setLoading(false);
          isInitialLoadRef.current = false;
          return;
        }
        
        logger.log('Auth: Initial session check:', session ? 'Session found' : 'No session');
        previousSessionRef.current = session;
        
        if (session?.user) {
          await loadUserAndProfile(session.user);
        } else {
          setLoading(false);
        }
      } catch (e) {
        logger.error('Auth: Error during initialization:', e);
        setLoading(false);
      } finally {
        isInitialLoadRef.current = false;
      }
    };
    
    initializeAuth();

    // Listen for changes in auth state (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Check if auth listeners are disabled during tab switch
        if (window.__authListenerDisabled) {
          logger.log('Auth: Auth listener disabled during tab switch, ignoring event:', _event);
          return;
        }
        
        logger.log(`Auth: Auth state changed, event: ${_event}`);
        
        // Skip if this is the initial load
        if (isInitialLoadRef.current) {
          logger.log('Auth: Initial load, skipping auth state change');
          return;
        }
        
        // Handle token refresh errors gracefully
        if (_event === 'TOKEN_REFRESHED') {
          logger.log('Auth: Token refreshed successfully');
          // Don't reload everything on token refresh - just update session reference
          previousSessionRef.current = session;
          return;
        }
        
        // Handle token refresh failures - try to recover
        if (_event === 'SIGNED_OUT' && session === null && user) {
          // Token refresh might have failed - try to get current session
          logger.warn('Auth: Signed out event but user exists, checking session...');
          try {
            const { data: { session: currentSession }, error } = await supabase.auth.getSession();
            if (currentSession && !error) {
              logger.log('Auth: Session still valid, ignoring sign out event');
              return;
            }
          } catch (e) {
            logger.error('Auth: Error checking session:', e);
          }
        }
        
        // Check if this is a genuine auth state change or just a session refresh
        const currentSessionId = session?.user?.id;
        const previousSessionId = previousSessionRef.current?.user?.id;
        
        // Handle different auth events
        if (_event === 'SIGNED_OUT') {
          // User was signed out - clear state
          logger.log('Auth: User signed out');
          setUser(null);
          setProfile(null);
          setOrganization(null);
          setLoading(false);
          previousSessionRef.current = null;
          return;
        }
        
        if (_event === 'SIGNED_IN' && currentSessionId === previousSessionId) {
          logger.log('Auth: Session refresh detected, not a genuine sign-in event');
          // Don't reload if we already have valid data
          if (user && profile && organization && user.id === currentSessionId) {
            logger.log('Auth: Already have valid session data, skipping reload');
            return;
          }
        }
        
        // Only reload if session actually changed
        if (currentSessionId && currentSessionId !== previousSessionId) {
          logger.log('Auth: Session changed, reloading user data');
          previousSessionRef.current = session;
          setLoading(true);
          loadUserAndProfile(session?.user);
        } else if (!session && previousSessionId) {
          // Session was lost
          logger.log('Auth: Session lost');
          setUser(null);
          setProfile(null);
          setOrganization(null);
          setLoading(false);
          previousSessionRef.current = null;
        } else {
          // Session refresh with same user - just update reference
          previousSessionRef.current = session;
        }
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
        logger.warn('Auto sign-out error (ignored):', e);
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
      // Only sign out on actual window close, not tab switches
      // pagehide can fire when switching tabs, so we only use beforeunload
      if (user) {
        safeSignOut();
      }
    };

    // Attach listeners only if user is logged in
    if (user) {
      activityEvents.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
      // Only use beforeunload - pagehide fires too often (tab switches, etc.)
      window.addEventListener('beforeunload', onUnload);
      resetInactivityTimer();
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      activityEvents.forEach((evt) => window.removeEventListener(evt, onActivity));
      window.removeEventListener('beforeunload', onUnload);
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
        logger.log('Auth: Starting sign out process...');
        
        // Clear local state immediately to prevent confusion
        setUser(null);
        setProfile(null);
        setOrganization(null);
        setLoading(true);
        
        // Clear session data and perform logout
        sessionStorage.setItem('skip_org_redirect_once', '1');
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          logger.error('Supabase signOut error:', error);
          throw error;
        }
        
        logger.log('Auth: Successfully signed out');
        
        // Navigate to login page
        window.location.href = '/login';
        
      } catch (error) {
        logger.error('Error signing out:', error);
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
        logger.log('reloadOrganization: No organization_id in profile');
        return;
      }
      try {
        logger.log('reloadOrganization: Fetching organization with ID:', profile.organization_id);
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .is('deleted_at', null) // Only fetch active (non-deleted) organizations
          .single();
        
        if (orgError) {
          logger.error('reloadOrganization: Error fetching organization:', orgError);
          return;
        }
        
        logger.log('reloadOrganization: Organization data fetched:', orgData);
        logger.log('reloadOrganization: Logo URL:', orgData.logo_url);
        setOrganization(orgData);
      } catch (e) {
        logger.error('reloadOrganization: Exception:', e);
      }
    },
    reloadUserData: async () => {
      try {
        logger.log('reloadUserData: Starting to reload user data...');
        
        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !currentUser) {
          logger.error('reloadUserData: Error getting user:', userError);
          return;
        }
        
        logger.log('reloadUserData: User found:', currentUser.email);
        
        // Reload profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (profileError) {
          logger.error('reloadUserData: Error loading profile:', profileError);
          return;
        }
        
        logger.log('reloadUserData: Profile loaded:', profileData);
        setProfile(profileData);
        
        // If profile has organization, reload it
        if (profileData?.organization_id) {
          logger.log('reloadUserData: Loading organization:', profileData.organization_id);
          
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profileData.organization_id)
            .is('deleted_at', null)
            .single();
          
          if (orgError) {
            logger.error('reloadUserData: Error loading organization:', orgError);
            setOrganization(null);
          } else {
            logger.log('reloadUserData: Organization loaded:', orgData.name);
            setOrganization(orgData);
          }
        } else {
          logger.log('reloadUserData: No organization linked to profile');
          setOrganization(null);
        }
        
        logger.log('✅ reloadUserData: Complete');
      } catch (e) {
        logger.error('reloadUserData: Exception:', e);
      }
    },
  }), [user, profile, organization, loading, trialExpired]);

  // Only log state changes when they actually change
  useEffect(() => {
    logger.log('useAuth: Current state:', { user: user?.id, profile: !!profile, organization: !!organization, loading });
  }, [user?.id, profile, organization, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 