import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Box, Card, CardContent, Typography, TextField, Button, 
  Alert, CircularProgress, Divider, Link, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';

function LoginPage() {
  const navigate = useNavigate();
  const { user, profile, organization, loading } = useAuth();
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [error, setError] = useState('');
  const [showOrgError, setShowOrgError] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    // Simplified navigation logic
    if (!loading) {
      if (user && profile && organization) {
        // Full authenticated user with organization
        navigate('/dashboard');
      } else if (user && profile && !organization && profile.role === 'owner') {
        // Platform owner without organization
        navigate('/owner-portal');
      } else if (user && profile && !organization && profile.role !== 'owner') {
        // User without organization (needs to create or join one)
        setShowOrgError(true);
        setError('Your account is not linked to any organization. Please create a new organization or contact support.');
      }
      // Otherwise, stay on login page
    }
  }, [user, profile, organization, loading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingLocal(true);
    setError('');
    setShowOrgError(false);

    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Make error messages more user-friendly
        if (error.message.includes('Invalid login credentials')) {
          setError('Email or password is incorrect. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(error.message);
        }
      }
      // Do NOT navigate here! Let the useEffect handle it.
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      setResetError(error.message);
    } else {
      setResetSuccess(true);
      setForgotPasswordOpen(false);
      setResetEmail('');
    }
    setResetLoading(false);
  };

  const handleCloseForgotPassword = () => {
    setForgotPasswordOpen(false);
    setResetEmail('');
    setResetError('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowOrgError(false);
    setError('');
  };

  // Don't show login form if still checking auth state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show org error state if user is logged in but has no organization
  if (showOrgError && user) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        p: 3
      }}>
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom>
              Organization Required
            </Typography>
            <Alert severity="warning" sx={{ mb: 3 }}>
              {error}
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                onClick={() => navigate('/register')}
              >
                Create New Organization
              </Button>
              <Button 
                variant="outlined" 
                color="secondary" 
                fullWidth
                onClick={() => navigate('/contact')}
              >
                Contact Support
              </Button>
              <Button 
                variant="text" 
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      p: 3
    }}>
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to your account to continue
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              required
              margin="normal"
              autoComplete="email"
              autoFocus
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              required
              margin="normal"
              autoComplete="current-password"
            />
            
            <Box sx={{ mt: 2, mb: 2, textAlign: 'right' }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => setForgotPasswordOpen(true)}
                sx={{ textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loadingLocal}
              sx={{ mb: 2 }}
            >
              {loadingLocal ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </form>

          <Divider sx={{ my: 3 }}>OR</Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Don't have an account?
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/signup')}
                sx={{ textDecoration: 'none', fontWeight: 600 }}
              >
                Join Organization
              </Link>
              <Typography variant="body2" color="text.secondary">•</Typography>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/register')}
                sx={{ textDecoration: 'none', fontWeight: 600 }}
              >
                Start Trial
              </Link>
            </Box>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/')}
              sx={{ textDecoration: 'none' }}
            >
              <IconButton size="small">
                <ArrowBackIcon />
              </IconButton>
              Back to Home
            </Link>
          </Box>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onClose={handleCloseForgotPassword} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <form onSubmit={handleForgotPassword}>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Enter your email address and we'll send you a link to reset your password.
            </Typography>
            {resetError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {resetError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              autoFocus
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForgotPassword}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={resetLoading}>
              {resetLoading ? <CircularProgress size={20} /> : 'Send Reset Link'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={resetSuccess}
        autoHideDuration={6000}
        onClose={() => setResetSuccess(false)}
        message="Password reset link sent! Check your email."
      />
    </Box>
  );
}

export default LoginPage; 