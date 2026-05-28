import logger from '../utils/logger';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import {
  isLegacyOwnerOnTenantProfile,
  isPlatformOwnerProfile,
  isTenantOrgAdminProfile,
  normalizeRoleKey,
  ROLE_ORG_OWNER,
  ROLE_PLATFORM_OWNER,
} from '../constants/roles';

const PermissionsContext = createContext({
  permissions: [],
  can: () => false,
  loading: true,
  isOrgAdmin: false,
  isAdmin: () => false,
  isManager: () => false,
  isUser: () => false,
  hasRole: () => false,
  actualRole: null
});

export function PermissionsProvider({ children }) {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [actualRole, setActualRole] = useState(null);

  const normalizeRole = normalizeRoleKey;

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
            logger.error('Error fetching role from UUID:', error);
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
          logger.error('Error in role resolution:', err);
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

      // Scanified platform owner — SaaS console; not a tenant org role
      if (userRole === ROLE_PLATFORM_OWNER && isPlatformOwnerProfile(profile)) {
        setPermissions(['*']);
        setIsOrgAdmin(false);
        setLoading(false);
        return;
      }

      if (isLegacyOwnerOnTenantProfile(profile)) {
        logger.warn(
          'Profile has role owner with organization_id; run migrate-owner-to-orgowner.sql to use orgowner'
        );
      }

      // Tenant account owner (e.g. WeldCor primary subscriber) — full access inside their org
      if (userRole === ROLE_ORG_OWNER) {
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
  /** Tenant organization admin (orgowner or admin) — not Scanified platform owner */
  const isAdmin = () => isTenantOrgAdminProfile({ role: actualRole, organization_id: profile?.organization_id });

  const isManager = () => {
    const userRole = normalizeRole(actualRole);
    return userRole === 'manager' || isAdmin();
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
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    // Fallback if context is not available (shouldn't happen, but safety check)
    logger.warn('usePermissions called outside PermissionsProvider, returning default values');
    return {
      permissions: [],
      can: () => false,
      loading: true,
      isOrgAdmin: false,
      isAdmin: () => false,
      isManager: () => false,
      isUser: () => false,
      hasRole: () => false,
      actualRole: null
    };
  }
  return context;
};