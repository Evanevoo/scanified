import React from 'react';
import { Box, Typography, Button, Container, Grid, Card, Stack, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';
import AnimatedSection from '../components/AnimatedSection';
import CTABanner from '../components/CTABanner';

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
              onClick={() => navigate('/create-organization')}
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
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            ✅ 7-day free trial • ✅ No credit card required • ✅ Cancel anytime
          </Typography>

          {/* Getting Started Options */}
          <Box sx={{ 
            maxWidth: 800, 
            mx: 'auto', 
            p: 4, 
            bgcolor: 'rgba(59, 130, 246, 0.05)', 
            borderRadius: 3, 
            border: '1px solid rgba(59, 130, 246, 0.1)',
            mb: 4
          }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, textAlign: 'center' }}>
              Two Ways to Get Started
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" fontWeight={600} color="primary.main" sx={{ mb: 1 }}>
                    🏢 Create Your Organization
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Start your own organization and invite team members. Perfect for business owners and managers.
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={() => navigate('/create-organization')}
                    sx={{ textTransform: 'none' }}
                  >
                    Create Organization
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" fontWeight={600} color="success.main" sx={{ mb: 1 }}>
                    🔗 Join with Code/Link
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Received an invitation link or join code? Sign in to connect to your organization.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => navigate('/login')}
                    sx={{ textTransform: 'none' }}
                  >
                    Sign In to Join
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* Key Benefits Section */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Grid container spacing={4} sx={{ maxWidth: 800, mx: 'auto' }}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ 
                p: 3, 
                borderRadius: 3, 
                bgcolor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.1)'
              }}>
                <Typography variant="h6" fontWeight={600} color="primary.main" sx={{ mb: 1 }}>
                  Mobile-First
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Scan and track assets from any smartphone or tablet
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ 
                p: 3, 
                borderRadius: 3, 
                bgcolor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.1)'
              }}>
                <Typography variant="h6" fontWeight={600} color="success.main" sx={{ mb: 1 }}>
                  Real-Time Sync
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Instant updates across all devices and team members
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ 
                p: 3, 
                borderRadius: 3, 
                bgcolor: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.1)'
              }}>
                <Typography variant="h6" fontWeight={600} color="warning.main" sx={{ mb: 1 }}>
                  Easy Setup
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Get started in minutes with simple onboarding
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Interactive Demo Preview */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Box
            sx={{
              width: '100%',
              maxWidth: 900,
              mx: 'auto',
              position: 'relative',
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              p: 4,
            }}
          >
            <Box sx={{ 
              bgcolor: 'white', 
              borderRadius: 3, 
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <QrCodeScannerIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Scan, Track, Manage
                </Typography>
              </Box>
              
              <Grid container spacing={2} sx={{ width: '100%', maxWidth: 600 }}>
                <Grid item xs={4}>
                  <Box sx={{ 
                    bgcolor: 'grey.100', 
                    borderRadius: 2, 
                    p: 2, 
                    textAlign: 'center',
                    border: '2px solid #3B82F6',
                  }}>
                    <PhoneIphoneIcon sx={{ color: 'primary.main', mb: 1 }} />
                    <Typography variant="caption" display="block">
                      Mobile Scanning
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ 
                    bgcolor: 'grey.100', 
                    borderRadius: 2, 
                    p: 2, 
                    textAlign: 'center',
                    border: '2px solid #10B981',
                  }}>
                    <CloudSyncIcon sx={{ color: 'success.main', mb: 1 }} />
                    <Typography variant="caption" display="block">
                      Real-time Sync
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ 
                    bgcolor: 'grey.100', 
                    borderRadius: 2, 
                    p: 2, 
                    textAlign: 'center',
                    border: '2px solid #F59E0B',
                  }}>
                    <SpeedIcon sx={{ color: 'warning.main', mb: 1 }} />
                    <Typography variant="caption" display="block">
                      Instant Reports
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Button
                variant="contained"
                size="small"
                startIcon={<QrCodeScannerIcon />}
                sx={{ mt: 2 }}
                onClick={() => navigate('/demo')}
              >
                Try Interactive Demo
              </Button>
            </Box>
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

      {/* Why Choose Us Section */}
      <Box sx={{ py: 12 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
              Why Choose Scanified?
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Built specifically for modern businesses that need reliable, scalable asset management
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                p: 4, 
                height: '100%',
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <QrCodeScannerIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                  <Typography variant="h5" fontWeight={600}>
                    No Expensive Hardware
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Use any smartphone or tablet to scan barcodes and QR codes. No need for expensive handheld scanners or specialized equipment.
                </Typography>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                p: 4, 
                height: '100%',
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <CloudSyncIcon sx={{ fontSize: 32, color: 'success.main' }} />
                  <Typography variant="h5" fontWeight={600}>
                    Real-Time Collaboration
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Your entire team sees updates instantly. No more waiting for data to sync or wondering if information is current.
                </Typography>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                p: 4, 
                height: '100%',
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <SpeedIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                  <Typography variant="h5" fontWeight={600}>
                    Quick Implementation
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Get started in minutes, not months. Simple setup process with no complex integrations or lengthy training required.
                </Typography>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                p: 4, 
                height: '100%',
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <SecurityIcon sx={{ fontSize: 32, color: 'error.main' }} />
                  <Typography variant="h5" fontWeight={600}>
                    Enterprise Security
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Built with enterprise-grade security. Your data is protected with encryption, secure authentication, and regular backups.
                </Typography>
              </Card>
            </Grid>
          </Grid>
          
          {/* Trust Indicators */}
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              Built for reliability and security
            </Typography>
            <Grid container spacing={3} alignItems="center" justifyContent="center">
              {['Cloud-Based', 'Mobile-First', 'Real-Time Sync', 'Secure Authentication', 'Regular Backups'].map((feature, index) => (
                <Grid item key={index}>
                  <Box sx={{ 
                    bgcolor: 'grey.100', 
                    px: 3, 
                    py: 1.5, 
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                  }}>
                    <Typography variant="body2" fontWeight={600} color="text.secondary">
                      {feature}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <CTABanner 
        title="Ready to Transform Your Asset Management?"
        subtitle={`Create your organization today and see how ${assetConfig.appName} can transform your asset management.`}
        primaryAction="Create Organization"
        secondaryAction="Contact Sales"
        primaryActionUrl="/create-organization"
        secondaryActionUrl="/contact"
        variant="gradient"
        showBadges={true}
      />

      {/* Footer */}
      <Box sx={{ bgcolor: '#1F2937', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid item xs={12} md={4}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: '#3B82F6' }}>
                {assetConfig.appName}
              </Typography>
              <Typography color="grey.400" sx={{ mb: 3, lineHeight: 1.6 }}>
                Modern asset management platform built for today's businesses. Streamline your operations with our mobile-first solution.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ 
                    borderColor: 'grey.600', 
                    color: 'grey.300',
                    '&:hover': { 
                      borderColor: 'primary.main', 
                      color: 'primary.main' 
                    }
                  }}
                  onClick={() => navigate('/demo')}
                >
                  Free Demo
                </Button>
                <Button 
                  variant="contained" 
                  size="small"
                  sx={{ 
                    bgcolor: 'primary.main',
                    '&:hover': { 
                      bgcolor: 'primary.dark' 
                    }
                  }}
                  onClick={() => navigate('/create-organization')}
                >
                  Create Organization
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Product
              </Typography>
              <Stack spacing={1}>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/features')}
                >
                  Features
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/pricing')}
                >
                  Pricing
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/demo')}
                >
                  Demo
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/integrations')}
                >
                  Integrations
                </Button>
              </Stack>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Resources
              </Typography>
              <Stack spacing={1}>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/documentation')}
                >
                  Documentation
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/support')}
                >
                  Help Center
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/blog')}
                >
                  Blog
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/faq')}
                >
                  FAQ
                </Button>
              </Stack>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Company
              </Typography>
              <Stack spacing={1}>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/about')}
                >
                  About Us
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/contact')}
                >
                  Contact
                </Button>

                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/reviews')}
                >
                  Reviews
                </Button>
              </Stack>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Legal
              </Typography>
              <Stack spacing={1}>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/privacy-policy')}
                >
                  Privacy Policy
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/terms-of-service')}
                >
                  Terms of Service
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/security')}
                >
                  Security
                </Button>
                <Button 
                  color="inherit" 
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400', p: 0 }}
                  onClick={() => navigate('/security')}
                >
                  Compliance
                </Button>
              </Stack>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 6, borderColor: 'grey.700' }} />
          
          <Grid container spacing={4} alignItems="center" justifyContent="space-between">
            <Grid item xs={12} md={6}>
              <Typography color="grey.400" variant="body2">
                © 2024 {assetConfig.appName}. All rights reserved. | Built with ❤️ for modern businesses
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' }, gap: 2 }}>
                <Typography variant="body2" color="grey.400" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon sx={{ fontSize: 16 }} />
                  Secure & Reliable
                </Typography>
                <Typography variant="body2" color="grey.400" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16 }} />
                  Cloud-Based
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Contact Info */}
          <Box sx={{ mt: 6, pt: 4, borderTop: 1, borderColor: 'grey.700', textAlign: 'center' }}>
            <Typography variant="body2" color="grey.400" sx={{ mb: 2 }}>
              Questions? We're here to help.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center" alignItems="center">
              <Typography variant="body2" color="grey.300">
                📧 support@scanified.com
              </Typography>
              <Typography variant="body2" color="grey.300">
                💬 Available for support
              </Typography>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
} 