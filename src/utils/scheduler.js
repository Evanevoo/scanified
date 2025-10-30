import logger from '../utils/logger';
import { updateDaysAtLocation } from './daysAtLocationUpdater';

/**
 * Simple scheduler for updating days_at_location daily
 * This can be used with various hosting platforms that support cron jobs
 */

// Function to be called by cron job (daily at midnight)
export const dailyUpdateJob = async () => {
  logger.log('Daily update job started at:', new Date().toISOString());
  
  try {
    const result = await updateDaysAtLocation();
    
    if (result.success) {
      logger.log(`Daily update completed successfully. Updated ${result.updated} bottles out of ${result.total} total.`);
    } else {
      logger.error('Daily update failed:', result.error);
    }
    
    return result;
  } catch (error) {
    logger.error('Daily update job error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * For platforms that support cron expressions, use this schedule:
 * 
 * Cron expression: "0 0 * * *" (daily at midnight)
 * 
 * Examples for different platforms:
 * 
 * 1. Vercel (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/daily-update",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 * 
 * 2. Netlify (netlify.toml):
 * [[redirects]]
 *   from = "/api/daily-update"
 *   to = "/.netlify/functions/daily-update"
 *   status = 200
 * 
 * 3. Railway, Render, or other platforms:
 * Set up a cron job that calls your API endpoint daily
 * 
 * 4. Local development/testing:
 * Use the manual update button in the BottleImport page
 */

/**
 * API endpoint handler for cron jobs
 * Create this in your API routes (e.g., /api/daily-update.js)
 */
export const apiHandler = async (req, res) => {
  // Verify the request is from a legitimate cron job
  // You might want to add authentication here
  
  try {
    const result = await dailyUpdateJob();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Updated ${result.updated} bottles`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * For testing purposes - simulate a day passing
 */
export const simulateDayPassing = async () => {
  logger.log('Simulating a day passing...');
  return await dailyUpdateJob();
}; 