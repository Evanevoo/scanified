import logger from '../utils/logger';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SoundSettings {
  soundEnabled: boolean;
  hapticFeedback: boolean;
}

class SoundService {
  private static instance: SoundService;
  private soundCache: Map<string, Audio.Sound> = new Map();
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
      // Load actual MP3 files from assets
      const soundFiles = {
        scan_success: require('../assets/sounds/scan_success.mp3'),
        scan_error: require('../assets/sounds/scan_error.mp3'),
        scan_duplicate: require('../assets/sounds/scan_duplicate.mp3'),
        notification: require('../assets/sounds/sync_success.mp3'),
        action: require('../assets/sounds/button_press.mp3'),
      };

      for (const [id, source] of Object.entries(soundFiles)) {
        try {
          const { sound } = await Audio.Sound.createAsync(source, {
            shouldPlay: false,
            isLooping: false,
            volume: 0.7,
          });
          
          this.soundCache.set(id, sound);
          logger.log(`🔊 Loaded sound: ${id}`);
        } catch (error) {
          logger.warn(`⚠️ Could not load sound ${id}, will use haptic only:`, error);
        }
      }
      
      logger.log('🔊 Sounds preloaded successfully');
    } catch (error) {
      logger.error('❌ Failed to preload sounds:', error);
    }
  }

  async playSound(type: 'scan' | 'error' | 'duplicate' | 'notification' | 'action'): Promise<void> {
    try {
      if (this.settings.soundEnabled) {
        const soundId = this.getSoundId(type);
        const sound = this.soundCache.get(soundId);
        
        if (sound) {
          // Reset position to start and play
          await sound.setPositionAsync(0);
          await sound.playAsync();
          logger.log(`🔊 Played sound: ${type}`);
        } else {
          logger.log(`🔊 Sound not available, using haptic: ${type}`);
          await this.playHaptic(type);
        }
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
        await sound.unloadAsync();
      } catch (error) {
        logger.warn(`Failed to unload sound ${id}:`, error);
      }
    }
    this.soundCache.clear();
  }
}

export const soundService = SoundService.getInstance();
