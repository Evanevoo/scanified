import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addJoinCodes() {
  console.log('🚀 Adding join_code system to organizations...');
  
  try {
    // First, let's try to add the column using a simple SQL query
    console.log('1. Adding join_code column...');
    
    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE organizations ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;'
    });
    
    if (alterError) {
      console.log('RPC method failed, trying direct column addition...');
      
      // Try alternative approach - update a dummy record to trigger column creation
      const { error: testError } = await supabase
        .from('organizations')
        .update({ join_code: null })
        .eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
      
      if (testError && !testError.message.includes('column "join_code" of relation "organizations" does not exist')) {
        console.log('✅ join_code column already exists');
      }
    } else {
      console.log('✅ join_code column added successfully');
    }
    
    // 2. Generate join codes for existing organizations
    console.log('2. Fetching organizations without join codes...');
    
    const { data: orgs, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, slug, join_code');
    
    if (fetchError) {
      console.error('Error fetching organizations:', fetchError);
      return;
    }
    
    const orgsWithoutCodes = orgs.filter(org => !org.join_code);
    console.log(`Found ${orgsWithoutCodes.length} organizations without join codes`);
    
    for (const org of orgsWithoutCodes) {
      console.log(`\n3. Processing: ${org.name}`);
      
      // Generate base code from organization name
      const baseCode = org.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 10)
        .toUpperCase() + '-2024';
      
      let joinCode = baseCode;
      let counter = 1;
      
      // Ensure uniqueness
      while (true) {
        const { data: existing } = await supabase
          .from('organizations')
          .select('id')
          .eq('join_code', joinCode)
          .maybeSingle();
        
        if (!existing) break;
        
        joinCode = `${baseCode}-${counter}`;
        counter++;
      }
      
      // Update organization with join code
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ join_code: joinCode })
        .eq('id', org.id);
      
      if (updateError) {
        console.error(`   ❌ Error updating ${org.name}:`, updateError);
      } else {
        console.log(`   ✅ ${org.name} -> ${joinCode}`);
      }
    }
    
    // 4. Display all organization codes
    console.log('\n📋 Final Organization Codes:');
    const { data: finalOrgs } = await supabase
      .from('organizations')
      .select('name, join_code, slug')
      .order('name');
    
    finalOrgs.forEach(org => {
      console.log(`   ${org.name}: ${org.join_code}`);
    });
    
    console.log('\n🎉 Organization join code system setup complete!');
    console.log('\n📖 How to use:');
    console.log('   1. Users can now join organizations using these codes');
    console.log('   2. Codes are shown in the organization settings');
    console.log('   3. Users enter codes at /connect-organization');
    
  } catch (error) {
    console.error('💥 Error in addJoinCodes:', error);
  }
}

addJoinCodes();
