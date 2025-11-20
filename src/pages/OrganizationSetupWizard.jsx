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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid
} from '@mui/material';
import { CheckCircle as CheckIcon, Business as BusinessIcon, Settings as SettingsIcon, Palette as PaletteIcon } from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

const assetTypes = [
  { value: 'cylinder', label: 'Gas Cylinder', singular: 'Gas Cylinder', plural: 'Gas Cylinders' },
  { value: 'bottle', label: 'Gas Bottle', singular: 'Gas Bottle', plural: 'Gas Bottles' },
  { value: 'tank', label: 'Gas Tank', singular: 'Gas Tank', plural: 'Gas Tanks' },
  { value: 'container', label: 'Container', singular: 'Container', plural: 'Containers' },
  { value: 'asset', label: 'Asset', singular: 'Asset', plural: 'Assets' }
];

const industries = [
  'Gas Distribution',
  'Welding Supply',
  'Medical Gas',
  'Industrial Gas',
  'Food & Beverage',
  'Hospitality',
  'Manufacturing',
  'Healthcare',
  'Agriculture',
  'Other'
];

export default function OrganizationSetupWizard() {
  const navigate = useNavigate();
  const { user, profile, organization, reloadOrganization, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    industry: '',
    assetType: 'cylinder',
    assetDisplayName: 'Gas Cylinder',
    assetDisplayNamePlural: 'Gas Cylinders',
    appName: '',
    primaryColor: '#40B5AD',
    secondaryColor: '#48C9B0',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD'
  });

  const steps = ['Organization Type', 'Asset Configuration', 'Branding', 'Complete'];

  // Redirect if not logged in or no organization
  useEffect(() => {
    if (!authLoading) {
      if (!user || !profile || !organization) {
        logger.log('User not authenticated or no organization, redirecting to login');
        navigate('/login');
      }
    }
  }, [user, profile, organization, authLoading, navigate]);

  // Load existing organization data if available
  useEffect(() => {
    if (organization) {
      setFormData(prev => ({
        ...prev,
        industry: organization.industry || '', // industry may not exist in DB, will be empty string
        assetType: organization.asset_type || 'cylinder',
        assetDisplayName: organization.asset_display_name || 'Gas Cylinder',
        assetDisplayNamePlural: organization.asset_display_name_plural || 'Gas Cylinders',
        appName: organization.app_name || organization.name || '',
        primaryColor: organization.primary_color || '#40B5AD',
        secondaryColor: organization.secondary_color || '#48C9B0'
      }));
    }
  }, [organization]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-update asset display names when asset type changes
      if (field === 'assetType') {
        const selectedAsset = assetTypes.find(a => a.value === value);
        if (selectedAsset) {
          updated.assetDisplayName = selectedAsset.singular;
          updated.assetDisplayNamePlural = selectedAsset.plural;
        }
      }
      
      return updated;
    });
  };

  const handleNext = () => {
    // Validation
    if (step === 0 && !formData.industry) {
      setError('Please select your industry');
      return;
    }
    if (step === 1 && !formData.assetType) {
      setError('Please select an asset type');
      return;
    }
    if (step === 2 && !formData.appName.trim()) {
      setError('Please enter an app name');
      return;
    }

    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleFinish = async () => {
    if (!organization) {
      setError('Organization not found');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updates = {
        asset_type: formData.assetType,
        asset_display_name: formData.assetDisplayName,
        asset_display_name_plural: formData.assetDisplayNamePlural,
        app_name: formData.appName.trim() || organization.name,
        primary_color: formData.primaryColor,
        secondary_color: formData.secondaryColor
      };
      
      // Only include industry if provided (column may not exist in DB)
      if (formData.industry) {
        updates.industry = formData.industry;
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id);

      if (updateError) {
        throw updateError;
      }

      logger.log('✅ Organization setup completed');
      
      // Reload organization data
      if (reloadOrganization) {
        await reloadOrganization();
      }

      // Mark setup as complete (you could add a setup_complete field to organizations table)
      // For now, just redirect to dashboard
      navigate('/home');
    } catch (err) {
      logger.error('Error saving organization setup:', err);
      setError(err.message || 'Failed to save organization settings. Please try again.');
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (!user || !profile || !organization) {
    return null; // Will redirect via useEffect
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Complete Your Organization Setup
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Let's customize your organization to match your business needs
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
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Step 0: Organization Type */}
        {step === 0 && (
          <Box>
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <BusinessIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  What industry are you in?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This helps us customize features for your business
                </Typography>
              </Box>

              <FormControl fullWidth required>
                <InputLabel>Industry</InputLabel>
                <Select
                  value={formData.industry}
                  onChange={handleChange('industry')}
                  label="Industry"
                >
                  {industries.map((industry) => (
                    <MenuItem key={industry} value={industry}>
                      {industry}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select the industry that best describes your business</FormHelperText>
              </FormControl>
            </Stack>
          </Box>
        )}

        {/* Step 1: Asset Configuration */}
        {step === 1 && (
          <Box>
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <SettingsIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  What are you tracking?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose what type of assets you'll be managing
                </Typography>
              </Box>

              <FormControl fullWidth required>
                <InputLabel>Asset Type</InputLabel>
                <Select
                  value={formData.assetType}
                  onChange={handleChange('assetType')}
                  label="Asset Type"
                >
                  {assetTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>This will be used throughout the app to refer to your assets</FormHelperText>
              </FormControl>

              <TextField
                fullWidth
                label="Singular Name"
                value={formData.assetDisplayName}
                onChange={handleChange('assetDisplayName')}
                helperText="How to refer to a single asset (e.g., 'Gas Cylinder')"
              />

              <TextField
                fullWidth
                label="Plural Name"
                value={formData.assetDisplayNamePlural}
                onChange={handleChange('assetDisplayNamePlural')}
                helperText="How to refer to multiple assets (e.g., 'Gas Cylinders')"
              />
            </Stack>
          </Box>
        )}

        {/* Step 2: Branding */}
        {step === 2 && (
          <Box>
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <PaletteIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Customize Your App
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Personalize your organization's branding
                </Typography>
              </Box>

              <TextField
                fullWidth
                required
                label="App Name"
                value={formData.appName}
                onChange={handleChange('appName')}
                placeholder={organization.name}
                helperText="The name shown in your app (defaults to organization name)"
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="color"
                    label="Primary Color"
                    value={formData.primaryColor}
                    onChange={handleChange('primaryColor')}
                    InputLabelProps={{ shrink: true }}
                    helperText="Main brand color"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="color"
                    label="Secondary Color"
                    value={formData.secondaryColor}
                    onChange={handleChange('secondaryColor')}
                    InputLabelProps={{ shrink: true }}
                    helperText="Accent color"
                  />
                </Grid>
              </Grid>

              <Alert severity="info">
                You can change these settings later in your organization settings.
              </Alert>
            </Stack>
          </Box>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Setup Complete! 🎉
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your organization has been configured successfully.
            </Typography>
            <Alert severity="success" sx={{ mt: 3, mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>What's next?</strong><br />
                • Start adding your assets<br />
                • Invite team members<br />
                • Configure additional settings<br />
                • Explore the dashboard
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Navigation Buttons */}
        <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={step === 0 || saving}
          >
            Back
          </Button>
          
          {step < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={saving}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleFinish}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <CheckIcon />}
            >
              {saving ? 'Saving...' : 'Complete Setup'}
            </Button>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}

