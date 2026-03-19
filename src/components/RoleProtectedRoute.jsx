import logger from '../utils/logger';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import { Alert, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

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

  // Normalize role comparison (case-insensitive)
  const normalizeRole = (role) => {
    if (!role) return '';
    return role.toLowerCase().trim();
  };

  const userRole = normalizeRole(profile.role);
  // Org owners (role 'orgowner') get same access as admin for role checks
  const hasAccess = allowedRoles.some(role => normalizeRole(role) === userRole)
    || (userRole === 'orgowner' && allowedRoles.some(role => normalizeRole(role) === 'admin'));
  if (typeof window !== 'undefined') {
    window.__lastRoleProtectedRoute = {
      path: window.location.pathname,
      allowedRoles,
      hasAccess,
      userRole,
    };
  }
  // #region agent log
  fetch('http://127.0.0.1:7716/ingest/af979272-15bb-4603-9fe5-a14af47582a2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c23505'},body:JSON.stringify({sessionId:'c23505',runId:'website-routes-pre-fix',hypothesisId:'W2',location:'src/components/RoleProtectedRoute.jsx:31',message:'RoleProtectedRoute evaluated',data:{path:window.location.pathname,userRole,allowedRoles,hasAccess},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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
