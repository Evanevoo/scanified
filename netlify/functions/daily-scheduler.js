const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  console.log('Daily scheduler function triggered at:', new Date().toISOString());
  
  // Verify this is being called by a scheduled function or authorized source
  const authHeader = event.headers.authorization;
  const expectedToken = process.env.CRON_SECRET;
  
  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    console.log('Unauthorized request to daily scheduler');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    // Call the database function to run scheduled jobs
    const { data, error } = await supabase.rpc('run_scheduled_jobs');
    
    if (error) {
      console.error('Error running scheduled jobs:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: error.message 
        })
      };
    }

    // Get the status of the daily update job
    const { data: jobStatus, error: statusError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('job_name', 'daily_days_at_location_update')
      .single();

    if (statusError) {
      console.error('Error getting job status:', statusError);
    }

    console.log('Daily scheduler completed successfully');
    console.log('Job status:', jobStatus);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        timestamp: new Date().toISOString(),
        jobStatus: jobStatus || null
      })
    };

  } catch (error) {
    console.error('Unexpected error in daily scheduler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
}; 