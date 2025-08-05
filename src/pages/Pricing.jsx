import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  Fade,
  Zoom,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  Rocket as RocketIcon,
  Support as SupportIcon,
  Security as SecurityIcon,
  Api as ApiIcon,
  People as PeopleIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  CloudQueue as CloudIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small businesses just getting started',
    monthlyPrice: 49,
    yearlyPrice: 39,
    icon: <RocketIcon />,
    color: '#10B981',
    popular: false,
    features: [
      { text: 'Up to 100 assets', included: true },
      { text: 'Up to 3 users', included: true },
      { text: 'Mobile app access', included: true },
      { text: 'Basic reporting', included: true },
      { text: 'Email support', included: true },
      { text: 'Data export', included: true },
      { text: 'API access', included: false },
      { text: 'Custom branding', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Priority support', included: false }
    ],
    highlights: [
      'Quick setup',
      'No credit card required',
      '7-day free trial'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing businesses that need more power',
    monthlyPrice: 149,
    yearlyPrice: 119,
    icon: <TrendingUpIcon />,
    color: '#3B82F6',
    popular: true,
    features: [
      { text: 'Up to 1,000 assets', included: true },
      { text: 'Up to 10 users', included: true },
      { text: 'Mobile app access', included: true },
      { text: 'Advanced reporting', included: true },
      { text: 'Priority email support', included: true },
      { text: 'Data export', included: true },
      { text: 'API access', included: true },
      { text: 'Custom branding', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Phone support', included: true }
    ],
    highlights: [
      'Most popular choice',
      'Best value for money',
      'Free onboarding session'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with complex needs',
    monthlyPrice: 'Custom',
    yearlyPrice: 'Custom',
    icon: <BusinessIcon />,
    color: '#7C3AED',
    popular: false,
    features: [
      { text: 'Unlimited assets', included: true },
      { text: 'Unlimited users', included: true },
      { text: 'Mobile app access', included: true },
      { text: 'Custom reports', included: true },
      { text: '24/7 phone support', included: true },
      { text: 'Data export', included: true },
      { text: 'Full API access', included: true },
      { text: 'White labeling', included: true },
      { text: 'Predictive analytics', included: true },
      { text: 'Dedicated account manager', included: true }
    ],
    highlights: [
      'Custom implementation',
      'SLA guarantee',
      'On-premise option available'
    ]
  }
];

const additionalFeatures = [
  {
    category: 'All Plans Include',
    icon: <CheckIcon />,
    features: [
      'Real-time synchronization',
      'Secure cloud storage',
      'Automated backups',
      'Mobile & web access',
      'Barcode scanning',
      'Customer management',
      'Basic integrations',
      'SSL encryption'
    ]
  },
  {
    category: 'Support Options',
    icon: <SupportIcon />,
    features: [
      'Knowledge base access',
      'Video tutorials',
      'Community forum',
      'Email support (business hours)',
      'Phone support (Pro & Enterprise)',
      'Priority response (Enterprise)',
      'Dedicated account manager (Enterprise)',
      'Custom training (Enterprise)'
    ]
  },
  {
    category: 'Security & Compliance',
    icon: <SecurityIcon />,
    features: [
      'Data encryption at rest',
      'Secure data transmission',
      'Regular security audits',
      'GDPR compliant',
      'SOC 2 Type II (Enterprise)',
      'Custom security policies (Enterprise)',
      'Single sign-on (Enterprise)',
      'Audit logging'
    ]
  }
];

const faqs = [
  {
    question: 'Can I change plans at any time?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, we\'ll credit your account for the unused portion.'
  },
  {
    question: 'What happens if I exceed my asset limit?',
    answer: 'We\'ll notify you when you\'re approaching your limit. You can either upgrade to a higher plan or remove inactive assets. We won\'t stop your operations - we\'ll work with you to find the best solution.'
  },
  {
    question: 'Is there a setup fee?',
    answer: 'No setup fees! Professional plans include a free onboarding session, and Enterprise plans include custom implementation support at no extra charge.'
  },
  {
    question: 'Can I get a custom plan?',
    answer: 'Absolutely! If our standard plans don\'t fit your needs, contact our sales team for a custom solution tailored to your specific requirements.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, ACH transfers, and wire transfers for annual payments. Enterprise customers can also request invoicing with NET 30 terms.'
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [expandedFaq, setExpandedFaq] = useState(false);

  const handleBillingToggle = () => {
    setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly');
  };

  const handleFaqChange = (panel) => (event, isExpanded) => {
    setExpandedFaq(isExpanded ? panel : false);
  };

  const getPrice = (plan) => {
    if (plan.monthlyPrice === 'Custom') return 'Custom';
    return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const getPriceLabel = (plan) => {
    const price = getPrice(plan);
    if (price === 'Custom') return 'Contact Sales';
    return `$${price}/month`;
  };

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
            <Typography 
              variant="h5" 
              fontWeight={700} 
              sx={{ color: '#3B82F6', cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              Scanified
            </Typography>
            
            <Stack direction="row" spacing={2}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/demo')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Try Demo
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
      <Box sx={{ 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        py: 10
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Fade in timeout={1000}>
              <Typography variant="h2" fontWeight={800} sx={{ mb: 3 }}>
                Simple, Transparent Pricing
              </Typography>
            </Fade>
            <Fade in timeout={1500}>
              <Typography variant="h5" color="text.secondary" sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}>
                Choose the perfect plan for your business. No hidden fees, no surprises.
              </Typography>
            </Fade>

            {/* Billing Toggle */}
            <Fade in timeout={2000}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: billingPeriod === 'monthly' ? 600 : 400 }}>
                  Monthly
                </Typography>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={billingPeriod === 'yearly'} 
                      onChange={handleBillingToggle}
                      color="primary"
                    />
                  }
                  label=""
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body1" sx={{ fontWeight: billingPeriod === 'yearly' ? 600 : 400 }}>
                    Yearly
                  </Typography>
                  <Chip 
                    label="Save 20%" 
                    size="small" 
                    color="success"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
              </Box>
            </Fade>
          </Box>
        </Container>
      </Box>

      {/* Pricing Plans */}
      <Container maxWidth="lg" sx={{ py: 8, mt: -8 }}>
        <Grid container spacing={4} alignItems="stretch">
          {pricingPlans.map((plan, index) => (
            <Grid item xs={12} md={4} key={plan.id}>
              <Zoom in timeout={1000 + index * 200}>
                <Card 
                  sx={{ 
                    height: '100%',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    border: plan.popular ? '2px solid' : '1px solid',
                    borderColor: plan.popular ? plan.color : 'divider',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                    }
                  }}
                >
                  {plan.popular && (
                    <Box sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: plan.color,
                      color: 'white',
                      px: 3,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}>
                      MOST POPULAR
                    </Box>
                  )}

                  <CardContent sx={{ p: 4 }}>
                    {/* Plan Header */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                      <Box sx={{
                        display: 'inline-flex',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: `${plan.color}20`,
                        color: plan.color,
                        mb: 2
                      }}>
                        {plan.icon}
                      </Box>
                      <Typography variant="h4" fontWeight={700} gutterBottom>
                        {plan.name}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mb: 3 }}>
                        {plan.description}
                      </Typography>
                      
                      {/* Price */}
                      <Box sx={{ my: 3 }}>
                        <Typography variant="h3" fontWeight={800} color={plan.color}>
                          {getPriceLabel(plan)}
                        </Typography>
                        {plan.monthlyPrice !== 'Custom' && (
                          <Typography variant="body2" color="text.secondary">
                            {billingPeriod === 'yearly' ? 'per month, billed annually' : 'billed monthly'}
                          </Typography>
                        )}
                      </Box>

                      {/* CTA Button */}
                      <Button
                        variant={plan.popular ? 'contained' : 'outlined'}
                        fullWidth
                        size="large"
                        onClick={() => plan.id === 'enterprise' ? navigate('/contact') : navigate('/register')}
                        sx={{ 
                          mb: 3,
                          fontWeight: 600,
                          bgcolor: plan.popular ? plan.color : 'transparent',
                          borderColor: plan.color,
                          color: plan.popular ? 'white' : plan.color,
                          '&:hover': {
                            bgcolor: plan.popular ? plan.color : `${plan.color}10`,
                            borderColor: plan.color
                          }
                        }}
                      >
                        {plan.id === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'}
                      </Button>

                      {/* Highlights */}
                      <Stack spacing={1}>
                        {plan.highlights.map((highlight, idx) => (
                          <Chip 
                            key={idx}
                            label={highlight}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: `${plan.color}50` }}
                          />
                        ))}
                      </Stack>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Features List */}
                    <List dense>
                      {plan.features.map((feature, idx) => (
                        <ListItem key={idx} sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {feature.included ? (
                              <CheckIcon sx={{ fontSize: 20, color: plan.color }} />
                            ) : (
                              <CloseIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                            )}
                          </ListItemIcon>
                          <ListItemText 
                            primary={feature.text}
                            primaryTypographyProps={{ 
                              sx: { 
                                color: feature.included ? 'text.primary' : 'text.disabled',
                                textDecoration: feature.included ? 'none' : 'line-through'
                              }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>
          ))}
        </Grid>

        {/* Additional Features */}
        <Box sx={{ mt: 12 }}>
          <Typography variant="h4" fontWeight={700} sx={{ textAlign: 'center', mb: 6 }}>
            Everything You Need to Succeed
          </Typography>
          
          <Grid container spacing={4}>
            {additionalFeatures.map((category, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Paper sx={{ p: 4, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      color: 'white'
                    }}>
                      {category.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                      {category.category}
                    </Typography>
                  </Box>
                  
                  <List dense>
                    {category.features.map((feature, idx) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Enterprise Section */}
        <Box sx={{ 
          mt: 12, 
          p: 6, 
          borderRadius: 4,
          background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
          color: 'white'
        }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
                Need a Custom Solution?
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                Our Enterprise plan can be tailored to meet your specific needs, 
                no matter how complex your requirements are.
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon />
                      <Typography>Unlimited everything</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon />
                      <Typography>Custom integrations</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon />
                      <Typography>Dedicated infrastructure</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon />
                      <Typography>White labeling</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon />
                      <Typography>On-premise option</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon />
                      <Typography>Priority development</Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={6} sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/contact')}
                sx={{ 
                  bgcolor: 'white',
                  color: '#7C3AED',
                  px: 6,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': { 
                    bgcolor: '#f8fafc'
                  }
                }}
              >
                Contact Sales Team
              </Button>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon />
                  <Typography variant="body2">enterprise@scanified.com</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon />
                  <Typography variant="body2">1-800-SCANIFY</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* FAQ Section */}
        <Box sx={{ mt: 12 }}>
          <Typography variant="h4" fontWeight={700} sx={{ textAlign: 'center', mb: 6 }}>
            Frequently Asked Questions
          </Typography>
          
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {faqs.map((faq, index) => (
              <Accordion 
                key={index}
                expanded={expandedFaq === `panel${index}`} 
                onChange={handleFaqChange(`panel${index}`)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">{faq.question}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>{faq.answer}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Box>

        {/* CTA Section */}
        <Box sx={{ 
          mt: 12, 
          textAlign: 'center',
          p: 6,
          borderRadius: 4,
          bgcolor: 'grey.50'
        }}>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Join thousands of businesses already using Scanified
          </Typography>
          <Stack direction="row" spacing={3} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{ px: 4, py: 1.5, fontWeight: 600 }}
            >
              Start Your Free Trial
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/demo')}
              sx={{ px: 4, py: 1.5, fontWeight: 600 }}
            >
              See Live Demo
            </Button>
          </Stack>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            No credit card required • 7-day free trial • Cancel anytime
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}