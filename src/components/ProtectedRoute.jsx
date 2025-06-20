import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import MainLayout from './MainLayout';

const ProtectedRoute = () => {
  const { user, profile, organization, loading } = useAuth();

  // Log the state for debugging purposes.
  console.log('ProtectedRoute:', { loading, user: !!user, profile: !!profile, organization: !!organization });

  if (loading) {
    // Show a full-page loading spinner while auth state is being determined.
    return <LoadingSpinner />;
  }

  if (!user) {
    // If the user is not authenticated, redirect them to the login page.
    return <Navigate to="/login" replace />;
  }

  if (user && !profile) {
    // This can happen for a brief moment while the profile is loading.
    // Or if profile creation failed. Show loading spinner.
    console.log("ProtectedRoute: User exists but profile is not yet available. Waiting...");
    return <LoadingSpinner />;
  }

  if (user && profile && !organization) {
    // If the user is authenticated and has a profile but no organization,
    // they must complete the setup process.
    return <Navigate to="/setup" replace />;
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
  // This prevents the app from getting stuck on a blank page.
  console.warn("ProtectedRoute: Fallback triggered. Auth state is inconsistent. Redirecting to login.");
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute; 