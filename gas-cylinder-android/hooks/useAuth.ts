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
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity
const SESSION_WARNING_MS = 2 * 60 * 1000; // Show warning 2 minutes before timeout

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

  // Reset timeout timers
  const resetTimeoutTimers = useCallback(() => {
    // Clear existing timers
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    // Only set timers if user is logged in
    if (user) {
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
  }, [user, handleSignOut]);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSessionTimeoutWarning(false);
    resetTimeoutTimers();
  }, [resetTimeoutTimers]);

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
        if (user && inactiveTime > SESSION_TIMEOUT_MS) {
          logger.warn('⚠️ Session expired while app was in background');
          handleSignOut();
        } else {
          // Reset activity and timers
          updateActivity();
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
  }, [user, handleSignOut, updateActivity]);

  // Initial auth check
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const getUser = async () => {
      try {
        timeoutId = setTimeout(() => {
          logger.warn('⚠️ Auth loading timeout - forcing completion');
          setLoading(false);
          setAuthError('Authentication timeout - please restart the app');
        }, 10000);

        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        setAuthError(null);
        
        if (session?.user) {
          updateActivity();
        }
      } catch (error) {
        logger.error('❌ Error getting session:', error);
        setUser(null);
        setAuthError('Authentication failed - please restart the app');
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
          if (session?.user && user && session.user.id === user.id) {
            updateActivity();
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
          updateActivity();
        } else {
          // Clear timers if no session
          if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
          if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        }
      } catch (error) {
        logger.error('❌ Error in auth state change:', error);
        setUser(null);
        setAuthError('Authentication state change failed');
      }
    });
    
    return () => {
      clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [updateActivity, user]);

  // Load profile and organization
  useEffect(() => {
    if (user) {
      setOrganizationLoading(true);
      
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data: profileData, error: profileError }) => {
          try {
            if (profileError) {
              logger.error('Error fetching profile:', profileError);
              setProfile(null);
              setOrganization(null);
              setOrganizationLoading(false);
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
                    logger.error('❌ Error in organization query:', error);
                    setOrganization(null);
                    setOrganizationLoading(false);
                  });
              } else {
                logger.log('Profile has no organization_id');
                setOrganization(null);
                setOrganizationLoading(false);
              }
            }
          } catch (error) {
            logger.error('❌ Error processing profile data:', error);
            setProfile(null);
            setOrganization(null);
            setOrganizationLoading(false);
          }
        })
        .catch(error => {
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
