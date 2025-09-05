import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, 
  Alert, CircularProgress, Divider, Link, Container,
  Stepper, Step, StepLabel, Grid
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Person as PersonIcon
} from '@mui/icons-material';

const steps = ['Verify Invite', 'Create Account', 'Complete Setup'];

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [invite, setInvite] = useState(null);
  const [organization, setOrganization] = useState(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    password: '',
    confirmPassword: ''
  });

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No invite token provided');
      setLoading(false);
      return;
    }

    verifyInvite();
  }, [token]);

  const verifyInvite = async () => {
    try {
      // Get invite details
      const { data: inviteData, error: inviteError } = await supabase
        .from('organization_invites')
        .select(`
          *,
          organization:organizations(name, slug)
        `)
        .eq('token', token)
        .single();

      if (inviteError) {
        if (inviteError.code === 'PGRST116') {
          throw new Error('Invalid invite link. Please check the URL and try again.');
        }
        throw inviteError;
      }

      if (inviteData.accepted_at) {
        throw new Error('This invite has already been accepted.');
      }

      if (new Date(inviteData.expires_at) < new Date()) {
        throw new Error('This invite has expired. Please request a new invite.');
      }

      // Fetch the role name if it's a role ID
      let roleName = inviteData.role;
      if (inviteData.role && inviteData.role.includes('-')) {
        // This looks like a UUID, fetch the role name
        const { data: roleData } = await supabase
          .from('roles')
          .select('name')
          .eq('id', inviteData.role)
          .single();
        
        if (roleData) {
          roleName = roleData.name;
        }
      }

      setInvite({ ...inviteData, role: roleName });
      setOrganization(inviteData.organization);

      // Check if the email is already registered in any organization
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('email, organization_id, organizations(name)')
        .eq('email', inviteData.email)
        .single();

      if (existingProfile) {
        if (existingProfile.organization_id) {
          throw new Error(`This email (${inviteData.email}) is already registered with organization "${existingProfile.organizations?.name}". Each email can only be associated with one organization. Please use a different email address or contact the organization administrator.`);
        }
      }

      // If user is already logged in, check if they can accept this invite
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, organization_id')
          .eq('id', user.id)
          .single();

        if (profile) {
          if (profile.email.toLowerCase() !== inviteData.email.toLowerCase()) {
            throw new Error(`This invite was sent to ${inviteData.email}, but you are logged in as ${profile.email}. Please log out and sign in with the correct email.`);
          }

          if (profile.organization_id) {
            throw new Error('You are already a member of an organization. You cannot accept multiple invites.');
          }
        }
      }

      setActiveStep(0);
    } catch (error) {
      console.error('Error verifying invite:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleAcceptInvite();
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        return invite && !invite.accepted_at && new Date(invite.expires_at) > new Date();
      case 1:
        if (user) {
          // If user is already logged in, only require full name
          return formData.full_name && formData.full_name.trim().length > 0;
        } else {
          // If user needs to sign up, require all fields
          return formData.full_name && formData.password && formData.password === formData.confirmPassword;
        }
      case 2:
        return true;
      default:
        return false;
    }
  };

  const handleAcceptInvite = async () => {
    setLoading(true);
    setError('');

    try {
      if (!user) {
        // User needs to sign up first
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: invite.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name,
              role: invite.role,
              organization_id: invite.organization_id
            },
            emailRedirectTo: `${window.location.origin}/login`,
            emailConfirm: false // Disable email confirmation for invite signups
          }
        });

        if (authError) {
          // Handle specific email confirmation errors
          if (authError.message.includes('email confirmation')) {
            throw new Error('Email confirmation failed. Please try again or contact support.');
          }
          throw authError;
        }

        // Check if we need to wait for email confirmation
        if (!authData.session) {
          // User needs to confirm email, but we'll proceed anyway for invite signups
          console.log('User needs email confirmation, but proceeding with invite acceptance');
        }

        // Check if profile already exists for this user
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .single();

        if (existingProfile) {
          // Update existing profile
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: formData.full_name,
              role: invite.role, // Store the role name
              organization_id: invite.organization_id
            })
            .eq('id', authData.user.id);

          if (profileError) throw profileError;
        } else {
          // Create new profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: invite.email,
              full_name: formData.full_name,
              role: invite.role, // Store the role name
              organization_id: invite.organization_id
            });

          if (profileError) throw profileError;
        }
      } else {
        // Only allow if the logged-in user's email matches the invite email
        if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
          throw new Error(
            `This invite was sent to ${invite.email}, but you are logged in as ${user.email}. Please log out and sign in with the correct email.`
          );
        }
        // Now it's safe to update the profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            role: invite.role,
            organization_id: invite.organization_id
          })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // Accept the invite by updating the invite record directly
      const { error: acceptError } = await supabase
        .from('organization_invites')
        .update({
          accepted_at: new Date().toISOString()
        })
        .eq('token', token);

      if (acceptError) throw acceptError;

      setSuccess(`Welcome to ${organization.name}! You have successfully joined the organization.`);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error accepting invite:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && !invite) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button variant="contained" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Accept Organization Invite
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary">
          Join {organization?.name} and start managing your gas cylinders
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Invite Details
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Organization
                      </Typography>
                      <Typography variant="body1">
                        {organization?.name}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Invited Email
                      </Typography>
                      <Typography variant="body1">
                        {invite?.email}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Role
                      </Typography>
                                        <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {invite?.role || 'User'}
                  </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Status
                      </Typography>
                      <Typography variant="body1" color="success.main">
                        Valid
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  This invite expires on {new Date(invite?.expires_at).toLocaleDateString()}. 
                  Please complete your registration to join the organization.
                </Typography>
              </Alert>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Create Your Account
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    helperText="Enter your full name as it should appear in the system"
                  />
                </Grid>
                
                {!user && (
                  <>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        helperText="Create a strong password for your account"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Confirm Password"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                        error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
                        helperText={
                          formData.password !== formData.confirmPassword && formData.confirmPassword !== ''
                            ? 'Passwords do not match'
                            : 'Confirm your password'
                        }
                      />
                    </Grid>
                  </>
                )}
              </Grid>

              {user && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    You are already logged in as {user.email}. Your account will be linked to the organization.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Review & Complete
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" gutterBottom>
                  Please review your information before joining the organization:
                </Typography>
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Organization: {organization?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Email: {invite?.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Role: {invite?.role || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Name: {formData.full_name}
                  </Typography>
                </Box>
              </Box>

              <Alert severity="success">
                <Typography variant="body2">
                  Click "Join Organization" to complete your registration and start using the system.
                </Typography>
              </Alert>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!validateStep(activeStep) || loading}
              endIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {activeStep === steps.length - 1 ? 'Join Organization' : 'Next'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
} 