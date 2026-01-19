import logger from '../utils/logger';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { themes, modernTheme } from '../theme/themes';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // More detailed error for debugging
    logger.error('useTheme: Context is null or undefined. This usually means:');
    logger.error('1. Component is not wrapped with ThemeProvider');
    logger.error('2. Hot module replacement issue - try refreshing the page');
    logger.error('3. React context system is in an inconsistent state');
    
    // Return a fallback theme instead of throwing
    return {
      currentTheme: 'modern',
      isDarkMode: false,
      mode: 'light',
      accent: '#1976d2',
      changeTheme: () => {},
      toggleDarkMode: () => {},
      getTheme: () => ({ palette: { mode: 'light' } })
    };
  }
  return context;
};

// Global styles for enhanced design
const globalStyles = {
  '*': {
    boxSizing: 'border-box',
    transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
  },
  // Fix for Material-UI tab movement/vibration issues
  '.MuiTab-root': {
    transition: 'none !important',
    transform: 'none !important',
    animation: 'none !important',
    '&:hover': {
      backgroundColor: 'transparent !important',
      transform: 'none !important',
      transition: 'none !important',
      animation: 'none !important',
    },
    '&:focus': {
      backgroundColor: 'transparent !important',
      transform: 'none !important',
      transition: 'none !important',
      animation: 'none !important',
    },
    '&::before': {
      display: 'none !important',
    },
    '&::after': {
      display: 'none !important',
    }
  },
  '.MuiTabs-indicator': {
    transition: 'none !important',
    animation: 'none !important',
  },
  '.MuiTouchRipple-root': {
    display: 'none !important',
  },
  html: {
    fontSize: '16px',
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    scrollBehavior: 'smooth',
  },
  body: {
    margin: 0,
    padding: 0,
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  // Custom scrollbar styles
  '::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '::-webkit-scrollbar-track': {
    background: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '4px',
  },
  '::-webkit-scrollbar-thumb': {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    '&:hover': {
      background: 'rgba(0, 0, 0, 0.3)',
    },
  },
  // Enhanced focus styles
  '*:focus-visible': {
    outline: '2px solid #3b82f6',
    outlineOffset: '2px',
  },
  // Enhanced selection styles
  '::selection': {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: 'inherit',
  },
  // Link styles
  'a': {
    textDecoration: 'none',
    color: 'inherit',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  // Loading animation keyframes
  '@keyframes pulse': {
    '0%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.5,
    },
    '100%': {
      opacity: 1,
    },
  },
  '@keyframes slideIn': {
    from: {
      transform: 'translateY(-10px)',
      opacity: 0,
    },
    to: {
      transform: 'translateY(0)',
      opacity: 1,
    },
  },
  '@keyframes fadeIn': {
    from: {
      opacity: 0,
    },
    to: {
      opacity: 1,
    },
  },
  // Utility classes for animations
  '.animate-pulse': {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  '.animate-slideIn': {
    animation: 'slideIn 0.3s ease-out',
  },
  '.animate-fadeIn': {
    animation: 'fadeIn 0.3s ease-out',
  },
  // Enhanced card hover effects
  '.card-hover': {
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
    },
  },
  // Gradient backgrounds for special elements
  '.gradient-bg': {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  '.gradient-bg-success': {
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  },
  '.gradient-bg-warning': {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  '.gradient-bg-info': {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
};

export const ThemeProvider = ({ children }) => {
  const { user, profile, organization } = useAuth();
  
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'modern';
  });
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode') === 'true';
    // Initialize HTML class on mount for Tailwind dark mode
    if (typeof document !== 'undefined') {
      const htmlElement = document.documentElement;
      if (saved) {
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
      }
    }
    return saved;
  });
  
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    // Sync mode with isDarkMode
    return savedMode || (savedDarkMode ? 'dark' : 'light');
  });
  
  const [accent, setAccent] = useState('#40B5AD'); // Scanified primary teal
  const [organizationColors, setOrganizationColors] = useState({
    primary: '#40B5AD',
    secondary: '#48C9B0'
  });

  // Load user-specific accent color and organization colors when user changes
  useEffect(() => {
    const loadUserAccentColor = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('theme_accent')
            .eq('id', user.id)
            .single();

          if (!error && data?.theme_accent) {
            // Ensure the accent is a hex color
            let hexAccent = data.theme_accent;
            if (!hexAccent.startsWith('#')) {
              // If it's a color key like 'blue-600', convert it to hex
              const colorMap = {
                'blue-600': '#40B5AD',
                'emerald-500': '#48C9B0',
                'purple-600': '#8B7BA8',
                'rose-500': '#f43f5e',
                'amber-500': '#f59e42',
                'teal-500': '#40B5AD',
                'cyan-500': '#5FCDC5',
                'green-500': '#48C9B0',
                'orange-500': '#f97316',
                'red-500': '#ef4444',
                'pink-500': '#ec4899',
                'indigo-500': '#6366f1',
                'lime-500': '#84cc16',
                'violet-600': '#8B7BA8',
                'slate-500': '#64748b',
                'sky-500': '#5FCDC5',
              };
              hexAccent = colorMap[hexAccent] || '#40B5AD';
            }
            setAccent(hexAccent);
          } else {
            // Set default accent if no user-specific color is found
            setAccent('#40B5AD'); // Scanified primary teal
          }
        } catch (error) {
          logger.error('Error loading user accent color:', error);
          setAccent('#40B5AD'); // Scanified primary teal
        }
      } else {
        // Set default accent when no user is logged in
        setAccent('#40B5AD'); // Scanified primary teal
      }
    };

    loadUserAccentColor();
  }, [user?.id]);

  // Load organization colors when organization changes
  useEffect(() => {
    if (organization) {
      setOrganizationColors({
        primary: organization.primary_color || '#40B5AD',
        secondary: organization.secondary_color || '#48C9B0'
      });
    } else {
      setOrganizationColors({
        primary: '#40B5AD',
        secondary: '#48C9B0'
      });
    }
  }, [organization]);

  useEffect(() => {
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
    
    // Apply dark class to HTML element for Tailwind dark mode
    const htmlElement = document.documentElement;
    if (isDarkMode) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    // Sync isDarkMode with mode changes
    const shouldBeDark = mode === 'dark';
    if (isDarkMode !== shouldBeDark) {
      setIsDarkMode(shouldBeDark);
    }
  }, [mode, isDarkMode]);

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
  };

  const toggleDarkMode = () => {
    logger.log('Toggling dark mode:', { from: isDarkMode, to: !isDarkMode });
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    setMode(newDarkMode ? 'dark' : 'light');
    
    // Immediately update HTML class for Tailwind (before useEffect runs)
    const htmlElement = document.documentElement;
    if (newDarkMode) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  };

  // Wrapper function to ensure accent is always stored as hex
  const setAccentColor = (newAccent) => {
    let hexAccent = newAccent;
    if (!hexAccent.startsWith('#')) {
      // If it's a color key like 'blue-600', convert it to hex
      const colorMap = {
        'blue-600': '#2563eb',
        'emerald-500': '#10b981',
        'purple-600': '#7c3aed',
        'rose-500': '#f43f5e',
        'amber-500': '#f59e42',
        'teal-500': '#14b8a6',
        'cyan-500': '#06b6d4',
        'green-500': '#22c55e',
        'orange-500': '#f97316',
        'red-500': '#ef4444',
        'pink-500': '#ec4899',
        'indigo-500': '#6366f1',
        'lime-500': '#84cc16',
        'violet-600': '#a21caf',
        'slate-500': '#64748b',
        'sky-500': '#0ea5e9',
      };
      hexAccent = colorMap[hexAccent] || '#40B5AD'; // Scanified primary teal
    }
    setAccent(hexAccent);
  };

  const getTheme = () => {
    const baseTheme = themes[currentTheme] || modernTheme;
    
    // Ensure accent is always a hex color
    let hexAccent = accent;
    if (!hexAccent.startsWith('#')) {
      // If it's a color key like 'blue-600', convert it to hex
      const colorMap = {
        'blue-600': '#40B5AD', // Scanified primary teal
        'emerald-500': '#48C9B0', // Scanified secondary turquoise
        'purple-600': '#8B7BA8', // Scanified purple accent
        'rose-500': '#f43f5e',
        'amber-500': '#f59e42',
        'teal-500': '#40B5AD', // Scanified primary teal
        'cyan-500': '#5FCDC5', // Scanified light teal
        'green-500': '#48C9B0', // Scanified secondary turquoise
        'orange-500': '#f97316',
        'red-500': '#ef4444',
        'pink-500': '#ec4899',
        'indigo-500': '#6366f1',
        'lime-500': '#84cc16',
        'violet-600': '#8B7BA8', // Scanified purple accent
        'slate-500': '#64748b',
        'sky-500': '#5FCDC5', // Scanified light teal
      };
      hexAccent = colorMap[hexAccent] || '#40B5AD'; // Scanified primary teal
    }
    
    // Apply dark mode if enabled
    if (isDarkMode) {
      return createTheme({
        ...baseTheme,
        palette: {
          ...baseTheme.palette,
          mode: 'dark',
          primary: {
            ...baseTheme.palette.primary,
            main: organizationColors.primary,
          },
          secondary: {
            ...baseTheme.palette.secondary,
            main: organizationColors.secondary,
          },
          background: {
            default: '#0a0a0a',
            paper: '#1a1a1a',
          },
          text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.7)',
          },
          divider: 'rgba(255, 255, 255, 0.12)',
        },
      });
    }
    
    // Apply accent color to light theme
    return createTheme({
      ...baseTheme,
      palette: {
        ...baseTheme.palette,
        primary: {
          ...baseTheme.palette.primary,
          main: organizationColors.primary,
        },
        secondary: {
          ...baseTheme.palette.secondary,
          main: organizationColors.secondary,
        },
      },
    });
  };

  const contextValue = {
    currentTheme,
    isDarkMode,
    mode,
    setMode,
    accent,
    setAccent: setAccentColor,
    organizationColors,
    changeTheme,
    toggleDarkMode,
    availableThemes: themes,
    getTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={getTheme()}>
        <CssBaseline />
        <GlobalStyles styles={globalStyles} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 