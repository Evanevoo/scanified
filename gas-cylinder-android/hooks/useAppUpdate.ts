import { useState, useEffect } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../supabase';
import logger from '../utils/logger';

interface AppVersion {
  version: string;
  build_number?: string;
  is_required: boolean;
  release_notes?: string;
  app_store_url?: string;
  play_store_url?: string;
}

export interface UpdateInfo {
  hasUpdate: boolean;
  isRequired: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseNotes?: string;
  updateUrl?: string;
}

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const checkForUpdate = async () => {
    try {
      setChecking(true);
      
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const currentBuild = Platform.OS === 'ios' 
        ? Constants.expoConfig?.ios?.buildNumber 
        : Constants.expoConfig?.android?.versionCode;
      
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      
      logger.log(`Checking for updates - Current: ${currentVersion} (${currentBuild}), Platform: ${platform}`);
      
      // Fetch latest version from Supabase
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('platform', platform)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        logger.error('Error checking for updates:', error);
        return;
      }
      
      if (!data) {
        logger.log('No version data found');
        return;
      }
      
      const latestVersion: AppVersion = data;
      
      // Compare versions (simple string comparison, can be enhanced with semver)
      const needsUpdate = compareVersions(currentVersion, latestVersion.version);
      
      if (needsUpdate) {
        const updateUrl = platform === 'ios' 
          ? latestVersion.app_store_url 
          : latestVersion.play_store_url;
        
        setUpdateInfo({
          hasUpdate: true,
          isRequired: latestVersion.is_required || false,
          latestVersion: latestVersion.version,
          currentVersion: currentVersion,
          releaseNotes: latestVersion.release_notes,
          updateUrl: updateUrl || undefined,
        });
        
        logger.log(`Update available: ${latestVersion.version} (Required: ${latestVersion.is_required})`);
      } else {
        logger.log('App is up to date');
      }
    } catch (error) {
      logger.error('Error in checkForUpdate:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Check for updates when hook is mounted
    checkForUpdate();
    
    // Check again every 24 hours
    const interval = setInterval(() => {
      checkForUpdate();
    }, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const openUpdateUrl = async () => {
    if (!updateInfo?.updateUrl) {
      // Fallback URLs if not set in database
      const fallbackUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/scanified/id6749334978'
        : 'https://play.google.com/store/apps/details?id=com.evanevoo.scanifiedandroid';
      
      const canOpen = await Linking.canOpenURL(fallbackUrl);
      if (canOpen) {
        await Linking.openURL(fallbackUrl);
      } else {
        Alert.alert('Error', 'Unable to open app store. Please update manually.');
      }
      return;
    }
    
    const canOpen = await Linking.canOpenURL(updateInfo.updateUrl);
    if (canOpen) {
      await Linking.openURL(updateInfo.updateUrl);
    } else {
      Alert.alert('Error', 'Unable to open app store. Please update manually.');
    }
  };

  return {
    updateInfo,
    checking,
    checkForUpdate,
    openUpdateUrl,
  };
}

// Simple version comparison (can be enhanced with semver library)
function compareVersions(current: string, latest: string): boolean {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    
    if (latestPart > currentPart) {
      return true;
    } else if (latestPart < currentPart) {
      return false;
    }
  }
  
  return false;
}

