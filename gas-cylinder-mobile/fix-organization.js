import logger from './utils/logger';
// Fix script to resolve organization issues
// This script will clean up orphaned profiles and create a default organization if needed

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL');
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOrganizationIssues() {
  logger.log('🔧 Fixing organization issues...\n');

  try {
    // 1. Check current state
    logger.log('1. Checking current state...');
    const { data: profilesWithoutOrg } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .is('organization_id', null);

    const { data: profilesWithInvalidOrg } = await supabase
      .from('profiles')
      .select('id, email, full_name, organization_id')
      .not('organization_id', 'is', null);

    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, slug');

    logger.log(`   - Profiles without organization_id: ${profilesWithoutOrg?.length || 0}`);
    logger.log(`   - Profiles with invalid organization_id: ${profilesWithInvalidOrg?.length || 0}`);
    logger.log(`   - Total organizations: ${organizations?.length || 0}`);

    // 2. Create a default organization if none exist
    if (organizations.length === 0) {
      logger.log('\n2. Creating default organization...');
      
      const defaultOrg = {
        name: 'Default Organization',
        slug: 'default-org',
        domain: 'default.com',
        subscription_plan: 'basic',
        subscription_status: 'trial',
        trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days trial
        payment_required: false,
        max_users: 5,
        max_customers: 100,
        max_cylinders: 1000,
        asset_type: 'cylinder',
        asset_type_plural: 'cylinders',
        asset_display_name: 'Cylinder',
        asset_display_name_plural: 'Cylinders',
        app_name: 'Scanified',
        primary_color: '#40B5AD',
        secondary_color: '#48C9B0',
        is_active: true
      };

      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert(defaultOrg)
        .select()
        .single();

      if (orgError) {
        logger.error('❌ Error creating default organization:', orgError);
        return;
      }

      logger.log(`✅ Created default organization: ${newOrg.name} (ID: ${newOrg.id})`);
      organizations.push(newOrg);
    }

    // 3. Fix profiles with invalid organization_id
    logger.log('\n3. Fixing profiles with invalid organization_id...');
    let fixedCount = 0;
    
    for (const profile of profilesWithInvalidOrg) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', profile.organization_id)
        .single();
      
      if (!org) {
        logger.log(`   - Fixing ${profile.email} (invalid org_id: ${profile.organization_id})`);
        
        // Set to the first available organization
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ organization_id: organizations[0].id })
          .eq('id', profile.id);

        if (updateError) {
          logger.error(`   ❌ Error updating ${profile.email}:`, updateError);
        } else {
          logger.log(`   ✅ Fixed ${profile.email} -> ${organizations[0].name}`);
          fixedCount++;
        }
      }
    }

    // 4. Fix profiles without organization_id
    logger.log('\n4. Fixing profiles without organization_id...');
    
    for (const profile of profilesWithoutOrg) {
      logger.log(`   - Fixing ${profile.email} (no organization_id)`);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ organization_id: organizations[0].id })
        .eq('id', profile.id);

      if (updateError) {
        logger.error(`   ❌ Error updating ${profile.email}:`, updateError);
      } else {
        logger.log(`   ✅ Fixed ${profile.email} -> ${organizations[0].name}`);
        fixedCount++;
      }
    }

    // 5. Final verification
    logger.log('\n5. Verifying fixes...');
    const { data: finalProfilesWithoutOrg } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .is('organization_id', null);

    const { data: finalProfilesWithInvalidOrg } = await supabase
      .from('profiles')
      .select('id, email, full_name, organization_id')
      .not('organization_id', 'is', null);

    let finalInvalidCount = 0;
    for (const profile of finalProfilesWithInvalidOrg) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', profile.organization_id)
        .single();
      
      if (!org) {
        finalInvalidCount++;
      }
    }

    logger.log(`   ✅ Final state:`);
    logger.log(`      - Profiles without organization_id: ${finalProfilesWithoutOrg?.length || 0}`);
    logger.log(`      - Profiles with invalid organization_id: ${finalInvalidCount}`);
    logger.log(`      - Total fixes applied: ${fixedCount}`);

    if (finalProfilesWithoutOrg?.length === 0 && finalInvalidCount === 0) {
      logger.log('\n🎉 All organization issues have been resolved!');
      logger.log('   The mobile app should now work properly for all users.');
    } else {
      logger.log('\n⚠️  Some issues remain. Please check the database manually.');
    }

  } catch (error) {
    logger.error('❌ Unexpected error:', error);
  }
}

// Run the fix function
fixOrganizationIssues();
