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

      // Get invite details via RPC (bypasses RLS so unauthenticated users can validate token)
      const { data: inviteRows, error: inviteError } = await supabase
        .rpc('get_invite_by_token', { p_token: token });

      if (inviteError) {
        logger.warn('get_invite_by_token error:', inviteError);
        const isMissingFunction = /function.*does not exist|42883|PGRST202/i.test(inviteError.message || '');
        setStatus('error');
        setMessage(isMissingFunction
          ? 'Invite validation is not available. Please ask the person who invited you to send a new invite link, or contact support.'
          : 'Invalid or expired invite link');
        return;
      }

      const inviteData = inviteRows && inviteRows[0];
      if (!inviteData) {
        setStatus('error');
        setMessage('Invalid or expired invite link');
        return;
      }

      // Check if expired (function also checks, but defense in depth)
      if (new Date(inviteData.expires_at) < new Date()) {
        setStatus('error');
        setMessage('This invite has expired');
        return;
      }

      // Shape for UI: RPC returns organization_name, component expects invite.organizations.name
      const inviteForState = {
        ...inviteData,
        organizations: { name: inviteData.organization_name }
      };
      setInvite(inviteForState);
      setValidatedToken(token);
      setAuthForm({ ...authForm, email: inviteData.email });

      // If user is logged in, accept immediately
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

      // Create/update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: inviteData.email,
          name: authForm.name || user.user_metadata?.name,
          organization_id: inviteData.organization_id,
          role: inviteData.role,
          is_active: true,
          deleted_at: null,
          disabled_at: null
        }, {
          onConflict: 'id'
        });

      if (profileError) throw profileError;

      // Mark invite as accepted (use same normalized token we validated)
      const { error: acceptError } = await supabase
        .from('organization_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('invite_token', inviteToken);

      if (acceptError) throw acceptError;

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
