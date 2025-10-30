import logger from '../utils/logger';
import { supabase } from '../supabase/client';
import backgroundService from './backgroundService';

/**
 * Debug utility functions for troubleshooting import and background service issues
 */

/**
 * Check import status and show detailed information
 */
export const checkImportStatus = async () => {
  try {
    logger.log('=== IMPORT STATUS CHECK ===');
    
    // Check imported_invoices table
    const { data: allInvoices, error: invErr } = await supabase
      .from('imported_invoices')
      .select('*')
      .order('uploaded_at', { ascending: false });
    
    logger.log('All imported invoices:', allInvoices?.length || 0);
    if (allInvoices && allInvoices.length > 0) {
      logger.log('Most recent invoice:', allInvoices[0]);
    }
    
    // Check imported_sales_receipts table
    const { data: allReceipts, error: recErr } = await supabase
      .from('imported_sales_receipts')
      .select('*')
      .order('uploaded_at', { ascending: false });
    
    logger.log('All imported receipts:', allReceipts?.length || 0);
    if (allReceipts && allReceipts.length > 0) {
      logger.log('Most recent receipt:', allReceipts[0]);
    }
    
    // Check pending imports
    const { data: pendingInvoices } = await supabase
      .from('imported_invoices')
      .select('*')
      .eq('status', 'pending');
    
    const { data: pendingReceipts } = await supabase
      .from('imported_sales_receipts')
      .select('*')
      .eq('status', 'pending');
    
    logger.log('Pending invoices:', pendingInvoices?.length || 0);
    logger.log('Pending receipts:', pendingReceipts?.length || 0);
    
    // Check background service status
    const serviceStatus = backgroundService.getStatus();
    logger.log('Background service status:', serviceStatus);
    
    return {
      success: true,
      summary: {
        totalInvoices: allInvoices?.length || 0,
        totalReceipts: allReceipts?.length || 0,
        pendingInvoices: pendingInvoices?.length || 0,
        pendingReceipts: pendingReceipts?.length || 0,
        serviceStatus
      }
    };
    
  } catch (error) {
    logger.error('Error checking import status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reset background service and clear localStorage
 */
export const resetBackgroundService = () => {
  logger.log('=== RESETTING BACKGROUND SERVICE ===');
  backgroundService.reset();
  logger.log('Background service reset complete');
  return { success: true, message: 'Background service reset complete' };
};

/**
 * Force run background service update
 */
export const forceBackgroundUpdate = async () => {
  logger.log('=== FORCING BACKGROUND UPDATE ===');
  await backgroundService.forceUpdate();
  return { success: true, message: 'Background update forced' };
};

/**
 * Clear all localStorage data related to the app
 */
export const clearAppStorage = () => {
  logger.log('=== CLEARING APP STORAGE ===');
  localStorage.removeItem('lastDaysUpdate');
  localStorage.removeItem('importFieldMapping');
  logger.log('App storage cleared');
  return { success: true, message: 'App storage cleared' };
}; 