import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to add this to your .env

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Find the owner profile (you can customize this logic)
    const ownerProfile = profiles.find(p => 
      p.role === 'owner' || 
      p.email === 'admin@yourcompany.com' || // Replace with your admin email
      p.full_name === 'GERALD' // Based on your logs
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
    console.log('node cleanup-profiles.js --confirm');
    
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