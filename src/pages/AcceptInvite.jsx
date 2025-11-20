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
  Stack
} from '@mui/material';
import { CheckCircle as CheckIcon, Error as ErrorIcon } from '@mui/icons-material';
import { supabase } from '../supabase/client';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading'); // loading, needsAuth, accepting, success, error
  const [message, setMessage] = useState('');
  const [invite, setInvite] = useState(null);
  const [user, setUser] = useState(null);
  
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    checkInviteAndUser();
  }, []);

  const checkInviteAndUser = async () => {
    try {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid invite link');
        return;
      }

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      let inviteData = null;
      let inviteError = null;

      // First, try Netlify function which uses service role (bypasses RLS)
      try {
        const response = await fetch('/.netlify/functions/fetch-invite-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        if (response.ok) {
          const payload = await response.json();
          if (payload?.invite) {
            inviteData = payload.invite;
            logger.log('Invite fetched via Netlify function');
          }
        } else {
          const errorPayload = await response.json().catch(() => ({}));
          logger.warn('Netlify function invite fetch failed:', response.status, errorPayload);

          if (response.status === 404) {
            setStatus('error');
            setMessage('Invalid or expired invite link. The invite may have already been used or expired.');
            return;
          }

          if (response.status === 409) {
            setStatus('error');
            setMessage('This invite has already been accepted.');
            return;
          }

          if (response.status === 410) {
            setStatus('error');
            setMessage('This invite has expired');
            return;
          }
          // For other statuses, fall back to Supabase RPC below
        }
      } catch (netlifyError) {
        logger.warn('Netlify function not available, falling back to Supabase RPC:', netlifyError);
      }

      // If Netlify function did not return data, fall back to Supabase RPC / direct query
      if (!inviteData) {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_invite_by_token', {
            p_token: token
          });

          logger.log('RPC function response:', { rpcData, rpcError, token });

          if (rpcError) {
            // Check if it's a "function does not exist" error
            if (rpcError.message?.includes('function') && (rpcError.message?.includes('does not exist') || rpcError.code === '42883')) {
              logger.warn('RPC function does not exist yet. Please run the SQL function in Supabase.');
              setStatus('error');
              setMessage('The invite validation function is not set up yet. Please contact the administrator to run the SQL migration: create_get_invite_by_token_function.sql in the supabase/migrations folder.');
              return;
            }
            
            // Check for permission errors
            if (rpcError.code === '42501' || rpcError.message?.includes('permission denied')) {
              logger.warn('RPC function permission error, trying direct query:', rpcError);
              // Fallback to direct query if RPC has permission errors
              const { data: directData, error: directError } = await supabase
                .from('organization_invites')
                .select('*, organizations(name)')
                .eq('invite_token', token)
                .is('accepted_at', null)
                .maybeSingle();
              
              inviteData = directData;
              inviteError = directError;
            } else {
              // For other RPC errors, log and try direct query
              logger.warn('RPC function error, trying direct query:', rpcError);
              const { data: directData, error: directError } = await supabase
                .from('organization_invites')
                .select('*, organizations(name)')
                .eq('invite_token', token)
                .is('accepted_at', null)
                .maybeSingle();
              
              inviteData = directData;
              inviteError = directError;
            }
          } else if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
            // RPC returns an array (table), get first result
            inviteData = {
              ...rpcData[0],
              organizations: rpcData[0].organization_name ? { name: rpcData[0].organization_name } : null
            };
            logger.log('Successfully fetched invite via RPC:', inviteData);
          } else if (rpcData && !Array.isArray(rpcData) && rpcData.id) {
            // Handle case where RPC returns single object instead of array
            inviteData = {
              ...rpcData,
              organizations: rpcData.organization_name ? { name: rpcData.organization_name } : null
            };
            logger.log('Successfully fetched invite via RPC (single object):', inviteData);
          } else {
            // RPC function returned empty array - invite doesn't exist or is expired
            logger.warn('RPC function returned empty result - invite not found or expired');
            inviteData = null;
            inviteError = null; // Not an error, just no results
          }
        } catch (rpcException) {
          logger.warn('Exception calling RPC function, trying direct query:', rpcException);
          // Fallback to direct query
          const { data: directData, error: directError } = await supabase
            .from('organization_invites')
            .select('*, organizations(name)')
            .eq('invite_token', token)
            .is('accepted_at', null)
            .maybeSingle();
          
          inviteData = directData;
          inviteError = directError;
        }
      }

      logger.log('Invite query result:', { inviteData, inviteError, token });

      if (inviteError) {
        logger.error('Error fetching invite:', inviteError);
        
        // Handle RLS permission errors - these are expected for unauthenticated users
        if (inviteError.code === '42501' || inviteError.code === 'PGRST301' || inviteError.message?.includes('permission denied')) {
          setStatus('error');
          setMessage('Unable to verify invite link due to permissions. Please contact the person who sent you the invite, or ask them to run the SQL function: get_invite_by_token');
          return;
        }
        
        // For other errors, show generic message
        setStatus('error');
        setMessage(`Invalid or expired invite link: ${inviteError.message}`);
        return;
      }

      if (!inviteData) {
        logger.warn('No invite found for token:', token);
        setStatus('error');
        setMessage('Invalid or expired invite link. The invite may have already been used or expired.');
        return;
      }

      // Check if expired
      if (new Date(inviteData.expires_at) < new Date()) {
        setStatus('error');
        setMessage('This invite has expired');
        return;
      }

      setInvite(inviteData);
      setAuthForm({ ...authForm, email: inviteData.email });

      // If user is logged in, accept immediately
      if (user) {
        await acceptInvite(user, inviteData);
      } else {
        setStatus('needsAuth');
      }

    } catch (err) {
      logger.error('Error:', err);
      setStatus('error');
      setMessage(err.message || 'Failed to load invite');
    }
  };

  const handleSignUpAndAccept = async (e) => {
    e.preventDefault();
    setStatus('accepting');
    setMessage('');

    try {
      // Validate
      if (!authForm.name.trim() || !authForm.password || authForm.password.length < 6) {
        throw new Error('Please provide your name and a password (at least 6 characters)');
      }

      // Sign up
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: invite.email,
        password: authForm.password,
        options: {
          emailRedirectTo: undefined,
          data: {
            name: authForm.name
          }
        }
      });

      if (signupError) {
        const alreadyRegistered = signupError.message?.toLowerCase().includes('already registered');
        if (alreadyRegistered) {
          setStatus('needsAuth');
          setMessage('This email already has an account. Please sign in to continue your invite.');
          const token = searchParams.get('token');
          if (token) {
            navigate(`/login?redirect=/accept-invite?token=${token}`);
          } else {
            navigate('/login');
          }
          return;
        }
        throw signupError;
      }
      if (!signupData.user) throw new Error('Failed to create account');

      // Accept invite
      await acceptInvite(signupData.user, invite);

    } catch (err) {
      logger.error('Error:', err);
      setStatus('error');
      setMessage(err.message || 'Failed to accept invite');
    }
  };

  const acceptInvite = async (user, inviteData) => {
    try {
      setStatus('accepting');

      // Create/update profile
      const profilePayload = {
        id: user.id,
        email: inviteData.email,
        name: authForm.name || user.user_metadata?.name,
        organization_id: inviteData.organization_id,
        role: inviteData.role,
        is_active: true
      };

      const acceptResponse = await fetch('/.netlify/functions/fetch-invite-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: searchParams.get('token'), accept: true, profile: profilePayload })
      });

      if (!acceptResponse.ok) {
        const payload = await acceptResponse.json().catch(() => ({}));
        throw new Error(payload.error || payload.message || 'Failed to accept invite');
      }

      setStatus('success');
      setMessage('Successfully joined the organization!');
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/home';
      }, 2000);

    } catch (err) {
      logger.error('Error accepting invite:', err);
      setStatus('error');
      setMessage(err.message || 'Failed to accept invite');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {status === 'loading' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6">Loading invitation...</Typography>
          </Box>
        )}

        {status === 'needsAuth' && invite && (
          <Box>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Join {invite.organizations.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              You've been invited to join as a <strong>{invite.role}</strong>
            </Typography>

            <Box component="form" onSubmit={handleSignUpAndAccept} sx={{ mt: 3 }}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Your Name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  autoComplete="off"
                  required
                />

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={authForm.email}
                  disabled
                  helperText="This email was invited"
                  autoComplete="email"
                />

                <TextField
                  fullWidth
                  label="Create Password"
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  autoComplete="new-password"
                  required
                  helperText="At least 6 characters"
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                >
                  Create Account & Join
                </Button>

                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Already have an account?{' '}
                  <Button
                    onClick={() => navigate(`/login?redirect=/accept-invite?token=${searchParams.get('token')}`)}
                    sx={{ p: 0, textTransform: 'none' }}
                  >
                    Sign in instead
                  </Button>
                </Typography>
              </Stack>
            </Box>
          </Box>
        )}

        {status === 'accepting' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6">Joining organization...</Typography>
          </Box>
        )}

        {status === 'success' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Success!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {message}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Redirecting to dashboard...
            </Typography>
          </Box>
        )}

        {status === 'error' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Error
            </Typography>
            <Alert severity="error" sx={{ my: 3, textAlign: 'left' }}>
              {message}
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
