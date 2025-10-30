import logger from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export interface CustomSound {
  id: string;
  name: string;
  file: string;
  category: 'scan' | 'notification' | 'action' | 'error';
  enabled: boolean;
}

export interface LayoutOptions {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  buttonSize: 'compact' | 'comfortable' | 'large';
  spacing: 'tight' | 'normal' | 'relaxed';
  showAnimations: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
}

export interface AccessibilityOptions {
  screenReader: boolean;
  voiceOver: boolean;
  largeText: boolean;
  boldText: boolean;
  reduceTransparency: boolean;
  buttonShapes: boolean;
  speakScreen: boolean;
  speakSelection: boolean;
  speakTyping: boolean;
  speakHints: boolean;
  speakScanResults: boolean;
  speakErrors: boolean;
  speakSuccess: boolean;
}

export interface CustomizationSettings {
  sounds: CustomSound[];
  layout: LayoutOptions;
  accessibility: AccessibilityOptions;
  customTheme?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
  };
}

class CustomizationService {
  private static instance: CustomizationService;
  private settings: CustomizationSettings | null = null;
  private soundCache: Map<string, Audio.Sound> = new Map();
  private isInitialized = false;

  static getInstance(): CustomizationService {
    if (!CustomizationService.instance) {
      CustomizationService.instance = new CustomizationService();
    }
    return CustomizationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      await this.preloadSounds();
      this.isInitialized = true;
      logger.log('CustomizationService initialized');
    } catch (error) {
      logger.error('Failed to initialize CustomizationService:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('customization_settings');
      if (stored) {
        this.settings = JSON.parse(stored);
      } else {
        await this.createDefaultSettings();
      }
    } catch (error) {
      logger.error('Failed to load customization settings:', error);
      await this.createDefaultSettings();
    }
  }

  private async createDefaultSettings(): Promise<void> {
    this.settings = {
      sounds: [
        {
          id: 'scan_success_default',
          name: 'Scan Success',
          file: 'scan_success.mp3',
          category: 'scan',
          enabled: true,
        },
        {
          id: 'scan_error_default',
          name: 'Scan Error',
          file: 'scan_error.mp3',
          category: 'error',
          enabled: true,
        },
        {
          id: 'notification_default',
          name: 'Notification',
          file: 'sync_success.mp3',
          category: 'notification',
          enabled: true,
        },
        {
          id: 'action_default',
          name: 'Action',
          file: 'button_press.mp3',
          category: 'action',
          enabled: true,
        },
      ],
      layout: {
        theme: 'auto',
        fontSize: 'medium',
        buttonSize: 'comfortable',
        spacing: 'normal',
        showAnimations: true,
        reduceMotion: false,
        highContrast: false,
      },
      accessibility: {
        screenReader: false,
        voiceOver: false,
        largeText: false,
        boldText: false,
        reduceTransparency: false,
        buttonShapes: false,
        speakScreen: false,
        speakSelection: false,
        speakTyping: false,
        speakHints: false,
        speakScanResults: true,
        speakErrors: true,
        speakSuccess: true,
      },
    };

    await this.saveSettings();
  }

  private async preloadSounds(): Promise<void> {
    if (!this.settings) return;

    logger.log('🔊 Preloading sounds...');
    
    for (const sound of this.settings.sounds) {
      if (sound.enabled) {
        try {
          // Skip preloading for now since we don't have actual sound files
          // In production, you would uncomment the code below and add real MP3 files
          logger.log(`🔊 Sound ${sound.name} configured but not preloaded (placeholder file)`);
          
          /*
          const { sound: audioSound } = await Audio.Sound.createAsync(
            { uri: `asset:///sounds/${sound.file}` },
            { shouldPlay: false, isLooping: false }
          );
          this.soundCache.set(sound.id, audioSound);
          */
        } catch (error) {
          logger.log(`🔊 Sound file ${sound.file} not found, skipping...`);
        }
      }
    }
    
    logger.log('🔊 Sound preloading completed (using haptic feedback)');
  }

  async playCustomSound(category: CustomSound['category'], customSoundId?: string): Promise<void> {
    if (!this.settings) return;

    const sound = this.settings.sounds.find(s => 
      s.category === category && 
      s.enabled && 
      (customSoundId ? s.id === customSoundId : true)
    );

    if (!sound) {
      logger.log(`🔊 No sound configured for category: ${category}`);
      return;
    }

    try {
      const audioSound = this.soundCache.get(sound.id);
      if (audioSound) {
        await audioSound.replayAsync();
        logger.log(`🔊 Played sound: ${sound.name}`);
      } else {
        logger.log(`🔊 Sound ${sound.name} not loaded (using haptic feedback instead)`);
        // Trigger haptic feedback as fallback
        await this.playHapticFeedback(category);
      }
    } catch (error) {
      logger.log(`🔊 Could not play sound ${sound.name}, using haptic feedback instead`);
      await this.playHapticFeedback(category);
    }
  }

  private async playHapticFeedback(category: CustomSound['category']): Promise<void> {
    try {
      switch (category) {
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
    } catch (error) {
      logger.log('🔊 Haptic feedback failed:', error);
    }
  }

  async addCustomSound(sound: Omit<CustomSound, 'id'>): Promise<string> {
    if (!this.settings) throw new Error('CustomizationService not initialized');

    const newSound: CustomSound = {
      ...sound,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.settings.sounds.push(newSound);
    await this.saveSettings();

    // Preload the new sound
    if (newSound.enabled) {
      try {
        const { sound: audioSound } = await Audio.Sound.createAsync(
          { uri: `asset:///sounds/${newSound.file}` },
          { shouldPlay: false, isLooping: false }
        );
        this.soundCache.set(newSound.id, audioSound);
      } catch (error) {
        logger.warn(`Failed to preload new sound ${newSound.name}:`, error);
      }
    }

    return newSound.id;
  }

  async updateCustomSound(soundId: string, updates: Partial<CustomSound>): Promise<void> {
    if (!this.settings) throw new Error('CustomizationService not initialized');

    const soundIndex = this.settings.sounds.findIndex(s => s.id === soundId);
    if (soundIndex === -1) throw new Error('Sound not found');

    this.settings.sounds[soundIndex] = { ...this.settings.sounds[soundIndex], ...updates };
    await this.saveSettings();

    // Update sound cache
    if (updates.enabled === false) {
      const audioSound = this.soundCache.get(soundId);
      if (audioSound) {
        await audioSound.unloadAsync();
        this.soundCache.delete(soundId);
      }
    } else if (updates.enabled === true || updates.file) {
      try {
        const { sound: audioSound } = await Audio.Sound.createAsync(
          { uri: `asset:///sounds/${this.settings.sounds[soundIndex].file}` },
          { shouldPlay: false, isLooping: false }
        );
        this.soundCache.set(soundId, audioSound);
      } catch (error) {
        logger.warn(`Failed to preload updated sound:`, error);
      }
    }
  }

  async removeCustomSound(soundId: string): Promise<void> {
    if (!this.settings) throw new Error('CustomizationService not initialized');

    this.settings.sounds = this.settings.sounds.filter(s => s.id !== soundId);
    await this.saveSettings();

    // Remove from cache
    const audioSound = this.soundCache.get(soundId);
    if (audioSound) {
      await audioSound.unloadAsync();
      this.soundCache.delete(soundId);
    }
  }

  updateLayoutOptions(updates: Partial<LayoutOptions>): void {
    if (!this.settings) throw new Error('CustomizationService not initialized');

    this.settings.layout = { ...this.settings.layout, ...updates };
    this.saveSettings();
  }

  updateAccessibilityOptions(updates: Partial<AccessibilityOptions>): void {
    if (!this.settings) throw new Error('CustomizationService not initialized');

    this.settings.accessibility = { ...this.settings.accessibility, ...updates };
    this.saveSettings();
  }

  updateCustomTheme(theme: CustomizationSettings['customTheme']): void {
    if (!this.settings) throw new Error('CustomizationService not initialized');

    this.settings.customTheme = theme;
    this.saveSettings();
  }

  getSettings(): CustomizationSettings | null {
    return this.settings;
  }

  getLayoutOptions(): LayoutOptions | null {
    return this.settings?.layout || null;
  }

  getAccessibilityOptions(): AccessibilityOptions | null {
    return this.settings?.accessibility || null;
  }

  getCustomSounds(): CustomSound[] {
    return this.settings?.sounds || [];
  }

  getCustomTheme(): CustomizationSettings['customTheme'] | null {
    return this.settings?.customTheme || null;
  }

  // Accessibility helper methods
  async speakText(text: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<void> {
    if (!this.settings?.accessibility.speakScreen) return;

    try {
      // This would integrate with a text-to-speech service
      // For now, we'll use a simple implementation
      logger.log(`Speaking: ${text}`);
    } catch (error) {
      logger.warn('Failed to speak text:', error);
    }
  }

  async speakScanResult(barcode: string, action: string): Promise<void> {
    if (!this.settings?.accessibility.speakScanResults) return;

    const text = `Scanned ${barcode} for ${action}`;
    await this.speakText(text, 'high');
  }

  async speakError(error: string): Promise<void> {
    if (!this.settings?.accessibility.speakErrors) return;

    await this.speakText(`Error: ${error}`, 'high');
  }

  async speakSuccess(message: string): Promise<void> {
    if (!this.settings?.accessibility.speakSuccess) return;

    await this.speakText(`Success: ${message}`, 'normal');
  }

  // Layout helper methods
  getFontSize(): number {
    if (!this.settings?.layout) return 16;

    switch (this.settings.layout.fontSize) {
      case 'small': return 14;
      case 'medium': return 16;
      case 'large': return 18;
      case 'extra-large': return 20;
      default: return 16;
    }
  }

  getButtonSize(): { padding: number; fontSize: number } {
    if (!this.settings?.layout) return { padding: 12, fontSize: 16 };

    switch (this.settings.layout.buttonSize) {
      case 'compact': return { padding: 8, fontSize: 14 };
      case 'comfortable': return { padding: 12, fontSize: 16 };
      case 'large': return { padding: 16, fontSize: 18 };
      default: return { padding: 12, fontSize: 16 };
    }
  }

  getSpacing(): number {
    if (!this.settings?.layout) return 16;

    switch (this.settings.layout.spacing) {
      case 'tight': return 8;
      case 'normal': return 16;
      case 'relaxed': return 24;
      default: return 16;
    }
  }

  shouldShowAnimations(): boolean {
    return this.settings?.layout.showAnimations && !this.settings?.layout.reduceMotion;
  }

  isHighContrast(): boolean {
    return this.settings?.layout.highContrast || false;
  }

  private async saveSettings(): Promise<void> {
    if (!this.settings) return;

    try {
      await AsyncStorage.setItem('customization_settings', JSON.stringify(this.settings));
    } catch (error) {
      logger.error('Failed to save customization settings:', error);
    }
  }

  async resetToDefaults(): Promise<void> {
    this.settings = null;
    this.soundCache.clear();
    await this.createDefaultSettings();
    await this.preloadSounds();
  }

  async cleanup(): Promise<void> {
    // Unload all sounds
    for (const [id, sound] of this.soundCache) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        logger.warn(`Failed to unload sound ${id}:`, error);
      }
    }
    this.soundCache.clear();
    this.isInitialized = false;
  }
}

export const customizationService = CustomizationService.getInstance();
