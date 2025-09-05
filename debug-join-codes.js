import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugJoinCodes() {
  console.log('🔍 Debugging Join Code System...');
  
  try {
    // Step 1: Check if table exists
    console.log('\n1. Checking if organization_join_codes table exists...');
    const { data: tableData, error: tableError } = await supabase
      .from('organization_join_codes')
      .select('count(*)')
      .limit(0);
    
    if (tableError) {
      if (tableError.message.includes('relation "organization_join_codes" does not exist')) {
        console.log('❌ Table does not exist! Migration was not applied.');
        console.log('\n🔧 SOLUTION: Run the SQL migration in your Supabase dashboard:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Copy and paste complete-migration.sql');
        console.log('3. Run the query');
        return;
      } else {
        throw tableError;
      }
    }
    
    console.log('✅ Table exists!');
    
    // Step 2: Check if functions exist
    console.log('\n2. Testing PostgreSQL functions...');
    
    try {
      const { data: genData, error: genError } = await supabase
        .rpc('generate_numeric_join_code');
      
      if (genError) {
        console.log('❌ generate_numeric_join_code function missing:', genError.message);
        console.log('\n🔧 SOLUTION: The migration was not applied completely.');
        return;
      }
      
      console.log('✅ generate_numeric_join_code works:', genData);
    } catch (err) {
      console.log('❌ Function test failed:', err.message);
      return;
    }
    
    // Step 3: Check existing join codes
    console.log('\n3. Checking existing join codes...');
    const { data: codes, error: codesError } = await supabase
      .from('organization_join_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (codesError) {
      console.log('❌ Error fetching codes:', codesError.message);
      return;
    }
    
    console.log(`Found ${codes.length} join codes:`);
    codes.forEach(code => {
      const isExpired = new Date(code.expires_at) < new Date();
      const isUsedUp = code.current_uses >= code.max_uses;
      console.log(`  Code: ${code.code}`);
      console.log(`    Active: ${code.is_active}`);
      console.log(`    Expired: ${isExpired ? 'YES' : 'NO'}`);
      console.log(`    Used: ${code.current_uses}/${code.max_uses} ${isUsedUp ? '(USED UP)' : ''}`);
      console.log(`    Expires: ${new Date(code.expires_at).toLocaleString()}`);
      console.log('');
    });
    
    // Step 4: Test creating a new code
    console.log('\n4. Testing code creation...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('❌ Not authenticated. Please log in first.');
      console.log('Run: npm run dev, then go to localhost:5174 and log in');
      return;
    }
    
    console.log('✅ Authenticated as:', user.email);
    
    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile?.organization_id) {
      console.log('❌ User has no organization. Cannot create join codes.');
      return;
    }
    
    console.log('✅ User organization:', profile.organization_id);
    console.log('✅ User role:', profile.role);
    
    // Create a test join code
    const { data: newCodeData, error: newCodeError } = await supabase
      .rpc('create_organization_join_code', {
        p_organization_id: profile.organization_id,
        p_created_by: user.id,
        p_expires_hours: 1,
        p_max_uses: 1,
        p_notes: 'Debug test code'
      });
    
    if (newCodeError) {
      console.log('❌ Failed to create test code:', newCodeError.message);
      return;
    }
    
    const testCode = newCodeData[0].join_code;
    console.log('✅ Created test code:', testCode);
    
    // Step 5: Test validating the code
    console.log('\n5. Testing code validation...');
    
    const { data: validateData, error: validateError } = await supabase
      .rpc('use_organization_join_code', {
        p_code: testCode,
        p_used_by: user.id
      });
    
    if (validateError) {
      console.log('❌ Validation failed:', validateError.message);
      return;
    }
    
    const result = validateData[0];
    console.log('✅ Validation result:', result);
    
    if (result.success) {
      console.log('\n🎉 JOIN CODE SYSTEM IS WORKING!');
      console.log(`Test code ${testCode} validated successfully.`);
      console.log('\nThe issue might be:');
      console.log('1. Using an expired or already-used code');
      console.log('2. Typing the code incorrectly');
      console.log('3. Browser caching issues');
    } else {
      console.log('\n❌ VALIDATION FAILED:', result.message);
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

debugJoinCodes();
