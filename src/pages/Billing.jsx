import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { useOwnerAccess } from '../hooks/useOwnerAccess';
import {
  Box, Paper, Typography, Button, Card, CardContent, Grid, Alert,
  LinearProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Divider, Stack, IconButton, List, ListItem,
  ListItemIcon, ListItemText, CardActions, Badge, Tooltip, Switch,
  FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
  FormControl, InputLabel, Select, MenuItem
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
  Download as DownloadIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { usePermissions } from '../context/PermissionsContext';
import { loadStripe } from '@stripe/stripe-js';

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
  
  // If it's already an array, return it
  if (Array.isArray(jsonString)) return jsonString;
  
  // If it's a string that doesn't look like JSON, return default
  if (typeof jsonString === 'string' && !jsonString.trim().startsWith('[') && !jsonString.trim().startsWith('{')) {
    console.warn('Features field contains non-JSON string:', jsonString);
    return defaultValue;
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    // Ensure it's an array
    return Array.isArray(parsed) ? parsed : defaultValue;
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
  if (!plan || !plan.features) {
    return getDefaultFeatureAvailability(plan, featureName);
  }
  
  const features = safeJsonParse(plan.features, []);
  console.log(`Checking feature "${featureName}" for plan "${plan.name}":`, features);
  
  // If features array is empty or invalid, use plan-based logic
  if (!features || features.length === 0) {
    return getDefaultFeatureAvailability(plan, featureName);
  }
  
  // Map feature names to common variations
  const featureMap = {
    'Analytics': ['analytics', 'reports', 'dashboard', 'insights', 'advanced analytics'],
    'Delivery Management': ['delivery', 'shipping', 'logistics', 'management', 'delivery management'],
    'API Access': ['api', 'rest', 'integration', 'webhook', 'api access', 'custom integrations'],
    'Custom Branding': ['branding', 'custom', 'white label', 'logo', 'white-label options'],
    'Priority Support': ['support', 'priority', 'help', 'assistance', 'priority support', 'dedicated support'],
    'Speed': ['speed', 'performance', 'fast', 'optimization'],
    'Security': ['security', 'encryption', 'compliance', 'audit']
  };
  
  const searchTerms = featureMap[featureName] || [featureName.toLowerCase()];
  
  return features.some(feature => {
    if (typeof feature !== 'string') return false;
    return searchTerms.some(term => 
      feature.toLowerCase().includes(term)
    );
  });
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

const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 29,
    features: [
      'Up to 100 customers',
      'Up to 1,000 cylinders',
      'Basic reporting',
      'Email support'
    ],
    stripe_price_id: import.meta.env.VITE_STRIPE_BASIC_PRICE_ID
  },
  pro: {
    name: 'Professional',
    price: 79,
    features: [
      'Up to 500 customers',
      'Up to 5,000 cylinders',
      'Advanced reporting',
      'Priority support',
      'API access'
    ],
    stripe_price_id: import.meta.env.VITE_STRIPE_PRO_PRICE_ID
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Contact Sales',
    features: [
      'Unlimited customers',
      'Unlimited cylinders',
      'Custom integrations',
      'Dedicated support',
      'Custom features'
    ],
    stripe_price_id: null
  }
};

// Luhn algorithm for card number validation
function isValidCardNumber(number) {
  const digits = number.replace(/\D/g, '').split('').reverse().map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = digits[i];
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function isValidExpiryDate(expiry) {
  if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const [month, year] = expiry.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expDate = new Date(2000 + year, month - 1, 1);
  return expDate >= new Date(now.getFullYear(), now.getMonth(), 1);
}

function isValidCVC(cvc) {
  return /^\d{3,4}$/.test(cvc);
}

// Add these validation functions at the top of the file
const validateCardNumber = (number) => {
  const digits = number.replace(/\D/g, '').split('').reverse().map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = digits[i];
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

const validateExpiryDate = (expiry) => {
  if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const [month, year] = expiry.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expDate = new Date(2000 + year, month - 1, 1);
  return expDate >= new Date(now.getFullYear(), now.getMonth(), 1);
};

const validateCVC = (cvc) => {
  return /^\d{3,4}$/.test(cvc);
};

export default function Billing() {
  const { organization, profile } = useAuth();
  const { isOwner } = useOwnerAccess();
  const navigate = useNavigate();
  const { isOrgAdmin } = usePermissions();
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
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [success, setSuccess] = useState('');
  const [cardError, setCardError] = useState('');
  const [billingAddress, setBillingAddress] = useState({
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  });

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
    console.log('Plan selected:', plan);
    
    // For Enterprise plans, redirect to contact page
    if (plan.name.toLowerCase().includes('enterprise')) {
      window.open('/contact', '_blank');
      return;
    }
    
    setSelectedPlan(plan);
    setShowUpgradeDialog(true);
    // Clear form fields when opening dialog
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
    setError('');
    setSuccess('');
  };

  const handleUpgrade = async () => {
    console.log('=== UPGRADE FUNCTION CALLED ===');
    alert('Upgrade process started! Check console for details.');
    console.log('selectedPlan:', selectedPlan);
    console.log('organization:', organization);
    console.log('profile:', profile);
    
    if (!selectedPlan) {
      console.log('No plan selected');
      setError('No plan selected. Please select a plan first.');
      return;
    }
    
    console.log('Upgrade started for plan:', selectedPlan);
    console.log('Organization:', organization);
    
    // Don't allow upgrades for free plans without payment
    if (selectedPlan.price > 0) {
      console.log('Plan has price > 0, proceeding with payment flow');
      setUpgrading(true);
      setError(''); // Clear any previous errors
      
      try {
        console.log('Creating payment intent for amount:', selectedPlan.price * 100);

        const requestBody = {
          amount: selectedPlan.price * 100, // Convert to cents
          currency: 'usd',
          customerId: organization.stripe_customer_id || null, // Can be null
          metadata: {
            organization_id: organization.id,
            organization_name: organization.name,
            organization_email: organization.email || profile?.email,
            organization_slug: organization.slug,
            plan_id: selectedPlan.id,
            plan_name: selectedPlan.name,
            type: 'plan_upgrade'
          }
        };

        console.log('Request body:', requestBody);

        // Check if we're in development mode
        const isDevelopment = import.meta.env.DEV;
        console.log('Environment check:', {
          isDevelopment,
          env: import.meta.env.MODE,
          dev: import.meta.env.DEV
        });
        
        let clientSecret;
        
        if (isDevelopment) {
          console.log('Development mode detected, using development payment flow');
          
          // In development, use mock payment for testing
          console.log('Development: Using mock payment for testing');
          clientSecret = 'pi_mock_secret_' + Date.now();
          
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('Development: Mock payment intent created:', clientSecret);
        } else {
          // Production mode - use actual Netlify function
          console.log('Production mode, using Netlify function');
          
          const response = await fetch('/.netlify/functions/create-payment-intent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          console.log('Payment intent response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Response not ok:', errorText);
            throw new Error(`Payment service unavailable (${response.status}). Please try again later.`);
          }

          const responseData = await response.json();
          console.log('Payment intent response:', responseData);

          const { error } = responseData;
          
          if (error) {
            console.error('Payment intent error:', error);
            throw new Error('Payment service unavailable. Please try again later.');
          }

          clientSecret = responseData.clientSecret;
          
          if (!clientSecret) {
            throw new Error('Payment service error. Please try again later.');
          }
        }

        console.log('Loading Stripe...');
        // Initialize Stripe
        let stripe = null;
        
        if (isDevelopment) {
          // In development, try to load Stripe if key is available, otherwise skip
          if (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
            try {
              const { loadStripe } = await import('@stripe/stripe-js');
              stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
            } catch (error) {
              console.log('Development: Stripe key not available, using mock payment');
            }
          } else {
            console.log('Development: No Stripe key, using mock payment');
          }
        } else {
          // Production mode - Stripe is required
          const { loadStripe } = await import('@stripe/stripe-js');
          stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

          if (!stripe) {
            throw new Error('Payment system failed to load. Please refresh and try again.');
          }
        }

        console.log('Confirming payment...');
        
        let paymentResult;
        
        if (isDevelopment) {
          // In development, simulate successful payment
          console.log('Development: Simulating successful payment');
          paymentResult = {
            paymentIntent: {
              status: 'succeeded',
              customer: 'cus_mock_' + Date.now()
            }
          };
          
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          // Confirm payment with entered card details
          setCardError('');
          if (!validateCardNumber(cardNumber)) {
            setCardError('Invalid card number.');
            return;
          }
          if (!validateExpiryDate(expiryDate)) {
            setCardError('Invalid expiry date.');
            return;
          }
          if (!validateCVC(cvv)) {
            setCardError('Invalid CVC.');
            return;
          }
          if (!cardholderName.trim()) {
            setCardError('Cardholder name is required.');
            return;
          }
          if (!billingAddress.line1.trim() || !billingAddress.city.trim() || 
              !billingAddress.state.trim() || !billingAddress.postalCode.trim() || 
              !billingAddress.country.trim()) {
            setCardError('Complete billing address is required.');
            return;
          }
          paymentResult = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
              card: {
                number: cardNumber.replace(/\s/g, ''),
                exp_month: parseInt(expiryDate.split('/')[0]),
                exp_year: parseInt('20' + expiryDate.split('/')[1]),
                cvc: cvv,
              },
              billing_details: {
                name: cardholderName,
                email: organization.email || profile?.email,
                address: {
                  line1: billingAddress.line1,
                  city: billingAddress.city,
                  state: billingAddress.state,
                  postal_code: billingAddress.postalCode,
                  country: billingAddress.country
                }
              }
            }
          });
        }

        const { error: paymentError, paymentIntent } = paymentResult;

        if (paymentError) {
          console.error('Payment error:', paymentError);
          throw new Error(paymentError.message || 'Payment failed. Please check your card details and try again.');
        }

        console.log('Payment result:', paymentIntent);

        if (paymentIntent.status === 'succeeded') {
          console.log('Payment successful, updating database...');
          // Payment successful, now update the database
          const { error: updateError } = await supabase
            .from('organizations')
            .update({ 
              subscription_plan_id: selectedPlan.id,
              subscription_status: 'active',
              subscription_start_date: new Date().toISOString(),
              max_users: selectedPlan.max_users,
              max_cylinders: selectedPlan.max_cylinders,
              max_customers: selectedPlan.max_customers,
              stripe_customer_id: paymentIntent.customer || organization.stripe_customer_id
            })
            .eq('id', organization.id);

          if (updateError) {
            console.error('Database update error:', updateError);
            throw new Error('Payment successful but failed to update subscription. Please contact support.');
          }

          console.log('Database updated successfully');
          await loadBillingData(); // Refresh data
          setShowUpgradeDialog(false);
          setSelectedPlan(null);
          setSuccess('Payment successful! Your plan has been updated.');
          // Clear form fields
          setCardNumber('');
          setExpiryDate('');
          setCvv('');
          setCardholderName('');
        } else {
          throw new Error('Payment was not successful. Please try again.');
        }

      } catch (error) {
        console.error('Upgrade error:', error);
        setError(error.message || 'Failed to upgrade plan. Please try again.');
      } finally {
        setUpgrading(false);
      }
    } else {
      console.log('Plan is free, proceeding with direct upgrade');
      // Free plan - allow direct upgrade
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
        setSuccess('Plan upgraded successfully!');
      } catch (error) {
        setError(error.message);
      } finally {
        setUpgrading(false);
      }
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

  // Owner-only direct plan change handler
  const handleOwnerPlanChange = async (plan) => {
    if (!organization) return;
    setUpgrading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_plan_id: plan.id,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
          max_users: plan.max_users,
          max_cylinders: plan.max_cylinders,
          max_customers: plan.max_customers
        })
        .eq('id', organization.id);
      if (error) throw error;
      await loadBillingData();
      setShowUpgradeDialog(false);
      setSelectedPlan(null);
      alert('Plan updated directly by owner.');
    } catch (error) {
      setError(error.message);
    } finally {
      setUpgrading(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPlan || selectedPlan === 'enterprise') {
      setError('Invalid plan selected.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create payment intent with Stripe
      const response = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan,
          organizationId: organization.id,
          amount: SUBSCRIPTION_PLANS[selectedPlan].price * 100, // Convert to cents
          currency: 'usd'
        }),
      });

      const { clientSecret, error: paymentError } = await response.json();

      if (paymentError) {
        throw new Error(paymentError);
      }

      // Confirm payment with Stripe
      const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: {
            number: cardNumber.replace(/\s/g, ''),
            exp_month: parseInt(expiryDate.split('/')[0]),
            exp_year: parseInt('20' + expiryDate.split('/')[1]),
            cvc: cvv,
          },
          billing_details: {
            name: cardholderName,
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Update organization subscription
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          subscription_plan: selectedPlan,
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', organization.id);

      if (updateError) {
        throw new Error('Failed to update subscription: ' + updateError.message);
      }

      setSuccess('Plan upgraded successfully!');
      setPaymentDialog(false);
      
      // Refresh organization data
      await loadBillingData();

    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add validation before payment submission
  const validatePaymentForm = () => {
    setCardError('');
    
    if (!isValidCardNumber(cardNumber)) {
      setCardError('Invalid card number.');
      return false;
    }
    if (!isValidExpiryDate(expiryDate)) {
      setCardError('Invalid expiry date.');
      return false;
    }
    if (!isValidCVC(cvv)) {
      setCardError('Invalid CVC.');
      return false;
    }
    if (!cardholderName.trim()) {
      setCardError('Cardholder name is required.');
      return false;
    }
    if (!billingAddress.line1.trim() || !billingAddress.city.trim() || 
        !billingAddress.state.trim() || !billingAddress.postalCode.trim() || 
        !billingAddress.country.trim()) {
      setCardError('Complete billing address is required.');
      return false;
    }
    
    return true;
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

  if (profile?.role === 'owner') {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h2>Billing is not applicable for the platform owner account.</h2>
      </div>
    );
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

        {import.meta.env.DEV && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Development Mode:</strong> Payments are simulated for testing. No actual charges will be made.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

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
                {currentPlan.name.toLowerCase().includes('enterprise') ? (
                  <>
                    Contact Sales
                    <Typography variant="body2" component="span" color="text.secondary">
                      {' '}(Custom Pricing)
                    </Typography>
                  </>
                ) : (
                  <>
                    ${currentPlan.price}/{currentPlan.price_interval}
                    {currentPlan.price === 0 && (
                      <Typography variant="body2" component="span" color="text.secondary">
                        {' '}(Contact Sales)
                      </Typography>
                    )}
                  </>
                )}
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
                      {plan.name.toLowerCase().includes('enterprise') ? (
                        <>
                          Contact Sales
                          <Typography variant="body2" component="span" color="text.secondary">
                            {' '}(Custom Pricing)
                          </Typography>
                        </>
                      ) : (
                        <>
                          ${plan.price}/{plan.price_interval}
                          {plan.price === 0 && (
                            <Typography variant="body2" component="span" color="text.secondary">
                              {' '}(Contact Sales)
                            </Typography>
                          )}
                        </>
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
                          const features = safeJsonParse(plan.features || '[]');
                          if (!Array.isArray(features) || features.length === 0) {
                            return <ListItem><ListItemText primary="Features not available" /></ListItem>;
                          }
                          return features.map((feature, index) => (
                            <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                              <ListItemIcon sx={{ minWidth: 24 }}>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={typeof feature === 'string' ? feature : 'Invalid feature'} />
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
                      onClick={() => {
                        if (plan.name.toLowerCase().includes('enterprise')) {
                          navigate('/contact');
                        } else {
                          handlePlanSelection(plan);
                        }
                      }}
                      disabled={currentPlan?.id === plan.id}
                    >
                      {currentPlan?.id === plan.id ? 'Current Plan' : 
                       plan.name.toLowerCase().includes('enterprise') ? 'Contact Sales' : 'Select Plan'}
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                {selectedPlan ? `Upgrade to ${selectedPlan.name}` : 'Select a Plan'}
              </Typography>
              <IconButton onClick={() => setShowUpgradeDialog(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedPlan && (
              <Box>
                <Typography variant="h6" color="primary" gutterBottom>
                  {selectedPlan.name} - {selectedPlan.name.toLowerCase().includes('enterprise') ? 'Contact Sales' : `$${selectedPlan.price}/${selectedPlan.price_interval}`}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedPlan.name.toLowerCase().includes('enterprise') 
                    ? 'Enterprise plans require custom pricing. Please contact our sales team for a personalized quote.' 
                    : selectedPlan.price === 0 
                      ? 'Contact our sales team for custom pricing.' 
                      : 'This will be charged monthly.'}
                </Typography>
                
                {!selectedPlan.name.toLowerCase().includes('enterprise') && selectedPlan.price > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Payment Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                      <TextField
                        label="Cardholder Name"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        fullWidth
                        required
                        placeholder="John Doe"
                      />
                      <TextField
                        label="Card Number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        fullWidth
                        required
                        inputProps={{ maxLength: 19 }}
                      />
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                          label="Expiry Date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                          placeholder="MM/YY"
                          fullWidth
                          required
                          inputProps={{ maxLength: 5 }}
                        />
                        <TextField
                          label="CVV"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="123"
                          fullWidth
                          required
                          inputProps={{ maxLength: 4 }}
                        />
                      </Box>
                      {cardError && <Alert severity="error">{cardError}</Alert>}
                      <TextField
                        label="Billing Address"
                        value={billingAddress.line1}
                        onChange={(e) => setBillingAddress({ ...billingAddress, line1: e.target.value })}
                        fullWidth
                        margin="normal"
                        required
                      />
                      <TextField
                        label="City"
                        value={billingAddress.city}
                        onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                        fullWidth
                        margin="normal"
                        required
                      />
                      <TextField
                        label="State"
                        value={billingAddress.state}
                        onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                        fullWidth
                        margin="normal"
                        required
                      />
                      <TextField
                        label="Postal Code"
                        value={billingAddress.postalCode}
                        onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                        fullWidth
                        margin="normal"
                        required
                      />
                      <TextField
                        label="Country"
                        value={billingAddress.country}
                        onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                        fullWidth
                        margin="normal"
                        required
                      />
                    </Box>
                  </>
                )}
                
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>Features:</Typography>
                <List dense>
                  {(function() {
                    try {
                      const features = safeJsonParse(selectedPlan.features || '[]');
                      if (!Array.isArray(features) || features.length === 0) {
                        return <ListItem><ListItemText primary="Features not available" /></ListItem>;
                      }
                      return features.map((feature, index) => (
                        <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            <CheckCircleIcon color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={typeof feature === 'string' ? feature : 'Invalid feature'} />
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
            {!selectedPlan && (
              <Typography color="error">
                No plan selected. Please select a plan first.
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setShowUpgradeDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                console.log('=== BUTTON CLICKED - VERSION 2.0 ===');
                console.log('Timestamp:', new Date().toISOString());
                alert('Button clicked! Testing... V2.0');
                console.log('Button clicked!');
                console.log('Button disabled state:', {
                  upgrading,
                  selectedPlan: !!selectedPlan,
                  isEnterprise: selectedPlan?.name.toLowerCase().includes('enterprise'),
                  hasPrice: selectedPlan?.price > 0,
                  cardFields: { cardNumber, expiryDate, cvv, cardholderName },
                  allFieldsFilled: cardNumber && expiryDate && cvv && cardholderName
                });
                handleUpgrade();
              }} 
              variant="contained" 
              disabled={
                upgrading || 
                !selectedPlan || 
                selectedPlan?.name.toLowerCase().includes('enterprise') ||
                (selectedPlan?.price > 0 && (!cardNumber || !expiryDate || !cvv || !cardholderName))
              }
              startIcon={upgrading ? <CircularProgress size={20} /> : <CreditCardIcon />}
            >
              {upgrading ? 'Processing...' : 
               selectedPlan?.name.toLowerCase().includes('enterprise') ? 'Contact Sales' : 'Complete Payment'}
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

        {/* Owner-only plan change UI */}
        {isOwner && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="info">You are logged in as the owner. You can change plans for this organization directly without payment.</Alert>
            <Typography variant="h6" sx={{ mt: 2 }}>Change Plan (Owner Only)</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {plans.map((plan) => (
                <Grid item key={plan.id}>
                  <Button
                    variant={subscription?.subscription_plan_id === plan.id ? 'outlined' : 'contained'}
                    color="secondary"
                    onClick={() => handleOwnerPlanChange(plan)}
                    disabled={subscription?.subscription_plan_id === plan.id}
                  >
                    {plan.name}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Payment Dialog */}
        <Dialog 
          open={paymentDialog} 
          onClose={() => setPaymentDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Payment Information
              </Typography>
              <IconButton onClick={() => setPaymentDialog(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {import.meta.env.DEV && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Development Mode:</strong> This is a test payment. No actual charges will be made.
              </Alert>
            )}
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              You're upgrading to the {SUBSCRIPTION_PLANS[selectedPlan]?.name} plan for ${SUBSCRIPTION_PLANS[selectedPlan]?.price}/month.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Cardholder Name"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                fullWidth
                required
              />

              <TextField
                label="Card Number"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                fullWidth
                required
                inputProps={{ maxLength: 19 }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Expiry Date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  placeholder="MM/YY"
                  fullWidth
                  required
                  inputProps={{ maxLength: 5 }}
                />
                <TextField
                  label="CVV"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                  placeholder="123"
                  fullWidth
                  required
                  inputProps={{ maxLength: 4 }}
                />
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handlePaymentSubmit}
              disabled={loading || !cardNumber || !expiryDate || !cvv || !cardholderName}
              startIcon={loading ? <CircularProgress size={20} /> : <CreditCardIcon />}
            >
              {loading ? 'Processing...' : 'Complete Payment'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}

function formatCardNumber(value) {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = matches && matches[0] || '';
  const parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  if (parts.length) {
    return parts.join(' ');
  } else {
    return v;
  }
}

function formatExpiryDate(value) {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) {
    return v.substring(0, 2) + '/' + v.substring(2, 4);
  }
  return v;
} 