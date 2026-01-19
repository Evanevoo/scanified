import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Stack,
  LinearProgress
} from '@mui/material';
import { CheckCircle as CheckIcon, Email as EmailIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { validateInput } from '../utils/security';

export default function CreateOrganization() {
  const navigate = useNavigate();
  const { user, profile, organization, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0); // 0 = form, 1 = email sent, 2 = verification complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    organizationName: '',
    userName: '',
    email: '',
    password: ''
  });
  const [verificationToken, setVerificationToken] = useState(null);
  const [resending, setResending] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const steps = ['Enter Details', 'Verify Email', 'Complete Setup'];

  // Redirect if user is already logged in and has an organization
  useEffect(() => {
    if (!authLoading && user && profile && organization) {
      logger.log('User already has organization, redirecting to dashboard');
      navigate('/home');
    }
  }, [user, profile, organization, authLoading, navigate]);

  // Helper function to detect if we're in development mode
  const isDevelopmentMode = () => {
    // Check if hostname is localhost or 127.0.0.1
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
      return true;
    }
    // Check if we're in a development build (Vite sets DEV to true only in dev mode)
    // In production builds, import.meta.env.DEV is false
    if (import.meta.env.DEV) {
      return true;
    }
    // Check if MODE is explicitly development
    if (import.meta.env.MODE === 'development') {
      return true;
    }
    // Otherwise, we're in production
    return false;
  };

  // Load token from storage if on verification step
  useEffect(() => {
    if (step === 1) {
      const storedToken = sessionStorage.getItem('verification_token') || localStorage.getItem('verification_token');
      if (storedToken) {
        setVerificationToken(storedToken);
      }
    }
  }, [step]);

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
      
      // Use security.js validation for strong passwords
      const passwordValidation = validateInput.validatePassword(formData.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
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
            logger.log('User exists but has no organization, allowing organization creation');
            // Continue with the organization creation process
          }
        }
      } catch (err) {
        // If it's our custom error, re-throw it
        if (err.message.includes('already exists')) {
          throw err;
        }
        // If it's a database error (like missing columns), just log it and continue
        logger.warn('Could not check existing user:', err.message);
        // Continue with organization creation
      }

      // Step 2: Request verification
      logger.log('🔐 Requesting verification for:', formData.email);
      
      const { data: tokenData, error: verifyError } = await supabase.rpc(
        'request_organization_verification',
        {
          p_email: formData.email,
          p_organization_name: formData.organizationName,
          p_user_name: formData.userName
        }
      );

      logger.log('📝 Verification request result:', { 
        success: !verifyError, 
        hasToken: !!tokenData,
        tokenLength: tokenData?.length,
        error: verifyError 
      });

      if (verifyError) {
        logger.error('❌ Verification request failed:', verifyError);
        throw new Error(`Failed to create verification: ${verifyError.message || 'Unknown error'}`);
      }

      if (!tokenData) {
        throw new Error('No verification token received from database');
      }

      // Store token in state for resending
      setVerificationToken(tokenData);

      // Step 2: Store email and token only (NOT password - security risk)
      // Password should never be stored in browser storage
      sessionStorage.setItem('pending_org_email', formData.email);
      sessionStorage.setItem('verification_token', tokenData);
      
      // Store token in localStorage as backup (with expiration)
      const expirationTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      localStorage.setItem('pending_org_email', formData.email);
      localStorage.setItem('verification_token', tokenData);
      localStorage.setItem('verification_expires', expirationTime.toString());
      
      logger.log('💾 Stored in sessionStorage and localStorage:', {
        email: formData.email,
        hasPassword: !!formData.password,
        token: tokenData,
        expiresAt: new Date(expirationTime).toISOString()
      });

      // Step 3: Send verification email
      const isDevelopment = isDevelopmentMode();
      const verificationLink = `${window.location.origin}/verify-organization?token=${tokenData}`;
      
      // Always try to send email, even in development (if using netlify dev)
      let emailSent = false;
      let emailError = null;
      
      try {
        const response = await fetch('/.netlify/functions/send-email', {
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

        if (response.ok) {
          emailSent = true;
          logger.log('✅ Verification email sent successfully');
        } else {
          const result = await response.json().catch(() => ({}));
          emailError = result.error || `HTTP ${response.status}`;
          logger.warn('⚠️ Email service returned error:', emailError);
        }
      } catch (fetchError) {
        emailError = fetchError.message || 'Network error';
        logger.warn('⚠️ Failed to send email:', emailError);
      }

      // In development mode, log the link even if email was sent
      if (isDevelopment) {
        logger.log('🔗 Development Mode - Verification Link:', verificationLink);
        console.log('📧 Email status:', emailSent ? 'Sent' : 'Failed');
        console.log('🔗 Verification Link:', verificationLink);
        if (!emailSent) {
          console.log('💡 To test email sending, run: netlify dev');
        }
      }

      // Move to step 2
      setStep(1);

    } catch (err) {
      logger.error('Error:', err);
      setError(err.message || 'Failed to create organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleCopyVerificationLink = async () => {
    const token = verificationToken || sessionStorage.getItem('verification_token') || localStorage.getItem('verification_token');
    if (!token) return;
    
    const verificationLink = `${window.location.origin}/verify-organization?token=${token}`;
    
    try {
      await navigator.clipboard.writeText(verificationLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy link:', err);
      // Fallback: select the text
      const textArea = document.createElement('textarea');
      textArea.value = verificationLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleResendEmail = async () => {
    if (!verificationToken) {
      // Try to get token from storage
      const storedToken = sessionStorage.getItem('verification_token') || localStorage.getItem('verification_token');
      if (!storedToken) {
        setError('Unable to resend email. Please start the registration process again.');
        return;
      }
      setVerificationToken(storedToken);
    }

    setResending(true);
    setError('');

    try {
      const token = verificationToken || sessionStorage.getItem('verification_token') || localStorage.getItem('verification_token');
      const verificationLink = `${window.location.origin}/verify-organization?token=${token}`;
      
      // Always try to send email
      const response = await fetch('/.netlify/functions/send-email', {
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.log('✅ Verification email resent successfully');
      alert('Verification email sent! Please check your inbox (and spam folder).');
    } catch (emailError) {
      logger.error('Error resending email:', emailError);
      setError('Failed to resend email. The email service may not be configured. Please contact support or try again later.');
    } finally {
      setResending(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '2px solid #000000', borderRadius: '8px' }}>
          <CircularProgress sx={{ mb: 2, color: '#000000' }} />
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            Loading...
          </Typography>
        </Paper>
      </Container>
    );
  }

  // If user already has organization, show redirecting message (will redirect via useEffect)
  if (user && profile && organization) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '2px solid #000000', borderRadius: '8px' }}>
          <CircularProgress sx={{ mb: 2, color: '#000000' }} />
          <Typography variant="body1" sx={{ color: '#6B7280' }}>
            You already have an organization. Redirecting...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8, backgroundColor: '#FFFFFF' }}>
      <Paper elevation={0} sx={{ p: 4, border: '2px solid #000000', borderRadius: '8px' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#000000' }}>
            Create Organization
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            Start your free 14-day trial
          </Typography>
        </Box>

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel sx={{ 
                '& .MuiStepLabel-label': {
                  color: step >= steps.indexOf(label) ? '#000000' : '#6B7280',
                  fontWeight: step >= steps.indexOf(label) ? 600 : 400
                },
                '& .MuiStepIcon-root': {
                  color: step > steps.indexOf(label) ? '#000000' : step === steps.indexOf(label) ? '#000000' : '#E5E7EB',
                  '&.Mui-active': {
                    color: '#000000'
                  },
                  '&.Mui-completed': {
                    color: '#000000'
                  }
                }
              }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              border: '1px solid #EF4444',
              backgroundColor: '#FEE2E2',
              color: '#991B1B'
            }} 
            onClose={() => setError('')}
            action={
              error.includes('already exists') ? (
                <Button 
                  size="small" 
                  onClick={() => window.location.href = '/login'}
                  sx={{
                    color: '#000000',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.05)'
                    }
                  }}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#000000',
                      borderWidth: '2px'
                    },
                    '&:hover fieldset': {
                      borderColor: '#000000',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#000000',
                    }
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#000000'
                  }
                }}
              />

              <TextField
                fullWidth
                label="Your Name"
                value={formData.userName}
                onChange={handleChange('userName')}
                required
                placeholder="e.g., John Doe"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#000000',
                      borderWidth: '2px'
                    },
                    '&:hover fieldset': {
                      borderColor: '#000000',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#000000',
                    }
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#000000'
                  }
                }}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#000000',
                      borderWidth: '2px'
                    },
                    '&:hover fieldset': {
                      borderColor: '#000000',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#000000',
                    }
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#000000'
                  }
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                required
                helperText="At least 6 characters"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#000000',
                      borderWidth: '2px'
                    },
                    '&:hover fieldset': {
                      borderColor: '#000000',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#000000',
                    }
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#000000'
                  }
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ 
                  mt: 2,
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  border: '2px solid #000000',
                  '&:hover': {
                    backgroundColor: '#1F2937',
                    borderColor: '#1F2937',
                  },
                  '&:disabled': {
                    backgroundColor: '#9CA3AF',
                    borderColor: '#9CA3AF',
                  }
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: '#FFFFFF' }} /> : 'Continue'}
              </Button>

              <Typography variant="body2" sx={{ color: '#6B7280', textAlign: 'center' }}>
                Already have an account?{' '}
                <Button 
                  href="/login" 
                  sx={{ 
                    p: 0, 
                    textTransform: 'none',
                    color: '#000000',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Sign in
                </Button>
              </Typography>
            </Stack>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <EmailIcon sx={{ fontSize: 80, color: '#000000', mb: 2 }} />
            
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#000000' }}>
              Check Your Email
            </Typography>
            
            <Typography variant="body1" sx={{ color: '#6B7280', mb: 1 }}>
              We've sent a verification link to:
            </Typography>
            
            <Typography variant="body1" sx={{ fontWeight: 700, color: '#000000', mb: 2 }}>
              {formData.email}
            </Typography>
            
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
              Click the link in the email to verify your address and complete the setup.
              The link will expire in 24 hours.
            </Typography>

            <Alert severity="info" sx={{ 
              mt: 3, 
              textAlign: 'left',
              border: '1px solid #000000',
              backgroundColor: '#F9FAFB',
              color: '#000000'
            }}>
              <Typography variant="body2" sx={{ color: '#000000' }}>
                <strong>Didn't receive the email?</strong>
                <br />
                • Check your spam folder
                <br />
                • Make sure you entered the correct email address
                <br />
                • Wait a few minutes and try again
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={handleResendEmail}
                disabled={resending}
                sx={{ 
                  minWidth: 150,
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  border: '2px solid #000000',
                  '&:hover': {
                    backgroundColor: '#1F2937',
                    borderColor: '#1F2937',
                  },
                  '&:disabled': {
                    backgroundColor: '#9CA3AF',
                    borderColor: '#9CA3AF',
                  }
                }}
              >
                {resending ? <CircularProgress size={24} sx={{ color: '#FFFFFF' }} /> : 'Resend Email'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.location.href = '/login'}
                sx={{
                  border: '2px solid #000000',
                  color: '#000000',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#000000',
                    color: '#FFFFFF',
                    borderColor: '#000000',
                  }
                }}
              >
                Back to Login
              </Button>
            </Stack>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon sx={{ fontSize: 80, color: '#000000', mb: 2 }} />
            
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#000000' }}>
              Email Verified!
            </Typography>
            
            <Typography variant="body1" sx={{ color: '#6B7280', mb: 3 }}>
              Your organization has been created successfully.
            </Typography>

            <Button
              variant="contained"
              href="/login"
              sx={{ 
                mt: 2,
                backgroundColor: '#000000',
                color: '#FFFFFF',
                fontWeight: 600,
                border: '2px solid #000000',
                '&:hover': {
                  backgroundColor: '#1F2937',
                  borderColor: '#1F2937',
                }
              }}
            >
              Continue to Dashboard
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}


