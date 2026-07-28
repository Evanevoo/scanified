/**
 * Migration script to convert assigned_customer from CustomerListID to UUID
 * 
 * This script finds all bottles where assigned_customer contains a CustomerListID
 * (not a UUID) and converts them to use the customer's UUID instead.
 * 
 * Run this in the browser console on the BottleManagement page or as a standalone script
 */

import { supabase } from './src/supabase/client';

async function fixAssignedCustomerUUIDs(organizationId) {
  console.log('Starting migration: Converting assigned_customer from CustomerListID to UUID...');
  
  try {
    // 1. Get all bottles with assigned_customer that looks like a CustomerListID (not a UUID)
    // UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    // CustomerListIDs have format like: 8000080C-1657665048A
    const { data: bottles, error: bottlesError } = await supabase
      .from('bottles')
      .select('id, assigned_customer, customer_name, organization_id')
      .eq('organization_id', organizationId)
      .not('assigned_customer', 'is', null);
    
    if (bottlesError) {
      throw bottlesError;
    }
    
    console.log(`Found ${bottles.length} bottles with assigned_customer`);
    
    // 2. Filter bottles where assigned_customer is NOT a UUID (UUIDs have 5 segments separated by dashes)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const bottlesToFix = bottles.filter(b => {
      const assigned = String(b.assigned_customer).trim();
      return assigned && !uuidPattern.test(assigned);
    });
    
    console.log(`Found ${bottlesToFix.length} bottles with CustomerListID instead of UUID`);
    
    if (bottlesToFix.length === 0) {
      console.log('✅ No bottles need fixing!');
      return { success: true, fixed: 0 };
    }
    
    // 3. Get unique CustomerListIDs
    const customerListIds = [...new Set(bottlesToFix.map(b => b.assigned_customer))];
    console.log(`Looking up ${customerListIds.length} unique customers...`);
    
    // 4. Fetch customers by CustomerListID
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, CustomerListID, name')
      .eq('organization_id', organizationId)
      .in('CustomerListID', customerListIds);
    
    if (customersError) {
      throw customersError;
    }
    
    console.log(`Found ${customers.length} customers in database`);
    
    // 5. Create a map of CustomerListID -> UUID
    const customerMap = new Map();
    customers.forEach(c => {
      customerMap.set(c.CustomerListID, c.id);
    });
    
    // 6. Update bottles in batches
    const batchSize = 50;
    let fixed = 0;
    let notFound = 0;
    
    for (let i = 0; i < bottlesToFix.length; i += batchSize) {
      const batch = bottlesToFix.slice(i, i + batchSize);
      
      const updates = batch.map(bottle => {
        const customerListId = bottle.assigned_customer;
        const customerUuid = customerMap.get(customerListId);
        
        if (customerUuid) {
          return {
            id: bottle.id,
            assigned_customer: customerUuid
          };
        } else {
          console.warn(`⚠️ Customer not found for CustomerListID: ${customerListId} (bottle: ${bottle.id})`);
          notFound++;
          return null;
        }
      }).filter(Boolean);
      
      if (updates.length > 0) {
        // Update bottles in parallel
        const updatePromises = updates.map(update =>
          supabase
            .from('bottles')
            .update({ assigned_customer: update.assigned_customer })
            .eq('id', update.id)
        );
        
        const results = await Promise.all(updatePromises);
        
        // Check for errors
        for (const result of results) {
          if (result.error) {
            console.error('Error updating bottle:', result.error);
          } else {
            fixed++;
          }
        }
      }
      
      console.log(`Progress: ${Math.min(i + batchSize, bottlesToFix.length)} / ${bottlesToFix.length}`);
    }
    
    console.log(`✅ Migration complete!`);
    console.log(`   Fixed: ${fixed} bottles`);
    console.log(`   Not found: ${notFound} bottles (customer doesn't exist)`);
    
    return { success: true, fixed, notFound };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}

// Export for use in other files
export default fixAssignedCustomerUUIDs;

// If running directly, you can call it like this:
// fixAssignedCustomerUUIDs('your-organization-id-here');

