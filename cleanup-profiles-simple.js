// Simple Profile Cleanup Script
// Run this in your browser console or as a Node.js script

// Copy your Supabase URL and anon key from your .env file
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your actual URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual anon key

// Initialize Supabase client
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanupProfiles() {
  try {
    console.log('🔍 Fetching all profiles...');
    
    // Get all profiles
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching profiles:', fetchError);
      return;
    }

    console.log(`📊 Found ${profiles.length} total profiles:`);
    profiles.forEach(profile => {
      console.log(`  - ${profile.full_name || profile.name} (${profile.id}) - Role: ${profile.role} - Created: ${profile.created_at}`);
    });

    // Find the owner profile (GERALD based on your logs)
    const ownerProfile = profiles.find(p => 
      p.full_name === 'GERALD' || 
      p.name === 'GERALD' ||
      p.role === 'owner'
    );

    if (!ownerProfile) {
      console.error('❌ No owner profile found! Please specify which profile should be kept.');
      console.log('Available profiles:');
      profiles.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.full_name || p.name} (${p.email}) - Role: ${p.role}`);
      });
      return;
    }

    console.log(`\n👑 Owner profile identified: ${ownerProfile.full_name || ownerProfile.name} (${ownerProfile.id})`);

    // Get profiles to delete (all except owner)
    const profilesToDelete = profiles.filter(p => p.id !== ownerProfile.id);

    if (profilesToDelete.length === 0) {
      console.log('✅ No profiles to delete - only owner profile exists.');
      return;
    }

    console.log(`\n🗑️  Profiles to delete (${profilesToDelete.length}):`);
    profilesToDelete.forEach(profile => {
      console.log(`  - ${profile.full_name || profile.name} (${profile.id}) - Role: ${profile.role}`);
    });

    // Confirm deletion
    console.log('\n⚠️  WARNING: This will permanently delete the above profiles!');
    console.log('This action cannot be undone.');
    
    // For safety, we'll require manual confirmation
    console.log('\nTo proceed with deletion, run this script with the --confirm flag:');
    console.log('node cleanup-profiles-simple.js --confirm');
    
    if (process.argv.includes('--confirm')) {
      console.log('\n🔄 Proceeding with deletion...');
      
      // Delete profiles one by one to handle any errors
      for (const profile of profilesToDelete) {
        try {
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', profile.id);

          if (deleteError) {
            console.error(`❌ Error deleting profile ${profile.full_name || profile.name}:`, deleteError);
          } else {
            console.log(`✅ Deleted profile: ${profile.full_name || profile.name}`);
          }
        } catch (err) {
          console.error(`❌ Exception deleting profile ${profile.full_name || profile.name}:`, err);
        }
      }

      console.log('\n🎉 Profile cleanup completed!');
      
      // Verify final state
      const { data: remainingProfiles, error: verifyError } = await supabase
        .from('profiles')
        .select('*');

      if (verifyError) {
        console.error('❌ Error verifying remaining profiles:', verifyError);
      } else {
        console.log(`\n📊 Remaining profiles (${remainingProfiles.length}):`);
        remainingProfiles.forEach(profile => {
          console.log(`  - ${profile.full_name || profile.name} (${profile.id}) - Role: ${profile.role}`);
        });
      }
    } else {
      console.log('\n⏸️  Deletion cancelled. No profiles were deleted.');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the cleanup
cleanupProfiles(); 