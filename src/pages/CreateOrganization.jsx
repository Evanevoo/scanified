import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Stack
} from '@mui/material';
import { CheckCircle as CheckIcon, Email as EmailIcon } from '@mui/icons-material';
import { supabase } from '../supabase/client';

export default function CreateOrganization() {
  const [step, setStep] = useState(0); // 0 = form, 1 = email sent, 2 = verification complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    organizationName: '',
    userName: '',
    email: '',
    password: ''
  });

  const steps = ['Enter Details', 'Verify Email', 'Complete Setup'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!formData.organizationName.trim()) {
        throw new Error('Organization name is required');
      }
      if (!formData.userName.trim()) {
        throw new Error('Your name is required');
      }
      if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
        throw new Error('Valid email address is required');
      }
      if (!formData.password || formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Step 1: Check if email already exists
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id, email, organization_id')
          .eq('email', formData.email)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingUser) {
          // Check if user has an organization
          if (existingUser.organization_id) {
            // User exists and has organization - block creation
            throw new Error('An account with this email already exists. Please sign in instead.');
          } else {
            // User exists but no organization - this might be from a failed verification
            // Allow them to continue with organization creation
            console.log('User exists but has no organization, allowing organization creation');
            // Continue with the organization creation process
          }
        }
      } catch (err) {
        // If it's our custom error, re-throw it
        if (err.message.includes('already exists')) {
          throw err;
        }
        // If it's a database error (like missing columns), just log it and continue
        console.warn('Could not check existing user:', err.message);
        // Continue with organization creation
      }

      // Step 2: Request verification
      const { data: tokenData, error: verifyError } = await supabase.rpc(
        'request_organization_verification',
        {
          p_email: formData.email,
          p_organization_name: formData.organizationName,
          p_user_name: formData.userName
        }
      );

      if (verifyError) {
        throw verifyError;
      }

      // Step 2: Store password temporarily in sessionStorage AND localStorage as backup
      sessionStorage.setItem('pending_org_password', formData.password);
      sessionStorage.setItem('pending_org_email', formData.email);
      sessionStorage.setItem('verification_token', tokenData);
      
      // Also store in localStorage as backup (with expiration)
      const expirationTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      localStorage.setItem('pending_org_password', formData.password);
      localStorage.setItem('pending_org_email', formData.email);
      localStorage.setItem('verification_token', tokenData);
      localStorage.setItem('verification_expires', expirationTime.toString());
      
      console.log('💾 Stored in sessionStorage and localStorage:', {
        email: formData.email,
        hasPassword: !!formData.password,
        token: tokenData,
        expiresAt: new Date(expirationTime).toISOString()
      });

      // Step 3: Send verification email
      try {
        const verificationLink = `${window.location.origin}/verify-organization?token=${tokenData}`;
        
        await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: formData.email,
            subject: `Verify your email to create ${formData.organizationName}`,
            template: 'verify-organization',
            data: {
              verificationLink,
              organizationName: formData.organizationName,
              userName: formData.userName
            }
          })
        });
        
        console.log('✅ Verification email sent');
      } catch (emailError) {
        console.warn('⚠️ Email service unavailable:', emailError);
        // Continue anyway - user can manually verify
      }

      // Move to step 2
      setStep(1);

    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to create organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Create Organization
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start your free 14-day trial
          </Typography>
        </Box>

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }} 
            onClose={() => setError('')}
            action={
              error.includes('already exists') ? (
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => window.location.href = '/login'}
                >
                  Sign In Instead
                </Button>
              ) : null
            }
          >
            {error}
          </Alert>
        )}

        {step === 0 && (
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Organization Name"
                value={formData.organizationName}
                onChange={handleChange('organizationName')}
                required
                autoFocus
                placeholder="e.g., Acme Corporation"
              />

              <TextField
                fullWidth
                label="Your Name"
                value={formData.userName}
                onChange={handleChange('userName')}
                required
                placeholder="e.g., John Doe"
              />

              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                required
                placeholder="you@company.com"
                helperText="We'll send a verification link to this email"
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                required
                helperText="At least 6 characters"
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Continue'}
              </Button>

              <Typography variant="body2" color="text.secondary" textAlign="center">
                Already have an account?{' '}
                <Button href="/login" sx={{ p: 0, textTransform: 'none' }}>
                  Sign in
                </Button>
              </Typography>
            </Stack>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <EmailIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Check Your Email
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              We've sent a verification link to:
            </Typography>
            
            <Typography variant="body1" fontWeight="bold" paragraph>
              {formData.email}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Click the link in the email to verify your address and complete the setup.
              The link will expire in 24 hours.
            </Typography>

            <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>Didn't receive the email?</strong>
                <br />
                • Check your spam folder
                <br />
                • Make sure you entered the correct email address
                <br />
                • Wait a few minutes and try again
              </Typography>
            </Alert>

            <Button
              variant="outlined"
              onClick={() => window.location.href = '/login'}
              sx={{ mt: 3 }}
            >
              Back to Login
            </Button>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Email Verified!
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              Your organization has been created successfully.
            </Typography>

            <Button
              variant="contained"
              href="/login"
              sx={{ mt: 2 }}
            >
              Continue to Dashboard
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}


