import { supabase } from '../supabase/client';

export const usageService = {
  // Get current usage for an organization
  async getOrganizationUsage(organizationId) {
    try {
      // Get user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Get customer count
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Get bottle count
      const { count: bottleCount } = await supabase
        .from('bottles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Get organization limits
      const { data: organization } = await supabase
        .from('organizations')
        .select('max_users, max_customers, max_bottles')
        .eq('id', organizationId)
        .single();

      if (!organization) {
        throw new Error('Organization not found');
      }

      const usage = {
        users: {
          current: userCount || 0,
          max: organization.max_users,
          percentage: Math.round(((userCount || 0) / organization.max_users) * 100)
        },
        customers: {
          current: customerCount || 0,
          max: organization.max_customers,
          percentage: Math.round(((customerCount || 0) / organization.max_customers) * 100)
        },
        bottles: {
          current: bottleCount || 0,
          max: organization.max_bottles,
          percentage: Math.round(((bottleCount || 0) / organization.max_bottles) * 100)
        }
      };

      // Check if any usage is approaching limits
      await this.checkUsageAlerts(organizationId, usage);

      return usage;
    } catch (error) {
      console.error('Error getting organization usage:', error);
      throw error;
    }
  },

  // Check if usage is approaching limits and send alerts
  async checkUsageAlerts(organizationId, usage) {
    try {
      const alertThresholds = [80, 90, 95, 100];
      const { data: organization } = await supabase
        .from('organizations')
        .select('name, admin_email, admin_id')
        .eq('id', organizationId)
        .single();

      if (!organization) return;

      // Check each resource type
      const resources = ['users', 'customers', 'bottles'];
      
      for (const resource of resources) {
        const currentUsage = usage[resource];
        
        for (const threshold of alertThresholds) {
          if (currentUsage.percentage >= threshold) {
            // Check if we've already sent this alert recently
            const alertKey = `${organizationId}_${resource}_${threshold}`;
            const lastAlert = localStorage.getItem(alertKey);
            const now = Date.now();
            
            // Only send alert once per day per threshold
            if (!lastAlert || (now - parseInt(lastAlert)) > 24 * 60 * 60 * 1000) {
              await this.sendUsageAlert(organization, resource, currentUsage, threshold);
              localStorage.setItem(alertKey, now.toString());
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking usage alerts:', error);
    }
  },

  // Send usage alert
  async sendUsageAlert(organization, resource, usage, threshold) {
    try {
      const resourceNames = {
        users: 'users',
        customers: 'customers',
        bottles: 'bottles'
      };

      const message = `Your ${resourceNames[resource]} usage is at ${usage.percentage}% (${usage.current}/${usage.max}). Consider upgrading your plan to avoid service interruption.`;

      // Log usage alert (notification service removed)
      console.log(`Usage Alert: ${resourceNames[resource]} at ${usage.percentage}% for organization ${organization.name}`);
    } catch (error) {
      console.error('Error sending usage alert:', error);
    }
  },

  // Check if organization can add more of a resource
  async canAddResource(organizationId, resourceType) {
    try {
      const usage = await this.getOrganizationUsage(organizationId);
      const resourceUsage = usage[resourceType];
      
      return {
        canAdd: resourceUsage.current < resourceUsage.max,
        current: resourceUsage.current,
        max: resourceUsage.max,
        remaining: resourceUsage.max - resourceUsage.current,
        percentage: resourceUsage.percentage
      };
    } catch (error) {
      console.error('Error checking resource limits:', error);
      return { canAdd: false, current: 0, max: 0, remaining: 0, percentage: 0 };
    }
  },

  // Get usage trends (last 30 days)
  async getUsageTrends(organizationId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get user growth
      const { data: userGrowth } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get customer growth
      const { data: customerGrowth } = await supabase
        .from('customers')
        .select('created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get bottle growth
      const { data: bottleGrowth } = await supabase
        .from('bottles')
        .select('created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      return {
        users: userGrowth?.length || 0,
        customers: customerGrowth?.length || 0,
        bottles: bottleGrowth?.length || 0
      };
    } catch (error) {
      console.error('Error getting usage trends:', error);
      return { users: 0, customers: 0, bottles: 0 };
    }
  },

  // Predict usage for next billing cycle
  async predictUsage(organizationId) {
    try {
      const currentUsage = await this.getOrganizationUsage(organizationId);
      const trends = await this.getUsageTrends(organizationId);
      
      // Simple prediction: current usage + 30-day growth
      const predictions = {
        users: Math.min(currentUsage.users.current + trends.users, currentUsage.users.max),
        customers: Math.min(currentUsage.customers.current + trends.customers, currentUsage.customers.max),
        bottles: Math.min(currentUsage.bottles.current + trends.bottles, currentUsage.bottles.max)
      };

      return predictions;
    } catch (error) {
      console.error('Error predicting usage:', error);
      return { users: 0, customers: 0, bottles: 0 };
    }
  }
}; 