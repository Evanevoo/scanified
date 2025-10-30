// Safe Duplicate Customer Cleanup Script
// Run this in your browser console on the BottleManagement page or create a separate admin page

import { supabase } from './supabase/client.js';

class DuplicateCustomerCleanup {
  constructor() {
    this.duplicates = [];
    this.cleanupPlan = [];
  }

  async identifyDuplicates() {
    console.log('🔍 Identifying duplicate customers...');
    
    try {
      // Get all customers
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id, CustomerListID, name, created_at')
        .not('CustomerListID', 'is', null)
        .neq('CustomerListID', '');

      if (error) throw error;

      // Group by normalized (uppercase) CustomerListID
      const customerGroups = new Map();
      
      customers.forEach(customer => {
        const normalizedId = customer.CustomerListID.toUpperCase();
        if (!customerGroups.has(normalizedId)) {
          customerGroups.set(normalizedId, []);
        }
        customerGroups.get(normalizedId).push(customer);
      });

      // Find duplicates
      this.duplicates = Array.from(customerGroups.entries())
        .filter(([normalizedId, group]) => group.length > 1)
        .map(([normalizedId, group]) => ({
          normalizedId,
          customers: group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        }));

      console.log(`Found ${this.duplicates.length} duplicate groups:`, this.duplicates);
      return this.duplicates;
    } catch (error) {
      console.error('Error identifying duplicates:', error);
      throw error;
    }
  }

  async createCleanupPlan() {
    console.log('📋 Creating cleanup plan...');
    
    this.cleanupPlan = [];

    for (const duplicate of this.duplicates) {
      const keepCustomer = duplicate.customers[0]; // Keep the first (oldest) customer
      const deleteCustomers = duplicate.customers.slice(1);

      for (const deleteCustomer of deleteCustomers) {
        // Check how many bottles are assigned to this customer
        const { data: bottles, error } = await supabase
          .from('bottles')
          .select('id')
          .eq('assigned_customer', deleteCustomer.id);

        if (error) {
          console.error(`Error checking bottles for customer ${deleteCustomer.CustomerListID}:`, error);
          continue;
        }

        this.cleanupPlan.push({
          action: 'merge_and_delete',
          keepCustomer: {
            id: keepCustomer.id,
            CustomerListID: keepCustomer.CustomerListID,
            name: keepCustomer.name
          },
          deleteCustomer: {
            id: deleteCustomer.id,
            CustomerListID: deleteCustomer.CustomerListID,
            name: deleteCustomer.name
          },
          bottlesToReassign: bottles?.length || 0
        });
      }
    }

    console.log('Cleanup plan created:', this.cleanupPlan);
    return this.cleanupPlan;
  }

  async executeCleanup(dryRun = true) {
    if (dryRun) {
      console.log('🧪 DRY RUN - No changes will be made');
      console.log('Cleanup plan summary:');
      this.cleanupPlan.forEach((plan, index) => {
        console.log(`${index + 1}. Merge ${plan.bottlesToReassign} bottles from "${plan.deleteCustomer.CustomerListID}" to "${plan.keepCustomer.CustomerListID}"`);
      });
      return { success: true, dryRun: true, message: 'Dry run completed - no changes made' };
    }

    console.log('🚀 Executing cleanup...');
    let successCount = 0;
    let errorCount = 0;

    for (const plan of this.cleanupPlan) {
      try {
        // Step 1: Reassign bottles
        if (plan.bottlesToReassign > 0) {
          const { error: bottleError } = await supabase
            .from('bottles')
            .update({ assigned_customer: plan.keepCustomer.id })
            .eq('assigned_customer', plan.deleteCustomer.id);

          if (bottleError) throw bottleError;
          console.log(`✅ Reassigned ${plan.bottlesToReassign} bottles from ${plan.deleteCustomer.CustomerListID} to ${plan.keepCustomer.CustomerListID}`);
        }

        // Step 2: Delete duplicate customer
        const { error: deleteError } = await supabase
          .from('customers')
          .delete()
          .eq('id', plan.deleteCustomer.id);

        if (deleteError) throw deleteError;
        console.log(`✅ Deleted duplicate customer: ${plan.deleteCustomer.CustomerListID}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing ${plan.deleteCustomer.CustomerListID}:`, error);
        errorCount++;
      }
    }

    return {
      success: errorCount === 0,
      dryRun: false,
      successCount,
      errorCount,
      message: `Cleanup completed: ${successCount} successful, ${errorCount} errors`
    };
  }

  async verifyCleanup() {
    console.log('🔍 Verifying cleanup...');
    
    const duplicates = await this.identifyDuplicates();
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate customers found - cleanup successful!');
      return true;
    } else {
      console.log(`❌ Still found ${duplicates.length} duplicate groups:`, duplicates);
      return false;
    }
  }
}

// Usage example:
async function runCleanup() {
  const cleanup = new DuplicateCustomerCleanup();
  
  try {
    // Step 1: Identify duplicates
    await cleanup.identifyDuplicates();
    
    // Step 2: Create cleanup plan
    await cleanup.createCleanupPlan();
    
    // Step 3: Dry run first
    await cleanup.executeCleanup(true);
    
    // Step 4: Ask for confirmation (in real usage)
    const confirmed = confirm('Do you want to proceed with the cleanup? This will permanently delete duplicate customers.');
    
    if (confirmed) {
      // Step 5: Execute cleanup
      const result = await cleanup.executeCleanup(false);
      console.log('Cleanup result:', result);
      
      // Step 6: Verify
      await cleanup.verifyCleanup();
    }
    
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Export for use in other files
export { DuplicateCustomerCleanup, runCleanup };

// Auto-run if this script is executed directly
if (typeof window !== 'undefined') {
  window.DuplicateCustomerCleanup = DuplicateCustomerCleanup;
  window.runCleanup = runCleanup;
  console.log('Duplicate customer cleanup tools loaded. Run runCleanup() to start.');
}
