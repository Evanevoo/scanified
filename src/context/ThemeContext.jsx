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

// Shared global styles (mode-agnostic). Scrollbar/focus/selection follow active MUI theme.
const globalStylesStatic = {
  '*': {
    boxSizing: 'border-box',
    transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
  },
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
    },
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
  a: {
    textDecoration: 'none',
    color: 'inherit',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  '@keyframes pulse': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.5 },
    '100%': { opacity: 1 },
  },
  '@keyframes slideIn': {
    from: { transform: 'translateY(-10px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  '@keyframes fadeIn': {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  '.animate-pulse': {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  '.animate-slideIn': {
    animation: 'slideIn 0.3s ease-out',
  },
  '.animate-fadeIn': {
    animation: 'fadeIn 0.3s ease-out',
  },
  '.card-hover': {
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
    },
  },
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

const getGlobalStylesForTheme = (theme) => {
  const isDark = theme.palette.mode === 'dark';
  const primary = theme.palette.primary.main;
  return {
    ...globalStylesStatic,
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb': {
      background: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
      borderRadius: '4px',
      '&:hover': {
        background: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.35)',
      },
    },
    '*:focus-visible': {
      outline: `2px solid ${primary}`,
      outlineOffset: '2px',
    },
    '::selection': {
      backgroundColor: isDark ? 'rgba(95, 205, 197, 0.35)' : 'rgba(64, 181, 173, 0.25)',
      color: 'inherit',
    },
  };
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

  // Initialize CSS variables on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary-color', '#40B5AD');
      document.documentElement.style.setProperty('--secondary-color', '#48C9B0');
    }
  }, []);

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
      const primary = organization.primary_color || '#40B5AD';
      const secondary = organization.secondary_color || '#48C9B0';
      setOrganizationColors({
        primary,
        secondary
      });
      
      // Set CSS variables for dynamic theming
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--primary-color', primary);
        document.documentElement.style.setProperty('--secondary-color', secondary);
      }
    } else {
      const defaultPrimary = '#40B5AD';
      const defaultSecondary = '#48C9B0';
      setOrganizationColors({
        primary: defaultPrimary,
        secondary: defaultSecondary
      });
      
      // Set CSS variables for dynamic theming
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--primary-color', defaultPrimary);
        document.documentElement.style.setProperty('--secondary-color', defaultSecondary);
      }
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
    
    // Apply dark mode — MUI-style layered surfaces (softer than pure black / pure white)
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
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: 'rgba(255, 255, 255, 0.87)',
            secondary: 'rgba(255, 255, 255, 0.6)',
            disabled: 'rgba(255, 255, 255, 0.38)',
          },
          divider: 'rgba(255, 255, 255, 0.12)',
          action: {
            active: 'rgba(255, 255, 255, 0.56)',
            hover: 'rgba(255, 255, 255, 0.08)',
            selected: 'rgba(255, 255, 255, 0.16)',
            disabled: 'rgba(255, 255, 255, 0.3)',
            disabledBackground: 'rgba(255, 255, 255, 0.12)',
          },
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
        <GlobalStyles styles={(theme) => getGlobalStylesForTheme(theme)} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 