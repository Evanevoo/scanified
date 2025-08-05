/**
 * QuickBooks Integration Service
 * Handles export/import operations to replace Zed Axis functionality
 */

export class QuickBooksService {
  
  /**
   * Export customers to QuickBooks IIF format
   * @param {Array} customers - Array of customer objects
   * @returns {string} IIF formatted string
   */
  static exportCustomersToIIF(customers) {
    const lines = [
      // Header for customers
      '!HDR\tCUST\tNAME\tBDATE\tCUSTTYPE\tTERMS\tNOTEPAD\tSALESREP\tTAXCODE\tLIMIT\tRESALE\tREP\tTAXABLE\tSALESTAXCODE\tADDR1\tADDR2\tADDR3\tADDR4\tADDR5\tVENDTYPE\tCONT1\tCONT2\tPHONE1\tPHONE2\tFAXNUM\tEMAIL\tNOTE\tTAXID\tLIMITSTR\tTERMSSTR\tCREDITLIMIT\tACCNUM\tEXTRA',
      
      // Customer data
      ...customers.map(customer => {
        const fields = [
          'CUST',                                    // Record type
          customer.name || '',                       // Customer name
          '',                                        // Birth date
          '',                                        // Customer type
          '',                                        // Terms
          customer.notes || '',                      // Notepad
          '',                                        // Sales rep
          '',                                        // Tax code
          '',                                        // Credit limit
          '',                                        // Resale number
          '',                                        // Rep
          'Y',                                       // Taxable
          '',                                        // Sales tax code
          customer.address || '',                    // Address line 1
          customer.address2 || '',                   // Address line 2
          customer.city || '',                       // Address line 3
          customer.state || '',                      // Address line 4
          customer.zip_code || '',                   // Address line 5
          '',                                        // Vendor type
          customer.contact_name || '',               // Contact 1
          '',                                        // Contact 2
          customer.phone || '',                      // Phone 1
          customer.phone2 || '',                     // Phone 2
          customer.fax || '',                        // Fax
          customer.email || '',                      // Email
          customer.notes || '',                      // Note
          customer.tax_id || '',                     // Tax ID
          '',                                        // Limit string
          '',                                        // Terms string
          customer.credit_limit || '',               // Credit limit
          customer.CustomerListID || customer.customer_number || '', // Account number
          ''                                         // Extra
        ];
        return fields.join('\t');
      })
    ];
    
    return lines.join('\n');
  }

  /**
   * Export inventory items (bottles/assets) to QuickBooks IIF format
   * @param {Array} items - Array of inventory items
   * @returns {string} IIF formatted string
   */
  static exportInventoryToIIF(items) {
    const lines = [
      // Header for inventory items
      '!HDR\tINVITEM\tNAME\tREFNUM\tTIMESTAMP\tINVITEMTYPE\tDESC\tPURCHASEDESC\tACCNT\tASSTACCNT\tCOGSACCNT\tDATE\tUSERID\tVENDOR\tREORDERPOINT\tQTYONHAND\tQTYONORDER\tQTYONSALESORDER\tAVGCOST\tLASTCOST\tSALESPRICE\tTAXABLE\tCUSTOMFLD1\tCUSTOMFLD2\tCUSTOMFLD3\tCUSTOMFLD4\tCUSTOMFLD5\tCUSTOMFLD6\tCUSTOMFLD7\tCUSTOMFLD8\tCUSTOMFLD9\tCUSTOMFLD10\tCUSTOMFLD11\tCUSTOMFLD12\tCUSTOMFLD13\tCUSTOMFLD14\tCUSTOMFLD15',
      
      // Inventory items
      ...items.map(item => {
        const fields = [
          'INVITEM',                                 // Record type
          item.barcode_number || item.serial_number, // Item name
          item.barcode_number || '',                 // Reference number
          '',                                        // Timestamp
          'INVENTORY',                               // Item type
          `${item.asset_type || 'Asset'} - ${item.barcode_number || item.serial_number}`, // Description
          `${item.asset_type || 'Asset'} - ${item.barcode_number || item.serial_number}`, // Purchase description
          'Inventory Asset',                         // Asset account
          'Inventory Asset',                         // Asset account
          'Cost of Goods Sold',                     // COGS account
          new Date().toLocaleDateString(),           // Date
          '',                                        // User ID
          '',                                        // Vendor
          '1',                                       // Reorder point
          item.status === 'available' ? '1' : '0',  // Qty on hand
          '0',                                       // Qty on order
          '0',                                       // Qty on sales order
          '0.00',                                    // Average cost
          '0.00',                                    // Last cost
          '0.00',                                    // Sales price
          'Y',                                       // Taxable
          item.group_name || '',                     // Custom field 1 - Asset type
          item.assigned_customer || '',              // Custom field 2 - Customer
          item.status || '',                         // Custom field 3 - Status
          item.location || '',                       // Custom field 4 - Location
          item.serial_number || '',                  // Custom field 5 - Serial
          item.last_scan_date || '',                 // Custom field 6 - Last scan
          item.fill_count || '0',                    // Custom field 7 - Fill count
          item.pressure || '',                       // Custom field 8 - Pressure
          item.gas_type || '',                       // Custom field 9 - Gas type
          item.size || '',                           // Custom field 10 - Size
          item.owner || '',                          // Custom field 11 - Owner
          item.rental_rate || '',                    // Custom field 12 - Rental rate
          item.purchase_date || '',                  // Custom field 13 - Purchase date
          item.warranty_date || '',                  // Custom field 14 - Warranty
          item.notes || ''                           // Custom field 15 - Notes
        ];
        return fields.join('\t');
      })
    ];
    
    return lines.join('\n');
  }

  /**
   * Export transactions to QuickBooks IIF format
   * @param {Array} transactions - Array of transaction objects
   * @returns {string} IIF formatted string
   */
  static exportTransactionsToIIF(transactions) {
    const lines = [
      // Header for transactions
      '!HDR\tTRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO\tCLEAR\tTOPRINT\tNAMETXN\tADDR1\tADDR2\tADDR3\tADDR4\tADDR5',
      '!HDR\tSPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO\tCLEAR\tQNTY\tPRICE\tINVITEM\tPAYMETH\tTAXABLE\tVATCODE\tVATAMOUNT\tEXTRA',
      
      // Transaction data
      ...transactions.flatMap(transaction => {
        const transactionLines = [];
        
        // Main transaction line
        transactionLines.push([
          'TRNS',                                    // Record type
          transaction.type || 'INVOICE',             // Transaction type
          new Date(transaction.date).toLocaleDateString(), // Date
          'Accounts Receivable',                     // Account
          transaction.customer_name || '',           // Customer name
          '',                                        // Class
          transaction.total_amount || '0.00',        // Amount
          transaction.invoice_number || '',          // Document number
          transaction.memo || '',                    // Memo
          'N',                                       // Clear
          'Y',                                       // To print
          transaction.customer_name || '',           // Name for transaction
          transaction.billing_address || '',         // Address 1
          '',                                        // Address 2
          transaction.billing_city || '',            // Address 3
          transaction.billing_state || '',           // Address 4
          transaction.billing_zip || ''              // Address 5
        ].join('\t'));

        // Split lines for each item
        if (transaction.items && transaction.items.length > 0) {
          transaction.items.forEach(item => {
            transactionLines.push([
              'SPL',                                 // Record type
              transaction.type || 'INVOICE',         // Transaction type
              new Date(transaction.date).toLocaleDateString(), // Date
              'Sales',                               // Account
              transaction.customer_name || '',       // Customer name
              '',                                    // Class
              `-${item.amount || '0.00'}`,          // Amount (negative for sales)
              transaction.invoice_number || '',      // Document number
              item.description || '',                // Memo
              'N',                                   // Clear
              item.quantity || '1',                  // Quantity
              item.unit_price || '0.00',            // Price
              item.barcode_number || '',             // Inventory item
              '',                                    // Payment method
              'Y',                                   // Taxable
              '',                                    // VAT code
              '0.00',                               // VAT amount
              ''                                     // Extra
            ].join('\t'));
          });
        }
        
        return transactionLines;
      })
    ];
    
    return lines.join('\n');
  }

  /**
   * Create a downloadable IIF file
   * @param {string} content - IIF content
   * @param {string} filename - Filename for download
   */
  static downloadIIF(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.iif') ? filename : `${filename}.iif`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Parse imported QuickBooks data (CSV format)
   * @param {string} csvContent - CSV content from QuickBooks export
   * @returns {Array} Parsed data array
   */
  static parseQuickBooksCSV(csvContent) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      const record = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      data.push(record);
    }

    return data;
  }

  /**
   * Parse a single CSV line handling quoted values
   * @param {string} line - CSV line
   * @returns {Array} Array of values
   */
  static parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  /**
   * Generate QuickBooks compatible customer numbers
   * @param {string} prefix - Prefix for customer numbers
   * @param {number} startNumber - Starting number
   * @param {number} count - Number of customer numbers to generate
   * @returns {Array} Array of customer numbers
   */
  static generateCustomerNumbers(prefix = 'CUST', startNumber = 1, count = 1) {
    const numbers = [];
    for (let i = 0; i < count; i++) {
      const number = (startNumber + i).toString().padStart(6, '0');
      numbers.push(`${prefix}${number}`);
    }
    return numbers;
  }

  /**
   * Validate QuickBooks data format
   * @param {Array} data - Data to validate
   * @param {string} type - Type of data (customers, inventory, transactions)
   * @returns {Object} Validation result
   */
  static validateData(data, type) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(data) || data.length === 0) {
      errors.push('No data provided');
      return { valid: false, errors, warnings };
    }

    switch (type) {
      case 'customers':
        data.forEach((customer, index) => {
          if (!customer.name) {
            errors.push(`Row ${index + 1}: Customer name is required`);
          }
          if (!customer.CustomerListID && !customer.customer_number) {
            warnings.push(`Row ${index + 1}: No customer ID provided, will generate one`);
          }
        });
        break;

      case 'inventory':
        data.forEach((item, index) => {
          if (!item.barcode_number && !item.serial_number) {
            errors.push(`Row ${index + 1}: Either barcode or serial number is required`);
          }
        });
        break;

      case 'transactions':
        data.forEach((transaction, index) => {
          if (!transaction.customer_name) {
            errors.push(`Row ${index + 1}: Customer name is required`);
          }
          if (!transaction.date) {
            errors.push(`Row ${index + 1}: Transaction date is required`);
          }
          if (!transaction.total_amount) {
            warnings.push(`Row ${index + 1}: No amount specified`);
          }
        });
        break;

      default:
        errors.push('Unknown data type');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default QuickBooksService;