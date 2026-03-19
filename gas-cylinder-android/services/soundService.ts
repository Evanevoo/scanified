import logger from '../utils/logger';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import AudioPlayer - same approach as feedbackService.ts
// In Expo Go, this may not be available, so we'll handle errors gracefully
// expo-audio SDK 53+ uses createAudioPlayer() instead of AudioPlayer class
let createAudioPlayer: any = null;
let setAudioModeAsync: any = null;

try {
  // Use the new expo-audio API (SDK 53+)
  const audioModule = require('expo-audio');
  createAudioPlayer = audioModule.createAudioPlayer;
  setAudioModeAsync = audioModule.setAudioModeAsync;
  
  console.log('🔊 [SoundService] expo-audio module loaded');
  console.log('🔊 [SoundService] Available exports:', Object.keys(audioModule).join(', '));
  
  if (!createAudioPlayer) {
    console.warn('⚠️ [SoundService] createAudioPlayer not found in expo-audio module');
    logger.warn('⚠️ createAudioPlayer not found in expo-audio module');
    logger.log('🔊 Available exports:', Object.keys(audioModule).join(', '));
  } else {
    console.log('✅ [SoundService] createAudioPlayer loaded from expo-audio');
    logger.log('✅ createAudioPlayer loaded from expo-audio');
  }
} catch (error: any) {
  console.warn('⚠️ [SoundService] Could not import expo-audio - sounds will use haptic feedback only:', error);
  logger.warn('⚠️ Could not import expo-audio - sounds will use haptic feedback only:', error?.message || error);
}

export interface SoundSettings {
  soundEnabled: boolean;
  hapticFeedback: boolean;
}

class SoundService {
  private static instance: SoundService;
  private soundCache: Map<string, any> = new Map(); // Changed from AudioPlayer to any since it's now a player object
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
      console.log('🔊 [SoundService] Initializing...');
      logger.log('🔊 [SoundService] Initializing...');
      
      // Configure audio mode for Android (required for sound playback)
      if (setAudioModeAsync) {
        try {
          await setAudioModeAsync({
            playsInSilentMode: true,
            interruptionMode: 'mixWithOthers',
            interruptionModeAndroid: 'duckOthers',
            shouldPlayInBackground: false,
          });
          console.log('🔊 [SoundService] Audio mode configured for Android');
          logger.log('🔊 Audio mode configured for Android in SoundService');
        } catch (audioModeError) {
          console.warn('⚠️ [SoundService] Could not configure audio mode:', audioModeError);
          logger.warn('⚠️ Could not configure audio mode:', audioModeError);
          // Continue anyway - might work without it
        }
      } else {
        console.warn('⚠️ [SoundService] setAudioModeAsync not available - audio mode not configured');
        logger.warn('⚠️ setAudioModeAsync not available - audio mode not configured');
      }
      
      await this.loadSettings();
      console.log('🔊 [SoundService] Settings loaded, preloading sounds...');
      await this.preloadSounds();
      console.log('🔊 [SoundService] Initialization complete');
      logger.log('🔊 SoundService initialized on Android');
    } catch (error) {
      console.error('❌ [SoundService] Failed to initialize:', error);
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
      console.log('🔊 [SoundService] Starting preloadSounds...');
      console.log('🔊 [SoundService] createAudioPlayer available?', !!createAudioPlayer);
      
      // Skip sound loading if createAudioPlayer is not available (e.g., Expo Go)
      if (!createAudioPlayer) {
        console.warn('⚠️ [SoundService] createAudioPlayer not available - skipping sound preload. Will use haptic feedback only.');
        logger.warn('⚠️ createAudioPlayer not available - skipping sound preload. Will use haptic feedback only.');
        return;
      }
      
      // Load only the sound files that actually exist in assets/sounds folder
      // Available: button_press.mp3, scan_error.mp3, scan_beep.mp3
      const soundFiles: Record<string, any> = {};
      
      // Try to load each sound file, but continue if any fail
      const soundsToLoad = [
        { id: 'scan_error', path: '../assets/sounds/scan_error.mp3' },
        { id: 'action', path: '../assets/sounds/button_press.mp3' },
        { id: 'scan_success', path: '../assets/sounds/scan_beep.mp3' }, // New scanning sound
        { id: 'scan_duplicate', path: '../assets/sounds/scan_error.mp3' },
        { id: 'notification', path: '../assets/sounds/button_press.mp3' },
      ];

      console.log('🔊 [SoundService] Preloading sounds on Android...');
      logger.log('🔊 Preloading sounds on Android...');
      let loadedCount = 0;
      let failedCount = 0;

      for (const { id, path } of soundsToLoad) {
        try {
          console.log(`🔊 [SoundService] Attempting to load sound: ${id} from ${path}`);
          logger.log(`🔊 Attempting to load sound: ${id} from ${path}`);
          
          // Check if createAudioPlayer is available
          if (!createAudioPlayer) {
            console.warn(`⚠️ [SoundService] createAudioPlayer not available, skipping sound: ${id}`);
            logger.warn(`⚠️ createAudioPlayer not available, skipping sound: ${id}`);
            failedCount++;
            continue;
          }
          
          const source = require('../assets/sounds/scan_error.mp3'); // Default fallback
          let audioSource: any;
          
          // Try to load the specific file - use require() directly for Android reliability
          try {
            if (path.includes('button_press')) {
              audioSource = require('../assets/sounds/button_press.mp3');
            } else if (path.includes('scan_beep')) {
              audioSource = require('../assets/sounds/scan_beep.mp3');
            } else {
              audioSource = require('../assets/sounds/scan_error.mp3');
            }
          } catch (reqError) {
            console.warn(`⚠️ [SoundService] Could not require ${path}, using fallback`);
            logger.warn(`⚠️ Could not require ${path}, using fallback`);
            audioSource = source;
          }
          
          // On Android: use require() directly - expo-audio's createAudioPlayer handles it
          // (Asset URI approach can fail on some devices)
          try {
            console.log(`🔊 [SoundService] Creating audio player for ${id}...`);
            const player = createAudioPlayer(audioSource);
            
            // Set volume (if supported) - use 1.0 for maximum loudness
            if (player.volume !== undefined) {
              player.volume = 1.0;
            }
            
            this.soundCache.set(id, player);
            loadedCount++;
            console.log(`✅ [SoundService] Successfully loaded sound: ${id}`);
            logger.log(`🔊 Successfully loaded sound: ${id}`);
          } catch (playerError: any) {
            console.error(`❌ [SoundService] Failed to create audio player for ${id}:`, playerError);
            throw new Error(`Failed to create audio player: ${playerError?.message || playerError}`);
          }
        } catch (error: any) {
          failedCount++;
          console.warn(`⚠️ [SoundService] Could not load sound ${id}, will use haptic only:`, error);
          logger.warn(`⚠️ Could not load sound ${id}, will use haptic only:`, error?.message || error);
          // Set null in cache to indicate we tried but failed
          this.soundCache.set(id, null as any);
        }
      }
      
      console.log(`🔊 [SoundService] Sound preload complete: ${loadedCount} loaded, ${failedCount} failed on Android`);
      logger.log(`🔊 Sound preload complete: ${loadedCount} loaded, ${failedCount} failed on Android`);
      
      if (loadedCount === 0) {
        console.warn('⚠️ [SoundService] No sounds were loaded successfully. All sound playback will fall back to haptic feedback.');
        logger.warn('⚠️ No sounds were loaded successfully. All sound playback will fall back to haptic feedback.');
      } else {
        console.log(`✅ [SoundService] Android sound system ready with ${loadedCount} sounds`);
        logger.log(`✅ Android sound system ready with ${loadedCount} sounds`);
      }
    } catch (error: any) {
      console.error('❌ [SoundService] Failed to preload sounds:', error);
      logger.error('❌ Failed to preload sounds:', error?.message || error);
    }
  }

  async playSound(type: 'scan' | 'error' | 'duplicate' | 'notification' | 'action'): Promise<void> {
    try {
      console.log(`🔊 [SoundService] playSound called with type: ${type}`);
      logger.log(`🔊 playSound called with type: ${type}`);
      
      if (this.settings.soundEnabled) {
        const soundId = this.getSoundId(type);
        console.log(`🔊 [SoundService] Mapped to soundId: ${soundId}`);
        logger.log(`🔊 Mapped to soundId: ${soundId}`);
        const sound = this.soundCache.get(soundId);
        
        console.log(`🔊 [SoundService] Sound cache lookup: ${soundId} -> ${sound ? 'found' : 'NOT FOUND'}`);
        console.log(`🔊 [SoundService] Cache size: ${this.soundCache.size}, Keys: ${Array.from(this.soundCache.keys()).join(', ')}`);
        logger.log(`🔊 Sound cache lookup: ${soundId} -> ${sound ? 'found' : 'NOT FOUND'}`);
        logger.log(`🔊 Cache size: ${this.soundCache.size}, Keys: ${Array.from(this.soundCache.keys()).join(', ')}`);
        
        if (sound) {
          try {
            console.log(`🔊 [SoundService] Attempting to play sound: ${soundId}`);
            logger.log(`🔊 Attempting to play sound: ${soundId}`);
            
            // For Android, ensure audio mode is set before playing
            if (setAudioModeAsync) {
              try {
                await setAudioModeAsync({
                  playsInSilentMode: true,
                  interruptionMode: 'mixWithOthers',
                  interruptionModeAndroid: 'duckOthers',
                  shouldPlayInBackground: false,
                });
                console.log('🔊 [SoundService] Audio mode set successfully');
                logger.log('🔊 Audio mode set successfully');
              } catch (audioModeError) {
                console.warn('⚠️ [SoundService] Could not set audio mode before play:', audioModeError);
                logger.warn('⚠️ Could not set audio mode before play:', audioModeError);
              }
            } else {
              console.warn('⚠️ [SoundService] setAudioModeAsync not available');
              logger.warn('⚠️ setAudioModeAsync not available');
            }
            
            // Ensure volume is set to max for scan feedback
            sound.volume = 1.0;
            console.log(`🔊 [SoundService] Volume set to 1.0, calling sound.play()`);
            logger.log(`🔊 Volume set to 0.9, calling sound.play()`);
            
            // On Android, AudioPlayer.play() should automatically reset to beginning
            // No need for seekTo/pause as it causes issues
            sound.play();
            console.log(`✅ [SoundService] Sound played successfully: ${type} (${soundId}) on Android`);
            logger.log(`✅ Sound played successfully: ${type} (${soundId}) on Android`);
            return; // Successfully played, exit early
          } catch (playError: any) {
            console.error(`⚠️ [SoundService] Error playing sound ${type} (${soundId}):`, playError);
            logger.warn(`⚠️ Error playing sound ${type} (${soundId}):`, playError?.message || playError);
            logger.warn(`⚠️ Play error details:`, JSON.stringify(playError, null, 2));
            // Fall through to haptic
          }
        } else {
          console.log(`🔊 [SoundService] Sound not available (${soundId}), using haptic: ${type}`);
          logger.log(`🔊 Sound not available (${soundId}), using haptic: ${type}`);
        }
        
        // Fallback to haptic if sound failed or not available
        console.log(`🔊 [SoundService] Falling back to haptic for: ${type}`);
        await this.playHaptic(type);
      } else {
        console.log(`🔊 [SoundService] Sound disabled, using haptic: ${type}`);
        logger.log(`🔊 Sound disabled, using haptic: ${type}`);
        await this.playHaptic(type);
      }
    } catch (error: any) {
      console.error(`🔊 [SoundService] Sound failed, using haptic: ${type}`, error);
      logger.log(`🔊 Sound failed, using haptic: ${type}`, error?.message || error);
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
        // Cache can hold null when load failed - avoid calling remove() on null (crashes on Android)
        if (sound != null && typeof sound.remove === 'function') {
          sound.remove();
        }
      } catch (error) {
        logger.warn(`Failed to remove sound ${id}:`, error);
      }
    }
    this.soundCache.clear();
  }
}

export const soundService = SoundService.getInstance();
