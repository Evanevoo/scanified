import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAndFixDuplicateCustomers() {
  console.log('🔍 Searching for duplicate customer IDs...');
  
  try {
    // Get all customers
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, CustomerListID, name, organization_id, created_at')
      .order('created_at');
    
    if (error) {
      console.error('Error fetching customers:', error);
      return;
    }
    
    console.log(`📊 Found ${customers.length} total customers`);
    
    // Group by CustomerListID
    const customerGroups = {};
    customers.forEach(customer => {
      const customerId = customer.CustomerListID;
      if (!customerGroups[customerId]) {
        customerGroups[customerId] = [];
      }
      customerGroups[customerId].push(customer);
    });
    
    // Find duplicates
    const duplicates = Object.entries(customerGroups)
      .filter(([id, group]) => group.length > 1)
      .map(([id, group]) => ({ id, customers: group }));
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate customer IDs found');
      return;
    }
    
    console.log(`⚠️ Found ${duplicates.length} duplicate customer IDs:`);
    
    for (const duplicate of duplicates) {
      console.log(`\n📋 Customer ID: ${duplicate.id}`);
      console.log(`   Found ${duplicate.customers.length} customers with this ID:`);
      
      duplicate.customers.forEach((customer, index) => {
        console.log(`   ${index + 1}. ${customer.name} (ID: ${customer.id}, Org: ${customer.organization_id}, Created: ${customer.created_at})`);
      });
    }
    
    // Ask user if they want to fix duplicates
    console.log('\n🔧 To fix duplicates, run this script with the --fix flag');
    console.log('   Example: node fix-duplicate-customers.js --fix');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

async function fixDuplicateCustomers() {
  console.log('🔧 Fixing duplicate customer IDs...');
  
  try {
    // Get all customers
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, CustomerListID, name, organization_id, created_at')
      .order('created_at');
    
    if (error) {
      console.error('Error fetching customers:', error);
      return;
    }
    
    // Group by CustomerListID
    const customerGroups = {};
    customers.forEach(customer => {
      const customerId = customer.CustomerListID;
      if (!customerGroups[customerId]) {
        customerGroups[customerId] = [];
      }
      customerGroups[customerId].push(customer);
    });
    
    // Find duplicates
    const duplicates = Object.entries(customerGroups)
      .filter(([id, group]) => group.length > 1)
      .map(([id, group]) => ({ id, customers: group }));
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate customer IDs found');
      return;
    }
    
    console.log(`🔧 Fixing ${duplicates.length} duplicate customer IDs...`);
    
    let fixedCount = 0;
    
    for (const duplicate of duplicates) {
      console.log(`\n📋 Fixing Customer ID: ${duplicate.id}`);
      
      // Keep the first customer (oldest), update the rest
      const [keepCustomer, ...duplicateCustomers] = duplicate.customers;
      
      console.log(`   Keeping: ${keepCustomer.name} (ID: ${keepCustomer.id})`);
      
      for (const duplicateCustomer of duplicateCustomers) {
        console.log(`   Updating: ${duplicateCustomer.name} (ID: ${duplicateCustomer.id})`);
        
        // Generate new unique customer ID
        const newCustomerId = `FIXED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            CustomerListID: newCustomerId,
            customer_number: newCustomerId,
            barcode: `*%${newCustomerId}*`,
            customer_barcode: `*%${newCustomerId}*`,
            AccountNumber: newCustomerId
          })
          .eq('id', duplicateCustomer.id);
        
        if (updateError) {
          console.error(`   ❌ Error updating customer ${duplicateCustomer.name}:`, updateError);
        } else {
          console.log(`   ✅ Updated customer ${duplicateCustomer.name} with new ID: ${newCustomerId}`);
          fixedCount++;
        }
      }
    }
    
    console.log(`\n✅ Successfully fixed ${fixedCount} duplicate customer IDs`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Main execution
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');

if (shouldFix) {
  fixDuplicateCustomers();
} else {
  findAndFixDuplicateCustomers();
}
