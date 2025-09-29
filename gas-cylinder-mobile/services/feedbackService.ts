import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { customizationService } from './customizationService';

/**
 * Feedback Service - Provides audio and haptic feedback for user interactions
 * Supports voice confirmations, sound effects, and vibration patterns
 */

export type FeedbackType = 
  | 'success'           // Successful scan
  | 'error'            // Error/failed scan
  | 'duplicate'        // Duplicate scan detected
  | 'batch_complete'   // Batch scanning complete
  | 'warning'          // Warning notification
  | 'info'            // Information notification
  | 'start_batch'      // Starting batch mode
  | 'quick_action';    // Quick action performed

export interface FeedbackSettings {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  voiceEnabled: boolean;
  volume: number; // 0.0 to 1.0
}

class FeedbackService {
  private settings: FeedbackSettings = {
    soundEnabled: true,
    hapticEnabled: true,
    voiceEnabled: true,
    volume: 0.8,
  };

  private sounds: { [key: string]: Audio.Sound | null } = {};
  private isInitialized = false;

  /**
   * Initialize the feedback service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize customization service
      await customizationService.initialize();
      
      // Configure audio session for mixing with other audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        // iOS-specific audio configuration
      });

      // Preload sound effects
      await this.preloadSounds();
      
      this.isInitialized = true;
      console.log('🔊 FeedbackService initialized with customization support');
    } catch (error) {
      console.error('❌ Failed to initialize FeedbackService:', error);
    }
  }

  /**
   * Preload sound effects for better performance
   */
  private async preloadSounds() {
    // For now, we'll skip preloading actual sound files
    // In production, you would add actual sound files to assets/sounds/
    // and uncomment the code below
    
    console.log('🔊 Sound preloading skipped - using system sounds');
    
    // TODO: Add actual sound files to assets/sounds/ and uncomment this:
    /*
    const soundFiles = {
      success: require('../assets/sounds/success.mp3'),
      error: require('../assets/sounds/error.mp3'),
      duplicate: require('../assets/sounds/duplicate.mp3'),
      batch_complete: require('../assets/sounds/batch_complete.mp3'),
      warning: require('../assets/sounds/warning.mp3'),
      info: require('../assets/sounds/info.mp3'),
      beep: require('../assets/sounds/beep.mp3'),
    };

    try {
      for (const [key, source] of Object.entries(soundFiles)) {
        try {
          const { sound } = await Audio.Sound.createAsync(source, {
            shouldPlay: false,
            volume: this.settings.volume,
          });
          this.sounds[key] = sound;
        } catch (error) {
          this.sounds[key] = null;
          console.log(`🔊 Using system sound for ${key} (audio file not found)`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not preload sounds:', error);
    }
    */
  }

  /**
   * Update feedback settings
   */
  updateSettings(newSettings: Partial<FeedbackSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current settings
   */
  getSettings(): FeedbackSettings {
    return { ...this.settings };
  }

  /**
   * Play haptic feedback
   */
  private async playHaptic(type: FeedbackType) {
    if (!this.settings.hapticEnabled) return;

    try {
      switch (type) {
        case 'success':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'duplicate':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'batch_complete':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'start_batch':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'quick_action':
          await Haptics.selectionAsync();
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  /**
   * Play sound effect with customization support
   */
  private async playSound(type: FeedbackType) {
    if (!this.settings.soundEnabled) return;

    try {
      // Try to play custom sound first
      let category: 'scan' | 'notification' | 'action' | 'error' = 'action';
      
      switch (type) {
        case 'success':
        case 'duplicate':
          category = 'scan';
          break;
        case 'error':
          category = 'error';
          break;
        case 'batch_complete':
        case 'warning':
        case 'info':
          category = 'notification';
          break;
        case 'start_batch':
        case 'quick_action':
          category = 'action';
          break;
      }

      await customizationService.playCustomSound(category);
    } catch (error) {
      console.log('🔊 Custom sound not available, using haptic feedback only');
      // Don't call playSystemSound to avoid double haptic feedback
    }
  }

  /**
   * Play system sound as fallback
   */
  private async playSystemSound(type: FeedbackType) {
    // For now, we'll use haptic as audio fallback
    // In a real implementation, you might use platform-specific system sounds
    await this.playHaptic(type);
  }

  /**
   * Speak text using Text-to-Speech with customization support
   */
  private async speakText(text: string, priority: 'low' | 'normal' | 'high' = 'normal') {
    if (!this.settings.voiceEnabled) return;

    try {
      // Use customization service for text-to-speech
      await customizationService.speakText(text, priority);
    } catch (error) {
      console.warn('⚠️ Could not speak text:', error);
    }
  }

  /**
   * Provide comprehensive feedback for different scan results
   */
  async provideFeedback(type: FeedbackType, options?: {
    message?: string;
    count?: number;
    barcode?: string;
  }) {
    const { message, count, barcode } = options || {};

    // Play haptic feedback
    await this.playHaptic(type);

    // Play sound effect
    await this.playSound(type);

    // Provide voice feedback
    if (this.settings.voiceEnabled) {
      let voiceMessage = '';

      switch (type) {
        case 'success':
          voiceMessage = message || `Scanned successfully`;
          if (barcode) voiceMessage += `. Barcode ${barcode}`;
          break;
        
        case 'error':
          voiceMessage = message || 'Scan failed. Please try again';
          break;
        
        case 'duplicate':
          voiceMessage = `Duplicate detected`;
          if (barcode) voiceMessage += `. ${barcode} already scanned`;
          break;
        
        case 'batch_complete':
          voiceMessage = `Batch complete. ${count || 0} items scanned`;
          break;
        
        case 'warning':
          voiceMessage = message || 'Warning';
          break;
        
        case 'info':
          voiceMessage = message || 'Information';
          break;
        
        case 'start_batch':
          voiceMessage = 'Batch mode started. Begin scanning';
          break;
        
        case 'quick_action':
          voiceMessage = message || 'Action performed';
          break;
      }

      if (voiceMessage) {
        await this.speakText(voiceMessage);
      }
    }
  }

  /**
   * Quick feedback methods for common actions
   */
  async scanSuccess(barcode?: string) {
    await this.provideFeedback('success', { barcode });
  }

  async scanError(message?: string) {
    await this.provideFeedback('error', { message });
  }

  async scanDuplicate(barcode?: string) {
    await this.provideFeedback('duplicate', { barcode });
  }

  async batchComplete(count: number) {
    await this.provideFeedback('batch_complete', { count });
  }

  async startBatch() {
    await this.provideFeedback('start_batch');
  }

  async quickAction(message?: string) {
    await this.provideFeedback('quick_action', { message });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      for (const sound of Object.values(this.sounds)) {
        if (sound) {
          await sound.unloadAsync();
        }
      }
      this.sounds = {};
      this.isInitialized = false;
      console.log('🔊 FeedbackService cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up FeedbackService:', error);
    }
  }
}

// Export singleton instance
export const feedbackService = new FeedbackService();
export default feedbackService;
