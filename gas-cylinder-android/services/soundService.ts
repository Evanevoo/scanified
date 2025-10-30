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
      // Create simple beep sounds programmatically
      await this.createBeepSound('scan_success', 800, 0.1);
      await this.createBeepSound('scan_error', 400, 0.2);
      await this.createBeepSound('notification', 600, 0.15);
      await this.createBeepSound('action', 500, 0.1);
      
      logger.log('🔊 Sounds preloaded successfully');
    } catch (error) {
      logger.error('❌ Failed to preload sounds:', error);
    }
  }

  private async createBeepSound(id: string, frequency: number, duration: number): Promise<void> {
    try {
      // Create a simple beep sound using Web Audio API concepts
      // For React Native, we'll use a simple approach with Audio.Sound
      const soundData = {
        uri: `data:audio/wav;base64,${this.generateBeepWav(frequency, duration)}`
      };
      
      const { sound } = await Audio.Sound.createAsync(soundData, {
        shouldPlay: false,
        isLooping: false,
        volume: 0.5,
      });
      
      this.soundCache.set(id, sound);
    } catch (error) {
      logger.log(`🔊 Could not create beep sound ${id}, will use haptic only`);
    }
  }

  private generateBeepWav(frequency: number, duration: number): string {
    // Simple WAV file generation for beep sounds
    // This is a basic implementation - in production you'd use proper audio files
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // Generate sine wave
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    
    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async playSound(type: 'scan' | 'error' | 'notification' | 'action'): Promise<void> {
    try {
      if (this.settings.soundEnabled) {
        const soundId = this.getSoundId(type);
        const sound = this.soundCache.get(soundId);
        
        if (sound) {
          await sound.replayAsync();
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

  async playHaptic(type: 'scan' | 'error' | 'notification' | 'action'): Promise<void> {
    if (!this.settings.hapticFeedback) return;

    try {
      switch (type) {
        case 'scan':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
