import { createTheme } from '@mui/material/styles';

// Brand colors
const brandColors = {
  primary: '#40B5AD', // Teal
  secondary: '#8B7BA8', // Purple
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  background: {
    default: '#F8FAFC',
    paper: '#FFFFFF',
    gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
  },
  text: {
    primary: '#1F2937',
    secondary: '#6B7280',
    disabled: '#9CA3AF'
  },
  divider: '#E5E7EB',
  border: '#E5E7EB'
};

// Common component styles
export const commonStyles = {
  // Cards
  card: {
    borderRadius: 12,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }
  },
  
  // Buttons
  primaryButton: {
    borderRadius: 8,
    textTransform: 'none',
    fontWeight: 600,
    padding: '10px 20px',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '&:hover': {
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }
  },
  
  secondaryButton: {
    borderRadius: 8,
    textTransform: 'none',
    fontWeight: 600,
    padding: '10px 20px',
    border: '2px solid',
    '&:hover': {
      backgroundColor: 'rgba(64, 181, 173, 0.08)'
    }
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
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
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
    backgroundColor: brandColors.background.paper,
    borderRadius: 12,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
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
    borderRadius: 8
  },
  
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
          transition: 'all 0.2s ease'
        },
        containedPrimary: {
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }
        }
      }
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          transition: 'all 0.3s ease'
        }
      }
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8
          }
        }
      }
    },
    
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600
        }
      }
    },
    
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          overflow: 'hidden'
        }
      }
    },
    
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.background.default
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
    }
  }
});

// CSS animations
export const globalStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideIn {
    from {
      transform: translateY(10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }
  
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: ${brandColors.background.default};
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${brandColors.text.disabled};
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: ${brandColors.text.secondary};
  }
`;

export default theme;
