import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';
import LoadingSpinner from './LoadingSpinner';
import MainLayout from './MainLayout';
import { Alert, Box, Button, Card, CardContent, Typography, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PaymentIcon from '@mui/icons-material/Payment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const ProtectedRoute = ({ children }) => {
  const { user, profile, organization, loading, trialExpired, signOut } = useAuth();
  const { config } = useAssetConfig();
  const location = useLocation();
  const navigate = useNavigate();

  // Log the state for debugging purposes.
  console.log('🛡️ ProtectedRoute DEBUG:', { 
    loading, 
    user: !!user, 
    profile: !!profile, 
    organization: !!organization,
    profileRole: profile?.role,
    organizationId: profile?.organization_id,
    trialExpired,
    currentPath: location.pathname
  });

  if (loading) {
    // Show a full-page loading spinner while auth state is being determined.
    console.log('🛡️ ProtectedRoute: LOADING - showing spinner');
    return <LoadingSpinner />;
  }

  if (!user) {
    // If the user is not authenticated, redirect them to the login page.
    console.log('🛡️ ProtectedRoute: NO USER - redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (trialExpired) {
    // Development bypass for trial expired check
    if (import.meta.env.DEV && location.search.includes('bypass-trial')) {
      console.log('Dev: Bypassing trial expired check via URL parameter');
      return children || <Outlet />;
    }
    
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        p: 3
      }}>
        <Card sx={{ maxWidth: 800, width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom align="center" color="error">
              Your Trial Has Expired
            </Typography>
            
            <Typography variant="body1" paragraph align="center" color="text.secondary">
              To continue using {config?.appName || 'Scanified'}, please choose one of the options below:
            </Typography>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              {/* Upgrade to Paid Plan */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%', bgcolor: 'primary.light', borderColor: 'primary.main' }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <PaymentIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                      Upgrade to Full Access
                    </Typography>
                    <Typography variant="body2" paragraph color="text.secondary">
                      Get unlimited access with our affordable monthly or yearly plans. 
                      Full features, no restrictions.
                    </Typography>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Starting at $29/month
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      size="large"
                      fullWidth
                      onClick={() => navigate('/billing')}
                      sx={{ mt: 2 }}
                    >
                      View Plans & Upgrade
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* Extend Trial */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <AccessTimeIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                      Extend Your Trial
                    </Typography>
                    <Typography variant="body2" paragraph color="text.secondary">
                      Need more time to evaluate? Extend your trial for 7 more days 
                      with a one-time payment.
                    </Typography>
                    <Typography variant="h6" color="warning.dark" gutterBottom>
                      $10 for 7 days
                    </Typography>
                    <Button 
                      variant="outlined" 
                      color="warning" 
                      size="large"
                      fullWidth
                      onClick={() => navigate('/billing?action=extend-trial')}
                      sx={{ mt: 2 }}
                    >
                      Extend Trial
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Questions? <Button size="small" onClick={() => navigate('/contact')}>Contact Support</Button>
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  sx={{ mr: 2 }}
                >
                  Logout
                </Button>
                {import.meta.env.DEV && (
                  <Button 
                    variant="text" 
                    size="small" 
                    color="warning"
                    onClick={async () => {
                      // Development bypass - clear trial expired state and go to home
                      console.log('Dev: Bypassing trial check');
                      navigate('/home');
                    }}
                  >
                    Dev: Bypass Trial Check
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (user && !profile) {
    // This can happen for a brief moment while the profile is loading.
    // Or if profile creation failed. Show loading spinner.
    console.log("🛡️ ProtectedRoute: USER BUT NO PROFILE - showing spinner");
    return <LoadingSpinner />;
  }

  if (user && profile && !organization) {
    // Platform owners don't need an organization
    if (profile.role === 'owner') {
      console.log('🛡️ ProtectedRoute: OWNER WITHOUT ORG - allowing access');
      return (
        <MainLayout profile={profile}>
          {children || <Outlet />}
        </MainLayout>
      );
    }
    
    // Only redirect to organization setup for routes that require an organization
    // Allow access to public pages and registration pages
    const publicRoutes = ['/', '/landing', '/login', '/register', '/setup', '/contact', '/pricing', '/faq', '/reviews', '/privacy-policy', '/terms-of-service', '/documentation'];
    const isPublicRoute = publicRoutes.includes(location.pathname);
    
    console.log('🛡️ ProtectedRoute: USER WITHOUT ORG - checking if public route:', { isPublicRoute, path: location.pathname });
    
    if (!isPublicRoute && location.pathname !== '/register' && location.pathname !== '/setup') {
      console.log('🛡️ ProtectedRoute: REDIRECTING TO REGISTER - user needs organization');
      return <Navigate to="/register" replace />;
    }
    console.log('🛡️ ProtectedRoute: PUBLIC ROUTE - allowing access without org');
    return children || <Outlet />;
  }

  if (user && profile && organization) {
    // If the user is fully authenticated and has an organization,
    // render the requested page within the main layout, passing the profile.
    console.log('🛡️ ProtectedRoute: SUCCESS - rendering with MainLayout');
    return (
      <MainLayout profile={profile}>
        {children || <Outlet />}
      </MainLayout>
    );
  }

  // As a fallback, if the state is somehow inconsistent, redirect to login.
  console.warn("🛡️ ProtectedRoute: FALLBACK - inconsistent auth state, redirecting to login");
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute; 