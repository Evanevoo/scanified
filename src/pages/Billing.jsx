import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, Card, CardContent, Grid, Alert,
  LinearProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Divider, Stack, IconButton, List, ListItem,
  ListItemIcon, ListItemText, CardActions, Badge, Tooltip, Switch,
  FormControlLabel, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  Support as SupportIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  People as PeopleIcon,
  LocalShipping as LocalShippingIcon,
  Analytics as AnalyticsIcon,
  Api as ApiIcon,
  Palette as PaletteIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

// Helper function to check if a limit is effectively unlimited
const isUnlimited = (limit) => limit === -1 || limit >= 999999;

// Helper function to safely format numbers
const safeToLocaleString = (value) => {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString();
};

// Helper function to safely parse JSON
const safeJsonParse = (jsonString, defaultValue = []) => {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', jsonString, error);
    return defaultValue;
  }
};

// Define default values for plans as a fallback
const planDefaults = {
  starter: { max_customers: 100 },
  professional: { max_customers: 500 },
  enterprise: { max_customers: -1 } // -1 signifies Unlimited
};

const getPlanTier = (plan) => {
  if (!plan || !plan.name) return 'starter';
  const name = plan.name.toLowerCase();
  if (name.includes('enterprise')) return 'enterprise';
  if (name.includes('professional')) return 'professional';
  if (name.includes('starter')) return 'starter';
  // Fallback based on price if name is ambiguous
  if (plan.price > 50) return 'enterprise';
  if (plan.price > 10) return 'professional';
  return 'starter';
};

// Helper function to check if a plan has a specific feature
const hasFeature = (plan, featureName) => {
  const features = safeJsonParse(plan.features, []);
  console.log(`Checking feature "${featureName}" for plan "${plan.name}":`, features);
  
  // If features array is empty or invalid, use plan-based logic
  if (!features || features.length === 0) {
    return getDefaultFeatureAvailability(plan, featureName);
  }
  
  // Map feature names to common variations
  const featureMap = {
    'Analytics': ['analytics', 'reports', 'dashboard', 'insights'],
    'Delivery Management': ['delivery', 'shipping', 'logistics', 'management'],
    'API Access': ['api', 'rest', 'integration', 'webhook'],
    'Custom Branding': ['branding', 'custom', 'white label', 'logo'],
    'Priority Support': ['support', 'priority', 'help', 'assistance'],
    'Speed': ['speed', 'performance', 'fast', 'optimization'],
    'Security': ['security', 'encryption', 'compliance', 'audit']
  };
  
  const searchTerms = featureMap[featureName] || [featureName.toLowerCase()];
  
  return features.some(feature => 
    searchTerms.some(term => 
      feature.toLowerCase().includes(term)
    )
  );
};

// Helper function to determine feature availability based on plan tier
const getDefaultFeatureAvailability = (plan, featureName) => {
  const planName = plan.name?.toLowerCase() || '';
  
  // Define feature availability by plan tier
  const featureAvailability = {
    'Analytics': {
      'starter': false,
      'professional': true,
      'enterprise': true
    },
    'Delivery Management': {
      'starter': false,
      'professional': true,
      'enterprise': true
    },
    'API Access': {
      'starter': false,
      'professional': true,
      'enterprise': true
    },
    'Custom Branding': {
      'starter': false,
      'professional': false,
      'enterprise': true
    },
    'Priority Support': {
      'starter': false,
      'professional': false,
      'enterprise': true
    },
    'Speed': {
      'starter': false,
      'professional': true,
      'enterprise': true
    },
    'Security': {
      'starter': true,
      'professional': true,
      'enterprise': true
    }
  };
  
  const availability = featureAvailability[featureName];
  if (!availability) return false;
  
  // Check if plan name contains any of the tier keywords
  if (planName.includes('starter')) return availability.starter;
  if (planName.includes('professional')) return availability.professional;
  if (planName.includes('enterprise')) return availability.enterprise;
  
  // Default based on price tier
  if (plan.price === 0) return availability.starter;
  if (plan.price < 50) return availability.professional;
  return availability.enterprise;
};

export default function Billing() {
  const { organization, profile } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [reactivateDialog, setReactivateDialog] = useState(false);

  useEffect(() => {
    if (organization) {
      loadBillingData();
    }
  }, [organization]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      
      // Load subscription plans from database
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (plansError) throw plansError;
      console.log('Loaded subscription plans:', plansData);
      setPlans(plansData);

      // Load current subscription
      const { data: subData, error: subError } = await supabase
        .from('organizations')
        .select(`
          subscription_plan_id,
          subscription_status,
          subscription_start_date,
          subscription_end_date,
          trial_start_date,
          trial_end_date
        `)
        .eq('id', organization.id)
        .single();

      if (subError) throw subError;
      setSubscription(subData);

      // Load usage data
      const { data: usageData, error: usageError } = await supabase
        .from('organizations')
        .select('max_users, max_cylinders, max_customers')
        .eq('id', organization.id)
        .single();

      if (usageError) throw usageError;

      // Get current usage counts separately
      const { count: currentUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);

      const { count: currentCylinders } = await supabase
        .from('cylinders')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);

      const { count: currentCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);

      setUsage({
        ...usageData,
        current_users: currentUsers || 0,
        current_cylinders: currentCylinders || 0,
        current_customers: currentCustomers || 0
      });

    } catch (error) {
      console.error('Error loading billing data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelection = (plan) => {
    setSelectedPlan(plan);
    setShowUpgradeDialog(true);
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    
    setUpgrading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ 
          subscription_plan_id: selectedPlan.id,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
          max_users: selectedPlan.max_users,
          max_cylinders: selectedPlan.max_cylinders,
          max_customers: selectedPlan.max_customers
        })
        .eq('id', organization.id);

      if (error) throw error;

      await loadBillingData(); // Refresh data
      setShowUpgradeDialog(false);
      setSelectedPlan(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ 
          subscription_status: 'cancelled',
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
        .eq('id', organization.id);

      if (error) throw error;

      await loadBillingData();
      setCancelDialog(false);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ 
          subscription_status: 'active',
          subscription_end_date: null
        })
        .eq('id', organization.id);

      if (error) throw error;

      await loadBillingData();
      setReactivateDialog(false);
    } catch (error) {
      setError(error.message);
    }
  };

  const getTrialDaysRemaining = () => {
    if (!organization?.trial_end_date) return 0;
    const end = new Date(organization.trial_end_date);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isTrialExpired = () => {
    return getTrialDaysRemaining() <= 0;
  };

  const getCurrentPlan = () => {
    if (!subscription?.subscription_plan_id) return null;
    return plans.find(plan => plan.id === subscription.subscription_plan_id) || null;
  };

  const getUsagePercentage = (current, max) => {
    if (isUnlimited(max)) return 0;
    return Math.min((current / max) * 100, 100);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!organization) {
    return <Alert severity="error">No organization found.</Alert>;
  }

  const currentPlan = getCurrentPlan();
  const isSubscriptionActive = subscription?.subscription_status === 'active';
  const isSubscriptionCancelled = subscription?.subscription_status === 'cancelled';
  const trialDaysRemaining = getTrialDaysRemaining();
  const isOnTrial = subscription?.subscription_status === 'trial';

  return (
    <Box maxWidth="lg" mx="auto" mt={8} mb={4}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4, bgcolor: 'background.default' }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={4}>
          <IconButton color="primary" onClick={() => navigate('/settings')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={700}>
            Billing & Subscription
          </Typography>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Trial Status */}
        {isOnTrial && (
          <Card sx={{ mb: 4, bgcolor: trialDaysRemaining <= 3 ? 'warning.light' : 'info.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ScheduleIcon color={trialDaysRemaining <= 3 ? 'warning' : 'info'} />
                <Box flex={1}>
                  <Typography variant="h6">
                    {trialDaysRemaining > 0 ? 'Trial Period' : 'Trial Expired'}
                  </Typography>
                  <Typography variant="body2">
                    {trialDaysRemaining > 0 
                      ? `${trialDaysRemaining} days remaining in your free trial`
                      : 'Your trial has expired. Please select a plan to continue.'
                    }
                  </Typography>
                  {trialDaysRemaining <= 3 && trialDaysRemaining > 0 && (
                    <Typography variant="body2" color="warning.dark" sx={{ mt: 1 }}>
                      ⚠️ Your trial expires soon. Select a plan to avoid service interruption.
                    </Typography>
                  )}
                </Box>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => setShowUpgradeDialog(true)}
                >
                  Select Plan
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Current Subscription Status */}
        {currentPlan && (
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Current Plan</Typography>
                <Chip 
                  label={isSubscriptionActive ? 'Active' : subscription?.subscription_status || 'Unknown'}
                  color={isSubscriptionActive ? 'success' : 'warning'}
                />
              </Box>
              
              <Typography variant="h4" color="primary" gutterBottom>
                {currentPlan.name}
              </Typography>
              
              <Typography variant="h6" color="text.secondary" gutterBottom>
                ${currentPlan.price}/{currentPlan.price_interval}
                {currentPlan.price === 0 && ' (Contact Sales)'}
              </Typography>
              
              {isSubscriptionCancelled && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Your subscription has been cancelled and will end on {new Date(subscription.subscription_end_date).toLocaleDateString()}.
                  <Button 
                    variant="outlined" 
                    size="small" 
                    sx={{ ml: 2 }}
                    onClick={() => setReactivateDialog(true)}
                  >
                    Reactivate
                  </Button>
                </Alert>
              )}

              {/* Usage Statistics */}
              {usage && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>Usage</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">Users</Typography>
                      <Typography variant="h6">
                        {usage.current_users || 0} / {isUnlimited(currentPlan.max_users) ? '∞' : currentPlan.max_users}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={getUsagePercentage(usage.current_users || 0, currentPlan.max_users)}
                        sx={{ mt: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">Cylinders</Typography>
                      <Typography variant="h6">
                        {usage.current_cylinders || 0} / {isUnlimited(currentPlan.max_cylinders) ? '∞' : currentPlan.max_cylinders}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={getUsagePercentage(usage.current_cylinders || 0, currentPlan.max_cylinders)}
                        sx={{ mt: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">Customers</Typography>
                      <Typography variant="h6">
                        {usage.current_customers || 0} / {isUnlimited(currentPlan.max_customers) ? '∞' : currentPlan.max_customers}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={getUsagePercentage(usage.current_customers || 0, currentPlan.max_customers)}
                        sx={{ mt: 1 }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              <CardActions sx={{ mt: 2, justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => setCancelDialog(true)}
                  disabled={isSubscriptionCancelled}
                >
                  Cancel Subscription
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={() => setShowUpgradeDialog(true)}
                >
                  Change Plan
                </Button>
              </CardActions>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <Typography variant="h5" gutterBottom>Available Plans</Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {plans.map((plan) => {
            const tier = getPlanTier(plan);
            const displayCustomers = plan.max_customers > 0 ? plan.max_customers : planDefaults[tier].max_customers;

            return (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    position: 'relative',
                    border: currentPlan?.id === plan.id ? 2 : 1,
                    borderColor: currentPlan?.id === plan.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s'
                    }
                  }}
                >
                  {plan.is_most_popular && (
                    <Badge
                      badgeContent="Most Popular"
                      color="primary"
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        '& .MuiBadge-badge': {
                          fontSize: '0.75rem',
                          height: 'auto',
                          padding: '4px 8px'
                        }
                      }}
                    />
                  )}
                  
                  <CardContent sx={{ pb: 1 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Typography variant="h5" fontWeight={600}>
                        {plan.name}
                      </Typography>
                      {plan.is_most_popular && <StarIcon color="primary" />}
                    </Box>
                    
                    <Typography variant="h4" color="primary" gutterBottom>
                      ${plan.price}/{plan.price_interval}
                      {plan.price === 0 && (
                        <Typography variant="body2" component="span" color="text.secondary">
                          {' '}(Contact Sales)
                        </Typography>
                      )}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Up to {isUnlimited(plan.max_users) ? 'unlimited' : plan.max_users} users
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Up to {isUnlimited(plan.max_cylinders) ? 'unlimited' : (plan.max_cylinders || 0).toLocaleString()} cylinders
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Up to {isUnlimited(displayCustomers) ? 'unlimited' : safeToLocaleString(displayCustomers)} customers
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" gutterBottom>Features:</Typography>
                    <List dense sx={{ py: 0 }}>
                      {(function() {
                        try {
                          return safeJsonParse(plan.features || '[]').map((feature, index) => (
                            <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                              <ListItemIcon sx={{ minWidth: 24 }}>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={feature} />
                            </ListItem>
                          ));
                        } catch (error) {
                          console.error('Error parsing plan features:', plan.features, error);
                          return <ListItem><ListItemText primary="Features not available" /></ListItem>;
                        }
                      })()}
                    </List>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button 
                      variant={currentPlan?.id === plan.id ? "outlined" : "contained"}
                      color="primary"
                      fullWidth
                      onClick={() => handlePlanSelection(plan)}
                      disabled={currentPlan?.id === plan.id}
                    >
                      {currentPlan?.id === plan.id ? 'Current Plan' : 'Select Plan'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Plan Comparison */}
        <Accordion sx={{ mb: 4 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Detailed Plan Comparison</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Features</Typography>
              </Grid>
              {plans.map((plan) => (
                <Grid item xs={12} md={3} key={plan.id}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {plan.name}
                  </Typography>
                </Grid>
              ))}
              
              {/* Feature rows */}
              {[
                { name: 'Users', icon: <PeopleIcon /> },
                { name: 'Cylinders', icon: <StorageIcon /> },
                { name: 'Customers', icon: <BusinessIcon /> },
                { name: 'Analytics', icon: <AnalyticsIcon /> },
                { name: 'Delivery Management', icon: <LocalShippingIcon /> },
                { name: 'API Access', icon: <ApiIcon /> },
                { name: 'Custom Branding', icon: <PaletteIcon /> },
                { name: 'Priority Support', icon: <SupportIcon /> },
                { name: 'Speed', icon: <SpeedIcon /> },
                { name: 'Security', icon: <SecurityIcon /> }
              ].map((feature) => (
                <React.Fragment key={feature.name}>
                  <Grid item xs={12} md={3}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {feature.icon}
                      <Typography variant="body2">{feature.name}</Typography>
                    </Box>
                  </Grid>
                  {plans.map((plan) => {
                    const tier = getPlanTier(plan);
                    const displayCustomers = plan.max_customers > 0 ? plan.max_customers : planDefaults[tier].max_customers;
                    return (
                      <Grid item xs={12} md={3} key={plan.id}>
                        <Typography variant="body2" color="text.secondary">
                          {feature.name === 'Users' && (isUnlimited(plan.max_users) ? 'Unlimited' : plan.max_users)}
                          {feature.name === 'Cylinders' && (isUnlimited(plan.max_cylinders) ? 'Unlimited' : (plan.max_cylinders || 0).toLocaleString())}
                          {feature.name === 'Customers' && (isUnlimited(displayCustomers) ? 'Unlimited' : safeToLocaleString(displayCustomers))}
                          {feature.name !== 'Users' && feature.name !== 'Cylinders' && feature.name !== 'Customers' && 
                            (hasFeature(plan, feature.name) ? '✓' : '✗')}
                        </Typography>
                      </Grid>
                    );
                  })}
                </React.Fragment>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Dialogs */}
        <Dialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {selectedPlan ? `Upgrade to ${selectedPlan.name}` : 'Select a Plan'}
          </DialogTitle>
          <DialogContent>
            {selectedPlan && (
              <Box>
                <Typography variant="h6" color="primary" gutterBottom>
                  {selectedPlan.name} - ${selectedPlan.price}/{selectedPlan.price_interval}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedPlan.price === 0 ? 'Contact our sales team for custom pricing.' : 'This will be charged monthly.'}
                </Typography>
                <List dense>
                  {(function() {
                    try {
                      return safeJsonParse(selectedPlan.features || '[]').map((feature, index) => (
                        <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            <CheckCircleIcon color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ));
                    } catch (error) {
                      console.error('Error parsing plan features:', selectedPlan.features, error);
                      return <ListItem><ListItemText primary="Features not available" /></ListItem>;
                    }
                  })()}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowUpgradeDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleUpgrade} 
              variant="contained" 
              disabled={upgrading || !selectedPlan}
            >
              {upgrading ? <CircularProgress size={20} /> : 'Upgrade'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to cancel your subscription? You will lose access at the end of your billing period.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialog(false)}>Keep Subscription</Button>
            <Button onClick={handleCancelSubscription} color="error" variant="contained">
              Cancel Subscription
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={reactivateDialog} onClose={() => setReactivateDialog(false)}>
          <DialogTitle>Reactivate Subscription</DialogTitle>
          <DialogContent>
            <Typography>
              Reactivate your subscription to continue using all features.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReactivateDialog(false)}>Cancel</Button>
            <Button onClick={handleReactivateSubscription} variant="contained">
              Reactivate
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
} 