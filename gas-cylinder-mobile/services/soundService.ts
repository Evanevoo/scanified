import logger from '../utils/logger';
import { AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';

// Try to import Audio for iOS audio session configuration from expo-av
let Audio: any = null;
try {
  // Try expo-av first (has Audio.setAudioModeAsync)
  const avModule = require('expo-av');
  Audio = avModule.Audio || null;
  if (Audio) {
    logger.log('🔊 Using expo-av Audio for iOS audio session configuration');
  }
} catch (e) {
  // Fallback: try expo-audio
  try {
    const audioModule = require('expo-audio');
    Audio = audioModule.Audio || audioModule.default?.Audio || null;
  } catch (e2) {
    logger.warn('⚠️ Could not import Audio from expo-av or expo-audio');
  }
}

export interface SoundSettings {
  soundEnabled: boolean;
  hapticFeedback: boolean;
}

class SoundService {
  private static instance: SoundService;
  private soundCache: Map<string, AudioPlayer> = new Map();
  private settings: SoundSettings = {
    soundEnabled: true,
    hapticFeedback: true,
  };

  static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Configure audio session for iOS to ensure sounds play even in silent mode
      if (Platform.OS === 'ios' && Audio && Audio.setAudioModeAsync) {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
          logger.log('🔊 iOS audio session configured for playback');
        } catch (audioError) {
          logger.warn('⚠️ Could not configure iOS audio session:', audioError);
        }
      } else if (Platform.OS === 'ios') {
        logger.warn('⚠️ Audio API not available for iOS audio session configuration');
      }
      
      await this.loadSettings();
      await this.preloadSounds();
      logger.log('🔊 SoundService initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize SoundService:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('sound_settings');
      if (stored) {
        this.settings = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('❌ Failed to load sound settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('sound_settings', JSON.stringify(this.settings));
    } catch (error) {
      logger.error('❌ Failed to save sound settings:', error);
    }
  }

  private async preloadSounds(): Promise<void> {
    try {
      // Load only the sound files that actually exist in assets/sounds folder
      // Available: button_press.mp3, scan_error.mp3, scan_beep.mp3
      const soundsToLoad = [
        { id: 'scan_error', path: '../assets/sounds/scan_error.mp3' },
        { id: 'action', path: '../assets/sounds/button_press.mp3' },
        { id: 'scan_success', path: '../assets/sounds/scan_beep.mp3' }, // New scanning sound
        { id: 'scan_duplicate', path: '../assets/sounds/scan_error.mp3' },
        { id: 'notification', path: '../assets/sounds/button_press.mp3' },
      ];

      logger.log(`🔊 Preloading sounds on ${Platform.OS}...`);
      let loadedCount = 0;
      let failedCount = 0;

      for (const { id, path } of soundsToLoad) {
        try {
          logger.log(`🔊 Attempting to load sound: ${id} from ${path}`);
          
          // Load the appropriate sound file
          let source;
          try {
            if (path.includes('button_press')) {
              source = require('../assets/sounds/button_press.mp3');
            } else if (path.includes('scan_beep')) {
              source = require('../assets/sounds/scan_beep.mp3');
            } else {
              source = require('../assets/sounds/scan_error.mp3');
            }
          } catch (reqError) {
            logger.warn(`⚠️ Could not require ${path}, skipping`);
            continue;
          }
          
          // On iOS, try using Asset.fromModule to get proper URI
          let audioSource = source;
          if (Platform.OS === 'ios') {
            try {
              const asset = Asset.fromModule(source);
              await asset.downloadAsync();
              audioSource = asset.localUri || asset.uri;
              logger.log(`🔊 iOS: Using asset URI for ${id}: ${audioSource}`);
            } catch (assetError: any) {
              logger.warn(`⚠️ Could not get asset URI for ${id}, using require() directly:`, assetError?.message);
              // Fall back to using require() directly
            }
          }
          
          const sound = new AudioPlayer(audioSource);
          sound.volume = 0.8;
          
          this.soundCache.set(id, sound);
          loadedCount++;
          logger.log(`🔊 Successfully loaded sound: ${id}`);
        } catch (error: any) {
          failedCount++;
          logger.warn(`⚠️ Could not load sound ${id}, will use haptic only:`, error?.message || error);
          // Set null in cache to indicate we tried but failed
          this.soundCache.set(id, null as any);
        }
      }
      
      logger.log(`🔊 Sound preload complete: ${loadedCount} loaded, ${failedCount} failed on ${Platform.OS}`);
      
      if (loadedCount === 0) {
        logger.warn('⚠️ No sounds were loaded successfully. All sound playback will fall back to haptic feedback.');
      } else {
        logger.log(`✅ ${Platform.OS} sound system ready with ${loadedCount} sounds`);
      }
    } catch (error: any) {
      logger.error('❌ Failed to preload sounds:', error?.message || error);
    }
  }

  async playSound(type: 'scan' | 'error' | 'duplicate' | 'notification' | 'action'): Promise<void> {
    try {
      if (this.settings.soundEnabled) {
        // Ensure audio session is configured on iOS before playing
        if (Platform.OS === 'ios' && Audio && Audio.setAudioModeAsync) {
          try {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: false,
              shouldDuckAndroid: true,
            });
          } catch (audioError) {
            logger.warn('⚠️ Could not configure audio session before play:', audioError);
          }
        }
        
        const soundId = this.getSoundId(type);
        const sound = this.soundCache.get(soundId);
        
        if (sound) {
          try {
            // For iOS, ensure the player is ready before playing
            if (Platform.OS === 'ios') {
              // Small delay to ensure player is initialized
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Play the sound (expo-audio AudioPlayer automatically resets to start)
            sound.play();
            logger.log(`🔊 Played sound: ${type} (${soundId}) on ${Platform.OS}`);
            return; // Successfully played, exit early
          } catch (playError: any) {
            logger.warn(`⚠️ Error playing sound ${type} (${soundId}):`, playError?.message || playError);
            // Fall through to haptic
          }
        } else {
          logger.log(`🔊 Sound not available (${soundId}), using haptic: ${type}`);
        }
        
        // Fallback to haptic if sound failed or not available
        await this.playHaptic(type);
      } else {
        logger.log(`🔊 Sound disabled, using haptic: ${type}`);
        await this.playHaptic(type);
      }
    } catch (error) {
      logger.log(`🔊 Sound failed, using haptic: ${type}`, error);
      await this.playHaptic(type);
    }
  }

  async playHaptic(type: 'scan' | 'error' | 'duplicate' | 'notification' | 'action'): Promise<void> {
    if (!this.settings.hapticFeedback) return;

    try {
      switch (type) {
        case 'scan':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'duplicate':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'notification':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'action':
          await Haptics.selectionAsync();
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      logger.log(`📳 Played haptic: ${type}`);
    } catch (error) {
      logger.log('📳 Haptic feedback failed:', error);
    }
  }

  private getSoundId(type: string): string {
    switch (type) {
      case 'scan': return 'scan_success';
      case 'error': return 'scan_error';
      case 'duplicate': return 'scan_duplicate';
      case 'notification': return 'notification';
      case 'action': return 'action';
      default: return 'action';
    }
  }

  async updateSettings(updates: Partial<SoundSettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
    await this.saveSettings();
    logger.log('🔊 Sound settings updated:', this.settings);
  }

  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  async cleanup(): Promise<void> {
    for (const [id, sound] of this.soundCache) {
      try {
        sound.remove();
      } catch (error) {
        logger.warn(`Failed to remove sound ${id}:`, error);
      }
    }
    this.soundCache.clear();
  }
}

export const soundService = SoundService.getInstance();
