import logger from '../../utils/logger';
import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

export default function DebugAuth() {
  const { user, profile, organization, loading } = useAuth();
  const navigate = useNavigate();

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
            <Typography>Logo URL: {organization.logo_url || 'No logo URL'}</Typography>
            <Typography>Logo URL Type: {typeof organization.logo_url}</Typography>
            <Typography>All Organization Fields: {JSON.stringify(organization, null, 2)}</Typography>
          </>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Logo Upload
        </Typography>
        <Button 
          variant="contained" 
          onClick={async () => {
            try {
              // Test if we can update the organization
              const { data, error } = await supabase
                .from('organizations')
                .update({ logo_url: 'https://via.placeholder.com/40x40/blue/white?text=TEST' })
                .eq('id', organization?.id)
                .select();
              
              if (error) {
                logger.error('Test update error:', error);
                alert('Error updating organization: ' + error.message);
              } else {
                logger.log('Test update success:', data);
                alert('Test logo URL updated successfully! Check the sidebar.');
              }
            } catch (err) {
              logger.error('Test error:', err);
              alert('Test failed: ' + err.message);
            }
          }}
          sx={{ mr: 2 }}
        >
          Test Logo URL Update
        </Button>
        <Button 
          variant="outlined" 
          onClick={async () => {
            try {
              // Test if logo_url column exists
              const { data, error } = await supabase
                .from('organizations')
                .select('logo_url')
                .limit(1);
              
              if (error) {
                logger.error('Column test error:', error);
                alert('Error testing column: ' + error.message);
              } else {
                logger.log('Column test success:', data);
                alert('logo_url column exists! Data: ' + JSON.stringify(data));
              }
            } catch (err) {
              logger.error('Column test error:', err);
              alert('Column test failed: ' + err.message);
            }
          }}
        >
          Test Logo URL Column
        </Button>
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
          onClick={() => navigate('/owner-dashboard')}
          sx={{ mr: 2 }}
        >
          Try Owner Dashboard
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/')}
        >
          Go to Landing Page
        </Button>
      </Box>
    </Box>
  );
} 