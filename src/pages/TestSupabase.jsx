import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { supabase } from '../supabase/client';

export default function TestSupabase() {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testSimpleQuery = async () => {
    setLoading(true);
    try {
      console.log('Testing simple query...');
      
      // Test 1: Simple select without joins
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', '8eea1b8f-a9e4-4f03-99a1-224dc5738a88')
        .single();
      
      console.log('Simple query result:', { data, error });
      
      if (error) {
        setTestResult({ success: false, error: error.message, data: null });
      } else {
        setTestResult({ success: true, error: null, data });
      }
    } catch (err) {
      console.error('Exception in test:', err);
      setTestResult({ success: false, error: err.message, data: null });
    } finally {
      setLoading(false);
    }
  };

  const testOrganizationQuery = async () => {
    setLoading(true);
    try {
      console.log('Testing organization query...');
      
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', 'lessannoyingscan')
        .single();
      
      console.log('Organization query result:', { data, error });
      
      if (error) {
        setTestResult({ success: false, error: error.message, data: null });
      } else {
        setTestResult({ success: true, error: null, data });
      }
    } catch (err) {
      console.error('Exception in organization test:', err);
      setTestResult({ success: false, error: err.message, data: null });
    } finally {
      setLoading(false);
    }
  };

  const testUseAuthQuery = async () => {
    setLoading(true);
    try {
      console.log('Testing useAuth query (separate queries)...');
      
      // First fetch the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', '8eea1b8f-a9e4-4f03-99a1-224dc5738a88')
        .single();
      
      console.log('Profile fetch result:', { profileData, profileError });
      
      if (profileError) {
        throw new Error(`Profile fetch failed: ${profileError.message}`);
      }
      
      // If profile has organization_id, fetch the organization
      if (profileData?.organization_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profileData.organization_id)
          .single();
        
        console.log('Organization fetch result:', { orgData, orgError });
        
        if (orgError) {
          throw new Error(`Organization fetch failed: ${orgError.message}`);
        }
        
        setTestResult({
          success: true,
          error: null,
          data: { profile: profileData, organization: orgData }
        });
      } else {
        setTestResult({
          success: true,
          error: null,
          data: { profile: profileData, organization: null }
        });
      }
    } catch (err) {
      console.error('Exception in useAuth test:', err);
      setTestResult({ success: false, error: err.message, data: null });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Supabase Connection Test
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={testSimpleQuery}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          Test Profile Query
        </Button>
        <Button 
          variant="outlined" 
          onClick={testOrganizationQuery}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          Test Organization Query
        </Button>
        <Button 
          variant="outlined" 
          onClick={testUseAuthQuery}
          disabled={loading}
          color="secondary"
        >
          Test useAuth Query
        </Button>
      </Box>

      {loading && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography>Loading...</Typography>
        </Paper>
      )}

      {testResult && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Test Result
          </Typography>
          <Typography color={testResult.success ? 'success.main' : 'error.main'}>
            Status: {testResult.success ? 'Success' : 'Failed'}
          </Typography>
          {testResult.error && (
            <Typography color="error.main" sx={{ mt: 1 }}>
              Error: {testResult.error}
            </Typography>
          )}
          {testResult.data && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Data:</Typography>
              <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </Box>
          )}
        </Paper>
      )}

      <Box sx={{ mt: 3 }}>
        <Button 
          variant="outlined" 
          onClick={() => window.location.href = '/debug'}
        >
          Back to Debug
        </Button>
      </Box>
    </Box>
  );
} 