import logger from '../utils/logger';
import { supabase } from '../supabase/client';

/**
 * Service for handling temporary customer workflow
 * Uses a universal "Temp Customer" account for walk-in assignments
 */
export class TemporaryCustomerService {

  /**
   * Get the universal "Temp Customer" account for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Temp customer account
   */
  static async getTempCustomerAccount(organizationId) {
    try {
      logger.log('Getting temp customer account for organization:', organizationId);
      
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      // Try to find temp customer - handle case where customer_type column might not exist
      let data, error;
      
      try {
        const result = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('customer_type', 'TEMPORARY')
          .eq('name', 'Temp Customer')
          .single();
        data = result.data;
        error = result.error;
      } catch (columnError) {
        // If customer_type column doesn't exist, search by name only
        if (columnError.message.includes('customer_type')) {
          logger.log('customer_type column not found, searching by name only...');
          const result = await supabase
            .from('customers')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('name', 'Temp Customer')
            .single();
          data = result.data;
          error = result.error;
        } else {
          throw columnError;
        }
      }

      logger.log('Temp customer query result:', { data, error });

      if (error && error.code === 'PGRST116') {
        // If temp customer doesn't exist, create it
        logger.log('Temp customer not found, creating new one...');
        return await this.createTempCustomerAccount(organizationId);
      }

      if (error) throw error;

      return {
        success: true,
        customer: data,
        message: 'Temp customer account found'
      };

    } catch (error) {
      logger.error('Error getting temp customer account:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to get temp customer account: ${error.message}`
      };
    }
  }

  /**
   * Create the universal "Temp Customer" account for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Created temp customer account
   */
  static async createTempCustomerAccount(organizationId) {
    try {
      logger.log('Creating temp customer account for organization:', organizationId);
      
      const tempCustomerData = {
        CustomerListID: `TEMP-CUSTOMER-${organizationId}`,
        name: 'Temp Customer',
        contact_details: 'Universal temporary customer account for walk-in assignments',
        phone: 'N/A',
        customer_type: 'TEMPORARY',
        organization_id: organizationId,
        barcode: `TEMP-CUSTOMER-${organizationId}`,
        customer_barcode: `TEMP-CUSTOMER-${organizationId}`
      };

      logger.log('Temp customer data to insert:', tempCustomerData);

      const { data, error } = await supabase
        .from('customers')
        .insert([tempCustomerData])
        .select()
        .single();

      logger.log('Temp customer insert result:', { data, error });

      // Handle duplicate key error - temp customer already exists
      if (error && (error.message.includes('duplicate key') || error.message.includes('unique constraint'))) {
        logger.log('Temp customer already exists, fetching existing one...');
        
        // Fetch the existing temp customer
        const { data: existingData, error: fetchError } = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('name', 'Temp Customer')
          .single();
        
        if (fetchError) {
          logger.error('Failed to fetch existing temp customer:', fetchError);
          throw fetchError;
        }
        
        logger.log('Found existing temp customer:', existingData);
        return {
          success: true,
          customer: existingData,
          message: 'Temp customer account found (already existed)'
        };
      }

      // If error is due to missing customer_type column, try without it (migration not applied yet)
      if (error && error.message.includes('customer_type')) {
        logger.log('customer_type column not found, trying without it...');
        const fallbackData = { ...tempCustomerData };
        delete fallbackData.customer_type;
        
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('customers')
          .insert([fallbackData])
          .select()
          .single();
        
        if (fallbackError) {
          // Check if this is also a duplicate key error
          if (fallbackError.message.includes('duplicate key') || fallbackError.message.includes('unique constraint')) {
            logger.log('Fallback: temp customer already exists, fetching...');
            const { data: existingData, error: fetchError } = await supabase
              .from('customers')
              .select('*')
              .eq('organization_id', organizationId)
              .eq('name', 'Temp Customer')
              .single();
            
            if (fetchError) throw fetchError;
            
            return {
              success: true,
              customer: existingData,
              message: 'Temp customer account found (fallback mode, already existed)'
            };
          }
          
          logger.error('Fallback insert also failed:', fallbackError);
          throw fallbackError;
        }
        
        logger.log('Fallback insert successful:', fallbackResult);
        return {
          success: true,
          customer: fallbackResult,
          message: 'Temp customer account created successfully (fallback mode)'
        };
      }

      if (error) throw error;

      return {
        success: true,
        customer: data,
        message: 'Temp customer account created successfully'
      };

    } catch (error) {
      logger.error('Error creating temp customer account:', error);
      logger.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return {
        success: false,
        error: error.message,
        message: `Failed to create temp customer account: ${error.message}`
      };
    }
  }

  /**
   * Assign an item to the temp customer account
   * @param {string} bottleId - Item/bottle ID to assign
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Result of assignment
   */
  static async assignToTempCustomer(bottleId, organizationId) {
    try {
      // Get temp customer account
      const tempResult = await this.getTempCustomerAccount(organizationId);
      if (!tempResult.success) {
        return tempResult;
      }

      // Assign the item to temp customer
      const { data, error } = await supabase
        .from('bottles')
        .update({
          assigned_customer: tempResult.customer.CustomerListID,
          customer_name: tempResult.customer.name
        })
        .eq('id', bottleId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        item: data,
        tempCustomer: tempResult.customer,
        message: 'Item assigned to temp customer successfully'
      };

    } catch (error) {
      logger.error('Error assigning to temp customer:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to assign item to temp customer'
      };
    }
  }

  /**
   * Reassign items from temp customer to a real customer
   * @param {Array<string>} bottleIds - Array of bottle/item IDs to reassign
   * @param {string} newCustomerId - New customer ID to assign to
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Result of reassignment
   */
  static async reassignFromTempCustomer(bottleIds, newCustomerId, organizationId) {
    try {
      // Get the new customer details
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('CustomerListID', newCustomerId)
        .eq('organization_id', organizationId)
        .single();

      if (customerError) throw customerError;

      // Update all the bottles to the new customer
      const { data, error } = await supabase
        .from('bottles')
        .update({
          assigned_customer: newCustomerId,
          customer_name: newCustomer.name
        })
        .in('id', bottleIds)
        .eq('organization_id', organizationId)
        .select();

      if (error) throw error;

      return {
        success: true,
        reassignedItems: data,
        newCustomer: newCustomer,
        count: data.length,
        message: `${data.length} items reassigned to ${newCustomer.name} successfully`
      };

    } catch (error) {
      logger.error('Error reassigning from temp customer:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to reassign items from temp customer'
      };
    }
  }

  /**
   * Get all items assigned to the temp customer
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Items assigned to temp customer
   */
  static async getTempCustomerItems(organizationId) {
    try {
      // Get temp customer account
      const tempResult = await this.getTempCustomerAccount(organizationId);
      if (!tempResult.success) {
        return tempResult;
      }

      // Get all items assigned to temp customer
      const { data, error } = await supabase
        .from('bottles')
        .select('*')
        .eq('assigned_customer', tempResult.customer.CustomerListID)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        items: data || [],
        count: data?.length || 0,
        tempCustomer: tempResult.customer
      };

    } catch (error) {
      logger.error('Error getting temp customer items:', error);
      return {
        success: false,
        error: error.message,
        items: []
      };
    }
  }

  /**
   * Search for customers (excluding temp customer) for reassignment
   * @param {string} searchTerm - Search term
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Search results
   */
  static async searchCustomersForReassignment(searchTerm, organizationId) {
    try {
      let query = supabase
        .from('customers')
        .select('CustomerListID, name, contact_details, phone, customer_type')
        .eq('organization_id', organizationId)
        .neq('customer_type', 'TEMPORARY'); // Exclude temp customers

      if (searchTerm && searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`name.ilike.${term},CustomerListID.ilike.${term},contact_details.ilike.${term}`);
      }

      const { data, error } = await query
        .order('name')
        .limit(20);

      if (error) throw error;

      return {
        success: true,
        customers: data || [],
        count: data?.length || 0
      };

    } catch (error) {
      logger.error('Error searching customers:', error);
      return {
        success: false,
        error: error.message,
        customers: []
      };
    }
  }
}

export default TemporaryCustomerService;