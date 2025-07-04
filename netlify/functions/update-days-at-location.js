const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Updates the days_at_location field for all bottles
 * This function runs daily via Netlify scheduled functions
 */
async function updateDaysAtLocation() {
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
}

// Netlify scheduled function handler
exports.handler = async (event, context) => {
  // Only allow scheduled events
  if (event.source !== 'aws.events') {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'This function can only be called by scheduled events' })
    };
  }

  try {
    console.log('Daily days_at_location update triggered');
    const result = await updateDaysAtLocation();
    
    if (result.success) {
      console.log(`Daily update completed: ${result.updated} bottles updated out of ${result.total} total`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Daily update completed successfully',
          updated: result.updated,
          total: result.total,
          mode: result.mode || 'normal'
        })
      };
    } else {
      console.error('Daily update failed:', result.error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Daily update failed',
          details: result.error
        })
      };
    }
  } catch (error) {
    console.error('Unexpected error in scheduled function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Unexpected error in scheduled function',
        details: error.message
      })
    };
  }
}; 