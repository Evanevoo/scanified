import { useMemo } from 'react';
import { useAuth } from './useAuth';

const defaultConfig = {
  assetType: 'cylinder',
  assetTypePlural: 'cylinders',
  assetDisplayName: 'Gas Cylinder',
  assetDisplayNamePlural: 'Gas Cylinders',
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  appName: 'Scanified',
  appIcon: '/landing-icon.png', // Default app icon path
  showAppIcon: true, // Whether to show the icon in the header
  customTerminology: {
    scan: 'scan',
    track: 'track',
    inventory: 'inventory',
    manage: 'manage',
    delivery: 'delivery'
  },
  featureToggles: {
    maintenance_alerts: true,
    pressure_tracking: true,
    gas_type_tracking: true
  }
};

/**
 * Derives asset-branding config from the organization record already loaded by AuthProvider
 * instead of re-querying `organizations` per mounted component (this hook is used by layout
 * components like NavigationBar/Navbar/ProtectedRoute that mount on every page, so an
 * independent fetch here multiplied into a per-page `organizations` fetch storm).
 */
export const useAssetConfig = () => {
  const { organization, reloadOrganization, loading: authLoading } = useAuth();

  const config = useMemo(() => {
    if (!organization) return defaultConfig;
    return {
      assetType: organization.asset_type || defaultConfig.assetType,
      assetTypePlural: organization.asset_type_plural || defaultConfig.assetTypePlural,
      assetDisplayName: organization.asset_display_name || defaultConfig.assetDisplayName,
      assetDisplayNamePlural: organization.asset_display_name_plural || defaultConfig.assetDisplayNamePlural,
      primaryColor: organization.primary_color || '#40B5AD',
      secondaryColor: organization.secondary_color || '#48C9B0',
      appName: organization.app_name || defaultConfig.appName,
      appIcon: defaultConfig.appIcon, // Use default since column doesn't exist
      showAppIcon: defaultConfig.showAppIcon, // Use default since column doesn't exist
      customTerminology: organization.custom_terminology || defaultConfig.customTerminology,
      featureToggles: organization.feature_toggles || defaultConfig.featureToggles,
    };
  }, [organization]);

  const refreshConfig = async () => {
    if (reloadOrganization) await reloadOrganization();
  };

  return { config, loading: !!authLoading, error: null, refreshConfig };
};
