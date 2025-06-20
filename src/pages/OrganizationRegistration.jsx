import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, 
  Alert, CircularProgress, Stepper, Step, StepLabel,
  FormControl, InputLabel, Select, MenuItem, Grid,
  Divider, Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { subscriptionService } from '../services/subscriptionService';

const steps = ['Organization Details', 'Account Setup', 'Trial & Payment'];

export default function OrganizationRegistration() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Organization details
  const [orgData, setOrgData] = useState({
    name: '',
    slug: '',
    domain: '',
    subscription_plan: 'basic'
  });

  // User account details
  const [userData, setUserData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'admin'
  });

  // Trial and payment
  const [trialData, setTrialData] = useState({
    trial_days: 7,
    payment_required: true
  });

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleRegistration();
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
        return orgData.name && orgData.slug;
      case 1:
        return userData.email && userData.password && userData.full_name;
      case 2:
        return true;
      default:
        return false;
    }
  };

  // Generate a unique slug
  const generateUniqueSlug = async (baseSlug) => {
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const { data, error } = await supabase
        .from('organizations')
        .select('slug')
        .eq('slug', slug)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // No organization found with this slug, so it's available
        return slug;
      }
      
      // Slug exists, try with a number suffix
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  };

  // Handle organization name change and auto-generate slug
  const handleOrgNameChange = async (name) => {
    const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setOrgData({ ...orgData, name });
    
    if (baseSlug) {
      const uniqueSlug = await generateUniqueSlug(baseSlug);
      setOrgData(prev => ({ ...prev, name, slug: uniqueSlug }));
    }
  };

  const handleRegistration = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 0. Ensure slug is unique (double-check)
      const finalSlug = await generateUniqueSlug(orgData.slug);
      
      // 1. Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgData.name,
          slug: finalSlug,
          domain: orgData.domain,
          subscription_plan: orgData.subscription_plan,
          subscription_status: 'trial',
          trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          payment_required: trialData.payment_required,
          max_users: 10,
          max_customers: 100,
          max_bottles: 1000
        })
        .select()
        .single();

      if (orgError) {
        if (orgError.code === '23505' && orgError.message.includes('organizations_slug_key')) {
          throw new Error('This organization name is already taken. Please choose a different name.');
        }
        throw orgError;
      }

      // 2. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            role: userData.role,
            organization_id: org.id
          }
        }
      });

      if (authError) throw authError;

      // 3. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          organization_id: org.id
        });

      if (profileError) throw profileError;

      // 4. Set up payment if required
      if (trialData.payment_required) {
        try {
          await subscriptionService.createCustomer({
            email: userData.email,
            name: userData.full_name,
            organization_id: org.id
          });
        } catch (paymentError) {
          console.warn('Payment setup failed:', paymentError);
          // Continue anyway - they can set up payment later
        }
      }

      setSuccess('Organization registered successfully! You can now log in.');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Organization Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Organization Name"
                  value={orgData.name}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  required
                  helperText="The name of your company or organization"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Organization Slug"
                  value={orgData.slug}
                  onChange={(e) => setOrgData({ ...orgData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                  required
                  helperText="A unique identifier for your organization (auto-generated from name)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Domain (Optional)"
                  value={orgData.domain}
                  onChange={(e) => setOrgData({ ...orgData, domain: e.target.value })}
                  helperText="Your company's website domain"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Subscription Plan</InputLabel>
                  <Select
                    value={orgData.subscription_plan}
                    onChange={(e) => setOrgData({ ...orgData, subscription_plan: e.target.value })}
                    label="Subscription Plan"
                  >
                    <MenuItem value="basic">
                      <Box>
                        <Typography variant="body1">Basic</Typography>
                        <Typography variant="caption" color="text.secondary">
                          $29/month - 10 users, 100 customers, 1,000 bottles
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="professional">
                      <Box>
                        <Typography variant="body1">Professional</Typography>
                        <Typography variant="caption" color="text.secondary">
                          $99/month - 50 users, 500 customers, 5,000 bottles
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="enterprise">
                      <Box>
                        <Typography variant="body1">Enterprise</Typography>
                        <Typography variant="caption" color="text.secondary">
                          $299/month - Unlimited users, customers, and bottles
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Admin Account Setup
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={userData.full_name}
                  onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={userData.email}
                  onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  required
                  helperText="This will be your login email"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={userData.password}
                  onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                  required
                  helperText="Minimum 8 characters"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={userData.role}
                    onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                    label="Role"
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Trial & Payment Setup
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Start with a 7-day free trial. You can set up payment later to continue using the service.
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    What's included in your 7-day trial:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <Typography component="li" variant="body2">
                      Full access to all features
                    </Typography>
                    <Typography component="li" variant="body2">
                      {orgData.subscription_plan === 'basic' ? '10 users, 100 customers, 1,000 bottles' : 
                       orgData.subscription_plan === 'professional' ? '50 users, 500 customers, 5,000 bottles' : 
                       'Unlimited users, customers, and bottles'}
                    </Typography>
                    <Typography component="li" variant="body2">
                      Mobile app access
                    </Typography>
                    <Typography component="li" variant="body2">
                      Customer support
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
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
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Register Your Organization
          </Typography>
          
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Set up your gas cylinder management system
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            
            <Box>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{ mr: 1 }}
              >
                Already have an account?
              </Button>
              
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!validateStep(activeStep) || loading}
                endIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {activeStep === steps.length - 1 ? 'Create Organization' : 'Next'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 