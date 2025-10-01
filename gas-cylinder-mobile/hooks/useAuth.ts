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
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationLoading, setOrganizationLoading] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('❌ Error getting session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    getUser();
    
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        setUser(session?.user || null);
      } catch (error) {
        console.error('❌ Error in auth state change:', error);
        setUser(null);
      }
    });
    return () => listener.subscription.unsubscribe();
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
              console.error('Error fetching profile:', profileError);
              console.log('User ID:', user.id);
              setProfile(null);
              setOrganization(null);
              setOrganizationLoading(false);
            } else if (profileData) {
              console.log('Profile loaded successfully:', {
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
                        console.error('Error fetching organization:', orgError);
                        console.log('Organization ID:', profileData.organization_id);
                        setOrganization(null);
                      } else {
                        console.log('Organization loaded successfully:', {
                          id: orgData?.id,
                          name: orgData?.name,
                          slug: orgData?.slug,
                          subscription_status: orgData?.subscription_status
                        });
                        setOrganization(orgData);
                      }
                    } catch (error) {
                      console.error('❌ Error processing organization data:', error);
                      setOrganization(null);
                    } finally {
                      setOrganizationLoading(false);
                    }
                  })
                  .catch(error => {
                    console.error('❌ Error in organization query:', error);
                    setOrganization(null);
                    setOrganizationLoading(false);
                  });
              } else {
                console.log('Profile has no organization_id');
                setOrganization(null);
                setOrganizationLoading(false);
              }
            }
          } catch (error) {
            console.error('❌ Error processing profile data:', error);
            setProfile(null);
            setOrganization(null);
            setOrganizationLoading(false);
          }
        })
        .catch(error => {
          console.error('❌ Error in profile query:', error);
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

  return { user, profile, organization, loading, organizationLoading };
} 