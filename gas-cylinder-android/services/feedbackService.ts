import logger from '../utils/logger';
import { AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { customizationService } from './customizationService';
import { soundService } from './soundService';

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

  private sounds: { [key: string]: AudioPlayer | null } = {};
  private isInitialized = false;

  /**
   * Initialize the feedback service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize customization service
      await customizationService.initialize();
      
      // Note: expo-audio handles audio session configuration automatically
      // No need to manually configure audio mode

      // Preload sound effects
      await this.preloadSounds();
      
      this.isInitialized = true;
      logger.log('🔊 FeedbackService initialized with customization support');
    } catch (error) {
      logger.error('❌ Failed to initialize FeedbackService:', error);
    }
  }

  /**
   * Preload sound effects for better performance
   */
  private async preloadSounds() {
    logger.log('🔊 Preloading sound files...');
    
    const soundFiles = {
      success: require('../assets/sounds/scan_success.mp3'), // Store scanner beep sound
      error: require('../assets/sounds/scan_error.mp3'),
      duplicate: require('../assets/sounds/scan_duplicate.mp3'), // Duplicate scan sound
      batch_complete: require('../assets/sounds/sync_success.mp3'),
      warning: require('../assets/sounds/scan_error.mp3'), // Use error sound for warnings
      info: require('../assets/sounds/button_press.mp3'),
      start_batch: require('../assets/sounds/button_press.mp3'),
      quick_action: require('../assets/sounds/button_press.mp3'),
    };

    let loadedCount = 0;
    try {
      for (const [key, source] of Object.entries(soundFiles)) {
        try {
          const player = new AudioPlayer(source);
          player.volume = this.settings.volume;
          this.sounds[key] = player;
          loadedCount++;
          if (key === 'success') {
            logger.log('🔊 Scanner beep sound loaded successfully');
          }
          if (key === 'duplicate') {
            logger.log('🔊 Duplicate scan sound loaded successfully');
          }
          if (key === 'batch_complete') {
            logger.log('🔊 Sync completion sound loaded successfully');
          }
        } catch (error) {
          // Silently fail - we'll use fallback sounds
          this.sounds[key] = null;
        }
      }
      
      if (loadedCount > 0) {
        logger.log(`🔊 Loaded ${loadedCount} sound file(s) including scanner beep`);
      } else {
        logger.log('🔊 No MP3 files loaded, will use programmatic sounds');
        // Initialize soundService as fallback
        try {
          await soundService.initialize();
        } catch (error) {
          logger.warn('⚠️ Could not initialize soundService fallback:', error);
        }
      }
    } catch (error) {
      logger.warn('⚠️ Could not preload sounds, using fallback:', error);
      // Initialize soundService as fallback
      try {
        await soundService.initialize();
      } catch (fallbackError) {
        logger.warn('⚠️ Could not initialize soundService fallback:', fallbackError);
      }
    }
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
      logger.warn('Haptic feedback failed:', error);
    }
  }

  /**
   * Play sound effect with customization support
   */
  private async playSound(type: FeedbackType) {
    if (!this.settings.soundEnabled) {
      logger.log('🔇 Sound disabled in settings');
      return;
    }

    try {
      // Get the sound file source
      const soundFiles: { [key: string]: any } = {
        success: require('../assets/sounds/scan_success.mp3'),
        error: require('../assets/sounds/scan_error.mp3'),
        duplicate: require('../assets/sounds/scan_duplicate.mp3'),
        batch_complete: require('../assets/sounds/sync_success.mp3'),
        warning: require('../assets/sounds/scan_error.mp3'),
        info: require('../assets/sounds/button_press.mp3'),
        start_batch: require('../assets/sounds/button_press.mp3'),
        quick_action: require('../assets/sounds/button_press.mp3'),
      };

      const soundSource = soundFiles[type];
      if (!soundSource) {
        logger.log(`⚠️ No sound file found for type: ${type}`);
      } else {
        try {
          // Create a new player instance for each play to ensure it works
          const player = new AudioPlayer(soundSource);
          player.volume = this.settings.volume;
          player.play();
          logger.log(`🔊 Playing sound for type: ${type}`);
          
          // Clean up after sound finishes (approximately)
          setTimeout(() => {
            try {
              player.remove();
            } catch (e) {
              // Ignore cleanup errors
            }
          }, 5000);
          
          return;
        } catch (playError) {
          logger.warn(`⚠️ Error creating/playing sound ${type}:`, playError);
          // Continue to fallback
        }
      }

      // Fallback 1: Try soundService (has programmatic beep sounds)
      let soundServiceType: 'scan' | 'error' | 'duplicate' | 'notification' | 'action' = 'action';
      
      switch (type) {
        case 'success':
          soundServiceType = 'scan';
          break;
        case 'duplicate':
          soundServiceType = 'duplicate';
          break;
        case 'error':
          soundServiceType = 'error';
          break;
        case 'batch_complete':
        case 'warning':
        case 'info':
          soundServiceType = 'notification';
          break;
        case 'start_batch':
        case 'quick_action':
          soundServiceType = 'action';
          break;
      }

      try {
        await soundService.playSound(soundServiceType);
        return;
      } catch (soundServiceError) {
        // Continue to next fallback
      }

      // Fallback 2: Try customization service
      try {
        await customizationService.playCustomSound(soundServiceType);
        return;
      } catch (customError) {
        // Continue to haptic-only fallback
      }
    } catch (error) {
      // Silently fail - haptic feedback will still work
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
      logger.warn('⚠️ Could not speak text:', error);
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
          sound.remove();
        }
      }
      this.sounds = {};
      this.isInitialized = false;
      logger.log('🔊 FeedbackService cleaned up');
    } catch (error) {
      logger.error('❌ Error cleaning up FeedbackService:', error);
    }
  }
}

// Export singleton instance
export const feedbackService = new FeedbackService();
export default feedbackService;
