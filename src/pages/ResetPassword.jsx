import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger';
import { validateInput } from '../utils/security';
import {
  Box, Card, CardContent, Typography, TextField, Button, 
  Alert, CircularProgress, InputAdornment, IconButton, LinearProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    // Handle password reset from email link
    // Supabase automatically handles hash fragments via onAuthStateChange
    // But we also manually check in case the listener hasn't fired yet
    const handlePasswordReset = async () => {
      setCheckingSession(true);
      try {
        // First, check if we have hash fragments in the URL
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          logger.log('Password reset link detected with hash fragment');
          
          // Parse hash parameters
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const type = hashParams.get('type');
          
          // If we have an access token and it's a recovery type, set the session
          if (accessToken && type === 'recovery') {
            logger.log('Exchanging password reset token for session...');
            
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || ''
            });
            
            if (error) {
              logger.error('Error setting session from reset link:', error);
              setError('Invalid or expired reset link. Please request a new password reset.');
              setCheckingSession(false);
              return;
            }
            
            if (data.session) {
              logger.log('Session established from password reset link');
              setHasValidSession(true);
              // Clear the hash from URL for security
              window.history.replaceState(null, '', '/reset-password');
              setCheckingSession(false);
              return;
            }
          }
        }
        
        // Check if we have a valid session (either from hash or already established)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          logger.log('Valid session found');
          setHasValidSession(true);
        } else {
          // Only show error if we don't have hash fragments (meaning link might be expired)
          if (!hash || !hash.includes('access_token')) {
            setError('Invalid or expired reset link. Please request a new password reset.');
          } else {
            // Wait a bit for onAuthStateChange to fire
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                setHasValidSession(true);
              } else {
                setError('Invalid or expired reset link. Please request a new password reset.');
              }
              setCheckingSession(false);
            }, 1000);
            return;
          }
        }
      } catch (err) {
        logger.error('Error handling password reset:', err);
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
      setCheckingSession(false);
    };
    
    // Also listen for auth state changes (Supabase's built-in handler)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.log('Auth state change event:', event, 'Session:', !!session);
      if (event === 'PASSWORD_RECOVERY' && session) {
        logger.log('Password recovery event detected via onAuthStateChange');
        setHasValidSession(true);
        // Clear hash from URL
        window.history.replaceState(null, '', '/reset-password');
        setCheckingSession(false);
        } else if (session && event === 'SIGNED_IN') {
          // Also handle SIGNED_IN event which might fire for password recovery
          logger.log('Signed in event detected, checking if it is a password recovery');
          setHasValidSession(true);
          setCheckingSession(false);
        }
    });
    
    handlePasswordReset();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Use security.js validation for strong passwords
    const passwordValidation = validateInput.validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    // Verify we have a valid session before attempting to update password
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Auth session missing! Please click the reset link from your email again.');
      return;
    }

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      logger.error('Error updating password:', error);
      if (error.message.includes('session') || error.message.includes('Auth')) {
        setError('Auth session missing! Please click the reset link from your email again.');
      } else {
        setError(error.message);
      }
    } else {
      setSuccess(true);
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
    setLoading(false);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Get password strength for visual feedback
  const passwordStrength = validateInput.getPasswordStrength(password);

  if (success) {
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
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              Password updated successfully!
            </Alert>
            <Typography variant="h6" gutterBottom>
              Password Reset Complete
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your password has been updated. You will be redirected to the login page shortly.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Show loading state while checking session
  if (checkingSession) {
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
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Verifying reset link...
            </Typography>
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
      p: 2
    }}>
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Reset Your Password
          </Typography>
          
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Enter your new password below
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handlePasswordReset}>
            <TextField
              fullWidth
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ mb: 1 }}
              helperText="Min 8 characters with uppercase, lowercase, and number"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            {/* Password Strength Indicator */}
            {password && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(passwordStrength.score / 4) * 100}
                    sx={{ 
                      flexGrow: 1, 
                      height: 6, 
                      borderRadius: 3,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: passwordStrength.color,
                        borderRadius: 3
                      }
                    }}
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ color: passwordStrength.color, fontWeight: 500, minWidth: 80 }}
                  >
                    {passwordStrength.label}
                  </Typography>
                </Box>
              </Box>
            )}
            
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleClickShowConfirmPassword}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !password || !confirmPassword}
              endIcon={loading ? <CircularProgress size={20} /> : null}
              sx={{ mb: 3 }}
            >
              Update Password
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Remember your password?
            </Typography>
            <Button
              variant="text"
              onClick={() => navigate('/login')}
              sx={{ mt: 1 }}
            >
              Back to Login
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ResetPassword; 