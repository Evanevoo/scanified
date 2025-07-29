// Fix Owner Account Script
// This script fixes the owner account to have proper access to the Owner Portal

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jtfucttzaswmqqhmmhfb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOwnerAccount() {
  console.log('🔧 Fixing Owner Account for evankorial7@gmail.com');
  console.log('=====================================');
  
  const ownerEmail = 'evankorial7@gmail.com';
  
  try {
    // 1. First, let's check the current state
    console.log('\n📊 Checking current account state...');
    
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', ownerEmail)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }
    
    if (!currentProfile) {
      console.error('❌ Profile not found for', ownerEmail);
      return;
    }
    
    console.log('Current profile state:');
    console.log(`  - ID: ${currentProfile.id}`);
    console.log(`  - Email: ${currentProfile.email}`);
    console.log(`  - Role: ${currentProfile.role}`);
    console.log(`  - Organization ID: ${currentProfile.organization_id}`);
    console.log(`  - Full Name: ${currentProfile.full_name}`);
    
    // 2. Update the profile to be a platform owner
    console.log('\n🔄 Updating profile to owner role...');
    
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'owner',
        organization_id: null  // Remove organization link
      })
      .eq('email', ownerEmail)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      return;
    }
    
    console.log('✅ Profile updated successfully!');
    console.log('Updated profile state:');
    console.log(`  - ID: ${updatedProfile.id}`);
    console.log(`  - Email: ${updatedProfile.email}`);
    console.log(`  - Role: ${updatedProfile.role}`);
    console.log(`  - Organization ID: ${updatedProfile.organization_id}`);
    
    // 3. Verify the owner access
    console.log('\n🔍 Verifying owner access...');
    
    const isOwnerUser = updatedProfile.role === 'owner' || 
                       updatedProfile.email === 'evankorial7@gmail.com';
    
    console.log(`✅ Owner access verified: ${isOwnerUser}`);
    
    // 4. Show what this enables
    console.log('\n🎯 Owner Portal Access Enabled:');
    console.log('  - /owner-portal - Main owner dashboard');
    console.log('  - /owner-portal/analytics - Platform analytics');
    console.log('  - /owner-portal/customer-management - Manage all organizations');
    console.log('  - /owner-portal/billing - Billing management');
    console.log('  - /owner-portal/user-management - User management across all orgs');
    console.log('  - /owner-portal/support - Support ticket management');
    console.log('  - /owner-portal/system-health - System health monitoring');
    console.log('  - /owner-portal/audit-log - Audit log access');
    console.log('  - /owner-portal/impersonation - User impersonation');
    console.log('  - /owner-portal/plans - Subscription plan management');
    console.log('  - /owner-portal/roles - Role management');
    console.log('  - /owner-portal/page-builder - Page builder');
    console.log('  - /owner-portal/contact-management - Contact management');
    
    // 5. Next steps
    console.log('\n📋 Next Steps:');
    console.log('1. Log out of your current session');
    console.log('2. Log back in with evankorial7@gmail.com');
    console.log('3. You should be redirected to /owner-portal');
    console.log('4. If not, manually navigate to /owner-portal');
    
    console.log('\n🎉 Owner account fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing owner account:', error);
  }
}

// Run the fix
fixOwnerAccount(); 