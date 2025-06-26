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
 * Batch validate multiple customers
 * @param {Array} customers - Array of customer objects with name and id
 * @returns {Promise<Object>} Object with valid and invalid customers
 */
export async function batchValidateCustomers(customers) {
  const valid = [];
  const invalid = [];
  
  for (const customer of customers) {
    const found = await findCustomer(customer.name, customer.id);
    if (found) {
      valid.push({ ...customer, found });
    } else {
      invalid.push(customer);
    }
  }
  
  return { valid, invalid };
} 