import logger from '../utils/logger';
import { supabase } from '../supabase/client';
import { fetchOrgRentalPricingContext, monthlyRateForNewRental } from './rentalPricingContext';

export class AssetTransferService {

  /**
   * Move an active per-bottle lease to the new customer when the bottle is transferred.
   * Customer-level leases (bottle_id is null) are not moved — they remain on the original account.
   * @returns {Promise<string|null>} lease id to attach to the new rental row, or null
   */
  static async reassignPerBottleLeaseForTransfer({
    organizationId,
    bottleId,
    preferredLeaseId,
    fromCustomerId,
    toCustomerId,
    toCustomerName,
  }) {
    const updateLeaseCustomer = async (leaseId) => {
      const { error } = await supabase
        .from('lease_agreements')
        .update({
          customer_id: toCustomerId,
          customer_name: toCustomerName,
        })
        .eq('id', leaseId)
        .eq('organization_id', organizationId)
        .eq('bottle_id', bottleId)
        .eq('status', 'active');
      if (error) {
        logger.error('Lease reassignment on bottle transfer failed:', error);
        return null;
      }
      return leaseId;
    };

    if (preferredLeaseId) {
      const { data: lease } = await supabase
        .from('lease_agreements')
        .select('id, bottle_id, status')
        .eq('id', preferredLeaseId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (lease?.bottle_id === bottleId && lease.status === 'active') {
        const id = await updateLeaseCustomer(lease.id);
        if (id) return id;
      }
    }

    const { data: candidates } = await supabase
      .from('lease_agreements')
      .select('id, customer_id, status')
      .eq('organization_id', organizationId)
      .eq('bottle_id', bottleId)
      .eq('status', 'active');

    const match = (candidates || []).find((l) => l.customer_id === fromCustomerId);
    if (match) {
      return updateLeaseCustomer(match.id);
    }

    return null;
  }

  /**
   * Transfer assets from one customer to another
   * @param {Array<string>} assetIds - Array of asset/bottle IDs to transfer
   * @param {string} fromCustomerId - Source customer ID
   * @param {string} toCustomerId - Target customer ID
   * @param {string} organizationId - Organization ID
   * @param {string} reason - Reason for transfer (optional)
   * @returns {Promise<Object>} Result of transfer operation
   */
  static async transferAssets(assetIds, fromCustomerId, toCustomerId, organizationId, reason = '') {
    try {
      // Validate inputs
      if (!assetIds || assetIds.length === 0) {
        throw new Error('No assets selected for transfer');
      }

      if (!fromCustomerId || !toCustomerId) {
        throw new Error('Both source and target customers are required');
      }

      if (fromCustomerId === toCustomerId) {
        throw new Error('Cannot transfer assets to the same customer');
      }

      // Get source customer details
      const { data: fromCustomer, error: fromError } = await supabase
        .from('customers')
        .select('*')
        .eq('CustomerListID', fromCustomerId)
        .eq('organization_id', organizationId)
        .single();

      if (fromError) throw fromError;
      if (!fromCustomer) throw new Error('Source customer not found');

      // Get target customer details
      const { data: toCustomer, error: toError } = await supabase
        .from('customers')
        .select('*')
        .eq('CustomerListID', toCustomerId)
        .eq('organization_id', organizationId)
        .single();

      if (toError) throw toError;
      if (!toCustomer) throw new Error('Target customer not found');

      // Verify assets belong to source customer
      const { data: assetsToTransfer, error: assetsError } = await supabase
        .from('bottles')
        .select('*')
        .in('id', assetIds)
        .eq('organization_id', organizationId)
        .eq('assigned_customer', fromCustomerId);

      if (assetsError) throw assetsError;

      if (!assetsToTransfer || assetsToTransfer.length !== assetIds.length) {
        throw new Error('Some assets do not belong to the source customer or do not exist');
      }

      // Perform the transfer
      const { data: updatedAssets, error: updateError } = await supabase
        .from('bottles')
        .update({
          assigned_customer: toCustomerId,
          customer_name: toCustomer.name,
          updated_at: new Date().toISOString()
        })
        .in('id', assetIds)
        .eq('organization_id', organizationId)
        .select();

      if (updateError) throw updateError;

      // Keep `rentals` in sync: close open rows for the source customer and open rows for the target.
      // Otherwise the old customer's "Rental History" still shows transferred bottles (stale customer_id).
      const today = new Date().toISOString().split('T')[0];
      let rentalsClosed = 0;
      let rentalsOpened = 0;
      let leasesReassigned = 0;

      const pricingCtx = await fetchOrgRentalPricingContext(supabase, organizationId);

      const collectOpenRentalsForAsset = async (asset) => {
        const barcode = asset.barcode_number || asset.barcode || null;
        const lists = [];

        const { data: byBottleId } = await supabase
          .from('rentals')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('customer_id', fromCustomerId)
          .is('rental_end_date', null)
          .eq('bottle_id', asset.id);
        if (byBottleId?.length) lists.push(byBottleId);

        if (barcode) {
          const { data: byBarcode } = await supabase
            .from('rentals')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('customer_id', fromCustomerId)
            .is('rental_end_date', null)
            .eq('bottle_barcode', barcode);
          if (byBarcode?.length) lists.push(byBarcode);

          const { data: byNameAndBarcode } = await supabase
            .from('rentals')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('customer_name', fromCustomer.name)
            .is('rental_end_date', null)
            .eq('bottle_barcode', barcode);
          if (byNameAndBarcode?.length) lists.push(byNameAndBarcode);
        }

        const { data: byNameAndBottleId } = await supabase
          .from('rentals')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('customer_name', fromCustomer.name)
          .is('rental_end_date', null)
          .eq('bottle_id', asset.id);
        if (byNameAndBottleId?.length) lists.push(byNameAndBottleId);

        const seen = new Set();
        const merged = [];
        for (const list of lists) {
          for (const r of list) {
            if (seen.has(r.id)) continue;
            seen.add(r.id);
            merged.push(r);
          }
        }
        return { openRentals: merged, barcode };
      };

      for (const asset of updatedAssets || []) {
        const { openRentals, barcode } = await collectOpenRentalsForAsset(asset);
        const template =
          openRentals.find((r) => r.lease_agreement_id && !r.is_dns) ||
          openRentals.find((r) => !r.is_dns) ||
          openRentals[0];

        const leaseIdForNewRental = await this.reassignPerBottleLeaseForTransfer({
          organizationId,
          bottleId: asset.id,
          preferredLeaseId: template?.lease_agreement_id || null,
          fromCustomerId,
          toCustomerId,
          toCustomerName: toCustomer.name,
        });
        if (leaseIdForNewRental) leasesReassigned += 1;

        for (const rental of openRentals) {
          const { error: closeErr } = await supabase
            .from('rentals')
            .update({ rental_end_date: today })
            .eq('id', rental.id)
            .eq('organization_id', organizationId);
          if (!closeErr) rentalsClosed += 1;
          else logger.error('Failed to close rental on transfer:', closeErr);
        }

        const { data: existingOpenRows } = await supabase
          .from('rentals')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('customer_id', toCustomerId)
          .eq('bottle_id', asset.id)
          .is('rental_end_date', null)
          .limit(1);

        if (existingOpenRows?.length) continue;

        const useTemplate = template && !template.is_dns;
        const fromTemplate = useTemplate ? parseFloat(String(template.rental_amount)) : NaN;
        const computedForTarget = monthlyRateForNewRental(toCustomerId, asset, pricingCtx);
        const rentalAmount =
          Number.isFinite(fromTemplate) && fromTemplate > 0 ? fromTemplate : computedForTarget;

        const insertRow = {
          organization_id: organizationId,
          customer_id: toCustomerId,
          customer_name: toCustomer.name,
          bottle_id: asset.id,
          bottle_barcode: barcode || template?.bottle_barcode || null,
          rental_start_date: today,
          rental_end_date: null,
          rental_amount: rentalAmount,
          rental_type: useTemplate ? (template.rental_type || 'monthly') : 'monthly',
          tax_code: template?.tax_code || 'GST+PST',
          tax_rate: template?.tax_rate != null ? template.tax_rate : 0.11,
          location: String(
            (asset.location || template?.location || 'SASKATOON')
          ).toUpperCase(),
          status: 'active',
          is_dns: false,
          lease_agreement_id: leaseIdForNewRental,
        };

        const { error: insErr } = await supabase.from('rentals').insert(insertRow);
        if (!insErr) rentalsOpened += 1;
        else logger.error('Failed to open rental after transfer:', insErr);
      }

      // Log the transfer in audit table (if exists) or create transfer record
      await this.logTransfer({
        assetIds,
        fromCustomerId,
        toCustomerId,
        fromCustomerName: fromCustomer.name,
        toCustomerName: toCustomer.name,
        organizationId,
        reason,
        transferredAt: new Date().toISOString(),
        transferredAssets: updatedAssets
      });

      return {
        success: true,
        transferredAssets: updatedAssets,
        fromCustomer,
        toCustomer,
        count: updatedAssets.length,
        rentalsClosed,
        rentalsOpened,
        leasesReassigned,
        message: `Successfully transferred ${updatedAssets.length} asset(s) from ${fromCustomer.name} to ${toCustomer.name}. Closed ${rentalsClosed} rental(s), opened ${rentalsOpened} for the new customer.${leasesReassigned > 0 ? ` Reassigned ${leasesReassigned} per-bottle lease agreement(s).` : ''}`
      };

    } catch (error) {
      logger.error('Error transferring assets:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to transfer assets: ${error.message}`
      };
    }
  }

  /**
   * Get all customers in the same organization (for transfer target selection)
   * @param {string} organizationId - Organization ID
   * @param {string} excludeCustomerId - Customer ID to exclude from results
   * @returns {Promise<Array>} List of available customers for transfer
   */
  static async getAvailableCustomers(organizationId, excludeCustomerId = null) {
    try {
      let query = supabase
        .from('customers')
        .select('CustomerListID, name, customer_type, contact_details')
        .eq('organization_id', organizationId)
        .order('name');

      if (excludeCustomerId) {
        query = query.neq('CustomerListID', excludeCustomerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        customers: data || []
      };

    } catch (error) {
      logger.error('Error fetching customers:', error);
      return {
        success: false,
        error: error.message,
        customers: []
      };
    }
  }

  /**
   * Get transfer history for a customer
   * @param {string} customerId - Customer ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Transfer history
   */
  static async getTransferHistory(customerId, organizationId) {
    try {
      // This would query a transfer_history table if it exists
      // For now, we'll return an empty array as this is a new feature
      return {
        success: true,
        transfers: []
      };
    } catch (error) {
      logger.error('Error fetching transfer history:', error);
      return {
        success: false,
        error: error.message,
        transfers: []
      };
    }
  }

  /**
   * Log transfer operation for audit purposes
   * @param {Object} transferData - Transfer details
   */
  static async logTransfer(transferData) {
    try {
      // Enhanced logging with more detailed information
      const transferLog = {
        timestamp: transferData.transferredAt,
        from: `${transferData.fromCustomerName} (${transferData.fromCustomerId})`,
        to: `${transferData.toCustomerName} (${transferData.toCustomerId})`,
        assetCount: transferData.assetIds.length,
        reason: transferData.reason || 'No reason provided',
        organizationId: transferData.organizationId,
        transferredAssets: transferData.transferredAssets?.map(asset => ({
          id: asset.id,
          barcode: asset.barcode_number,
          serial: asset.serial_number,
          type: asset.description || asset.type
        }))
      };

      logger.log('✅ Asset Transfer Completed:', transferLog);

      // Create transfer history entry in database (if table exists)
      try {
        await this.createTransferHistoryEntry(transferData);
      } catch (dbError) {
        logger.warn('Could not create transfer history entry:', dbError.message);
        // Continue without failing the main transfer operation
      }

    } catch (error) {
      logger.error('Error logging transfer:', error);
      // Don't throw error here as transfer was successful, logging is secondary
    }
  }

  /**
   * Create transfer history entry in database
   * @param {Object} transferData - Transfer details
   */
  static async createTransferHistoryEntry(transferData) {
    try {
      // Create a transfer_history entry (if the table exists)
      const { error } = await supabase
        .from('transfer_history')
        .insert({
          organization_id: transferData.organizationId,
          from_customer_id: transferData.fromCustomerId,
          to_customer_id: transferData.toCustomerId,
          from_customer_name: transferData.fromCustomerName,
          to_customer_name: transferData.toCustomerName,
          asset_ids: transferData.assetIds,
          asset_count: transferData.assetIds.length,
          reason: transferData.reason || '',
          transfer_type: 'customer_to_customer',
          transferred_at: transferData.transferredAt,
          created_at: new Date().toISOString()
        });

      if (error) {
        // If table doesn't exist, that's okay - we'll still log to console
        logger.info('Transfer history table not found, logging to console only');
      } else {
        logger.log('✅ Transfer history entry created successfully');
      }

    } catch (error) {
      logger.warn('Transfer history creation failed:', error.message);
    }
  }

  /**
   * Validate transfer operation before execution
   * @param {Array<string>} assetIds - Asset IDs to transfer
   * @param {string} fromCustomerId - Source customer ID
   * @param {string} toCustomerId - Target customer ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Validation result
   */
  static async validateTransfer(assetIds, fromCustomerId, toCustomerId, organizationId) {
    try {
      const issues = [];

      // Check if assets exist and belong to source customer
      const { data: assets, error: assetsError } = await supabase
        .from('bottles')
        .select('id, barcode_number, serial_number, assigned_customer, status')
        .in('id', assetIds)
        .eq('organization_id', organizationId);

      if (assetsError) throw assetsError;

      if (!assets || assets.length !== assetIds.length) {
        issues.push('Some selected assets do not exist');
      }

      // Check if all assets belong to source customer
      const wrongCustomerAssets = assets.filter(asset => asset.assigned_customer !== fromCustomerId);
      if (wrongCustomerAssets.length > 0) {
        issues.push(`${wrongCustomerAssets.length} asset(s) do not belong to the source customer`);
      }

      // Check if target customer exists
      const { data: targetCustomer, error: customerError } = await supabase
        .from('customers')
        .select('CustomerListID, name')
        .eq('CustomerListID', toCustomerId)
        .eq('organization_id', organizationId)
        .single();

      if (customerError || !targetCustomer) {
        issues.push('Target customer not found');
      }

      return {
        success: issues.length === 0,
        issues,
        validAssets: assets.filter(asset => asset.assigned_customer === fromCustomerId),
        targetCustomer
      };

    } catch (error) {
      logger.error('Error validating transfer:', error);
      return {
        success: false,
        issues: [`Validation error: ${error.message}`],
        validAssets: [],
        targetCustomer: null
      };
    }
  }
}
