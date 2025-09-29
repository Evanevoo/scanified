export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationRule {
  test: (value: any) => boolean;
  message: string;
}

export class ValidationUtils {
  static required(value: any, fieldName: string): ValidationResult {
    const isValid = value !== null && value !== undefined && value !== '';
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} is required`],
    };
  }

  static email(value: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(value);
    return {
      isValid,
      errors: isValid ? [] : ['Please enter a valid email address'],
    };
  }

  static minLength(value: string, min: number, fieldName: string): ValidationResult {
    const isValid = value.length >= min;
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} must be at least ${min} characters long`],
    };
  }

  static maxLength(value: string, max: number, fieldName: string): ValidationResult {
    const isValid = value.length <= max;
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} must be no more than ${max} characters long`],
    };
  }

  static pattern(value: string, regex: RegExp, message: string): ValidationResult {
    const isValid = regex.test(value);
    return {
      isValid,
      errors: isValid ? [] : [message],
    };
  }

  static barcode(value: string): ValidationResult {
    // Basic barcode validation - alphanumeric, 6-20 characters
    const barcodeRegex = /^[A-Za-z0-9]{6,20}$/;
    const isValid = barcodeRegex.test(value);
    return {
      isValid,
      errors: isValid ? [] : ['Barcode must be 6-20 characters long and contain only letters and numbers'],
    };
  }

  // New format validation methods
  static validateBarcodeWithConfig(value: string, formatConfig: any): ValidationResult {
    if (!formatConfig?.barcode_format?.enabled) {
      return { isValid: true, errors: [] };
    }

    if (!value || typeof value !== 'string') {
      return { isValid: false, errors: ['Barcode cannot be empty'] };
    }

    const trimmed = value.trim();
    const pattern = formatConfig.barcode_format.pattern;
    const description = formatConfig.barcode_format.description;

    try {
      const regex = new RegExp(pattern);
      const isValid = regex.test(trimmed);
      
      return {
        isValid,
        errors: isValid ? [] : [`Invalid barcode format. Expected: ${description}`],
      };
    } catch (error) {
      console.warn('Invalid regex pattern in barcode config:', error);
      return { isValid: false, errors: ['Invalid barcode format configuration'] };
    }
  }

  static validateOrderNumberWithConfig(value: string, formatConfig: any): ValidationResult {
    if (!formatConfig?.order_number_format?.enabled) {
      return { isValid: true, errors: [] };
    }

    if (!value || typeof value !== 'string') {
      return { isValid: false, errors: ['Order number cannot be empty'] };
    }

    const trimmed = value.trim();
    const pattern = formatConfig.order_number_format.pattern;
    const description = formatConfig.order_number_format.description;

    try {
      const regex = new RegExp(pattern);
      const isValid = regex.test(trimmed);
      
      return {
        isValid,
        errors: isValid ? [] : [`Invalid order number format. Expected: ${description}`],
      };
    } catch (error) {
      console.warn('Invalid regex pattern in order number config:', error);
      return { isValid: false, errors: ['Invalid order number format configuration'] };
    }
  }

  static validateCustomerIdWithConfig(value: string, formatConfig: any): ValidationResult {
    if (!formatConfig?.customer_id_format?.enabled) {
      return { isValid: true, errors: [] };
    }

    if (!value || typeof value !== 'string') {
      return { isValid: false, errors: ['Customer ID cannot be empty'] };
    }

    const trimmed = value.trim();
    const pattern = formatConfig.customer_id_format.pattern;
    const description = formatConfig.customer_id_format.description;

    try {
      const regex = new RegExp(pattern);
      const isValid = regex.test(trimmed);
      
      return {
        isValid,
        errors: isValid ? [] : [`Invalid customer ID format. Expected: ${description}`],
      };
    } catch (error) {
      console.warn('Invalid regex pattern in customer ID config:', error);
      return { isValid: false, errors: ['Invalid customer ID format configuration'] };
    }
  }

  static orderNumber(value: string): ValidationResult {
    // Order number validation - alphanumeric, 1-20 characters
    const orderRegex = /^[A-Za-z0-9]{1,20}$/;
    const isValid = orderRegex.test(value);
    return {
      isValid,
      errors: isValid ? [] : ['Order number must contain only letters and numbers'],
    };
  }

  static phoneNumber(value: string): ValidationResult {
    // Basic phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const isValid = phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
    return {
      isValid,
      errors: isValid ? [] : ['Please enter a valid phone number'],
    };
  }

  static positiveNumber(value: number): ValidationResult {
    const isValid = typeof value === 'number' && value > 0;
    return {
      isValid,
      errors: isValid ? [] : ['Value must be a positive number'],
    };
  }

  static date(value: string): ValidationResult {
    const date = new Date(value);
    const isValid = !isNaN(date.getTime());
    return {
      isValid,
      errors: isValid ? [] : ['Please enter a valid date'],
    };
  }

  static futureDate(value: string): ValidationResult {
    const date = new Date(value);
    const now = new Date();
    const isValid = !isNaN(date.getTime()) && date > now;
    return {
      isValid,
      errors: isValid ? [] : ['Date must be in the future'],
    };
  }

  static combine(...results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap(result => result.errors);
    const isValid = allErrors.length === 0;
    
    return {
      isValid,
      errors: allErrors,
    };
  }

  static validateField(value: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of rules) {
      if (!rule.test(value)) {
        errors.push(rule.message);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Predefined validation schemas
export const ValidationSchemas = {
  login: {
    email: (value: string) => ValidationUtils.combine(
      ValidationUtils.required(value, 'Email'),
      ValidationUtils.email(value)
    ),
    password: (value: string) => ValidationUtils.combine(
      ValidationUtils.required(value, 'Password'),
      ValidationUtils.minLength(value, 6, 'Password')
    ),
  },

  scan: {
    barcode: (value: string) => ValidationUtils.combine(
      ValidationUtils.required(value, 'Barcode'),
      ValidationUtils.barcode(value)
    ),
    orderNumber: (value: string) => ValidationUtils.combine(
      ValidationUtils.required(value, 'Order Number'),
      ValidationUtils.orderNumber(value)
    ),
    customerId: (value: any) => ValidationUtils.required(value, 'Customer'),
  },

  customer: {
    name: (value: string) => ValidationUtils.combine(
      ValidationUtils.required(value, 'Name'),
      ValidationUtils.minLength(value, 2, 'Name'),
      ValidationUtils.maxLength(value, 100, 'Name')
    ),
    barcode: (value: string) => ValidationUtils.combine(
      ValidationUtils.required(value, 'Barcode'),
      ValidationUtils.barcode(value)
    ),
    contactDetails: (value: string) => ValidationUtils.combine(
      ValidationUtils.required(value, 'Contact Details'),
      ValidationUtils.minLength(value, 5, 'Contact Details')
    ),
  },

  cylinder: {
    barcode: (value: string) => ValidationUtils.combine(
      ValidationUtils.required(value, 'Barcode'),
      ValidationUtils.barcode(value)
    ),
    groupName: (value: string) => ValidationUtils.combine(
      ValidationUtils.required(value, 'Group Name'),
      ValidationUtils.minLength(value, 2, 'Group Name')
    ),
    capacity: (value: number) => ValidationUtils.combine(
      ValidationUtils.required(value, 'Capacity'),
      ValidationUtils.positiveNumber(value)
    ),
  },
}; 