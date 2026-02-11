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
    color: '#000000',
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
        borderBottom: '2px solid #000000',
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
              sx={{ color: '#000000', cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              Scanified
            </Typography>
            
            <Stack direction="row" spacing={2}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/demo')}
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  border: '2px solid #000000',
                  color: '#000000',
                  '&:hover': {
                    backgroundColor: '#000000',
                    color: '#FFFFFF',
                    borderColor: '#000000'
                  }
                }}
              >
                Try Demo
              </Button>
              <Button 
                variant="contained" 
                onClick={() => navigate('/create-organization')}
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  border: '2px solid #000000',
                  '&:hover': {
                    backgroundColor: '#1F2937',
                    borderColor: '#1F2937'
                  }
                }}
              >
                Start Free Trial
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box sx={{ 
        backgroundColor: '#F9FAFB',
        py: 10
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Fade in timeout={1000}>
              <Typography variant="h2" fontWeight={800} sx={{ mb: 3, color: '#000000' }}>
                Simple, Transparent Pricing
              </Typography>
            </Fade>
            <Fade in timeout={1500}>
              <Typography variant="h5" sx={{ mb: 6, width: '100%', color: '#6B7280' }}>
                Choose the perfect plan for your business. No hidden fees, no surprises.
              </Typography>
            </Fade>

            {/* Billing Toggle */}
            <Fade in timeout={2000}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                <Typography variant="body1" sx={{ 
                  fontWeight: billingPeriod === 'monthly' ? 700 : 400,
                  color: billingPeriod === 'monthly' ? '#000000' : '#6B7280'
                }}>
                  Monthly
                </Typography>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={billingPeriod === 'yearly'} 
                      onChange={handleBillingToggle}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#000000',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#000000',
                        },
                      }}
                    />
                  }
                  label=""
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body1" sx={{ 
                    fontWeight: billingPeriod === 'yearly' ? 700 : 400,
                    color: billingPeriod === 'yearly' ? '#000000' : '#6B7280'
                  }}>
                    Yearly
                  </Typography>
                  <Chip 
                    label="Save 20%" 
                    size="small" 
                    sx={{ 
                      fontWeight: 700,
                      backgroundColor: '#000000',
                      color: '#FFFFFF',
                      border: '2px solid #000000'
                    }}
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
                    border: '2px solid #000000',
                    borderRadius: '8px',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
                    }
                  }}
                >
                  {plan.popular && (
                    <Box sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: '#000000',
                      color: '#FFFFFF',
                      px: 3,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      border: '2px solid #000000'
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
                        bgcolor: '#000000',
                        color: '#FFFFFF',
                        mb: 2
                      }}>
                        {plan.icon}
                      </Box>
                      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#000000' }}>
                        {plan.name}
                      </Typography>
                      <Typography sx={{ color: '#6B7280', mb: 3 }}>
                        {plan.description}
                      </Typography>
                      
                      {/* Price */}
                      <Box sx={{ my: 3 }}>
                        <Typography variant="h3" fontWeight={800} sx={{ color: '#000000' }}>
                          {getPriceLabel(plan)}
                        </Typography>
                        {plan.monthlyPrice !== 'Custom' && (
                          <Typography variant="body2" sx={{ color: '#6B7280' }}>
                            {billingPeriod === 'yearly' ? 'per month, billed annually' : 'billed monthly'}
                          </Typography>
                        )}
                      </Box>

                      {/* CTA Button */}
                      <Button
                        variant={plan.popular ? 'contained' : 'outlined'}
                        fullWidth
                        size="large"
                        onClick={() => plan.id === 'enterprise' ? navigate('/contact') : navigate('/create-organization')}
                        sx={{ 
                          mb: 3,
                          fontWeight: 600,
                          backgroundColor: plan.popular ? '#000000' : 'transparent',
                          border: '2px solid #000000',
                          color: plan.popular ? '#FFFFFF' : '#000000',
                          '&:hover': {
                            backgroundColor: plan.popular ? '#1F2937' : '#000000',
                            borderColor: '#000000',
                            color: '#FFFFFF'
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
                            sx={{ 
                              borderColor: '#000000',
                              borderWidth: '2px',
                              color: '#000000',
                              fontWeight: 600
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>

                    <Divider sx={{ my: 3, borderColor: '#E5E7EB' }} />

                    {/* Features List */}
                    <List dense>
                      {plan.features.map((feature, idx) => (
                        <ListItem key={idx} sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {feature.included ? (
                              <CheckIcon sx={{ fontSize: 20, color: '#000000' }} />
                            ) : (
                              <CloseIcon sx={{ fontSize: 20, color: '#9CA3AF' }} />
                            )}
                          </ListItemIcon>
                          <ListItemText 
                            primary={feature.text}
                            primaryTypographyProps={{ 
                              sx: { 
                                color: feature.included ? '#374151' : '#9CA3AF',
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
          <Typography variant="h4" fontWeight={700} sx={{ textAlign: 'center', mb: 6, color: '#000000' }}>
            Everything You Need to Succeed
          </Typography>
          
          <Grid container spacing={4}>
            {additionalFeatures.map((category, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Paper sx={{ 
                  p: 4, 
                  height: '100%',
                  border: '2px solid #000000',
                  borderRadius: '8px'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: '#000000',
                      color: '#FFFFFF'
                    }}>
                      {category.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#000000' }}>
                      {category.category}
                    </Typography>
                  </Box>
                  
                  <List dense>
                    {category.features.map((feature, idx) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckIcon sx={{ fontSize: 18, color: '#000000' }} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature}
                          primaryTypographyProps={{ variant: 'body2', sx: { color: '#374151' } }}
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
          borderRadius: '8px',
          backgroundColor: '#000000',
          color: 'white',
          border: '2px solid #000000'
        }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" fontWeight={700} sx={{ mb: 3, color: '#FFFFFF' }}>
                Need a Custom Solution?
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, color: '#E5E7EB' }}>
                Our Enterprise plan can be tailored to meet your specific needs, 
                no matter how complex your requirements are.
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon sx={{ color: '#FFFFFF' }} />
                      <Typography sx={{ color: '#FFFFFF' }}>Unlimited everything</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon sx={{ color: '#FFFFFF' }} />
                      <Typography sx={{ color: '#FFFFFF' }}>Custom integrations</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon sx={{ color: '#FFFFFF' }} />
                      <Typography sx={{ color: '#FFFFFF' }}>Dedicated infrastructure</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon sx={{ color: '#FFFFFF' }} />
                      <Typography sx={{ color: '#FFFFFF' }}>White labeling</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon sx={{ color: '#FFFFFF' }} />
                      <Typography sx={{ color: '#FFFFFF' }}>On-premise option</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon sx={{ color: '#FFFFFF' }} />
                      <Typography sx={{ color: '#FFFFFF' }}>Priority development</Typography>
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
                  bgcolor: '#FFFFFF',
                  color: '#000000',
                  px: 6,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  border: '2px solid #FFFFFF',
                  '&:hover': { 
                    bgcolor: '#F3F4F6',
                    borderColor: '#F3F4F6'
                  }
                }}
              >
                Contact Sales Team
              </Button>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon sx={{ color: '#FFFFFF' }} />
                  <Typography variant="body2" sx={{ color: '#FFFFFF' }}>enterprise@scanified.com</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon sx={{ color: '#FFFFFF' }} />
                  <Typography variant="body2" sx={{ color: '#FFFFFF' }}>1-800-SCANIFY</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* FAQ Section */}
        <Box sx={{ mt: 12 }}>
          <Typography variant="h4" fontWeight={700} sx={{ textAlign: 'center', mb: 6, color: '#000000' }}>
            Frequently Asked Questions
          </Typography>
          
          <Box sx={{ width: '100%' }}>
            {faqs.map((faq, index) => (
              <Accordion 
                key={index}
                expanded={expandedFaq === `panel${index}`} 
                onChange={handleFaqChange(`panel${index}`)}
                sx={{ 
                  mb: 2,
                  border: '2px solid #000000',
                  borderRadius: '8px !important',
                  '&:before': {
                    display: 'none'
                  }
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon sx={{ color: '#000000' }} />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      my: 2
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>{faq.question}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography sx={{ color: '#374151' }}>{faq.answer}</Typography>
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