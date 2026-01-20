import logger from '../utils/logger';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  role?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  trial_end_date?: string;
  trial_ends_at?: string;
  max_users: number;
  max_customers: number;
  max_cylinders: number;
  is_active: boolean;
  app_name?: string;
  primary_color?: string;
  secondary_color?: string;
  deleted_at?: string | null;
}

// Session timeout settings
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes of inactivity (increased from 15)
const SESSION_WARNING_MS = 5 * 60 * 1000; // Show warning 5 minutes before timeout

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [sessionTimeoutWarning, setSessionTimeoutWarning] = useState(false);
  
  // Refs for session timeout management
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const updateActivityRef = useRef<() => void>();
  const userRef = useRef<User | null>(null); // Track user in ref to avoid circular deps

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Sign out function
  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setOrganization(null);
      setSessionTimeoutWarning(false);
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  }, []);

  // Reset timeout timers - uses ref to avoid circular dependencies
  const resetTimeoutTimers = useCallback(() => {
    // Clear existing timers
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    // Only set timers if user is logged in (use ref to avoid dep cycle)
    if (userRef.current) {
      // Set warning timer
      warningTimerRef.current = setTimeout(() => {
        setSessionTimeoutWarning(true);
        logger.warn('⚠️ Session timeout warning - user inactive');
      }, SESSION_TIMEOUT_MS - SESSION_WARNING_MS);

      // Set logout timer
      timeoutTimerRef.current = setTimeout(() => {
        logger.warn('⚠️ Session timeout - signing out due to inactivity');
        handleSignOut();
      }, SESSION_TIMEOUT_MS);
    }
  }, [handleSignOut]); // Removed user from deps - using userRef instead

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    try {
      lastActivityRef.current = Date.now();
      setSessionTimeoutWarning(false);
      resetTimeoutTimers();
    } catch (error) {
      // Don't crash if activity update fails
      logger.warn('Error updating activity:', error);
    }
  }, [resetTimeoutTimers]);

  // Store latest updateActivity in ref to avoid dependency issues
  useEffect(() => {
    updateActivityRef.current = updateActivity;
  }, [updateActivity]);

  // Check trial expiration
  const checkTrialExpiration = useCallback((org: Organization) => {
    const trialEndDate = org.trial_end_date || org.trial_ends_at;
    
    if (org.subscription_status === 'trial' && trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(trialEndDate);
      const diffMs = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMs < 0) {
        setTrialExpired(true);
        setTrialDaysRemaining(0);
        logger.warn('⚠️ Trial has expired for organization:', org.name);
      } else {
        setTrialExpired(false);
        setTrialDaysRemaining(diffDays);
        
        if (diffDays <= 3) {
          logger.warn(`⚠️ Trial ending soon: ${diffDays} days remaining`);
        }
      }
    } else {
      setTrialExpired(false);
      setTrialDaysRemaining(null);
    }
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current === 'background' && nextAppState === 'active') {
        // App came to foreground - check if session should be timed out
        const inactiveTime = Date.now() - lastActivityRef.current;
        if (userRef.current && inactiveTime > SESSION_TIMEOUT_MS) {
          // Only log out if inactive for more than timeout period
          logger.warn(`⚠️ Session expired while app was in background (inactive: ${Math.round(inactiveTime / 60000)} minutes)`);
          handleSignOut();
        } else if (userRef.current) {
          // Reset activity and timers - user is back, extend session
          logger.log('📱 App resumed - extending session');
          updateActivityRef.current?.();
        }
      } else if (nextAppState === 'background') {
        // App going to background - clear timers to save battery
        if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [handleSignOut]); // Removed user and updateActivity from dependencies to prevent infinite loop

  // Initial auth check
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const getUser = async () => {
      try {
        timeoutId = setTimeout(() => {
          logger.warn('⚠️ Auth loading timeout - forcing completion');
          setLoading(false);
          setAuthError('Authentication timeout - please restart the app');
        }, 15000); // 15 second timeout

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logger.error('❌ Error getting session:', sessionError);
          // Don't log out on session fetch errors - might be temporary network issue
          // Only set error if it's a critical failure
          if (sessionError.message?.includes('JWT') || sessionError.message?.includes('expired')) {
            setAuthError('Session expired - please log in again');
            setUser(null);
          } else {
            // Temporary error - keep user logged in if we have a cached session
            logger.warn('⚠️ Session fetch error, but keeping user logged in:', sessionError.message);
          }
        } else {
          setUser(session?.user || null);
          setAuthError(null);
          
          if (session?.user) {
            updateActivityRef.current?.();
          }
        }
      } catch (error) {
        logger.error('❌ Error getting session:', error);
        // Don't automatically log out on errors - might be network issues
        // Only clear user if it's a critical auth error
        if (error instanceof Error && (error.message?.includes('JWT') || error.message?.includes('token'))) {
          setAuthError('Authentication failed - please log in again');
          setUser(null);
        } else {
          logger.warn('⚠️ Non-critical session error, keeping user logged in');
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };
    
    getUser();
    
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        // Skip token refresh events - these don't indicate a sign-out
        if (_event === 'TOKEN_REFRESHED') {
          logger.log('Auth: Token refreshed, maintaining session');
          // Update activity on token refresh to keep session alive
          if (session?.user && userRef.current && session.user.id === userRef.current.id) {
            updateActivityRef.current?.();
            return; // Same user, just token refresh
          }
        }
        
        // Only treat as sign-out if event is explicitly SIGNED_OUT
        if (_event === 'SIGNED_OUT') {
          logger.log('Auth: User signed out');
          setUser(null);
          setProfile(null);
          setOrganization(null);
          setSessionTimeoutWarning(false);
          // Clear timers on logout
          if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
          if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
          return;
        }
        
        setUser(session?.user || null);
        setAuthError(null);
        
        if (session?.user) {
          updateActivityRef.current?.();
        } else {
          // Clear timers if no session
          if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
          if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        }
      } catch (error: any) {
        logger.error('❌ Error in auth state change:', error);
        // Don't log out on errors - might be temporary network issues
        // Only set error if it's a critical auth failure
        if (error?.message?.includes('JWT') || error?.message?.includes('token')) {
          logger.warn('⚠️ Token error detected, but not logging out - may be temporary');
        }
        // Don't set user to null on errors - keep user logged in
        // Don't crash the app - just log the error
        try {
          // setAuthError('Authentication state change failed');
        } catch (e) {
          // Silently handle any errors
        }
      }
    });
    
    return () => {
      clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []); // Empty deps - only run once on mount, use refs inside callback to avoid stale closures

  // Load profile and organization
  useEffect(() => {
    let isMounted = true;
    let orgTimeoutId: NodeJS.Timeout;
    
    if (user) {
      setOrganizationLoading(true);
      
      // Add timeout protection for organization loading
      orgTimeoutId = setTimeout(() => {
        if (isMounted) {
          logger.warn('⚠️ Organization loading timeout - forcing completion');
          setOrganizationLoading(false);
          setAuthError('Loading organization data timed out. Please try logging in again.');
        }
      }, 20000); // 20 second timeout
      
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data: profileData, error: profileError }) => {
          if (!isMounted) return;
          
          try {
            if (profileError) {
              logger.error('Error fetching profile:', profileError);
              setProfile(null);
              setOrganization(null);
              setOrganizationLoading(false);
              clearTimeout(orgTimeoutId);
            } else if (profileData) {
              logger.log('Profile loaded successfully:', {
                id: profileData.id,
                email: profileData.email,
                organization_id: profileData.organization_id,
                role: profileData.role
              });
              setProfile(profileData);
              
              if (profileData.organization_id) {
                supabase
                  .from('organizations')
                  .select('*')
                  .eq('id', profileData.organization_id)
                  .maybeSingle()
                  .then(({ data: orgData, error: orgError }) => {
                    if (!isMounted) return;
                    clearTimeout(orgTimeoutId);
                    
                    try {
                      if (orgError) {
                        logger.error('Error fetching organization:', orgError);
                        setOrganization(null);
                      } else if (orgData) {
                        if (orgData.deleted_at) {
                          logger.error('❌ Organization is DELETED!');
                          setOrganization(null);
                          setAuthError('Your organization has been deleted. Please contact your administrator.');
                        } else {
                          logger.log('Organization loaded successfully:', orgData.name);
                          setOrganization(orgData);
                          checkTrialExpiration(orgData);
                        }
                      } else {
                        logger.error('Organization not found');
                        setOrganization(null);
                      }
                    } catch (error) {
                      logger.error('❌ Error processing organization data:', error);
                      setOrganization(null);
                    } finally {
                      setOrganizationLoading(false);
                    }
                  })
                  .catch(error => {
                    if (!isMounted) return;
                    clearTimeout(orgTimeoutId);
                    logger.error('❌ Error in organization query:', error);
                    setOrganization(null);
                    setOrganizationLoading(false);
                  });
              } else {
                clearTimeout(orgTimeoutId);
                logger.log('Profile has no organization_id');
                setOrganization(null);
                setOrganizationLoading(false);
              }
            }
          } catch (error) {
            if (!isMounted) return;
            clearTimeout(orgTimeoutId);
            logger.error('❌ Error processing profile data:', error);
            setProfile(null);
            setOrganization(null);
            setOrganizationLoading(false);
          }
        })
        .catch(error => {
          if (!isMounted) return;
          clearTimeout(orgTimeoutId);
          logger.error('❌ Error in profile query:', error);
          setProfile(null);
          setOrganization(null);
          setOrganizationLoading(false);
        });
    } else {
      setProfile(null);
      setOrganization(null);
      setOrganizationLoading(false);
      setTrialExpired(false);
      setTrialDaysRemaining(null);
    }
    
    return () => {
      isMounted = false;
      clearTimeout(orgTimeoutId);
    };
  }, [user, checkTrialExpiration]);

  return { 
    user, 
    profile, 
    organization, 
    loading, 
    organizationLoading, 
    authError,
    trialExpired,
    trialDaysRemaining,
    sessionTimeoutWarning,
    updateActivity, // Expose for components to call on user interaction
    signOut: handleSignOut
  };
}
