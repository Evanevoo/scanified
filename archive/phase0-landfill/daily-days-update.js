// Daily Days at Location Update Script
// Run this daily to update days_at_location for all bottles

import { supabase } from './supabase/client.js';

/**
 * Updates days_at_location for all bottles daily
 * This should be run as a cron job or scheduled task
 */
export async function updateDaysAtLocationDaily() {
  try {
    console.log('🔄 Starting daily days_at_location update...');
    
    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Get all bottles that have a days_at_location value
    const { data: bottles, error: fetchError } = await supabase
      .from('bottles')
      .select('id, days_at_location, last_location_update')
      .not('days_at_location', 'is', null);

    if (fetchError) {
      console.error('❌ Error fetching bottles:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!bottles || bottles.length === 0) {
      console.log('ℹ️ No bottles found to update');
      return { success: true, updated: 0, total: 0 };
    }

    console.log(`📊 Found ${bottles.length} bottles to check for updates`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Update each bottle individually
    for (const bottle of bottles) {
      const lastUpdate = bottle.last_location_update 
        ? new Date(bottle.last_location_update).toISOString().split('T')[0]
        : today;

      // Only update if we haven't already updated today
      if (lastUpdate !== today) {
        const { error: updateError } = await supabase
          .from('bottles')
          .update({
            days_at_location: (bottle.days_at_location || 0) + 1,
            last_location_update: today
          })
          .eq('id', bottle.id);

        if (updateError) {
          console.error(`❌ Error updating bottle ${bottle.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`✅ Updated bottle ${bottle.id}: ${bottle.days_at_location} → ${(bottle.days_at_location || 0) + 1} days`);
        }
      } else {
        skippedCount++;
        console.log(`⏭️ Skipped bottle ${bottle.id}: already updated today`);
      }
    }

    console.log(`🎉 Daily update completed: ${updatedCount} updated, ${skippedCount} skipped`);
    
    return { 
      success: true, 
      updated: updatedCount, 
      skipped: skippedCount,
      total: bottles.length,
      date: today
    };

  } catch (error) {
    console.error('❌ Error in daily update:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Manual trigger for testing
 */
export async function runDailyUpdate() {
  console.log('🚀 Running manual daily update...');
  const result = await updateDaysAtLocationDaily();
  console.log('📋 Update result:', result);
  return result;
}

// Auto-run if this script is executed directly
if (typeof window !== 'undefined') {
  window.updateDaysAtLocationDaily = updateDaysAtLocationDaily;
  window.runDailyUpdate = runDailyUpdate;
  console.log('📅 Daily update functions loaded. Run runDailyUpdate() to test.');
}

