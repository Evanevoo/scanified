/**
 * Fix Industrial Machine Bottle Assignments
 *
 * The auto-reassign feature (now disabled) rewrote bottles.assigned_customer
 * from Industrial Machine's ID to DynaIndustrial Regina's ID. This script
 * reverses that by finding all open rentals for Industrial Machine and
 * reassigning the corresponding bottles back.
 *
 * Usage: node fix-industrial-machine.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixIndustrialMachine() {
  console.log('=== Industrial Machine Bottle Repair ===\n');

  // Step 1: Find Industrial Machine customer record
  console.log('Step 1: Looking up Industrial Machine customer...');
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('id, name, "CustomerListID", organization_id')
    .ilike('name', '%industrial%machine%');

  if (custErr) {
    console.error('Failed to query customers:', custErr.message);
    process.exit(1);
  }

  if (!customers || customers.length === 0) {
    console.error('No customer matching "Industrial Machine" found.');
    console.log('Trying by known CustomerListID 800005BE-1578330321A...');

    const { data: byId, error: byIdErr } = await supabase
      .from('customers')
      .select('id, name, "CustomerListID", organization_id')
      .eq('CustomerListID', '800005BE-1578330321A');

    if (byIdErr || !byId || byId.length === 0) {
      console.error('Could not find Industrial Machine by ID either. Aborting.');
      process.exit(1);
    }
    customers.push(...byId);
  }

  const industrialMachine = customers[0];
  console.log(`  Found: "${industrialMachine.name}"`);
  console.log(`  CustomerListID: ${industrialMachine.CustomerListID}`);
  console.log(`  Organization: ${industrialMachine.organization_id}\n`);

  const orgId = industrialMachine.organization_id;
  const imCustomerId = industrialMachine.CustomerListID;
  const imName = industrialMachine.name;

  // Step 2: Find all open rentals for Industrial Machine
  console.log('Step 2: Finding open rentals for Industrial Machine...');
  const { data: rentals, error: rentalErr } = await supabase
    .from('rentals')
    .select('id, customer_id, bottle_id, bottle_barcode, product_code, is_dns')
    .eq('organization_id', orgId)
    .eq('customer_id', imCustomerId)
    .is('rental_end_date', null);

  if (rentalErr) {
    console.error('Failed to query rentals:', rentalErr.message);
    process.exit(1);
  }

  console.log(`  Found ${(rentals || []).length} open rental rows for Industrial Machine.\n`);

  if (!rentals || rentals.length === 0) {
    // Try case-insensitive or partial match
    console.log('  Trying broader rental search by customer name...');
    const { data: rentalsByName, error: rentalNameErr } = await supabase
      .from('rentals')
      .select('id, customer_id, customer_name, bottle_id, bottle_barcode, product_code, is_dns')
      .eq('organization_id', orgId)
      .ilike('customer_name', '%industrial%machine%')
      .is('rental_end_date', null);

    if (!rentalNameErr && rentalsByName && rentalsByName.length > 0) {
      console.log(`  Found ${rentalsByName.length} rentals by name match.`);
      rentals.push(...rentalsByName);
    } else {
      console.log('  No open rentals found for Industrial Machine at all.');
      console.log('  The rentals may have been reassigned too. Checking bottles directly...');
    }
  }

  // Step 3: Collect bottle identifiers from rentals
  const bottleBarcodes = new Set();
  const bottleIds = new Set();

  for (const rental of (rentals || [])) {
    if (rental.bottle_barcode) bottleBarcodes.add(String(rental.bottle_barcode).trim());
    if (rental.bottle_id) bottleIds.add(String(rental.bottle_id).trim());
  }

  console.log(`Step 3: Collected ${bottleBarcodes.size} barcodes and ${bottleIds.size} bottle IDs from rentals.\n`);

  // Step 4: Find bottles that are currently misassigned to DynaIndustrial
  console.log('Step 4: Finding misassigned bottles...');

  let misassignedBottles = [];

  if (bottleBarcodes.size > 0) {
    const barcodeArr = [...bottleBarcodes];
    // Query in batches of 50
    for (let i = 0; i < barcodeArr.length; i += 50) {
      const batch = barcodeArr.slice(i, i + 50);
      const { data: found, error: findErr } = await supabase
        .from('bottles')
        .select('id, barcode_number, serial_number, assigned_customer, customer_name, organization_id')
        .eq('organization_id', orgId)
        .in('barcode_number', batch);

      if (findErr) {
        console.error(`  Error querying bottles batch ${i}:`, findErr.message);
        continue;
      }
      if (found) misassignedBottles.push(...found);
    }
  }

  // Also try by bottle ID (uuid)
  if (bottleIds.size > 0) {
    const idArr = [...bottleIds];
    for (let i = 0; i < idArr.length; i += 50) {
      const batch = idArr.slice(i, i + 50);
      const { data: found, error: findErr } = await supabase
        .from('bottles')
        .select('id, barcode_number, serial_number, assigned_customer, customer_name, organization_id')
        .eq('organization_id', orgId)
        .in('id', batch);

      if (findErr) {
        console.error(`  Error querying bottles by ID batch ${i}:`, findErr.message);
        continue;
      }
      if (found) {
        const existingIds = new Set(misassignedBottles.map(b => b.id));
        for (const b of found) {
          if (!existingIds.has(b.id)) misassignedBottles.push(b);
        }
      }
    }
  }

  // Filter to only those NOT already assigned to Industrial Machine
  const needsRepair = misassignedBottles.filter(b => {
    const current = String(b.assigned_customer || '').trim().toLowerCase();
    return current !== imCustomerId.toLowerCase();
  });

  console.log(`  Total bottles found from rental references: ${misassignedBottles.length}`);
  console.log(`  Bottles already correctly assigned: ${misassignedBottles.length - needsRepair.length}`);
  console.log(`  Bottles needing reassignment: ${needsRepair.length}\n`);

  if (needsRepair.length === 0) {
    console.log('No bottles need reassignment. Data may already be correct.');
    console.log('If Industrial Machine still does not appear, check that it has a subscription row.');
  } else {
    // Step 5: Reassign bottles
    console.log('Step 5: Reassigning bottles to Industrial Machine...');
    let updated = 0;
    let failed = 0;

    for (const bottle of needsRepair) {
      const { error: updateErr } = await supabase
        .from('bottles')
        .update({
          assigned_customer: imCustomerId,
          customer_name: imName,
        })
        .eq('id', bottle.id)
        .eq('organization_id', orgId);

      if (updateErr) {
        console.error(`  FAILED: ${bottle.barcode_number || bottle.id} - ${updateErr.message}`);
        failed++;
      } else {
        console.log(`  OK: ${bottle.barcode_number || bottle.serial_number || bottle.id} (was: ${bottle.assigned_customer || 'null'})`);
        updated++;
      }
    }

    console.log(`\n  Reassigned: ${updated}`);
    console.log(`  Failed: ${failed}`);
  }

  // Step 6: Ensure subscription row exists
  console.log('\nStep 6: Checking subscription row for Industrial Machine...');
  const { data: existingSub, error: subErr } = await supabase
    .from('subscriptions')
    .select('id, customer_id, status')
    .eq('organization_id', orgId)
    .eq('customer_id', imCustomerId);

  if (subErr) {
    console.error('  Failed to query subscriptions:', subErr.message);
  } else if (!existingSub || existingSub.length === 0) {
    console.log('  No subscription row found. Creating one...');
    const { error: insertErr } = await supabase
      .from('subscriptions')
      .insert({
        organization_id: orgId,
        customer_id: imCustomerId,
        customer_name: imName,
        billing_period: 'monthly',
        status: 'active',
      });

    if (insertErr) {
      console.error('  Failed to create subscription:', insertErr.message);
      console.log('  Industrial Machine may still appear via bottle-assignment fallback.');
    } else {
      console.log('  Created active monthly subscription for Industrial Machine.');
    }
  } else {
    const sub = existingSub[0];
    console.log(`  Subscription exists (id: ${sub.id}, status: ${sub.status}).`);
    if (sub.status !== 'active') {
      console.log('  WARNING: Subscription is not active. You may need to reactivate it.');
    }
  }

  console.log('\n=== Repair complete ===');
  console.log('Hard-refresh the Rentals page to see the updated data.');
}

fixIndustrialMachine().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
