import logger from '../../utils/logger';
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
  Divider,
  Chip
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Rocket as RocketIcon
} from '@mui/icons-material';

const SMTP2GOTest = () => {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSMTP2GOTest = async () => {
    if (!testEmail) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      logger.log('Testing SMTP2GO...');
      
      const response = await fetch('/.netlify/functions/smtp2go-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail })
      });

      logger.log('SMTP2GO test response status:', response.status);

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
      logger.log('SMTP2GO test response:', data);
      
      setResult(data);
      
    } catch (err) {
      logger.error('SMTP2GO test error:', err);
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
              <RocketIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" fontWeight={700} gutterBottom>
                🚀 SMTP2GO Professional Email Test
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Test professional email delivery with SMTP2GO
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                <Chip label="Professional Service" color="primary" size="small" />
                <Chip label="High Deliverability" color="success" size="small" />
                <Chip label="Spam Filter Bypass" color="info" size="small" />
              </Stack>
            </Box>

            <Divider />

            <Alert severity="success">
              <Typography variant="subtitle2" gutterBottom>
                🎯 SMTP2GO Professional Email Service
              </Typography>
              <Typography variant="body2">
                SMTP2GO is a professional email delivery service that ensures your emails reach the inbox.
                This test uses their enterprise-grade SMTP servers for maximum deliverability.
              </Typography>
            </Alert>

            <TextField
              label="Test Email Address"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              fullWidth
              helperText="Enter an email address to test SMTP2GO delivery"
              disabled={loading}
            />

            <Button
              variant="contained"
              onClick={handleSMTP2GOTest}
              disabled={loading || !testEmail}
              startIcon={loading ? <CircularProgress size={20} /> : <RocketIcon />}
              size="large"
              sx={{ py: 1.5, fontSize: '1.1rem' }}
            >
              {loading ? 'Sending via SMTP2GO...' : '🚀 Send SMTP2GO Test Email'}
            </Button>

            {error && (
              <Alert severity="error" icon={<ErrorIcon />}>
                <Typography variant="subtitle2" gutterBottom>
                  SMTP2GO Test Failed
                </Typography>
                <Typography variant="body2">
                  {error}
                </Typography>
              </Alert>
            )}

            {result && (
              <Alert severity="success" icon={<SuccessIcon />}>
                <Typography variant="subtitle2" gutterBottom>
                  🎉 SMTP2GO Test Successful!
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {result.message}
                </Typography>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
                  <Typography variant="caption" display="block">
                    <strong>Service:</strong> {result.service}
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Message ID:</strong> {result.messageId}
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Server:</strong> {result.server}
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Deliverability:</strong> {result.deliverability}
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Sent to:</strong> {result.to}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold', color: 'success.main' }}>
                  📧 Check your email inbox now! SMTP2GO ensures high deliverability.
                </Typography>
              </Alert>
            )}

            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>
                ⭐ Why SMTP2GO Works Better
              </Typography>
              <Typography variant="body2">
                • <strong>Professional reputation:</strong> Dedicated IP addresses and domain authentication<br/>
                • <strong>Bypass spam filters:</strong> Automatic SPF, DKIM, and DMARC configuration<br/>
                • <strong>High deliverability:</strong> 99%+ inbox delivery rate<br/>
                • <strong>Real-time tracking:</strong> See exactly when emails are delivered and opened<br/>
                • <strong>Reliable infrastructure:</strong> Enterprise-grade servers with 99.9% uptime
              </Typography>
            </Alert>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default SMTP2GOTest;
