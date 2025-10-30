import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import { Alert, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, profile, loading } = useAuth();
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
  const hasAccess = allowedRoles.some(role => normalizeRole(role) === userRole);

  // Debug logging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('RoleProtectedRoute Debug:', {
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
            onClick={() => navigate('/dashboard')}
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
