import logger from '../utils/logger';
import { supabase } from '../supabase';

export class CylinderLimitService {
  // Check if organization can add cylinders
  static async canAddCylinders(organizationId: string, quantity: number = 1) {
    try {
      // Get current usage
      const { count: currentBottles } = await supabase
        .from('bottles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Get organization limits
      const { data: organization } = await supabase
        .from('organizations')
        .select('max_cylinders, max_bottles')
        .eq('id', organizationId)
        .single();

      if (!organization) {
        throw new Error('Organization not found');
      }

      const maxCylinders = organization.max_cylinders || organization.max_bottles || 1000;
      const current = currentBottles || 0;
      const newTotal = current + quantity;
      const isUnlimited = maxCylinders === 999999 || maxCylinders === null;

      if (isUnlimited) {
        return {
          canAdd: true,
          current,
          max: 'Unlimited',
          remaining: 'Unlimited',
          newTotal,
          percentage: 0,
          isUnlimited: true
        };
      }

      const canAdd = newTotal <= maxCylinders;
      const remaining = maxCylinders - current;
      const percentage = Math.round((newTotal / maxCylinders) * 100);

      return {
        canAdd,
        current,
        max: maxCylinders,
        remaining,
        newTotal,
        percentage,
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
  }

  // Get user-friendly limit message
  static getLimitMessage(limitCheck: any) {
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
  }

  // Validate cylinder addition
  static async validateCylinderAddition(organizationId: string, quantity: number = 1) {
    const limitCheck = await this.canAddCylinders(organizationId, quantity);
    const message = this.getLimitMessage(limitCheck);

    if (!limitCheck.canAdd) {
      return {
        isValid: false,
        error: message.message,
        errorType: message.type,
        limitCheck,
        message
      };
    }

    return {
      isValid: true,
      limitCheck,
      message
    };
  }
} 