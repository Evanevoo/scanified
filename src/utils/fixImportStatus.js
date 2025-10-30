import logger from '../utils/logger';
import { supabase } from '../supabase/client';

export async function fixImportStatus() {
  try {
    logger.log('Checking for imports without status...');
    
    // Check imported_invoices table
    const { data: invoices, error: invError } = await supabase
      .from('imported_invoices')
      .select('*')
      .is('status', null);
    
    logger.log('Invoices without status:', { count: invoices?.length || 0, error: invError });
    
    if (invError) {
      logger.error('Error checking invoices:', invError);
    } else if (invoices && invoices.length > 0) {
      logger.log(`Found ${invoices.length} invoices without status, updating...`);
      
      const { error: updateInvError } = await supabase
        .from('imported_invoices')
        .update({ status: 'pending' })
        .is('status', null);
      
      if (updateInvError) {
        logger.error('Error updating invoices:', updateInvError);
      } else {
        logger.log('Successfully updated invoice statuses');
      }
    }
    
    // Check imported_sales_receipts table
    const { data: receipts, error: recError } = await supabase
      .from('imported_sales_receipts')
      .select('*')
      .is('status', null);
    
    logger.log('Receipts without status:', { count: receipts?.length || 0, error: recError });
    
    if (recError) {
      logger.error('Error checking receipts:', recError);
    } else if (receipts && receipts.length > 0) {
      logger.log(`Found ${receipts.length} receipts without status, updating...`);
      
      const { error: updateRecError } = await supabase
        .from('imported_sales_receipts')
        .update({ status: 'pending' })
        .is('status', null);
      
      if (updateRecError) {
        logger.error('Error updating receipts:', updateRecError);
      } else {
        logger.log('Successfully updated receipt statuses');
      }
    }
    
    logger.log('Import status check complete');
    
  } catch (error) {
    logger.error('Error in fixImportStatus:', error);
  }
} 