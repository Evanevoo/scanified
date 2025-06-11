import { createTheme } from '@mui/material/styles';

// Color palette for the application
const colors = {
  primary: {
    blue: '#00aaff',
  },
  black: '#111111',
  white: '#ffffff',
  gray: '#eaeaea',
};

// Create theme function that accepts mode and accent color
export const createAppTheme = (mode = 'light', accent = 'blue') => {
  const primaryColor = colors.primary[accent] || colors.primary.blue;
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryColor,
        contrastText: colors.black,
      },
      background: {
        default: colors.white,
        paper: colors.white,
      },
      text: {
        primary: colors.black,
        secondary: '#444',
      },
      divider: colors.gray,
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
            backgroundColor: colors.white,
            color: colors.black,
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
            color: colors.black,
            boxShadow: 'none',
            padding: '8px 20px',
            '&:hover': {
              backgroundColor: '#f5faff',
              color: primaryColor,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: colors.white,
            borderRadius: 10,
            boxShadow: 'none',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            backgroundColor: colors.gray,
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
            color: colors.black,
            '&.Mui-selected, &.Mui-selected:hover': {
              backgroundColor: '#f5faff',
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