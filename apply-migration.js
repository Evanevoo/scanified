import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function applyMigration() {
  console.log('🚀 Applying organization join codes migration...');
  
  try {
    // Step 1: Create the table
    console.log('Step 1: Creating organization_join_codes table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS organization_join_codes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
        code TEXT NOT NULL UNIQUE,
        created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
        used_at TIMESTAMP WITH TIME ZONE NULL,
        used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        max_uses INTEGER DEFAULT 1,
        current_uses INTEGER DEFAULT 0,
        notes TEXT
      );
    `;

    // For Supabase, we need to use the SQL editor approach
    // Let's try inserting directly first to test table creation
    const { error: testError } = await supabase
      .from('organization_join_codes')
      .select('count(*)')
      .limit(0);

    if (testError && testError.message.includes('relation "organization_join_codes" does not exist')) {
      console.log('❌ Table does not exist. Please run this SQL in your Supabase SQL Editor:');
      console.log('\n' + '='.repeat(80));
      console.log(createTableSQL);
      
      // Step 2: Create indexes
      console.log('\n-- Create indexes for performance');
      console.log(`
CREATE INDEX IF NOT EXISTS idx_organization_join_codes_code ON organization_join_codes(code);
CREATE INDEX IF NOT EXISTS idx_organization_join_codes_org_id ON organization_join_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_join_codes_active ON organization_join_codes(is_active, expires_at);
      `);

      // Step 3: Create functions
      console.log('\n-- Create PostgreSQL functions');
      console.log(`
-- Function to generate unique 6-digit numeric code
CREATE OR REPLACE FUNCTION generate_numeric_join_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    attempts INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    LOOP
        code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        IF NOT EXISTS (
            SELECT 1 FROM organization_join_codes 
            WHERE code = code 
            AND is_active = true 
            AND expires_at > NOW()
        ) THEN
            RETURN code;
        END IF;
        
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new join code
CREATE OR REPLACE FUNCTION create_organization_join_code(
    p_organization_id UUID,
    p_created_by UUID,
    p_expires_hours INTEGER DEFAULT 24,
    p_max_uses INTEGER DEFAULT 1,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(code TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    new_code TEXT;
    expiry_time TIMESTAMP WITH TIME ZONE;
BEGIN
    new_code := generate_numeric_join_code();
    expiry_time := NOW() + (p_expires_hours || ' hours')::INTERVAL;
    
    INSERT INTO organization_join_codes (
        organization_id, code, created_by, expires_at, max_uses, notes
    ) VALUES (
        p_organization_id, new_code, p_created_by, expiry_time, p_max_uses, p_notes
    );
    
    RETURN QUERY SELECT new_code, expiry_time;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and use a join code
CREATE OR REPLACE FUNCTION use_organization_join_code(
    p_code TEXT,
    p_used_by UUID
)
RETURNS TABLE(success BOOLEAN, organization_id UUID, message TEXT) AS $$
DECLARE
    code_record RECORD;
BEGIN
    SELECT * INTO code_record FROM organization_join_codes
    WHERE code = p_code AND is_active = true;
    
    IF code_record IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid join code';
        RETURN;
    END IF;
    
    IF code_record.expires_at < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Join code has expired';
        RETURN;
    END IF;
    
    IF code_record.current_uses >= code_record.max_uses THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Join code has already been used';
        RETURN;
    END IF;
    
    UPDATE organization_join_codes
    SET current_uses = current_uses + 1,
        used_at = CASE WHEN used_at IS NULL THEN NOW() ELSE used_at END,
        used_by = CASE WHEN used_by IS NULL THEN p_used_by ELSE used_by END,
        is_active = CASE WHEN (current_uses + 1) >= max_uses THEN false ELSE is_active END
    WHERE id = code_record.id;
    
    RETURN QUERY SELECT true, code_record.organization_id, 'Join code validated successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to get active codes for an organization
CREATE OR REPLACE FUNCTION get_organization_join_codes(p_organization_id UUID)
RETURNS TABLE(
    id UUID, code TEXT, created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, created_by_name TEXT,
    current_uses INTEGER, max_uses INTEGER, is_active BOOLEAN, notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ojc.id, ojc.code, ojc.created_at, ojc.expires_at,
           COALESCE(p.full_name, 'Unknown') as created_by_name,
           ojc.current_uses, ojc.max_uses, ojc.is_active, ojc.notes
    FROM organization_join_codes ojc
    LEFT JOIN profiles p ON ojc.created_by = p.id
    WHERE ojc.organization_id = p_organization_id
    ORDER BY ojc.created_at DESC;
END;
$$ LANGUAGE plpgsql;
      `);

      // Step 4: Enable RLS
      console.log('\n-- Enable Row Level Security');
      console.log(`
ALTER TABLE organization_join_codes ENABLE ROW LEVEL SECURITY;

-- Users can view codes for their organization
CREATE POLICY "Users can view organization join codes" ON organization_join_codes
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Admins can create codes
CREATE POLICY "Admins can create join codes" ON organization_join_codes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = organization_join_codes.organization_id
            AND (role = 'admin' OR role = 'owner' OR role = 'manager')
        )
    );

-- Admins can update codes
CREATE POLICY "Admins can update join codes" ON organization_join_codes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = organization_join_codes.organization_id
            AND (role = 'admin' OR role = 'owner' OR role = 'manager')
        )
    );
      `);

      console.log('\n' + '='.repeat(80));
      console.log('\n📋 INSTRUCTIONS:');
      console.log('1. Copy the SQL above');
      console.log('2. Go to your Supabase dashboard');
      console.log('3. Navigate to SQL Editor');
      console.log('4. Paste and run the SQL');
      console.log('5. Then run this script again to verify');
      
    } else if (testError) {
      throw testError;
    } else {
      console.log('✅ Table already exists!');
      
      // Test the functions
      console.log('🧪 Testing the system...');
      
      // Get current user and organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user. Please log in first.');
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();
      
      if (!profile?.organization_id) {
        console.log('❌ User has no organization. Cannot test code generation.');
        return;
      }
      
      console.log(`👤 User: ${user.email}`);
      console.log(`🏢 Organization: ${profile.organization_id}`);
      console.log(`👔 Role: ${profile.role}`);
      
      // Test code generation
      console.log('\n🎲 Testing code generation...');
      
      const { data: codeData, error: codeError } = await supabase
        .rpc('create_organization_join_code', {
          p_organization_id: profile.organization_id,
          p_created_by: user.id,
          p_expires_hours: 24,
          p_max_uses: 1,
          p_notes: 'Test code generated by migration script'
        });
      
      if (codeError) {
        console.log(`❌ Code generation failed: ${codeError.message}`);
      } else {
        const testCode = codeData[0];
        console.log(`✅ Test code generated: ${testCode.code}`);
        console.log(`⏰ Expires: ${new Date(testCode.expires_at).toLocaleString()}`);
        
        // Test code validation
        console.log('\n🔍 Testing code validation...');
        
        const { data: validateData, error: validateError } = await supabase
          .rpc('use_organization_join_code', {
            p_code: testCode.code,
            p_used_by: user.id
          });
        
        if (validateError) {
          console.log(`❌ Code validation failed: ${validateError.message}`);
        } else {
          const result = validateData[0];
          console.log(`✅ Code validation: ${result.success ? 'SUCCESS' : 'FAILED'}`);
          console.log(`📝 Message: ${result.message}`);
          
          if (result.success) {
            console.log(`🏢 Organization ID: ${result.organization_id}`);
          }
        }
      }
      
      console.log('\n🎉 Migration verification complete!');
      console.log('\n📍 Next steps:');
      console.log('1. Navigate to http://localhost:5174/organization-join-codes');
      console.log('2. Generate your first admin code');
      console.log('3. Test the OAuth flow at http://localhost:5174/connect-organization');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

applyMigration();
