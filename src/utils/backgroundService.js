import { updateDaysAtLocation } from './daysAtLocationUpdater';
import { fixBottleData } from './fixBottleData';

/**
 * Background service for automatic daily updates
 * This service runs automatically when the app starts and handles daily updates
 */

class BackgroundService {
  constructor() {
    this.isRunning = false;
    this.lastUpdateDate = null;
    this.updateInterval = null;
    this.checkInterval = null;
  }

  /**
   * Start the background service
   */
  start() {
    if (this.isRunning) {
      console.log('Background service is already running');
      return;
    }

    console.log('Starting background service for daily updates...');
    this.isRunning = true;

    // Check if we need to run an update immediately
    this.checkAndUpdate();

    // Set up periodic checks (every hour)
    this.checkInterval = setInterval(() => {
      this.checkAndUpdate();
    }, 60 * 60 * 1000); // 1 hour

    // Only check when the page becomes visible if it was hidden for more than 5 minutes
    let hiddenStartTime = null;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        hiddenStartTime = Date.now();
      } else {
        // Only check if the page was hidden for more than 5 minutes
        if (hiddenStartTime && (Date.now() - hiddenStartTime) > 5 * 60 * 1000) {
          this.checkAndUpdate();
        }
        hiddenStartTime = null;
      }
    });

    // Check when the app regains focus (but only if it was away for a while)
    let focusStartTime = null;
    window.addEventListener('blur', () => {
      focusStartTime = Date.now();
    });
    
    window.addEventListener('focus', () => {
      // Only check if the window was blurred for more than 5 minutes
      if (focusStartTime && (Date.now() - focusStartTime) > 5 * 60 * 1000) {
        this.checkAndUpdate();
      }
      focusStartTime = null;
    });
  }

  /**
   * Stop the background service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping background service...');
    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Check if an update is needed and run it
   */
  async checkAndUpdate() {
    if (!this.isRunning) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Load last update date from localStorage
    const storedDate = localStorage.getItem('lastDaysUpdate');
    if (storedDate) {
      this.lastUpdateDate = storedDate;
    }
    
    // If we already updated today, skip (but allow manual override)
    if (this.lastUpdateDate === today) {
      console.log('Already updated today, skipping... (lastUpdateDate:', this.lastUpdateDate, 'today:', today, ')');
      return;
    }

    // Check if it's a new day (after midnight) or first run
    const isNewDay = this.lastUpdateDate && this.lastUpdateDate !== today;
    
    if (isNewDay || !this.lastUpdateDate) {
      console.log('New day detected, running daily update... (lastUpdateDate:', this.lastUpdateDate, 'today:', today, ')');
      await this.runUpdate();
    } else {
      console.log('No update needed (lastUpdateDate:', this.lastUpdateDate, 'today:', today, ')');
    }
  }

  /**
   * Run the actual update
   */
  async runUpdate() {
    try {
      console.log('Running automatic daily update...');
      const result = await updateDaysAtLocation();
      
      if (result.success) {
        this.lastUpdateDate = new Date().toISOString().split('T')[0];
        console.log(`Automatic update completed: ${result.updated} bottles updated`);
        
        // Store the last update date in localStorage for persistence
        localStorage.setItem('lastDaysUpdate', this.lastUpdateDate);
        console.log('Stored last update date:', this.lastUpdateDate);
      } else {
        console.error('Automatic update failed:', result.error);
        
        // If the error is related to NULL constraints, try to fix the data
        if (result.error && result.error.includes('null value') && result.error.includes('serial_number')) {
          console.log('Attempting to fix NULL constraint issues...');
          const fixResult = await fixBottleData();
          
          if (fixResult.success) {
            console.log('Data fix completed:', fixResult.message);
            
            // Try the update again after fixing the data
            console.log('Retrying automatic update after data fix...');
            const retryResult = await updateDaysAtLocation();
            
            if (retryResult.success) {
              this.lastUpdateDate = new Date().toISOString().split('T')[0];
              console.log(`Automatic update completed after data fix: ${retryResult.updated} bottles updated`);
              localStorage.setItem('lastDaysUpdate', this.lastUpdateDate);
              console.log('Stored last update date after retry:', this.lastUpdateDate);
            } else {
              console.error('Automatic update still failed after data fix:', retryResult.error);
            }
          } else {
            console.error('Data fix failed:', fixResult.error);
          }
        }
      }
    } catch (error) {
      console.error('Error in automatic update:', error);
    }
  }

  /**
   * Force run update (manual trigger)
   */
  async forceUpdate() {
    console.log('Force update triggered...');
    this.lastUpdateDate = null; // Reset last update date
    localStorage.removeItem('lastDaysUpdate'); // Clear stored date
    await this.runUpdate();
  }

  /**
   * Reset the service state (useful for debugging)
   */
  reset() {
    console.log('Resetting background service state...');
    this.lastUpdateDate = null;
    localStorage.removeItem('lastDaysUpdate');
    console.log('Background service state reset complete');
  }

  /**
   * Initialize the service with stored data
   */
  initialize() {
    // Load last update date from localStorage
    const storedDate = localStorage.getItem('lastDaysUpdate');
    if (storedDate) {
      this.lastUpdateDate = storedDate;
      console.log('Loaded last update date:', storedDate);
    }

    // Start the service
    this.start();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastUpdateDate: this.lastUpdateDate,
      today: new Date().toISOString().split('T')[0],
      storedDate: localStorage.getItem('lastDaysUpdate')
    };
  }
}

// Create a singleton instance
const backgroundService = new BackgroundService();

// Auto-start when the module is imported
if (typeof window !== 'undefined') {
  // Only start in browser environment
  backgroundService.initialize();
}

export default backgroundService; 