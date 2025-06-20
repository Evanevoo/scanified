// Browser Console Profile Cleanup Script
// Run this directly in your browser's developer console (F12)

async function cleanupProfiles() {
  try {
    console.log('🔍 Fetching all profiles...');
    
    // Use the existing Supabase client from the page
    const supabase = window.supabase || window.supabaseClient;
    
    if (!supabase) {
      console.error('❌ Supabase client not found. Make sure you are on a page that loads Supabase.');
      return;
    }
    
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

    // Ask for confirmation
    const confirmed = confirm(
      `⚠️ WARNING: This will permanently delete ${profilesToDelete.length} profiles!\n\n` +
      `This action cannot be undone.\n\n` +
      `Profiles to delete:\n` +
      profilesToDelete.map(p => `- ${p.full_name || p.name} (${p.role})`).join('\n') +
      `\n\nClick OK to proceed with deletion.`
    );

    if (!confirmed) {
      console.log('⏸️  Deletion cancelled by user.');
      return;
    }

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

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the cleanup
cleanupProfiles(); 