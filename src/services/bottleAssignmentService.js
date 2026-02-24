/**
 * Shared bottle assignment service.
 * Wraps the database RPC for transactional bottle assignment during verification.
 * This consolidates the two divergent assignment implementations
 * (ImportApprovalDetail.jsx and ImportApprovals.jsx) into one consistent path.
 */
import { supabase } from '../supabase/client';
import logger from '../utils/logger';

export const bottleAssignmentService = {
  /**
   * Assign bottles to a customer during order verification.
   * Uses the `assign_bottles_to_customer` RPC for transactional safety.
   *
   * @param {Object} params
   * @param {string} params.organizationId
   * @param {string} params.customerId - CustomerListID or customer identifier
   * @param {string} params.customerName
   * @param {string[]} params.shipBarcodes - barcodes being shipped out
   * @param {string[]} params.returnBarcodes - barcodes being returned
   * @param {string} [params.importRecordId] - UUID of the import record being verified
   * @param {string} [params.importTable] - 'imported_invoices' or 'imported_sales_receipts'
   * @param {number} [params.defaultRentalAmount=10] - monthly rental rate
   * @param {number} [params.defaultTaxRate=0.11] - tax rate
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async assignBottles({
    organizationId,
    customerId,
    customerName,
    shipBarcodes = [],
    returnBarcodes = [],
    importRecordId = null,
    importTable = 'imported_invoices',
    defaultRentalAmount = 10,
    defaultTaxRate = 0.11,
    orderNumber = null,
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('assign_bottles_to_customer', {
        p_organization_id: organizationId,
        p_customer_id: customerId,
        p_customer_name: customerName,
        p_ship_barcodes: shipBarcodes,
        p_return_barcodes: returnBarcodes,
        p_import_record_id: importRecordId,
        p_import_table: importTable,
        p_user_id: user?.id || null,
        p_default_rental_amount: defaultRentalAmount,
        p_default_tax_rate: defaultTaxRate,
        p_order_number: orderNumber,
      });

      if (error) {
        logger.error('assign_bottles_to_customer RPC error:', error);
        return { success: false, error: error.message };
      }

      if (data && data.success === false) {
        return { success: false, error: data.error || 'Assignment failed' };
      }

      logger.log('Bottle assignment result:', data);
      return { success: true, data };
    } catch (err) {
      logger.error('bottleAssignmentService.assignBottles error:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Unverify an order, reversing bottle assignments and cleaning up DNS records.
   * Uses the `unverify_order` RPC for transactional safety.
   */
  async unverifyOrder({
    importRecordId,
    importTable = 'imported_invoices',
    organizationId,
    orderNumber = null,
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('unverify_order', {
        p_import_record_id: importRecordId,
        p_import_table: importTable,
        p_organization_id: organizationId,
        p_user_id: user?.id || null,
        p_order_number: orderNumber,
      });

      if (error) {
        logger.error('unverify_order RPC error:', error);
        return { success: false, error: error.message };
      }

      logger.log('Unverify result:', data);
      return { success: true, data };
    } catch (err) {
      logger.error('bottleAssignmentService.unverifyOrder error:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Return bottles to warehouse, closing associated rentals.
   * Uses the `return_bottles_to_warehouse` RPC for transactional safety.
   */
  async returnToWarehouse({ bottleIds, organizationId }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('return_bottles_to_warehouse', {
        p_bottle_ids: bottleIds,
        p_organization_id: organizationId,
        p_user_id: user?.id || null,
      });

      if (error) {
        logger.error('return_bottles_to_warehouse RPC error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      logger.error('bottleAssignmentService.returnToWarehouse error:', err);
      return { success: false, error: err.message };
    }
  },
};

export default bottleAssignmentService;
