import { createTheme } from '@mui/material/styles';

// Brand colors (exported for pages that are not MUI-theme-driven)
export const brandColors = {
  primary: '#40B5AD', // Teal
  secondary: '#8B7BA8', // Purple
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  background: {
    default: '#F3F5FF',
    paper: '#FFFFFF',
    // Soft lavender–neutral wash (B2B dashboard–style) while keeping brand tints
    gradient: 'linear-gradient(145deg, #f0f2f7 0%, #f4f2ff 38%, #faf8ff 72%, #fff5f8 100%)'
  },
  text: {
    primary: '#1F2937',
    secondary: '#6B7280',
    disabled: '#9CA3AF'
  },
  divider: '#E5E7EB',
  border: '#E5E7EB'
};

// Common component styles (aligned with 8px grid + ~200ms motion)
export const commonStyles = {
  // Cards
  card: {
    borderRadius: 18,
    background: 'rgba(255, 255, 255, 0.74)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255, 255, 255, 0.75)',
    boxShadow: '0 10px 28px rgba(123, 97, 255, 0.08), 0 3px 10px rgba(15, 23, 42, 0.05)',
    transition:
      'box-shadow 0.28s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
    '&:hover': {
      boxShadow: '0 18px 36px rgba(123, 97, 255, 0.12), 0 8px 20px rgba(15, 23, 42, 0.08)',
      transform: 'translateY(-2px)',
    },
  },

  // Buttons
  primaryButton: {
    borderRadius: 999,
    textTransform: 'none',
    fontWeight: 700,
    padding: '10px 22px',
    letterSpacing: '0.01em',
    background: 'linear-gradient(90deg, #ff8a65 0%, #ff6ec7 100%)',
    boxShadow: '0 10px 24px rgba(255, 110, 199, 0.32)',
    transition:
      'filter 0.22s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      filter: 'brightness(1.04)',
      boxShadow: '0 14px 28px rgba(255, 110, 199, 0.36)',
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },

  secondaryButton: {
    borderRadius: 999,
    textTransform: 'none',
    fontWeight: 600,
    padding: '10px 20px',
    border: '2px solid',
    transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      backgroundColor: 'rgba(64, 181, 173, 0.08)',
    },
  },
  
  // Form inputs
  textField: {
    '& .MuiOutlinedInput-root': {
      borderRadius: 8,
      '&:hover fieldset': {
        borderColor: brandColors.primary
      },
      '&.Mui-focused fieldset': {
        borderColor: brandColors.primary
      }
    }
  },
  
  // Tables
  tableContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.82)',
    boxShadow: '0 10px 28px rgba(123, 97, 255, 0.08), 0 3px 10px rgba(15, 23, 42, 0.05)',
    background: 'rgba(255, 255, 255, 0.62)',
    backdropFilter: 'blur(12px)'
  },
  
  tableHeader: {
    backgroundColor: brandColors.background.default,
    fontWeight: 600,
    color: brandColors.text.primary
  },
  
  // Sections
  section: {
    marginBottom: 24,
    padding: 24,
    background: 'rgba(255, 255, 255, 0.74)',
    backdropFilter: 'blur(14px)',
    borderRadius: 18,
    border: '1px solid rgba(255, 255, 255, 0.75)',
    boxShadow: '0 10px 28px rgba(123, 97, 255, 0.08), 0 3px 10px rgba(15, 23, 42, 0.05)'
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: brandColors.text.primary,
    marginBottom: 16
  },
  
  // Status chips
  statusChip: (status) => {
    const statusColors = {
      active: brandColors.success,
      inactive: brandColors.error,
      pending: brandColors.warning,
      completed: brandColors.success,
      available: brandColors.success,
      rented: brandColors.info,
      maintenance: brandColors.warning,
      retired: brandColors.error
    };
    
    const color = statusColors[status] || brandColors.info;
    
    return {
      backgroundColor: `${color}20`,
      color: color,
      fontWeight: 600,
      borderRadius: 6,
      padding: '4px 12px',
      fontSize: 12
    };
  },
  
  // Animations
  fadeIn: {
    animation: 'fadeIn 0.3s ease-in'
  },
  
  slideIn: {
    animation: 'slideIn 0.3s ease-out'
  }
};

// Create MUI theme
export const theme = createTheme({
  palette: {
    primary: {
      main: brandColors.primary,
      light: '#5FCDC5',
      dark: '#2E9B94'
    },
    secondary: {
      main: brandColors.secondary,
      light: '#A599C1',
      dark: '#6B5A87'
    },
    success: {
      main: brandColors.success
    },
    warning: {
      main: brandColors.warning
    },
    error: {
      main: brandColors.error
    },
    info: {
      main: brandColors.info
    },
    background: {
      default: brandColors.background.default,
      paper: brandColors.background.paper
    },
    text: {
      primary: brandColors.text.primary,
      secondary: brandColors.text.secondary,
      disabled: brandColors.text.disabled
    },
    divider: brandColors.divider
  },
  
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: 32,
      fontWeight: 700,
      lineHeight: 1.2,
      color: brandColors.text.primary
    },
    h2: {
      fontSize: 28,
      fontWeight: 700,
      lineHeight: 1.3,
      color: brandColors.text.primary
    },
    h3: {
      fontSize: 24,
      fontWeight: 600,
      lineHeight: 1.4,
      color: brandColors.text.primary
    },
    h4: {
      fontSize: 20,
      fontWeight: 600,
      lineHeight: 1.5,
      color: brandColors.text.primary
    },
    h5: {
      fontSize: 18,
      fontWeight: 600,
      lineHeight: 1.5,
      color: brandColors.text.primary
    },
    h6: {
      fontSize: 16,
      fontWeight: 600,
      lineHeight: 1.5,
      color: brandColors.text.primary
    },
    body1: {
      fontSize: 16,
      lineHeight: 1.6,
      color: brandColors.text.primary
    },
    body2: {
      fontSize: 14,
      lineHeight: 1.5,
      color: brandColors.text.secondary
    },
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },
  
  shape: {
    borderRadius: 18
  },
  
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 700,
          padding: '8px 18px',
          transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)'
        },
        containedPrimary: {
          color: '#fff',
          background: 'linear-gradient(90deg, #ff8a65 0%, #ff6ec7 100%)',
          boxShadow: '0 10px 22px rgba(255, 110, 199, 0.3)',
          '&:hover': {
            background: 'linear-gradient(90deg, #ff7b56 0%, #ff5abf 100%)',
            boxShadow: '0 14px 28px rgba(255, 110, 199, 0.35)',
            transform: 'translateY(-1px)'
          }
        },
        outlined: {
          borderColor: 'rgba(138, 149, 180, 0.35)',
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(8px)',
          '&:hover': {
            borderColor: 'rgba(64, 181, 173, 0.45)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
          }
        }
      }
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          background: 'rgba(255, 255, 255, 0.74)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255, 255, 255, 0.75)',
          boxShadow: '0 10px 30px rgba(107, 94, 255, 0.08), 0 4px 14px rgba(15, 23, 42, 0.06)',
          transition: 'all 0.28s cubic-bezier(0.22, 1, 0.36, 1)'
        }
      }
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(248,248,255,0.9) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 12px 30px rgba(99, 102, 241, 0.08), 0 3px 10px rgba(15, 23, 42, 0.05)'
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.72)',
          color: brandColors.text.primary,
          borderBottom: '1px solid rgba(255,255,255,0.8)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 6px 20px rgba(99, 102, 241, 0.07)'
        }
      }
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 14,
            backgroundColor: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(8px)'
          }
        }
      }
    },
    
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600
        }
      }
    },
    
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.8)',
          boxShadow: '0 10px 24px rgba(99, 102, 241, 0.08)'
        }
      }
    },
    
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(246, 248, 255, 0.95)'
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.18s ease, transform 0.18s ease',
          '&:hover': {
            backgroundColor: 'rgba(242, 244, 255, 0.7)'
          }
        }
      }
    },
    
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: brandColors.text.primary
        }
      }
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 22,
          backgroundImage: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,246,255,0.96) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.88)',
          boxShadow: '0 28px 72px rgba(99, 102, 241, 0.2)',
          backdropFilter: 'blur(18px)'
        }
      }
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.78)',
          boxShadow: '8px 0 32px rgba(99,102,241,0.1)'
        }
      }
    },

    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.85)',
          boxShadow: '0 18px 44px rgba(99, 102, 241, 0.14)'
        }
      }
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          marginTop: 8,
          backdropFilter: 'blur(14px)'
        }
      }
    },

    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: '18px !important',
          '&:before': { display: 'none' },
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.78)',
          boxShadow: '0 10px 28px rgba(99, 102, 241, 0.07)',
          marginBottom: 12
        }
      }
    },

    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          borderRadius: 18
        }
      }
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 44,
          borderRadius: 999
        }
      }
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backdropFilter: 'blur(8px)'
        },
        standardInfo: {
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.22)'
        },
        standardSuccess: {
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.22)'
        },
        standardWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.28)'
        },
        standardError: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.22)'
        }
      }
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 6,
          backgroundColor: 'rgba(99, 102, 241, 0.12)'
        },
        bar: {
          borderRadius: 999
        }
      }
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(229, 231, 235, 0.75)'
        }
      }
    },

    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 14px 36px rgba(15, 23, 42, 0.15)',
          backdropFilter: 'blur(12px)'
        }
      }
    }
  }
});

// CSS animations
export const globalStyles = {
  '@keyframes fadeIn': {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  '@keyframes slideIn': {
    from: { transform: 'translateY(10px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  html: {
    scrollBehavior: 'smooth',
    background: brandColors.background.default,
  },
  body: {
    background: brandColors.background.gradient,
    backgroundAttachment: 'fixed',
  },
  '#root': {
    minHeight: '100vh',
    background: 'transparent',
  },
  '.App': {
    minHeight: '100vh',
  },
  '*': {
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  '::-webkit-scrollbar': {
    width: 8,
    height: 8,
  },
  '::-webkit-scrollbar-track': {
    background: 'rgba(238, 241, 255, 0.95)',
  },
  '::-webkit-scrollbar-thumb': {
    background: 'linear-gradient(180deg, #d8dcf7 0%, #bab7ec 100%)',
    borderRadius: 999,
  },
  '::-webkit-scrollbar-thumb:hover': {
    background: 'linear-gradient(180deg, #c7ccef 0%, #aaa6e6 100%)',
  },
};

export default theme;
