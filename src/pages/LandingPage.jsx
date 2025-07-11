import React from 'react';
import { Box, Typography, Button, Container, Grid, Card, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import CloudIcon from '@mui/icons-material/Cloud';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <PhoneIphoneIcon sx={{ fontSize: 40, color: '#3B82F6' }} />,
      title: 'Mobile-First Design',
      description: 'Built for the field. Scan cylinders with any smartphone - no expensive hardware needed.',
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: '#10B981' }} />,
      title: 'AI-Powered Insights',
      description: 'Predictive maintenance alerts, usage analytics, and smart recommendations.',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 40, color: '#F59E0B' }} />,
      title: 'Setup in Minutes',
      description: 'Self-service onboarding. Start tracking cylinders today, not next quarter.',
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Hero Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        py: 12,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip 
                label="TrackAbout Alternative" 
                sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.2)', 
                  color: 'white',
                  mb: 3,
                  fontWeight: 600
                }} 
              />
              <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
                Gas Cylinder Tracking
                <br />
                <Box component="span" sx={{ color: '#FDE047' }}>
                  That Actually Works
                </Box>
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, lineHeight: 1.6 }}>
                Stop fighting with outdated software. LessAnnoyingScan is the modern, 
                intelligent alternative to TrackAbout that your team will actually love using.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  size="large"
                  sx={{ 
                    bgcolor: '#FDE047', 
                    color: '#1F2937',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    '&:hover': { bgcolor: '#FCD34D' }
                  }}
                  onClick={() => navigate('/register')}
                >
                  Start Free Trial
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  sx={{ 
                    borderColor: 'white', 
                    color: 'white',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    '&:hover': { borderColor: '#FDE047', color: '#FDE047' }
                  }}
                  onClick={() => navigate('/login')}
                >
                  See Demo
                </Button>
              </Box>
              <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
                ✓ No credit card required  ✓ Setup in 5 minutes  ✓ Cancel anytime
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                p: 4,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
                  Why Companies Switch from TrackAbout
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    'Modern UI that doesn\'t look like 2010',
                    'Setup in minutes, not months',
                    'Transparent pricing (no "call for quote")',
                    'AI-powered insights and automation',
                    'Superior mobile experience',
                    'No expensive hardware required'
                  ].map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon sx={{ mr: 2, color: '#10B981' }} />
                      <Typography>{item}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
        
        {/* Background decoration */}
        <Box sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          zIndex: 0
        }} />
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
            Everything TrackAbout Has,
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

      {/* Comparison Section */}
      <Box sx={{ bgcolor: 'white', py: 12 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
              LessAnnoyingScan vs TrackAbout
            </Typography>
            <Typography variant="h6" color="text.secondary">
              See why modern companies are making the switch
            </Typography>
          </Box>

          <Card sx={{ p: 4, border: '1px solid #e2e8f0' }}>
            <Grid container spacing={2}>
              <Grid item xs={6} md={4}>
                <Typography variant="h6" fontWeight={600}>
                  Feature
                </Typography>
              </Grid>
              <Grid item xs={3} md={4} sx={{ textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={600} color="primary">
                  LessAnnoyingScan
                </Typography>
              </Grid>
              <Grid item xs={3} md={4} sx={{ textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={600} color="text.secondary">
                  TrackAbout
                </Typography>
              </Grid>

              {comparison.map((item, index) => (
                <React.Fragment key={index}>
                  <Grid item xs={6} md={4} sx={{ py: 2, borderTop: '1px solid #f1f5f9' }}>
                    <Typography>{item.feature}</Typography>
                  </Grid>
                  <Grid item xs={3} md={4} sx={{ py: 2, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                    {item.us ? (
                      <CheckCircleIcon sx={{ color: '#10B981' }} />
                    ) : (
                      <Typography color="text.disabled">—</Typography>
                    )}
                  </Grid>
                  <Grid item xs={3} md={4} sx={{ py: 2, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                    {item.competitor ? (
                      <CheckCircleIcon sx={{ color: '#10B981' }} />
                    ) : (
                      <Typography color="text.disabled">—</Typography>
                    )}
                  </Grid>
                </React.Fragment>
              ))}
            </Grid>
          </Card>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
        color: 'white',
        py: 12
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
              Ready to Leave TrackAbout Behind?
            </Typography>
            <Typography variant="h6" sx={{ mb: 6, opacity: 0.9 }}>
              Join hundreds of companies who've already made the switch to modern cylinder tracking
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                size="large"
                sx={{ 
                  bgcolor: '#FDE047', 
                  color: '#1F2937',
                  fontWeight: 600,
                  px: 6,
                  py: 2,
                  fontSize: '1.1rem',
                  '&:hover': { bgcolor: '#FCD34D' }
                }}
                onClick={() => navigate('/register')}
              >
                Start Your Free Trial
              </Button>
              <Button 
                variant="outlined" 
                size="large"
                startIcon={<SupportAgentIcon />}
                sx={{ 
                  borderColor: 'white', 
                  color: 'white',
                  fontWeight: 600,
                  px: 6,
                  py: 2,
                  fontSize: '1.1rem',
                  '&:hover': { borderColor: '#FDE047', color: '#FDE047' }
                }}
                onClick={() => navigate('/contact')}
              >
                Talk to an Expert
              </Button>
            </Box>
            
            <Typography variant="body1" sx={{ mt: 4, opacity: 0.8 }}>
              🚀 Free migration assistance  •  📞 24/7 support  •  💰 30-day money-back guarantee
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
} 