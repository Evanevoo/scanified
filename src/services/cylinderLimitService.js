import logger from '../utils/logger';
import { supabase } from '../supabase/client';
import { usageService } from './usageService';

export const cylinderLimitService = {
  // Check if organization can add cylinders
  async canAddCylinders(organizationId, quantity = 1) {
    try {
      const usage = await usageService.getOrganizationUsage(organizationId);
      const bottleUsage = usage.bottles;
      
      const newTotal = bottleUsage.current + quantity;
      const isUnlimited = bottleUsage.max === 999999 || bottleUsage.max === null;
      
      if (isUnlimited) {
        return {
          canAdd: true,
          current: bottleUsage.current,
          max: 'Unlimited',
          remaining: 'Unlimited',
          newTotal,
          percentage: 0,
          isUnlimited: true
        };
      }
      
      const canAdd = newTotal <= bottleUsage.max;
      const remaining = bottleUsage.max - bottleUsage.current;
      const newPercentage = Math.round((newTotal / bottleUsage.max) * 100);
      
      return {
        canAdd,
        current: bottleUsage.current,
        max: bottleUsage.max,
        remaining,
        newTotal,
        percentage: newPercentage,
        isUnlimited: false,
        quantity
      };
    } catch (error) {
      logger.error('Error checking cylinder limits:', error);
      return { 
        canAdd: false, 
        current: 0, 
        max: 0, 
        remaining: 0, 
        newTotal: 0,
        percentage: 0,
        isUnlimited: false,
        error: error.message 
      };
    }
  },

  // Get user-friendly limit message
  getLimitMessage(limitCheck) {
    if (limitCheck.error) {
      return {
        type: 'error',
        title: 'Limit Check Failed',
        message: `Unable to check cylinder limits: ${limitCheck.error}`
      };
    }

    if (limitCheck.isUnlimited) {
      return {
        type: 'success',
        title: 'Unlimited Plan',
        message: `You have unlimited cylinders. Current count: ${limitCheck.current.toLocaleString()}`
      };
    }

    if (limitCheck.canAdd) {
      const remaining = limitCheck.remaining;
      if (remaining <= 50) {
        return {
          type: 'warning',
          title: 'Approaching Limit',
          message: `You can add ${limitCheck.quantity} cylinder${limitCheck.quantity > 1 ? 's' : ''}. Only ${remaining} cylinders remaining before reaching your limit of ${limitCheck.max.toLocaleString()}.`
        };
      } else {
        return {
          type: 'success',
          title: 'Within Limits',
          message: `You can add ${limitCheck.quantity} cylinder${limitCheck.quantity > 1 ? 's' : ''}. You have ${remaining.toLocaleString()} cylinders remaining.`
        };
      }
    } else {
      const excess = limitCheck.newTotal - limitCheck.max;
      return {
        type: 'error',
        title: 'Cylinder Limit Exceeded',
        message: `Cannot add ${limitCheck.quantity} cylinder${limitCheck.quantity > 1 ? 's' : ''}. This would exceed your limit by ${excess.toLocaleString()} cylinders. Current: ${limitCheck.current.toLocaleString()}/${limitCheck.max.toLocaleString()}`
      };
    }
  },

  // Get upgrade suggestion based on current usage
  getUpgradeSuggestion(limitCheck) {
    if (limitCheck.isUnlimited || limitCheck.canAdd) {
      return null;
    }

    const currentMax = limitCheck.max;
    let suggestedPlan = null;

    // Suggest upgrade based on current limits
    if (currentMax <= 1000) {
      suggestedPlan = {
        name: 'Professional',
        cylinders: 5000,
        price: '$79/month',
        features: ['5,000 cylinders', '15 users', 'Advanced analytics']
      };
    } else if (currentMax <= 5000) {
      suggestedPlan = {
        name: 'Enterprise',
        cylinders: 'Unlimited',
        price: '$199/month',
        features: ['Unlimited cylinders', 'Unlimited users', 'Priority support']
      };
    }

    return suggestedPlan;
  },

  // Check limits before bulk operations
  async checkBulkOperation(organizationId, cylinderCount) {
    if (cylinderCount <= 0) {
      return {
        canProceed: false,
        message: 'Invalid cylinder count'
      };
    }

    const limitCheck = await this.canAddCylinders(organizationId, cylinderCount);
    const message = this.getLimitMessage(limitCheck);
    
    return {
      canProceed: limitCheck.canAdd,
      limitCheck,
      message,
      upgradeSuggestion: this.getUpgradeSuggestion(limitCheck)
    };
  },

  // Validate cylinder addition with detailed feedback
  async validateCylinderAddition(organizationId, cylinderData) {
    const quantity = Array.isArray(cylinderData) ? cylinderData.length : 1;
    const limitCheck = await this.canAddCylinders(organizationId, quantity);
    
    if (!limitCheck.canAdd) {
      const message = this.getLimitMessage(limitCheck);
      const upgradeSuggestion = this.getUpgradeSuggestion(limitCheck);
      
      return {
        isValid: false,
        error: message.message,
        errorType: message.type,
        limitCheck,
        upgradeSuggestion
      };
    }

    return {
      isValid: true,
      limitCheck,
      message: this.getLimitMessage(limitCheck)
    };
  }
}; 