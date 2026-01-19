/**
 * Mobile Utility Functions
 * Helper functions for mobile-specific UI logic
 */

/**
 * Check if device is mobile
 * @param {Object} theme - MUI theme object
 * @returns {boolean}
 */
export const isMobileDevice = (theme) => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${theme.breakpoints.values.sm}px)`).matches;
};

/**
 * Check if device is tablet
 * @param {Object} theme - MUI theme object
 * @returns {boolean}
 */
export const isTabletDevice = (theme) => {
  if (typeof window === 'undefined') return false;
  const sm = theme.breakpoints.values.sm;
  const md = theme.breakpoints.values.md;
  return window.matchMedia(`(min-width: ${sm}px) and (max-width: ${md}px)`).matches;
};

/**
 * Get responsive spacing
 * @param {number|object} spacing - Spacing value or object with breakpoints
 * @param {Object} theme - MUI theme object
 * @returns {number}
 */
export const getResponsiveSpacing = (spacing, theme) => {
  if (typeof spacing === 'object') {
    if (isMobileDevice(theme)) return spacing.xs || spacing.sm || 2;
    if (isTabletDevice(theme)) return spacing.sm || spacing.md || 3;
    return spacing.md || spacing.lg || 4;
  }
  return spacing;
};

/**
 * Get responsive font size
 * @param {object} sizes - Object with breakpoint sizes
 * @param {Object} theme - MUI theme object
 * @returns {string|number}
 */
export const getResponsiveFontSize = (sizes, theme) => {
  if (isMobileDevice(theme)) return sizes.xs || sizes.sm || sizes.base || '1rem';
  if (isTabletDevice(theme)) return sizes.sm || sizes.md || sizes.base || '1rem';
  return sizes.md || sizes.lg || sizes.base || '1rem';
};

/**
 * Check if device supports touch
 * @returns {boolean}
 */
export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Get optimal touch target size (minimum 44x44px for iOS/Android)
 * @param {number} baseSize - Base size in pixels
 * @returns {number}
 */
export const getTouchTargetSize = (baseSize = 44) => {
  return Math.max(baseSize, 44);
};

/**
 * Prevent iOS double-tap zoom
 * @param {HTMLElement} element - Element to apply prevention to
 */
export const preventDoubleTapZoom = (element) => {
  if (!element) return;
  
  let lastTouchEnd = 0;
  element.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
};

/**
 * Get safe area insets for mobile devices (for notched devices)
 * @returns {object}
 */
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };
  
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
  };
};

