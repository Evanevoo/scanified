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
    console.error('Error fetching customer suggestions:', error);
    return [];
  }
  
  return customers || [];
}

/**
 * Batch find customers efficiently (single query)
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
  
  // Extract all CustomerListIDs and names for batch lookup
  const customerIds = customers.map(c => c.CustomerListID).filter(Boolean);
  const customerNames = customers.map(c => c.name).filter(Boolean);
  
  // Single query to get all existing customers
  let query = supabase
    .from('customers')
    .select('CustomerListID, name, contact_details, phone, address2, address3, address4, address5, city, postal_code, barcode')
    .eq('organization_id', organizationId);
  
  // Build OR condition for IDs and names
  const orConditions = [];
  if (customerIds.length > 0) {
    orConditions.push(...customerIds.map(id => `CustomerListID.ilike.${id.trim()}`));
  }
  if (customerNames.length > 0) {
    orConditions.push(...customerNames.map(name => `name.ilike.${name.trim()}`));
  }
  
  if (orConditions.length > 0) {
    query = query.or(orConditions.join(','));
  }
  
  const { data: existingCustomers, error } = await query;
  
  if (error) {
    console.error('Error in batch customer lookup:', error);
    return {};
  }
  
  // Create lookup map with enhanced matching
  const customerMap = {};
  
  for (const customer of customers) {
    const key = `${customer.CustomerListID || ''}_${customer.name || ''}`;
    
    // Find matching existing customer with multiple strategies
    const found = existingCustomers?.find(existing => {
      // Strategy 1: Exact ID match (case-insensitive)
      if (customer.CustomerListID && existing.CustomerListID) {
        if (existing.CustomerListID.toLowerCase() === customer.CustomerListID.toLowerCase()) {
          return true;
        }
        
        // Strategy 2: Similar ID match (handle cases like 800006B3-1611180703 vs 800006B3-1611180703A)
        const customerIdBase = customer.CustomerListID.toLowerCase().replace(/[a-z]+$/, '');
        const existingIdBase = existing.CustomerListID.toLowerCase().replace(/[a-z]+$/, '');
        if (customerIdBase && existingIdBase && customerIdBase === existingIdBase && customerIdBase.length > 5) {
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