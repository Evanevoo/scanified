import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import MainLayout from './MainLayout';
import { Alert, Box } from '@mui/material';

const ProtectedRoute = () => {
  const { user, profile, organization, loading, trialExpired } = useAuth();
  const location = useLocation();

  // Log the state for debugging purposes.
  console.log('ProtectedRoute:', { 
    loading, 
    user: !!user, 
    profile: !!profile, 
    organization: !!organization,
    profileRole: profile?.role,
    organizationId: profile?.organization_id
  });

  if (loading) {
    // Show a full-page loading spinner while auth state is being determined.
    return <LoadingSpinner />;
  }

  if (!user) {
    // If the user is not authenticated, redirect them to the login page.
    return <Navigate to="/login" replace />;
  }

  if (trialExpired) {
    return (
      <Box sx={{ p: 6 }}>
        <Alert severity="error">
          Your trial has expired. Please contact support or upgrade to a paid plan to regain access.
        </Alert>
      </Box>
    );
  }

  if (user && !profile) {
    // This can happen for a brief moment while the profile is loading.
    // Or if profile creation failed. Show loading spinner.
    console.log("ProtectedRoute: User exists but profile is not yet available. Waiting...");
    return <LoadingSpinner />;
  }

  if (user && profile && !organization) {
    // Allow access to organization registration page
    if (location.pathname === '/organization-registration') {
      return <Outlet />;
    }
    // Otherwise, show the error message
    return (
      <Box sx={{ p: 6 }}>
        <Alert severity="error">
          Your organization could not be found or was deleted.<br />
          Please contact support or create a new organization.<br />
          <br />
          <a href="/organization-registration">Create a new organization</a>
        </Alert>
      </Box>
    );
  }

  if (user && profile && organization) {
    // If the user is fully authenticated and has an organization,
    // render the requested page within the main layout, passing the profile.
    return (
      <MainLayout profile={profile}>
        <Outlet />
      </MainLayout>
    );
  }

  // As a fallback, if the state is somehow inconsistent, redirect to login.
  console.warn("ProtectedRoute: Fallback triggered. Auth state is inconsistent. Redirecting to login.");
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute; 