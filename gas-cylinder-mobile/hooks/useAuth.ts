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

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };
    getUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      // Get user profile first
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data: profileData, error: profileError }) => {
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            setProfile(null);
            setOrganization(null);
          } else if (profileData) {
            setProfile(profileData);
            
            // If profile has organization_id, fetch organization separately
            if (profileData.organization_id) {
              supabase
                .from('organizations')
                .select('*')
                .eq('id', profileData.organization_id)
                .maybeSingle()
                .then(({ data: orgData, error: orgError }) => {
                  if (orgError) {
                    console.error('Error fetching organization:', orgError);
                    setOrganization(null);
                  } else {
                    setOrganization(orgData);
                  }
                });
            } else {
              setOrganization(null);
            }
          }
        });
    } else {
      setProfile(null);
      setOrganization(null);
    }
  }, [user]);

  return { user, profile, organization, loading };
} 