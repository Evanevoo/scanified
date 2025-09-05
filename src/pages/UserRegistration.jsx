import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, 
  Alert, CircularProgress, Grid, Divider, Container,
  FormControlLabel, Checkbox, Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

export default function UserRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationCode: '',
    agreeToTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOrgCode, setShowOrgCode] = useState(false);

  const handleInputChange = (field) => (event) => {
    const value = field === 'agreeToTerms' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Please enter a password');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (showOrgCode && !formData.organizationCode.trim()) {
      setError('Please enter the organization code provided by your administrator');
      return false;
    }
    if (showOrgCode && !/^\d{6}$/.test(formData.organizationCode.trim())) {
      setError('Organization code must be exactly 6 digits');
      return false;
    }
    if (!formData.agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    try {
      // Step 1: Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim()
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Step 2: If organization code provided, validate and join
      if (showOrgCode && formData.organizationCode.trim()) {
        const { data: codeResult, error: codeError } = await supabase
          .rpc('use_organization_join_code', {
            p_code: formData.organizationCode.trim(),
            p_used_by: authData.user.id
          });

        if (codeError) throw codeError;

        const result = codeResult[0];
        if (!result.success) {
          throw new Error(result.message);
        }

        // Create profile with organization
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: formData.email.trim(),
            full_name: formData.fullName.trim(),
            role: 'user',
            organization_id: result.organization_id
          });

        if (profileError) throw profileError;

        setSuccess('Account created and joined organization successfully! Please check your email to verify your account, then you can sign in.');
      } else {
        // Create profile without organization (they'll need to join one later)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: formData.email.trim(),
            full_name: formData.fullName.trim(),
            role: 'user'
          });

        if (profileError) throw profileError;

        setSuccess('Account created successfully! Please check your email to verify your account. After verification, you can join an organization using a code or invitation.');
      }

      // Clear form
      setFormData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        organizationCode: '',
        agreeToTerms: false
      });

      // Redirect to login after a delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              Create Your Account
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Join an existing organization or create a new one
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={formData.fullName}
                  onChange={handleInputChange('fullName')}
                  required
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email Address"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  required
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  required
                  disabled={loading}
                  helperText="At least 6 characters"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  required
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showOrgCode}
                      onChange={(e) => setShowOrgCode(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="I have an organization code"
                />
              </Grid>

              {showOrgCode && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="6-Digit Organization Code"
                    value={formData.organizationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').substring(0, 6);
                      setFormData(prev => ({ ...prev, organizationCode: value }));
                    }}
                    placeholder="123456"
                    inputProps={{ 
                      maxLength: 6, 
                      style: { textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.3rem' } 
                    }}
                    disabled={loading}
                    helperText="Enter the 6-digit code provided by your organization administrator"
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.agreeToTerms}
                      onChange={handleInputChange('agreeToTerms')}
                      disabled={loading}
                      required
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I agree to the{' '}
                      <Link href="/terms-of-service" target="_blank">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy-policy" target="_blank">
                        Privacy Policy
                      </Link>
                    </Typography>
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5 }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </Grid>
            </Grid>
          </form>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Already have an account?{' '}
              <Link href="/login" sx={{ cursor: 'pointer' }}>
                Sign In
              </Link>
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Need to create a new organization?{' '}
              <Link href="/register" sx={{ cursor: 'pointer' }}>
                Start Organization Trial
              </Link>
            </Typography>
          </Box>

          {/* Help Section */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2" color="info.dark" gutterBottom>
              <strong>How to join an organization:</strong>
            </Typography>
            <Typography variant="body2" color="info.dark">
              • <strong>Have a 6-digit code?</strong> Check the box above and enter it<br/>
              • <strong>Have an invite link?</strong> Click the link first, then create your account<br/>
              • <strong>No code or invite?</strong> Ask your organization administrator<br/>
              • <strong>Creating a new organization?</strong> Use "Start Organization Trial" instead
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
