import { createTheme } from '@mui/material/styles';

// Color palette for the application
const colors = {
  primary: {
    blue: '#2563eb',
    emerald: '#10b981',
    purple: '#7c3aed',
    rose: '#f43f5e',
    amber: '#f59e42',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    green: '#22c55e',
    orange: '#f97316',
    red: '#ef4444',
    pink: '#ec4899',
    indigo: '#6366f1',
    lime: '#84cc16',
    violet: '#a21caf',
    slate: '#64748b',
    sky: '#0ea5e9',
  },
  black: '#111111',
  white: '#ffffff',
  gray: '#eaeaea',
};

// Map accent keys to color names
const accentMap = {
  'blue-600': 'blue',
  'emerald-500': 'emerald',
  'purple-600': 'purple',
  'rose-500': 'rose',
  'amber-500': 'amber',
  'teal-500': 'teal',
  'cyan-500': 'cyan',
  'green-500': 'green',
  'orange-500': 'orange',
  'red-500': 'red',
  'pink-500': 'pink',
  'indigo-500': 'indigo',
  'lime-500': 'lime',
  'violet-600': 'violet',
  'slate-500': 'slate',
  'sky-500': 'sky',
};

// Create theme function that accepts mode and accent color
export const createAppTheme = (mode = 'light', accent = 'blue-600') => {
  // Convert accent key to color name
  const accentColorName = accentMap[accent] || 'blue';
  const primaryColor = colors.primary[accentColorName] || colors.primary.blue;
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryColor,
        contrastText: colors.white,
      },
      secondary: {
        main: primaryColor,
        contrastText: colors.white,
      },
      background: {
        default: mode === 'dark' ? '#121212' : colors.white,
        paper: mode === 'dark' ? '#1e1e1e' : colors.white,
      },
      text: {
        primary: mode === 'dark' ? colors.white : colors.black,
        secondary: mode === 'dark' ? '#b0b0b0' : '#444',
      },
      divider: mode === 'dark' ? '#333' : colors.gray,
    },
    typography: {
      fontFamily: 'Inter, Montserrat, Arial, sans-serif',
      h1: {
        fontWeight: 800,
        fontSize: '3rem',
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
      },
      h2: {
        fontWeight: 800,
        fontSize: '2.2rem',
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
      },
      h3: {
        fontWeight: 700,
        fontSize: '1.7rem',
        letterSpacing: '-0.01em',
        lineHeight: 1.2,
      },
      h4: {
        fontWeight: 700,
        fontSize: '1.3rem',
        lineHeight: 1.25,
      },
      h5: {
        fontWeight: 700,
        fontSize: '1.1rem',
      },
      h6: {
        fontWeight: 700,
        fontSize: '1rem',
      },
      button: {
        fontWeight: 700,
        fontFamily: 'Inter, Montserrat, Arial, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      },
      body1: {
        fontSize: '1.1rem',
      },
      body2: {
        fontSize: '1rem',
      },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1e1e1e' : colors.white,
            color: mode === 'dark' ? colors.white : colors.black,
            boxShadow: 'none',
            border: 'none',
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 72,
            paddingLeft: 32,
            paddingRight: 32,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            fontFamily: 'Inter, Montserrat, Arial, sans-serif',
            fontSize: '1rem',
            backgroundColor: 'transparent',
            color: mode === 'dark' ? colors.white : colors.black,
            boxShadow: 'none',
            padding: '8px 20px',
            '&:hover': {
              backgroundColor: mode === 'dark' ? '#2a2a2a' : '#f5faff',
              color: primaryColor,
            },
            '&.MuiButton-contained': {
              backgroundColor: primaryColor,
              color: colors.white,
              '&:hover': {
                backgroundColor: primaryColor,
                opacity: 0.9,
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1e1e1e' : colors.white,
            borderRadius: 10,
            boxShadow: mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#333' : colors.gray,
            height: 2,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 700,
            fontFamily: 'Inter, Montserrat, Arial, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: mode === 'dark' ? colors.white : colors.black,
            '&.Mui-selected, &.Mui-selected:hover': {
              backgroundColor: mode === 'dark' ? '#2a2a2a' : '#f5faff',
              color: primaryColor,
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            color: mode === 'dark' ? colors.white : colors.black,
            '&.Mui-selected': {
              color: primaryColor,
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: primaryColor,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            '&.MuiChip-colorPrimary': {
              backgroundColor: primaryColor,
              color: colors.white,
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': {
              color: primaryColor,
              '& + .MuiSwitch-track': {
                backgroundColor: primaryColor,
              },
            },
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            '& .MuiSlider-thumb': {
              backgroundColor: primaryColor,
            },
            '& .MuiSlider-track': {
              backgroundColor: primaryColor,
            },
            '& .MuiSlider-rail': {
              backgroundColor: mode === 'dark' ? '#555' : '#ddd',
            },
          },
        },
      },
      MuiFormControlLabel: {
        styleOverrides: {
          root: {
            '& .MuiFormControlLabel-label': {
              color: mode === 'dark' ? colors.white : colors.black,
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: mode === 'dark' ? '#b0b0b0' : '#666',
            '&.Mui-focused': {
              color: primaryColor,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark' ? '#555' : '#ddd',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: primaryColor,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: primaryColor,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            '& .MuiSelect-icon': {
              color: mode === 'dark' ? '#b0b0b0' : '#666',
            },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: mode === 'dark' ? '#2a2a2a' : '#f5faff',
            },
            '&.Mui-selected': {
              backgroundColor: mode === 'dark' ? '#2a2a2a' : '#f5faff',
              color: primaryColor,
            },
          },
        },
      },
    },
  });
};

// Export default theme
export default createAppTheme; 