/**
 * Fix Bottle Status Script
 * 
 * Updates bottles that are assigned to customers but have status "available"
 * to status "rented" (unless they are customer-owned)
 * 
 * Usage: node fix-bottle-status.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBottleStatus() {
  try {
    console.log('🔍 Finding bottles assigned to customers with status "available"...');
    
    // Get all bottles that are assigned to customers but have status "available"
    const { data: bottles, error: fetchError } = await supabase
      .from('bottles')
      .select('id, barcode_number, assigned_customer, customer_name, ownership, status, organization_id')
      .not('assigned_customer', 'is', null)
      .eq('status', 'available');
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!bottles || bottles.length === 0) {
      console.log('✅ No bottles found that need fixing.');
      return;
    }
    
    console.log(`📊 Found ${bottles.length} bottles assigned to customers with status "available"`);
    
    // Group by organization for batch updates
    const bottlesByOrg = {};
    bottles.forEach(bottle => {
      if (!bottlesByOrg[bottle.organization_id]) {
        bottlesByOrg[bottle.organization_id] = [];
      }
      bottlesByOrg[bottle.organization_id].push(bottle);
    });
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    for (const [orgId, orgBottles] of Object.entries(bottlesByOrg)) {
      console.log(`\n🏢 Processing organization ${orgId} (${orgBottles.length} bottles)...`);
      
      for (const bottle of orgBottles) {
        const ownershipValue = String(bottle.ownership || '').trim().toLowerCase();
        const isCustomerOwned = ownershipValue.includes('customer') || 
                               ownershipValue.includes('owned') || 
                               ownershipValue === 'customer owned';
        
        // Skip customer-owned bottles (they should stay as "available")
        if (isCustomerOwned) {
          console.log(`⏭️  Skipping customer-owned bottle: ${bottle.barcode_number || bottle.id}`);
          totalSkipped++;
          continue;
        }
        
        // Update status to "rented"
        const { error: updateError } = await supabase
          .from('bottles')
          .update({ status: 'rented' })
          .eq('id', bottle.id)
          .eq('organization_id', orgId);
        
        if (updateError) {
          console.error(`❌ Error updating bottle ${bottle.barcode_number || bottle.id}:`, updateError.message);
        } else {
          console.log(`✅ Updated bottle ${bottle.barcode_number || bottle.id} to status "rented"`);
          totalUpdated++;
        }
      }
    }
    
    console.log(`\n✅ Fix complete!`);
    console.log(`   - Updated: ${totalUpdated} bottles`);
    console.log(`   - Skipped (customer-owned): ${totalSkipped} bottles`);
    console.log(`   - Total processed: ${bottles.length} bottles`);
    
  } catch (error) {
    console.error('❌ Error fixing bottle status:', error);
    process.exit(1);
  }
}

// Run the fix
fixBottleStatus();
