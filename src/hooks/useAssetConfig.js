import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
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

export const useAssetConfig = () => {
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { organization } = useAuth();

  const loadAssetConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!organization?.id) {
        // Use defaults for non-authenticated users or users without organization
        setConfig(defaultConfig);
        return;
      }

      // Get organization asset configuration (only select columns that definitely exist)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          asset_type,
          asset_type_plural,
          asset_display_name,
          asset_display_name_plural,
          primary_color,
          secondary_color,
          app_name,
          custom_terminology,
          feature_toggles
        `)
        .eq('id', organization.id)
        .single();

      if (orgError) {
        logger.warn('Error loading asset config, using defaults:', orgError);
        setConfig(defaultConfig);
      } else {
        setConfig({
          assetType: orgData.asset_type || defaultConfig.assetType,
          assetTypePlural: orgData.asset_type_plural || defaultConfig.assetTypePlural,
          assetDisplayName: orgData.asset_display_name || defaultConfig.assetDisplayName,
          assetDisplayNamePlural: orgData.asset_display_name_plural || defaultConfig.assetDisplayNamePlural,
          primaryColor: orgData.primary_color || '#40B5AD',
          secondaryColor: orgData.secondary_color || '#48C9B0',
          appName: orgData.app_name || defaultConfig.appName,
          appIcon: defaultConfig.appIcon, // Use default since column doesn't exist
          showAppIcon: defaultConfig.showAppIcon, // Use default since column doesn't exist
          customTerminology: orgData.custom_terminology || defaultConfig.customTerminology,
          featureToggles: orgData.feature_toggles || defaultConfig.featureToggles
        });
      }
    } catch (err) {
      logger.error('Error loading asset config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load asset configuration');
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssetConfig();
  }, [organization?.id]);

  const refreshConfig = async () => {
    await loadAssetConfig();
  };

  return { config, loading, error, refreshConfig };
}; 