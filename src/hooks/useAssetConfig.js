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
  appName: 'LessAnnoyingScan',
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

      // Get organization asset configuration
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select(`
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
        console.warn('Error loading asset config, using defaults:', orgError);
        setConfig(defaultConfig);
      } else {
        setConfig({
          assetType: orgData.asset_type || defaultConfig.assetType,
          assetTypePlural: orgData.asset_type_plural || defaultConfig.assetTypePlural,
          assetDisplayName: orgData.asset_display_name || defaultConfig.assetDisplayName,
          assetDisplayNamePlural: orgData.asset_display_name_plural || defaultConfig.assetDisplayNamePlural,
          primaryColor: orgData.primary_color || defaultConfig.primaryColor,
          secondaryColor: orgData.secondary_color || defaultConfig.secondaryColor,
          appName: orgData.app_name || defaultConfig.appName,
          customTerminology: orgData.custom_terminology || defaultConfig.customTerminology,
          featureToggles: orgData.feature_toggles || defaultConfig.featureToggles
        });
      }
    } catch (err) {
      console.error('Error loading asset config:', err);
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