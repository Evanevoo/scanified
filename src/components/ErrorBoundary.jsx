import React from 'react';
import { Box, Button, Typography, Paper, Alert, Link } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

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
    console.error('Error caught by boundary:', error, errorInfo);
    
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
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          bgcolor="#f8fafc"
          p={3}
        >
          <Paper
            elevation={0}
            sx={{
              p: 6,
              maxWidth: 500,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px solid #e2e8f0'
            }}
          >
            <ErrorIcon 
              sx={{ 
                fontSize: 64, 
                color: '#ef4444', 
                mb: 3,
                opacity: 0.8
              }} 
            />
            
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1f2937' }}>
              Oops! Something went wrong
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              We encountered an unexpected error. Don't worry - your data is safe. Please try refreshing the page or contact our support team if the issue persists.
            </Typography>

            <Box display="flex" gap={2} justifyContent="center" sx={{ mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
                sx={{ 
                  minWidth: 140,
                  py: 1.5,
                  borderRadius: 2
                }}
              >
                Refresh Page
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => window.history.back()}
                sx={{ 
                  minWidth: 120,
                  py: 1.5,
                  borderRadius: 2
                }}
              >
                Go Back
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Need help? Contact our support team at{' '}
              <Link href="mailto:support@lessannoyingscan.com" color="primary">
                support@lessannoyingscan.com
              </Link>
            </Typography>

            {import.meta.env.DEV && this.state.error && (
              <Alert severity="error" sx={{ mt: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Error Details (Development):
                </Typography>
                <Typography variant="body2" component="pre" sx={{ 
                  fontSize: '0.75rem', 
                  overflow: 'auto',
                  maxHeight: 200,
                  bgcolor: 'grey.100',
                  p: 1,
                  borderRadius: 1
                }}>
                  {this.state.error.toString()}
                </Typography>
              </Alert>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 