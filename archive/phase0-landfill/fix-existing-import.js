import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function fixExistingImport() {
  console.log('🔧 Fixing existing import 640...\n');
  
  // Get the import
  const { data: importRecord, error: fetchError } = await supabase
    .from('imported_invoices')
    .select('*')
    .eq('id', 640)
    .single();
    
  if (fetchError) {
    console.log('❌ Error fetching import:', fetchError);
    return;
  }
  
  console.log('📋 Found import:', importRecord.id);
  console.log('   Status:', importRecord.status);
  console.log('   Organization ID:', importRecord.organization_id || 'MISSING');
  console.log('   Uploaded by:', importRecord.uploaded_by);
  
  // Get user's organization_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', importRecord.uploaded_by)
    .single();
    
  if (profileError || !profile?.organization_id) {
    console.log('❌ Could not find organization for user:', importRecord.uploaded_by);
    return;
  }
  
  console.log('\n✅ User organization:', profile.organization_id);
  
  // Update the import with organization_id
  const { data: updated, error: updateError } = await supabase
    .from('imported_invoices')
    .update({ organization_id: profile.organization_id })
    .eq('id', 640)
    .select()
    .single();
    
  if (updateError) {
    console.log('❌ Error updating import:', updateError);
    return;
  }
  
  console.log('\n✅ Import updated successfully!');
  console.log('   New Organization ID:', updated.organization_id);
  
  process.exit(0);
}

fixExistingImport();
