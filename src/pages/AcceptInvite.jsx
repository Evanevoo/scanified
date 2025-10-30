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

      // Get invite details
      const { data: inviteData, error: inviteError } = await supabase
        .from('organization_invites')
        .select('*, organizations(name)')
        .eq('invite_token', token)
        .is('accepted_at', null)
        .single();

      if (inviteError || !inviteData) {
        setStatus('error');
        setMessage('Invalid or expired invite link');
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
      console.error('Error:', err);
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

      if (signupError) throw signupError;
      if (!signupData.user) throw new Error('Failed to create account');

      // Accept invite
      await acceptInvite(signupData.user, invite);

    } catch (err) {
      console.error('Error:', err);
      setStatus('error');
      setMessage(err.message || 'Failed to accept invite');
    }
  };

  const acceptInvite = async (user, inviteData) => {
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

      // Mark invite as accepted
      const { error: acceptError } = await supabase
        .from('organization_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('invite_token', searchParams.get('token'));

      if (acceptError) throw acceptError;

      setStatus('success');
      setMessage('Successfully joined the organization!');
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/home';
      }, 2000);

    } catch (err) {
      console.error('Error accepting invite:', err);
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
