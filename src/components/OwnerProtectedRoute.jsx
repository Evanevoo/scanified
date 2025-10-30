import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import MainLayout from './MainLayout';
import { Alert, Box } from '@mui/material';

const OwnerProtectedRoute = ({ children }) => {
  const { user, profile, organization, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <LoadingSpinner />;
  }

  // CRITICAL: Only platform owners can access owner portal
  if (profile.role !== 'owner') {
    return (
      <MainLayout profile={profile}>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Access denied. This page is only available to platform owners.
          </Alert>
        </Box>
      </MainLayout>
    );
  }

  // Platform owners don't need an organization
  return (
    <MainLayout profile={profile}>
      {children || <Outlet />}
    </MainLayout>
  );
};

export default OwnerProtectedRoute;
