import logger from '../utils/logger';
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
  orderNumberFormat?: {
    description: string;
    examples: string[];
  };
  barcodeFormat?: {
    description: string;
  };
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
  appName: 'Scanified',
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
  const [lastConfigUpdate, setLastConfigUpdate] = useState<Date | null>(null);

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

      if (profileError || (!profile?.organization_id && !authLoading)) {
        throw new Error('Organization not found');
      }

      // Get organization asset configuration with updated_at timestamp
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
          feature_toggles,
          updated_at
        `)
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        logger.warn('Error loading asset config, using defaults:', orgError);
        setConfig(defaultConfig);
      } else {
        // Check if configuration has changed
        const newConfig = {
          assetType: orgData.asset_type || defaultConfig.assetType,
          assetTypePlural: orgData.asset_type_plural || defaultConfig.assetTypePlural,
          assetDisplayName: orgData.asset_display_name || defaultConfig.assetDisplayName,
          assetDisplayNamePlural: orgData.asset_display_name_plural || defaultConfig.assetDisplayNamePlural,
          primaryColor: orgData.primary_color || '#40B5AD',
          secondaryColor: orgData.secondary_color || '#48C9B0',
          appName: orgData.app_name || defaultConfig.appName,
          customTerminology: orgData.custom_terminology || defaultConfig.customTerminology,
          featureToggles: orgData.feature_toggles || defaultConfig.featureToggles
        };

        // Only update if configuration has actually changed
        const configChanged = JSON.stringify(newConfig) !== JSON.stringify(config);
        if (configChanged) {
          logger.log('Asset configuration updated:', newConfig);
          setConfig(newConfig);
          setLastConfigUpdate(new Date());
        }
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

    // Set up real-time subscription for organization changes
    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) return;

        const channel = supabase
          .channel('organization_config_changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'organizations',
              filter: `id=eq.${profile.organization_id}`
            },
            (payload) => {
              logger.log('Organization configuration changed:', payload);
              // Refresh configuration when organization is updated
              loadAssetConfig();
            }
          )
          .subscribe();

        // Set up polling as backup (every 30 seconds)
        const pollInterval = setInterval(() => {
          loadAssetConfig();
        }, 30000);

        return () => {
          // Cleanup subscription and polling
          supabase.removeChannel(channel);
          clearInterval(pollInterval);
        };
      } catch (error) {
        logger.error('Error setting up subscription:', error);
      }
    };

    const cleanup = setupSubscription();
    return () => {
      if (cleanup) {
        cleanup.then(cleanupFn => cleanupFn?.());
      }
    };
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