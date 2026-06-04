import logger from '../utils/logger';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import { Alert, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { isPlatformOwnerProfile, normalizeRoleKey, ROLE_ORG_OWNER } from '../constants/roles';

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, profile, loading, organization } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <LoadingSpinner />;
  }

  const userRole = normalizeRoleKey(profile.role);

  // Scanified platform owner is not a tenant orgowner — use /owner-portal
  if (isPlatformOwnerProfile(profile)) {
    return <Navigate to="/owner-portal" replace />;
  }

  // Tenant account owner (orgowner) gets same access as admin when routes allow admin
  const hasAccess =
    allowedRoles.some((role) => normalizeRoleKey(role) === userRole) ||
    (userRole === ROLE_ORG_OWNER && allowedRoles.some((role) => normalizeRoleKey(role) === 'admin'));
  if (typeof window !== 'undefined') {
    window.__lastRoleProtectedRoute = {
      path: window.location.pathname,
      allowedRoles,
      hasAccess,
      userRole,
    };
  }

  // Debug logging (development only)
  if (import.meta.env.DEV) {
    logger.log('RoleProtectedRoute Debug:', {
      userRole,
      allowedRoles,
      profileRole: profile.role,
      hasAccess,
      location: window.location.pathname
    });
  }

  if (!hasAccess) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        p: 3
      }}>
        <Alert severity="error" sx={{ maxWidth: 500, width: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body2" paragraph>
            You don't have permission to access this page. This feature requires one of the following roles: {allowedRoles.join(', ')}.
          </Typography>
          <Typography variant="body2" paragraph>
            Your current role: <strong>{profile.role}</strong>
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/home')}
            sx={{ mt: 2 }}
          >
            Go to Dashboard
          </Button>
        </Alert>
      </Box>
    );
  }

  return children;
};

export default RoleProtectedRoute;
