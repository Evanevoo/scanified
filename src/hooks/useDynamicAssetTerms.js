import { useAssetConfig } from './useAssetConfig';

/**
 * Hook that provides dynamic asset terminology for dashboard pages
 * This replaces hardcoded "cylinder" references with organization-specific terms
 */
export const useDynamicAssetTerms = () => {
  const { config, loading, error } = useAssetConfig();

  // Dynamic text replacements
  const terms = {
    // Singular forms
    asset: config.assetDisplayName || 'Asset',
    assetLower: (config.assetDisplayName || 'Asset').toLowerCase(),
    
    // Plural forms  
    assets: config.assetDisplayNamePlural || 'Assets',
    assetsLower: (config.assetDisplayNamePlural || 'Assets').toLowerCase(),
    
    // Action terms
    scan: config.customTerminology?.scan || 'scan',
    track: config.customTerminology?.track || 'track',
    manage: config.customTerminology?.manage || 'manage',
    inventory: config.customTerminology?.inventory || 'inventory',
    delivery: config.customTerminology?.delivery || 'delivery',
    
    // Database table name (for queries)
    tableName: 'bottles', // This stays the same for backward compatibility
    
    // UI Labels and Messages
    labels: {
      addNew: `Add New ${config.assetDisplayName || 'Asset'}`,
      editItem: `Edit ${config.assetDisplayName || 'Asset'}`,
      deleteItem: `Delete ${config.assetDisplayName || 'Asset'}`,
      searchPlaceholder: `Search ${config.assetDisplayNamePlural || 'Assets'}...`,
      noItemsFound: `No ${config.assetDisplayNamePlural || 'Assets'} found`,
      totalCount: `Total ${config.assetDisplayNamePlural || 'Assets'}`,
      itemDetails: `${config.assetDisplayName || 'Asset'} Details`,
      itemHistory: `${config.assetDisplayName || 'Asset'} History`,
      assignItem: `Assign ${config.assetDisplayName || 'Asset'}`,
      unassignItem: `Unassign ${config.assetDisplayName || 'Asset'}`,
      scanItem: `Scan ${config.assetDisplayName || 'Asset'}`,
      trackItem: `Track ${config.assetDisplayName || 'Asset'}`,
      manageItems: `Manage ${config.assetDisplayNamePlural || 'Assets'}`,
      itemLocation: `${config.assetDisplayName || 'Asset'} Location`,
      itemStatus: `${config.assetDisplayName || 'Asset'} Status`,
      itemType: `${config.assetDisplayName || 'Asset'} Type`,
      addToInventory: `Add to ${config.customTerminology?.inventory || 'Inventory'}`,
      deliveryManagement: `${config.customTerminology?.delivery || 'Delivery'} Management`,
      scanHistory: `${config.customTerminology?.scan || 'Scan'} History`,
      trackingHistory: `${config.customTerminology?.track || 'Tracking'} History`,
    },

    // Page titles
    pageTitles: {
      itemManagement: `${config.assetDisplayName || 'Asset'} Management`,
      itemList: `${config.assetDisplayNamePlural || 'Assets'} List`,
      addItem: `Add ${config.assetDisplayName || 'Asset'}`,
      editItem: `Edit ${config.assetDisplayName || 'Asset'}`,
      itemDetails: `${config.assetDisplayName || 'Asset'} Details`,
      scanItems: `Scan ${config.assetDisplayNamePlural || 'Assets'}`,
      trackItems: `Track ${config.assetDisplayNamePlural || 'Assets'}`,
      itemInventory: `${config.assetDisplayName || 'Asset'} ${config.customTerminology?.inventory || 'Inventory'}`,
    },

    // Descriptions and help text
    descriptions: {
      platformDescription: `Track, manage, and optimize your ${config.assetDisplayNamePlural?.toLowerCase() || 'asset'} operations`,
      mobileAppDescription: `Scan ${config.assetDisplayNamePlural?.toLowerCase() || 'assets'} with any smartphone`,
      dashboardDescription: `Comprehensive ${config.assetDisplayName?.toLowerCase() || 'asset'} management dashboard`,
      analyticsDescription: `${config.assetDisplayName || 'Asset'} analytics and reporting`,
      customerPortalDescription: `Customer access to ${config.assetDisplayName?.toLowerCase() || 'asset'} information`,
    },

    // Feature descriptions
    features: {
      realTimeTracking: `Real-time ${config.assetDisplayName?.toLowerCase() || 'asset'} tracking`,
      inventoryManagement: `${config.assetDisplayName || 'Asset'} ${config.customTerminology?.inventory || 'inventory'} management`,
      deliveryTracking: `${config.assetDisplayName || 'Asset'} ${config.customTerminology?.delivery || 'delivery'} tracking`,
      maintenanceAlerts: `${config.assetDisplayName || 'Asset'} maintenance alerts`,
      locationTracking: `${config.assetDisplayName || 'Asset'} location tracking`,
      statusUpdates: `${config.assetDisplayName || 'Asset'} status updates`,
      barcodeScanning: `${config.assetDisplayName || 'Asset'} barcode scanning`,
    },

    // Branding
    branding: {
      primaryColor: config.primaryColor || '#2563eb',
      secondaryColor: config.secondaryColor || '#1e40af',
      appName: config.appName || 'LessAnnoyingScan',
    }
  };

  return {
    terms,
    config,
    loading,
    error,
    isReady: !loading && !error
  };
}; 