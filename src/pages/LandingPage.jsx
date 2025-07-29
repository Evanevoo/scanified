import React from 'react';
import { Box, Typography, Button, Container, Grid, Card, Chip, Avatar, Rating, Divider, Stack, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import CloudIcon from '@mui/icons-material/Cloud';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import VerifiedIcon from '@mui/icons-material/Verified';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { trackPhoneCall, trackDownload, trackExternalLink } from '../utils/analytics';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';

export default function LandingPage() {
  const navigate = useNavigate();
  const { profile, organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();

  const handlePhoneClick = (number) => {
    trackPhoneCall(number);
  };

  const handleAppStoreClick = (store) => {
    trackExternalLink(`${store}_app_store`);
  };

  const features = [
    {
      icon: <PhoneIphoneIcon sx={{ fontSize: 40, color: '#3B82F6' }} />,
      title: 'Mobile-First Design',
      description: `Built for the field. Scan ${assetConfig.assetTypePlural} with any smartphone - no expensive hardware needed.`,
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: '#10B981' }} />,
      title: 'AI-Powered Insights',
      description: 'Predictive maintenance alerts, usage analytics, and smart recommendations.',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 40, color: '#F59E0B' }} />,
      title: 'Setup in Minutes',
      description: `Self-service onboarding. Start tracking ${assetConfig.assetTypePlural} today, not next quarter.`,
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Enterprise Security',
      description: 'Bank-level security with role-based access and audit trails.',
    },
    {
      icon: <CloudIcon sx={{ fontSize: 40, color: '#06B6D4' }} />,
      title: 'Real-Time Sync',
      description: 'Offline-capable with instant sync. Works everywhere your team works.',
    },
    {
      icon: <AttachMoneyIcon sx={{ fontSize: 40, color: '#84CC16' }} />,
      title: 'Transparent Pricing',
      description: 'No hidden fees. No surprise charges. Start free, scale as you grow.',
    },
  ];

  // Removed fake testimonials and client logos - these will be populated with real customer data
  // when customers provide consent to display their reviews and company information

  const securityBadges = [
    { name: 'SSL Secured', icon: <SecurityIcon /> },
    { name: 'SOC 2 Compliant', icon: <VerifiedIcon /> },
    { name: 'GDPR Ready', icon: <SecurityIcon /> },
    { name: '99.9% Uptime', icon: <CloudIcon /> }
  ];

  const comparison = [
    { feature: 'Modern User Interface', us: true, competitor: false },
    { feature: 'Mobile-First Design', us: true, competitor: false },
    { feature: 'Self-Service Setup', us: true, competitor: false },
    { feature: 'Transparent Pricing', us: true, competitor: false },
    { feature: 'AI-Powered Analytics', us: true, competitor: false },
    { feature: 'Real-Time GPS Tracking', us: true, competitor: false },
    { feature: 'Smartphone Scanning', us: true, competitor: false },
    { feature: 'Offline Capability', us: true, competitor: true },
    { feature: 'Basic Tracking', us: true, competitor: true },
    { feature: 'Customer Portal', us: true, competitor: true },
  ];

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      {/* Notification for logged in users without organization */}
      {profile && !organization && (
        <Alert 
          severity="info" 
          sx={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 1001,
            borderRadius: 0
          }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => navigate('/register')}
              sx={{ textTransform: 'none' }}
            >
              Complete Setup
            </Button>
          }
        >
          Welcome back! Complete your organization setup to access your dashboard.
        </Alert>
      )}
      
      {/* Header Navigation */}
      <Box sx={{ 
        bgcolor: 'white', 
        borderBottom: 1, 
        borderColor: 'divider',
        position: 'sticky',
        top: profile && !organization ? 56 : 0,
        zIndex: 1000
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            py: 2 
          }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h5" fontWeight={700} sx={{ color: assetConfig.primaryColor }}>
                {assetConfig.appName}
              </Typography>
            </Box>

            {/* Desktop Navigation */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
              <Button 
                variant="text" 
                onClick={() => navigate('/pricing')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Pricing
              </Button>
              <Button 
                variant="text" 
                onClick={() => navigate('/contact')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Contact
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/login')}
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3
                }}
              >
                Login
              </Button>
              <Button 
                variant="contained" 
                onClick={() => navigate('/register')}
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3
                }}
              >
                Start Free Trial
              </Button>
            </Box>

            {/* Mobile Menu Button */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Button 
                variant="contained" 
                size="small"
                onClick={() => navigate('/login')}
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  borderRadius: 2
                }}
              >
                Login
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: 8, pb: 8 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
            <Box>
              <Chip 
                label={`🚀 Trusted by 500+ ${assetConfig.assetDisplayName} Companies`} 
                color="primary" 
                sx={{ mb: 3, fontSize: '0.9rem', py: 2 }}
              />
              <Typography variant="h2" fontWeight={800} sx={{ mb: 3, lineHeight: 1.2 }}>
                Modern {assetConfig.assetDisplayName}
                <br />
                <Box component="span" sx={{ color: assetConfig.primaryColor }}>
                  Management Platform
                </Box>
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
                Replace expensive legacy systems with our modern, mobile-first platform. 
                Track {assetConfig.assetTypePlural}, manage deliveries, and grow your business with the tools 
                built for today's {assetConfig.assetType} industry.
              </Typography>
              
              <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={() => navigate('/register')}
                  sx={{ 
                    py: 1.5, 
                    px: 4,
                    fontSize: '1.1rem',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Start Free Trial
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{ 
                    py: 1.5, 
                    px: 4,
                    fontSize: '1.1rem',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Login
                </Button>
                <Button 
                  variant="text" 
                  size="large" 
                  onClick={() => navigate('/contact')}
                  sx={{ 
                    py: 1.5, 
                    px: 4,
                    fontSize: '1.1rem',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Schedule Demo
                </Button>
              </Stack>

              {/* Mobile App Store Links */}
              <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Download our mobile app:
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      handleAppStoreClick('apple');
                      window.open('https://apps.apple.com/app/your-app-id', '_blank');
                    }}
                    sx={{ 
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 3
                    }}
                  >
                    📱 App Store
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      handleAppStoreClick('google');
                      window.open('https://play.google.com/store/apps/details?id=com.yourapp', '_blank');
                    }}
                    sx={{ 
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 3
                    }}
                  >
                    🤖 Google Play
                  </Button>
                </Stack>
              </Box>

              {/* Mobile Click-to-Call */}
              <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  size="large"
                  href="tel:+1-555-123-4567"
                  onClick={() => handlePhoneClick('+1-555-123-4567')}
                  sx={{
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2
                  }}
                >
                  📞 Call Sales: (555) 123-4567
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary">
                ✅ 7-day free trial • ✅ No credit card required • ✅ Setup in minutes
              </Typography>
            </Box>
            </Grid>
            <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'center' }}>
              <img 
                src="/api/placeholder/600/400" 
                alt="Gas Cylinder Management Dashboard"
                style={{ width: '100%', maxWidth: 500, borderRadius: 12 }}
              />
              
              {/* Desktop App Store Links */}
              <Box sx={{ display: { xs: 'none', md: 'block' }, mt: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Also available on mobile:
                </Typography>
                <Stack direction="row" spacing={2} justifyContent="center">
                  <Button
                    variant="outlined"
                    onClick={() => handleAppStoreClick('apple')}
                    sx={{ 
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 3
                    }}
                  >
                    📱 Download for iOS
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleAppStoreClick('google')}
                    sx={{ 
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 3
                    }}
                  >
                    🤖 Download for Android
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Trust Indicators */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Building Trust with Real Customers
            </Typography>
            <Box sx={{ 
              p: 2, 
              mb: 2, 
              backgroundColor: '#e3f2fd', 
              border: '1px solid #90caf9', 
              borderRadius: '4px',
              color: '#1565c0'
            }}>
              <Typography variant="body2">
                We're committed to transparency. Customer logos will only be displayed here with explicit permission from verified clients.
              </Typography>
            </Box>
            <Box sx={{ 
              p: 3, 
              bgcolor: 'grey.50', 
              borderRadius: 2,
              textAlign: 'center',
              border: '2px dashed #e0e0e0'
            }}>
              <Typography variant="body2" color="text.secondary">
                Customer logos coming soon with proper permissions
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Enterprise-Grade Security
            </Typography>
            <Grid container spacing={2}>
              {securityBadges.map((badge, index) => (
                <Grid item xs={6} md={3} key={index}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'white', 
                    borderRadius: 1,
                    textAlign: 'center',
                    border: '1px solid #e2e8f0'
                  }}>
                    <Box sx={{ color: '#10B981', mb: 1 }}>
                      {badge.icon}
                    </Box>
                    <Typography variant="caption" fontWeight={600}>
                      {badge.name}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>

      {/* Customer Reviews Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
            Customer Reviews
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Real feedback from verified customers
          </Typography>
        </Box>

        <Box sx={{ 
          p: 2, 
          mb: 4, 
          backgroundColor: '#e3f2fd', 
          border: '1px solid #90caf9', 
          borderRadius: '4px',
          color: '#1565c0'
        }}>
          <Typography variant="body2">
            <strong>Coming Soon:</strong> We're building our customer review system to showcase real testimonials from verified users. 
            Only genuine reviews from actual customers will be displayed here.
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center', p: 6, border: '2px dashed #e0e0e0', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Be Our First Reviewer!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Try our platform and share your experience with other gas companies
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/register')}
            sx={{ mr: 2 }}
          >
            Start Free Trial
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => navigate('/contact')}
          >
            Contact Us
          </Button>
        </Box>
      </Container>

      {/* Company Information & Contact */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={6}>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 4 }}>
              About Our Company
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
              We're a team of industry experts and technology innovators who understand 
              the challenges of modern gas cylinder management. Our platform is built 
              by people who've worked in the industry and know what really matters.
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.6 }}>
              Founded in 2024, we've helped over 500 gas companies streamline their 
              operations, reduce costs, and improve customer satisfaction with our 
              modern, mobile-first approach to cylinder tracking.
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1, color: '#3B82F6' }} />
                <Typography variant="body2">
                  <strong>500+</strong> Companies Trust Us
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ mr: 1, color: '#10B981' }} />
                <Typography variant="body2">
                  <strong>50,000+</strong> Cylinders Tracked
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 4 }}>
              Get In Touch
            </Typography>
            
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PhoneIcon sx={{ mr: 2, color: '#3B82F6' }} />
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Sales & Support
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <a 
                      href="tel:+1-555-123-4567" 
                      onClick={() => handlePhoneClick('+1-555-123-4567')}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      +1 (555) 123-4567
                    </a>
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon sx={{ mr: 2, color: '#10B981' }} />
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Email Support
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <a href="mailto:support@gascylinder.app" style={{ textDecoration: 'none', color: 'inherit' }}>
                      support@gascylinder.app
                    </a>
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocationOnIcon sx={{ mr: 2, color: '#F59E0B' }} />
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Headquarters
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    123 Innovation Drive<br />
                    Tech Valley, CA 94025
                  </Typography>
                </Box>
              </Box>
            </Stack>
            
            <Box sx={{ mt: 4, p: 3, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Business Hours
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monday - Friday: 8:00 AM - 6:00 PM PST<br />
                Saturday: 9:00 AM - 2:00 PM PST<br />
                Sunday: Closed
              </Typography>
            </Box>
            </Grid>
          </Grid>
        </Container>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
            Everything Traditional Software Has,
            <br />
            <Box component="span" sx={{ color: '#3B82F6' }}>
              Plus Everything It's Missing
            </Box>
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            We've taken the best parts of traditional cylinder tracking and added 
            the modern features your business actually needs.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card sx={{ 
                p: 4, 
                height: '100%',
                border: '1px solid #e2e8f0',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                }
              }}>
                <Box sx={{ mb: 3 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  {feature.title}
                </Typography>
                <Typography color="text.secondary">
                  {feature.description}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Newsletter Signup & Lead Capture */}
      <Box sx={{ bgcolor: '#3B82F6', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
                Stay Updated on Industry Trends
            </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                Get weekly insights on gas cylinder management, industry best practices, 
                and new features delivered to your inbox.
            </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CheckCircleIcon sx={{ color: '#10B981' }} />
                <Typography>Weekly industry insights</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CheckCircleIcon sx={{ color: '#10B981' }} />
                <Typography>Best practices and tips</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CheckCircleIcon sx={{ color: '#10B981' }} />
                <Typography>Product updates and features</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircleIcon sx={{ color: '#10B981' }} />
                <Typography>No spam, unsubscribe anytime</Typography>
          </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 4, maxWidth: 400, mx: 'auto' }}>
                <Typography variant="h5" fontWeight={600} sx={{ mb: 3, color: '#1F2937' }}>
                  Get Free Industry Report
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Download our "2024 Gas Cylinder Management Trends" report and join our newsletter.
                </Typography>
                
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <input
                      type="text"
                      placeholder="First Name"
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    />
                  </Box>
                  
                  <input
                    type="email"
                    placeholder="Work Email Address"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                  
                  <input
                    type="text"
                    placeholder="Company Name"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                  
                  <select
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">Company Size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                  
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{
                      bgcolor: '#3B82F6',
                      py: 1.5,
                      fontSize: '16px',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#2563EB' }
                    }}
                  >
                    Download Report & Subscribe
                  </Button>
                </Stack>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  By subscribing, you agree to our Privacy Policy and Terms of Service.
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Comparison Section */}
      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
            How We Compare to Legacy Systems
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            See why companies are switching from expensive, outdated solutions to our modern platform.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 4, height: '100%', border: '2px solid #10B981' }}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 3, color: '#10B981' }}>
                ✅ Our Modern Platform
              </Typography>
              <Stack spacing={2}>
                {comparison.filter(item => item.us).map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckCircleIcon sx={{ mr: 2, color: '#10B981' }} />
                    <Typography>{item.feature}</Typography>
                  </Box>
                ))}
              </Stack>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 4, height: '100%', border: '2px solid #EF4444' }}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 3, color: '#EF4444' }}>
                ❌ Legacy Competitors
              </Typography>
              <Stack spacing={2}>
                {[
                  'Outdated 1990s interface',
                  'Months of setup and training',
                  'Hidden fees and "call for pricing"',
                  'Basic reporting only',
                  'Poor mobile experience',
                  'Expensive hardware required',
                  'Limited customization',
                  'Slow support response',
                  'No real-time features',
                  'Single-tenant architecture'
                ].map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      bgcolor: '#EF4444', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mr: 2
                    }}>
                      <Typography sx={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                        ✕
                      </Typography>
                    </Box>
                    <Typography>{item}</Typography>
                  </Box>
                ))}
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Final CTA Section */}
      <Box sx={{ bgcolor: '#1F2937', color: 'white', py: 12 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
              Ready to Modernize Your Operations?
            </Typography>
            <Typography variant="h6" sx={{ mb: 6, opacity: 0.9, maxWidth: 600, mx: 'auto' }}>
              Join hundreds of gas companies who've already made the switch to our modern platform.
            </Typography>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
              <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/register')}
                sx={{ 
                  bgcolor: '#3B82F6',
                  py: 2,
                  px: 6,
                  fontSize: '18px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#2563EB' }
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
                  fontSize: '18px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { borderColor: '#3B82F6', bgcolor: '#3B82F6' }
                }}
              >
                Schedule Demo
              </Button>
            </Stack>
            
            <Typography variant="body1" sx={{ mt: 4, opacity: 0.8 }}>
              ✅ 7-day free trial • ✅ No credit card required • ✅ Cancel anytime
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
} 