import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, 
  Grid, RadioGroup, FormControlLabel, Radio, Alert,
  Stepper, Step, StepLabel, CircularProgress, Divider,
  InputLabel, Select, MenuItem
} from '@mui/material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 29,
    users: 5,
    customers: 100,
    bottles: 1000,
    features: ['Basic reporting', 'Email support', 'Mobile app access']
  },
  pro: {
    name: 'Pro',
    price: 99,
    users: 15,
    customers: 500,
    bottles: 5000,
    features: ['Advanced reporting', 'Priority support', 'API access', 'Custom branding']
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    users: 999999, // Very high number to represent unlimited
    customers: 999999, // Very high number to represent unlimited
    bottles: 999999, // Very high number to represent unlimited
    features: ['All Pro features', 'Dedicated support', 'Custom integrations', 'SLA guarantee']
  }
};

// Helper function to check if a limit is effectively unlimited
const isUnlimited = (limit) => limit >= 999999;

const steps = ['Choose Plan', 'Organization Details', 'Payment Setup', 'Complete'];

export default function OrganizationSetup() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    subscription_plan: 'basic',
    name: '',
    slug: '',
    domain: ''
  });

  const selectedPlan = SUBSCRIPTION_PLANS[form.subscription_plan];

  useEffect(() => {
    if (profile?.organization_id) {
      navigate('/home');
    }
  }, [profile, navigate]);

  const handlePlanChange = (plan) => {
    setForm(prev => ({ ...prev, subscription_plan: plan }));
  };

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const generateSlug = (name) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name) => {
    handleInputChange('name', name);
    handleInputChange('slug', generateSlug(name));
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Organization name is required';
    if (!form.slug.trim()) return 'Organization slug is required';
    if (form.slug.length < 3) return 'Slug must be at least 3 characters';
    if (!/^[a-z0-9-]+$/.test(form.slug)) return 'Slug can only contain lowercase letters, numbers, and hyphens';
    return null;
  };

  const handleNext = () => {
    if (activeStep === 0) {
      setActiveStep(1);
    } else if (activeStep === 1) {
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }
      setActiveStep(2);
    } else if (activeStep === 2) {
      handleCreateOrganization();
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleCreateOrganization = async () => {
    setLoading(true);
    setError('');

    try {
      // Create organization with trial period
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: form.name,
          slug: form.slug,
          domain: form.domain || null,
          subscription_plan: form.subscription_plan,
          subscription_status: 'trial',
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Fixed 7 days
          max_users: SUBSCRIPTION_PLANS[form.subscription_plan].users,
          max_customers: SUBSCRIPTION_PLANS[form.subscription_plan].customers,
          max_bottles: SUBSCRIPTION_PLANS[form.subscription_plan].bottles
        }])
        .select()
        .single();

      if (orgError) throw orgError;

      // Update user's profile with organization_id and admin role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: org.id,
          role: 'admin'
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setActiveStep(3);
      
      // Redirect to home after a short delay
      setTimeout(() => {
        navigate('/home');
      }, 2000);

    } catch (err) {
      console.error('Error creating organization:', err);
      setError(err.message || 'Failed to create organization');
    } finally {
      setLoading(false);
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
    setForm({ ...form, name });
    
    if (baseSlug) {
      const uniqueSlug = await generateUniqueSlug(baseSlug);
      setForm(prev => ({ ...prev, name, slug: uniqueSlug }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Ensure slug is unique (double-check)
      const finalSlug = await generateUniqueSlug(form.slug);
      
      // Create organization with trial period
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: form.name,
          slug: finalSlug,
          domain: form.domain || null,
          subscription_plan: form.subscription_plan,
          subscription_status: 'trial',
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Fixed 7 days
          max_users: SUBSCRIPTION_PLANS[form.subscription_plan].users,
          max_customers: SUBSCRIPTION_PLANS[form.subscription_plan].customers,
          max_bottles: SUBSCRIPTION_PLANS[form.subscription_plan].bottles
        }])
        .select()
        .single();

      if (orgError) {
        if (orgError.code === '23505' && orgError.message.includes('organizations_slug_key')) {
          throw new Error('This organization name is already taken. Please choose a different name.');
        }
        throw orgError;
      }

      // Update user's profile with organization_id and admin role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: org.id,
          role: 'admin'
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setActiveStep(3);
      
      // Redirect to home after a short delay
      setTimeout(() => {
        navigate('/home');
      }, 2000);

    } catch (err) {
      console.error('Error creating organization:', err);
      setError(err.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Welcome! Let's Set Up Your Organization
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        You're almost ready to start managing your gas cylinders. Just a few quick steps to complete your setup.
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

      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Choose Your Plan
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start with a 7-day free trial. No credit card required.
            </Typography>
            
            <RadioGroup
              value={form.subscription_plan}
              onChange={(e) => handlePlanChange(e.target.value)}
            >
              <Grid container spacing={2}>
                {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                  <Grid item xs={12} md={4} key={key}>
                    <Card 
                      variant={form.subscription_plan === key ? "outlined" : "elevation"}
                      sx={{ 
                        cursor: 'pointer',
                        border: form.subscription_plan === key ? 2 : 1,
                        borderColor: form.subscription_plan === key ? 'primary.main' : 'divider'
                      }}
                      onClick={() => handlePlanChange(key)}
                    >
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {plan.name}
                        </Typography>
                        <Typography variant="h4" color="primary" gutterBottom>
                          ${plan.price}
                          <Typography component="span" variant="body2" color="text.secondary">
                            /month
                          </Typography>
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Up to {isUnlimited(plan.users) ? 'Unlimited' : plan.users} users
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Up to {isUnlimited(plan.customers) ? 'Unlimited' : plan.customers} customers
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Up to {isUnlimited(plan.bottles) ? 'Unlimited' : plan.bottles} bottles
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        {plan.features.map((feature, index) => (
                          <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                            ✓ {feature}
                          </Typography>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {activeStep === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Organization Details
            </Typography>
            
            <TextField
              fullWidth
              label="Organization Name"
              value={form.name}
              onChange={(e) => handleOrgNameChange(e.target.value)}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Organization Slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
              margin="normal"
              required
              helperText="A unique identifier for your organization (auto-generated from name)"
            />
            
            <TextField
              fullWidth
              label="Custom Domain (Optional)"
              value={form.domain}
              onChange={(e) => handleInputChange('domain', e.target.value)}
              margin="normal"
              helperText="You can set up a custom domain later"
            />

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Plan: {selectedPlan.name} - ${selectedPlan.price}/month
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ✓ 7-day free trial included
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ✓ No credit card required to start
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeStep === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Review & Create
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Organization Summary
                </Typography>
                <Typography><strong>Name:</strong> {form.name}</Typography>
                <Typography><strong>Slug:</strong> {form.slug}</Typography>
                <Typography><strong>Plan:</strong> {selectedPlan.name} - ${selectedPlan.price}/month</Typography>
                <Typography><strong>Users:</strong> Up to {isUnlimited(selectedPlan.users) ? 'Unlimited' : selectedPlan.users}</Typography>
                <Typography><strong>Customers:</strong> Up to {isUnlimited(selectedPlan.customers) ? 'Unlimited' : selectedPlan.customers}</Typography>
                <Typography><strong>Bottles:</strong> Up to {isUnlimited(selectedPlan.bottles) ? 'Unlimited' : selectedPlan.bottles}</Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="success.main">
                  ✓ Your 7-day free trial will start immediately
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You can add payment information anytime during the trial
                </Typography>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {activeStep === 3 && (
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom color="success.main">
              Organization Created Successfully!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Your 7-day free trial has started. You'll be redirected to your dashboard shortly.
            </Typography>
            <CircularProgress size={24} />
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={activeStep === 3}
        >
          {activeStep === steps.length - 2 ? 'Create Organization' : 'Next'}
        </Button>
      </Box>
    </Box>
  );
} 