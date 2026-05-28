import logger from '../utils/logger';
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth.jsx';
import { supabase } from '../supabase/client';
import {
  isPlatformOwnerProfile,
  isTenantOrgAdminProfile,
} from '../constants/roles';

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

    // Scanified platform owner — not a tenant org role
    if (isPlatformOwnerProfile(profile)) {
      setPermissions(['*']);
      setIsOrgAdmin(false);
      setLoading(false);
      return;
    }

    // Tenant account owner (e.g. WeldCor subscriber) — admin-level inside their org
    if (profile.role === 'orgowner') {
      setPermissions([
        'manage:users', 'manage:billing', 'manage:roles', 'manage:organization', 'manage:settings',
        'read:customers', 'write:customers', 'delete:customers',
        'read:cylinders', 'write:cylinders', 'delete:cylinders',
        'read:invoices', 'write:invoices', 'delete:invoices',
        'read:rentals', 'write:rentals', 'read:analytics', 'read:reports',
        'update:cylinder_location'
      ]);
      setIsOrgAdmin(true);
      setLoading(false);
      return;
    }

    // Legacy admin role
    if (profile.role === 'admin') {
      setPermissions([
        'manage:users', 'manage:billing', 'manage:roles', 'manage:organization', 'manage:settings',
        'read:customers', 'write:customers', 'delete:customers',
        'read:cylinders', 'write:cylinders', 'delete:cylinders',
        'read:invoices', 'write:invoices', 'delete:invoices',
        'read:rentals', 'write:rentals', 'read:analytics', 'read:reports',
        'update:cylinder_location'
      ]);
      setIsOrgAdmin(true);
      setLoading(false);
      return;
    }

    // Legacy manager role
    if (profile.role === 'manager') {
      setPermissions([
        'read:customers', 'write:customers',
        'read:cylinders', 'write:cylinders',
        'read:invoices', 'write:invoices',
        'read:rentals', 'write:rentals',
        'read:analytics', 'read:reports'
      ]);
      setIsOrgAdmin(false);
      setLoading(false);
      return;
    }

    // Legacy user role
    if (profile.role === 'user') {
      setPermissions([
        'read:customers', 'read:cylinders', 'read:invoices', 'read:rentals'
      ]);
      setIsOrgAdmin(false);
      setLoading(false);
      return;
    }

    // New RBAC system with role_id
    if (profile.role_id) {
      setLoading(true);
      supabase
        .from('roles')
        .select('name, permissions')
        .eq('id', profile.role_id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            logger.error('Error fetching role permissions:', error);
            setPermissions([]);
            setIsOrgAdmin(false);
          } else {
            setPermissions(data.permissions || []);
            // Check if the role is an 'Admin' role
            if (data.name && data.name.toLowerCase() === 'admin') {
              setIsOrgAdmin(true);
            } else {
              setIsOrgAdmin(false);
            }
          }
          setLoading(false);
        });
    } else {
      // Default permissions for unknown roles
      setPermissions([
        'read:customers', 'read:cylinders', 'read:invoices', 'read:rentals'
      ]);
      setIsOrgAdmin(false);
      setLoading(false);
    }
  }, [profile]);

  const can = (permission) => {
    if (permissions.includes('*')) {
      return true; // Owner can do anything
    }
    return permissions.includes(permission);
  };

  const hasRole = (role) => {
    if (isPlatformOwnerProfile(profile)) return true;
    if (profile?.role === role) return true;
    return false;
  };

  const isAdmin = () => isTenantOrgAdminProfile(profile) || isOrgAdmin;

  const isManager = () => {
    return profile?.role === 'manager' || isAdmin();
  };

  const isUser = () => {
    return profile?.role === 'user' || isManager();
  };

  return { 
    permissions, 
    can, 
    loading, 
    isOrgAdmin,
    hasRole,
    isAdmin,
    isManager,
    isUser
  };
} 