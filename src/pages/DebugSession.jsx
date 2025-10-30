import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Paper, Button, Alert } from '@mui/material';

/**
 * Debug Session Component
 * Only available in development environment
 * Provides session storage debugging capabilities
 */
export default function DebugSession() {
  const [sessionData, setSessionData] = useState({});

  useEffect(() => {
    checkSessionStorage();
  }, []);

  const checkSessionStorage = () => {
    const data = {
      sessionStorage: {
        pending_org_password: sessionStorage.getItem('pending_org_password'),
        pending_org_email: sessionStorage.getItem('pending_org_email'),
        verification_token: sessionStorage.getItem('verification_token'),
        skip_org_redirect_once: sessionStorage.getItem('skip_org_redirect_once'),
      },
      localStorage: {
        pending_org_password: localStorage.getItem('pending_org_password'),
        pending_org_email: localStorage.getItem('pending_org_email'),
        verification_token: localStorage.getItem('verification_token'),
        verification_expires: localStorage.getItem('verification_expires'),
        expiresAt: localStorage.getItem('verification_expires') ? 
          new Date(parseInt(localStorage.getItem('verification_expires'))).toISOString() : null,
        isExpired: localStorage.getItem('verification_expires') ? 
          Date.now() > parseInt(localStorage.getItem('verification_expires')) : null,
      }
    };
    setSessionData(data);
  };

  const clearSessionStorage = () => {
    sessionStorage.clear();
    localStorage.clear();
    checkSessionStorage();
  };

  const testStorage = () => {
    sessionStorage.setItem('test_key', 'test_value');
    checkSessionStorage();
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Session Storage Debug
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Current Session Storage:
          </Typography>
          <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Actions:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button variant="contained" onClick={checkSessionStorage}>
              Refresh
            </Button>
            <Button variant="outlined" onClick={testStorage}>
              Test Storage
            </Button>
            <Button variant="outlined" color="error" onClick={clearSessionStorage}>
              Clear All
            </Button>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Expected values for organization creation:</strong><br />
            • pending_org_password: Should contain the password<br />
            • pending_org_email: Should contain the email address<br />
            • verification_token: Should contain the verification token
          </Typography>
        </Alert>

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>If values are missing:</strong><br />
            • Session storage might be cleared by browser<br />
            • User might have navigated away from the page<br />
            • Browser might be in incognito/private mode<br />
            • Multiple tabs might be interfering
          </Typography>
        </Alert>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quick Links:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" href="/create-organization">
              Create Organization
            </Button>
            <Button variant="outlined" href="/verify-organization?token=test">
              Test Verify Page
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
