/**
 * Input validation utilities for the gas cylinder application
 */

/**
 * Email validation
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Phone number validation (basic)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone number
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

/**
 * Customer ID validation
 * @param {string} customerId - Customer ID to validate
 * @returns {boolean} True if valid customer ID
 */
export const isValidCustomerId = (customerId) => {
  return customerId && customerId.trim().length > 0 && /^[A-Z0-9\-_]+$/i.test(customerId);
};

/**
 * Barcode validation
 * @param {string} barcode - Barcode to validate
 * @returns {boolean} True if valid barcode
 */
export const isValidBarcode = (barcode) => {
  return barcode && barcode.trim().length > 0 && /^[A-Z0-9\-_]+$/i.test(barcode);
};

/**
 * Serial number validation
 * @param {string} serialNumber - Serial number to validate
 * @returns {boolean} True if valid serial number
 */
export const isValidSerialNumber = (serialNumber) => {
  return serialNumber && serialNumber.trim().length > 0 && /^[A-Z0-9\-_]+$/i.test(serialNumber);
};

/**
 * Required field validation
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {Object} Validation result
 */
export const validateRequired = (value, fieldName) => {
  const isValid = value !== null && value !== undefined && value !== '';
  return {
    isValid,
    error: isValid ? null : `${fieldName} is required`
  };
};

/**
 * String length validation
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Name of the field for error message
 * @returns {Object} Validation result
 */
export const validateStringLength = (value, minLength, maxLength, fieldName) => {
  if (!value) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const length = value.trim().length;
  
  if (minLength && length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  
  if (maxLength && length > maxLength) {
    return { isValid: false, error: `${fieldName} must be no more than ${maxLength} characters` };
  }
  
  return { isValid: true, error: null };
};

/**
 * Number range validation
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Name of the field for error message
 * @returns {Object} Validation result
 */
export const validateNumberRange = (value, min, max, fieldName) => {
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (min !== undefined && num < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, error: `${fieldName} must be no more than ${max}` };
  }
  
  return { isValid: true, error: null };
};

/**
 * Date validation
 * @param {string|Date} date - Date to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {Object} Validation result
 */
export const validateDate = (date, fieldName) => {
  if (!date) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: `${fieldName} must be a valid date` };
  }
  
  return { isValid: true, error: null };
};

/**
 * Customer data validation
 * @param {Object} customer - Customer data to validate
 * @returns {Object} Validation result with errors array
 */
export const validateCustomer = (customer) => {
  const errors = [];
  
  // Required fields
  const requiredFields = ['name', 'CustomerListID'];
  requiredFields.forEach(field => {
    const result = validateRequired(customer[field], field);
    if (!result.isValid) {
      errors.push(result.error);
    }
  });
  
  // Customer ID format
  if (customer.CustomerListID && !isValidCustomerId(customer.CustomerListID)) {
    errors.push('Customer ID must contain only letters, numbers, hyphens, and underscores');
  }
  
  // Email validation
  if (customer.email && !isValidEmail(customer.email)) {
    errors.push('Email must be a valid email address');
  }
  
  // Phone validation
  if (customer.phone && !isValidPhone(customer.phone)) {
    errors.push('Phone number must be a valid phone number');
  }
  
  // Name length
  if (customer.name) {
    const result = validateStringLength(customer.name, 2, 100, 'Name');
    if (!result.isValid) {
      errors.push(result.error);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Cylinder data validation
 * @param {Object} cylinder - Cylinder data to validate
 * @returns {Object} Validation result with errors array
 */
export const validateCylinder = (cylinder) => {
  const errors = [];
  
  // Required fields
  const requiredFields = ['barcode_number', 'serial_number'];
  requiredFields.forEach(field => {
    const result = validateRequired(cylinder[field], field);
    if (!result.isValid) {
      errors.push(result.error);
    }
  });
  
  // Barcode validation
  if (cylinder.barcode_number && !isValidBarcode(cylinder.barcode_number)) {
    errors.push('Barcode must contain only letters, numbers, hyphens, and underscores');
  }
  
  // Serial number validation
  if (cylinder.serial_number && !isValidSerialNumber(cylinder.serial_number)) {
    errors.push('Serial number must contain only letters, numbers, hyphens, and underscores');
  }
  
  // Capacity validation
  if (cylinder.capacity) {
    const result = validateNumberRange(cylinder.capacity, 0, 10000, 'Capacity');
    if (!result.isValid) {
      errors.push(result.error);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Rental data validation
 * @param {Object} rental - Rental data to validate
 * @returns {Object} Validation result with errors array
 */
export const validateRental = (rental) => {
  const errors = [];
  
  // Required fields
  const requiredFields = ['customer_id', 'cylinder_id'];
  requiredFields.forEach(field => {
    const result = validateRequired(rental[field], field);
    if (!result.isValid) {
      errors.push(result.error);
    }
  });
  
  // Date validation
  if (rental.rental_start_date) {
    const result = validateDate(rental.rental_start_date, 'Rental start date');
    if (!result.isValid) {
      errors.push(result.error);
    }
  }
  
  if (rental.rental_end_date) {
    const result = validateDate(rental.rental_end_date, 'Rental end date');
    if (!result.isValid) {
      errors.push(result.error);
    }
  }
  
  // Date logic validation
  if (rental.rental_start_date && rental.rental_end_date) {
    const startDate = new Date(rental.rental_start_date);
    const endDate = new Date(rental.rental_end_date);
    
    if (endDate <= startDate) {
      errors.push('Rental end date must be after rental start date');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Form validation helper
 * @param {Object} formData - Form data to validate
 * @param {Object} validationRules - Validation rules object
 * @returns {Object} Validation result
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(validationRules).forEach(fieldName => {
    const rules = validationRules[fieldName];
    const value = formData[fieldName];
    
    // Required validation
    if (rules.required) {
      const result = validateRequired(value, fieldName);
      if (!result.isValid) {
        errors[fieldName] = result.error;
        isValid = false;
        return;
      }
    }
    
    // Skip other validations if field is empty and not required
    if (!value && !rules.required) {
      return;
    }
    
    // String length validation
    if (rules.minLength || rules.maxLength) {
      const result = validateStringLength(value, rules.minLength, rules.maxLength, fieldName);
      if (!result.isValid) {
        errors[fieldName] = result.error;
        isValid = false;
        return;
      }
    }
    
    // Number range validation
    if (rules.min !== undefined || rules.max !== undefined) {
      const result = validateNumberRange(value, rules.min, rules.max, fieldName);
      if (!result.isValid) {
        errors[fieldName] = result.error;
        isValid = false;
        return;
      }
    }
    
    // Email validation
    if (rules.email && !isValidEmail(value)) {
      errors[fieldName] = 'Must be a valid email address';
      isValid = false;
      return;
    }
    
    // Phone validation
    if (rules.phone && !isValidPhone(value)) {
      errors[fieldName] = 'Must be a valid phone number';
      isValid = false;
      return;
    }
    
    // Custom validation
    if (rules.custom) {
      const result = rules.custom(value, formData);
      if (!result.isValid) {
        errors[fieldName] = result.error;
        isValid = false;
        return;
      }
    }
  });
  
  return {
    isValid,
    errors
  };
};

/**
 * Sanitize input data
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

export default {
  isValidEmail,
  isValidPhone,
  isValidCustomerId,
  isValidBarcode,
  isValidSerialNumber,
  validateRequired,
  validateStringLength,
  validateNumberRange,
  validateDate,
  validateCustomer,
  validateCylinder,
  validateRental,
  validateForm,
  sanitizeInput
}; 