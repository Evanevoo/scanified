import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { themes, modernTheme } from '../theme/themes';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // More detailed error for debugging
    console.error('useTheme: Context is null or undefined. This usually means:');
    console.error('1. Component is not wrapped with ThemeProvider');
    console.error('2. Hot module replacement issue - try refreshing the page');
    console.error('3. React context system is in an inconsistent state');
    
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
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'modern';
  });
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'light';
  });
  
  const [accent, setAccent] = useState(() => {
    return localStorage.getItem('accentColor') || '#1976d2';
  });

  useEffect(() => {
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);
  
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);
  
  useEffect(() => {
    localStorage.setItem('accentColor', accent);
  }, [accent]);

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
  };

  const toggleDarkMode = () => {
    console.log('Toggling dark mode:', { from: isDarkMode, to: !isDarkMode });
    setIsDarkMode(!isDarkMode);
  };

  const getTheme = () => {
    const baseTheme = themes[currentTheme] || modernTheme;
    
    // Apply dark mode if enabled
    if (isDarkMode) {
      return createTheme({
        ...baseTheme,
        palette: {
          ...baseTheme.palette,
          mode: 'dark',
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
    
    return createTheme(baseTheme);
  };

  const contextValue = {
    currentTheme,
    isDarkMode,
    mode,
    setMode,
    accent,
    setAccent,
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