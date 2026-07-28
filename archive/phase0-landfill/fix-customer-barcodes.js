import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Generate barcode from customer ID using the standard pattern
 * Pattern: %{lowercase_customer_id_without_spaces}
 */
function generateBarcode(customerId) {
  if (!customerId) return null;
  const normalized = customerId.toLowerCase().replace(/\s+/g, '');
  return `%${normalized}`;
}

/**
 * Fix barcodes for customers without them
 * @param {string|null} specificCustomerId - If provided, only fix this customer
 */
async function fixCustomerBarcodes(specificCustomerId = null) {
  console.log('🚀 Starting customer barcode fix...\n');
  
  try {
    // Build query
    let query = supabase
      .from('customers')
      .select('CustomerListID, name, barcode, customer_barcode, organization_id');
    
    if (specificCustomerId) {
      console.log(`📍 Fixing specific customer: ${specificCustomerId}`);
      query = query.eq('CustomerListID', specificCustomerId);
    } else {
      // Find customers without barcodes
      query = query.or('barcode.is.null,barcode.eq.,customer_barcode.is.null,customer_barcode.eq.');
    }
    
    const { data: customers, error: fetchError } = await query;
    
    if (fetchError) {
      console.error('❌ Error fetching customers:', fetchError);
      return;
    }
    
    if (!customers || customers.length === 0) {
      console.log('✅ No customers found without barcodes!');
      return;
    }
    
    console.log(`📊 Found ${customers.length} customer(s) to fix:\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const customer of customers) {
      const customerId = customer.CustomerListID;
      const currentBarcode = customer.barcode || customer.customer_barcode;
      
      // Skip if already has a barcode (unless it's empty string)
      if (currentBarcode && currentBarcode.trim() !== '') {
        console.log(`⏭️  Skipping ${customerId} - already has barcode: ${currentBarcode}`);
        continue;
      }
      
      // Generate barcode
      const newBarcode = generateBarcode(customerId);
      
      if (!newBarcode) {
        console.log(`⚠️  Skipping ${customerId} - invalid CustomerListID`);
        errorCount++;
        continue;
      }
      
      console.log(`\n📝 Processing: ${customer.name || customerId}`);
      console.log(`   Customer ID: ${customerId}`);
      console.log(`   Current barcode: ${currentBarcode || '(empty)'}`);
      console.log(`   New barcode: ${newBarcode}`);
      
      // Update customer with new barcode
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          barcode: newBarcode,
          customer_barcode: newBarcode
        })
        .eq('CustomerListID', customerId);
      
      if (updateError) {
        console.error(`   ❌ Error updating: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Successfully updated!`);
        successCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   ✅ Successfully fixed: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📋 Total processed: ${customers.length}`);
    console.log('='.repeat(60));
    
    // Show the specific customer if requested
    if (specificCustomerId) {
      const { data: updatedCustomer } = await supabase
        .from('customers')
        .select('CustomerListID, name, barcode, customer_barcode')
        .eq('CustomerListID', specificCustomerId)
        .single();
      
      if (updatedCustomer) {
        console.log('\n📋 Updated Customer Details:');
        console.log(`   Customer ID: ${updatedCustomer.CustomerListID}`);
        console.log(`   Name: ${updatedCustomer.name || 'N/A'}`);
        console.log(`   Barcode: ${updatedCustomer.barcode || 'N/A'}`);
        console.log(`   Customer Barcode: ${updatedCustomer.customer_barcode || 'N/A'}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Error in fixCustomerBarcodes:', error);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const specificCustomerId = args[0] || null;

if (specificCustomerId) {
  console.log(`🎯 Running in single-customer mode for: ${specificCustomerId}\n`);
} else {
  console.log('🌍 Running in batch mode - fixing all customers without barcodes\n');
}

// Run the fix
fixCustomerBarcodes(specificCustomerId)
  .then(() => {
    console.log('\n🎉 Barcode fix complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
