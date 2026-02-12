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
  LinearProgress
} from '@mui/material';
import { CheckCircle as CheckIcon, Error as ErrorIcon } from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { validateInput } from '../utils/security';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading'); // loading, needsAuth, accepting, success, error
  const [message, setMessage] = useState('');
  const [invite, setInvite] = useState(null);
  const [user, setUser] = useState(null);
  const [validatedToken, setValidatedToken] = useState(null);
  
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
      let token = searchParams.get('token');
      if (!token) {
        setStatus('error');
        setMessage('Invalid invite link');
        return;
      }
      token = token.trim();
      try {
        if (token.includes('%')) token = decodeURIComponent(token);
      } catch (_) { /* use as-is */ }

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      let inviteData = null;

      // 1. Try Netlify function first (uses service_role, bypasses RLS - this was the working path)
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
        }
      } catch (netlifyError) {
        logger.warn('Netlify function not available, falling back to Supabase RPC:', netlifyError);
      }

      // 2. Fallback: Supabase RPC get_invite_by_token (for when Netlify is unavailable)
      if (!inviteData) {
        const { data: inviteRows, error: inviteError } = await supabase
          .rpc('get_invite_by_token', { p_token: token });

        if (!inviteError && inviteRows && inviteRows[0]) {
          const row = inviteRows[0];
          inviteData = {
            ...row,
            organizations: row.organization_name ? { name: row.organization_name } : null
          };
        }
        if (inviteError) logger.warn('get_invite_by_token fallback error:', inviteError);
      }

      if (!inviteData) {
        setStatus('error');
        setMessage('Invalid or expired invite link');
        return;
      }

      // Check if expired (only if we have a valid expires_at)
      const expiresAt = inviteData.expires_at ? new Date(inviteData.expires_at) : null;
      if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
        setStatus('error');
        setMessage('This invite has expired');
        return;
      }

      const inviteForState = {
        ...inviteData,
        organizations: inviteData.organizations || (inviteData.organization_name ? { name: inviteData.organization_name } : { name: '' })
      };
      setInvite(inviteForState);
      setValidatedToken(token);
      setAuthForm({ ...authForm, email: inviteData.email });

      if (user) {
        await acceptInvite(user, inviteData, token);
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
      // Validate name
      if (!authForm.name.trim()) {
        throw new Error('Please provide your name');
      }

      // Validate password with security requirements
      const passwordValidation = validateInput.validatePassword(authForm.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
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

      if (signupError) throw signupError;
      if (!signupData.user) throw new Error('Failed to create account');

      // Accept invite (use validated token from state, or normalize from URL)
      const tokenForAccept = validatedToken || (() => {
        let t = searchParams.get('token');
        if (!t) return null;
        t = t.trim();
        try { if (t.includes('%')) t = decodeURIComponent(t); } catch (_) {}
        return t;
      })();
      await acceptInvite(signupData.user, invite, tokenForAccept);

    } catch (err) {
      logger.error('Error:', err);
      setStatus('error');
      setMessage(err.message || 'Failed to accept invite');
    }
  };

  const acceptInvite = async (user, inviteData, tokenToUse) => {
    const inviteToken = tokenToUse ?? validatedToken ?? searchParams.get('token')?.trim();
    try {
      setStatus('accepting');

      // Use Netlify function to accept (service_role bypasses RLS for profile upsert + invite update)
      const displayName = authForm.name || user.user_metadata?.name || user.user_metadata?.full_name || '';
      const profilePayload = {
        id: user.id,
        email: inviteData.email,
        full_name: displayName,
        organization_id: inviteData.organization_id,
        role: inviteData.role,
        is_active: true,
        deleted_at: null,
        disabled_at: null
      };

      const acceptResponse = await fetch('/.netlify/functions/fetch-invite-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken, accept: true, profile: profilePayload })
      });

      if (!acceptResponse.ok) {
        const payload = await acceptResponse.json().catch(() => ({}));
        throw new Error(payload.error || payload.message || 'Failed to accept invite');
      }

      setStatus('success');
      setMessage('Successfully joined the organization!');
      
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
                  required
                />

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={authForm.email}
                  disabled
                  helperText="This email was invited"
                />

                <TextField
                  fullWidth
                  label="Create Password"
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
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
