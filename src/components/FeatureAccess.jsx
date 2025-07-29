import React from 'react';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../hooks/useAuth';
import { Box, Alert, Button, Typography, Paper } from '@mui/material';
import { Lock as LockIcon, AdminPanelSettings, ContactSupport } from '@mui/icons-material';

/**
 * FeatureAccess - Controls access to features based on user roles and permissions
 * 
 * Props:
 * - requiredPermission: string - Permission required to access the feature
 * - requiredRole: string - Role required to access the feature
 * - adminOnly: boolean - If true, only admins can access
 * - managerOnly: boolean - If true, only managers and above can access
 * - fallback: React.Component - Custom fallback component for unauthorized access
 * - children: React.Component - Content to show when access is granted
 */
export default function FeatureAccess({ 
  requiredPermission, 
  requiredRole, 
  adminOnly = false, 
  managerOnly = false,
  fallback = null,
  children 
}) {
  const { can, isAdmin, isManager, isUser, hasRole } = usePermissions();
  const { profile } = useAuth();

  // Check access based on different criteria
  const hasAccess = () => {
    // Owner always has access
    if (profile?.role === 'owner') return true;

    // Check admin only access
    if (adminOnly && !isAdmin()) return false;

    // Check manager only access
    if (managerOnly && !isManager()) return false;

    // Check specific role requirement
    if (requiredRole && !hasRole(requiredRole)) return false;

    // Check specific permission requirement
    if (requiredPermission && !can(requiredPermission)) return false;

    return true;
  };

  // If access is granted, show the content
  if (hasAccess()) {
    return <>{children}</>;
  }

  // If custom fallback is provided, use it
  if (fallback) {
    return fallback;
  }

  // Default access denied message
  const getAccessDeniedMessage = () => {
    if (adminOnly) {
      return {
        title: 'Administrator Access Required',
        message: 'This feature is only available to administrators.',
        icon: <AdminPanelSettings sx={{ fontSize: 48, color: 'warning.main' }} />
      };
    }

    if (managerOnly) {
      return {
        title: 'Manager Access Required',
        message: 'This feature is only available to managers and administrators.',
        icon: <AdminPanelSettings sx={{ fontSize: 48, color: 'info.main' }} />
      };
    }

    if (requiredRole) {
      return {
        title: 'Insufficient Permissions',
        message: `This feature requires ${requiredRole} role access.`,
        icon: <LockIcon sx={{ fontSize: 48, color: 'error.main' }} />
      };
    }

    if (requiredPermission) {
      return {
        title: 'Permission Required',
        message: `This feature requires '${requiredPermission}' permission.`,
        icon: <LockIcon sx={{ fontSize: 48, color: 'error.main' }} />
      };
    }

    return {
      title: 'Access Denied',
      message: 'You do not have permission to access this feature.',
      icon: <LockIcon sx={{ fontSize: 48, color: 'error.main' }} />
    };
  };

  const accessMessage = getAccessDeniedMessage();

  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
        <Box sx={{ mb: 3 }}>
          {accessMessage.icon}
        </Box>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          {accessMessage.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {accessMessage.message}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Current role: <strong>{profile?.role || 'Unknown'}</strong>
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ContactSupport />}
          href="/support"
          sx={{ mt: 2 }}
        >
          Contact Support
        </Button>
      </Paper>
    </Box>
  );
}

/**
 * AdminOnly - Wrapper component for admin-only features
 */
export function AdminOnly({ children, fallback = null }) {
  return (
    <FeatureAccess adminOnly={true} fallback={fallback}>
      {children}
    </FeatureAccess>
  );
}

/**
 * ManagerOnly - Wrapper component for manager-only features
 */
export function ManagerOnly({ children, fallback = null }) {
  return (
    <FeatureAccess managerOnly={true} fallback={fallback}>
      {children}
    </FeatureAccess>
  );
}

/**
 * RequirePermission - Wrapper component for permission-based access
 */
export function RequirePermission({ permission, children, fallback = null }) {
  return (
    <FeatureAccess requiredPermission={permission} fallback={fallback}>
      {children}
    </FeatureAccess>
  );
}

/**
 * RequireRole - Wrapper component for role-based access
 */
export function RequireRole({ role, children, fallback = null }) {
  return (
    <FeatureAccess requiredRole={role} fallback={fallback}>
      {children}
    </FeatureAccess>
  );
} 