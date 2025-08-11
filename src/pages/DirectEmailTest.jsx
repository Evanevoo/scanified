import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

const DirectEmailTest = () => {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleDirectTest = async () => {
    if (!testEmail) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('Testing direct SMTP...');
      
      const response = await fetch('/.netlify/functions/direct-email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail })
      });

      console.log('Direct test response status:', response.status);

      if (!response.ok) {
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

      const data = await response.json();
      console.log('Direct test response:', data);
      
      setResult(data);
      
    } catch (err) {
      console.error('Direct SMTP test error:', err);
      setError(`Network error: ${err.message}`);
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
                🧪 Direct Outlook SMTP Email Test
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Test email delivery directly via Outlook SMTP (bypassing Supabase)
              </Typography>
            </Box>

            <Divider />

            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>
                🎯 Direct Outlook SMTP Test
              </Typography>
              <Typography variant="body2">
                This test bypasses Supabase completely and sends email directly via nodemailer and Outlook SMTP.
                If this works, we know your Outlook SMTP credentials and email delivery are functioning correctly.
              </Typography>
            </Alert>

            <TextField
              label="Test Email Address"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              fullWidth
              helperText="Enter an email address to send the direct SMTP test to"
              disabled={loading}
            />

            <Button
              variant="contained"
              onClick={handleDirectTest}
              disabled={loading || !testEmail}
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              size="large"
              sx={{ py: 1.5 }}
            >
              {loading ? 'Sending Direct SMTP Test...' : '🚀 Send Direct SMTP Test'}
            </Button>

            {error && (
              <Alert severity="error" icon={<ErrorIcon />}>
                <Typography variant="subtitle2" gutterBottom>
                  Direct SMTP Test Failed
                </Typography>
                <Typography variant="body2">
                  {error}
                </Typography>
              </Alert>
            )}

            {result && (
              <Alert severity="success" icon={<SuccessIcon />}>
                <Typography variant="subtitle2" gutterBottom>
                  ✅ Direct SMTP Test Successful!
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {result.message}
                </Typography>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
                  <Typography variant="caption" display="block">
                    <strong>Message ID:</strong> {result.messageId}
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Sent to:</strong> {result.to}
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Method:</strong> {result.method}
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Server:</strong> {result.server}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold', color: 'success.main' }}>
                  📧 Check your email inbox (and spam folder) now!
                </Typography>
              </Alert>
            )}

            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                📝 What This Test Proves
              </Typography>
              <Typography variant="body2">
                • If this test succeeds and you receive the email: Your SMTP credentials work perfectly<br/>
                • If this test fails: There's an issue with your Outlook SMTP configuration<br/>
                • This bypasses Supabase entirely to isolate the email delivery issue
              </Typography>
            </Alert>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default DirectEmailTest;
