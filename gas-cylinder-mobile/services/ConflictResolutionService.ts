import logger from '../utils/logger';
import { supabase } from '../supabase';

export type ConflictResolutionStrategy = 'client_wins' | 'server_wins' | 'merge' | 'ask_user';

export interface ConflictItem {
  id: string;
  type: 'bottle' | 'customer' | 'scan' | 'rental';
  localData: any;
  serverData: any;
  localTimestamp: string;
  serverTimestamp: string;
}

export interface ConflictResolution {
  action: 'use_local' | 'use_server' | 'merge' | 'skip';
  mergedData?: any;
}

class ConflictResolutionService {
  private static instance: ConflictResolutionService;
  private defaultStrategy: ConflictResolutionStrategy = 'server_wins';
  
  private constructor() {}
  
  public static getInstance(): ConflictResolutionService {
    if (!ConflictResolutionService.instance) {
      ConflictResolutionService.instance = new ConflictResolutionService();
    }
    return ConflictResolutionService.instance;
  }
  
  /**
   * Set the default conflict resolution strategy
   */
  public setDefaultStrategy(strategy: ConflictResolutionStrategy): void {
    this.defaultStrategy = strategy;
    logger.log(`Conflict resolution strategy set to: ${strategy}`);
  }
  
  /**
   * Resolve a conflict between local and server data
   */
  public async resolveConflict(
    conflict: ConflictItem,
    strategy?: ConflictResolutionStrategy
  ): Promise<ConflictResolution> {
    const resolveStrategy = strategy || this.defaultStrategy;
    
    logger.log(`Resolving conflict for ${conflict.type} with strategy: ${resolveStrategy}`);
    
    switch (resolveStrategy) {
      case 'client_wins':
        return this.resolveClientWins(conflict);
      
      case 'server_wins':
        return this.resolveServerWins(conflict);
      
      case 'merge':
        return this.resolveMerge(conflict);
      
      case 'ask_user':
        // In a real implementation, this would trigger a UI dialog
        // For now, default to server wins
        logger.warn('User prompt not implemented, defaulting to server wins');
        return this.resolveServerWins(conflict);
      
      default:
        return this.resolveServerWins(conflict);
    }
  }
  
  /**
   * Client wins strategy - use local data
   */
  private resolveClientWins(conflict: ConflictItem): ConflictResolution {
    logger.log(`Client wins for ${conflict.type}: Using local data`);
    return {
      action: 'use_local',
      mergedData: conflict.localData
    };
  }
  
  /**
   * Server wins strategy - use server data
   */
  private resolveServerWins(conflict: ConflictItem): ConflictResolution {
    logger.log(`Server wins for ${conflict.type}: Using server data`);
    return {
      action: 'use_server',
      mergedData: conflict.serverData
    };
  }
  
  /**
   * Merge strategy - intelligently merge local and server data
   */
  private resolveMerge(conflict: ConflictItem): ConflictResolution {
    logger.log(`Attempting to merge ${conflict.type} data`);
    
    switch (conflict.type) {
      case 'bottle':
        return this.mergeBottleData(conflict);
      
      case 'customer':
        return this.mergeCustomerData(conflict);
      
      case 'scan':
        return this.mergeScanData(conflict);
      
      case 'rental':
        return this.mergeRentalData(conflict);
      
      default:
        // Default to server wins if merge not implemented
        return this.resolveServerWins(conflict);
    }
  }
  
  /**
   * Merge bottle/cylinder data
   */
  private mergeBottleData(conflict: ConflictItem): ConflictResolution {
    const { localData, serverData } = conflict;
    
    // Use the most recent status
    const localTime = new Date(conflict.localTimestamp).getTime();
    const serverTime = new Date(conflict.serverTimestamp).getTime();
    
    const mergedData = {
      ...serverData,
      // Keep server's core data
      id: serverData.id,
      barcode_number: serverData.barcode_number,
      serial_number: serverData.serial_number,
      
      // Use most recent status
      status: localTime > serverTime ? localData.status : serverData.status,
      location: localTime > serverTime ? localData.location : serverData.location,
      assigned_customer: localTime > serverTime ? localData.assigned_customer : serverData.assigned_customer,
      
      // Merge counts (take the higher value)
      fill_count: Math.max(localData.fill_count || 0, serverData.fill_count || 0),
      
      // Keep most recent timestamps
      updated_at: localTime > serverTime ? localData.updated_at : serverData.updated_at
    };
    
    logger.log('Merged bottle data:', mergedData);
    
    return {
      action: 'merge',
      mergedData
    };
  }
  
  /**
   * Merge customer data
   */
  private mergeCustomerData(conflict: ConflictItem): ConflictResolution {
    const { localData, serverData } = conflict;
    
    // For customers, prefer server data but keep local updates to contact info
    const mergedData = {
      ...serverData,
      // Keep local contact updates if more recent
      phone: localData.phone || serverData.phone,
      email: localData.email || serverData.email,
      address: localData.address || serverData.address,
      
      // Keep server's core identifiers
      id: serverData.id,
      CustomerListID: serverData.CustomerListID,
      name: serverData.name // Server name is authoritative
    };
    
    return {
      action: 'merge',
      mergedData
    };
  }
  
  /**
   * Merge scan data
   */
  private mergeScanData(conflict: ConflictItem): ConflictResolution {
    // For scans, we typically want to keep both (no real conflict)
    // Unless they're duplicate scans
    const { localData, serverData } = conflict;
    
    // Check if it's a duplicate scan (same barcode, same time window)
    const localTime = new Date(localData.timestamp).getTime();
    const serverTime = new Date(serverData.timestamp).getTime();
    const timeDiff = Math.abs(localTime - serverTime);
    
    // If scans are within 5 seconds, consider them duplicates
    if (timeDiff < 5000 && localData.bottle_barcode === serverData.bottle_barcode) {
      logger.log('Duplicate scan detected, using server version');
      return {
        action: 'use_server',
        mergedData: serverData
      };
    }
    
    // Otherwise, keep local scan as a new entry
    return {
      action: 'use_local',
      mergedData: localData
    };
  }
  
  /**
   * Merge rental data
   */
  private mergeRentalData(conflict: ConflictItem): ConflictResolution {
    const { localData, serverData } = conflict;
    
    // For rentals, use most recent state
    const localTime = new Date(conflict.localTimestamp).getTime();
    const serverTime = new Date(conflict.serverTimestamp).getTime();
    
    if (localTime > serverTime) {
      return {
        action: 'use_local',
        mergedData: localData
      };
    } else {
      return {
        action: 'use_server',
        mergedData: serverData
      };
    }
  }
  
  /**
   * Detect conflicts for a batch of items
   */
  public async detectConflicts(
    localItems: any[],
    tableName: string,
    organizationId: string
  ): Promise<ConflictItem[]> {
    const conflicts: ConflictItem[] = [];
    
    for (const localItem of localItems) {
      // Skip items without IDs (new items)
      if (!localItem.id) continue;
      
      // Fetch server version
      const { data: serverItem, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', localItem.id)
        .eq('organization_id', organizationId)
        .single();
      
      if (error) {
        logger.error(`Error fetching server item for conflict detection:`, error);
        continue;
      }
      
      if (serverItem) {
        // Compare timestamps
        const localTime = new Date(localItem.updated_at || localItem.created_at).getTime();
        const serverTime = new Date(serverItem.updated_at || serverItem.created_at).getTime();
        
        // If timestamps differ, we have a potential conflict
        if (localTime !== serverTime) {
          conflicts.push({
            id: localItem.id,
            type: this.getItemType(tableName),
            localData: localItem,
            serverData: serverItem,
            localTimestamp: localItem.updated_at || localItem.created_at,
            serverTimestamp: serverItem.updated_at || serverItem.created_at
          });
        }
      }
    }
    
    logger.log(`Detected ${conflicts.length} conflicts in ${tableName}`);
    return conflicts;
  }
  
  /**
   * Get item type from table name
   */
  private getItemType(tableName: string): ConflictItem['type'] {
    switch (tableName) {
      case 'bottles':
        return 'bottle';
      case 'customers':
        return 'customer';
      case 'bottle_scans':
        return 'scan';
      case 'rentals':
        return 'rental';
      default:
        return 'bottle'; // Default fallback
    }
  }
}

export const conflictResolutionService = ConflictResolutionService.getInstance();
export default conflictResolutionService;
