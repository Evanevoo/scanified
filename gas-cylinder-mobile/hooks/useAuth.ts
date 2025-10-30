import logger from '../utils/logger';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  name?: string;
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
  trial_ends_at?: string;
  max_users: number;
  max_customers: number;
  max_cylinders: number;
  is_active: boolean;
  app_name?: string;
  primary_color?: string;
  secondary_color?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const getUser = async () => {
      try {
        // Add timeout protection to prevent infinite loading
        timeoutId = setTimeout(() => {
          logger.warn('⚠️ Auth loading timeout - forcing completion');
          setLoading(false);
          setAuthError('Authentication timeout - please restart the app');
        }, 10000); // 10 second timeout

        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        setAuthError(null);
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
        setUser(session?.user || null);
        setAuthError(null);
      } catch (error) {
        logger.error('❌ Error in auth state change:', error);
        setUser(null);
        setAuthError('Authentication state change failed');
      }
    });
    
    return () => {
      clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      setOrganizationLoading(true);
      // Get user profile first
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data: profileData, error: profileError }) => {
          try {
            if (profileError) {
              logger.error('Error fetching profile:', profileError);
              logger.log('User ID:', user.id);
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
              
              // If profile has organization_id, fetch organization separately
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
                        logger.log('Organization ID:', profileData.organization_id);
                        setOrganization(null);
                      } else {
                        logger.log('Organization loaded successfully:', {
                          id: orgData?.id,
                          name: orgData?.name,
                          slug: orgData?.slug,
                          app_name: orgData?.app_name,
                          subscription_status: orgData?.subscription_status,
                          primary_color: orgData?.primary_color,
                          secondary_color: orgData?.secondary_color
                        });
                        setOrganization(orgData);
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
    }
  }, [user]);

  return { user, profile, organization, loading, organizationLoading, authError };
} 