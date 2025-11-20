import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Button,
  TextField,
  Stack,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { CheckCircle as CheckIcon, Error as ErrorIcon, Email as EmailIcon } from '@mui/icons-material';
import { supabase } from '../supabase/client';

export default function VerifyOrganization() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, needs-password, success, error
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadVerificationData();
  }, []);

  const loadVerificationData = async () => {
    try {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Please try creating your organization again.');
        setLoading(false);
        return;
      }

      // First, try to get email and password from storage
      let storedPassword = sessionStorage.getItem('pending_org_password');
      let storedEmail = sessionStorage.getItem('pending_org_email');

      // If not in sessionStorage, try localStorage (with expiration check)
      if (!storedPassword || !storedEmail) {
        const expirationTime = localStorage.getItem('verification_expires');
        if (expirationTime && Date.now() < parseInt(expirationTime)) {
          storedPassword = localStorage.getItem('pending_org_password');
          storedEmail = localStorage.getItem('pending_org_email');
          logger.log('📦 Using localStorage backup data');
        } else if (expirationTime) {
          // Expired, clean up
          localStorage.removeItem('pending_org_password');
          localStorage.removeItem('pending_org_email');
          localStorage.removeItem('verification_token');
          localStorage.removeItem('verification_expires');
        }
      }

      // Retrieve verification data from database
      logger.log('🔍 Looking up verification token:', token);
      
      const { data: verification, error: verifyError } = await supabase
        .from('organization_verifications')
        .select('email, organization_name, user_name, created_at, verified')
        .eq('verification_token', token)
        .single();

      logger.log('📊 Verification query result:', { 
        hasData: !!verification, 
        error: verifyError,
        errorCode: verifyError?.code,
        errorMessage: verifyError?.message
      });

      if (verifyError) {
        setStatus('error');
        logger.error('❌ Verification lookup error:', verifyError);
        
        if (verifyError?.code === 'PGRST116') {
          // No rows returned
          setMessage('Invalid or expired verification link. Please create your organization again.');
        } else if (verifyError?.code === '42P01') {
          // Table doesn't exist
          setMessage('Database configuration error. Please contact support. (Table missing)');
          logger.error('⚠️ organization_verifications table may not exist. Please run the SQL setup script.');
        } else if (verifyError?.message?.includes('permission denied') || verifyError?.code === '42501') {
          setMessage('Database permission error. Please contact support.');
        } else {
          setMessage(`Verification link not found or already used. Error: ${verifyError.message || 'Unknown error'}. Please create your organization again.`);
        }
        setLoading(false);
        return;
      }

      if (!verification) {
        setStatus('error');
        setMessage('Invalid or expired verification link. Please create your organization again.');
        setLoading(false);
        return;
      }

      // Check if already verified
      if (verification.verified) {
        setStatus('error');
        setMessage('This verification link has already been used. Please sign in instead.');
        setLoading(false);
        return;
      }

      // Check if verification expired (24 hours)
      const createdAt = new Date(verification.created_at);
      const now = new Date();
      const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        setStatus('error');
        setMessage('This verification link has expired (24 hours). Please create your organization again.');
        setLoading(false);
        return;
      }

      // Store verification data
      setVerificationData({
        ...verification,
        token
      });

      // If we have stored password and email matches, proceed automatically
      if (storedPassword && storedEmail && storedEmail.toLowerCase() === verification.email.toLowerCase()) {
        logger.log('✅ Found stored credentials, proceeding automatically');
        await verifyAndCreateOrganization(verification.email, storedPassword, token);
      } else {
        // Need to ask for password
        logger.log('⚠️ No stored password found, will prompt user');
        setStatus('needs-password');
        setLoading(false);
      }

    } catch (err) {
      logger.error('Error loading verification data:', err);
      setStatus('error');
      setMessage('Failed to load verification data. Please try again.');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordError('');
    setLoading(true);
    setStatus('verifying');

    await verifyAndCreateOrganization(verificationData.email, password, verificationData.token);
  };

  const verifyAndCreateOrganization = async (email, password, token) => {
    try {

      logger.log('🔍 Verification data found:', { 
        hasToken: !!token, 
        hasPassword: !!password, 
        hasEmail: !!email,
        email: email
      });

      // Step 1: Try to sign in first (in case user already exists from failed verification)
      let user;
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (signInData.user) {
          user = signInData.user;
          logger.log('User already exists, signed in successfully');
        } else {
          throw new Error('Sign in failed, will try sign up');
        }
      } catch (signInErr) {
        // If sign in fails, try to sign up
        logger.log('Sign in failed, attempting sign up:', signInErr.message);
        
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: undefined, // Skip email confirmation since we already verified
          }
        });

        if (signupError) {
          // If user already exists, this might be from a failed verification
          if (signupError.message.includes('already registered') || signupError.message.includes('already exists')) {
            throw new Error('An account with this email already exists but verification failed. Please try signing in or contact support.');
          }
          throw signupError;
        }

        if (!signupData.user) {
          throw new Error('Failed to create user account');
        }

        user = signupData.user;
        logger.log('New user created successfully');
      }

      // Step 2: Create organization using verified token
      const { data: orgId, error: orgError } = await supabase.rpc(
        'create_verified_organization',
        {
          p_verification_token: token,
          p_user_id: user.id
        }
      );

      if (orgError) {
        throw orgError;
      }

      // Step 3: User is already signed in from Step 1, no need to sign in again
      logger.log('User is already authenticated, proceeding to dashboard');

      // Clean up both session and local storage
      sessionStorage.removeItem('pending_org_password');
      sessionStorage.removeItem('pending_org_email');
      sessionStorage.removeItem('verification_token');
      
      localStorage.removeItem('pending_org_password');
      localStorage.removeItem('pending_org_email');
      localStorage.removeItem('verification_token');
      localStorage.removeItem('verification_expires');

      setStatus('success');
      setMessage('Your organization has been created successfully!');
      
      // Check if organization needs setup (missing asset_type - the main required field)
      // Reload organization to get latest data
      const { data: orgData } = await supabase
        .from('organizations')
        .select('asset_type')
        .eq('id', orgId)
        .single();
      
      const needsSetup = !orgData?.asset_type;
      
      // Redirect to setup wizard if needed, otherwise to dashboard
      setTimeout(() => {
        if (needsSetup) {
          window.location.href = '/organization-setup';
        } else {
          window.location.href = '/home';
        }
      }, 2000);

    } catch (err) {
      logger.error('Verification error:', err);
      setStatus('error');
      
      if (err.message.includes('expired')) {
        setMessage('This verification link has expired. Please create your organization again.');
      } else if (err.message.includes('already been used')) {
        setMessage('This verification link has already been used. Please sign in instead.');
      } else if (err.message.includes('User already registered')) {
        setMessage('An account with this email already exists. Please sign in instead.');
      } else {
        setMessage(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Enter Details', 'Verify Email', 'Complete Setup'];
  const activeStep = status === 'verifying' ? 1 : status === 'success' ? 2 : status === 'needs-password' ? 1 : 0;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Create Organization
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start your free 14-day trial
          </Typography>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {loading && status === 'verifying' && (
          <Box sx={{ py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Verifying Your Email...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we set up your organization
            </Typography>
          </Box>
        )}

        {status === 'success' && (
          <Box sx={{ py: 4 }}>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Setup Complete! 🎉
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {message}
            </Typography>
            <Alert severity="success" sx={{ mt: 3, mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>Your organization is ready!</strong><br />
                • Your account has been created<br />
                • Your organization has been set up<br />
                • You're signed in and ready to go
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Redirecting to your dashboard...
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => window.location.href = '/home'}
              sx={{ mt: 2 }}
            >
              Go to Dashboard Now
            </Button>
          </Box>
        )}

        {status === 'needs-password' && verificationData && (
          <Box sx={{ py: 4 }}>
            <EmailIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Enter Your Password
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Please enter the password you used when creating your organization for <strong>{verificationData.organization_name}</strong>.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Email: <strong>{verificationData.email}</strong>
            </Typography>
            
            <Box component="form" onSubmit={handlePasswordSubmit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  error={!!passwordError}
                  helperText={passwordError || 'Enter the password you set during registration'}
                  required
                  autoFocus
                />
                
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Verify & Create Organization'}
                </Button>
              </Stack>
            </Box>

            <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>Forgot your password?</strong>
                <br />
                If you don't remember your password, you can start the registration process again at{' '}
                <Button 
                  href="/create-organization" 
                  sx={{ p: 0, textTransform: 'none', minWidth: 'auto' }}
                >
                  /create-organization
                </Button>
              </Typography>
            </Alert>
          </Box>
        )}

        {status === 'error' && (
          <Box sx={{ py: 4 }}>
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Verification Failed
            </Typography>
            <Alert severity="error" sx={{ mt: 2, mb: 3, textAlign: 'left' }}>
              {message}
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={() => navigate('/create-organization')}
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
}


