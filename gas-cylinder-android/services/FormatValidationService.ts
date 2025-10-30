import logger from '../utils/logger';
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
  cylinder_serial_format: FormatConfig;
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
      logger.log('🔍 Fetching organization formats for ID:', organizationId);
      const { data, error } = await supabase
        .from('organizations')
        .select('format_configuration')
        .eq('id', organizationId)
        .single();

      if (error) throw error;

      // Parse the format_configuration JSONB column
      const formatConfig = data?.format_configuration || {};
      logger.log('🔍 Raw format_configuration from database:', formatConfig);
      
      // Set default formats if not configured
      const formats: OrganizationFormats = {
        barcode_format: formatConfig.barcode_format || {
          pattern: '^%[0-9]{8}-[0-9]{10}[A-Za-z]?$',
          description: 'Barcode format as configured by organization',
          examples: [],
          validation_enabled: false
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
        },
        cylinder_serial_format: formatConfig.cylinder_serial_format || {
          pattern: '^[0-9]{9}$',
          description: '9-digit serial number',
          examples: ['123456789', '987654321'],
          prefix: '',
          validation_enabled: true
        }
      };

      // Cache the formats
      this.cachedFormats = formats;
      this.lastFetch = now;

      logger.log('🔍 Final barcode format being used:', formats.barcode_format);
      logger.log('🔍 Pattern:', formats.barcode_format.pattern);
      logger.log('🔍 Description:', formats.barcode_format.description);

      return formats;
    } catch (error) {
      logger.error('Error fetching organization formats:', error);
      
      // Return default formats on error
      return {
        barcode_format: {
          pattern: '^%[0-9]{8}-[0-9]{10}[A-Za-z]?$',
          description: 'Barcode format as configured by organization',
          examples: [],
          validation_enabled: false
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
      logger.log('🔍 Testing regex pattern:', formatConfig.pattern);
      logger.log('🔍 Testing against value:', trimmed);
      logger.log('🔍 Regex test result:', regex.test(trimmed));
      
      if (!regex.test(trimmed)) {
        logger.log('❌ Regex test failed for:', trimmed);
        return { 
          isValid: false, 
          error: `Invalid format. Expected: ${formatConfig.description}` 
        };
      }
      logger.log('✅ Regex test passed for:', trimmed);
    } catch (error) {
      logger.warn('Invalid regex pattern in format config:', error);
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
      logger.error(`Error validating ${formatKey}:`, error);
      return { isValid: false, error: 'Validation failed' };
    }
  }

  static clearCache(): void {
    this.cachedFormats = null;
    this.lastFetch = 0;
  }
} 