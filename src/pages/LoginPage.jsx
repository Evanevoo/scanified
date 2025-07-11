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
  const [profileNotFound, setProfileNotFound] = useState(false);

  useEffect(() => {
    // Only navigate if user and organization exist
    if (!loading && user && organization) {
      navigate('/dashboard');
    }
    // Show error if user is logged in but has no organization
    else if (!loading && user && profile && !organization) {
      setShowOrgError(true);
      setError('Your account is not linked to any organization. Please contact support or register a new organization.');
      console.log('Setting org error!');
    } else if (!loading && !user && !organization && !profile && loadingLocal) {
      setProfileNotFound(true);
      setError('This user is not registered. Please contact support or register your organization.');
      setLoadingLocal(false);
    }
  }, [user, profile, organization, loading, loadingLocal, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingLocal(true);
    setError('');
    setShowOrgError(false);
    setProfileNotFound(false);

    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

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
    setLoadingLocal(false);
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

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      p: 2
    }}>
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Error Message - always visible at the top */}
          {(error || showOrgError || profileNotFound) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
              {(showOrgError || profileNotFound) && (
                <Box mt={1}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => navigate('/register')}
                  >
                    Create New Organization
                  </Button>
                </Box>
              )}
            </Alert>
          )}
          {/* Back to Home Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
              sx={{ 
                color: 'text.secondary',
                '&:hover': { 
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  color: 'text.primary'
                }
              }}
            >
              Back to Home
            </Button>
          </Box>

          <Typography variant="h4" align="center" gutterBottom>
            Welcome Back
          </Typography>
          
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Sign in to your account
          </Typography>

          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              name="email"
              label="Email Address"
              type="email"
              required
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              name="password"
              label="Password"
              type="password"
              required
              sx={{ mb: 1 }}
            />

            {/* Forgot Password Link */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Link
                variant="body2"
                onClick={(e) => {
                  e.preventDefault();
                  setForgotPasswordOpen(true);
                }}
                sx={{ 
                  textDecoration: 'none',
                  color: 'primary.main',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                Forgot Password?
              </Link>
            </Box>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loadingLocal}
              endIcon={loadingLocal ? <CircularProgress size={20} /> : null}
              sx={{ mb: 3 }}
            >
              Sign In
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              New to LessAnnoyingScan?
            </Typography>
            
            <Button
              variant="contained"
              fullWidth
              onClick={() => navigate('/register')}
              sx={{ mb: 2 }}
            >
              Start Free Trial
            </Button>
            
            <Button
              variant="text"
              fullWidth
              onClick={() => navigate('/contact')}
              sx={{ 
                textTransform: 'none',
                color: 'text.secondary',
                '&:hover': { 
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  color: 'text.primary'
                }
              }}
            >
              Need Help? Contact Us
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog 
        open={forgotPasswordOpen} 
        onClose={handleCloseForgotPassword}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Reset Your Password
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your email address and we'll send you a link to reset your password.
          </Typography>
          
          {resetError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {resetError}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleForgotPassword}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              sx={{ mb: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleCloseForgotPassword}>
            Cancel
          </Button>
          <Button
            onClick={handleForgotPassword}
            variant="contained"
            disabled={resetLoading || !resetEmail}
            endIcon={resetLoading ? <CircularProgress size={20} /> : null}
          >
            Send Reset Link
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={resetSuccess}
        autoHideDuration={6000}
        onClose={() => setResetSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setResetSuccess(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Password reset link sent! Check your email for instructions.
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default LoginPage; 