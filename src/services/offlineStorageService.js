import logger from '../utils/logger';

/**
 * Offline Storage Service for Web App
 * Handles local data caching and sync when online
 * Synced with mobile app's OfflineStorageService.ts
 */

const OFFLINE_QUEUE_KEY = 'scanified_offline_queue';
const CACHED_DATA_KEY = 'scanified_cached_data';
const LAST_SYNC_KEY = 'scanified_last_sync';

/**
 * Check if browser is online
 * @returns {boolean}
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Store data for offline use
 * @param {string} organizationId - Organization ID
 * @param {Object} data - Data to cache
 */
export const cacheData = async (organizationId, data) => {
  try {
    const existingData = await getCachedData(organizationId) || {};
    
    const cachedData = {
      bottles: data.bottles || existingData.bottles || [],
      customers: data.customers || existingData.customers || [],
      rentals: data.rentals || existingData.rentals || [],
      lastSync: Date.now(),
      organizationId
    };

    localStorage.setItem(
      `${CACHED_DATA_KEY}_${organizationId}`, 
      JSON.stringify(cachedData)
    );

    logger.log('Data cached for offline use:', {
      bottles: cachedData.bottles.length,
      customers: cachedData.customers.length,
      rentals: cachedData.rentals.length
    });

  } catch (error) {
    logger.error('Error caching data:', error);
  }
};

/**
 * Get cached data for offline use
 * @param {string} organizationId - Organization ID
 * @returns {Object|null}
 */
export const getCachedData = async (organizationId) => {
  try {
    const data = localStorage.getItem(`${CACHED_DATA_KEY}_${organizationId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Error getting cached data:', error);
    return null;
  }
};

/**
 * Add operation to offline queue
 * @param {Object} operation - Operation data
 */
export const addToOfflineQueue = async (operation) => {
  try {
    const queue = await getOfflineQueue();
    
    const newOperation = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      synced: false,
      ...operation
    };

    queue.push(newOperation);
    
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    
    logger.log('Added to offline queue:', newOperation.type, newOperation.id);

  } catch (error) {
    logger.error('Error adding to offline queue:', error);
  }
};

/**
 * Get offline queue
 * @returns {Array}
 */
export const getOfflineQueue = async () => {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logger.error('Error getting offline queue:', error);
    return [];
  }
};

/**
 * Sync offline operations when online
 * @param {Object} supabase - Supabase client
 * @returns {Object} - { success: number, failed: number }
 */
export const syncOfflineOperations = async (supabase) => {
  try {
    if (!isOnline()) {
      logger.log('Device is offline, skipping sync');
      return { success: 0, failed: 0 };
    }

    const queue = await getOfflineQueue();
    const unsyncedOperations = queue.filter(op => !op.synced);

    if (unsyncedOperations.length === 0) {
      logger.log('No offline operations to sync');
      return { success: 0, failed: 0 };
    }

    logger.log(`Syncing ${unsyncedOperations.length} offline operations...`);

    let successCount = 0;
    let failedCount = 0;

    for (const operation of unsyncedOperations) {
      try {
        await syncOperation(supabase, operation);
        
        // Mark as synced
        operation.synced = true;
        successCount++;
        
      } catch (error) {
        logger.error(`Failed to sync operation ${operation.id}:`, error);
        failedCount++;
      }
    }

    // Update queue with sync status
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

    logger.log(`Sync completed: ${successCount} success, ${failedCount} failed`);
    
    return { success: successCount, failed: failedCount };

  } catch (error) {
    logger.error('Error syncing offline operations:', error);
    return { success: 0, failed: 0 };
  }
};

/**
 * Sync individual operation
 * @param {Object} supabase - Supabase client
 * @param {Object} operation - Operation to sync
 */
const syncOperation = async (supabase, operation) => {
  switch (operation.type) {
    case 'scan':
      await syncScanOperation(supabase, operation);
      break;
    case 'cylinder_update':
      await syncCylinderUpdate(supabase, operation);
      break;
    case 'customer_update':
      await syncCustomerUpdate(supabase, operation);
      break;
    case 'rental_update':
      await syncRentalUpdate(supabase, operation);
      break;
    default:
      throw new Error(`Unknown operation type: ${operation.type}`);
  }
};

/**
 * Map action to mode for bottle_scans table compatibility
 * Supports both mobile app actions and web app modes
 * @param {string} action - Action string
 * @returns {string}
 */
const actionToMode = (action) => {
  if (!action) return 'SHIP';
  
  const actionLower = action.toLowerCase();
  
  // Mobile app action mappings
  if (actionLower === 'out' || actionLower === 'ship') return 'SHIP';
  if (actionLower === 'in' || actionLower === 'return') return 'RETURN';
  if (actionLower === 'fill') return 'FILL';
  if (actionLower === 'locate') return 'LOCATE';
  
  // Web app mode mappings
  if (actionLower === 'delivery') return 'SHIP';
  if (actionLower === 'pickup') return 'RETURN';
  if (actionLower === 'audit') return 'AUDIT';
  if (actionLower === 'maintenance') return 'MAINTENANCE';
  
  return action.toUpperCase();
};

/**
 * Sync scan operation
 */
const syncScanOperation = async (supabase, operation) => {
  logger.log('Syncing scan operation:', {
    organizationId: operation.organizationId,
    userId: operation.userId,
    customerId: operation.data.customer_id,
    orderNumber: operation.data.order_number
  });

  const { error } = await supabase
    .from('bottle_scans')
    .insert([{
      organization_id: operation.organizationId || null,
      bottle_barcode: operation.data.barcode_number,
      mode: actionToMode(operation.data.action),
      location: operation.data.location || null,
      user_id: operation.userId || null,
      order_number: operation.data.order_number || null,
      customer_name: operation.data.customer_name || null,
      customer_id: operation.data.customer_id || null,
      product_code: operation.data.product_code || null
    }]);

  if (error) {
    logger.error('Scan sync error:', error);
    throw error;
  }
  
  logger.log('Scan synced successfully');
};

/**
 * Sync cylinder update
 */
const syncCylinderUpdate = async (supabase, operation) => {
  const { error } = await supabase
    .from('bottles')
    .upsert([{
      ...operation.data,
      organization_id: operation.organizationId,
      updated_at: new Date(operation.timestamp).toISOString()
    }]);

  if (error) throw error;
};

/**
 * Sync customer update
 */
const syncCustomerUpdate = async (supabase, operation) => {
  const { error } = await supabase
    .from('customers')
    .upsert([{
      ...operation.data,
      organization_id: operation.organizationId,
      updated_at: new Date(operation.timestamp).toISOString()
    }]);

  if (error) throw error;
};

/**
 * Sync rental update
 */
const syncRentalUpdate = async (supabase, operation) => {
  const { error } = await supabase
    .from('rentals')
    .upsert([{
      ...operation.data,
      organization_id: operation.organizationId,
      updated_at: new Date(operation.timestamp).toISOString()
    }]);

  if (error) throw error;
};

/**
 * Clear synced operations from queue
 */
export const clearSyncedOperations = async () => {
  try {
    const queue = await getOfflineQueue();
    const unsyncedOperations = queue.filter(op => !op.synced);
    
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(unsyncedOperations));
    
    logger.log(`Cleared ${queue.length - unsyncedOperations.length} synced operations`);

  } catch (error) {
    logger.error('Error clearing synced operations:', error);
  }
};

/**
 * Get offline queue statistics
 * @returns {Object}
 */
export const getQueueStats = async () => {
  try {
    const queue = await getOfflineQueue();
    const pending = queue.filter(op => !op.synced).length;
    const synced = queue.filter(op => op.synced).length;

    return {
      total: queue.length,
      pending,
      synced
    };

  } catch (error) {
    logger.error('Error getting queue stats:', error);
    return { total: 0, pending: 0, synced: 0 };
  }
};

/**
 * Clear all cached data (for logout/reset)
 */
export const clearAllData = async () => {
  try {
    const keys = Object.keys(localStorage);
    const relevantKeys = keys.filter(key => 
      key.startsWith(CACHED_DATA_KEY) || 
      key.startsWith(OFFLINE_QUEUE_KEY) ||
      key.startsWith(LAST_SYNC_KEY)
    );

    relevantKeys.forEach(key => localStorage.removeItem(key));
    
    logger.log('Cleared all offline data');

  } catch (error) {
    logger.error('Error clearing offline data:', error);
  }
};

/**
 * Check if data is stale and needs refresh
 * @param {string} organizationId - Organization ID
 * @param {number} maxAge - Maximum age in milliseconds (default 24 hours)
 * @returns {boolean}
 */
export const isDataStale = async (organizationId, maxAge = 24 * 60 * 60 * 1000) => {
  try {
    const cachedData = await getCachedData(organizationId);
    if (!cachedData) return true;

    const age = Date.now() - cachedData.lastSync;
    return age > maxAge;

  } catch (error) {
    logger.error('Error checking data staleness:', error);
    return true;
  }
};

/**
 * Listen for online/offline events
 * @param {Function} onOnline - Callback when online
 * @param {Function} onOffline - Callback when offline
 * @returns {Function} - Cleanup function
 */
export const listenForConnectivity = (onOnline, onOffline) => {
  const handleOnline = () => {
    logger.log('Network status: Online');
    if (onOnline) onOnline();
  };

  const handleOffline = () => {
    logger.log('Network status: Offline');
    if (onOffline) onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

export default {
  isOnline,
  cacheData,
  getCachedData,
  addToOfflineQueue,
  getOfflineQueue,
  syncOfflineOperations,
  clearSyncedOperations,
  getQueueStats,
  clearAllData,
  isDataStale,
  listenForConnectivity
};
