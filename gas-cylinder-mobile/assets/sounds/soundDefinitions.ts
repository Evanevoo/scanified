// Additional custom sound files for the gas cylinder app
// These would be placed in gas-cylinder-mobile/assets/sounds/

export const CUSTOM_SOUNDS = {
  // Scan sounds
  SCAN_SUCCESS: 'scan_success.mp3',
  SCAN_ERROR: 'scan_error.mp3',
  SCAN_DUPLICATE: 'scan_duplicate.mp3',
  SCAN_BATCH_START: 'batch_start.mp3',
  SCAN_BATCH_COMPLETE: 'batch_complete.mp3',
  
  // Action sounds
  BUTTON_PRESS: 'button_press.mp3',
  SWIPE_ACTION: 'swipe_action.mp3',
  QUICK_ACTION: 'quick_action.mp3',
  
  // Notification sounds
  SYNC_SUCCESS: 'sync_success.mp3',
  SYNC_ERROR: 'sync_error.mp3',
  OFFLINE_MODE: 'offline_mode.mp3',
  ONLINE_MODE: 'online_mode.mp3',
  
  // Field work sounds
  GPS_TAG: 'gps_tag.mp3',
  LOCATION_FOUND: 'location_found.mp3',
  FLASHLIGHT_ON: 'flashlight_on.mp3',
  FLASHLIGHT_OFF: 'flashlight_off.mp3',
  
  // Accessibility sounds
  SCREEN_READER_ON: 'screen_reader_on.mp3',
  SCREEN_READER_OFF: 'screen_reader_off.mp3',
  VOICE_OVER_ON: 'voice_over_on.mp3',
  VOICE_OVER_OFF: 'voice_over_off.mp3',
  
  // Custom brand sounds
  BRAND_SUCCESS: 'brand_success.mp3',
  BRAND_ERROR: 'brand_error.mp3',
  BRAND_NOTIFICATION: 'brand_notification.mp3',
};

// Sound categories for organization
export const SOUND_CATEGORIES = {
  SCAN: ['scan_success.mp3', 'scan_error.mp3', 'scan_duplicate.mp3', 'batch_start.mp3', 'batch_complete.mp3'],
  ACTION: ['button_press.mp3', 'swipe_action.mp3', 'quick_action.mp3'],
  NOTIFICATION: ['sync_success.mp3', 'sync_error.mp3', 'offline_mode.mp3', 'online_mode.mp3'],
  FIELD: ['gps_tag.mp3', 'location_found.mp3', 'flashlight_on.mp3', 'flashlight_off.mp3'],
  ACCESSIBILITY: ['screen_reader_on.mp3', 'screen_reader_off.mp3', 'voice_over_on.mp3', 'voice_over_off.mp3'],
  BRAND: ['brand_success.mp3', 'brand_error.mp3', 'brand_notification.mp3'],
};

// Default sound mappings
export const DEFAULT_SOUND_MAPPINGS = {
  scanSuccess: CUSTOM_SOUNDS.SCAN_SUCCESS,
  scanError: CUSTOM_SOUNDS.SCAN_ERROR,
  scanDuplicate: CUSTOM_SOUNDS.SCAN_DUPLICATE,
  batchStart: CUSTOM_SOUNDS.SCAN_BATCH_START,
  batchComplete: CUSTOM_SOUNDS.SCAN_BATCH_COMPLETE,
  buttonPress: CUSTOM_SOUNDS.BUTTON_PRESS,
  swipeAction: CUSTOM_SOUNDS.SWIPE_ACTION,
  quickAction: CUSTOM_SOUNDS.QUICK_ACTION,
  syncSuccess: CUSTOM_SOUNDS.SYNC_SUCCESS,
  syncError: CUSTOM_SOUNDS.SYNC_ERROR,
  offlineMode: CUSTOM_SOUNDS.OFFLINE_MODE,
  onlineMode: CUSTOM_SOUNDS.ONLINE_MODE,
  gpsTag: CUSTOM_SOUNDS.GPS_TAG,
  locationFound: CUSTOM_SOUNDS.LOCATION_FOUND,
  flashlightOn: CUSTOM_SOUNDS.FLASHLIGHT_ON,
  flashlightOff: CUSTOM_SOUNDS.FLASHLIGHT_OFF,
};
