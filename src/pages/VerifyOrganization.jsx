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
  Button
} from '@mui/material';
import { CheckCircle as CheckIcon, Error as ErrorIcon } from '@mui/icons-material';
import { supabase } from '../supabase/client';

export default function VerifyOrganization() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyAndCreateOrganization();
  }, []);

  const verifyAndCreateOrganization = async () => {
    try {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Please try creating your organization again.');
        setLoading(false);
        return;
      }

      // Get stored password and email (try sessionStorage first, then localStorage)
      let password = sessionStorage.getItem('pending_org_password');
      let email = sessionStorage.getItem('pending_org_email');

      // If not in sessionStorage, try localStorage (with expiration check)
      if (!password || !email) {
        const expirationTime = localStorage.getItem('verification_expires');
        if (expirationTime && Date.now() < parseInt(expirationTime)) {
          password = localStorage.getItem('pending_org_password');
          email = localStorage.getItem('pending_org_email');
          logger.log('📦 Using localStorage backup data');
        } else if (expirationTime) {
          // Expired, clean up
          localStorage.removeItem('pending_org_password');
          localStorage.removeItem('pending_org_email');
          localStorage.removeItem('verification_token');
          localStorage.removeItem('verification_expires');
        }
      }

      if (!password || !email) {
        setStatus('error');
        setMessage('Session expired. Please start the registration process again. Go back to /create-organization to try again.');
        setLoading(false);
        return;
      }

      logger.log('🔍 Verification data found:', { 
        hasToken: !!token, 
        hasPassword: !!password, 
        hasEmail: !!email,
        email: email,
        source: sessionStorage.getItem('pending_org_password') ? 'sessionStorage' : 'localStorage'
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
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/home';
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

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
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
              Success!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {message}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Redirecting to your dashboard...
            </Typography>
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


