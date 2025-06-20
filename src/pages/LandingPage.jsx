import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Chip,
  Divider
} from '@mui/material';
import {
  Business,
  LocalShipping,
  QrCode,
  Analytics,
  Security,
  Support,
  CheckCircle,
  Star,
  ArrowForward,
  Dashboard,
  MobileFriendly,
  CloudSync,
  Payment,
  Group
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <QrCode fontSize="large" color="primary" />,
      title: 'Barcode Scanning',
      description: 'Scan gas cylinders with your mobile device for instant tracking and management.'
    },
    {
      icon: <LocalShipping fontSize="large" color="primary" />,
      title: 'Delivery Management',
      description: 'Track deliveries, manage routes, and ensure timely cylinder distribution.'
    },
    {
      icon: <Analytics fontSize="large" color="primary" />,
      title: 'Real-time Analytics',
      description: 'Monitor inventory levels, track usage patterns, and generate detailed reports.'
    },
    {
      icon: <MobileFriendly fontSize="large" color="primary" />,
      title: 'Mobile App',
      description: 'Full-featured mobile app for field workers with offline capabilities.'
    },
    {
      icon: <CloudSync fontSize="large" color="primary" />,
      title: 'Cloud Sync',
      description: 'Automatic synchronization across all devices and real-time data updates.'
    },
    {
      icon: <Security fontSize="large" color="primary" />,
      title: 'Multi-tenant Security',
      description: 'Enterprise-grade security with role-based access control and data isolation.'
    }
  ];

  const benefits = [
    'Reduce manual errors by 95%',
    'Improve delivery efficiency by 40%',
    'Real-time inventory tracking',
    'Automated billing and invoicing',
    'Comprehensive audit trails',
    'Mobile-first design for field workers',
    'Multi-location support',
    'Integration with existing systems'
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$99',
      period: '/month',
      features: [
        'Up to 1,000 cylinders',
        '5 users',
        'Basic reporting',
        'Mobile app access',
        'Email support'
      ],
      popular: false
    },
    {
      name: 'Professional',
      price: '$299',
      period: '/month',
      features: [
        'Up to 10,000 cylinders',
        '25 users',
        'Advanced analytics',
        'Delivery management',
        'Priority support',
        'Custom integrations'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      features: [
        'Unlimited cylinders',
        'Unlimited users',
        'Custom development',
        'Dedicated support',
        'White-label options',
        'API access'
      ],
      popular: false
    }
  ];

  return (
    <Box>
      {/* Navigation */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            LessAnnoyingScan
          </Typography>
          <Button color="inherit" onClick={() => navigate('/login')}>
            Login
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/register')}
            sx={{ ml: 2 }}
          >
            Get Started
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box sx={{ 
        bgcolor: 'primary.main', 
        color: 'white', 
        py: 8,
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Gas Cylinder Management Made Simple
              </Typography>
              <Typography variant="h5" paragraph sx={{ mb: 4, opacity: 0.9 }}>
                Streamline your gas cylinder operations with our comprehensive tracking, 
                delivery management, and analytics platform.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  size="large" 
                  onClick={() => navigate('/register')}
                  sx={{ 
                    bgcolor: 'white', 
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  Start Free Trial
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  sx={{ 
                    borderColor: 'white', 
                    color: 'white',
                    '&:hover': { borderColor: 'grey.300', bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  Watch Demo
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Dashboard sx={{ fontSize: 300, opacity: 0.3 }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Everything You Need to Manage Gas Cylinders
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" paragraph sx={{ mb: 6 }}>
          From barcode scanning to delivery management, we've got you covered
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Benefits Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" component="h2" gutterBottom>
                Why Choose LessAnnoyingScan?
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                Join hundreds of companies that trust us to manage their gas cylinder operations
              </Typography>
              <List>
                {benefits.map((benefit, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <CheckCircle color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={benefit} />
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>
                  Trusted by Industry Leaders
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} color="primary" />
                  ))}
                </Box>
                <Typography variant="body1" color="text.secondary">
                  "LessAnnoyingScan transformed our cylinder management process. 
                  We've reduced errors by 95% and improved delivery times significantly."
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
                  - John Smith, Operations Manager
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Simple, Transparent Pricing
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" paragraph sx={{ mb: 6 }}>
          Choose the plan that fits your business needs
        </Typography>
        
        <Grid container spacing={4} justifyContent="center">
          {pricingPlans.map((plan, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  position: 'relative',
                  transform: plan.popular ? 'scale(1.05)' : 'none',
                  border: plan.popular ? 2 : 1,
                  borderColor: plan.popular ? 'primary.main' : 'divider'
                }}
              >
                {plan.popular && (
                  <Chip 
                    label="Most Popular" 
                    color="primary" 
                    sx={{ 
                      position: 'absolute', 
                      top: -12, 
                      left: '50%', 
                      transform: 'translateX(-50%)',
                      zIndex: 1
                    }} 
                  />
                )}
                <CardContent sx={{ pt: plan.popular ? 4 : 2 }}>
                  <Typography variant="h4" component="h3" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ mb: 1 }}>
                    {plan.price}
                    <Typography component="span" variant="h6" color="text.secondary">
                      {plan.period}
                    </Typography>
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <List dense>
                    {plan.features.map((feature, featureIndex) => (
                      <ListItem key={featureIndex} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircle color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    variant={plan.popular ? "contained" : "outlined"} 
                    fullWidth
                    onClick={() => navigate('/register')}
                  >
                    Get Started
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Ready to Transform Your Gas Cylinder Operations?
          </Typography>
          <Typography variant="h6" paragraph sx={{ mb: 4, opacity: 0.9 }}>
            Start your free 7-day trial today. No credit card required.
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            onClick={() => navigate('/register')}
            sx={{ 
              bgcolor: 'white', 
              color: 'primary.main',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': { bgcolor: 'grey.100' }
            }}
          >
            Start Free Trial
            <ArrowForward sx={{ ml: 1 }} />
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: 'grey.900', color: 'white', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="space-between">
            <Grid item xs={12} sm={4}>
              <Typography variant="h6" gutterBottom>
                LessAnnoyingScan
              </Typography>
              <Typography variant="body2" color="grey.400">
                The complete gas cylinder management solution for modern businesses.
              </Typography>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
                Product
              </Typography>
              <Button sx={{ display: 'block', color: 'grey.400', textTransform: 'none', '&:hover': { color: 'white' } }} onClick={() => navigate('/#features')}>Features</Button>
              <Button sx={{ display: 'block', color: 'grey.400', textTransform: 'none', '&:hover': { color: 'white' } }} onClick={() => navigate('/pricing')}>Pricing</Button>
              <Button sx={{ display: 'block', color: 'grey.400', textTransform: 'none', '&:hover': { color: 'white' } }} onClick={() => navigate('/#mobile-app')}>Mobile App</Button>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
                Support
              </Typography>
              <Button sx={{ display: 'block', color: 'grey.400', textTransform: 'none', '&:hover': { color: 'white' } }} onClick={() => navigate('/documentation')}>Documentation</Button>
              <Button sx={{ display: 'block', color: 'grey.400', textTransform: 'none', '&:hover': { color: 'white' } }} onClick={() => navigate('/contact')}>Contact Us</Button>
              <Button sx={{ display: 'block', color: 'grey.400', textTransform: 'none', '&:hover': { color: 'white' } }} onClick={() => navigate('/privacy-policy')}>Privacy Policy</Button>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
                Legal
              </Typography>
              <Button sx={{ display: 'block', color: 'grey.400', textTransform: 'none', '&:hover': { color: 'white' } }} onClick={() => navigate('/terms-of-service')}>Terms of Service</Button>
            </Grid>
          </Grid>
          <Divider sx={{ my: 4, bgcolor: 'grey.700' }} />
          <Typography variant="body2" align="center" color="grey.400">
            © {new Date().getFullYear()} LessAnnoyingScan. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
} 