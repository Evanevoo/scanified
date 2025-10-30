import logger from './logger';

/**
 * Validation rules for different import types
 */
export const VALIDATION_RULES = {
  invoices: {
    required: ['InvoiceNumber', 'CustomerName', 'InvoiceDate'],
    optional: ['Amount', 'DueDate', 'Status', 'Items'],
    dateFields: ['InvoiceDate', 'DueDate'],
    numericFields: ['Amount', 'Total', 'Tax', 'Subtotal'],
    uniqueFields: ['InvoiceNumber']
  },
  sales_receipts: {
    required: ['ReceiptNumber', 'CustomerName', 'Date'],
    optional: ['Amount', 'PaymentMethod', 'Items'],
    dateFields: ['Date'],
    numericFields: ['Amount', 'Total'],
    uniqueFields: ['ReceiptNumber']
  },
  customers: {
    required: ['CustomerListID', 'name'],
    optional: ['email', 'phone', 'address', 'city', 'province', 'postal_code'],
    emailFields: ['email'],
    phoneFields: ['phone'],
    uniqueFields: ['CustomerListID', 'email']
  },
  bottles: {
    required: ['barcode_number', 'serial_number'],
    optional: ['product_code', 'gas_type', 'status', 'location', 'owner_name'],
    uniqueFields: ['barcode_number', 'serial_number'],
    enumFields: {
      status: ['available', 'rented', 'delivered', 'returned', 'maintenance', 'retired']
    }
  }
};

/**
 * Validate a single row of import data
 */
export function validateRow(row, importType, rowIndex) {
  const errors = [];
  const warnings = [];
  const rules = VALIDATION_RULES[importType];
  
  if (!rules) {
    errors.push(`Unknown import type: ${importType}`);
    return { errors, warnings, isValid: false };
  }
  
  // Check required fields
  for (const field of rules.required) {
    if (!row[field] || row[field].toString().trim() === '') {
      errors.push(`Row ${rowIndex + 1}: Missing required field "${field}"`);
    }
  }
  
  // Validate date fields
  if (rules.dateFields) {
    for (const field of rules.dateFields) {
      if (row[field]) {
        const date = new Date(row[field]);
        if (isNaN(date.getTime())) {
          errors.push(`Row ${rowIndex + 1}: Invalid date format in field "${field}": ${row[field]}`);
        }
      }
    }
  }
  
  // Validate numeric fields
  if (rules.numericFields) {
    for (const field of rules.numericFields) {
      if (row[field] !== undefined && row[field] !== '') {
        const value = parseFloat(row[field]);
        if (isNaN(value)) {
          errors.push(`Row ${rowIndex + 1}: Invalid number in field "${field}": ${row[field]}`);
        }
      }
    }
  }
  
  // Validate email fields
  if (rules.emailFields) {
    for (const field of rules.emailFields) {
      if (row[field]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row[field])) {
          warnings.push(`Row ${rowIndex + 1}: Invalid email format in field "${field}": ${row[field]}`);
        }
      }
    }
  }
  
  // Validate phone fields
  if (rules.phoneFields) {
    for (const field of rules.phoneFields) {
      if (row[field]) {
        // Basic phone validation (can be customized per region)
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(row[field])) {
          warnings.push(`Row ${rowIndex + 1}: Invalid phone format in field "${field}": ${row[field]}`);
        }
      }
    }
  }
  
  // Validate enum fields
  if (rules.enumFields) {
    for (const [field, allowedValues] of Object.entries(rules.enumFields)) {
      if (row[field] && !allowedValues.includes(row[field])) {
        errors.push(`Row ${rowIndex + 1}: Invalid value in field "${field}": ${row[field]}. Allowed values: ${allowedValues.join(', ')}`);
      }
    }
  }
  
  return {
    errors,
    warnings,
    isValid: errors.length === 0
  };
}

/**
 * Validate entire import dataset
 */
export function validateImportData(data, importType) {
  const results = {
    totalRows: data.length,
    validRows: 0,
    invalidRows: 0,
    errors: [],
    warnings: [],
    duplicates: [],
    rowResults: []
  };
  
  const rules = VALIDATION_RULES[importType];
  if (!rules) {
    results.errors.push(`Unknown import type: ${importType}`);
    return results;
  }
  
  // Check for duplicates in unique fields
  if (rules.uniqueFields) {
    const uniqueValues = {};
    
    for (const field of rules.uniqueFields) {
      uniqueValues[field] = new Map();
      
      data.forEach((row, index) => {
        const value = row[field];
        if (value) {
          if (uniqueValues[field].has(value)) {
            const firstIndex = uniqueValues[field].get(value);
            results.duplicates.push({
              field,
              value,
              rows: [firstIndex + 1, index + 1]
            });
          } else {
            uniqueValues[field].set(value, index);
          }
        }
      });
    }
  }
  
  // Validate each row
  data.forEach((row, index) => {
    const rowValidation = validateRow(row, importType, index);
    results.rowResults.push(rowValidation);
    
    if (rowValidation.isValid) {
      results.validRows++;
    } else {
      results.invalidRows++;
    }
    
    results.errors.push(...rowValidation.errors);
    results.warnings.push(...rowValidation.warnings);
  });
  
  // Add duplicate errors
  results.duplicates.forEach(dup => {
    results.errors.push(`Duplicate value "${dup.value}" in field "${dup.field}" found in rows: ${dup.rows.join(', ')}`);
  });
  
  results.isValid = results.errors.length === 0;
  
  logger.log('Import validation results:', {
    importType,
    totalRows: results.totalRows,
    validRows: results.validRows,
    invalidRows: results.invalidRows,
    errorCount: results.errors.length,
    warningCount: results.warnings.length,
    duplicateCount: results.duplicates.length
  });
  
  return results;
}

/**
 * Auto-correct common import issues
 */
export function autoCorrectImportData(data, importType) {
  const corrected = data.map(row => ({ ...row }));
  const corrections = [];
  
  corrected.forEach((row, index) => {
    // Trim whitespace from all fields
    Object.keys(row).forEach(key => {
      if (typeof row[key] === 'string') {
        const trimmed = row[key].trim();
        if (trimmed !== row[key]) {
          corrections.push(`Row ${index + 1}: Trimmed whitespace from field "${key}"`);
          row[key] = trimmed;
        }
      }
    });
    
    // Convert date formats
    const rules = VALIDATION_RULES[importType];
    if (rules?.dateFields) {
      rules.dateFields.forEach(field => {
        if (row[field]) {
          // Try to parse and reformat date
          const date = new Date(row[field]);
          if (!isNaN(date.getTime())) {
            const formatted = date.toISOString().split('T')[0];
            if (formatted !== row[field]) {
              corrections.push(`Row ${index + 1}: Reformatted date in field "${field}" from "${row[field]}" to "${formatted}"`);
              row[field] = formatted;
            }
          }
        }
      });
    }
    
    // Clean numeric fields
    if (rules?.numericFields) {
      rules.numericFields.forEach(field => {
        if (row[field]) {
          // Remove currency symbols and commas
          const cleaned = row[field].toString().replace(/[$,]/g, '');
          if (cleaned !== row[field]) {
            corrections.push(`Row ${index + 1}: Cleaned numeric field "${field}" from "${row[field]}" to "${cleaned}"`);
            row[field] = cleaned;
          }
        }
      });
    }
    
    // Standardize status fields
    if (importType === 'bottles' && row.status) {
      const statusMap = {
        'avail': 'available',
        'rent': 'rented',
        'deliver': 'delivered',
        'return': 'returned',
        'maint': 'maintenance',
        'retire': 'retired'
      };
      
      const lower = row.status.toLowerCase();
      if (statusMap[lower]) {
        corrections.push(`Row ${index + 1}: Standardized status from "${row.status}" to "${statusMap[lower]}"`);
        row.status = statusMap[lower];
      }
    }
  });
  
  logger.log(`Auto-corrections applied: ${corrections.length} corrections made`);
  
  return {
    data: corrected,
    corrections
  };
}

/**
 * Generate import summary report
 */
export function generateImportSummary(data, importType, validationResults) {
  const summary = {
    importType,
    timestamp: new Date().toISOString(),
    statistics: {
      totalRows: data.length,
      validRows: validationResults.validRows,
      invalidRows: validationResults.invalidRows,
      duplicates: validationResults.duplicates.length,
      errors: validationResults.errors.length,
      warnings: validationResults.warnings.length
    },
    fieldCoverage: {},
    recommendations: []
  };
  
  // Analyze field coverage
  const rules = VALIDATION_RULES[importType];
  if (rules) {
    const allFields = [...(rules.required || []), ...(rules.optional || [])];
    
    allFields.forEach(field => {
      const coverage = data.filter(row => row[field] && row[field].toString().trim() !== '').length;
      summary.fieldCoverage[field] = {
        count: coverage,
        percentage: ((coverage / data.length) * 100).toFixed(2) + '%',
        isRequired: rules.required.includes(field)
      };
    });
  }
  
  // Generate recommendations
  if (validationResults.invalidRows > 0) {
    summary.recommendations.push(`Fix validation errors in ${validationResults.invalidRows} rows before importing`);
  }
  
  if (validationResults.duplicates.length > 0) {
    summary.recommendations.push(`Resolve ${validationResults.duplicates.length} duplicate entries`);
  }
  
  if (validationResults.warnings.length > 10) {
    summary.recommendations.push('Review warnings to ensure data quality');
  }
  
  // Check for missing required fields
  Object.entries(summary.fieldCoverage).forEach(([field, coverage]) => {
    if (coverage.isRequired && coverage.count < data.length) {
      summary.recommendations.push(`Complete missing required field "${field}" in ${data.length - coverage.count} rows`);
    }
  });
  
  return summary;
}

export default {
  VALIDATION_RULES,
  validateRow,
  validateImportData,
  autoCorrectImportData,
  generateImportSummary
};
