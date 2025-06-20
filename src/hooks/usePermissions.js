import { useEffect, useState } from 'react';
import { useAuth } from './useAuth.jsx';
import { supabase } from '../supabase/client';

export function usePermissions() {
  const { user, profile } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    // The top-level 'owner' has all permissions implicitly
    if (profile.role === 'owner') {
      setPermissions(['*']); // Using '*' to signify all permissions
      setIsOrgAdmin(true); // Owner is also an admin
      setLoading(false);
      return;
    }

    if (profile.role_id) {
      setLoading(true);
      supabase
        .from('roles')
        .select('name, permissions')
        .eq('id', profile.role_id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching role permissions:', error);
            setPermissions([]);
          } else {
            setPermissions(data.permissions || []);
            // Check if the role is an 'Admin' role
            if (data.name.toLowerCase() === 'admin') {
              setIsOrgAdmin(true);
            }
          }
          setLoading(false);
        });
    } else {
      setPermissions([]);
      setLoading(false);
    }
  }, [profile]);

  const can = (permission) => {
    if (permissions.includes('*')) {
      return true; // Owner can do anything
    }
    return permissions.includes(permission);
  };

  return { permissions, can, loading, isOrgAdmin };
} 