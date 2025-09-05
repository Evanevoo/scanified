import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

const PermissionsContext = createContext();

export function PermissionsProvider({ children }) {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [actualRole, setActualRole] = useState(null);

  // Helper function to normalize role for case-insensitive comparison
  const normalizeRole = (role) => {
    if (!role) return '';
    return role.toLowerCase();
  };

  useEffect(() => {
    if (!profile) {
      setPermissions([]);
      setIsOrgAdmin(false);
      setActualRole(null);
      setLoading(false);
      return;
    }

    const resolveRoleAndPermissions = async () => {
      setLoading(true);
      let roleName = profile.role;

      // If role is a UUID (contains hyphens), fetch the role name
      if (profile.role && profile.role.includes('-')) {
        try {
          const { data: roleData, error } = await supabase
            .from('roles')
            .select('name, permissions')
            .eq('id', profile.role)
            .single();
          
          if (error) {
            console.error('Error fetching role from UUID:', error);
            // Fallback to default admin permissions if we can't resolve the role
            setActualRole('admin');
            setPermissions(['*']);
            setIsOrgAdmin(true);
            setLoading(false);
            return;
          } else {
            roleName = roleData.name;
            setActualRole(roleName);
            
            // If role has specific permissions, use them
            if (roleData.permissions && roleData.permissions.length > 0) {
              setPermissions(roleData.permissions);
              setIsOrgAdmin(normalizeRole(roleName) === 'admin');
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('Error in role resolution:', err);
          // Fallback to admin
          setActualRole('admin');
          setPermissions(['*']);
          setIsOrgAdmin(true);
          setLoading(false);
          return;
        }
      } else {
        // Role is already a name
        setActualRole(roleName);
      }

      const userRole = normalizeRole(roleName);

      // Handle legacy role system (profile.role) - case insensitive
      if (userRole === 'owner') {
        setPermissions(['*']);
        setIsOrgAdmin(true);
        setLoading(false);
        return;
      }

      // Handle legacy admin role - case insensitive
      if (userRole === 'admin') {
        setPermissions(['*']);
        setIsOrgAdmin(true);
        setLoading(false);
        return;
      }

      // No role_id, check if there's a legacy role - case insensitive
      if (userRole === 'manager') {
        setPermissions(['read:customers', 'write:customers', 'read:cylinders', 'write:cylinders', 'read:invoices', 'write:invoices']);
        setIsOrgAdmin(false);
      } else if (userRole === 'user') {
        setPermissions(['read:customers', 'read:cylinders', 'read:invoices']);
        setIsOrgAdmin(false);
      } else {
        setPermissions([]);
        setIsOrgAdmin(false);
      }
      setLoading(false);
    };

    resolveRoleAndPermissions();
  }, [profile]);

  const can = (permission) => {
    if (loading) return false;
    // Check for wildcard permission (admins have all permissions)
    if (permissions.includes('*')) return true;
    // Check for specific permission
    return permissions.includes(permission);
  };

  // Helper functions for role checking - case insensitive
  const isAdmin = () => {
    const userRole = normalizeRole(actualRole);
    return userRole === 'admin' || userRole === 'owner';
  };

  const isManager = () => {
    const userRole = normalizeRole(actualRole);
    return userRole === 'manager' || userRole === 'admin' || userRole === 'owner';
  };

  const isUser = () => {
    const userRole = normalizeRole(actualRole);
    return userRole === 'user';
  };

  const hasRole = (role) => {
    return normalizeRole(actualRole) === normalizeRole(role);
  };

  const value = { permissions, can, loading, isOrgAdmin, isAdmin, isManager, isUser, hasRole, actualRole };

  return (
    <PermissionsContext.Provider value={value}>
      {!loading && children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => {
  return useContext(PermissionsContext);
};