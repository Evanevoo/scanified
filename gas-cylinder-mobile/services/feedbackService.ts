import logger from '../utils/logger';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { customizationService } from './customizationService';
import { soundService } from './soundService';

// Import expo-av for reliable sound playback on both platforms
let Audio: any = null;
try {
  const avModule = require('expo-av');
  Audio = avModule.Audio || null;
  if (Audio) {
    logger.log('🔊 Successfully imported expo-av Audio for audio playback');
    // Sound is accessed via Audio.Sound, not as a separate export
    if (Audio.Sound) {
      logger.log('🔊 Audio.Sound is available');
    } else {
      logger.warn('⚠️ Audio.Sound not available');
    }
  } else {
    logger.warn('⚠️ expo-av Audio not available');
  }
} catch (e) {
  logger.error('❌ Could not import Audio from expo-av:', e);
}

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
    volume: 1.0, // Max volume so scan beep is audible even at device max volume
  };

  private sounds: { [key: string]: any } = {};
  private isInitialized = false;

  /**
   * Initialize the feedback service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize customization service
      await customizationService.initialize();
      
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
   * Note: For iOS, we use expo-av Sound which creates sounds on-demand
   */
  private async preloadSounds() {
    logger.log('🔊 Preloading sound files...');
    
    // For iOS, we don't preload - expo-av Sound creates sounds on-demand
    if (Platform.OS === 'ios' && Audio?.Sound) {
      logger.log('🔊 iOS: Using expo-av Sound (on-demand creation)');
      // Don't initialize soundService on iOS - expo-audio has issues
      return;
    }
    
    // For Android, preload using expo-audio AudioPlayer
    const soundFiles = {
      success: require('../assets/sounds/scan_beep.mp3'), // New scanning beep sound
      error: require('../assets/sounds/scan_error.mp3'),
      duplicate: require('../assets/sounds/scan_duplicate_error.mp3'), // Custom duplicate error sound
      batch_complete: require('../assets/sounds/sync_success.mp3'),
      warning: require('../assets/sounds/scan_error.mp3'),
      info: require('../assets/sounds/button_press.mp3'),
      start_batch: require('../assets/sounds/button_press.mp3'),
      quick_action: require('../assets/sounds/button_press.mp3'),
    };

    let loadedCount = 0;
    try {
      const { AudioPlayer } = require('expo-audio');
      
      for (const [key, source] of Object.entries(soundFiles)) {
        try {
          const player = new AudioPlayer(source);
          player.volume = this.settings.volume;
          this.sounds[key] = player;
          loadedCount++;
          if (key === 'success') {
            logger.log('🔊 Scanner beep sound loaded successfully');
          }
        } catch (error) {
          this.sounds[key] = null;
        }
      }
      
      if (loadedCount > 0) {
        logger.log(`🔊 Loaded ${loadedCount} sound file(s) including scanner beep`);
      } else {
        logger.log('🔊 No MP3 files loaded, will use programmatic sounds');
        await soundService.initialize();
      }
    } catch (error) {
      logger.warn('⚠️ Could not preload sounds, using fallback:', error);
      await soundService.initialize();
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
    logger.log(`🔊 playSound called for type: ${type}, soundEnabled: ${this.settings.soundEnabled}, volume: ${this.settings.volume}`);
    
    if (!this.settings.soundEnabled) {
      logger.log('🔇 Sound disabled in settings');
      return;
    }

    try {
      // Android: Use preloaded sounds from expo-audio AudioPlayer first
      if (Platform.OS === 'android' && this.sounds[type]) {
        try {
          const player = this.sounds[type];
          if (player && typeof player.play === 'function') {
            player.volume = this.settings.volume;
            player.play();
            logger.log(`🔊 Playing preloaded sound on Android: ${type}`);
            return;
          }
        } catch (androidError) {
          logger.warn(`⚠️ Could not play preloaded sound on Android, trying fallback:`, androidError);
          // Continue to expo-av fallback
        }
      }

      // Get the sound file source
      const soundFiles: { [key: string]: any } = {
        success: require('../assets/sounds/scan_beep.mp3'), // New scanning beep sound
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
          // iOS: Use expo-av Sound API (creates on-demand)
          // Android: Fallback if preloaded sounds didn't work
          const Sound = Audio?.Sound;
          logger.log(`🔊 Attempting to play sound: Platform=${Platform.OS}, Audio.Sound available=${!!Sound}, Audio available=${!!Audio}`);
          
          if (Sound) {
            try {
              // Configure audio session first
              if (Audio && Audio.setAudioModeAsync) {
                await Audio.setAudioModeAsync({
                  playsInSilentModeIOS: true,
                  staysActiveInBackground: false,
                  shouldDuckAndroid: true,
                });
                logger.log('🔊 Audio session configured');
              }
              
              // Load and play sound using expo-av Sound
              logger.log(`🔊 Creating sound for type: ${type} with source:`, soundSource);
              
              // Try to create sound - if it fails, we'll catch and fallback
              const { sound } = await Audio.Sound.createAsync(soundSource, {
                shouldPlay: false, // Load first, then play
                volume: this.settings.volume,
                isMuted: false,
              });
              
              logger.log(`🔊 Sound created successfully, playing now...`);
              
              // Set playback status update before playing
              sound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.isLoaded) {
                  if (status.didJustFinish) {
                    sound.unloadAsync().catch(() => {});
                  }
                } else if (status.error) {
                  // Silently handle playback errors - don't log every time
                  logger.debug(`Sound playback error:`, status.error);
                }
              });
              
              // Play the sound
              await sound.playAsync();
              logger.log(`🔊 Playing sound: ${type}`);
              
              // Clean up after sound finishes (approximately 2 seconds for most sounds)
              setTimeout(async () => {
                try {
                  await sound.unloadAsync();
                } catch (e) {
                  // Ignore cleanup errors
                }
              }, 3000);
              
              return;
            } catch (avError: any) {
              // Silently catch expo-av errors and fallback - don't log unless it's unexpected
              const isMediaError = avError?.message?.includes('AVFoundationErrorDomain') || 
                                  avError?.code === -11849 ||
                                  avError?.message?.includes('damaged');
              
              if (!isMediaError) {
                logger.debug(`expo-av error (falling back):`, avError?.message || avError);
              }
              // Continue to fallback
            }
          }
          
          // Fallback: Try expo-audio AudioPlayer only on Android (iOS has issues with expo-audio)
          if (Platform.OS === 'android') {
            try {
              const audioModule = require('expo-audio');
              const AudioPlayer = audioModule.AudioPlayer || audioModule.default?.AudioPlayer;
              
              if (!AudioPlayer) {
                throw new Error('AudioPlayer not found in expo-audio module');
              }
              
              // Configure audio session for Android
              if (Audio && Audio.setAudioModeAsync) {
                await Audio.setAudioModeAsync({
                  playsInSilentModeIOS: true,
                  staysActiveInBackground: false,
                  shouldDuckAndroid: true,
                });
              }
              
              const player = new AudioPlayer(soundSource);
              player.volume = this.settings.volume;
              player.play();
              logger.log(`🔊 Playing sound for type: ${type} on Android using expo-audio, volume: ${this.settings.volume}`);
              
              setTimeout(() => {
                try {
                  player.remove();
                } catch (e) {
                  // Ignore cleanup errors
                }
            }, 5000);
            
            return;
          } catch (audioError) {
            logger.error(`❌ Error playing sound with expo-audio:`, audioError);
            // Continue to next fallback
          }
        } else {
          logger.warn('⚠️ Skipping expo-audio fallback on iOS (use expo-av instead)');
        }
        } catch (playError) {
          logger.warn(`⚠️ Error creating/playing sound ${type}:`, playError);
          // Continue to fallback
        }
      }

      // Fallback 1: Try soundService (has programmatic beep sounds) - Android only
      if (Platform.OS === 'android') {
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

        // Fallback 2: Try customization service (Android only)
        try {
          await customizationService.playCustomSound(soundServiceType);
          return;
        } catch (customError) {
          // Continue to haptic-only fallback
        }
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
          try {
            // Handle expo-av Sound (has unloadAsync)
            if (sound.unloadAsync) {
              await sound.unloadAsync();
            } 
            // Handle expo-audio AudioPlayer (has remove)
            else if (sound.remove) {
              sound.remove();
            }
          } catch (e) {
            // Ignore cleanup errors
          }
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
