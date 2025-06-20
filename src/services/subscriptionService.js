import { supabase } from '../supabase/client';

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
    const { error } = await supabase
      .from('organizations')
      .update({ subscription_plan: plan })
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
    return SUBSCRIPTION_PLANS;
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