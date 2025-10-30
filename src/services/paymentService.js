import logger from '../utils/logger';
import { supabase } from '../supabase/client';

// Stripe configuration (use Vite's import.meta.env for environment variables)
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const STRIPE_SECRET_KEY = import.meta.env.VITE_STRIPE_SECRET_KEY;

export const paymentService = {
  // Initialize Stripe
  async initializeStripe() {
    if (typeof window !== 'undefined' && !window.Stripe) {
      const { loadStripe } = await import('@stripe/stripe-js');
      return loadStripe(STRIPE_PUBLISHABLE_KEY);
    }
    return window.Stripe(STRIPE_PUBLISHABLE_KEY);
  },

  // Create a payment intent for one-time payments
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      const response = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          metadata
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw error;
    }
  },

  // Create a subscription
  async createSubscription(priceId, customerId, metadata = {}) {
    try {
      const response = await fetch('/.netlify/functions/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          customerId,
          metadata
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  },

  // Process payment for organization
  async processOrganizationPayment(organizationId, paymentMethodId, amount) {
    try {
      const { data: organization } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(amount, 'usd', {
        organization_id: organizationId,
        organization_name: organization.name
      });

      // Update organization with payment method
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          payment_method_id: paymentMethodId,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString()
        })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      return paymentIntent;
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw error;
    }
  },

  // Setup subscription for organization
  async setupSubscription(organizationId, planId) {
    try {
      const { data: organization } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Create Stripe customer if not exists
      let customerId = organization.stripe_customer_id;
      if (!customerId) {
        const customer = await this.createStripeCustomer(organization);
        customerId = customer.id;
      }

      // Create subscription
      const subscription = await this.createSubscription(planId, customerId, {
        organization_id: organizationId,
        organization_name: organization.name
      });

      // Update organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString()
        })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      return subscription;
    } catch (error) {
      logger.error('Error setting up subscription:', error);
      throw error;
    }
  },

  // Create Stripe customer
  async createStripeCustomer(organization) {
    try {
      const response = await fetch('/.netlify/functions/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: organization.name,
          email: organization.email,
          metadata: {
            organization_id: organization.id,
            organization_slug: organization.slug
          }
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('Error creating customer:', error);
      throw error;
    }
  },

  // Get payment methods for organization
  async getPaymentMethods(organizationId) {
    try {
      const { data: organization } = await supabase
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', organizationId)
        .single();

      if (!organization?.stripe_customer_id) {
        return [];
      }

      const response = await fetch(`/.netlify/functions/get-payment-methods?customerId=${organization.stripe_customer_id}`);
      const result = await response.json();
      return result.paymentMethods || [];
    } catch (error) {
      logger.error('Error getting payment methods:', error);
      return [];
    }
  },

  // Cancel subscription
  async cancelSubscription(organizationId) {
    try {
      const { data: organization } = await supabase
        .from('organizations')
        .select('stripe_subscription_id')
        .eq('id', organizationId)
        .single();

      if (!organization?.stripe_subscription_id) {
        throw new Error('No subscription found');
      }

      const response = await fetch('/.netlify/functions/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: organization.stripe_subscription_id
        }),
      });

      const result = await response.json();

      // Update organization status
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'cancelled',
          subscription_end_date: new Date().toISOString()
        })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      return result;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  },

  // Get invoice history
  async getInvoiceHistory(organizationId) {
    try {
      const { data: organization } = await supabase
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', organizationId)
        .single();

      if (!organization?.stripe_customer_id) {
        return [];
      }

      const response = await fetch(`/.netlify/functions/get-invoices?customerId=${organization.stripe_customer_id}`);
      const result = await response.json();
      return result.invoices || [];
    } catch (error) {
      logger.error('Error getting invoice history:', error);
      return [];
    }
  }
}; 