import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';

export interface FormatConfig {
  pattern: string;
  description: string;
  examples: string[];
  validation_enabled: boolean;
  prefix?: string;
}

export interface OrganizationFormats {
  barcode_format: FormatConfig;
  order_number_format: FormatConfig;
  customer_id_format: FormatConfig;
}

export class FormatValidationService {
  private static cachedFormats: OrganizationFormats | null = null;
  private static lastFetch: number = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async getOrganizationFormats(organizationId: string): Promise<OrganizationFormats> {
    const now = Date.now();
    
    // Return cached formats if still valid
    if (this.cachedFormats && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cachedFormats;
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('format_configuration')
        .eq('id', organizationId)
        .single();

      if (error) throw error;

      // Parse the format_configuration JSONB column
      const formatConfig = data?.format_configuration || {};
      
      // Set default formats if not configured
      const formats: OrganizationFormats = {
        barcode_format: formatConfig.barcode_format || {
          pattern: '^[0-9]{9}$',
          description: '9-digit numeric barcode',
          examples: ['123456789', '987654321'],
          validation_enabled: true
        },
        order_number_format: formatConfig.order_number_format || {
          pattern: '^[A-Z0-9]{6,12}$',
          description: '6-12 alphanumeric characters',
          examples: ['ORD123456', 'SO789012'],
          prefix: '',
          validation_enabled: true
        },
        customer_id_format: formatConfig.customer_id_format || {
          pattern: '^[A-Z0-9]{4,10}$',
          description: '4-10 alphanumeric characters',
          examples: ['CUST123', 'CLIENT456'],
          prefix: '',
          validation_enabled: true
        }
      };

      // Cache the formats
      this.cachedFormats = formats;
      this.lastFetch = now;

      return formats;
    } catch (error) {
      console.error('Error fetching organization formats:', error);
      
      // Return default formats on error
      return {
        barcode_format: {
          pattern: '^[0-9]{9}$',
          description: '9-digit numeric barcode',
          examples: ['123456789', '987654321'],
          validation_enabled: true
        },
        order_number_format: {
          pattern: '^[A-Z0-9]{6,12}$',
          description: '6-12 alphanumeric characters',
          examples: ['ORD123456', 'SO789012'],
          prefix: '',
          validation_enabled: true
        },
        customer_id_format: {
          pattern: '^[A-Z0-9]{4,10}$',
          description: '4-10 alphanumeric characters',
          examples: ['CUST123', 'CLIENT456'],
          prefix: '',
          validation_enabled: true
        }
      };
    }
  }

  static validateFormat(value: string, formatConfig: FormatConfig): { isValid: boolean; error?: string } {
    if (!formatConfig.validation_enabled) {
      return { isValid: true };
    }

    if (!value || typeof value !== 'string') {
      return { isValid: false, error: 'Value cannot be empty' };
    }

    const trimmed = value.trim();
    
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Value cannot be empty' };
    }

    try {
      const regex = new RegExp(formatConfig.pattern);
      if (!regex.test(trimmed)) {
        return { 
          isValid: false, 
          error: `Invalid format. Expected: ${formatConfig.description}` 
        };
      }
    } catch (error) {
      console.warn('Invalid regex pattern in format config:', error);
      return { isValid: false, error: 'Invalid format configuration' };
    }

    return { isValid: true };
  }

  static validateBarcode(barcode: string, organizationId: string): Promise<{ isValid: boolean; error?: string }> {
    return this.validateWithConfig(barcode, organizationId, 'barcode_format');
  }

  static validateOrderNumber(orderNumber: string, organizationId: string): Promise<{ isValid: boolean; error?: string }> {
    return this.validateWithConfig(orderNumber, organizationId, 'order_number_format');
  }

  static validateCustomerId(customerId: string, organizationId: string): Promise<{ isValid: boolean; error?: string }> {
    return this.validateWithConfig(customerId, organizationId, 'customer_id_format');
  }

  private static async validateWithConfig(
    value: string, 
    organizationId: string, 
    formatKey: keyof OrganizationFormats
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const formats = await this.getOrganizationFormats(organizationId);
      const formatConfig = formats[formatKey];
      
      return this.validateFormat(value, formatConfig);
    } catch (error) {
      console.error(`Error validating ${formatKey}:`, error);
      return { isValid: false, error: 'Validation failed' };
    }
  }

  static clearCache(): void {
    this.cachedFormats = null;
    this.lastFetch = 0;
  }
} 