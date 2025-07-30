import React from 'react';
import { Box, Typography, Button, Container, Grid, Card, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';

export default function LandingPage() {
  const navigate = useNavigate();
  const { profile, organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();

  const features = [
    {
      icon: <QrCodeScannerIcon sx={{ fontSize: 48, color: '#3B82F6' }} />,
      title: 'Barcode Scanning',
      description: `Scan ${assetConfig.assetTypePlural} instantly with any smartphone. No expensive hardware needed.`,
    },
    {
      icon: <PhoneIphoneIcon sx={{ fontSize: 48, color: '#10B981' }} />,
      title: 'Mobile-First',
      description: 'Built for field work. Access everything from your phone or tablet, anywhere.',
    },
    {
      icon: <CloudSyncIcon sx={{ fontSize: 48, color: '#F59E0B' }} />,
      title: 'Real-Time Sync',
      description: 'Instant updates across all devices. Your team always has the latest information.',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 48, color: '#8B5CF6' }} />,
      title: 'Quick Setup',
      description: 'Get started in minutes, not months. Simple onboarding process.',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 48, color: '#EF4444' }} />,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with 99.9% uptime guarantee.',
    },
    {
      icon: <CheckCircleIcon sx={{ fontSize: 48, color: '#84CC16' }} />,
      title: 'Easy to Use',
      description: 'Intuitive interface that your team will love. No training required.',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'white', 
        borderBottom: 1, 
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            py: 2 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {assetConfig.showAppIcon && assetConfig.appIcon && (
                <img 
                  src={assetConfig.appIcon}
                  alt={`${assetConfig.appName} Logo`}
                  style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 8,
                    objectFit: 'cover',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  onError={(e) => {
                    // Hide icon if not found
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <Typography variant="h5" fontWeight={700} sx={{ color: '#3B82F6' }}>
                {assetConfig.appName}
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={2}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/login')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Login
              </Button>
              <Button 
                variant="contained" 
                onClick={() => navigate('/register')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Start Free Trial
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography 
            variant="h1" 
            fontWeight={800} 
            sx={{ 
              mb: 3, 
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              lineHeight: 1.2,
              background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Modern Asset Management
            <br />
            Made Simple
          </Typography>
          
          <Typography 
            variant="h5" 
            color="text.secondary" 
            sx={{ mb: 6, maxWidth: 800, mx: 'auto', lineHeight: 1.6 }}
          >
            Track your {assetConfig.assetTypePlural}, manage customers, and streamline operations 
            with our mobile-first platform. Built for modern businesses.
          </Typography>
          
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={3} 
            justifyContent="center"
            sx={{ mb: 4 }}
          >
            <Button 
              variant="contained" 
              size="large"
              onClick={() => navigate('/register')}
              sx={{ 
                py: 2, 
                px: 6,
                fontSize: '1.2rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 3,
                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
                '&:hover': {
                  boxShadow: '0 12px 35px rgba(59, 130, 246, 0.4)',
                  transform: 'translateY(-2px)',
                }
              }}
            >
              Start Free Trial
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              onClick={() => navigate('/login')}
              sx={{ 
                py: 2, 
                px: 6,
                fontSize: '1.2rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 3,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                }
              }}
            >
              Sign In
            </Button>
          </Stack>
          
          <Typography variant="body1" color="text.secondary">
            ✅ 7-day free trial • ✅ No credit card required • ✅ Cancel anytime
          </Typography>
        </Box>

        {/* Demo Image Placeholder */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Box
            sx={{
              width: '100%',
              maxWidth: 800,
              height: 400,
              mx: 'auto',
              bgcolor: 'grey.100',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #e0e0e0'
            }}
          >
            <Typography variant="h6" color="text.secondary">
              📱 App Screenshot / Demo Video
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* Features Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 12 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
              Everything You Need
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Powerful features designed to make asset management effortless
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card sx={{ 
                  p: 4, 
                  height: '100%',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                  }
                }}>
                  <Box sx={{ mb: 3 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ bgcolor: '#3B82F6', color: 'white', py: 12 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
              Ready to Get Started?
            </Typography>
            <Typography variant="h6" sx={{ mb: 6, opacity: 0.9, maxWidth: 600, mx: 'auto' }}>
              Join hundreds of businesses already using {assetConfig.appName} to streamline their operations.
            </Typography>
            
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={3} 
              justifyContent="center"
            >
              <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/register')}
                sx={{ 
                  bgcolor: 'white',
                  color: '#3B82F6',
                  py: 2,
                  px: 6,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 3,
                  '&:hover': { 
                    bgcolor: '#f8fafc',
                    transform: 'translateY(-2px)',
                  }
                }}
              >
                Start Free Trial
              </Button>
              <Button 
                variant="outlined" 
                size="large"
                onClick={() => navigate('/contact')}
                sx={{ 
                  borderColor: 'white', 
                  color: 'white',
                  py: 2,
                  px: 6,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 3,
                  borderWidth: 2,
                  '&:hover': { 
                    borderWidth: 2,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    transform: 'translateY(-2px)',
                  }
                }}
              >
                Contact Sales
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1F2937', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid item xs={12} md={4}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: '#3B82F6' }}>
                {assetConfig.appName}
              </Typography>
              <Typography color="grey.400" sx={{ mb: 3 }}>
                Modern asset management platform built for today's businesses.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Product
              </Typography>
              <Stack spacing={1}>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  onClick={() => navigate('/pricing')}
                >
                  Pricing
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  onClick={() => navigate('/contact')}
                >
                  Contact
                </Button>
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Legal
              </Typography>
              <Stack spacing={1}>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  onClick={() => navigate('/privacy')}
                >
                  Privacy Policy
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  onClick={() => navigate('/terms')}
                >
                  Terms of Service
                </Button>
              </Stack>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 8, pt: 4, borderTop: 1, borderColor: 'grey.700', textAlign: 'center' }}>
            <Typography color="grey.400">
              © 2024 {assetConfig.appName}. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
} 