import { supabase } from '../../supabase';

/**
 * Updates the days_at_location field for all bottles
 * This should be called daily via a cron job or scheduled task
 */
export const updateDaysAtLocation = async () => {
  try {
    console.log('Starting daily days_at_location update...');
    
    // First, try to get bottles with last_location_update column
    let { data: bottles, error: fetchError } = await supabase
      .from('bottles')
      .select('id, days_at_location, last_location_update')
      .not('days_at_location', 'is', null);

    // If the column doesn't exist, fall back to basic approach
    if (fetchError && fetchError.message.includes('last_location_update')) {
      console.log('last_location_update column not found, using fallback approach...');
      
      // Get bottles without the last_location_update column
      const { data: basicBottles, error: basicError } = await supabase
        .from('bottles')
        .select('id, days_at_location')
        .not('days_at_location', 'is', null);

      if (basicError) {
        console.error('Error fetching bottles:', basicError);
        return { success: false, error: basicError.message };
      }

      bottles = basicBottles;
      
      // For bottles without last_location_update, increment days_at_location
      if (bottles && bottles.length > 0) {
        let updatedCount = 0;
        
        // Update each bottle individually to avoid constraint issues
        for (const bottle of bottles) {
          const { error: updateError } = await supabase
            .from('bottles')
            .update({ 
              days_at_location: (bottle.days_at_location || 0) + 1
            })
            .eq('id', bottle.id);

          if (updateError) {
            console.error(`Error updating bottle ${bottle.id}:`, updateError);
          } else {
            updatedCount++;
          }
        }

        console.log(`Successfully updated ${updatedCount} bottles (fallback mode)`);
        return { 
          success: true, 
          updated: updatedCount,
          total: bottles.length,
          mode: 'fallback'
        };
      }
    } else if (fetchError) {
      console.error('Error fetching bottles:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!bottles || bottles.length === 0) {
      console.log('No bottles found to update');
      return { success: true, updated: 0 };
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    let updatedCount = 0;

    // Update each bottle individually to avoid constraint issues
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
          console.error(`Error updating bottle ${bottle.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} bottles`);
    return { 
      success: true, 
      updated: updatedCount,
      total: bottles.length 
    };

  } catch (error) {
    console.error('Error in updateDaysAtLocation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Resets days_at_location to 0 when a bottle is returned
 * Call this function when a bottle is scanned as returned
 */
export const resetDaysAtLocation = async (bottleId) => {
  try {
    // Try to update with last_location_update first
    let { error } = await supabase
      .from('bottles')
      .update({ 
        days_at_location: 0,
        last_location_update: new Date().toISOString().split('T')[0]
      })
      .eq('id', bottleId);

    // If last_location_update column doesn't exist, try without it
    if (error && error.message.includes('last_location_update')) {
      console.log('last_location_update column not found, updating without it...');
      const { error: basicError } = await supabase
        .from('bottles')
        .update({ 
          days_at_location: 0
        })
        .eq('id', bottleId);
      
      if (basicError) {
        console.error('Error resetting days_at_location:', basicError);
        return { success: false, error: basicError.message };
      }
    } else if (error) {
      console.error('Error resetting days_at_location:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in resetDaysAtLocation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sets initial days_at_location when a bottle is first assigned to a location
 * Call this function when a bottle is first scanned at a location
 */
export const initializeDaysAtLocation = async (bottleId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Try to update with last_location_update first
    let { error } = await supabase
      .from('bottles')
      .update({ 
        days_at_location: 1,
        last_location_update: today
      })
      .eq('id', bottleId);

    // If last_location_update column doesn't exist, try without it
    if (error && error.message.includes('last_location_update')) {
      console.log('last_location_update column not found, updating without it...');
      const { error: basicError } = await supabase
        .from('bottles')
        .update({ 
          days_at_location: 1
        })
        .eq('id', bottleId);
      
      if (basicError) {
        console.error('Error initializing days_at_location:', basicError);
        return { success: false, error: basicError.message };
      }
    } else if (error) {
      console.error('Error initializing days_at_location:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in initializeDaysAtLocation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Manual trigger for testing - updates days_at_location for all bottles
 * This can be called from the admin interface for testing purposes
 */
export const manualUpdateDaysAtLocation = async () => {
  console.log('Manual update triggered...');
  return await updateDaysAtLocation();
}; 