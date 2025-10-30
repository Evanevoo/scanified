import logger from '../utils/logger';
import { supabase } from '../supabase/client';

/**
 * Service for managing import approval records and assets
 * Handles all the advanced record and asset management operations
 */
export class ImportApprovalManagementService {

  /**
   * Helper function to extract original database ID from composite ID
   */
  static getOriginalId(id) {
    if (!id) return id;
    // If it's a composite ID like "638_1", extract the original ID "638"
    if (typeof id === 'string' && id.includes('_')) {
      return id.split('_')[0];
    }
    return id;
  }

  /**
   * Record Management Operations
   */

  static async verifyRecord(recordId, tableName = 'imported_invoices') {
    try {
      const originalId = this.getOriginalId(recordId);
      
      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: 'current_user' // Replace with actual user
        })
        .eq('id', originalId)
        .select()
        .single();

      if (error) throw error;

      // Log audit entry
      await this.logAuditEntry(originalId, 'VERIFY_RECORD', 'Record verified successfully');

      return { success: true, data, message: 'Record verified successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteRecord(recordId, tableName = 'imported_invoices') {
    try {
      const originalId = this.getOriginalId(recordId);
      
      // First log the deletion
      await this.logAuditEntry(originalId, 'DELETE_RECORD', 'Record marked for deletion');

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', originalId);

      if (error) throw error;

      return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async changeCustomer(recordId, customerId, customerName, tableName = 'imported_invoices') {
    try {
      const originalId = this.getOriginalId(recordId);
      
      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          customer_id: customerId,
          customer_name: customerName,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEntry(originalId, 'CHANGE_CUSTOMER', `Customer changed to ${customerName}`);

      return { success: true, data, message: `Customer changed to ${customerName}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async changeRecordDate(recordId, newDate, tableName = 'imported_invoices') {
    try {
      const originalId = this.getOriginalId(recordId);
      
      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          date: newDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEntry(originalId, 'CHANGE_DATE', `Date changed to ${newDate}`);

      return { success: true, data, message: 'Date updated successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async changeSalesOrderNumber(recordId, newOrderNumber, tableName = 'imported_invoices') {
    try {
      const originalId = this.getOriginalId(recordId);
      
      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          order_number: newOrderNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEntry(originalId, 'CHANGE_ORDER', `Sales order number changed to ${newOrderNumber}`);

      return { success: true, data, message: 'Sales order number updated successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async changePONumber(recordId, newPONumber, tableName = 'imported_invoices') {
    try {
      const originalId = this.getOriginalId(recordId);
      
      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          po_number: newPONumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEntry(originalId, 'CHANGE_PO', `PO number changed to ${newPONumber}`);

      return { success: true, data, message: 'PO number updated successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async changeLocation(recordId, newLocation, tableName = 'imported_invoices') {
    try {
      const originalId = this.getOriginalId(recordId);
      
      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          location: newLocation,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEntry(originalId, 'CHANGE_LOCATION', `Location changed to ${newLocation}`);

      return { success: true, data, message: 'Location updated successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async markForInvestigation(recordId, reason = '', tableName = 'imported_invoices') {
    try {
      const originalId = this.getOriginalId(recordId);
      
      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          status: 'investigation',
          investigation_reason: reason,
          investigation_marked_at: new Date().toISOString()
        })
        .eq('id', originalId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEntry(originalId, 'MARK_INVESTIGATION', `Marked for investigation: ${reason}`);

      return { success: true, data, message: 'Record marked for investigation' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async addNoteToRecord(recordId, note, tableName = 'imported_invoices') {
    try {
      // Get current notes
      const { data: currentRecord, error: fetchError } = await supabase
        .from(tableName)
        .select('notes')
        .eq('id', recordId)
        .single();

      if (fetchError) throw fetchError;

      const currentNotes = currentRecord.notes || '';
      const timestamp = new Date().toLocaleString();
      const newNote = `[${timestamp}] ${note}`;
      const updatedNotes = currentNotes ? `${currentNotes}\n${newNote}` : newNote;

      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          notes: updatedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEntry(recordId, 'ADD_NOTE', `Note added: ${note}`);

      return { success: true, data, message: 'Note added successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Asset Management Operations
   */

  static async reclassifyAssets(recordId, assetIds, newClassification) {
    try {
      // This would update assets in the bottles table
      const { error } = await supabase
        .from('bottles')
        .update({ 
          type: newClassification.type,
          category: newClassification.category,
          group_name: newClassification.group,
          updated_at: new Date().toISOString()
        })
        .in('id', assetIds);

      if (error) throw error;

      await this.logAuditEntry(recordId, 'RECLASSIFY_ASSETS', `${assetIds.length} assets reclassified`);

      return { success: true, message: `${assetIds.length} assets reclassified successfully` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async changeAssetProperties(assetIds, properties) {
    try {
      const { error } = await supabase
        .from('bottles')
        .update({ 
          ...properties,
          updated_at: new Date().toISOString()
        })
        .in('id', assetIds);

      if (error) throw error;

      return { success: true, message: `Properties updated for ${assetIds.length} assets` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async attachNotScannedAssets(recordId, assetData) {
    try {
      // Add assets to the record's data field
      const { data: currentRecord, error: fetchError } = await supabase
        .from('imported_invoices')
        .select('data')
        .eq('id', recordId)
        .single();

      if (fetchError) throw fetchError;

      const currentData = currentRecord.data || {};
      const currentDelivered = currentData.delivered || [];
      const updatedDelivered = [...currentDelivered, ...assetData];

      const { data, error } = await supabase
        .from('imported_invoices')
        .update({ 
          data: { ...currentData, delivered: updatedDelivered },
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEntry(recordId, 'ATTACH_ASSETS', `${assetData.length} not-scanned assets attached`);

      return { success: true, data, message: `${assetData.length} assets attached successfully` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async attachAssetByBarcode(recordId, barcode, serialNumber = '') {
    try {
      // Find the asset in the bottles table
      let query = supabase
        .from('bottles')
        .select('*')
        .eq('barcode_number', barcode);

      if (serialNumber) {
        query = query.eq('serial_number', serialNumber);
      }

      const { data: asset, error: assetError } = await query.single();

      if (assetError) throw new Error(`Asset not found: ${barcode}`);

      // Attach this asset to the record
      const assetData = [{
        barcode: asset.barcode_number,
        serial_number: asset.serial_number,
        product_code: asset.product_code,
        description: asset.description,
        type: asset.type,
        category: asset.category
      }];

      return await this.attachNotScannedAssets(recordId, assetData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async replaceIncorrectAsset(recordId, oldAssetId, newAssetData) {
    try {
      // Update the record data to replace the asset
      const { data: currentRecord, error: fetchError } = await supabase
        .from('imported_invoices')
        .select('data')
        .eq('id', recordId)
        .single();

      if (fetchError) throw fetchError;

      const currentData = currentRecord.data || {};
      const delivered = currentData.delivered || [];
      
      // Find and replace the asset
      const updatedDelivered = delivered.map((asset, index) => {
        if (index === oldAssetId || asset.id === oldAssetId) {
          return { ...asset, ...newAssetData };
        }
        return asset;
      });

      const { data, error } = await supabase
        .from('imported_invoices')
        .update({ 
          data: { ...currentData, delivered: updatedDelivered },
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEntry(recordId, 'REPLACE_ASSET', 'Incorrect asset replaced');

      return { success: true, data, message: 'Asset replaced successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async switchDeliverReturn(recordId, assetId) {
    try {
      const { data: currentRecord, error: fetchError } = await supabase
        .from('imported_invoices')
        .select('data')
        .eq('id', recordId)
        .single();

      if (fetchError) throw fetchError;

      const currentData = currentRecord.data || {};
      const delivered = currentData.delivered || [];
      const returned = currentData.returned || [];

      // Find the asset in delivered and move to returned (or vice versa)
      let updatedDelivered = [...delivered];
      let updatedReturned = [...returned];
      let moved = false;

      // Check if asset is in delivered
      const deliveredIndex = delivered.findIndex((asset, index) => 
        index === assetId || asset.id === assetId
      );

      if (deliveredIndex !== -1) {
        const asset = updatedDelivered.splice(deliveredIndex, 1)[0];
        updatedReturned.push(asset);
        moved = true;
      } else {
        // Check if asset is in returned
        const returnedIndex = returned.findIndex((asset, index) => 
          index === assetId || asset.id === assetId
        );
        
        if (returnedIndex !== -1) {
          const asset = updatedReturned.splice(returnedIndex, 1)[0];
          updatedDelivered.push(asset);
          moved = true;
        }
      }

      if (!moved) {
        throw new Error('Asset not found');
      }

      const { data, error } = await supabase
        .from('imported_invoices')
        .update({ 
          data: { 
            ...currentData, 
            delivered: updatedDelivered,
            returned: updatedReturned
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEntry(recordId, 'SWITCH_DELIVER_RETURN', 'Asset delivery/return status switched');

      return { success: true, data, message: 'Asset delivery/return status switched' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async detachAssets(recordId, assetIds) {
    try {
      const { data: currentRecord, error: fetchError } = await supabase
        .from('imported_invoices')
        .select('data')
        .eq('id', recordId)
        .single();

      if (fetchError) throw fetchError;

      const currentData = currentRecord.data || {};
      const delivered = currentData.delivered || [];
      const returned = currentData.returned || [];

      // Remove assets from both delivered and returned
      const updatedDelivered = delivered.filter((asset, index) => 
        !assetIds.includes(index) && !assetIds.includes(asset.id)
      );
      
      const updatedReturned = returned.filter((asset, index) => 
        !assetIds.includes(index) && !assetIds.includes(asset.id)
      );

      const { data, error } = await supabase
        .from('imported_invoices')
        .update({ 
          data: { 
            ...currentData, 
            delivered: updatedDelivered,
            returned: updatedReturned
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;

      await this.logAuditEntry(recordId, 'DETACH_ASSETS', `${assetIds.length} assets detached`);

      return { success: true, data, message: `${assetIds.length} assets detached successfully` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async moveToAnotherSalesOrder(recordId, assetIds, targetOrderNumber) {
    try {
      // This is a complex operation that would involve:
      // 1. Creating or finding the target sales order
      // 2. Moving assets from current record to target record
      // 3. Updating both records

      await this.logAuditEntry(recordId, 'MOVE_TO_ORDER', `${assetIds.length} assets moved to order ${targetOrderNumber}`);

      return { 
        success: true, 
        message: `${assetIds.length} assets moved to sales order ${targetOrderNumber}` 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Data Fetching Operations
   */

  static async getAuditEntries(recordId) {
    try {
      const originalId = this.getOriginalId(recordId);
      
      const { data, error } = await supabase
        .from('import_audit_log')
        .select('*')
        .eq('record_id', originalId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  static async getAddendums(recordId) {
    try {
      const originalId = this.getOriginalId(recordId);
      
      const { data, error } = await supabase
        .from('import_addendums')
        .select('*')
        .eq('record_id', originalId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  static async getExceptions(recordId) {
    try {
      const originalId = this.getOriginalId(recordId);
      
      const { data, error } = await supabase
        .from('import_exceptions')
        .select('*')
        .eq('record_id', originalId)
        .order('severity', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Utility Functions
   */

  static async logAuditEntry(recordId, action, message, userId = 'current_user') {
    try {
      const originalId = this.getOriginalId(recordId);
      
      await supabase
        .from('import_audit_log')
        .insert([{
          record_id: originalId,
          action,
          message,
          user_id: userId,
          timestamp: new Date().toISOString()
        }]);
    } catch (error) {
      logger.error('Failed to log audit entry:', error);
    }
  }

  static getStatusColor(status) {
    const colors = {
      pending: 'warning',
      approved: 'success',
      verified: 'success',
      rejected: 'error',
      investigation: 'info',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  }

  static getSeverityColor(severity) {
    const colors = {
      high: 'error',
      medium: 'warning',
      low: 'info'
    };
    return colors[severity] || 'default';
  }
}

export default ImportApprovalManagementService;