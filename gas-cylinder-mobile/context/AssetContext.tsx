import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';

interface AssetConfig {
  assetType: string;
  assetTypePlural: string;
  assetDisplayName: string;
  assetDisplayNamePlural: string;
  primaryColor: string;
  secondaryColor: string;
  appName: string;
  customTerminology: Record<string, string>;
  featureToggles: Record<string, boolean>;
}

interface AssetContextType {
  config: AssetConfig;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
}

const defaultConfig: AssetConfig = {
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
    inventory: 'inventory'
  },
  featureToggles: {
    maintenance_alerts: true,
    pressure_tracking: true,
    gas_type_tracking: true
  }
};

const AssetContext = createContext<AssetContextType>({
  config: defaultConfig,
  loading: false,
  error: null,
  refreshConfig: async () => {}
});

interface AssetProviderProps {
  children: ReactNode;
}

export const AssetProvider: React.FC<AssetProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<AssetConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssetConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setConfig(defaultConfig);
        setLoading(false);
        return;
      }

      // Get user profile to find organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.organization_id) {
        throw new Error('Organization not found');
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
        .eq('id', profile.organization_id)
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
  }, []);

  const refreshConfig = async () => {
    await loadAssetConfig();
  };

  return (
    <AssetContext.Provider value={{ config, loading, error, refreshConfig }}>
      {children}
    </AssetContext.Provider>
  );
};

export const useAssetConfig = () => {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error('useAssetConfig must be used within an AssetProvider');
  }
  return context;
}; 