import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Divider
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';

export default function EmailTest() {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [success, setSuccess] = useState('');

  React.useEffect(() => {
    setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  }, []);

  const handleTestEmail = async () => {
    if (!testEmail) {
      setError('Please enter an email address');
      return;
    }

    if (isLocalhost) {
      setError('Email testing only works on deployed Netlify sites, not localhost. Please deploy your site first and test there.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('Testing email function...');
      const response = await fetch('/.netlify/functions/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        // Try to get error text if JSON parsing fails
        let errorMessage;
        try {
          const data = await response.json();
          errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (jsonError) {
          const textResponse = await response.text();
          errorMessage = `HTTP ${response.status}: ${response.statusText}. Response: ${textResponse || 'Empty response'}`;
        }
        setError(errorMessage);
        return;
      }

      // Try to parse JSON response
      let data;
      try {
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        setError(`Invalid response from server. Check if Netlify functions are deployed properly.`);
        return;
      }

      setResult(data);
    } catch (err) {
      console.error('Email test error:', err);
      setError(`Network error: ${err.message}. Make sure you're running on a deployed Netlify site, not localhost.`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestInvite = async () => {
    if (!testEmail) {
      setError('Please enter an email address');
      return;
    }

    if (isLocalhost) {
      setError('Email testing only works on deployed Netlify sites, not localhost. Please deploy your site first and test there.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('Testing invitation email function...');
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: 'Test Invitation Email',
          template: 'invite',
          data: {
            inviteLink: `${window.location.origin}/accept-invite?token=test-token`,
            organizationName: 'Test Organization',
            inviter: 'Test Admin'
          }
        })
      });

      console.log('Invite response status:', response.status);

      if (!response.ok) {
        // Try to get error text if JSON parsing fails
        let errorMessage;
        try {
          const data = await response.json();
          errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (jsonError) {
          const textResponse = await response.text();
          errorMessage = `HTTP ${response.status}: ${response.statusText}. Response: ${textResponse || 'Empty response'}`;
        }
        setError(errorMessage);
        return;
      }

      // Try to parse JSON response
      let data;
      try {
        const responseText = await response.text();
        console.log('Invite response text:', responseText);
        
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Invite JSON parsing error:', jsonError);
        setError(`Invalid response from server. Check if Netlify functions are deployed properly.`);
        return;
      }

      setResult({ ...data, type: 'invite' });
    } catch (err) {
      console.error('Invite test error:', err);
      setError(`Network error: ${err.message}. Make sure you're running on a deployed Netlify site, not localhost.`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSupabaseEmail = async () => {
    if (!testEmail) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('Testing Supabase email configuration...');
      
      // Test Supabase email via Netlify function (more reliable)
      const response = await fetch('/.netlify/functions/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail })
      });

      console.log('Supabase test response status:', response.status);

      if (!response.ok) {
        // Try to get error text if JSON parsing fails
        let errorMessage;
        try {
          const data = await response.json();
          errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (jsonError) {
          const textResponse = await response.text();
          errorMessage = `HTTP ${response.status}: ${response.statusText}. Response: ${textResponse || 'Empty response'}`;
        }
        setError(errorMessage);
        return;
      }

      // Try to parse JSON response
      let data;
      try {
        const responseText = await response.text();
        console.log('Supabase test response text:', responseText);
        
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Supabase test JSON parsing error:', jsonError);
        setError(`Invalid response from server. Check if Netlify functions are deployed properly.`);
        return;
      }

      setResult({
        success: true,
        message: 'Supabase email test sent successfully!',
        type: 'supabase',
        to: testEmail
      });
      
      setSuccess('Supabase email test sent! Check your email (including spam folder).');
    } catch (err) {
      console.error('Supabase email test error:', err);
      setError(`Supabase email test error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <EmailIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Email Service Test
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Test Supabase email configuration to make sure invitations are working
              </Typography>
            </Box>

            <Divider />



            <TextField
              label="Test Email Address"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              fullWidth
              helperText="Enter an email address to send test emails to"
              disabled={loading}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                onClick={handleTestSupabaseEmail}
                disabled={loading || !testEmail}
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                sx={{ mt: 2 }}
              >
                {loading ? 'Sending...' : 'Test Supabase Email'}
              </Button>

              <Button
                variant="outlined"
                onClick={handleTestInvite}
                disabled={loading || !testEmail}
                startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
                sx={{ mt: 2, ml: 2 }}
              >
                {loading ? 'Sending...' : 'Test Invitation Email'}
              </Button>

              <Button
                variant="outlined"
                onClick={handleTestSupabaseEmail}
                disabled={loading || !testEmail}
                startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
                sx={{ mt: 2, ml: 2 }}
              >
                {loading ? 'Sending...' : 'Test Supabase Email'}
              </Button>
            </Stack>

            {error && (
              <Alert severity="error" icon={<ErrorIcon />}>
                <Typography variant="subtitle2" gutterBottom>
                  Email Test Failed
                </Typography>
                <Typography variant="body2">
                  {error}
                </Typography>
              </Alert>
            )}

            {result && (
              <Alert severity="success" icon={<CheckIcon />}>
                <Typography variant="subtitle2" gutterBottom>
                  {result.type === 'invite' ? 'Invitation Email Sent!' : 'Test Email Sent!'}
                </Typography>
                <Typography variant="body2">
                  Email sent successfully to: <strong>{result.to || testEmail}</strong>
                </Typography>
                {result.messageId && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Message ID: {result.messageId}
                  </Typography>
                )}
              </Alert>
            )}

            <Box sx={{ bgcolor: 'grey.100', p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                📋 Email Configuration Checklist
              </Typography>
              <Typography variant="body2" component="div">
                <ol>
                  <li><strong>Netlify Environment Variables:</strong>
                    <ul>
                      <li>EMAIL_USER (your Gmail address)</li>
                      <li>EMAIL_PASSWORD (Gmail app password)</li>
                      <li>EMAIL_FROM (sender email address)</li>
                    </ul>
                  </li>
                  <li><strong>Gmail Setup:</strong>
                    <ul>
                      <li>Enable 2-Factor Authentication</li>
                      <li>Generate App Password (not regular password)</li>
                    </ul>
                  </li>
                  <li><strong>Deploy:</strong> Redeploy your site after adding environment variables</li>
                </ol>
              </Typography>
            </Box>

            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>
                💡 Quick Setup Guide
              </Typography>
              <Typography variant="body2">
                1. Go to <strong>Netlify Dashboard → Site Settings → Environment Variables</strong><br/>
                2. Add: EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM<br/>
                3. Use Gmail app password (not regular password)<br/>
                4. Deploy your site<br/>
                5. Test using this page
              </Typography>
            </Alert>

            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                ⚠️ Common Issues
              </Typography>
              <Typography variant="body2" component="div">
                <strong>"Unexpected end of JSON input"</strong> usually means:
                <ul>
                  <li>You're testing on localhost (functions only work on deployed Netlify sites)</li>
                  <li>Netlify functions aren't deployed yet</li>
                  <li>Environment variables aren't set</li>
                  <li>The function crashed before returning a response</li>
                </ul>
                <strong>Solution:</strong> Make sure you're testing on your deployed Netlify URL, not localhost.
              </Typography>
            </Alert>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}