import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

const PermissionsContext = createContext();

export function PermissionsProvider({ children }) {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  useEffect(() => {
    if (!profile) {
      setPermissions([]);
      setIsOrgAdmin(false);
      setLoading(false);
      return;
    }

    // Handle legacy role system (profile.role)
    if (profile.role === 'owner') {
      setPermissions(['*']);
      setIsOrgAdmin(true);
      setLoading(false);
      return;
    }

    // Handle legacy admin role
    if (profile.role === 'admin') {
      setPermissions(['*']);
      setIsOrgAdmin(true);
      setLoading(false);
      return;
    }

    // Handle new RBAC system (profile.role_id)
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
            setIsOrgAdmin(false);
          } else {
            setPermissions(data.permissions || []);
            if (data.name && data.name.toLowerCase() === 'admin') {
              setIsOrgAdmin(true);
            } else {
              setIsOrgAdmin(false);
            }
          }
          setLoading(false);
        });
    } else {
      // No role_id, check if there's a legacy role
      if (profile.role === 'manager') {
        setPermissions(['read:customers', 'write:customers', 'read:cylinders', 'write:cylinders', 'read:invoices', 'write:invoices']);
        setIsOrgAdmin(false);
      } else if (profile.role === 'user') {
        setPermissions(['read:customers', 'read:cylinders', 'read:invoices']);
        setIsOrgAdmin(false);
      } else {
        setPermissions([]);
        setIsOrgAdmin(false);
      }
      setLoading(false);
    }
  }, [profile]);

  const can = (permission) => {
    if (loading) return false;
    // Check for wildcard permission (admins have all permissions)
    if (permissions.includes('*')) return true;
    // Check for specific permission
    return permissions.includes(permission);
  };

  // Helper functions for role checking
  const isAdmin = () => {
    return profile?.role === 'admin' || profile?.role === 'owner';
  };

  const isManager = () => {
    return profile?.role === 'manager' || profile?.role === 'admin' || profile?.role === 'owner';
  };

  const isUser = () => {
    return profile?.role === 'user';
  };

  const hasRole = (role) => {
    return profile?.role === role;
  };

  const value = { permissions, can, loading, isOrgAdmin, isAdmin, isManager, isUser, hasRole };

  return (
    <PermissionsContext.Provider value={value}>
      {!loading && children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => {
  return useContext(PermissionsContext);
}; 