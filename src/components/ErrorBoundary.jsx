import logger from '../utils/logger';
import React from 'react';
import { Box, Button, Typography, Paper, Alert, Link, Fade, Chip } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon, Home as HomeIcon, Support as SupportIcon } from '@mui/icons-material';

/**
 * Global error boundary component to catch React errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and any error reporting service
    logger.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    // Reset the component state without reloading the page
    // This allows the app to recover gracefully
  };

  render() {
    if (this.state.hasError) {
      return (
        <Fade in timeout={500}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight="100vh"
            bgcolor="#f8fafc"
            p={3}
            sx={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 6,
                maxWidth: 500,
                textAlign: 'center',
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                position: 'relative',
                overflow: 'hidden',
                animation: 'slideUp 0.6s ease-out',
                '@keyframes slideUp': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              {/* Background decoration */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  bgcolor: 'rgba(239, 68, 68, 0.05)',
                  zIndex: 0
                }}
              />
              
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '50%',
                    bgcolor: 'rgba(239, 68, 68, 0.1)',
                    mb: 3,
                    animation: 'bounce 2s infinite ease-in-out',
                    '@keyframes bounce': {
                      '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
                      '40%': { transform: 'translateY(-10px)' },
                      '60%': { transform: 'translateY(-5px)' }
                    }
                  }}
                >
                  <ErrorIcon 
                    sx={{ 
                      fontSize: 48, 
                      color: '#ef4444'
                    }} 
                  />
                </Box>
                
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
                  Oops! Something went wrong
                </Typography>
                
                <Chip 
                  label="Error Code: REACT_BOUNDARY" 
                  size="small" 
                  color="error" 
                  variant="outlined"
                  sx={{ mb: 3 }}
                />
                
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
                  We encountered an unexpected error. Don't worry - your data is safe. Please try one of the options below or contact our support team if the issue persists.
                </Typography>

                <Box display="flex" flexDirection="column" gap={2} sx={{ mb: 4 }}>
                  <Box display="flex" gap={2} justifyContent="center">
                    <Button
                      variant="contained"
                      startIcon={<RefreshIcon />}
                      onClick={() => window.location.reload()}
                      sx={{ 
                        minWidth: 140,
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: 600
                      }}
                    >
                      Refresh Page
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<HomeIcon />}
                      onClick={() => window.location.href = '/'}
                      sx={{ 
                        minWidth: 120,
                        py: 1.5,
                        borderRadius: 2
                      }}
                    >
                      Go Home
                    </Button>
                  </Box>
                  
                  <Button
                    variant="text"
                    startIcon={<SupportIcon />}
                    onClick={() => window.open('mailto:support@scanified.com?subject=Error Report&body=' + encodeURIComponent(`Error: ${this.state.error?.toString() || 'Unknown error'}\n\nTime: ${new Date().toISOString()}\n\nUser Agent: ${navigator.userAgent}`))}
                    sx={{ 
                      color: 'text.secondary',
                      fontSize: '0.875rem'
                    }}
                  >
                    Report this error
                  </Button>
                </Box>

                <Box
                  sx={{
                    bgcolor: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.1)',
                    borderRadius: 2,
                    p: 2,
                    mb: 3
                  }}
                >
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500, mb: 1 }}>
                    💡 Quick Help
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try refreshing the page or clearing your browser cache. If you continue experiencing issues, our support team is available 24/7 at{' '}
                    <Link href="mailto:support@scanified.com" color="primary" sx={{ fontWeight: 500 }}>
                      support@scanified.com
                    </Link>
                  </Typography>
                </Box>

                {import.meta.env.DEV && this.state.error && (
                  <Alert severity="error" sx={{ mt: 3, textAlign: 'left' }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      🔧 Error Details (Development Mode):
                    </Typography>
                    <Typography variant="body2" component="pre" sx={{ 
                      fontSize: '0.75rem', 
                      overflow: 'auto',
                      maxHeight: 200,
                      bgcolor: 'grey.100',
                      p: 2,
                      borderRadius: 1,
                      border: '1px solid #e2e8f0',
                      fontFamily: 'monospace'
                    }}>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack && (
                        '\n\nComponent Stack:' + this.state.errorInfo.componentStack
                      )}
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Paper>
          </Box>
        </Fade>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 