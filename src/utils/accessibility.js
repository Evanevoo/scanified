/**
 * Accessibility Utilities for WCAG 2.1 AA Compliance
 * Provides ARIA labels, keyboard navigation, and screen reader support
 */

/**
 * ARIA Label Generator
 * Creates appropriate ARIA labels for different UI elements
 */
export const ariaLabels = {
  // Button labels
  button: {
    edit: (item) => `Edit ${item}`,
    delete: (item) => `Delete ${item}`,
    add: (item) => `Add new ${item}`,
    save: () => 'Save changes',
    cancel: () => 'Cancel',
    close: () => 'Close',
    refresh: () => 'Refresh data',
    export: () => 'Export data',
    import: () => 'Import data',
    search: () => 'Search',
    filter: () => 'Filter results',
    sort: (column) => `Sort by ${column}`,
    expand: () => 'Expand',
    collapse: () => 'Collapse',
    view: (item) => `View ${item} details`,
    download: (file) => `Download ${file}`,
    upload: () => 'Upload file'
  },

  // Form labels
  form: {
    required: (field) => `${field} is required`,
    optional: (field) => `${field} is optional`,
    invalid: (field) => `${field} is invalid`,
    valid: (field) => `${field} is valid`,
    loading: () => 'Loading form data',
    submitting: () => 'Submitting form',
    success: () => 'Form submitted successfully',
    error: () => 'Form submission failed'
  },

  // Table labels
  table: {
    header: (column) => `Column header: ${column}`,
    cell: (row, column, value) => `Row ${row}, ${column}: ${value}`,
    sortable: (column) => `Sortable column: ${column}`,
    sorted: (column, direction) => `Sorted by ${column} ${direction}`,
    selectable: (row) => `Selectable row: ${row}`,
    selected: (row) => `Selected row: ${row}`,
    pagination: (page, total) => `Page ${page} of ${total}`,
    loading: () => 'Loading table data',
    empty: () => 'No data available'
  },

  // Navigation labels
  navigation: {
    main: () => 'Main navigation',
    breadcrumb: (item) => `Breadcrumb: ${item}`,
    tab: (tab) => `Tab: ${tab}`,
    activeTab: (tab) => `Active tab: ${tab}`,
    menu: (item) => `Menu item: ${item}`,
    submenu: (item) => `Submenu: ${item}`,
    back: () => 'Go back',
    forward: () => 'Go forward',
    home: () => 'Go to home page'
  },

  // Status labels
  status: {
    loading: () => 'Loading',
    success: () => 'Success',
    error: () => 'Error',
    warning: () => 'Warning',
    info: () => 'Information',
    offline: () => 'Offline',
    online: () => 'Online',
    connected: () => 'Connected',
    disconnected: () => 'Disconnected'
  },

  // Dialog labels
  dialog: {
    open: (title) => `Dialog opened: ${title}`,
    close: (title) => `Dialog closed: ${title}`,
    confirm: () => 'Confirm action',
    cancel: () => 'Cancel action',
    save: () => 'Save changes',
    discard: () => 'Discard changes'
  }
};

/**
 * Keyboard Navigation Utilities
 */
export const keyboardNavigation = {
  // Key codes
  keys: {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown'
  },

  // Keyboard event handlers
  handleKeyDown: (event, handlers) => {
    const { key } = event;
    
    if (handlers[key]) {
      event.preventDefault();
      handlers[key](event);
    }
  },

  // Focus management
  focus: {
    first: (container) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    },
    
    last: (container) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[focusableElements.length - 1].focus();
      }
    },
    
    next: (currentElement) => {
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const currentIndex = Array.from(focusableElements).indexOf(currentElement);
      if (currentIndex < focusableElements.length - 1) {
        focusableElements[currentIndex + 1].focus();
      }
    },
    
    previous: (currentElement) => {
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const currentIndex = Array.from(focusableElements).indexOf(currentElement);
      if (currentIndex > 0) {
        focusableElements[currentIndex - 1].focus();
      }
    }
  },

  // ARIA attributes for keyboard navigation
  ariaAttributes: {
    tabIndex: (indexable) => indexable ? 0 : -1,
    role: (elementType) => {
      const roles = {
        button: 'button',
        link: 'link',
        textbox: 'textbox',
        combobox: 'combobox',
        listbox: 'listbox',
        option: 'option',
        checkbox: 'checkbox',
        radio: 'radio',
        slider: 'slider',
        progressbar: 'progressbar',
        status: 'status',
        alert: 'alert',
        dialog: 'dialog',
        tablist: 'tablist',
        tab: 'tab',
        tabpanel: 'tabpanel',
        menu: 'menu',
        menuitem: 'menuitem',
        tree: 'tree',
        treeitem: 'treeitem',
        grid: 'grid',
        row: 'row',
        cell: 'cell',
        columnheader: 'columnheader',
        rowheader: 'rowheader'
      };
      return roles[elementType] || 'generic';
    }
  }
};

/**
 * Screen Reader Utilities
 */
export const screenReader = {
  // Announcements
  announce: (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  // Screen reader only text
  srOnly: {
    className: 'sr-only',
    style: {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0
    }
  },

  // Skip links
  skipLink: (href, text) => ({
    href,
    text,
    className: 'skip-link',
    style: {
      position: 'absolute',
      top: '-40px',
      left: '6px',
      background: '#000',
      color: '#fff',
      padding: '8px',
      textDecoration: 'none',
      zIndex: 1000,
      '&:focus': {
        top: '6px'
      }
    }
  }),

  // Live regions
  liveRegion: (id, atomic = true) => ({
    id,
    'aria-live': 'polite',
    'aria-atomic': atomic,
    className: 'sr-only'
  })
};

/**
 * Color Contrast Utilities
 */
export const colorContrast = {
  // Calculate contrast ratio
  getContrastRatio: (color1, color2) => {
    const getLuminance = (color) => {
      const rgb = color.match(/\d+/g).map(Number);
      const [r, g, b] = rgb.map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  },

  // Check if contrast meets WCAG AA standards
  meetsWCAGAA: (color1, color2) => {
    const ratio = colorContrast.getContrastRatio(color1, color2);
    return ratio >= 4.5; // WCAG AA standard for normal text
  },

  // Check if contrast meets WCAG AAA standards
  meetsWCAGAAA: (color1, color2) => {
    const ratio = colorContrast.getContrastRatio(color1, color2);
    return ratio >= 7; // WCAG AAA standard for normal text
  }
};

/**
 * Focus Management Utilities
 */
export const focusManagement = {
  // Trap focus within an element
  trapFocus: (element) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);
    
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  },

  // Restore focus to previous element
  restoreFocus: (previousElement) => {
    if (previousElement && typeof previousElement.focus === 'function') {
      previousElement.focus();
    }
  },

  // Save current focus
  saveFocus: () => {
    return document.activeElement;
  }
};

/**
 * Accessibility Testing Utilities
 */
export const accessibilityTesting = {
  // Check for missing alt text
  checkAltText: () => {
    const images = document.querySelectorAll('img');
    const missingAlt = Array.from(images).filter(img => !img.alt);
    return missingAlt;
  },

  // Check for missing form labels
  checkFormLabels: () => {
    const inputs = document.querySelectorAll('input, select, textarea');
    const missingLabels = Array.from(inputs).filter(input => {
      const id = input.id;
      const label = document.querySelector(`label[for="${id}"]`);
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      
      return !label && !ariaLabel && !ariaLabelledBy;
    });
    return missingLabels;
  },

  // Check for proper heading hierarchy
  checkHeadingHierarchy: () => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const hierarchy = Array.from(headings).map(heading => ({
      element: heading,
      level: parseInt(heading.tagName.charAt(1)),
      text: heading.textContent.trim()
    }));
    
    let previousLevel = 0;
    const issues = [];
    
    hierarchy.forEach((heading, index) => {
      if (heading.level > previousLevel + 1) {
        issues.push({
          heading,
          issue: `Heading level ${heading.level} skipped from ${previousLevel}`,
          index
        });
      }
      previousLevel = heading.level;
    });
    
    return issues;
  },

  // Check for color contrast issues
  checkColorContrast: () => {
    const elements = document.querySelectorAll('*');
    const issues = [];
    
    Array.from(elements).forEach(element => {
      const style = window.getComputedStyle(element);
      const color = style.color;
      const backgroundColor = style.backgroundColor;
      
      if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const ratio = colorContrast.getContrastRatio(color, backgroundColor);
        if (ratio < 4.5) {
          issues.push({
            element,
            ratio,
            color,
            backgroundColor,
            issue: 'Color contrast below WCAG AA standard'
          });
        }
      }
    });
    
    return issues;
  }
};

import { useState, useCallback } from 'react';

/**
 * Accessibility Hooks
 */
export const useAccessibility = () => {
  // Focus management
  const [focusedElement, setFocusedElement] = useState(null);
  
  const saveFocus = useCallback(() => {
    setFocusedElement(document.activeElement);
  }, []);
  
  const restoreFocus = useCallback(() => {
    if (focusedElement && typeof focusedElement.focus === 'function') {
      focusedElement.focus();
    }
  }, [focusedElement]);

  // Screen reader announcements
  const announce = useCallback((message, priority = 'polite') => {
    screenReader.announce(message, priority);
  }, []);

  // Keyboard navigation
  const handleKeyboardNavigation = useCallback((event, handlers) => {
    keyboardNavigation.handleKeyDown(event, handlers);
  }, []);

  return {
    saveFocus,
    restoreFocus,
    announce,
    handleKeyboardNavigation,
    ariaLabels,
    keyboardNavigation,
    screenReader,
    colorContrast,
    focusManagement,
    accessibilityTesting
  };
};

export default {
  ariaLabels,
  keyboardNavigation,
  screenReader,
  colorContrast,
  focusManagement,
  accessibilityTesting,
  useAccessibility
};
