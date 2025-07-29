import { supabase } from '../supabase/client';

// Cache for subscription plans to avoid repeated database calls
let cachedPlans = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const fetchSubscriptionPlans = async () => {
  // Check if cache is valid
  if (cachedPlans && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    return cachedPlans;
  }

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) throw error;

    // Convert to legacy format for compatibility
    const plansObject = {};
    (data || []).forEach(plan => {
      const key = plan.name.toLowerCase().replace(/\s+/g, '');
      plansObject[key] = {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        users: plan.max_users || 999999,
        customers: plan.max_customers || 999999,
        bottles: plan.max_cylinders || 999999,
        features: Array.isArray(plan.features) ? plan.features : []
      };
    });

    // Update cache
    cachedPlans = plansObject;
    cacheTimestamp = Date.now();
    
    return plansObject;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    // Return fallback plans if database fetch fails
    return {
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
        users: 999999,
        customers: 999999,
        bottles: 999999,
        features: ['All Pro features', 'Dedicated support', 'Custom integrations', 'SLA guarantee']
      }
    };
  }
};

// Function to clear cache when plans are updated
export const clearPlansCache = () => {
  cachedPlans = null;
  cacheTimestamp = null;
};

// Helper function to check if a limit is effectively unlimited
const isUnlimited = (limit) => limit >= 999999;

export const subscriptionService = {
  async createSubscription(organizationId, plan, paymentMethodId) {
    // Call your backend API to create Stripe subscription
    const response = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        plan,
        paymentMethodId
      })
    });
    
    return response.json();
  },

  async getSubscription(organizationId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('subscription_plan, subscription_status, subscription_end_date')
      .eq('id', organizationId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateSubscription(organizationId, plan) {
    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (orgError) throw orgError;

    // Get plan details from database
    const plans = await fetchSubscriptionPlans();
    const planDetails = plans[plan];
    if (!planDetails) throw new Error('Invalid plan');

    // Check if payment is required
    if (planDetails.price > 0) {
      // Check if organization has payment method
      if (!organization.stripe_customer_id) {
        throw new Error('Please add a payment method before upgrading your plan.');
      }

      // Create payment intent for the plan upgrade
      const response = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: planDetails.price * 100, // Convert to cents
          currency: 'usd',
          customerId: organization.stripe_customer_id,
          metadata: {
            organization_id: organizationId,
            plan: plan,
            plan_name: planDetails.name,
            type: 'plan_upgrade'
          }
        }),
      });

      const { clientSecret, error } = await response.json();
      
      if (error) {
        throw new Error(error);
      }

      // Initialize Stripe
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Confirm payment
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: null, // Will use default payment method
          billing_details: {
            name: organization.name,
            email: organization.email
          }
        }
      });

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment was not successful');
      }
    }

    // Payment successful (or free plan), now update the database
    const { error } = await supabase
      .from('organizations')
      .update({ 
        subscription_plan: plan,
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        max_users: planDetails.users,
        max_customers: planDetails.customers,
        max_bottles: planDetails.bottles,
        ...(planDetails.price > 0 && {
          last_payment_date: new Date().toISOString(),
          last_payment_amount: planDetails.price
        })
      })
      .eq('id', organizationId);
    
    if (error) throw error;
  },

  async getOrganizationUsage(organizationId) {
    const { data, error } = await supabase
      .from('organization_usage')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async checkOrganizationLimits(organizationId, resourceType) {
    const usage = await this.getOrganizationUsage(organizationId);
    
    switch (resourceType) {
      case 'users':
        return {
          current: usage.current_users,
          max: usage.max_users,
          percentage: usage.user_usage_percent,
          canAdd: usage.current_users < usage.max_users
        };
      case 'customers':
        return {
          current: usage.current_customers,
          max: usage.max_customers,
          percentage: usage.customer_usage_percent,
          canAdd: usage.current_customers < usage.max_customers
        };
      case 'bottles':
        return {
          current: usage.current_bottles,
          max: isUnlimited(usage.max_bottles) ? 'Unlimited' : usage.max_bottles,
          percentage: usage.bottle_usage_percent,
          canAdd: isUnlimited(usage.max_bottles) || usage.current_bottles < usage.max_bottles
        };
      default:
        throw new Error('Invalid resource type');
    }
  },

  async getSubscriptionPlans() {
    return await fetchSubscriptionPlans();
  },

  async cancelSubscription(organizationId) {
    const { error } = await supabase
      .from('organizations')
      .update({ 
        subscription_status: 'cancelled',
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })
      .eq('id', organizationId);
    
    if (error) throw error;
  },

  async reactivateSubscription(organizationId) {
    const { error } = await supabase
      .from('organizations')
      .update({ 
        subscription_status: 'active',
        subscription_end_date: null
      })
      .eq('id', organizationId);
    
    if (error) throw error;
  }
}; 