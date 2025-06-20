import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

export default function DebugAuth() {
  const { user, profile, organization, loading } = useAuth();

  const isAuthenticated = !!user;
  const needsOrganizationSetup = isAuthenticated && !organization;

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Authentication Debug
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Loading State
        </Typography>
        <Typography>Loading: {loading ? 'Yes' : 'No'}</Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Authentication State
        </Typography>
        <Typography>Is Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Typography>
        <Typography>User ID: {user?.id || 'None'}</Typography>
        <Typography>User Email: {user?.email || 'None'}</Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profile Data
        </Typography>
        <Typography>Profile: {profile ? 'Loaded' : 'Not Loaded'}</Typography>
        {profile && (
          <>
            <Typography>Profile ID: {profile.id}</Typography>
            <Typography>Profile Email: {profile.email}</Typography>
            <Typography>Profile Name: {profile.full_name}</Typography>
            <Typography>Profile Role: {profile.role}</Typography>
            <Typography>Organization ID: {profile.organization_id || 'None'}</Typography>
          </>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Organization Data
        </Typography>
        <Typography>Organization: {organization ? 'Loaded' : 'Not Loaded'}</Typography>
        {organization && (
          <>
            <Typography>Organization ID: {organization.id}</Typography>
            <Typography>Organization Name: {organization.name}</Typography>
            <Typography>Organization Slug: {organization.slug}</Typography>
            <Typography>Subscription Status: {organization.subscription_status}</Typography>
          </>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Routing Logic
        </Typography>
        <Typography>Needs Organization Setup: {needsOrganizationSetup ? 'Yes' : 'No'}</Typography>
        <Typography>Would redirect to: {needsOrganizationSetup ? '/setup' : '/home'}</Typography>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Button 
          variant="contained" 
          onClick={() => window.location.href = '/owner-dashboard'}
          sx={{ mr: 2 }}
        >
          Try Owner Dashboard
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => window.location.href = '/'}
        >
          Go to Landing Page
        </Button>
      </Box>
    </Box>
  );
} 