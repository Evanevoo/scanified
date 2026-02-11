import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Support as SupportIcon,
  Payment as PricingIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const competitorData = [
  {
    name: 'Legacy Systems',
    description: 'Specialized in returnable container tracking',
    pricing: '$$$',
    strengths: [
      'Strong in gas cylinder tracking',
      'Truck reconciliation features',
      'Established market presence',
      'Industry-specific workflows'
    ],
    weaknesses: [
      'Limited to specific industries',
      'Higher pricing',
      'Complex setup process',
      'Older technology stack'
    ],
    features: {
      mobileApp: true,
      barcodeScanning: true,
      realTimeTracking: true,
      customerPortal: true,
      apiIntegration: true,
      offlineMode: false,
      customBranding: false,
      multiIndustry: false,
      aiFeatures: false,
      modernUI: false
    }
  },
  {
    name: 'Asset Panda',
    description: 'Comprehensive asset management platform',
    pricing: '$$',
    strengths: [
      'Highly customizable',
      'Good customer support',
      'Multiple integrations',
      'Flexible pricing'
    ],
    weaknesses: [
      'Complex for simple use cases',
      'Limited mobile features',
      'Steep learning curve',
      'No industry specialization'
    ],
    features: {
      mobileApp: true,
      barcodeScanning: true,
      realTimeTracking: true,
      customerPortal: false,
      apiIntegration: true,
      offlineMode: true,
      customBranding: true,
      multiIndustry: true,
      aiFeatures: false,
      modernUI: true
    }
  },
  {
    name: 'Tracmor',
    description: 'Cloud-based asset and inventory tracking',
    pricing: '$',
    strengths: [
      'Affordable pricing',
      'Easy to use',
      'Cloud-based',
      'Good for small businesses'
    ],
    weaknesses: [
      'Limited advanced features',
      'Basic reporting',
      'No mobile app',
      'Limited customization'
    ],
    features: {
      mobileApp: false,
      barcodeScanning: true,
      realTimeTracking: false,
      customerPortal: false,
      apiIntegration: false,
      offlineMode: false,
      customBranding: false,
      multiIndustry: false,
      aiFeatures: false,
      modernUI: false
    }
  },
  {
    name: 'Scanified',
    description: 'Modern mobile-first asset management',
    pricing: '$$',
    strengths: [
      'Mobile-first design',
      'No expensive hardware needed',
      'Modern user interface',
      'Multi-industry support',
      'AI-powered features',
      'Transparent pricing',
      'Quick setup',
      'Excellent customer support'
    ],
    weaknesses: [
      'Newer in market',
      'Building brand recognition'
    ],
    features: {
      mobileApp: true,
      barcodeScanning: true,
      realTimeTracking: true,
      customerPortal: true,
      apiIntegration: true,
      offlineMode: true,
      customBranding: true,
      multiIndustry: true,
      aiFeatures: true,
      modernUI: true
    },
    isUs: true
  }
];

const featureLabels = {
  mobileApp: 'Mobile App',
  barcodeScanning: 'Barcode Scanning',
  realTimeTracking: 'Real-Time Tracking',
  customerPortal: 'Customer Portal',
  apiIntegration: 'API Integration',
  offlineMode: 'Offline Mode',
  customBranding: 'Custom Branding',
  multiIndustry: 'Multi-Industry',
  aiFeatures: 'AI Features',
  modernUI: 'Modern UI'
};

export default function CompetitorAnalysis() {
  const navigate = useNavigate();
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);

  const ourAdvantages = [
    {
      title: 'Mobile-First Approach',
      description: 'Unlike competitors who retrofitted mobile, we built mobile-first from day one',
      icon: <SpeedIcon />
    },
    {
      title: 'No Hardware Required',
      description: 'Use any smartphone - no expensive scanners like legacy systems require',
      icon: <SecurityIcon />
    },
    {
      title: 'Modern Technology',
      description: 'Built with latest tech stack while competitors use legacy systems',
      icon: <TrendingUpIcon />
    },
    {
      title: 'Transparent Pricing',
      description: 'Clear, predictable pricing vs. complex enterprise pricing models',
      icon: <PricingIcon />
    },
    {
      title: 'Multi-Industry',
      description: 'Adapts to any industry vs. being locked into specific verticals',
      icon: <StarIcon />
    },
    {
      title: 'Superior Support',
      description: '24/7 support with real humans, not just ticket systems',
      icon: <SupportIcon />
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" fontWeight={700} gutterBottom>
            How We Compare
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ width: '100%' }}>
            See how Scanified stacks up against the competition. We've analyzed the top asset management solutions to show you the differences.
          </Typography>
        </Box>

        {/* Competitive Advantages */}
        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h4" fontWeight={600} gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
            Why Choose Scanified?
          </Typography>
          
          <Grid container spacing={3}>
            {ourAdvantages.map((advantage, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card sx={{ height: '100%', border: '2px solid', borderColor: 'primary.main' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: 'white'
                      }}>
                        {advantage.icon}
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {advantage.title}
                        </Typography>
                        <Typography color="text.secondary">
                          {advantage.description}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Feature Comparison Table */}
        <Paper sx={{ mb: 6 }}>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h5" fontWeight={600}>
              Feature Comparison
            </Typography>
            <Typography color="text.secondary">
              Compare key features across leading asset management platforms
            </Typography>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Feature</TableCell>
                  {competitorData.map((competitor) => (
                    <TableCell key={competitor.name} align="center" sx={{ fontWeight: 600 }}>
                      <Box>
                        {competitor.name}
                        {competitor.isUs && (
                          <Chip label="That's Us!" size="small" color="primary" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(featureLabels).map(([key, label]) => (
                  <TableRow key={key}>
                    <TableCell sx={{ fontWeight: 500 }}>{label}</TableCell>
                    {competitorData.map((competitor) => (
                      <TableCell key={competitor.name} align="center">
                        {competitor.features[key] ? (
                          <CheckIcon color="success" />
                        ) : (
                          <CancelIcon color="error" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell sx={{ fontWeight: 500 }}>Pricing</TableCell>
                  {competitorData.map((competitor) => (
                    <TableCell key={competitor.name} align="center">
                      <Typography variant="h6" color={competitor.isUs ? 'primary.main' : 'text.secondary'}>
                        {competitor.pricing}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Detailed Competitor Analysis */}
        <Paper sx={{ mb: 6 }}>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h5" fontWeight={600}>
              Detailed Analysis
            </Typography>
            <Typography color="text.secondary">
              In-depth look at each competitor's strengths and weaknesses
            </Typography>
          </Box>

          <Box sx={{ p: 0 }}>
            {competitorData.map((competitor, index) => (
              <Accordion key={competitor.name}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="h6" fontWeight={600}>
                      {competitor.name}
                    </Typography>
                    {competitor.isUs && (
                      <Chip label="Scanified" color="primary" />
                    )}
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {competitor.description}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" fontWeight={600} color="success.main" gutterBottom>
                        Strengths
                      </Typography>
                      <List dense>
                        {competitor.strengths.map((strength, idx) => (
                          <ListItem key={idx} sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckIcon color="success" sx={{ fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary={strength} />
                          </ListItem>
                        ))}
                      </List>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" fontWeight={600} color="error.main" gutterBottom>
                        Weaknesses
                      </Typography>
                      <List dense>
                        {competitor.weaknesses.map((weakness, idx) => (
                          <ListItem key={idx} sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CancelIcon color="error" sx={{ fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary={weakness} />
                          </ListItem>
                        ))}
                      </List>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Paper>

        {/* Migration Help */}
        <Alert severity="info" sx={{ mb: 6 }}>
          <Typography variant="h6" gutterBottom>
            Switching from a Competitor?
          </Typography>
          <Typography sx={{ mb: 2 }}>
            We make it easy to migrate from legacy systems, Asset Panda, or any other platform. 
            Our team will handle the data migration and provide free onboarding to get you up and running quickly.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/contact')}>
            Get Migration Help
          </Button>
        </Alert>

        {/* CTA Section */}
        <Paper sx={{ 
          p: 6, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
          color: 'white'
        }}>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
            Ready to Make the Switch?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Join hundreds of businesses who've already upgraded to Scanified
          </Typography>
          <Stack direction="row" spacing={3} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{ 
                bgcolor: 'white',
                color: '#3B82F6',
                px: 4,
                py: 1.5,
                fontWeight: 600,
                '&:hover': { bgcolor: '#f8fafc' }
              }}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/demo')}
              sx={{ 
                borderColor: 'white',
                color: 'white',
                px: 4,
                py: 1.5,
                fontWeight: 600,
                '&:hover': { 
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              See Live Demo
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}