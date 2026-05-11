import logger from '../utils/logger';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { themes, modernTheme } from '../theme/themes';
import { brandColors } from '../styles/theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

const ThemeContext = createContext();

/** Tailwind-style keys or legacy keys → hex (Scanified defaults where names overlap). */
const ACCENT_KEY_TO_HEX = {
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

function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  const q = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${q(r)}${q(g)}${q(b)}`;
}

function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  if (!A || !B) return typeof a === 'string' && a.startsWith('#') ? a : '#40B5AD';
  return rgbToHex({
    r: A.r + (B.r - A.r) * t,
    g: A.g + (B.g - A.g) * t,
    b: A.b + (B.b - A.b) * t,
  });
}

function relativeLuminance(hex) {
  const o = hexToRgb(hex);
  if (!o) return 0;
  const srgb = [o.r, o.g, o.b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastTextFor(hex) {
  return relativeLuminance(hex) > 0.45 ? '#1F2937' : '#ffffff';
}

export function resolveAccentToHex(raw) {
  if (!raw || typeof raw !== 'string') return '#40B5AD';
  const t = raw.trim();
  if (t.startsWith('#')) {
    if (t.length === 4 || t.length === 7) return t.length === 4 ? `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}` : t;
    return '#40B5AD';
  }
  return ACCENT_KEY_TO_HEX[t] || '#40B5AD';
}

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
  },
  'body, .MuiPaper-root, .MuiCard-root, .MuiButton-root, .MuiChip-root, .MuiTextField-root, .MuiOutlinedInput-root':
    {
      transition:
        'background-color 0.2s ease-out, color 0.2s ease-out, border-color 0.2s ease-out, box-shadow 0.2s ease-out',
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
  /* Anchor default color is set in getGlobalStylesForTheme so it follows palette.primary (accent). */
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
  const primaryDark = theme.palette.primary.dark;
  return {
    ...globalStylesStatic,
    body: {
      ...globalStylesStatic.body,
      ...(!isDark
        ? {
            background: brandColors.background.gradient,
            backgroundAttachment: 'fixed',
          }
        : {
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
          }),
    },
    a: {
      textDecoration: 'none',
      color: primary,
      '&:hover': {
        textDecoration: 'underline',
        color: primaryDark,
      },
    },
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
      backgroundColor: isDark
        ? `color-mix(in srgb, ${primary} 38%, transparent)`
        : `color-mix(in srgb, ${primary} 26%, transparent)`,
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
  
  const [accent, setAccent] = useState('#40B5AD'); // Scanified primary teal (per-user UI accent)
  const [organizationColors, setOrganizationColors] = useState({
    primary: '#40B5AD',
    secondary: '#48C9B0',
  });

  // Load per-user appearance from profile (accent + light/dark). Org brand colors stay separate.
  useEffect(() => {
    const loadUserAppearance = async () => {
      if (!user?.id) {
        setAccent('#40B5AD');
        const savedDark = localStorage.getItem('darkMode') === 'true';
        setIsDarkMode(savedDark);
        setMode(savedDark ? 'dark' : 'light');
        if (typeof document !== 'undefined') {
          const html = document.documentElement;
          if (savedDark) html.classList.add('dark');
          else html.classList.remove('dark');
        }
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme_accent, theme_mode')
          .eq('id', user.id)
          .single();

        if (error) {
          logger.error('Error loading user appearance:', error);
          setAccent('#40B5AD');
          return;
        }

        if (data?.theme_accent) {
          setAccent(resolveAccentToHex(data.theme_accent));
        } else {
          setAccent('#40B5AD');
        }

        if (data?.theme_mode === 'dark' || data?.theme_mode === 'light') {
          const dark = data.theme_mode === 'dark';
          setMode(data.theme_mode);
          setIsDarkMode(dark);
          if (typeof document !== 'undefined') {
            const html = document.documentElement;
            if (dark) html.classList.add('dark');
            else html.classList.remove('dark');
          }
        }
      } catch (err) {
        logger.error('Error loading user appearance:', err);
        setAccent('#40B5AD');
      }
    };

    loadUserAppearance();
  }, [user?.id]);

  // Organization brand colors (e.g. invoices, org setup) — not the same as each user's UI accent.
  useEffect(() => {
    if (organization) {
      setOrganizationColors({
        primary: organization.primary_color || '#40B5AD',
        secondary: organization.secondary_color || '#48C9B0',
      });
    } else {
      setOrganizationColors({
        primary: '#40B5AD',
        secondary: '#48C9B0',
      });
    }
  }, [organization]);

  // Tailwind / marketing tokens follow the signed-in user's accent, not org-wide branding.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const primary = resolveAccentToHex(accent);
    const secondary = organizationColors.secondary || '#48C9B0';
    document.documentElement.style.setProperty('--primary-color', primary);
    document.documentElement.style.setProperty('--secondary-color', secondary);
  }, [accent, organizationColors.secondary]);

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

  const setAccentColor = useCallback((newAccent) => {
    setAccent(resolveAccentToHex(newAccent));
  }, []);

  /** Merge accent into headings, links, and tabs so palette.primary (user accent) is visible in typography. */
  const mergeAccentAwareComponents = useCallback((base) => {
    const c = base?.components || {};
    const typo = c.MuiTypography || {};
    const typoSo = typeof typo.styleOverrides === 'object' && typo.styleOverrides ? typo.styleOverrides : {};
    return {
      ...c,
      MuiTypography: {
        ...typo,
        styleOverrides: {
          ...typoSo,
          h4: ({ theme }) => ({ color: theme.palette.primary.main }),
          h5: ({ theme }) => ({ color: theme.palette.primary.main }),
          h6: ({ theme }) => ({ color: theme.palette.primary.main }),
        },
      },
      MuiLink: {
        ...c.MuiLink,
        defaultProps: {
          ...(c.MuiLink?.defaultProps || {}),
          color: 'primary',
          underline: 'hover',
        },
      },
      MuiTabs: {
        ...c.MuiTabs,
        defaultProps: {
          ...(c.MuiTabs?.defaultProps || {}),
          textColor: 'primary',
          indicatorColor: 'primary',
        },
      },
    };
  }, []);

  const muiTheme = useMemo(() => {
    const baseTheme = themes[currentTheme] || modernTheme;
    const hexAccent = resolveAccentToHex(accent);
    const primaryMain = isDarkMode ? mixHex(hexAccent, '#ffffff', 0.12) : hexAccent;
    const orgSecondary = organizationColors.secondary || '#48C9B0';

    const primaryPalette = {
      ...baseTheme.palette.primary,
      main: primaryMain,
      light: mixHex(primaryMain, '#ffffff', 0.32),
      dark: mixHex(primaryMain, '#000000', 0.22),
      contrastText: contrastTextFor(primaryMain),
    };

    const secondaryPalette = {
      ...baseTheme.palette.secondary,
      main: orgSecondary,
      light: mixHex(orgSecondary, '#ffffff', 0.28),
      dark: mixHex(orgSecondary, '#000000', 0.2),
      contrastText: contrastTextFor(orgSecondary),
    };

    if (isDarkMode) {
      return createTheme({
        ...baseTheme,
        palette: {
          ...baseTheme.palette,
          mode: 'dark',
          primary: primaryPalette,
          secondary: secondaryPalette,
          background: {
            default: '#0f1419',
            paper: '#1a2332',
          },
          text: {
            primary: 'rgba(255, 255, 255, 0.9)',
            secondary: 'rgba(226, 232, 240, 0.72)',
            disabled: 'rgba(255, 255, 255, 0.38)',
          },
          divider: 'rgba(148, 163, 184, 0.16)',
          action: {
            active: 'rgba(255, 255, 255, 0.56)',
            hover: 'rgba(255, 255, 255, 0.08)',
            selected: 'rgba(95, 205, 197, 0.16)',
            disabled: 'rgba(255, 255, 255, 0.3)',
            disabledBackground: 'rgba(255, 255, 255, 0.12)',
          },
          info: {
            ...baseTheme.palette.info,
            main: mixHex(primaryMain, '#93c5fd', 0.35),
          },
        },
        components: mergeAccentAwareComponents(baseTheme),
      });
    }

    return createTheme({
      ...baseTheme,
      palette: {
        ...baseTheme.palette,
        mode: 'light',
        primary: primaryPalette,
        secondary: secondaryPalette,
      },
      components: mergeAccentAwareComponents(baseTheme),
    });
  }, [currentTheme, isDarkMode, accent, organizationColors.secondary, mergeAccentAwareComponents]);

  const getTheme = useCallback(() => muiTheme, [muiTheme]);

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
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        <GlobalStyles styles={(theme) => getGlobalStylesForTheme(theme)} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 