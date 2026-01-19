import logger from '../utils/logger';
import { supabase } from '../supabase/client';

/**
 * Enhanced customer matching function with multiple strategies
 * @param {string} customerName - Customer name (can include ID in parentheses)
 * @param {string} customerId - Customer ID
 * @param {string} organizationId - Organization ID for filtering
 * @returns {Promise<Object|null>} Customer object or null if not found
 */
export async function findCustomer(customerName, customerId, organizationId = null) {
  if (!customerName && !customerId) return null;
  
  // Get current user's organization_id if not provided
  if (!organizationId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      organizationId = profile?.organization_id;
    }
  }
  
  // Build query with organization filter
  const buildQuery = (query) => {
    if (organizationId) {
      return query.eq('organization_id', organizationId);
    }
    return query;
  };
  
  // Strategy 1: Match by exact CustomerListID (case-insensitive)
  if (customerId) {
    const { data: customer, error } = await buildQuery(
      supabase
        .from('customers')
        .select('CustomerListID, name, contact_details, phone')
        .ilike('CustomerListID', customerId.trim())
    ).single();
    
    if (customer && !error) {
      return customer;
    }
  }
  
  // Strategy 2: Parse customer name with ID in parentheses
  if (customerName) {
    const idMatch = customerName.match(/\(([^)]+)\)$/);
    if (idMatch) {
      const extractedId = idMatch[1].trim();
      const { data: customer, error } = await buildQuery(
        supabase
          .from('customers')
          .select('CustomerListID, name, contact_details, phone')
          .ilike('CustomerListID', extractedId)
      ).single();
      
      if (customer && !error) {
        return customer;
      }
    }
  }
  
  // Strategy 3: Match by normalized name (remove parentheses and IDs)
  if (customerName) {
    const normalizedName = customerName.replace(/\([^)]*\)/g, '').trim();
    const { data: customer, error } = await buildQuery(
      supabase
        .from('customers')
        .select('CustomerListID, name, contact_details, phone')
        .ilike('name', normalizedName)
    ).single();
    
    if (customer && !error) {
      return customer;
    }
  }
  
  // Strategy 4: Fuzzy name matching (case-insensitive)
  if (customerName) {
    const { data: customers, error } = await buildQuery(
      supabase
        .from('customers')
        .select('CustomerListID, name, contact_details, phone')
        .ilike('name', `%${customerName.trim()}%`)
    );
    
    if (customers && customers.length > 0 && !error) {
      // Return the first match (most exact)
      return customers[0];
    }
  }
  
  return null;
}

/**
 * Helper to normalize customer names for matching
 * @param {string} name - Customer name
 * @returns {string} Normalized name
 */
export function normalizeCustomerName(name) {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Extract customer ID from a string like "Name (ID)"
 * @param {string} val - String containing customer name and ID
 * @returns {string} Extracted ID or original string
 */
export function extractCustomerId(val) {
  if (!val) return '';
  const match = val.match(/\(([^)]+)\)$/);
  return match ? match[1].trim() : val.trim();
}

/**
 * Validate if a customer exists in the database
 * @param {string} customerName - Customer name
 * @param {string} customerId - Customer ID
 * @returns {Promise<boolean>} True if customer exists
 */
export async function validateCustomerExists(customerName, customerId) {
  const customer = await findCustomer(customerName, customerId);
  return customer !== null;
}

/**
 * Get customer suggestions for autocomplete
 * @param {string} searchTerm - Search term
 * @param {number} limit - Maximum number of suggestions
 * @returns {Promise<Array>} Array of customer suggestions
 */
export async function getCustomerSuggestions(searchTerm, limit = 10) {
  if (!searchTerm || searchTerm.trim().length < 2) return [];
  
  const { data: customers, error } = await supabase
    .from('customers')
    .select('CustomerListID, name, contact_details, phone')
    .or(`CustomerListID.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
    .limit(limit);
  
  if (error) {
    logger.error('Error fetching customer suggestions:', error);
    return [];
  }
  
  return customers || [];
}

/**
 * Normalize CustomerListID for comparison (lowercase, remove trailing letters)
 * @param {string} id - CustomerListID
 * @returns {string} Normalized ID
 */
function normalizeCustomerId(id) {
  if (!id) return '';
  // Convert to lowercase and remove trailing letters (e.g., "80000C0A-1744057121A" -> "80000c0a-1744057121")
  return id.toLowerCase().trim().replace(/[a-z]+$/, '');
}

/**
 * Batch find customers efficiently (chunked queries to avoid URL length limits)
 * @param {Array} customers - Array of customer objects with {name, CustomerListID}
 * @param {string} organizationId - Organization ID for filtering
 * @returns {Promise<Object>} Map of customer key to found customer
 */
export async function batchFindCustomers(customers, organizationId = null) {
  if (!customers || customers.length === 0) return {};
  
  // Get current user's organization_id if not provided
  if (!organizationId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      organizationId = profile?.organization_id;
    }
  }
  
  if (!organizationId) return {};
  
  // Normalize and deduplicate customer IDs and names
  const normalizedIds = new Set();
  const idMap = new Map(); // normalized -> original
  const normalizedNames = new Set();
  const nameMap = new Map(); // normalized -> original
  
  for (const customer of customers) {
    if (customer.CustomerListID) {
      const normalized = normalizeCustomerId(customer.CustomerListID);
      if (normalized) {
        normalizedIds.add(normalized);
        if (!idMap.has(normalized)) {
          idMap.set(normalized, []);
        }
        idMap.get(normalized).push(customer.CustomerListID);
      }
    }
    if (customer.name) {
      const normalized = customer.name.toLowerCase().trim();
      if (normalized) {
        normalizedNames.add(normalized);
        if (!nameMap.has(normalized)) {
          nameMap.set(normalized, []);
        }
        nameMap.get(normalized).push(customer.name);
      }
    }
  }
  
  // Fetch all existing customers in chunks to avoid URL length limits
  // Since we're normalizing IDs, we need to fetch all customers and match in JavaScript
  // But to optimize, we'll fetch in chunks using pattern matching
  const CHUNK_SIZE = 100; // Limit OR conditions per query
  const allExistingCustomers = [];
  const seenCustomerKeys = new Set(); // Track unique customers by ID+name
  
  // Fetch by normalized IDs in chunks
  // Use exact match with ilike (case-insensitive) - we'll handle trailing letter matching in JavaScript
  const idArray = Array.from(normalizedIds);
  for (let i = 0; i < idArray.length; i += CHUNK_SIZE) {
    const chunk = idArray.slice(i, i + CHUNK_SIZE);
    const orConditions = chunk.map(id => {
      // Use exact match with ilike (case-insensitive)
      // PostgREST will handle URL encoding automatically
      return `CustomerListID.ilike.${id}`;
    });
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, contact_details, phone, address2, address3, address4, address5, city, postal_code, barcode')
        .eq('organization_id', organizationId)
        .or(orConditions.join(','));
      
      if (error) {
        logger.error(`Error in batch customer lookup (chunk ${Math.floor(i / CHUNK_SIZE) + 1}):`, error);
      } else if (data) {
        for (const customer of data) {
          // Use normalized ID+name+barcode for uniqueness
          const normalizedId = normalizeCustomerId(customer.CustomerListID || '');
          const normalizedBarcode = (customer.barcode || '').toString().toLowerCase().trim();
          const key = `${normalizedId}_${(customer.name || '').toLowerCase()}_${normalizedBarcode}`;
          if (!seenCustomerKeys.has(key)) {
            seenCustomerKeys.add(key);
            allExistingCustomers.push(customer);
          }
        }
      }
    } catch (err) {
      logger.error(`Error fetching customer chunk:`, err);
    }
  }
  
  // Also fetch customers that might match with trailing letters
  // We'll do this by fetching customers whose IDs start with our normalized IDs
  // Use a different approach: fetch all customers and filter in JavaScript for better performance
  // But first, let's try to fetch by pattern matching for IDs that start with normalized ID
  for (let i = 0; i < idArray.length; i += CHUNK_SIZE) {
    const chunk = idArray.slice(i, i + CHUNK_SIZE);
    const orConditions = chunk.map(id => {
      // Use pattern matching to find IDs that start with normalized ID (handles trailing letters)
      return `CustomerListID.ilike.*${id}*`;
    });
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, contact_details, phone, address2, address3, address4, address5, city, postal_code, barcode')
        .eq('organization_id', organizationId)
        .or(orConditions.join(','));
      
      if (error) {
        // Pattern matching might not be supported, skip silently
        logger.log(`Pattern matching not available, using exact matches only`);
      } else if (data) {
        for (const customer of data) {
          const normalizedId = normalizeCustomerId(customer.CustomerListID || '');
          const normalizedBarcode = (customer.barcode || '').toString().toLowerCase().trim();
          const key = `${normalizedId}_${(customer.name || '').toLowerCase()}_${normalizedBarcode}`;
          if (!seenCustomerKeys.has(key)) {
            seenCustomerKeys.add(key);
            allExistingCustomers.push(customer);
          }
        }
      }
    } catch (err) {
      // Pattern matching might fail, that's okay - we'll match in JavaScript
      logger.log(`Pattern matching failed, will match in JavaScript:`, err.message);
    }
  }
  
  // Fetch by normalized names in chunks
  const nameArray = Array.from(normalizedNames);
  for (let i = 0; i < nameArray.length; i += CHUNK_SIZE) {
    const chunk = nameArray.slice(i, i + CHUNK_SIZE);
    const orConditions = chunk.map(name => {
      return `name.ilike.${name}`;
    });
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, contact_details, phone, address2, address3, address4, address5, city, postal_code, barcode')
        .eq('organization_id', organizationId)
        .or(orConditions.join(','));
      
      if (error) {
        logger.error(`Error in batch customer lookup by name (chunk ${Math.floor(i / CHUNK_SIZE) + 1}):`, error);
      } else if (data) {
        // Only add if not already in allExistingCustomers (avoid duplicates)
        for (const customer of data) {
          const normalizedId = normalizeCustomerId(customer.CustomerListID || '');
          const normalizedBarcode = (customer.barcode || '').toString().toLowerCase().trim();
          const key = `${normalizedId}_${(customer.name || '').toLowerCase()}_${normalizedBarcode}`;
          if (!seenCustomerKeys.has(key)) {
            seenCustomerKeys.add(key);
            allExistingCustomers.push(customer);
          }
        }
      }
    } catch (err) {
      logger.error(`Error fetching customer chunk by name:`, err);
    }
  }
  
  // Also fetch by barcodes (case-insensitive) to catch duplicates
  const barcodesToCheck = new Set();
  for (const customer of customers) {
    if (customer.barcode) {
      const normalizedBarcode = customer.barcode.toString().toLowerCase().trim();
      if (normalizedBarcode) {
        barcodesToCheck.add(normalizedBarcode);
      }
    }
  }
  
  if (barcodesToCheck.size > 0) {
    const barcodeArray = Array.from(barcodesToCheck);
    for (let i = 0; i < barcodeArray.length; i += CHUNK_SIZE) {
      const chunk = barcodeArray.slice(i, i + CHUNK_SIZE);
      const orConditions = chunk.map(barcode => {
        return `barcode.ilike.${barcode}`;
      });
      
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('CustomerListID, name, contact_details, phone, address2, address3, address4, address5, city, postal_code, barcode')
          .eq('organization_id', organizationId)
          .or(orConditions.join(','));
        
        if (!error && data) {
          for (const customer of data) {
            const normalizedId = normalizeCustomerId(customer.CustomerListID || '');
            const normalizedBarcode = (customer.barcode || '').toString().toLowerCase().trim();
            const key = `${normalizedId}_${(customer.name || '').toLowerCase()}_${normalizedBarcode}`;
            if (!seenCustomerKeys.has(key)) {
              seenCustomerKeys.add(key);
              allExistingCustomers.push(customer);
            }
          }
        }
      } catch (err) {
        logger.error(`Error fetching customer chunk by barcode:`, err);
      }
    }
  }
  
  // Create lookup map with enhanced matching
  const customerMap = {};
  
  for (const customer of customers) {
    const key = `${customer.CustomerListID || ''}_${customer.name || ''}`;
    
    // Normalize barcode for comparison
    const normalizeBarcode = (barcode) => {
      if (!barcode) return '';
      return barcode.toString().trim().toLowerCase();
    };
    
    const customerBarcodeNorm = normalizeBarcode(customer.barcode);
    
    // Find matching existing customer with multiple strategies
    const found = allExistingCustomers?.find(existing => {
      // Strategy 1: Normalized ID match (handles case and trailing letters)
      if (customer.CustomerListID && existing.CustomerListID) {
        const customerIdNorm = normalizeCustomerId(customer.CustomerListID);
        const existingIdNorm = normalizeCustomerId(existing.CustomerListID);
        if (customerIdNorm && existingIdNorm && customerIdNorm === existingIdNorm) {
          return true;
        }
      }
      
      // Strategy 2: Barcode match (case-insensitive)
      if (customerBarcodeNorm && existing.barcode) {
        const existingBarcodeNorm = normalizeBarcode(existing.barcode);
        if (customerBarcodeNorm && existingBarcodeNorm && customerBarcodeNorm === existingBarcodeNorm) {
          return true;
        }
      }
      
      // Strategy 3: Exact name match (case-insensitive)
      if (customer.name && existing.name) {
        if (existing.name.toLowerCase().trim() === customer.name.toLowerCase().trim()) {
          return true;
        }
      }
      
      // Strategy 4: Name similarity (fuzzy match for slight variations)
      if (customer.name && existing.name) {
        const customerNameNorm = customer.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const existingNameNorm = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (customerNameNorm && existingNameNorm && customerNameNorm === existingNameNorm && customerNameNorm.length > 5) {
          return true;
        }
      }
      
      return false;
    });
    
    customerMap[key] = found || null;
  }
  
  return customerMap;
}

/**
 * Batch validate multiple customers
 * @param {Array} customers - Array of customer objects with name and id
 * @returns {Promise<Object>} Object with valid and invalid customers
 */
export async function batchValidateCustomers(customers) {
  const customerMap = await batchFindCustomers(customers);
  const valid = [];
  const invalid = [];
  
  for (const customer of customers) {
    const key = `${customer.CustomerListID || ''}_${customer.name || ''}`;
    const found = customerMap[key];
    
    if (found) {
      valid.push({ ...customer, found });
    } else {
      invalid.push(customer);
    }
  }
  
  return { valid, invalid };
} 