import logger from '../utils/logger';
import { AudioPlayer, setAudioModeAsync } from 'expo-audio';
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
  | 'batch_progress'   // Batch scanning progress (light haptic)
  | 'low_confidence'   // Low confidence scan detected
  | 'multi_barcode'    // Multiple barcodes detected
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
      
      // Configure audio mode for Android (required for sound playback)
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers',
        });
        logger.log('🔊 Audio mode configured for Android');
      } catch (audioModeError) {
        logger.warn('⚠️ Could not configure audio mode:', audioModeError);
        // Continue anyway - might work without it
      }

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
      success: require('../assets/sounds/scan_beep.mp3'), // New scanning beep sound
      error: require('../assets/sounds/scan_error.mp3'),
      duplicate: require('../assets/sounds/scan_duplicate_error.mp3'), // Custom duplicate error sound
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
        case 'batch_progress':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'low_confidence':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'multi_barcode':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

    // Ensure service is initialized
    if (!this.isInitialized) {
      logger.log('🔊 FeedbackService not initialized, initializing now...');
      await this.initialize();
    }

    // Ensure audio mode is configured (Android requirement)
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
      });
    } catch (audioModeError) {
      logger.debug('⚠️ Could not reconfigure audio mode (may already be set):', audioModeError);
    }

    try {
      // On Android, use soundService for duplicate and batch_complete so these reliably play
      // (expo-audio preload/fallback can be unreliable on some devices)
      if (Platform.OS === 'android' && (type === 'duplicate' || type === 'batch_complete')) {
        try {
          await soundService.initialize();
          await soundService.playSound(type === 'duplicate' ? 'duplicate' : 'notification');
          return;
        } catch (androidSoundErr) {
          logger.warn('🔊 Android soundService for duplicate/batch_complete failed, trying default path:', androidSoundErr);
        }
      }

      // First, try to use preloaded sound (more reliable on Android)
      const preloadedPlayer = this.sounds[type];
      if (preloadedPlayer) {
        try {
          logger.log(`🔊 Attempting to play preloaded sound for type: ${type}, volume: ${this.settings.volume}`);
          // Reset and play the preloaded sound
          // On Android, we need to seek to start before playing
          preloadedPlayer.volume = this.settings.volume;
          try {
            // Stop any current playback first (Android requirement)
            try {
              preloadedPlayer.pause();
            } catch (pauseError) {
              // Ignore pause errors
            }
            // Reset playback position to start (required on Android)
            preloadedPlayer.seekTo(0);
            logger.log(`🔊 Reset playback position to 0`);
          } catch (seekError) {
            // seekTo might not be available, continue anyway
            logger.debug('seekTo not available, continuing');
          }
          preloadedPlayer.play();
          logger.log(`🔊 Called play() on preloaded sound for type: ${type}`);
          // Give it a moment to start
          await new Promise(resolve => setTimeout(resolve, 100));
          logger.log(`🔊 Preloaded sound should be playing now for type: ${type}`);
          return;
        } catch (preloadError) {
          logger.warn(`⚠️ Error playing preloaded sound ${type}:`, preloadError);
          logger.warn(`⚠️ Preload error details:`, JSON.stringify(preloadError));
          // Continue to fallback
        }
      } else {
        logger.log(`⚠️ No preloaded player found for type: ${type}`);
      }

      // Fallback: Get the sound file source and create new player
      const soundFiles: { [key: string]: any } = {
        success: require('../assets/sounds/scan_beep.mp3'),
        error: require('../assets/sounds/scan_error.mp3'),
        duplicate: require('../assets/sounds/scan_duplicate_error.mp3'), // Custom duplicate error sound
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
          logger.log(`🔊 Creating new AudioPlayer for fallback sound type: ${type}`);
          // Create a new player instance as fallback
          const player = new AudioPlayer(soundSource);
          player.volume = this.settings.volume;
          logger.log(`🔊 Set volume to ${this.settings.volume}`);
          try {
            // Reset playback position to start (required on Android)
            player.seekTo(0);
            logger.log(`🔊 Reset playback position to 0 in fallback`);
          } catch (seekError) {
            // seekTo might not be available, continue anyway
            logger.debug('seekTo not available in fallback, continuing');
          }
          player.play();
          logger.log(`🔊 Called play() on fallback sound for type: ${type}`);
          // Give it a moment to start
          await new Promise(resolve => setTimeout(resolve, 100));
          logger.log(`🔊 Fallback sound should be playing now for type: ${type}`);
          
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
          logger.warn(`⚠️ Play error details:`, JSON.stringify(playError));
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
        logger.log(`🔊 Trying soundService fallback for type: ${type} -> ${soundServiceType}`);
        // Ensure soundService is initialized
        try {
          await soundService.initialize();
        } catch (initError) {
          logger.warn(`⚠️ Could not initialize soundService:`, initError);
        }
        await soundService.playSound(soundServiceType);
        logger.log(`🔊 soundService played sound successfully`);
        return;
      } catch (soundServiceError) {
        logger.warn(`⚠️ soundService fallback failed:`, soundServiceError);
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

    // Play sound effect (including duplicate scans)
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
        
        case 'batch_progress':
          voiceMessage = count ? `${count} items scanned` : 'Progress';
          break;
        
        case 'low_confidence':
          voiceMessage = 'Low confidence scan';
          break;
        
        case 'multi_barcode':
          voiceMessage = `${count || 2} barcodes detected`;
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

  async batchProgress(count?: number) {
    await this.provideFeedback('batch_progress', { count });
  }

  async lowConfidence() {
    await this.provideFeedback('low_confidence');
  }

  async multiBarcodeDetected(count: number) {
    await this.provideFeedback('multi_barcode', { count });
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
