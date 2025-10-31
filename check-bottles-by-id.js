import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkBottleById() {
  console.log('🔍 Checking bottle by ID...\n');
  
  // Try to get the specific bottle by ID
  const { data: bottle, error } = await supabase
    .from('bottles')
    .select('*')
    .eq('id', '36b46f5c-5731-440b-9d7e-e5cf36f505c7')
    .maybeSingle();
    
  if (error) {
    console.log('❌ Error:', error.message);
    console.log('   Code:', error.code);
    console.log('   This might be an RLS (Row Level Security) issue\n');
  }
  
  if (bottle) {
    console.log('✅ Bottle found:');
    console.log('   ID:', bottle.id);
    console.log('   Barcode:', bottle.barcode_number);
    console.log('   Product Code:', bottle.product_code);
    console.log('   Organization ID:', bottle.organization_id);
    console.log('   Serial:', bottle.serial_number);
    console.log('   Gas Type:', bottle.gas_type);
    console.log('   Category:', bottle.category);
    console.log('\n');
  } else {
    console.log('❌ Bottle not found');
    console.log('   This means either:');
    console.log('   1. The bottle doesn\'t exist');
    console.log('   2. RLS is blocking access (you need to be authenticated)');
    console.log('   3. The bottle belongs to a different organization\n');
  }
  
  // Also check total bottles without filters
  const { count, error: countError } = await supabase
    .from('bottles')
    .select('*', { count: 'exact', head: true });
    
  console.log('📊 Total bottles visible to ANON key:', count || 0);
  
  if (countError) {
    console.log('   Error getting count:', countError.message);
  }
  
  process.exit(0);
}

checkBottleById();
