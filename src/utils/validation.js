/**
 * Comprehensive validation utilities for the gas cylinder application
 */

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone number validation
export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Barcode validation
export const validateBarcode = (barcode) => {
  if (!barcode || typeof barcode !== 'string') return false;
  return barcode.length >= 8 && barcode.length <= 50;
};

// Serial number validation
export const validateSerialNumber = (serial) => {
  if (!serial || typeof serial !== 'string') return false;
  return serial.length >= 3 && serial.length <= 20;
};

// Customer ID validation
export const validateCustomerId = (customerId) => {
  if (!customerId || typeof customerId !== 'string') return false;
  // Check if it matches the expected format (e.g., 1370000-XXXXXXXXX)
  const customerIdRegex = /^1370000-\d+(-[a-zA-Z0-9]+)?$/;
  return customerIdRegex.test(customerId);
};

// Product code validation
export const validateProductCode = (productCode) => {
  if (!productCode || typeof productCode !== 'string') return false;
  const validCodes = ['PROPANE', 'OXYGEN', 'NITROGEN', 'ARGON', 'CO2', 'ACETYLENE', 'HELIUM'];
  return validCodes.includes(productCode.toUpperCase()) || productCode.length <= 20;
};

// Location validation
export const validateLocation = (location) => {
  if (!location || typeof location !== 'string') return false;
  return location.length >= 2 && location.length <= 50;
};

// Price validation
export const validatePrice = (price) => {
  if (price === null || price === undefined) return false;
  const numPrice = parseFloat(price);
  return !isNaN(numPrice) && numPrice >= 0 && numPrice <= 999999.99;
};

// Date validation
export const validateDate = (date) => {
  if (!date) return false;
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

// Required field validation
export const validateRequired = (value) => {
  return value !== null && value !== undefined && value !== '';
};

// String length validation
export const validateStringLength = (value, minLength = 1, maxLength = 255) => {
  if (!value || typeof value !== 'string') return false;
  return value.length >= minLength && value.length <= maxLength;
};

// Number range validation
export const validateNumberRange = (value, min = 0, max = 999999) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
};

// Excel file validation
export const validateExcelFile = (file) => {
  if (!file) return { isValid: false, error: 'No file selected' };
  
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Please upload an Excel or CSV file.' };
  }
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size too large. Please upload a file smaller than 10MB.' };
  }
  
  return { isValid: true, error: null };
};

// Bottle data validation
export const validateBottleData = (bottle) => {
  const errors = [];
  
  if (!validateBarcode(bottle.barcode_number)) {
    errors.push('Invalid barcode number');
  }
  
  if (!validateSerialNumber(bottle.serial_number)) {
    errors.push('Invalid serial number');
  }
  
  if (bottle.customer_name && !validateStringLength(bottle.customer_name, 1, 100)) {
    errors.push('Invalid customer name');
  }
  
  if (bottle.product_code && !validateProductCode(bottle.product_code)) {
    errors.push('Invalid product code');
  }
  
  if (bottle.location && !validateLocation(bottle.location)) {
    errors.push('Invalid location');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Customer data validation
export const validateCustomerData = (customer) => {
  const errors = [];
  
  if (!validateRequired(customer.name)) {
    errors.push('Customer name is required');
  }
  
  if (!validateStringLength(customer.name, 1, 100)) {
    errors.push('Customer name must be between 1 and 100 characters');
  }
  
  if (customer.email && !validateEmail(customer.email)) {
    errors.push('Invalid email address');
  }
  
  if (customer.phone && !validatePhone(customer.phone)) {
    errors.push('Invalid phone number');
  }
  
  if (customer.CustomerListID && !validateCustomerId(customer.CustomerListID)) {
    errors.push('Invalid customer ID format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Form validation helper
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];
    
    if (fieldRules.required && !validateRequired(value)) {
      errors[field] = `${field} is required`;
      return;
    }
    
    if (value && fieldRules.email && !validateEmail(value)) {
      errors[field] = 'Invalid email address';
      return;
    }
    
    if (value && fieldRules.phone && !validatePhone(value)) {
      errors[field] = 'Invalid phone number';
      return;
    }
    
    if (value && fieldRules.minLength && !validateStringLength(value, fieldRules.minLength)) {
      errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
      return;
    }
    
    if (value && fieldRules.maxLength && !validateStringLength(value, 1, fieldRules.maxLength)) {
      errors[field] = `${field} must be no more than ${fieldRules.maxLength} characters`;
      return;
    }
    
    if (value && fieldRules.numberRange) {
      const { min, max } = fieldRules.numberRange;
      if (!validateNumberRange(value, min, max)) {
        errors[field] = `${field} must be between ${min} and ${max}`;
        return;
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Sanitize input data
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

// Validate and sanitize Excel data
export const validateAndSanitizeExcelData = (data) => {
  const sanitizedData = [];
  const errors = [];
  
  data.forEach((row, index) => {
    const sanitizedRow = {};
    let rowHasErrors = false;
    
    Object.keys(row).forEach(key => {
      const value = row[key];
      sanitizedRow[key] = typeof value === 'string' ? sanitizeInput(value) : value;
    });
    
    // Validate required fields
    if (!validateRequired(sanitizedRow['Customer'])) {
      errors.push(`Row ${index + 1}: Customer name is required`);
      rowHasErrors = true;
    }
    
    if (!validateRequired(sanitizedRow['Barcode'])) {
      errors.push(`Row ${index + 1}: Barcode is required`);
      rowHasErrors = true;
    }
    
    if (!validateBarcode(sanitizedRow['Barcode'])) {
      errors.push(`Row ${index + 1}: Invalid barcode format`);
      rowHasErrors = true;
    }
    
    if (!rowHasErrors) {
      sanitizedData.push(sanitizedRow);
    }
  });
  
  return {
    data: sanitizedData,
    errors,
    isValid: errors.length === 0
  };
};

export default {
  validateEmail,
  validatePhone,
  validateBarcode,
  validateSerialNumber,
  validateCustomerId,
  validateProductCode,
  validateLocation,
  validatePrice,
  validateDate,
  validateRequired,
  validateStringLength,
  validateNumberRange,
  validateExcelFile,
  validateBottleData,
  validateCustomerData,
  validateForm,
  sanitizeInput,
  validateAndSanitizeExcelData
}; 