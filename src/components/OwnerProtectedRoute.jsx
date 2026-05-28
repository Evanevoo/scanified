import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOwnerAccess } from '../hooks/useOwnerAccess';
import { roleDisplayName } from '../constants/roles';
import LoadingSpinner from './LoadingSpinner';
import { Alert, Box } from '@mui/material';

const OwnerProtectedRoute = ({ children }) => {
  const { user, profile, loading } = useAuth();
  const { isOwner, loading: ownerAccessLoading } = useOwnerAccess(profile);

  if (loading || ownerAccessLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <LoadingSpinner />;
  }

  if (!isOwner) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only for Scanified platform owners (`owner`), not tenant account owners (`orgowner`).
          Your role: {roleDisplayName(profile?.role)}.
        </Alert>
      </Box>
    );
  }

  // MainLayout is provided by parent ProtectedRoute — do not nest another shell here
  return children || <Outlet />;
};

export default OwnerProtectedRoute;
