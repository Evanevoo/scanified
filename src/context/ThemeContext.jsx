import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { createAppTheme } from '../theme';

const themeColors = {
  'blue-600': '#2563eb',
  'emerald-500': '#10b981',
  'purple-600': '#7c3aed',
  'rose-500': '#f43f5e',
  'amber-500': '#f59e42',
};

const ThemeContext = createContext();

export function useThemeContext() {
  return useContext(ThemeContext);
}

export function ThemeContextProvider({ children }) {
  const { user, profile } = useAuth();
  const [mode, setModeState] = useState(() => {
    // Initialize from localStorage immediately to prevent flash
    return localStorage.getItem('theme') || 'light';
  });
  const [accent, setAccentState] = useState(() => {
    // Initialize from localStorage immediately to prevent flash
    return localStorage.getItem('themeColor') || 'blue-600';
  });
  const [loading, setLoading] = useState(true);

  // Load theme/accent from profile or localStorage
  useEffect(() => {
    async function loadTheme() {
      if (profile && user) {
        // User is authenticated - use their profile settings
        const profileTheme = profile.theme || localStorage.getItem('theme') || 'light';
        const profileAccent = profile.accent_color || localStorage.getItem('themeColor') || 'blue-600';
        
        setModeState(profileTheme);
        setAccentState(profileAccent);
        
        // Update localStorage with profile values
        localStorage.setItem('theme', profileTheme);
        localStorage.setItem('themeColor', profileAccent);
      } else {
        // User is not authenticated - use default theme for public pages
        // Don't load user-specific themes for public pages
        setModeState('light');
        setAccentState('blue-600');
        
        // Reset localStorage to defaults for public pages
        localStorage.setItem('theme', 'light');
        localStorage.setItem('themeColor', 'blue-600');
      }
      setLoading(false);
    }
    loadTheme();
  }, [profile, user]);

  // Save to localStorage and update <html> for custom CSS
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('theme', mode);
      localStorage.setItem('themeColor', accent);
      document.documentElement.classList.toggle('dark', mode === 'dark');
      document.documentElement.style.setProperty('--accent', themeColors[accent] || themeColors['blue-600']);
    }
  }, [mode, accent, loading]);

  // Update Supabase profile when theme/accent changes (if logged in)
  useEffect(() => {
    if (!loading && user && profile) {
      // Only update if values differ from profile
      if ((profile?.theme !== mode || profile?.accent_color !== accent)) {
        supabase.from('profiles').update({ theme: mode, accent_color: accent }).eq('id', user.id);
      }
    }
  }, [mode, accent, user, profile, loading]);

  const setMode = (newMode) => {
    setModeState(newMode);
    localStorage.setItem('theme', newMode);
  };
  
  const setAccent = (newAccent) => {
    setAccentState(newAccent);
    localStorage.setItem('themeColor', newAccent);
  };

  const theme = useMemo(() => 
    createAppTheme(mode, accent),
    [mode, accent]
  );

  const value = {
    mode,
    setMode,
    accent,
    setAccent,
    loading,
  };

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
} 