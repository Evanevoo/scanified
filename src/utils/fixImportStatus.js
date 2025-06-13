import { supabase } from '../supabase/client';

export async function fixImportStatus() {
  try {
    console.log('Checking for imports without status...');
    
    // Check imported_invoices table
    const { data: invoices, error: invError } = await supabase
      .from('imported_invoices')
      .select('*')
      .is('status', null);
    
    console.log('Invoices without status:', { count: invoices?.length || 0, error: invError });
    
    if (invError) {
      console.error('Error checking invoices:', invError);
    } else if (invoices && invoices.length > 0) {
      console.log(`Found ${invoices.length} invoices without status, updating...`);
      
      const { error: updateInvError } = await supabase
        .from('imported_invoices')
        .update({ status: 'pending' })
        .is('status', null);
      
      if (updateInvError) {
        console.error('Error updating invoices:', updateInvError);
      } else {
        console.log('Successfully updated invoice statuses');
      }
    }
    
    // Check imported_sales_receipts table
    const { data: receipts, error: recError } = await supabase
      .from('imported_sales_receipts')
      .select('*')
      .is('status', null);
    
    console.log('Receipts without status:', { count: receipts?.length || 0, error: recError });
    
    if (recError) {
      console.error('Error checking receipts:', recError);
    } else if (receipts && receipts.length > 0) {
      console.log(`Found ${receipts.length} receipts without status, updating...`);
      
      const { error: updateRecError } = await supabase
        .from('imported_sales_receipts')
        .update({ status: 'pending' })
        .is('status', null);
      
      if (updateRecError) {
        console.error('Error updating receipts:', updateRecError);
      } else {
        console.log('Successfully updated receipt statuses');
      }
    }
    
    console.log('Import status check complete');
    
  } catch (error) {
    console.error('Error in fixImportStatus:', error);
  }
} 